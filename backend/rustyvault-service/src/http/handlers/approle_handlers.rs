//! HTTP handlers for AppRole authentication

use std::sync::Arc;

use axum::{
    http::StatusCode,
    Json,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::http::routes::AppState;
use crate::modules::auth::CreateAppRoleRequest;

// ============================================================================
// Realm-Scoped AppRole Handlers
// ============================================================================

/// List AppRoles in a realm
pub async fn list_realm_approles(
    state: Arc<AppState>,
    realm_id: String,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let approle_backend = state.approle_backend.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "approle auth not enabled" })),
        )
    })?;

    let realm_uuid = Uuid::parse_str(&realm_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "invalid realm ID" })),
        )
    })?;

    match approle_backend.list_roles(Some(realm_uuid)).await {
        Ok(roles) => Ok(Json(json!({
            "keys": roles
        }))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )),
    }
}

/// Create or update an AppRole in a realm
pub async fn create_realm_approle(
    state: Arc<AppState>,
    realm_id: String,
    role_name: String,
    payload: Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let approle_backend = state.approle_backend.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "approle auth not enabled" })),
        )
    })?;

    let realm_uuid = Uuid::parse_str(&realm_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "invalid realm ID" })),
        )
    })?;

    let policies: Vec<String> = payload
        .get("policies")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    let token_policies: Vec<String> = payload
        .get("token_policies")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    let request = CreateAppRoleRequest {
        role_name: role_name.clone(),
        policies,
        bind_secret_id: payload
            .get("bind_secret_id")
            .and_then(|v| v.as_bool())
            .unwrap_or(true),
        secret_id_ttl: payload
            .get("secret_id_ttl")
            .and_then(|v| v.as_i64())
            .map(|v| v as i32)
            .unwrap_or(3600),
        secret_id_num_uses: payload
            .get("secret_id_num_uses")
            .and_then(|v| v.as_i64())
            .map(|v| v as i32)
            .unwrap_or(0),
        token_ttl: payload
            .get("token_ttl")
            .and_then(|v| v.as_i64())
            .map(|v| v as i32)
            .unwrap_or(3600),
        token_max_ttl: payload
            .get("token_max_ttl")
            .and_then(|v| v.as_i64())
            .map(|v| v as i32)
            .unwrap_or(86400),
        token_policies,
        realm_id: Some(realm_uuid),
    };

    match approle_backend.create_role(&request).await {
        Ok(_) => Ok(Json(json!({}))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )),
    }
}

/// Read an AppRole in a realm
pub async fn read_realm_approle(
    state: Arc<AppState>,
    realm_id: String,
    role_name: String,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let approle_backend = state.approle_backend.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "approle auth not enabled" })),
        )
    })?;

    let realm_uuid = Uuid::parse_str(&realm_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "invalid realm ID" })),
        )
    })?;

    match approle_backend.get_role(&role_name, Some(realm_uuid)).await {
        Ok(Some(role)) => Ok(Json(json!({
            "data": {
                "role_name": role.role_name,
                "policies": role.policies,
                "bind_secret_id": role.bind_secret_id,
                "secret_id_ttl": role.secret_id_ttl,
                "secret_id_num_uses": role.secret_id_num_uses,
                "token_ttl": role.token_ttl,
                "token_max_ttl": role.token_max_ttl,
                "token_policies": role.token_policies,
                "realm_id": realm_id
            }
        }))),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "approle not found" })),
        )),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )),
    }
}

/// Delete an AppRole in a realm
pub async fn delete_realm_approle(
    state: Arc<AppState>,
    realm_id: String,
    role_name: String,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let approle_backend = state.approle_backend.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "approle auth not enabled" })),
        )
    })?;

    let realm_uuid = Uuid::parse_str(&realm_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "invalid realm ID" })),
        )
    })?;

    match approle_backend.delete_role(&role_name, Some(realm_uuid)).await {
        Ok(_) => Ok(Json(json!({}))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )),
    }
}

/// Get role_id for an AppRole in a realm
pub async fn get_realm_approle_role_id(
    state: Arc<AppState>,
    realm_id: String,
    role_name: String,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let approle_backend = state.approle_backend.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "approle auth not enabled" })),
        )
    })?;

    let realm_uuid = Uuid::parse_str(&realm_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "invalid realm ID" })),
        )
    })?;

    match approle_backend.get_role_id(&role_name, Some(realm_uuid)).await {
        Ok(role_id) => Ok(Json(json!({
            "data": {
                "role_id": role_id.to_string()
            }
        }))),
        Err(e) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": e.to_string() })),
        )),
    }
}

/// Generate secret_id for an AppRole in a realm
pub async fn generate_realm_approle_secret_id(
    state: Arc<AppState>,
    realm_id: String,
    role_name: String,
    payload: Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let approle_backend = state.approle_backend.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "approle auth not enabled" })),
        )
    })?;

    let realm_uuid = Uuid::parse_str(&realm_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "invalid realm ID" })),
        )
    })?;

    let metadata = payload.get("metadata").cloned();

    match approle_backend.generate_secret_id(&role_name, Some(realm_uuid), metadata).await {
        Ok(response) => Ok(Json(json!({
            "data": {
                "secret_id": response.secret_id,
                "secret_id_accessor": response.accessor.to_string(),
                "secret_id_ttl": response.ttl,
                "secret_id_num_uses": response.num_uses
            }
        }))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )),
    }
}

/// Login with AppRole in a realm
pub async fn realm_approle_login(
    state: Arc<AppState>,
    realm_id: String,
    payload: Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let approle_backend = state.approle_backend.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "approle auth not enabled" })),
        )
    })?;

    let _realm_uuid = Uuid::parse_str(&realm_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "invalid realm ID" })),
        )
    })?;

    let role_id_str = payload
        .get("role_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "role_id is required" })),
            )
        })?;

    let role_id = Uuid::parse_str(role_id_str).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "invalid role_id format" })),
        )
    })?;

    let secret_id = payload
        .get("secret_id")
        .and_then(|v| v.as_str());

    match approle_backend.login(role_id, secret_id).await {
        Ok(response) => Ok(Json(json!({
            "auth": {
                "client_token": response.client_token,
                "accessor": response.accessor,
                "policies": response.policies,
                "token_ttl": response.token_ttl,
                "renewable": response.renewable,
                "realm_id": realm_id
            }
        }))),
        Err(e) => Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": e.to_string() })),
        )),
    }
}
