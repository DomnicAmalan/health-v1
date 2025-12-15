//! Secrets operation handlers
//! 
//! Supports both global secrets and realm-scoped secrets.

use axum::{
    extract::{Path, State},
    http::{StatusCode, Method},
    response::Json,
};
use serde_json::{json, Value, Map};
use std::sync::Arc;
use uuid::Uuid;
use crate::http::routes::AppState;
use crate::logical::{Request as LogicalRequest, Operation};

/// Handle secret operations by routing through core
async fn handle_secret_request(
    state: Arc<AppState>,
    method: Method,
    path: String,
    data: Option<Map<String, Value>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // Determine operation - LIST is typically GET with ?list=true or trailing /
    let operation = match method {
        Method::GET => {
            // Check if this is a list operation (path ends with / or has list query param)
            if path.ends_with('/') {
                Operation::List
            } else {
                Operation::Read
            }
        }
        Method::POST | Method::PUT => Operation::Write,
        Method::DELETE => Operation::Delete,
        _ => return Err((
            StatusCode::METHOD_NOT_ALLOWED,
            Json(json!({"error": "Method not allowed"})),
        )),
    };

    // Create logical request
    let mut req = match operation {
        Operation::Read => LogicalRequest::new_read_request(&path),
        Operation::Write => LogicalRequest::new_write_request(&path, data),
        Operation::Delete => LogicalRequest::new_delete_request(&path, data),
        Operation::List => LogicalRequest::new_list_request(&path),
    };

    // Route through core
    let response = state.core.handle_request(&mut req).await
        .map_err(|e| (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ))?;

    match response {
        Some(resp) => {
            let mut result = Map::new();
            if let Some(data) = resp.data {
                result.insert("data".to_string(), Value::Object(data));
            }
            Ok(Json(Value::Object(result)))
        }
        None => Err((
            StatusCode::NOT_FOUND,
            Json(json!({"error": "Secret not found"})),
        )),
    }
}

/// Read secret endpoint (with State extractor)
pub async fn read_secret(
    State(state): State<Arc<AppState>>,
    Path(path): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    read_secret_with_state(state, path).await
}

/// Read secret endpoint (direct state parameter)
pub async fn read_secret_with_state(
    state: Arc<AppState>,
    path: String,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    handle_secret_request(state, Method::GET, format!("secret/{}", path), None).await
}

/// Write secret endpoint (with State extractor)
pub async fn write_secret(
    State(state): State<Arc<AppState>>,
    Path(path): Path<String>,
    payload: axum::extract::Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    write_secret_with_state(state, path, payload).await
}

/// Write secret endpoint (direct state parameter)
pub async fn write_secret_with_state(
    state: Arc<AppState>,
    path: String,
    payload: axum::extract::Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let data = payload.as_object().cloned();
    handle_secret_request(state, Method::POST, format!("secret/{}", path), data).await
}

/// Delete secret endpoint (with State extractor)
pub async fn delete_secret(
    State(state): State<Arc<AppState>>,
    Path(path): Path<String>,
) -> Result<StatusCode, (StatusCode, Json<Value>)> {
    delete_secret_with_state(state, path).await
}

/// Delete secret endpoint (direct state parameter)
pub async fn delete_secret_with_state(
    state: Arc<AppState>,
    path: String,
) -> Result<StatusCode, (StatusCode, Json<Value>)> {
    match handle_secret_request(state, Method::DELETE, format!("secret/{}", path), None).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(e) => Err(e),
    }
}

/// List secrets endpoint (with State extractor)
pub async fn list_secrets(
    State(state): State<Arc<AppState>>,
    Path(path): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    list_secrets_with_state(state, path).await
}

/// List secrets endpoint (direct state parameter)
pub async fn list_secrets_with_state(
    state: Arc<AppState>,
    path: String,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // For list, ensure path ends with /
    let list_path = if path.ends_with('/') {
        format!("secret/{}", path)
    } else {
        format!("secret/{}/", path)
    };
    handle_secret_request(state, Method::GET, list_path, None).await
}

// ==========================================
// Realm-Scoped Secret Handlers
// ==========================================

/// Handle realm-scoped secret operations
async fn handle_realm_secret_request(
    state: Arc<AppState>,
    realm_id: Uuid,
    method: Method,
    path: String,
    data: Option<Map<String, Value>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // Determine operation
    let operation = match method {
        Method::GET => {
            if path.ends_with('/') || path.is_empty() {
                Operation::List
            } else {
                Operation::Read
            }
        }
        Method::POST | Method::PUT => Operation::Write,
        Method::DELETE => Operation::Delete,
        _ => return Err((
            StatusCode::METHOD_NOT_ALLOWED,
            Json(json!({"error": "Method not allowed"})),
        )),
    };

    // Create logical request with realm context
    let mut req = match operation {
        Operation::Read => LogicalRequest::new_read_request(&path),
        Operation::Write => LogicalRequest::new_write_request(&path, data),
        Operation::Delete => LogicalRequest::new_delete_request(&path, data),
        Operation::List => LogicalRequest::new_list_request(&path),
    };

    // Set realm_id on the request
    req.realm_id = Some(realm_id);

    // Route through core
    let response = state.core.handle_request(&mut req).await
        .map_err(|e| (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ))?;

    match response {
        Some(resp) => {
            let mut result = Map::new();
            result.insert("realm_id".to_string(), Value::String(realm_id.to_string()));
            if let Some(data) = resp.data {
                result.insert("data".to_string(), Value::Object(data));
            }
            Ok(Json(Value::Object(result)))
        }
        None => Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": "Secret not found",
                "realm_id": realm_id.to_string()
            })),
        )),
    }
}

/// Read a secret from a specific realm
pub async fn read_realm_secret(
    state: Arc<AppState>,
    realm_id: String,
    path: String,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let realm_id = Uuid::parse_str(&realm_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid realm ID"})),
        )
    })?;
    
    handle_realm_secret_request(state, realm_id, Method::GET, format!("secret/{}", path), None).await
}

/// Write a secret to a specific realm
pub async fn write_realm_secret(
    state: Arc<AppState>,
    realm_id: String,
    path: String,
    payload: axum::extract::Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let realm_id = Uuid::parse_str(&realm_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid realm ID"})),
        )
    })?;
    
    let data = payload.as_object().cloned();
    handle_realm_secret_request(state, realm_id, Method::POST, format!("secret/{}", path), data).await
}

/// Delete a secret from a specific realm
pub async fn delete_realm_secret(
    state: Arc<AppState>,
    realm_id: String,
    path: String,
) -> Result<StatusCode, (StatusCode, Json<Value>)> {
    let realm_id = Uuid::parse_str(&realm_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid realm ID"})),
        )
    })?;
    
    match handle_realm_secret_request(state, realm_id, Method::DELETE, format!("secret/{}", path), None).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(e) => Err(e),
    }
}

/// List secrets in a specific realm
pub async fn list_realm_secrets(
    state: Arc<AppState>,
    realm_id: String,
    prefix: String,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let realm_id = Uuid::parse_str(&realm_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid realm ID"})),
        )
    })?;
    
    // For list, ensure path ends with /
    let list_path = if prefix.is_empty() {
        "secret/".to_string()
    } else if prefix.ends_with('/') {
        format!("secret/{}", prefix)
    } else {
        format!("secret/{}/", prefix)
    };
    
    handle_realm_secret_request(state, realm_id, Method::GET, list_path, None).await
}

