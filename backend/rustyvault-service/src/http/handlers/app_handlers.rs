//! HTTP handlers for realm application management
//! ✨ DRY: Using validation macros

use std::sync::Arc;

use axum::{
    http::StatusCode,
    Json,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::http::routes::AppState;
use crate::modules::realm::{CreateAppRequest, UpdateAppRequest};
use crate::parse_uuid;

/// List all applications in a realm
pub async fn list_apps(
    state: Arc<AppState>,
    realm_id: String,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let app_store = state.app_store.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "app store not initialized" })),
        )
    })?;

    // Parse realm ID
    let realm_id = parse_uuid!(realm_id, "realm ID");

    match app_store.list(realm_id).await {
        Ok(apps) => {
            let app_data: Vec<Value> = apps
                .iter()
                .map(|app| {
                    json!({
                        "id": app.id,
                        "realm_id": app.realm_id,
                        "app_name": app.app_name,
                        "app_type": app.app_type,
                        "display_name": app.display_name,
                        "description": app.description,
                        "config": app.config,
                        "allowed_auth_methods": app.allowed_auth_methods,
                        "is_active": app.is_active,
                        "created_at": app.created_at,
                        "updated_at": app.updated_at,
                    })
                })
                .collect();

            Ok(Json(json!({
                "data": {
                    "keys": apps.iter().map(|a| a.app_name.clone()).collect::<Vec<_>>(),
                    "apps": app_data
                }
            })))
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )),
    }
}

/// Create a new application in a realm
pub async fn create_app(
    state: Arc<AppState>,
    realm_id: String,
    payload: Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let app_store = state.app_store.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "app store not initialized" })),
        )
    })?;

    // Parse realm ID
    let realm_id = parse_uuid!(realm_id, "realm ID");

    // Parse request
    let app_name = payload
        .get("app_name")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "app_name is required" })),
            )
        })?;

    let app_type = payload
        .get("app_type")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "app_type is required" })),
            )
        })?;

    let display_name = payload.get("display_name").and_then(|v| v.as_str()).map(String::from);
    let description = payload.get("description").and_then(|v| v.as_str()).map(String::from);
    let config = payload.get("config").cloned();
    
    let allowed_auth_methods: Option<Vec<String>> = payload
        .get("allowed_auth_methods")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        });

    let request = CreateAppRequest {
        app_name: app_name.to_string(),
        app_type: app_type.to_string(),
        display_name,
        description,
        config,
        allowed_auth_methods,
    };

    match app_store.create(realm_id, &request).await {
        Ok(app) => Ok(Json(json!({
            "data": {
                "id": app.id,
                "realm_id": app.realm_id,
                "app_name": app.app_name,
                "app_type": app.app_type,
                "display_name": app.display_name,
                "description": app.description,
                "config": app.config,
                "allowed_auth_methods": app.allowed_auth_methods,
                "is_active": app.is_active,
                "created_at": app.created_at,
                "updated_at": app.updated_at,
            }
        }))),
        Err(e) => {
            let status = if e.to_string().contains("already exists") {
                StatusCode::CONFLICT
            } else if e.to_string().contains("invalid app_type") {
                StatusCode::BAD_REQUEST
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

/// Get an application by name in a realm
pub async fn get_app(
    state: Arc<AppState>,
    realm_id: String,
    app_name: String,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let app_store = state.app_store.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "app store not initialized" })),
        )
    })?;

    // Parse realm ID
    let realm_id = parse_uuid!(realm_id, "realm ID");

    match app_store.get_by_name(realm_id, &app_name).await {
        Ok(Some(app)) => Ok(Json(json!({
            "data": {
                "id": app.id,
                "realm_id": app.realm_id,
                "app_name": app.app_name,
                "app_type": app.app_type,
                "display_name": app.display_name,
                "description": app.description,
                "config": app.config,
                "allowed_auth_methods": app.allowed_auth_methods,
                "is_active": app.is_active,
                "created_at": app.created_at,
                "updated_at": app.updated_at,
            }
        }))),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "application not found" })),
        )),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )),
    }
}

/// Update an application
pub async fn update_app(
    state: Arc<AppState>,
    realm_id: String,
    app_name: String,
    payload: Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let app_store = state.app_store.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "app store not initialized" })),
        )
    })?;

    // Parse realm ID
    let realm_id = parse_uuid!(realm_id, "realm ID");

    // Get existing app
    let existing_app = app_store.get_by_name(realm_id, &app_name).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )
    })?;

    let app = existing_app.ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "application not found" })),
        )
    })?;

    // Parse update request
    let request = UpdateAppRequest {
        display_name: payload.get("display_name").and_then(|v| v.as_str()).map(String::from),
        description: payload.get("description").and_then(|v| v.as_str()).map(String::from),
        config: payload.get("config").cloned(),
        allowed_auth_methods: payload
            .get("allowed_auth_methods")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect()
            }),
        is_active: payload.get("is_active").and_then(|v| v.as_bool()),
    };

    match app_store.update(app.id, &request).await {
        Ok(app) => Ok(Json(json!({
            "data": {
                "id": app.id,
                "realm_id": app.realm_id,
                "app_name": app.app_name,
                "app_type": app.app_type,
                "display_name": app.display_name,
                "description": app.description,
                "config": app.config,
                "allowed_auth_methods": app.allowed_auth_methods,
                "is_active": app.is_active,
                "created_at": app.created_at,
                "updated_at": app.updated_at,
            }
        }))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )),
    }
}

/// Delete an application
pub async fn delete_app(
    state: Arc<AppState>,
    realm_id: String,
    app_name: String,
) -> Result<StatusCode, (StatusCode, Json<Value>)> {
    let app_store = state.app_store.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "app store not initialized" })),
        )
    })?;

    // Parse realm ID
    let realm_id = parse_uuid!(realm_id, "realm ID");

    match app_store.delete_by_name(realm_id, &app_name).await {
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

/// Register default applications for a realm
pub async fn register_default_apps(
    state: Arc<AppState>,
    realm_id: String,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let app_store = state.app_store.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "app store not initialized" })),
        )
    })?;

    // Parse realm ID
    let realm_id = parse_uuid!(realm_id, "realm ID");

    match app_store.register_default_apps(realm_id).await {
        Ok(apps) => {
            let app_names: Vec<&str> = apps.iter().map(|a| a.app_name.as_str()).collect();
            Ok(Json(json!({
                "data": {
                    "registered": app_names,
                    "count": apps.len()
                }
            })))
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )),
    }
}

