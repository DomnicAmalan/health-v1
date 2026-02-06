//! Database utility macros and functions
//!
//! Provides helper macros and functions for common database operations:
//! - Option<T> to T conversions with defaults
//! - Query timeout handling
//! - Dynamic query building
//!
//! Tiger Style compliance: bounded operations, explicit error handling

use crate::shared::error::AppError;

// ============================================================================
// Conversion Macros
// ============================================================================

/// Convert Option<bool> to bool with default false
/// Usage: `unwrap_bool!(option_value)` or `unwrap_bool!(option_value, true)`
#[macro_export]
macro_rules! unwrap_bool {
    ($opt:expr) => {
        $opt.unwrap_or(false)
    };
    ($opt:expr, $default:expr) => {
        $opt.unwrap_or($default)
    };
}

/// Convert Option<String> to String with default empty string
/// Usage: `unwrap_string!(option_value)` or `unwrap_string!(option_value, "default")`
#[macro_export]
macro_rules! unwrap_string {
    ($opt:expr) => {
        $opt.unwrap_or_default()
    };
    ($opt:expr, $default:expr) => {
        $opt.unwrap_or_else(|| $default.to_string())
    };
}

/// Convert Option<i32> to i32 with default 0
/// Usage: `unwrap_i32!(option_value)` or `unwrap_i32!(option_value, 42)`
#[macro_export]
macro_rules! unwrap_i32 {
    ($opt:expr) => {
        $opt.unwrap_or(0)
    };
    ($opt:expr, $default:expr) => {
        $opt.unwrap_or($default)
    };
}

/// Convert Option<i64> to i64 with default 0
/// Usage: `unwrap_i64!(option_value)` or `unwrap_i64!(option_value, 42)`
#[macro_export]
macro_rules! unwrap_i64 {
    ($opt:expr) => {
        $opt.unwrap_or(0)
    };
    ($opt:expr, $default:expr) => {
        $opt.unwrap_or($default)
    };
}

// ============================================================================
// Timeout Macros
// ============================================================================

/// Execute a database query with timeout, returning AppError::Timeout on timeout
/// Usage: `db_timeout!(5, query.fetch_all(pool))`
#[macro_export]
macro_rules! db_timeout {
    ($secs:expr, $query:expr) => {
        tokio::time::timeout(
            std::time::Duration::from_secs($secs),
            $query
        )
        .await
        .map_err(|_| $crate::shared::error::AppError::Timeout("Query timed out".to_string()))?
    };
    ($secs:expr, $query:expr, $msg:expr) => {
        tokio::time::timeout(
            std::time::Duration::from_secs($secs),
            $query
        )
        .await
        .map_err(|_| $crate::shared::error::AppError::Timeout($msg.to_string()))?
    };
}

/// Standard 5-second database query timeout
#[macro_export]
macro_rules! db_query {
    ($query:expr) => {
        $crate::db_timeout!(5, $query)
    };
}

// ============================================================================
// Validation Macros
// ============================================================================

/// Validate that a string is not empty, returning AppError::Validation if it is
/// Usage: `validate_not_empty!(field, "field_name")`
#[macro_export]
macro_rules! validate_not_empty {
    ($field:expr, $name:expr) => {
        if $field.is_empty() {
            return Err($crate::shared::error::AppError::Validation(
                format!("{} cannot be empty", $name)
            ));
        }
    };
}

/// Validate string length bounds
/// Usage: `validate_length!(text, "field_name", 10000)`
#[macro_export]
macro_rules! validate_length {
    ($field:expr, $name:expr, $max:expr) => {
        if $field.len() > $max {
            return Err($crate::shared::error::AppError::Validation(
                format!("{} exceeds maximum length of {} characters", $name, $max)
            ));
        }
    };
    ($field:expr, $name:expr, $min:expr, $max:expr) => {
        if $field.len() < $min {
            return Err($crate::shared::error::AppError::Validation(
                format!("{} must be at least {} characters", $name, $min)
            ));
        }
        if $field.len() > $max {
            return Err($crate::shared::error::AppError::Validation(
                format!("{} exceeds maximum length of {} characters", $name, $max)
            ));
        }
    };
}

