//! System operation handlers

use axum::{
    extract::{State, Query},
    http::{StatusCode, HeaderMap, HeaderValue, header},
    response::{Response, IntoResponse, Json},
    body::Body,
};
use serde_json::{json, Value};
use std::sync::Arc;
use base64::Engine;
use std::collections::HashMap;
use crate::http::routes::AppState;
use crate::modules::auth::CreateTokenRequest;

/// Health check endpoint (with State extractor)
pub async fn health_check(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    health_check_with_state(state).await
}

/// Health check endpoint (direct state parameter)
pub async fn health_check_with_state(
    state: Arc<AppState>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // Check initialization status - log errors but don't fail the health check
    let initialized = match state.core.inited().await {
        Ok(val) => val,
        Err(e) => {
            tracing::warn!("Failed to check vault initialization status: {}", e);
            false
        }
    };
    let sealed = state.core.is_sealed();
    
    Ok(Json(json!({
        "initialized": initialized,
        "sealed": sealed,
        "standby": false,
        "performance_standby": false,
        "replication_performance_mode": "disabled",
        "replication_dr_mode": "disabled",
        "server_time_utc": chrono::Utc::now().timestamp(),
        "version": "0.1.0",
        "cluster_name": "",
        "cluster_id": ""
    })))
}

/// Seal status endpoint (with State extractor)
pub async fn seal_status(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    seal_status_with_state(state).await
}

/// Seal status endpoint (direct state parameter)
pub async fn seal_status_with_state(
    state: Arc<AppState>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let sealed = state.core.is_sealed();
    let progress = if sealed {
        state.core.unseal_progress()
    } else {
        0
    };
    let seal_config = state.core.seal_config().await
        .unwrap_or(crate::core::SealConfig {
            secret_shares: 5,
            secret_threshold: 3,
        });
    
    Ok(Json(json!({
        "sealed": sealed,
        "t": seal_config.secret_threshold,
        "n": seal_config.secret_shares,
        "progress": progress,
        "nonce": "",
        "version": "0.1.0",
        "cluster_name": "",
        "cluster_id": "",
        "recovery_seal": false,
        "storage_type": "file"
    })))
}

/// Seal endpoint (with State extractor)
pub async fn seal(
    State(state): State<Arc<AppState>>,
) -> Result<StatusCode, (StatusCode, Json<Value>)> {
    seal_with_state(state).await
}

/// Seal endpoint (direct state parameter)
pub async fn seal_with_state(
    state: Arc<AppState>,
) -> Result<StatusCode, (StatusCode, Json<Value>)> {
    state.core.seal().await
        .map_err(|e| (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ))?;
    Ok(StatusCode::NO_CONTENT)
}

/// Unseal endpoint (with State extractor)
pub async fn unseal(
    State(state): State<Arc<AppState>>,
    payload: axum::extract::Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    unseal_with_state(state, payload).await
}

/// Unseal endpoint (direct state parameter)
pub async fn unseal_with_state(
    state: Arc<AppState>,
    payload: axum::extract::Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let key_str = payload.get("key")
        .and_then(|v| v.as_str())
        .ok_or_else(|| (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Missing 'key' field"})),
        ))?;

    let key = base64::engine::general_purpose::STANDARD.decode(key_str)
        .map_err(|_| (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid base64 key"})),
        ))?;

    let unsealed = state.core.unseal(&key).await
        .map_err(|e| (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ))?;

    let progress = state.core.unseal_progress();
    let seal_config = state.core.seal_config().await
        .unwrap_or(crate::core::SealConfig {
            secret_shares: 5,
            secret_threshold: 3,
        });

    Ok(Json(json!({
        "sealed": !unsealed,
        "t": seal_config.secret_threshold,
        "n": seal_config.secret_shares,
        "progress": progress,
    })))
}

/// Initialize endpoint (with State extractor)
pub async fn init(
    State(state): State<Arc<AppState>>,
    payload: axum::extract::Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    init_with_state(state, payload).await
}

/// Initialize endpoint (direct state parameter)
pub async fn init_with_state(
    state: Arc<AppState>,
    payload: axum::extract::Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let secret_shares = payload.get("secret_shares")
        .and_then(|v| v.as_u64())
        .map(|v| v as u8)
        .unwrap_or(5);
    
    let secret_threshold = payload.get("secret_threshold")
        .and_then(|v| v.as_u64())
        .map(|v| v as u8)
        .unwrap_or(3);

    let seal_config = crate::core::SealConfig {
        secret_shares,
        secret_threshold,
    };

    let result = state.core.init(&seal_config).await
        .map_err(|e| (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ))?;

    // Convert keys to base64 (clone the keys since InitResult has Drop trait)
    let keys: Vec<String> = result.secret_shares.iter()
        .map(|k| base64::engine::general_purpose::STANDARD.encode(k.as_slice()))
        .collect();
    
    // Clone keys for storage (since we need to move root_token)
    let keys_for_storage = keys.clone();

    // Create root token in token store (vault is unsealed at this point)
    let root_token = if let Some(token_store) = &state.token_store {
        match token_store.create_root_token().await {
            Ok(stored_root_token) => stored_root_token,
            Err(_) => result.root_token.clone(),
        }
    } else {
        result.root_token.clone()
    };

    // Store keys temporarily with download token (expires in 1 hour, single-use)
    let download_token = state.key_storage.store_keys(
        keys_for_storage,
        root_token.clone(),
        secret_shares,
        secret_threshold,
        1, // 1 hour expiration
        false, // Allow multiple downloads within expiration
    ).await;

    // Build response with download URL
    let mut response = json!({
        "keys": keys,
        "keys_base64": keys,
        "root_token": root_token,
        "download_token": download_token,
        "keys_download_url": format!("/v1/sys/init/keys.txt?token={}", download_token),
    });

    Ok(Json(response))
}

