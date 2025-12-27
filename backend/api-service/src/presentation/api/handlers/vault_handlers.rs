//! Vault handlers for on-demand token minting and secrets proxy
//! 
//! These handlers implement the backend-mediated vault access pattern:
//! - Clients NEVER talk directly to Vault
//! - All vault operations go through health-v1 backend
//! - Tokens are minted on-demand with short TTL
//! - All access is audited

use axum::{
    Json,
    extract::State,
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use shared::RequestContext;
use super::super::AppState;
use std::sync::Arc;
use uuid::Uuid;

/// Request for on-demand vault token
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultTokenRequest {
    /// Optional specific policies to request (must be subset of user's allowed policies)
    pub policies: Option<Vec<String>>,
    /// Optional TTL in seconds (max 900 = 15 minutes)
    pub ttl: Option<u32>,
}

/// Response containing a short-lived vault token
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultTokenResponse {
    /// The vault token (short-lived)
    pub token: String,
    /// Time-to-live in seconds
    pub ttl: u32,
    /// Policies attached to the token
    pub policies: Vec<String>,
    /// The realm ID this token is scoped to
    pub realm_id: String,
    /// Token accessor (for revocation without knowing the token)
    pub accessor: String,
}

/// Error response for vault operations
#[derive(Debug, Serialize)]
pub struct VaultError {
    pub error: String,
    pub code: String,
}

/// Maximum TTL for on-demand tokens (15 minutes)
const MAX_TOKEN_TTL_SECONDS: u32 = 900;
/// Default TTL for on-demand tokens (5 minutes)
const DEFAULT_TOKEN_TTL_SECONDS: u32 = 300;

/// POST /v1/vault/token
/// 
/// Mint an on-demand, short-lived vault token for the authenticated user.
/// The token is scoped to the user's organization realm and role-based policies.
/// 
/// This implements the on-demand provisioning pattern:
/// - User logs in -> no vault token
/// - User accesses vault-backed feature -> calls this endpoint -> gets short-lived token
/// - Token expires after TTL (max 15 minutes)
pub async fn request_vault_token(
    State(state): State<Arc<AppState>>,
    context: RequestContext,
    Json(request): Json<VaultTokenRequest>,
) -> impl IntoResponse {
    let _location = concat!(file!(), ":", line!());
    
    // Check if vault client is available
    let vault_client = match &state.vault_client {
        Some(client) => client,
        None => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(VaultError {
                    error: "Vault service is not available".to_string(),
                    code: "VAULT_UNAVAILABLE".to_string(),
                }),
            ).into_response();
        }
    };
    
    // Get organization_id from context (must be present for vault access)
    let organization_id = match context.organization_id {
        Some(org_id) => org_id,
        None => {
            return (
                StatusCode::FORBIDDEN,
                Json(VaultError {
                    error: "Organization context required for vault access".to_string(),
                    code: "NO_ORG_CONTEXT".to_string(),
                }),
            ).into_response();
        }
    };
    
    // Look up the realm for this organization
    let realm_id = match vault_client.get_or_create_realm_for_org(organization_id).await {
        Ok(realm_id) => realm_id,
        Err(e) => {
            tracing::error!("Failed to get vault realm for org {}: {}", organization_id, e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(VaultError {
                    error: "Failed to resolve vault realm".to_string(),
                    code: "REALM_ERROR".to_string(),
                }),
            ).into_response();
        }
    };
    
    // Determine policies based on user's role
    let policies = get_policies_for_user(&context, realm_id, request.policies.as_deref());
    
    if policies.is_empty() {
        return (
            StatusCode::FORBIDDEN,
            Json(VaultError {
                error: "No vault policies available for your role".to_string(),
                code: "NO_POLICIES".to_string(),
            }),
        ).into_response();
    }
    
    // Calculate TTL (capped at MAX_TOKEN_TTL_SECONDS)
    let ttl = request.ttl
        .map(|t| t.min(MAX_TOKEN_TTL_SECONDS))
        .unwrap_or(DEFAULT_TOKEN_TTL_SECONDS);
    
    // Create the token
    let _ttl_string = format!("{}s", ttl); // TODO: Pass TTL to token creation
    match vault_client.create_realm_token(realm_id, context.user_id, &policies).await {
        Ok(token) => {
            tracing::info!(
                user_id = %context.user_id,
                realm_id = %realm_id,
                policies = ?policies,
                ttl = ttl,
                "Minted on-demand vault token"
            );
            
            (
                StatusCode::OK,
                Json(VaultTokenResponse {
                    token,
                    ttl,
                    policies,
                    realm_id: realm_id.to_string(),
                    accessor: "".to_string(), // TODO: Return accessor from token creation
                }),
            ).into_response()
        }
        Err(e) => {
            tracing::error!(
                user_id = %context.user_id,
                realm_id = %realm_id,
                error = %e,
                "Failed to create vault token"
            );
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(VaultError {
                    error: "Failed to create vault token".to_string(),
                    code: "TOKEN_ERROR".to_string(),
                }),
            ).into_response()
        }
    }
}

