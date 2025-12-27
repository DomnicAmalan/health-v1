use axum::{
    http::StatusCode,
    response::{IntoResponse, Json, Response},
};
use serde_json::json;
use shared::AppError;

macro_rules! handle_result {
    ($result:expr, $operation:expr) => {
        match $result {
            Ok(data) => (StatusCode::OK, Json(data)).into_response(),
            Err(e) => {
                let location = concat!(file!(), ":", line!());
                e.log_with_operation(location, $operation);
                error_response(StatusCode::BAD_REQUEST, &format!("Failed to {}: {}", $operation, e))
            }
        }
    };
    ($result:expr, $operation:expr, $success_status:expr) => {
        match $result {
            Ok(data) => ($success_status, Json(data)).into_response(),
            Err(e) => {
                let location = concat!(file!(), ":", line!());
                e.log_with_operation(location, $operation);
                error_response(StatusCode::BAD_REQUEST, &format!("Failed to {}: {}", $operation, e))
            }
        }
    };
}

macro_rules! here {
    () => {
        concat!(file!(), ":", line!())
    };
}

fn error_response(status: StatusCode, message: &str) -> Response {
    (status, Json(json!({ "error": message }))).into_response()
}

pub use handle_result;
pub use here;