/// Download keys as text file endpoint (with State extractor)
pub async fn download_keys_file(
    State(state): State<Arc<AppState>>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Response, (StatusCode, Json<Value>)> {
    download_keys_file_with_state(state, params).await
}

/// Download keys as text file endpoint (direct state parameter)
pub async fn download_keys_file_with_state(
    state: Arc<AppState>,
    params: HashMap<String, String>,
) -> Result<Response, (StatusCode, Json<Value>)> {
    let token = params.get("token")
        .ok_or_else(|| (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Missing 'token' parameter"})),
        ))?;

    let stored_keys = state.key_storage.get_keys(token).await
        .ok_or_else(|| (
            StatusCode::NOT_FOUND,
            Json(json!({"error": "Invalid or expired download token"})),
        ))?;

    // Generate formatted text file
    let mut file_content = String::new();
    file_content.push_str("========================================\n");
    file_content.push_str("RustyVault Initialization Credentials\n");
    file_content.push_str(&format!("Generated: {}\n", chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")));
    file_content.push_str("========================================\n\n");
    file_content.push_str("WARNING: Store this file securely! These credentials are shown only once.\n\n");
    file_content.push_str("ROOT TOKEN (Use this to authenticate):\n");
    file_content.push_str(&stored_keys.root_token);
    file_content.push_str("\n\n");
    file_content.push_str("========================================\n");
    file_content.push_str("UNSEAL KEYS\n");
    file_content.push_str("========================================\n");
    file_content.push_str(&format!("You need {} of {} keys to unseal the vault.\n\n", stored_keys.secret_threshold, stored_keys.secret_shares));
    
    for (index, key) in stored_keys.keys_base64.iter().enumerate() {
        file_content.push_str(&format!("Unseal Key {} of {}:\n", index + 1, stored_keys.keys_base64.len()));
        file_content.push_str(key);
        file_content.push_str("\n\n");
    }
    
    file_content.push_str("========================================\n");
    file_content.push_str("INSTRUCTIONS\n");
    file_content.push_str("========================================\n");
    file_content.push_str("1. Use the ROOT TOKEN above to login to the vault UI\n");
    file_content.push_str("2. Store unseal keys in separate secure locations\n");
    file_content.push_str(&format!("3. You need {} of {} keys to unseal the vault\n", stored_keys.secret_threshold, stored_keys.secret_shares));
    file_content.push_str("4. Never share keys via insecure channels\n");
    file_content.push_str("5. This file can be deleted after you've saved the credentials securely\n");
    file_content.push_str("========================================\n");

    // Create response with proper headers for file download
    let filename = format!("rustyvault-credentials-{}.txt", chrono::Utc::now().format("%Y%m%d-%H%M%S"));
    let disposition = format!("attachment; filename=\"{}\"", filename);
    
    let disposition_header = HeaderValue::from_str(&disposition)
        .map_err(|_| (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Failed to create response headers"})),
        ))?;

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "text/plain; charset=utf-8")
        .header(header::CONTENT_DISPOSITION, disposition_header)
        .body(Body::from(file_content))
        .map_err(|_| (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Failed to create response"})),
        ))?
        .into_response())
}

/// Get keys as JSON endpoint (authenticated, for UI display)
pub async fn get_keys_authenticated(
    State(state): State<Arc<AppState>>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    get_keys_authenticated_with_state(state, params).await
}

/// Get keys as JSON endpoint (direct state parameter)
pub async fn get_keys_authenticated_with_state(
    state: Arc<AppState>,
    params: HashMap<String, String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let token = params.get("token")
        .ok_or_else(|| (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Missing 'token' parameter"})),
        ))?;

    let stored_keys = state.key_storage.get_keys(token).await
        .ok_or_else(|| (
            StatusCode::NOT_FOUND,
            Json(json!({"error": "Invalid or expired download token"})),
        ))?;

    Ok(Json(json!({
        "keys": stored_keys.keys_base64,
        "keys_base64": stored_keys.keys_base64,
        "root_token": stored_keys.root_token,
        "secret_shares": stored_keys.secret_shares,
        "secret_threshold": stored_keys.secret_threshold,
        "expires_at": stored_keys.expires_at,
    })))
}

