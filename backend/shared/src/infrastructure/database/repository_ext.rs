//! Repository Error Extension Trait
//!
//! Eliminates 20+ identical error mapping patterns across repository implementations.
//! Provides standardized error handling with operation context and logging.

use crate::shared::{AppError, AppResult};
use tracing::error;

/// Extension trait for standardized repository error handling.
///
/// This trait eliminates repeated `.map_err(|e| AppError::Database(e))` patterns
/// across repository implementations, adding operation context and structured logging.
///
/// # Examples
///
/// ```rust
/// use shared::infrastructure::database::RepositoryErrorExt;
///
/// // Before: 3-6 lines per query
/// sqlx::query_as::<_, Group>(&query)
///     .fetch_optional(&mut *conn)
///     .await
///     .map_err(|e| {
///         error!("Database error: {}", e);
///         AppError::Database(e)
///     })?
///
/// // After: 1 line with context
/// sqlx::query_as::<_, Group>(&query)
///     .fetch_optional(&mut *conn)
///     .await
///     .map_db_error("fetch", "group")?
/// ```
///
/// # Benefits
///
/// - **Consistent Error Messages**: Standardized format across all repositories
/// - **Operation Context**: Clear indication of what operation failed
/// - **Structured Logging**: Automatic error logging with tracing
/// - **DRY Principle**: Single source of truth for error mapping
pub trait RepositoryErrorExt<T> {
    /// Maps database errors with operation and entity context.
    ///
    /// # Arguments
    ///
    /// * `operation` - The database operation being performed (e.g., "fetch", "insert", "update", "delete")
    /// * `entity` - The entity type being operated on (e.g., "user", "group", "policy")
    ///
    /// # Returns
    ///
    /// `AppResult<T>` with enhanced error context
    ///
    /// # Examples
    ///
    /// ```rust
    /// // Fetch operation
    /// let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
    ///     .bind(user_id)
    ///     .fetch_one(&pool)
    ///     .await
    ///     .map_db_error("fetch", "user")?;
    ///
    /// // Insert operation
    /// let group = sqlx::query_as::<_, Group>("INSERT INTO groups ...")
    ///     .execute(&pool)
    ///     .await
    ///     .map_db_error("create", "group")?;
    ///
    /// // Update operation
    /// sqlx::query("UPDATE policies SET ...")
    ///     .execute(&pool)
    ///     .await
    ///     .map_db_error("update", "policy")?;
    ///
    /// // Delete operation
    /// sqlx::query("DELETE FROM roles WHERE id = $1")
    ///     .bind(role_id)
    ///     .execute(&pool)
    ///     .await
    ///     .map_db_error("delete", "role")?;
    /// ```
    fn map_db_error(self, operation: &str, entity: &str) -> AppResult<T>;

    /// Maps database errors with a custom error message.
    ///
    /// Use this when you need a specific error message that doesn't follow
    /// the standard "Failed to {operation} {entity}" format.
    ///
    /// # Arguments
    ///
    /// * `message` - Custom error message
    ///
    /// # Examples
    ///
    /// ```rust
    /// let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users")
    ///     .fetch_one(&pool)
    ///     .await
    ///     .map_db_error_msg("Failed to count users")?;
    /// ```
    fn map_db_error_msg(self, message: &str) -> AppResult<T>;
}

impl<T> RepositoryErrorExt<T> for Result<T, sqlx::Error> {
    fn map_db_error(self, operation: &str, entity: &str) -> AppResult<T> {
        self.map_err(|e| {
            // Log the error with full database error details
            error!(
                operation = %operation,
                entity = %entity,
                error = %e,
                "Database error during {} {}",
                operation,
                entity
            );

            // Convert to AppError (which will format the message)
            // The sqlx::Error will be wrapped by AppError::Database via the From trait
            AppError::Database(e)
        })
    }

    fn map_db_error_msg(self, message: &str) -> AppResult<T> {
        self.map_err(|e| {
            error!(
                message = %message,
                error = %e,
                "Database error: {}",
                message
            );

            AppError::Database(e)
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_map_db_error_preserves_ok() {
        let result: Result<i32, sqlx::Error> = Ok(42);
        let mapped = result.map_db_error("test", "entity").unwrap();
        assert_eq!(mapped, 42);
    }

    #[test]
    fn test_map_db_error_msg_preserves_ok() {
        let result: Result<String, sqlx::Error> = Ok("success".to_string());
        let mapped = result.map_db_error_msg("test message").unwrap();
        assert_eq!(mapped, "success");
    }
}