/// Validate that a value is in a list of allowed values
/// Usage: `validate_enum!(value, "field_name", ["a", "b", "c"])`
#[macro_export]
macro_rules! validate_enum {
    ($value:expr, $name:expr, [$($valid:expr),+ $(,)?]) => {
        {
            let valid_values = [$($valid),+];
            if !valid_values.contains(&$value.as_str()) {
                return Err($crate::shared::error::AppError::Validation(
                    format!(
                        "Invalid {}: {}. Must be one of: {}",
                        $name,
                        $value,
                        valid_values.join(", ")
                    )
                ));
            }
        }
    };
}

/// Validate optional enum value if present
/// Usage: `validate_optional_enum!(opt_value, "field_name", ["a", "b", "c"])`
#[macro_export]
macro_rules! validate_optional_enum {
    ($value:expr, $name:expr, [$($valid:expr),+ $(,)?]) => {
        if let Some(ref v) = $value {
            let valid_values = [$($valid),+];
            if !valid_values.contains(&v.as_str()) {
                return Err($crate::shared::error::AppError::Validation(
                    format!(
                        "Invalid {}: {}. Must be one of: {}",
                        $name,
                        v,
                        valid_values.join(", ")
                    )
                ));
            }
        }
    };
}

// ============================================================================
// Dynamic Query Building Macros
// ============================================================================

/// Build a dynamic SQL condition string
/// Usage: `sql_condition!(conditions, "field = ${}", bind_count)`
#[macro_export]
macro_rules! sql_condition {
    ($conditions:expr, $fmt:expr, $($args:expr),*) => {
        $conditions.push(format!($fmt, $($args),*))
    };
}

/// Add a condition if the option is Some
/// Usage: `sql_if_some!(conditions, &mut bind_count, option, "field = ${}")`
#[macro_export]
macro_rules! sql_if_some {
    ($conditions:expr, $bind_count:expr, $option:expr, $fmt:expr) => {
        if $option.is_some() {
            *$bind_count += 1;
            $conditions.push(format!($fmt, *$bind_count));
        }
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Convert database error to AppError with context
pub fn db_error(msg: &str, e: sqlx::Error) -> AppError {
    AppError::Internal(format!("{}: {}", msg, e))
}

/// Convert Option<bool> to bool with default
pub fn opt_bool(opt: Option<bool>, default: bool) -> bool {
    opt.unwrap_or(default)
}

/// Convert Option<String> to String with default
pub fn opt_string(opt: Option<String>, default: &str) -> String {
    opt.unwrap_or_else(|| default.to_string())
}

/// Convert Option<i32> to i32 with default
pub fn opt_i32(opt: Option<i32>, default: i32) -> i32 {
    opt.unwrap_or(default)
}

/// Validate pagination parameters
/// Returns (limit, offset) with bounded limit
pub fn validate_pagination(limit: Option<i64>, offset: Option<i64>, max_limit: i64) -> (i64, i64) {
    let limit = limit.unwrap_or(50).min(max_limit).max(1);
    let offset = offset.unwrap_or(0).max(0);
    (limit, offset)
}

/// Parse ISO 8601 datetime string to chrono DateTime
pub fn parse_datetime(s: &str) -> Result<chrono::DateTime<chrono::Utc>, AppError> {
    chrono::DateTime::parse_from_rfc3339(s)
        .map(|dt| dt.with_timezone(&chrono::Utc))
        .map_err(|e| AppError::Validation(format!("Invalid datetime format: {}", e)))
}

/// Parse optional datetime string
pub fn parse_optional_datetime(s: Option<&str>) -> Result<Option<chrono::DateTime<chrono::Utc>>, AppError> {
    match s {
        Some(dt_str) => parse_datetime(dt_str).map(Some),
        None => Ok(None),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_opt_bool() {
        assert!(!opt_bool(None, false));
        assert!(opt_bool(None, true));
        assert!(opt_bool(Some(true), false));
        assert!(!opt_bool(Some(false), true));
    }

    #[test]
    fn test_opt_string() {
        assert_eq!(opt_string(None, "default"), "default");
        assert_eq!(opt_string(Some("value".to_string()), "default"), "value");
    }

    #[test]
    fn test_validate_pagination() {
        assert_eq!(validate_pagination(None, None, 100), (50, 0));
        assert_eq!(validate_pagination(Some(200), None, 100), (100, 0));
        assert_eq!(validate_pagination(Some(10), Some(20), 100), (10, 20));
        assert_eq!(validate_pagination(Some(-5), Some(-10), 100), (1, 0));
    }

    #[test]
    fn test_parse_datetime() {
        assert!(parse_datetime("2024-01-15T10:30:00Z").is_ok());
        assert!(parse_datetime("invalid").is_err());
    }
}
