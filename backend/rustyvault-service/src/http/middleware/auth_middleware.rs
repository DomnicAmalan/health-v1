//! Authentication middleware for vault API
//!
//! This middleware:
//! 1. Extracts the token from headers
//! 2. Extracts realm context from the request path
//! 3. Validates the token against the TokenStore
//! 4. Checks ACL policies for the requested path (realm-aware)
//! 5. Attaches token info and realm context to request for handlers
//! 6. Logs all authentication/authorization decisions (HIPAA audit trail)

use axum::{
    extract::Request,
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::sync::Arc;
use std::time::Instant;
use uuid::Uuid;

use crate::http::routes::AppState;
use crate::modules::auth::TokenEntry;
use crate::logical::request::{Operation, RealmContext};
use crate::services::audit_logger::{AuditLogEntry, AuthResult, hash_token_for_audit};

/// Token information attached to requests after authentication
#[derive(Clone, Debug)]
pub struct AuthInfo {
    pub token: TokenEntry,
    pub raw_token: String,
    /// Realm context extracted from the request path
    pub realm_context: RealmContext,
}

impl AuthInfo {
    /// Get the realm ID from the auth info
    pub fn realm_id(&self) -> Option<Uuid> {
        self.realm_context.realm_id
    }

    /// Check if this is a realm-scoped request
    pub fn is_realm_scoped(&self) -> bool {
        self.realm_context.is_realm_scoped
    }
}

/// Extract token from headers
pub fn extract_token(headers: &HeaderMap) -> Option<String> {
    // Check X-Vault-Token header (HashiCorp Vault compatible)
    if let Some(token) = headers.get("X-Vault-Token") {
        return token.to_str().ok().map(|s| s.to_string());
    }

    // Check X-RustyVault-Token header 
    if let Some(token) = headers.get("X-RustyVault-Token") {
        return token.to_str().ok().map(|s| s.to_string());
    }

    // Check Authorization header
    if let Some(auth) = headers.get("Authorization") {
        if let Ok(auth_str) = auth.to_str() {
            if auth_str.starts_with("Bearer ") {
                return Some(auth_str[7..].to_string());
            }
        }
    }

    None
}

/// Paths that don't require authentication
const PUBLIC_PATHS: &[&str] = &[
    "/v1/sys/health",
    "/v1/sys/init",
    "/v1/sys/seal-status",
    "/v1/sys/unseal",
    "/v1/auth/token/lookup", // Allow token validation without auth
];

/// Paths that require authentication but always allowed (for token lookup)
const SELF_PATHS: &[&str] = &[
    "/v1/auth/token/lookup-self",
    "/v1/auth/token/renew-self",
    "/v1/auth/token/revoke-self",
];

/// Convert HTTP method to Operation
fn method_to_operation(method: &str) -> Operation {
    match method {
        "GET" => Operation::Read,
        "POST" | "PUT" => Operation::Write,
        "DELETE" => Operation::Delete,
        "LIST" => Operation::List,
        _ => Operation::Read,
    }
}

/// Check if a path is public (accounting for realm prefix)
fn is_public_path(path: &str, realm_context: &RealmContext) -> bool {
    let check_path = if realm_context.is_realm_scoped {
        &realm_context.stripped_path
    } else {
        path
    };
    
    PUBLIC_PATHS.iter().any(|p| check_path.starts_with(p))
}

/// Check if a path is a self-path (accounting for realm prefix)
fn is_self_path(path: &str, realm_context: &RealmContext) -> bool {
    let check_path = if realm_context.is_realm_scoped {
        &realm_context.stripped_path
    } else {
        path
    };
    
    SELF_PATHS.iter().any(|p| check_path == *p)
}

/// Check if a path is userpass login (accounting for realm prefix)
fn is_userpass_login(path: &str, realm_context: &RealmContext) -> bool {
    let check_path = if realm_context.is_realm_scoped {
        &realm_context.stripped_path
    } else {
        path
    };
    
    check_path.starts_with("/v1/auth/userpass/login/")
}

/// Authentication middleware
pub async fn auth_middleware(
    state: Arc<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, Response> {
    let start_time = Instant::now();
    let request_id = Uuid::new_v4();
    let path = req.uri().path().to_string();
    let method = req.method().as_str().to_string();

    // Extract realm context from path
    let realm_context = RealmContext::from_path(&path);

    // Extract client info for audit logging
    let remote_addr = req.headers()
        .get("x-forwarded-for")
        .or_else(|| req.headers().get("x-real-ip"))
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let user_agent = req.headers()
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    // Allow public paths without auth (no audit log needed for health checks)
    if is_public_path(&path, &realm_context) {
        return Ok(next.run(req).await);
    }

    // Allow userpass login without auth (logged in userpass handler)
    if is_userpass_login(&path, &realm_context) {
        return Ok(next.run(req).await);
    }

    // Extract token
    let raw_token = extract_token(req.headers()).ok_or_else(|| {
        // Log missing token attempt
        let _ = log_auth_failure(
            &state,
            request_id,
            &path,
            &method,
            None,
            AuthResult::Denied,
            "missing authentication token",
            remote_addr.clone(),
            user_agent.clone(),
            realm_context.realm_id,
            start_time.elapsed().as_millis() as i32,
        );

        (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "missing authentication token" })),
        )
            .into_response()
    })?;

    if raw_token.is_empty() {
        // Log empty token attempt
        let _ = log_auth_failure(
            &state,
            request_id,
            &path,
            &method,
            None,
            AuthResult::Denied,
            "empty authentication token",
            remote_addr,
            user_agent,
            realm_context.realm_id,
            start_time.elapsed().as_millis() as i32,
        );

        return Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "empty authentication token" })),
        )
            .into_response());
    }

    // Validate token against TokenStore
    // SECURITY: Token store is REQUIRED - fail secure if unavailable
    let token_store = state.token_store.as_ref().ok_or_else(|| {
        tracing::error!("CRITICAL: Token store not initialized - vault authentication unavailable");
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "authentication service unavailable" })),
        )
            .into_response()
    })?;

    let token_entry = match token_store.lookup_token(&raw_token).await {
        Ok(Some(entry)) => entry,
        Ok(None) => {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(json!({ "error": "invalid or expired token" })),
            )
                .into_response());
        }
        Err(e) => {
            tracing::error!("Token lookup failed: {}", e);
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({ "error": "authentication service error" })),
            )
                .into_response());
        }
    };

    // Atomically decrement token usage (prevents race condition)
    // This must happen BEFORE allowing the request through
    if token_entry.num_uses != 0 {  // 0 = unlimited uses
        if let Err(e) = token_store.use_token(token_entry.id).await {
            tracing::error!("Failed to update token usage: {}", e);
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(json!({ "error": "token usage limit exceeded" })),
            )
                .into_response());
        }
    }

    // Allow self-paths for any authenticated token
    if is_self_path(&path, &realm_context) {
        // Attach auth info to request
        let auth_info = AuthInfo {
            token: token_entry,
            raw_token,
            realm_context,
        };
        req.extensions_mut().insert(auth_info);
        return Ok(next.run(req).await);
    }

    // Root policy bypasses all ACL checks
    if token_entry.policies.contains(&"root".to_string()) {
        let auth_info = AuthInfo {
            token: token_entry,
            raw_token,
            realm_context,
        };
        req.extensions_mut().insert(auth_info);
        return Ok(next.run(req).await);
    }

    // Check ACL policies
    // SECURITY: Policy store is REQUIRED - fail secure if unavailable
    let policy_store = state.policy_store.as_ref().ok_or_else(|| {
        tracing::error!("CRITICAL: Policy store not initialized - vault authorization unavailable");
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "authorization service unavailable" })),
        )
            .into_response()
    })?;

    let operation = method_to_operation(&method);

    // Convert path to vault path (remove /v1/ prefix and realm prefix if present)
    let vault_path = if realm_context.is_realm_scoped {
        // For realm-scoped requests, use the stripped path
        realm_context.stripped_path.trim_start_matches("/v1/").to_string()
    } else {
        path.trim_start_matches("/v1/").to_string()
    };

    // Build ACL from token's policies with realm context
    let acl = policy_store.new_acl(&token_entry.policies, realm_context.realm_id).await
        .map_err(|e| {
            tracing::error!("Failed to build ACL: {}", e);
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({ "error": "failed to load policies" })),
            )
                .into_response()
        })?;

    // Create a request for ACL checking
    let acl_req = crate::logical::Request {
        path: vault_path.clone(),
        operation,
        realm_id: realm_context.realm_id,
        ..Default::default()
    };

    let acl_result = acl.allow_operation(&acl_req, false)
        .map_err(|e| {
            tracing::error!("ACL check failed: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "failed to check permissions" })),
            )
                .into_response()
        })?;

    if !acl_result.allowed {
        tracing::warn!(
            "Access denied for path '{}' (realm: {:?}) with policies {:?}",
            vault_path,
            realm_context.realm_id,
            token_entry.policies
        );
        return Err((
            StatusCode::FORBIDDEN,
            Json(json!({
                "error": "permission denied",
                "path": vault_path,
                "operation": format!("{:?}", operation),
                "realm_id": realm_context.realm_id.map(|id| id.to_string())
            })),
        )
            .into_response());
    }

    // Attach auth info to request for handlers
    let auth_info = AuthInfo {
        token: token_entry.clone(),
        raw_token: raw_token.clone(),
        realm_context: realm_context.clone(),
    };
    req.extensions_mut().insert(auth_info);

    // Run the actual request
    let response = next.run(req).await;
    let status_code = response.status();

    // Log successful authorization
    let duration_ms = start_time.elapsed().as_millis() as i32;
    let audit_entry = AuditLogEntry {
        request_id,
        operation: format!("{}.{}", vault_path.split('/').next().unwrap_or("unknown"), operation_name(&operation)),
        path: vault_path,
        method: method.clone(),
        auth_display_name: Some(token_entry.display_name.clone()),
        auth_policies: Some(token_entry.policies.clone()),
        auth_token_id: Some(token_entry.id),
        client_token_hash: Some(hash_token_for_audit(&raw_token)),
        auth_result: AuthResult::Allowed,
        acl_capabilities: None, // TODO: Extract from ACL result
        realm_id: realm_context.realm_id,
        realm_name: None, // TODO: Lookup realm name
        request_data: None, // Don't log request body (may contain PHI)
        remote_addr,
        user_agent,
        response_status: status_code.as_u16() as i32,
        response_error: None,
        duration_ms: Some(duration_ms),
        phi_accessed: false, // TODO: Determine from path/operation
        phi_field_names: None,
        phi_record_ids: None,
    };

    // Log audit entry (non-blocking, errors logged but don't fail request)
    if let Err(e) = state.audit_logger.log(audit_entry).await {
        tracing::error!("Failed to write audit log: {}", e);
    }

    Ok(response)
}

