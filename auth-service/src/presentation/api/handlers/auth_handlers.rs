use axum::{Json, extract::State, http::StatusCode, response::IntoResponse};
use crate::application::dto::{LoginRequest, LoginResponse, RefreshTokenRequest, RefreshTokenResponse, UserInfoResponse};
use crate::shared::{AppResult, AppState};
use std::sync::Arc;

pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(request): Json<LoginRequest>,
) -> impl IntoResponse {
    match state.login_use_case.execute(request).await {
        Ok(response) => (StatusCode::OK, Json(response)).into_response(),
        Err(e) => {
            let status = match e {
                crate::shared::AppError::Authentication(_) => StatusCode::UNAUTHORIZED,
                crate::shared::AppError::NotFound(_) => StatusCode::NOT_FOUND,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };
            (status, Json(serde_json::json!({"error": format!("{}", e)}))).into_response()
        }
    }
}

pub async fn logout(
    State(state): State<Arc<AppState>>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    // Extract refresh token from Authorization header or request body
    // For simplicity, logout just needs to invalidate the session
    // The client should clear tokens locally
    
    // Try to get token from Authorization header
    let refresh_token = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
        .unwrap_or("");

    // If token provided, revoke it
    if !refresh_token.is_empty() {
        let _ = state.logout_use_case.execute(refresh_token).await;
    }

    (StatusCode::OK, Json(serde_json::json!({"message": "Logged out"}))).into_response()
}

pub async fn refresh_token(
    State(state): State<Arc<AppState>>,
    Json(request): Json<RefreshTokenRequest>,
) -> impl IntoResponse {
    match state.refresh_token_use_case.execute(request).await {
        Ok(response) => (StatusCode::OK, Json(response)).into_response(),
        Err(e) => {
            let status = match e {
                crate::shared::AppError::Authentication(_) => StatusCode::UNAUTHORIZED,
                crate::shared::AppError::NotFound(_) => StatusCode::NOT_FOUND,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };
            (status, Json(serde_json::json!({"error": format!("{}", e)}))).into_response()
        }
    }
}

pub async fn userinfo(
    State(state): State<Arc<AppState>>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    // Extract token from Authorization header
    let auth_header = headers.get("authorization")
        .and_then(|h| h.to_str().ok());
    
    let user_id = match extract_user_from_token(&state, auth_header).await {
        Ok(id) => id,
        Err(e) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": format!("{}", e)}))).into_response();
        }
    };

    match state.userinfo_use_case.execute(user_id).await {
        Ok(response) => (StatusCode::OK, Json(response)).into_response(),
        Err(e) => {
            let status = match e {
                crate::shared::AppError::NotFound(_) => StatusCode::NOT_FOUND,
                crate::shared::AppError::Authentication(_) => StatusCode::UNAUTHORIZED,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };
            (status, Json(serde_json::json!({"error": format!("{}", e)}))).into_response()
        }
    }
}

// Helper to extract user ID from token
async fn extract_user_from_token(state: &Arc<AppState>, auth_header: Option<&str>) -> AppResult<uuid::Uuid> {
    let token = auth_header
        .and_then(|h| h.strip_prefix("Bearer "))
        .ok_or_else(|| crate::shared::AppError::Authentication("Missing or invalid Authorization header".to_string()))?;

    let claims = state.token_manager.validate_token(token)?;
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| crate::shared::AppError::Authentication("Invalid user ID in token".to_string()))?;
    
    Ok(user_id)
}

