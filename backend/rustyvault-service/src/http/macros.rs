//! HTTP Handler Macros
//!
//! Eliminates 250+ lines of repeated validation boilerplate across vault handlers.
//! Provides standardized error responses and validation patterns.

/// Requires a field from the AppState context, returning a 503 error if not initialized.
///
/// This macro eliminates the repeated pattern of checking if optional AppState fields
/// are initialized. Used extensively across policy, secrets, and app handlers.
///
/// # Examples
///
/// ```rust,ignore
/// // Before: 5 lines
/// let policy_store = state.policy_store.as_ref().ok_or_else(|| {
///     (
///         StatusCode::SERVICE_UNAVAILABLE,
///         Json(json!({ "error": "policy store not initialized" })),
///     )
/// })?;
///
/// // After: 1 line
/// let policy_store = require_context!(state, policy_store, "policy store not initialized");
/// ```
///
/// # Arguments
///
/// * `$state` - The AppState Arc reference
/// * `$field` - The field name to access
/// * `$error_msg` - The error message to return if field is None
#[macro_export]
macro_rules! require_context {
    ($state:expr, $field:ident, $error_msg:expr) => {
        $state.$field.as_ref().ok_or_else(|| {
            (
                axum::http::StatusCode::SERVICE_UNAVAILABLE,
                axum::Json(serde_json::json!({ "error": $error_msg })),
            )
        })?
    };
}

/// Parses a UUID from a string, returning a 400 error if invalid.
///
/// This macro eliminates the repeated pattern of UUID parsing with error handling.
/// Used across 30+ handler functions for parsing realm IDs, app IDs, role IDs, etc.
///
/// # Examples
///
/// ```rust,ignore
/// // Before: 5 lines
/// let realm_uuid = Uuid::parse_str(&realm_id).map_err(|_| {
///     (
///         StatusCode::BAD_REQUEST,
///         Json(json!({ "error": "invalid realm ID" })),
///     )
/// })?;
///
/// // After: 1 line
/// let realm_uuid = parse_uuid!(realm_id, "realm ID");
/// ```
///
/// # Arguments
///
/// * `$id` - The string ID to parse
/// * `$field_name` - The human-readable field name for error messages
#[macro_export]
macro_rules! parse_uuid {
    ($id:expr, $field_name:expr) => {
        uuid::Uuid::parse_str(&$id).map_err(|_| {
            (
                axum::http::StatusCode::BAD_REQUEST,
                axum::Json(serde_json::json!({
                    "error": format!("invalid {}", $field_name)
                })),
            )
        })?
    };
}

/// Extracts a required field from a JSON payload, returning a 400 error if missing.
///
/// This macro simplifies the pattern of extracting and validating required fields
/// from request payloads.
///
/// # Examples
///
/// ```rust,ignore
/// // Before: 6 lines
/// let policy_content = payload
///     .get("policy")
///     .and_then(|v| v.as_str())
///     .ok_or_else(|| {
///         (StatusCode::BAD_REQUEST, Json(json!({ "error": "policy content is required" })))
///     })?;
///
/// // After: 1 line
/// let policy_content = require_field!(payload, "policy", as_str, "policy content is required");
/// ```
///
/// # Arguments
///
/// * `$payload` - The JSON Value payload
/// * `$field` - The field name to extract
/// * `$as_type` - The conversion method (as_str, as_i64, as_bool, etc.)
/// * `$error_msg` - The error message if field is missing or wrong type
#[macro_export]
macro_rules! require_field {
    ($payload:expr, $field:expr, $as_type:ident, $error_msg:expr) => {
        $payload
            .get($field)
            .and_then(|v| v.$as_type())
            .ok_or_else(|| {
                (
                    axum::http::StatusCode::BAD_REQUEST,
                    axum::Json(serde_json::json!({ "error": $error_msg })),
                )
            })?
    };
}

/// Returns a standardized error response.
///
/// This macro provides a consistent way to return error responses with
/// appropriate status codes and JSON error messages.
///
/// # Examples
///
/// ```rust,ignore
/// // Before:
/// return Err((
///     StatusCode::NOT_FOUND,
///     Json(json!({ "error": "policy not found" })),
/// ));
///
/// // After:
/// return error_response!(NOT_FOUND, "policy not found");
/// ```
///
/// # Arguments
///
/// * `$status` - The HTTP status code (without StatusCode:: prefix)
/// * `$message` - The error message
#[macro_export]
macro_rules! error_response {
    ($status:ident, $message:expr) => {
        Err((
            axum::http::StatusCode::$status,
            axum::Json(serde_json::json!({ "error": $message })),
        ))
    };
}

/// Returns a standardized success response with data.
///
/// This macro provides a consistent way to return successful JSON responses.
///
/// # Examples
///
/// ```rust,ignore
/// // Before:
/// Ok(Json(json!({
///     "name": policy.name,
///     "policy": policy.raw,
///     "type": policy.policy_type.to_string()
/// })))
///
/// // After:
/// success_response!({
///     "name": policy.name,
///     "policy": policy.raw,
///     "type": policy.policy_type.to_string()
/// })
/// ```
///
/// # Arguments
///
/// * `$data` - The JSON data to return (can be a json! macro invocation or Value)
#[macro_export]
macro_rules! success_response {
    ($data:tt) => {
        Ok(axum::Json(serde_json::json!($data)))
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;
    use axum::Json;
    use serde_json::{json, Value};
    use std::sync::Arc;
    use uuid::Uuid;

    // Mock AppState for testing
    struct TestState {
        policy_store: Option<String>,
        secret_store: Option<String>,
    }

    #[test]
    fn test_parse_uuid_valid() -> Result<(), (StatusCode, Json<Value>)> {
        let id = "550e8400-e29b-41d4-a716-446655440000";
        let result: Uuid = parse_uuid!(id, "test ID");
        assert_eq!(
            result.to_string(),
            "550e8400-e29b-41d4-a716-446655440000"
        );
        Ok(())
    }

    #[test]
    fn test_parse_uuid_invalid() {
        let id = "invalid-uuid";
        // Test macro without ? operator by using the underlying pattern
        let result: Result<Uuid, (StatusCode, Json<Value>)> =
            Uuid::parse_str(id).map_err(|_| {
                (
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "error": format!("invalid {}", "test ID") })),
                )
            });
        assert!(result.is_err());
        if let Err((status, json)) = result {
            assert_eq!(status, StatusCode::BAD_REQUEST);
            assert_eq!(json.0["error"], "invalid test ID");
        }
    }

    #[test]
    fn test_require_field_string() -> Result<(), (StatusCode, Json<Value>)> {
        let payload = json!({
            "name": "test",
            "value": 42
        });

        let name: &str = require_field!(payload, "name", as_str, "name is required");
        assert_eq!(name, "test");
        Ok(())
    }

    #[test]
    fn test_require_field_missing() {
        let payload = json!({
            "value": 42
        });

        // Test macro without ? operator by using the underlying pattern
        let result: Result<&str, (StatusCode, Json<Value>)> = payload
            .get("name")
            .and_then(|v| v.as_str())
            .ok_or_else(|| {
                (
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "error": "name is required" })),
                )
            });
        assert!(result.is_err());
    }
}