fn operation_name(op: &Operation) -> &str {
    match op {
        Operation::Read => "read",
        Operation::Write => "write",
        Operation::Delete => "delete",
        Operation::List => "list",
    }
}

/// Log authentication/authorization failure (sync wrapper for async log)
fn log_auth_failure(
    state: &Arc<AppState>,
    request_id: Uuid,
    path: &str,
    method: &str,
    token_hash: Option<String>,
    auth_result: AuthResult,
    error: &str,
    remote_addr: Option<String>,
    user_agent: Option<String>,
    realm_id: Option<Uuid>,
    duration_ms: i32,
) -> Result<(), ()> {
    let audit_entry = AuditLogEntry {
        request_id,
        operation: format!("auth.{}", if matches!(auth_result, AuthResult::Denied) { "denied" } else { "error" }),
        path: path.to_string(),
        method: method.to_string(),
        auth_display_name: None,
        auth_policies: None,
        auth_token_id: None,
        client_token_hash: token_hash,
        auth_result,
        acl_capabilities: None,
        realm_id,
        realm_name: None,
        request_data: None,
        remote_addr,
        user_agent,
        response_status: if matches!(auth_result, AuthResult::Denied) { 401 } else { 500 },
        response_error: Some(error.to_string()),
        duration_ms: Some(duration_ms),
        phi_accessed: false,
        phi_field_names: None,
        phi_record_ids: None,
    };

    // Spawn async task to log (don't block middleware)
    let logger = state.audit_logger.clone();
    tokio::spawn(async move {
        if let Err(e) = logger.log(audit_entry).await {
            tracing::error!("Failed to log auth failure: {}", e);
        }
    });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_public_path_global() {
        let ctx = RealmContext::from_path("/v1/sys/health");
        assert!(is_public_path("/v1/sys/health", &ctx));
    }

    #[test]
    fn test_is_public_path_realm_scoped() {
        let realm_id = Uuid::new_v4();
        let path = format!("/v1/realm/{}/sys/health", realm_id);
        let ctx = RealmContext::from_path(&path);
        assert!(is_public_path(&path, &ctx));
    }
}
