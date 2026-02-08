//! HIPAA-compliant audit logging for RustyVault
//!
//! Logs all vault operations with 7-year retention and tamper protection.
//! See CVE-RUSTY-003 in RUSTYVAULT_SECURITY_AUDIT.md

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use sha2::{Sha256, Digest};

use crate::errors::{VaultError, VaultResult};

/// Audit log entry for a vault operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogEntry {
    /// Request identifier
    pub request_id: Uuid,
    /// Operation type (e.g., "auth.login", "secret.read")
    pub operation: String,
    /// Vault path accessed
    pub path: String,
    /// HTTP method
    pub method: String,

    // Authentication context
    pub auth_display_name: Option<String>,
    pub auth_policies: Option<Vec<String>>,
    pub auth_token_id: Option<Uuid>,
    pub client_token_hash: Option<String>,

    // Authorization
    pub auth_result: AuthResult,
    pub acl_capabilities: Option<Vec<String>>,

    // Multi-tenancy
    pub realm_id: Option<Uuid>,
    pub realm_name: Option<String>,

    // Request metadata
    pub request_data: Option<serde_json::Value>,
    pub remote_addr: Option<String>,
    pub user_agent: Option<String>,

    // Response
    pub response_status: i32,
    pub response_error: Option<String>,
    pub duration_ms: Option<i32>,

    // PHI tracking
    pub phi_accessed: bool,
    pub phi_field_names: Option<Vec<String>>,
    pub phi_record_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AuthResult {
    Allowed,
    Denied,
    Error,
}

impl std::fmt::Display for AuthResult {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AuthResult::Allowed => write!(f, "allowed"),
            AuthResult::Denied => write!(f, "denied"),
            AuthResult::Error => write!(f, "error"),
        }
    }
}

/// Audit logger service
pub struct AuditLogger {
    pool: PgPool,
}

impl AuditLogger {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Log an audit event (async, non-blocking)
    pub async fn log(&self, entry: AuditLogEntry) -> VaultResult<()> {
        // Get previous log hash for chain integrity
        let previous_hash = self.get_latest_log_hash().await?;

        // Calculate hash of this entry
        let log_hash = self.calculate_log_hash(&entry, &previous_hash);

        // Insert into database
        let auth_result_str = entry.auth_result.to_string();
        sqlx::query!(
            r#"
            INSERT INTO vault_audit_logs (
                request_id, timestamp, operation, path, method,
                auth_display_name, auth_policies, auth_token_id, client_token_hash,
                auth_result, acl_capabilities,
                realm_id, realm_name,
                request_data, request_remote_addr, request_user_agent,
                response_status, response_error, duration_ms,
                phi_accessed, phi_field_names, phi_record_ids,
                log_hash, previous_log_hash
            )
            VALUES (
                $1, NOW(), $2, $3, $4,
                $5, $6, $7, $8,
                $9, $10,
                $11, $12,
                $13, $14, $15,
                $16, $17, $18,
                $19, $20, $21,
                $22, $23
            )
            "#,
            entry.request_id,
            &entry.operation,
            &entry.path,
            &entry.method,
            entry.auth_display_name.as_deref(),
            &entry.auth_policies as _,
            entry.auth_token_id,
            entry.client_token_hash.as_deref(),
            &auth_result_str,
            &entry.acl_capabilities as _,
            entry.realm_id,
            entry.realm_name.as_deref(),
            entry.request_data.as_ref(),
            entry.remote_addr.as_deref(),
            entry.user_agent.as_deref(),
            entry.response_status,
            entry.response_error.as_deref(),
            entry.duration_ms,
            entry.phi_accessed,
            &entry.phi_field_names as _,
            &entry.phi_record_ids as _,
            &log_hash,
            previous_hash.as_deref()
        )
        .execute(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to write audit log: {}", e);
            VaultError::Vault(format!("audit log write failed: {}", e))
        })?;

        Ok(())
    }

    /// Get the hash of the most recent log entry (for chain integrity)
    async fn get_latest_log_hash(&self) -> VaultResult<Option<String>> {
        let result: Option<String> = sqlx::query_scalar!(
            "SELECT log_hash FROM vault_audit_logs ORDER BY timestamp DESC LIMIT 1"
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to get latest log hash: {}", e)))?;

        Ok(result)
    }

    /// Calculate SHA256 hash of log entry for tamper detection
    fn calculate_log_hash(&self, entry: &AuditLogEntry, previous_hash: &Option<String>) -> String {
        let mut hasher = Sha256::new();

        // Hash all fields in deterministic order
        hasher.update(entry.request_id.as_bytes());
        hasher.update(entry.operation.as_bytes());
        hasher.update(entry.path.as_bytes());
        hasher.update(entry.method.as_bytes());

        if let Some(name) = &entry.auth_display_name {
            hasher.update(name.as_bytes());
        }
        if let Some(hash) = &entry.client_token_hash {
            hasher.update(hash.as_bytes());
        }
        hasher.update(entry.auth_result.to_string().as_bytes());

        if let Some(realm_id) = &entry.realm_id {
            hasher.update(realm_id.as_bytes());
        }

        hasher.update(entry.response_status.to_string().as_bytes());
        hasher.update(entry.phi_accessed.to_string().as_bytes());

        // Include previous hash for chain integrity
        if let Some(prev) = previous_hash {
            hasher.update(prev.as_bytes());
        }

        hex::encode(hasher.finalize())
    }

    /// Verify integrity of audit log chain
    pub async fn verify_log_chain(&self, start_time: DateTime<Utc>, end_time: DateTime<Utc>) -> VaultResult<bool> {
        let logs = sqlx::query!(
            r#"
            SELECT log_hash, previous_log_hash
            FROM vault_audit_logs
            WHERE timestamp >= $1 AND timestamp <= $2
            ORDER BY timestamp ASC
            "#,
            start_time,
            end_time
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to fetch logs: {}", e)))?;

        for i in 1..logs.len() {
            let current_hash = &logs[i].log_hash;
            let current_prev_hash = &logs[i].previous_log_hash;
            let previous_hash = &logs[i - 1].log_hash;

            // Verify chain: current.previous_log_hash should match previous.log_hash
            if current_prev_hash.as_ref() != Some(previous_hash) {
                tracing::error!(
                    "Log chain broken at index {}: expected previous_hash {}, got {:?}",
                    i, previous_hash, current_prev_hash
                );
                return Ok(false);
            }
        }

        Ok(true)
    }
}

// Helper to hash tokens for audit logging (never log raw tokens)
pub fn hash_token_for_audit(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    hex::encode(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_token_for_audit() {
        let token = "hvs.test_token_123";
        let hash = hash_token_for_audit(token);
        assert_eq!(hash.len(), 64); // SHA256 = 64 hex chars

        // Same token = same hash
        assert_eq!(hash, hash_token_for_audit(token));

        // Different token = different hash
        assert_ne!(hash, hash_token_for_audit("hvs.different_token"));
    }
}