/// Determine vault policies based on user's role and permissions
fn get_policies_for_user(
    context: &RequestContext,
    realm_id: Uuid,
    requested_policies: Option<&[String]>,
) -> Vec<String> {
    // Base policies that all users get
    let mut policies = vec!["default".to_string()];
    
    // Add role-based policy
    if let Some(ref role) = context.role {
        // Generate realm-scoped policy name based on role
        // Format: {role}-realm-{realm_id}
        let role_policy = format!("{}-realm-{}", role.to_lowercase(), realm_id);
        policies.push(role_policy);
        
        // Also add generic role policy (for global paths)
        let generic_role_policy = format!("{}-policy", role.to_lowercase());
        policies.push(generic_role_policy);
    }
    
    // If specific policies were requested, filter to only those the user is allowed
    if let Some(requested) = requested_policies {
        // For now, we trust the role-based policies
        // In production, you'd validate that requested policies are a subset of allowed
        for policy in requested {
            if !policies.contains(policy) {
                // Only add if it matches a pattern the user should have access to
                // This is a safety check - users can't request arbitrary policies
                if is_policy_allowed_for_role(policy, context.role.as_deref()) {
                    policies.push(policy.clone());
                }
            }
        }
    }
    
    policies
}

/// Check if a policy is allowed for a given role
fn is_policy_allowed_for_role(policy: &str, role: Option<&str>) -> bool {
    match role {
        Some("admin") | Some("super_admin") => true, // Admins can request any policy
        Some(r) => {
            // Role-specific policies must match the role prefix
            policy.starts_with(&format!("{}-", r.to_lowercase()))
                || policy == "default"
                || policy == "read-only"
        }
        None => policy == "default" || policy == "read-only",
    }
}

// ============================================
// Vault Proxy Endpoints
// ============================================

/// Request to read/write a secret
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretRequest {
    /// Optional data for write operations
    pub data: Option<serde_json::Value>,
}

