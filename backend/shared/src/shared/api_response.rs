// API Response Types
// Standard response structures for HTTP APIs

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};

use super::error::{AppError, ErrorKind};

/// Standard API response wrapper
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<ErrorResponse>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorResponse {
    pub code: String,
    pub message: String,
    pub details: Option<serde_json::Value>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
            timestamp: chrono::Utc::now(),
        }
    }

    pub fn error(code: String, message: String) -> ApiResponse<()> {
        ApiResponse {
            success: false,
            data: None,
            error: Some(ErrorResponse {
                code,
                message,
                details: None,
            }),
            timestamp: chrono::Utc::now(),
        }
    }
}

/// API Error type that can be returned from handlers
pub struct ApiError(pub AppError);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, error_code) = match &self.0.kind() {
            ErrorKind::NotFound => (StatusCode::NOT_FOUND, "NOT_FOUND"),
            ErrorKind::Unauthorized => (StatusCode::UNAUTHORIZED, "UNAUTHORIZED"),
            ErrorKind::Forbidden => (StatusCode::FORBIDDEN, "FORBIDDEN"),
            ErrorKind::Validation => (StatusCode::BAD_REQUEST, "VALIDATION_ERROR"),
            ErrorKind::Conflict => (StatusCode::CONFLICT, "CONFLICT"),
            ErrorKind::InvalidState => (StatusCode::UNPROCESSABLE_ENTITY, "INVALID_STATE"),
            _ => (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR"),
        };

        let response = ApiResponse::<()>::error(
            error_code.to_string(),
            self.0.to_string(),
        );

        (status, Json(response)).into_response()
    }
}

impl From<AppError> for ApiError {
    fn from(err: AppError) -> Self {
        ApiError(err)
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(err: sqlx::Error) -> Self {
        ApiError(AppError::from(err))
    }
}
