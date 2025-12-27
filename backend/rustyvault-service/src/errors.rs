//! Error types for RustyVault service
//!
//! Integrates health-v1 error patterns with RustyVault-specific errors
//! VaultError wraps shared::AppError with vault-specific error types

use thiserror::Error;

/// Main error type for RustyVault service
/// Wraps shared::AppError and adds vault-specific error types
#[derive(Error, Debug)]
pub enum VaultError {
    // Vault-specific errors
    #[error("Vault error: {0}")]
    Vault(String),

    #[error("Seal error: {0}")]
    Seal(String),

    #[error("Unseal error: {0}")]
    Unseal(String),

    #[error("Barrier error: {0}")]
    Barrier(String),

    // Wrapper for shared errors (avoids duplicating all AppError variants)
    #[error("Shared error: {0}")]
    Shared(#[from] shared::AppError),

    // Additional common errors
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

// Implement direct conversion from sqlx::Error for convenience
impl From<sqlx::Error> for VaultError {
    fn from(err: sqlx::Error) -> Self {
        VaultError::Shared(shared::AppError::Database(err))
    }
}

/// Result type alias
pub type VaultResult<T> = Result<T, VaultError>;