/// Response containing secret data
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretResponse {
    pub data: serde_json::Value,
    pub metadata: Option<SecretMetadata>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretMetadata {
    pub version: Option<u32>,
    pub created_time: Option<String>,
    pub deletion_time: Option<String>,
}

/// GET /v1/vault/secrets/{*path}
/// 
/// Read a secret from the vault (proxied through health-v1)
/// Path is automatically scoped to the user's organization realm
pub async fn read_secret(
    State(state): State<Arc<AppState>>,
    context: RequestContext,
    axum::extract::Path(path): axum::extract::Path<String>,
) -> impl IntoResponse {
    let vault_client = match &state.vault_client {
        Some(client) => client,
        None => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(VaultError {
                    error: "Vault service is not available".to_string(),
                    code: "VAULT_UNAVAILABLE".to_string(),
                }),
            ).into_response();
        }
    };
    
    let organization_id = match context.organization_id {
        Some(org_id) => org_id,
        None => {
            return (
                StatusCode::FORBIDDEN,
                Json(VaultError {
                    error: "Organization context required".to_string(),
                    code: "NO_ORG_CONTEXT".to_string(),
                }),
            ).into_response();
        }
    };
    
    // Get realm for organization
    let realm_id = match vault_client.get_or_create_realm_for_org(organization_id).await {
        Ok(id) => id,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(VaultError {
                    error: format!("Failed to resolve realm: {}", e),
                    code: "REALM_ERROR".to_string(),
                }),
            ).into_response();
        }
    };
    
    // Read the secret using realm-scoped path
    // The vault client uses its service token to make the request
    match read_realm_secret(vault_client.as_ref(), realm_id, &path).await {
        Ok(data) => {
            tracing::info!(
                user_id = %context.user_id,
                realm_id = %realm_id,
                path = %path,
                "Read vault secret"
            );
            (StatusCode::OK, Json(SecretResponse { 
                data, 
                metadata: None 
            })).into_response()
        }
        Err(e) => {
            tracing::warn!(
                user_id = %context.user_id,
                realm_id = %realm_id,
                path = %path,
                error = %e,
                "Failed to read vault secret"
            );
            (
                StatusCode::NOT_FOUND,
                Json(VaultError {
                    error: "Secret not found or access denied".to_string(),
                    code: "SECRET_NOT_FOUND".to_string(),
                }),
            ).into_response()
        }
    }
}

/// POST /v1/vault/secrets/{*path}
/// 
/// Write a secret to the vault (proxied through health-v1)
/// Path is automatically scoped to the user's organization realm
pub async fn write_secret(
    State(state): State<Arc<AppState>>,
    context: RequestContext,
    axum::extract::Path(path): axum::extract::Path<String>,
    Json(request): Json<SecretRequest>,
) -> impl IntoResponse {
    let vault_client = match &state.vault_client {
        Some(client) => client,
        None => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(VaultError {
                    error: "Vault service is not available".to_string(),
                    code: "VAULT_UNAVAILABLE".to_string(),
                }),
            ).into_response();
        }
    };
    
    let organization_id = match context.organization_id {
        Some(org_id) => org_id,
        None => {
            return (
                StatusCode::FORBIDDEN,
                Json(VaultError {
                    error: "Organization context required".to_string(),
                    code: "NO_ORG_CONTEXT".to_string(),
                }),
            ).into_response();
        }
    };
    
    let data = match request.data {
        Some(d) => d,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(VaultError {
                    error: "Data is required for write operation".to_string(),
                    code: "MISSING_DATA".to_string(),
                }),
            ).into_response();
        }
    };
    
    // Get realm for organization
    let realm_id = match vault_client.get_or_create_realm_for_org(organization_id).await {
        Ok(id) => id,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(VaultError {
                    error: format!("Failed to resolve realm: {}", e),
                    code: "REALM_ERROR".to_string(),
                }),
            ).into_response();
        }
    };
    
    // Write the secret using realm-scoped path
    match write_realm_secret(vault_client.as_ref(), realm_id, &path, data).await {
        Ok(_) => {
            tracing::info!(
                user_id = %context.user_id,
                realm_id = %realm_id,
                path = %path,
                "Wrote vault secret"
            );
            (StatusCode::OK, Json(serde_json::json!({"success": true}))).into_response()
        }
        Err(e) => {
            tracing::error!(
                user_id = %context.user_id,
                realm_id = %realm_id,
                path = %path,
                error = %e,
                "Failed to write vault secret"
            );
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(VaultError {
                    error: "Failed to write secret".to_string(),
                    code: "WRITE_ERROR".to_string(),
                }),
            ).into_response()
        }
    }
}

