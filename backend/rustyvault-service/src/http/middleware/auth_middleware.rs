//! Authentication middleware for vault API
//!
//! This middleware:
//! 1. Extracts the token from headers
//! 2. Extracts realm context from the request path
//! 3. Validates the token against the TokenStore
//! 4. Checks ACL policies for the requested path (realm-aware)
//! 5. Attaches token info and realm context to request for handlers

use axum::{
    extract::Request,
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

use crate::http::routes::AppState;
use crate::modules::auth::TokenEntry;
use crate::logical::request::{Operation, RealmContext};

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
    let path = req.uri().path().to_string();
    let method = req.method().as_str().to_string();

    // Extract realm context from path
    let realm_context = RealmContext::from_path(&path);

    // Allow public paths without auth
    if is_public_path(&path, &realm_context) {
        return Ok(next.run(req).await);
    }

    // Allow userpass login without auth
    if is_userpass_login(&path, &realm_context) {
        return Ok(next.run(req).await);
    }

    // Extract token
    let raw_token = extract_token(req.headers()).ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "missing authentication token" })),
        )
            .into_response()
    })?;

    if raw_token.is_empty() {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "empty authentication token" })),
        )
            .into_response());
    }

    // Validate token against TokenStore
    let token_entry = if let Some(token_store) = &state.token_store {
        match token_store.lookup_token(&raw_token).await {
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
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": "failed to validate token" })),
                )
                    .into_response());
            }
        }
    } else {
        // Token store not available - allow with basic check
        tracing::warn!("Token store not available, skipping token validation");
        // Create a minimal token entry for compatibility
        TokenEntry {
            id: uuid::Uuid::new_v4(),
            token_hash: String::new(),
            display_name: "unknown".to_string(),
            policies: vec!["default".to_string()],
            parent: None,
            ttl: 0,
            expires_at: None,
            created_at: chrono::Utc::now(),
            last_used_at: None,
            num_uses: 0,
            path: String::new(),
            meta: None,
            renewable: false,
            entity_id: None,
        }
    };

    // Check if token has uses remaining
    if token_entry.num_uses > 0 {
        // Decrement uses
        if let Some(token_store) = &state.token_store {
            if let Err(e) = token_store.use_token(token_entry.id).await {
                tracing::error!("Failed to update token usage: {}", e);
            }
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
    if let Some(policy_store) = &state.policy_store {
        let operation = method_to_operation(&method);
        
        // Convert path to vault path (remove /v1/ prefix and realm prefix if present)
        let vault_path = if realm_context.is_realm_scoped {
            // For realm-scoped requests, use the stripped path
            realm_context.stripped_path.trim_start_matches("/v1/").to_string()
        } else {
            path.trim_start_matches("/v1/").to_string()
        };

        // Build ACL from token's policies with realm context
        match policy_store.new_acl(&token_entry.policies, realm_context.realm_id).await {
            Ok(acl) => {
                // Create a request for ACL checking
                let acl_req = crate::logical::Request {
                    path: vault_path.clone(),
                    operation,
                    realm_id: realm_context.realm_id,
                    ..Default::default()
                };

                match acl.allow_operation(&acl_req, false) {
                    Ok(result) => {
                        if !result.allowed {
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
                    }
                    Err(e) => {
                        tracing::error!("ACL check failed: {}", e);
                        return Err((
                            StatusCode::INTERNAL_SERVER_ERROR,
                            Json(json!({ "error": "failed to check permissions" })),
                        )
                            .into_response());
                    }
                }
            }
            Err(e) => {
                tracing::error!("Failed to build ACL: {}", e);
                return Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": "failed to load policies" })),
                )
                    .into_response());
            }
        }
    } else {
        tracing::warn!("Policy store not available, skipping ACL check");
    }

    // Attach auth info to request for handlers
    let auth_info = AuthInfo {
        token: token_entry,
        raw_token,
        realm_context,
    };
    req.extensions_mut().insert(auth_info);

    Ok(next.run(req).await)
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
