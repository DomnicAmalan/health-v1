//! Route definitions for vault API

use axum::{
    Router,
    middleware,
    http::HeaderValue,
};
use std::sync::Arc;
use tower_http::cors::{CorsLayer, AllowOrigin};
use crate::http::handlers::{app_handlers, approle_handlers, auth_handlers, policy_handlers, realm_handlers, secrets_handlers, sys_handlers};
use crate::http::middleware::auth_middleware;
use crate::modules::auth::{AppRoleBackend, TokenStore, UserPassBackend};
use crate::modules::policy::PolicyStore;
use crate::modules::realm::{RealmStore, RealmApplicationStore};
use crate::config::VaultSettings;
use crate::services::key_storage::KeyStorage;

/// App state for routes
pub struct AppState {
    pub core: Arc<crate::core::VaultCore>,
    pub policy_store: Option<Arc<PolicyStore>>,
    pub token_store: Option<Arc<TokenStore>>,
    pub userpass: Option<Arc<UserPassBackend>>,
    pub approle_backend: Option<Arc<AppRoleBackend>>,
    pub realm_store: Option<Arc<RealmStore>>,
    pub app_store: Option<Arc<RealmApplicationStore>>,
    pub key_storage: Arc<KeyStorage>,
}

/// Create the vault API router
/// Using closures to capture state (no State extractor needed)
pub fn create_router(state: Arc<AppState>, settings: &VaultSettings) -> Router {
    // Configure CORS
    // Note: Cannot use allow_credentials(true) with AllowOrigin::any() (*)
    // When credentials are needed, must specify exact origins
    let cors_layer = {
        let origins: Vec<HeaderValue> = if settings.server.cors_allowed_origins.contains(&"*".to_string()) {
            // If wildcard is specified, don't allow credentials (security restriction)
            // For development, use specific origins instead
            vec![
                HeaderValue::from_static("http://localhost:5176"),
                HeaderValue::from_static("http://localhost:3000"),
                HeaderValue::from_static("http://localhost:5174"),
                HeaderValue::from_static("http://localhost:5175"),
            ]
        } else {
            // Allow specific origins
            settings.server.cors_allowed_origins.iter()
                .filter_map(|origin| origin.parse().ok())
                .collect()
        };
        
        CorsLayer::new()
            .allow_origin(AllowOrigin::list(origins))
            .allow_methods([
                axum::http::Method::GET,
                axum::http::Method::POST,
                axum::http::Method::PUT,
                axum::http::Method::DELETE,
                axum::http::Method::PATCH,
                axum::http::Method::OPTIONS,
            ])
            .allow_headers([
                axum::http::header::CONTENT_TYPE,
                axum::http::header::AUTHORIZATION,
                axum::http::header::ACCEPT,
                axum::http::HeaderName::from_static("x-rustyvault-token"),
                axum::http::HeaderName::from_static("x-vault-token"),
            ])
            .allow_credentials(true)
    };
    // Public routes (no auth required)
    let state_clone = state.clone();
    let public_routes = Router::new()
        .route("/v1/sys/health", axum::routing::get({
            let state = state_clone.clone();
            move || {
                let state = state.clone();
                async move {
                    sys_handlers::health_check_with_state(state).await
                }
            }
        }))
        .route("/v1/sys/init", axum::routing::post({
            let state = state_clone.clone();
            move |payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                async move {
                    sys_handlers::init_with_state(state, payload).await
                }
            }
        }))
        // Unseal can be called without auth when vault is sealed
        .route("/v1/sys/unseal", axum::routing::post({
            let state = state_clone.clone();
            move |payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                async move {
                    sys_handlers::unseal_with_state(state, payload).await
                }
            }
        }))
        .route("/v1/sys/seal-status", axum::routing::get({
            let state = state_clone.clone();
            move || {
                let state = state.clone();
                async move {
                    sys_handlers::seal_status_with_state(state).await
                }
            }
        }))
        // Keys download endpoint (token-based, no auth required)
        .route("/v1/sys/init/keys.txt", axum::routing::get({
            let state = state_clone.clone();
            move |query: axum::extract::Query<std::collections::HashMap<String, String>>| {
                let state = state.clone();
                async move {
                    sys_handlers::download_keys_file_with_state(state, query.0).await
                }
            }
        }))
        // UserPass login doesn't require auth
        .route("/v1/auth/userpass/login/{username}", axum::routing::post({
            let state = state_clone.clone();
            move |path: axum::extract::Path<String>, payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                let username = path.0;
                async move {
                    auth_handlers::userpass_login(state, username, payload).await
                }
            }
        }));
    
    // Protected routes (auth required)
    let state_clone2 = state.clone();
    let protected_routes = Router::new()
        // System routes
        // Authenticated key retrieval endpoint
        .route("/v1/sys/init/keys", axum::routing::get({
            let state = state_clone2.clone();
            move |query: axum::extract::Query<std::collections::HashMap<String, String>>| {
                let state = state.clone();
                async move {
                    sys_handlers::get_keys_authenticated_with_state(state, query.0).await
                }
            }
        }))
        .route("/v1/sys/seal", axum::routing::post({
            let state = state_clone2.clone();
            move || {
                let state = state.clone();
                async move {
                    sys_handlers::seal_with_state(state).await
                }
            }
        }))
        
        // ============================================================
        // Secrets routes
        // ============================================================
        .route("/v1/secret/{*path}", axum::routing::get({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>| {
                let state = state.clone();
                let path_str = path.0;
                async move {
                    secrets_handlers::read_secret_with_state(state, path_str).await
                }
            }
        }))
        .route("/v1/secret/{*path}", axum::routing::post({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>, payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                let path_str = path.0;
                async move {
                    secrets_handlers::write_secret_with_state(state, path_str, payload).await
                }
            }
        }))
        .route("/v1/secret/{*path}", axum::routing::delete({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>| {
                let state = state.clone();
                let path_str = path.0;
                async move {
                    secrets_handlers::delete_secret_with_state(state, path_str).await
                }
            }
        }))
        
        // ============================================================
        // Policy routes
        // ============================================================
        .route("/v1/sys/policies/acl", axum::routing::get({
            let state = state_clone2.clone();
            move || {
                let state = state.clone();
                async move {
                    policy_handlers::list_policies(state).await
                }
            }
        }))
        .route("/v1/sys/policies/acl/{name}", axum::routing::get({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>| {
                let state = state.clone();
                let name = path.0;
                async move {
                    policy_handlers::read_policy(state, name).await
                }
            }
        }))
        .route("/v1/sys/policies/acl/{name}", axum::routing::post({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>, payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                let name = path.0;
                async move {
                    policy_handlers::write_policy(state, name, payload).await
                }
            }
        }))
        .route("/v1/sys/policies/acl/{name}", axum::routing::delete({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>| {
                let state = state.clone();
                let name = path.0;
                async move {
                    policy_handlers::delete_policy(state, name).await
                }
            }
        }))
        .route("/v1/sys/capabilities", axum::routing::post({
            let state = state_clone2.clone();
            move |payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                async move {
                    policy_handlers::check_capabilities(state, payload).await
                }
            }
        }))
        
        // ============================================================
        // Token routes
        // ============================================================
        .route("/v1/auth/token/create", axum::routing::post({
            let state = state_clone2.clone();
            move |payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                async move {
                    auth_handlers::create_token(state, payload).await
                }
            }
        }))
        .route("/v1/auth/token/lookup", axum::routing::post({
            let state = state_clone2.clone();
            move |payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                async move {
                    auth_handlers::lookup_token(state, payload).await
                }
            }
        }))
        .route("/v1/auth/token/lookup-self", axum::routing::get({
            let state = state_clone2.clone();
            move |headers: axum::http::HeaderMap| {
                let state = state.clone();
                let token = headers
                    .get("X-Vault-Token")
                    .and_then(|v| v.to_str().ok())
                    .unwrap_or("")
                    .to_string();
                async move {
                    auth_handlers::lookup_self_token(state, token).await
                }
            }
        }))
        .route("/v1/auth/token/renew", axum::routing::post({
            let state = state_clone2.clone();
            move |payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                async move {
                    auth_handlers::renew_token(state, payload).await
                }
            }
        }))
        .route("/v1/auth/token/revoke", axum::routing::post({
            let state = state_clone2.clone();
            move |payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                async move {
                    auth_handlers::revoke_token(state, payload).await
                }
            }
        }))
        .route("/v1/auth/token/revoke-self", axum::routing::post({
            let state = state_clone2.clone();
            move |headers: axum::http::HeaderMap| {
                let state = state.clone();
                let token = headers
                    .get("X-Vault-Token")
                    .and_then(|v| v.to_str().ok())
                    .unwrap_or("")
                    .to_string();
                async move {
                    auth_handlers::revoke_self_token(state, token).await
                }
            }
        }))
        
        // ============================================================
        // UserPass routes
        // ============================================================
        .route("/v1/auth/userpass/users", axum::routing::get({
            let state = state_clone2.clone();
            move || {
                let state = state.clone();
                async move {
                    auth_handlers::list_userpass_users(state).await
                }
            }
        }))
        .route("/v1/auth/userpass/users/{username}", axum::routing::post({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>, payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                let username = path.0;
                async move {
                    auth_handlers::create_userpass_user(state, username, payload).await
                }
            }
        }))
        .route("/v1/auth/userpass/users/{username}", axum::routing::get({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>| {
                let state = state.clone();
                let username = path.0;
                async move {
                    auth_handlers::read_userpass_user(state, username).await
                }
            }
        }))
        .route("/v1/auth/userpass/users/{username}", axum::routing::delete({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>| {
                let state = state.clone();
                let username = path.0;
                async move {
                    auth_handlers::delete_userpass_user(state, username).await
                }
            }
        }))
        
        // ============================================================
        // Realm routes
        // ============================================================
        .route("/v1/sys/realm", axum::routing::get({
            let state = state_clone2.clone();
            move || {
                let state = state.clone();
                async move {
                    realm_handlers::list_realms(state).await
                }
            }
        }))
        .route("/v1/sys/realm", axum::routing::post({
            let state = state_clone2.clone();
            move |payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                async move {
                    realm_handlers::create_realm(state, payload).await
                }
            }
        }))
        .route("/v1/sys/realm/{realm_id}", axum::routing::get({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>| {
                let state = state.clone();
                let realm_id = path.0;
                async move {
                    realm_handlers::get_realm(state, realm_id).await
                }
            }
        }))
        .route("/v1/sys/realm/{realm_id}", axum::routing::post({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>, payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                let realm_id = path.0;
                async move {
                    realm_handlers::update_realm(state, realm_id, payload).await
                }
            }
        }))
        .route("/v1/sys/realm/{realm_id}", axum::routing::delete({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>| {
                let state = state.clone();
                let realm_id = path.0;
                async move {
                    realm_handlers::delete_realm(state, realm_id).await
                }
            }
        }))
        .route("/v1/sys/realm/organization/{organization_id}", axum::routing::get({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>| {
                let state = state.clone();
                let organization_id = path.0;
                async move {
                    realm_handlers::get_realms_by_organization(state, organization_id).await
                }
            }
        }))
        
        // ============================================================
        // Realm Application routes
        // ============================================================
        .route("/v1/realm/{realm_id}/sys/apps", axum::routing::get({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>| {
                let state = state.clone();
                let realm_id = path.0;
                async move {
                    app_handlers::list_apps(state, realm_id).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/sys/apps", axum::routing::post({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>, payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                let realm_id = path.0;
                async move {
                    app_handlers::create_app(state, realm_id, payload).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/sys/apps/{app_name}", axum::routing::get({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>| {
                let state = state.clone();
                let (realm_id, app_name) = path.0;
                async move {
                    app_handlers::get_app(state, realm_id, app_name).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/sys/apps/{app_name}", axum::routing::post({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>, payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                let (realm_id, app_name) = path.0;
                async move {
                    app_handlers::update_app(state, realm_id, app_name, payload).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/sys/apps/{app_name}", axum::routing::delete({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>| {
                let state = state.clone();
                let (realm_id, app_name) = path.0;
                async move {
                    app_handlers::delete_app(state, realm_id, app_name).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/sys/apps/register-defaults", axum::routing::post({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>| {
                let state = state.clone();
                let realm_id = path.0;
                async move {
                    app_handlers::register_default_apps(state, realm_id).await
                }
            }
        }))

        // ==========================================
        // Realm-Scoped UserPass Routes
        // ==========================================
        .route("/v1/realm/{realm_id}/auth/userpass/users", axum::routing::get({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>| {
                let state = state.clone();
                let realm_id = path.0;
                async move {
                    auth_handlers::list_realm_userpass_users(state, realm_id).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/auth/userpass/users/{username}", axum::routing::get({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>| {
                let state = state.clone();
                let (realm_id, username) = path.0;
                async move {
                    auth_handlers::read_realm_userpass_user(state, realm_id, username).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/auth/userpass/users/{username}", axum::routing::post({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>, payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                let (realm_id, username) = path.0;
                async move {
                    auth_handlers::create_realm_userpass_user(state, realm_id, username, payload).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/auth/userpass/users/{username}", axum::routing::delete({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>| {
                let state = state.clone();
                let (realm_id, username) = path.0;
                async move {
                    auth_handlers::delete_realm_userpass_user(state, realm_id, username).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/auth/userpass/login/{username}", axum::routing::post({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>, payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                let (realm_id, username) = path.0;
                async move {
                    auth_handlers::realm_userpass_login(state, realm_id, username, payload).await
                }
            }
        }))

        // ==========================================
        // Realm-Scoped AppRole Routes
        // ==========================================
        .route("/v1/realm/{realm_id}/auth/approle/role", axum::routing::get({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>| {
                let state = state.clone();
                let realm_id = path.0;
                async move {
                    approle_handlers::list_realm_approles(state, realm_id).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/auth/approle/role/{role_name}", axum::routing::get({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>| {
                let state = state.clone();
                let (realm_id, role_name) = path.0;
                async move {
                    approle_handlers::read_realm_approle(state, realm_id, role_name).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/auth/approle/role/{role_name}", axum::routing::post({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>, payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                let (realm_id, role_name) = path.0;
                async move {
                    approle_handlers::create_realm_approle(state, realm_id, role_name, payload).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/auth/approle/role/{role_name}", axum::routing::delete({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>| {
                let state = state.clone();
                let (realm_id, role_name) = path.0;
                async move {
                    approle_handlers::delete_realm_approle(state, realm_id, role_name).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/auth/approle/role/{role_name}/role-id", axum::routing::get({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>| {
                let state = state.clone();
                let (realm_id, role_name) = path.0;
                async move {
                    approle_handlers::get_realm_approle_role_id(state, realm_id, role_name).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/auth/approle/role/{role_name}/secret-id", axum::routing::post({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>, payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                let (realm_id, role_name) = path.0;
                async move {
                    approle_handlers::generate_realm_approle_secret_id(state, realm_id, role_name, payload).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/auth/approle/login", axum::routing::post({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>, payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                let realm_id = path.0;
                async move {
                    approle_handlers::realm_approle_login(state, realm_id, payload).await
                }
            }
        }))

        // ==========================================
        // Realm-Scoped Policy Routes
        // ==========================================
        .route("/v1/realm/{realm_id}/sys/policies/acl", axum::routing::get({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>| {
                let state = state.clone();
                let realm_id = path.0;
                async move {
                    policy_handlers::list_realm_policies(state, realm_id).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/sys/policies/acl/{name}", axum::routing::get({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>| {
                let state = state.clone();
                let (realm_id, name) = path.0;
                async move {
                    policy_handlers::read_realm_policy(state, realm_id, name).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/sys/policies/acl/{name}", axum::routing::post({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>, payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                let (realm_id, name) = path.0;
                async move {
                    policy_handlers::write_realm_policy(state, realm_id, name, payload).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/sys/policies/acl/{name}", axum::routing::delete({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>| {
                let state = state.clone();
                let (realm_id, name) = path.0;
                async move {
                    policy_handlers::delete_realm_policy(state, realm_id, name).await
                }
            }
        }))
        .route("/v1/realm/{realm_id}/sys/capabilities", axum::routing::post({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>, payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                let realm_id = path.0;
                async move {
                    policy_handlers::check_realm_capabilities(state, realm_id, payload).await
                }
            }
        }))

        // ==========================================
        // Realm-Scoped Secret Routes
        // ==========================================
        // Read secret within a realm
        .route("/v1/realm/{realm_id}/secret/data/{*path}", axum::routing::get({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>| {
                let state = state.clone();
                let (realm_id, secret_path) = path.0;
                async move {
                    secrets_handlers::read_realm_secret(state, realm_id, secret_path).await
                }
            }
        }))
        // Write secret within a realm
        .route("/v1/realm/{realm_id}/secret/data/{*path}", axum::routing::post({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>, payload: axum::extract::Json<serde_json::Value>| {
                let state = state.clone();
                let (realm_id, secret_path) = path.0;
                async move {
                    secrets_handlers::write_realm_secret(state, realm_id, secret_path, payload).await
                }
            }
        }))
        // Delete secret within a realm
        .route("/v1/realm/{realm_id}/secret/data/{*path}", axum::routing::delete({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>| {
                let state = state.clone();
                let (realm_id, secret_path) = path.0;
                async move {
                    secrets_handlers::delete_realm_secret(state, realm_id, secret_path).await
                }
            }
        }))
        // List secrets within a realm
        .route("/v1/realm/{realm_id}/secret/metadata/{*path}", axum::routing::get({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<(String, String)>| {
                let state = state.clone();
                let (realm_id, secret_path) = path.0;
                async move {
                    secrets_handlers::list_realm_secrets(state, realm_id, secret_path).await
                }
            }
        }))
        // List all secrets in realm root
        .route("/v1/realm/{realm_id}/secret/metadata/", axum::routing::get({
            let state = state_clone2.clone();
            move |path: axum::extract::Path<String>| {
                let state = state.clone();
                let realm_id = path.0;
                async move {
                    secrets_handlers::list_realm_secrets(state, realm_id, String::new()).await
                }
            }
        }))
        
        .layer(middleware::from_fn({
            let state = state.clone();
            move |req: axum::extract::Request, next: axum::middleware::Next| {
                let state = state.clone();
                async move {
                    auth_middleware(state, req, next).await
                }
            }
        }));
    
    Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(cors_layer)
}