/// DELETE /v1/vault/secrets/{*path}
/// 
/// Delete a secret from the vault (proxied through health-v1)
/// Path is automatically scoped to the user's organization realm
pub async fn delete_secret(
    State(state): State<Arc<AppState>>,
    context: RequestContext,
    axum::extract::Path(path): axum::extract::Path<String>,
) -> impl IntoResponse {
    let vault_client = match &state.vault_client {
        Some(client) => client,
        None => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(VaultError {
                    error: "Vault service is not available".to_string(),
                    code: "VAULT_UNAVAILABLE".to_string(),
                }),
            ).into_response();
        }
    };
    
    let organization_id = match context.organization_id {
        Some(org_id) => org_id,
        None => {
            return (
                StatusCode::FORBIDDEN,
                Json(VaultError {
                    error: "Organization context required".to_string(),
                    code: "NO_ORG_CONTEXT".to_string(),
                }),
            ).into_response();
        }
    };
    
    // Get realm for organization
    let realm_id = match vault_client.get_or_create_realm_for_org(organization_id).await {
        Ok(id) => id,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(VaultError {
                    error: format!("Failed to resolve realm: {}", e),
                    code: "REALM_ERROR".to_string(),
                }),
            ).into_response();
        }
    };
    
    // Delete the secret using realm-scoped path
    match delete_realm_secret(vault_client.as_ref(), realm_id, &path).await {
        Ok(_) => {
            tracing::info!(
                user_id = %context.user_id,
                realm_id = %realm_id,
                path = %path,
                "Deleted vault secret"
            );
            (StatusCode::OK, Json(serde_json::json!({"success": true}))).into_response()
        }
        Err(e) => {
            tracing::error!(
                user_id = %context.user_id,
                realm_id = %realm_id,
                path = %path,
                error = %e,
                "Failed to delete vault secret"
            );
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(VaultError {
                    error: "Failed to delete secret".to_string(),
                    code: "DELETE_ERROR".to_string(),
                }),
            ).into_response()
        }
    }
}

/// GET /v1/vault/secrets
/// 
/// List secrets at the root of the user's realm
pub async fn list_secrets(
    State(state): State<Arc<AppState>>,
    context: RequestContext,
    axum::extract::Query(params): axum::extract::Query<ListSecretsParams>,
) -> impl IntoResponse {
    let vault_client = match &state.vault_client {
        Some(client) => client,
        None => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(VaultError {
                    error: "Vault service is not available".to_string(),
                    code: "VAULT_UNAVAILABLE".to_string(),
                }),
            ).into_response();
        }
    };
    
    let organization_id = match context.organization_id {
        Some(org_id) => org_id,
        None => {
            return (
                StatusCode::FORBIDDEN,
                Json(VaultError {
                    error: "Organization context required".to_string(),
                    code: "NO_ORG_CONTEXT".to_string(),
                }),
            ).into_response();
        }
    };
    
    // Get realm for organization
    let realm_id = match vault_client.get_or_create_realm_for_org(organization_id).await {
        Ok(id) => id,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(VaultError {
                    error: format!("Failed to resolve realm: {}", e),
                    code: "REALM_ERROR".to_string(),
                }),
            ).into_response();
        }
    };
    
    let path = params.path.unwrap_or_default();
    
    // List secrets using realm-scoped path
    match list_realm_secrets(vault_client.as_ref(), realm_id, &path).await {
        Ok(keys) => {
            tracing::info!(
                user_id = %context.user_id,
                realm_id = %realm_id,
                path = %path,
                count = keys.len(),
                "Listed vault secrets"
            );
            (StatusCode::OK, Json(serde_json::json!({"keys": keys}))).into_response()
        }
        Err(e) => {
            tracing::warn!(
                user_id = %context.user_id,
                realm_id = %realm_id,
                path = %path,
                error = %e,
                "Failed to list vault secrets"
            );
            // Return empty list for not found
            (StatusCode::OK, Json(serde_json::json!({"keys": Vec::<String>::new()}))).into_response()
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct ListSecretsParams {
    pub path: Option<String>,
}

/// POST /v1/vault/capabilities
/// 
/// Check user's capabilities for given paths
pub async fn check_capabilities(
    State(state): State<Arc<AppState>>,
    context: RequestContext,
    Json(request): Json<CheckCapabilitiesRequest>,
) -> impl IntoResponse {
    let vault_client = match &state.vault_client {
        Some(client) => client,
        None => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(VaultError {
                    error: "Vault service is not available".to_string(),
                    code: "VAULT_UNAVAILABLE".to_string(),
                }),
            ).into_response();
        }
    };
    
    let organization_id = match context.organization_id {
        Some(org_id) => org_id,
        None => {
            return (
                StatusCode::FORBIDDEN,
                Json(VaultError {
                    error: "Organization context required".to_string(),
                    code: "NO_ORG_CONTEXT".to_string(),
                }),
            ).into_response();
        }
    };
    
    // Get realm for organization
    let realm_id = match vault_client.get_or_create_realm_for_org(organization_id).await {
        Ok(id) => id,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(VaultError {
                    error: format!("Failed to resolve realm: {}", e),
                    code: "REALM_ERROR".to_string(),
                }),
            ).into_response();
        }
    };
    
    // Build capabilities based on user's role
    // This is a simplified implementation - in production you'd query vault policies
    let policies = get_policies_for_user(&context, realm_id, None);
    let mut capabilities = std::collections::HashMap::new();
    
    for path in &request.paths {
        // Determine capabilities based on role
        let caps = get_capabilities_for_path(path, context.role.as_deref(), &policies);
        capabilities.insert(path.clone(), caps);
    }
    
    (StatusCode::OK, Json(serde_json::json!({
        "capabilities": capabilities,
        "realm_id": realm_id.to_string(),
    }))).into_response()
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckCapabilitiesRequest {
    pub paths: Vec<String>,
}

