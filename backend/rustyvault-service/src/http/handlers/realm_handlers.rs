//! HTTP handlers for realm management

use std::sync::Arc;

use axum::{
    http::StatusCode,
    Json,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::http::routes::AppState;
use crate::modules::realm::{CreateRealmRequest, UpdateRealmRequest};

/// List all realms
pub async fn list_realms(
    state: Arc<AppState>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let realm_store = state.realm_store.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "realm store not initialized" })),
        )
    })?;

    match realm_store.list().await {
        Ok(realms) => {
            let realm_data: Vec<Value> = realms
                .iter()
                .map(|r| {
                    json!({
                        "id": r.id,
                        "name": r.name,
                        "display_name": r.display_name,
                        "description": r.description,
                        "organization_id": r.organization_id,
                        "is_active": r.is_active,
                        "default_lease_ttl": r.default_lease_ttl,
                        "max_lease_ttl": r.max_lease_ttl,
                        "created_at": r.created_at,
                        "updated_at": r.updated_at,
                    })
                })
                .collect();

            Ok(Json(json!({
                "data": {
                    "keys": realms.iter().map(|r| r.name.clone()).collect::<Vec<_>>(),
                    "realms": realm_data
                }
            })))
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )),
    }
}

/// Create a new realm
pub async fn create_realm(
    state: Arc<AppState>,
    payload: Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let realm_store = state.realm_store.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "realm store not initialized" })),
        )
    })?;

    // Parse request
    let name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "name is required" })),
            )
        })?;

    let description = payload.get("description").and_then(|v| v.as_str()).map(String::from);
    let display_name = payload.get("display_name").and_then(|v| v.as_str()).map(String::from);
    
    let organization_id = payload
        .get("organization_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());

    let config = payload.get("config").cloned();
    
    let default_lease_ttl = payload
        .get("default_lease_ttl")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);
    
    let max_lease_ttl = payload
        .get("max_lease_ttl")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);

    let request = CreateRealmRequest {
        name: name.to_string(),
        description,
        display_name,
        organization_id,
        config,
        default_lease_ttl,
        max_lease_ttl,
    };

    match realm_store.create(&request).await {
        Ok(realm) => Ok(Json(json!({
            "data": {
                "id": realm.id,
                "name": realm.name,
                "display_name": realm.display_name,
                "description": realm.description,
                "organization_id": realm.organization_id,
                "config": realm.config,
                "is_active": realm.is_active,
                "default_lease_ttl": realm.default_lease_ttl,
                "max_lease_ttl": realm.max_lease_ttl,
                "created_at": realm.created_at,
                "updated_at": realm.updated_at,
            }
        }))),
        Err(e) => {
            let status = if e.to_string().contains("already exists") {
                StatusCode::CONFLICT
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            Err((
                status,
                Json(json!({ "error": e.to_string() })),
            ))
        }
    }
}

/// Get a realm by ID
pub async fn get_realm(
    state: Arc<AppState>,
    realm_id: String,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let realm_store = state.realm_store.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "realm store not initialized" })),
        )
    })?;

    // Try to parse as UUID first, then as name
    let realm = if let Ok(id) = Uuid::parse_str(&realm_id) {
        realm_store.get(id).await
    } else {
        realm_store.get_by_name(&realm_id).await
    };

    match realm {
        Ok(Some(realm)) => Ok(Json(json!({
            "data": {
                "id": realm.id,
                "name": realm.name,
                "display_name": realm.display_name,
                "description": realm.description,
                "organization_id": realm.organization_id,
                "config": realm.config,
                "is_active": realm.is_active,
                "default_lease_ttl": realm.default_lease_ttl,
                "max_lease_ttl": realm.max_lease_ttl,
                "created_at": realm.created_at,
                "updated_at": realm.updated_at,
            }
        }))),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "realm not found" })),
        )),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )),
    }
}

/// Update a realm
pub async fn update_realm(
    state: Arc<AppState>,
    realm_id: String,
    payload: Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let realm_store = state.realm_store.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "realm store not initialized" })),
        )
    })?;

    // Parse realm ID
    let id = Uuid::parse_str(&realm_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "invalid realm ID" })),
        )
    })?;

    // Parse update request
    let request = UpdateRealmRequest {
        name: payload.get("name").and_then(|v| v.as_str()).map(String::from),
        description: payload.get("description").and_then(|v| v.as_str()).map(String::from),
        display_name: payload.get("display_name").and_then(|v| v.as_str()).map(String::from),
        config: payload.get("config").cloned(),
        default_lease_ttl: payload.get("default_lease_ttl").and_then(|v| v.as_i64()).map(|v| v as i32),
        max_lease_ttl: payload.get("max_lease_ttl").and_then(|v| v.as_i64()).map(|v| v as i32),
        is_active: payload.get("is_active").and_then(|v| v.as_bool()),
    };

    match realm_store.update(id, &request).await {
        Ok(realm) => Ok(Json(json!({
            "data": {
                "id": realm.id,
                "name": realm.name,
                "display_name": realm.display_name,
                "description": realm.description,
                "organization_id": realm.organization_id,
                "config": realm.config,
                "is_active": realm.is_active,
                "default_lease_ttl": realm.default_lease_ttl,
                "max_lease_ttl": realm.max_lease_ttl,
                "created_at": realm.created_at,
                "updated_at": realm.updated_at,
            }
        }))),
        Err(e) => {
            let status = if e.to_string().contains("not found") {
                StatusCode::NOT_FOUND
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            Err((
                status,
                Json(json!({ "error": e.to_string() })),
            ))
        }
    }
}

/// Delete a realm
pub async fn delete_realm(
    state: Arc<AppState>,
    realm_id: String,
) -> Result<StatusCode, (StatusCode, Json<Value>)> {
    let realm_store = state.realm_store.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "realm store not initialized" })),
        )
    })?;

    // Parse realm ID
    let id = Uuid::parse_str(&realm_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "invalid realm ID" })),
        )
    })?;

    match realm_store.delete(id).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            let status = if e.to_string().contains("not found") {
                StatusCode::NOT_FOUND
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            Err((
                status,
                Json(json!({ "error": e.to_string() })),
            ))
        }
    }
}

/// Get realms by organization ID
pub async fn get_realms_by_organization(
    state: Arc<AppState>,
    organization_id: String,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let realm_store = state.realm_store.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "realm store not initialized" })),
        )
    })?;

    // Parse organization ID
    let org_id = Uuid::parse_str(&organization_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "invalid organization ID" })),
        )
    })?;

    match realm_store.list_by_organization(org_id).await {
        Ok(realms) => {
            let realm_data: Vec<Value> = realms
                .iter()
                .map(|r| {
                    json!({
                        "id": r.id,
                        "name": r.name,
                        "display_name": r.display_name,
                        "description": r.description,
                        "organization_id": r.organization_id,
                        "is_active": r.is_active,
                        "default_lease_ttl": r.default_lease_ttl,
                        "max_lease_ttl": r.max_lease_ttl,
                        "created_at": r.created_at,
                        "updated_at": r.updated_at,
                    })
                })
                .collect();

            Ok(Json(json!({
                "data": {
                    "keys": realms.iter().map(|r| r.name.clone()).collect::<Vec<_>>(),
                    "realms": realm_data
                }
            })))
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )),
    }
}