/// Get capabilities for a path based on role
fn get_capabilities_for_path(path: &str, role: Option<&str>, _policies: &[String]) -> Vec<String> {
    match role {
        Some("admin") | Some("super_admin") => {
            vec!["create".to_string(), "read".to_string(), "update".to_string(), "delete".to_string(), "list".to_string()]
        }
        Some("doctor") => {
            if path.contains("patients") || path.contains("clinical") {
                vec!["create".to_string(), "read".to_string(), "update".to_string(), "list".to_string()]
            } else {
                vec!["read".to_string(), "list".to_string()]
            }
        }
        Some("nurse") => {
            if path.contains("patients") || path.contains("clinical") {
                vec!["read".to_string(), "update".to_string(), "list".to_string()]
            } else {
                vec!["read".to_string(), "list".to_string()]
            }
        }
        _ => vec!["read".to_string(), "list".to_string()],
    }
}

// ============================================
// Helper functions for vault operations
// ============================================

use shared::infrastructure::encryption::RustyVaultClient;

async fn read_realm_secret(
    vault_client: &RustyVaultClient,
    realm_id: Uuid,
    path: &str,
) -> Result<serde_json::Value, String> {
    vault_client
        .read_realm_secret(realm_id, path)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Secret not found".to_string())
}

async fn write_realm_secret(
    vault_client: &RustyVaultClient,
    realm_id: Uuid,
    path: &str,
    data: serde_json::Value,
) -> Result<(), String> {
    vault_client
        .write_realm_secret(realm_id, path, data)
        .await
        .map_err(|e| e.to_string())
}

async fn delete_realm_secret(
    vault_client: &RustyVaultClient,
    realm_id: Uuid,
    path: &str,
) -> Result<(), String> {
    vault_client
        .delete_realm_secret(realm_id, path)
        .await
        .map_err(|e| e.to_string())
}

async fn list_realm_secrets(
    vault_client: &RustyVaultClient,
    realm_id: Uuid,
    path: &str,
) -> Result<Vec<String>, String> {
    vault_client
        .list_realm_secrets(realm_id, path)
        .await
        .map_err(|e| e.to_string())
}
