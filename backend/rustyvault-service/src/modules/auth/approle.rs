//! AppRole authentication method for RustyVault
//!
//! Provides machine-to-machine authentication with:
//! - Role creation and management (realm-scoped)
//! - Role ID generation
//! - Secret ID generation with TTL and use limits
//! - Login with role_id + secret_id

use async_trait::async_trait;
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use super::token::{CreateTokenRequest, TokenStore};
use crate::errors::{VaultError, VaultResult};
use crate::logical::{Backend, Request, Response};

/// AppRole entry in the database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppRoleEntry {
    pub id: Uuid,
    pub realm_id: Option<Uuid>,
    pub role_name: String,
    pub role_id: Uuid,
    pub policies: Vec<String>,
    pub bind_secret_id: bool,
    pub secret_id_ttl: i32,
    pub secret_id_num_uses: i32,
    pub token_ttl: i32,
    pub token_max_ttl: i32,
    pub token_policies: Vec<String>,
    pub token_type: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Request to create or update an AppRole
#[derive(Debug, Clone, Deserialize)]
pub struct CreateAppRoleRequest {
    pub role_name: String,
    #[serde(default)]
    pub policies: Vec<String>,
    #[serde(default = "default_true")]
    pub bind_secret_id: bool,
    #[serde(default = "default_secret_id_ttl")]
    pub secret_id_ttl: i32,
    #[serde(default)]
    pub secret_id_num_uses: i32,
    #[serde(default = "default_token_ttl")]
    pub token_ttl: i32,
    #[serde(default = "default_token_max_ttl")]
    pub token_max_ttl: i32,
    #[serde(default)]
    pub token_policies: Vec<String>,
    pub realm_id: Option<Uuid>,
}

fn default_true() -> bool {
    true
}

fn default_secret_id_ttl() -> i32 {
    3600
}

fn default_token_ttl() -> i32 {
    3600
}

fn default_token_max_ttl() -> i32 {
    86400
}

/// Secret ID entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecretIdEntry {
    pub id: Uuid,
    pub approle_id: Uuid,
    pub accessor: Uuid,
    pub metadata: Option<serde_json::Value>,
    pub num_uses_remaining: i32,
    pub expires_at: Option<DateTime<Utc>>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub last_used_at: Option<DateTime<Utc>>,
}

/// Response when generating a secret ID
#[derive(Debug, Clone, Serialize)]
pub struct SecretIdResponse {
    pub secret_id: String,
    pub accessor: Uuid,
    pub ttl: i32,
    pub num_uses: i32,
}

/// Login response
#[derive(Debug, Clone, Serialize)]
pub struct AppRoleLoginResponse {
    pub client_token: String,
    pub accessor: String,
    pub policies: Vec<String>,
    pub token_ttl: i64,
    pub renewable: bool,
    pub realm_id: Option<Uuid>,
}

/// AppRole backend for authentication
pub struct AppRoleBackend {
    pool: PgPool,
    token_store: TokenStore,
    mount_path: String,
    bcrypt_cost: u32,
}

impl AppRoleBackend {
    /// Create a new AppRole backend
    pub fn new(pool: PgPool, mount_path: &str, bcrypt_cost: u32) -> Self {
        let token_store = TokenStore::new(pool.clone());
        AppRoleBackend {
            pool,
            token_store,
            mount_path: mount_path.to_string(),
            bcrypt_cost,
        }
    }

    /// Create or update an AppRole
    pub async fn create_role(&self, request: &CreateAppRoleRequest) -> VaultResult<AppRoleEntry> {
        let role_name = request.role_name.to_lowercase().trim().to_string();

        if role_name.is_empty() {
            return Err(VaultError::Vault("role_name cannot be empty".to_string()));
        }

        let id = Uuid::new_v4();
        let role_id = Uuid::new_v4();
        let now = Utc::now();

        let entry = AppRoleEntry {
            id,
            realm_id: request.realm_id,
            role_name: role_name.clone(),
            role_id,
            policies: request.policies.clone(),
            bind_secret_id: request.bind_secret_id,
            secret_id_ttl: request.secret_id_ttl,
            secret_id_num_uses: request.secret_id_num_uses,
            token_ttl: request.token_ttl,
            token_max_ttl: request.token_max_ttl,
            token_policies: request.token_policies.clone(),
            token_type: "default".to_string(),
            is_active: true,
            created_at: now,
            updated_at: now,
        };

        // Upsert into database
        if let Some(realm_id) = request.realm_id {
            sqlx::query!(
                r#"
                INSERT INTO vault_approles (
                    id, realm_id, role_name, role_id, policies, bind_secret_id,
                    secret_id_ttl, secret_id_num_uses, token_ttl, token_max_ttl,
                    token_policies, token_type, is_active, created_at, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13, $14)
                ON CONFLICT (realm_id, role_name) WHERE realm_id IS NOT NULL DO UPDATE SET
                    policies = $5,
                    bind_secret_id = $6,
                    secret_id_ttl = $7,
                    secret_id_num_uses = $8,
                    token_ttl = $9,
                    token_max_ttl = $10,
                    token_policies = $11,
                    updated_at = $14
                "#,
                entry.id,
                realm_id,
                &entry.role_name,
                entry.role_id,
                &entry.policies,
                entry.bind_secret_id,
                entry.secret_id_ttl,
                entry.secret_id_num_uses,
                entry.token_ttl,
                entry.token_max_ttl,
                &entry.token_policies,
                &entry.token_type,
                entry.created_at,
                entry.updated_at
            )
            .execute(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to create approle: {}", e)))?;
        } else {
            sqlx::query!(
                r#"
                INSERT INTO vault_approles (
                    id, realm_id, role_name, role_id, policies, bind_secret_id,
                    secret_id_ttl, secret_id_num_uses, token_ttl, token_max_ttl,
                    token_policies, token_type, is_active, created_at, updated_at
                )
                VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12, $13)
                ON CONFLICT (role_name) WHERE realm_id IS NULL DO UPDATE SET
                    policies = $4,
                    bind_secret_id = $5,
                    secret_id_ttl = $6,
                    secret_id_num_uses = $7,
                    token_ttl = $8,
                    token_max_ttl = $9,
                    token_policies = $10,
                    updated_at = $13
                "#,
                entry.id,
                &entry.role_name,
                entry.role_id,
                &entry.policies,
                entry.bind_secret_id,
                entry.secret_id_ttl,
                entry.secret_id_num_uses,
                entry.token_ttl,
                entry.token_max_ttl,
                &entry.token_policies,
                &entry.token_type,
                entry.created_at,
                entry.updated_at
            )
            .execute(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to create global approle: {}", e)))?;
        }

        Ok(entry)
    }

    /// Get an AppRole by name (realm-scoped)
    pub async fn get_role(&self, role_name: &str, realm_id: Option<Uuid>) -> VaultResult<Option<AppRoleEntry>> {
        let role_name = role_name.to_lowercase().trim().to_string();

        let row = if let Some(realm_id) = realm_id {
            sqlx::query!(
                r#"
                SELECT id, realm_id, role_name, role_id,
                       policies as "policies!", bind_secret_id,
                       secret_id_ttl as "secret_id_ttl!", secret_id_num_uses as "secret_id_num_uses!",
                       token_ttl as "token_ttl!", token_max_ttl as "token_max_ttl!",
                       token_policies as "token_policies!", token_type as "token_type!",
                       is_active, created_at, updated_at
                FROM vault_approles
                WHERE role_name = $1 AND realm_id = $2
                "#,
                &role_name,
                realm_id
            )
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to get approle: {}", e)))?
            .map(|r| AppRoleEntry {
                id: r.id, realm_id: r.realm_id, role_name: r.role_name, role_id: r.role_id,
                policies: r.policies, bind_secret_id: r.bind_secret_id,
                secret_id_ttl: r.secret_id_ttl, secret_id_num_uses: r.secret_id_num_uses,
                token_ttl: r.token_ttl, token_max_ttl: r.token_max_ttl,
                token_policies: r.token_policies, token_type: r.token_type,
                is_active: r.is_active, created_at: r.created_at, updated_at: r.updated_at,
            })
        } else {
            sqlx::query!(
                r#"
                SELECT id, realm_id, role_name, role_id,
                       policies as "policies!", bind_secret_id,
                       secret_id_ttl as "secret_id_ttl!", secret_id_num_uses as "secret_id_num_uses!",
                       token_ttl as "token_ttl!", token_max_ttl as "token_max_ttl!",
                       token_policies as "token_policies!", token_type as "token_type!",
                       is_active, created_at, updated_at
                FROM vault_approles
                WHERE role_name = $1 AND realm_id IS NULL
                "#,
                &role_name
            )
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to get approle: {}", e)))?
            .map(|r| AppRoleEntry {
                id: r.id, realm_id: r.realm_id, role_name: r.role_name, role_id: r.role_id,
                policies: r.policies, bind_secret_id: r.bind_secret_id,
                secret_id_ttl: r.secret_id_ttl, secret_id_num_uses: r.secret_id_num_uses,
                token_ttl: r.token_ttl, token_max_ttl: r.token_max_ttl,
                token_policies: r.token_policies, token_type: r.token_type,
                is_active: r.is_active, created_at: r.created_at, updated_at: r.updated_at,
            })
        };

        Ok(row)
    }

    /// Get an AppRole by role_id
    pub async fn get_role_by_role_id(&self, role_id: Uuid) -> VaultResult<Option<AppRoleEntry>> {
        let row = sqlx::query!(
            r#"
            SELECT id, realm_id, role_name, role_id,
                   policies as "policies!", bind_secret_id,
                   secret_id_ttl as "secret_id_ttl!", secret_id_num_uses as "secret_id_num_uses!",
                   token_ttl as "token_ttl!", token_max_ttl as "token_max_ttl!",
                   token_policies as "token_policies!", token_type as "token_type!",
                   is_active, created_at, updated_at
            FROM vault_approles
            WHERE role_id = $1
            "#,
            role_id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to get approle by role_id: {}", e)))?;

        match row {
            Some(row) => {
                Ok(Some(AppRoleEntry {
                    id: row.id,
                    realm_id: row.realm_id,
                    role_name: row.role_name,
                    role_id: row.role_id,
                    policies: row.policies,
                    bind_secret_id: row.bind_secret_id,
                    secret_id_ttl: row.secret_id_ttl,
                    secret_id_num_uses: row.secret_id_num_uses,
                    token_ttl: row.token_ttl,
                    token_max_ttl: row.token_max_ttl,
                    token_policies: row.token_policies,
                    token_type: row.token_type,
                    is_active: row.is_active,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                }))
            }
            None => Ok(None),
        }
    }

    /// List all AppRoles (realm-scoped)
    pub async fn list_roles(&self, realm_id: Option<Uuid>) -> VaultResult<Vec<String>> {
        let rows: Vec<String> = if let Some(realm_id) = realm_id {
            sqlx::query_scalar!(
                r#"
                SELECT role_name FROM vault_approles
                WHERE realm_id = $1 OR realm_id IS NULL
                ORDER BY role_name
                "#,
                realm_id
            )
            .fetch_all(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to list approles: {}", e)))?
        } else {
            sqlx::query_scalar!(
                r#"
                SELECT role_name FROM vault_approles
                WHERE realm_id IS NULL
                ORDER BY role_name
                "#
            )
            .fetch_all(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to list approles: {}", e)))?
        };

        Ok(rows)
    }

    /// Delete an AppRole
    pub async fn delete_role(&self, role_name: &str, realm_id: Option<Uuid>) -> VaultResult<()> {
        let role_name = role_name.to_lowercase().trim().to_string();

        let result = if let Some(realm_id) = realm_id {
            sqlx::query!("DELETE FROM vault_approles WHERE role_name = $1 AND realm_id = $2", &role_name, realm_id)
                .execute(&self.pool)
                .await
                .map_err(|e| VaultError::Vault(format!("failed to delete approle: {}", e)))?
        } else {
            sqlx::query!("DELETE FROM vault_approles WHERE role_name = $1 AND realm_id IS NULL", &role_name)
                .execute(&self.pool)
                .await
                .map_err(|e| VaultError::Vault(format!("failed to delete approle: {}", e)))?
        };

        if result.rows_affected() == 0 {
            return Err(VaultError::Vault("approle not found".to_string()));
        }

        Ok(())
    }

    /// Generate a new secret ID for a role
    pub async fn generate_secret_id(
        &self,
        role_name: &str,
        realm_id: Option<Uuid>,
        metadata: Option<serde_json::Value>,
    ) -> VaultResult<SecretIdResponse> {
        // Get the role
        let role = self
            .get_role(role_name, realm_id)
            .await?
            .ok_or_else(|| VaultError::Vault("approle not found".to_string()))?;

        if !role.is_active {
            return Err(VaultError::Vault("approle is disabled".to_string()));
        }

        // Generate secret ID
        let secret_id = Uuid::new_v4().to_string();
        let secret_id_hash = hash(&secret_id, self.bcrypt_cost)
            .map_err(|e| VaultError::Vault(format!("failed to hash secret_id: {}", e)))?;
        
        let accessor = Uuid::new_v4();
        let now = Utc::now();
        
        let expires_at = if role.secret_id_ttl > 0 {
            Some(now + Duration::seconds(role.secret_id_ttl as i64))
        } else {
            None
        };

        let num_uses = if role.secret_id_num_uses > 0 {
            role.secret_id_num_uses
        } else {
            -1 // Unlimited
        };

        // Insert secret ID
        sqlx::query!(
            r#"
            INSERT INTO vault_approle_secret_ids (
                approle_id, secret_id_hash, accessor, metadata,
                num_uses_remaining, expires_at, is_active, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, true, $7)
            "#,
            role.id,
            &secret_id_hash,
            accessor,
            metadata.as_ref(),
            num_uses,
            expires_at,
            now
        )
        .execute(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to create secret_id: {}", e)))?;

        Ok(SecretIdResponse {
            secret_id,
            accessor,
            ttl: role.secret_id_ttl,
            num_uses: role.secret_id_num_uses,
        })
    }

    /// Login with role_id and secret_id
    pub async fn login(
        &self,
        role_id: Uuid,
        secret_id: Option<&str>,
    ) -> VaultResult<AppRoleLoginResponse> {
        // Get the role
        let role = self
            .get_role_by_role_id(role_id)
            .await?
            .ok_or_else(|| VaultError::Vault("invalid role_id".to_string()))?;

        if !role.is_active {
            return Err(VaultError::Vault("approle is disabled".to_string()));
        }

        // Check if secret_id is required
        if role.bind_secret_id {
            let secret_id = secret_id.ok_or_else(|| {
                VaultError::Vault("secret_id is required".to_string())
            })?;

            // Validate secret_id
            self.validate_secret_id(role.id, secret_id).await?;
        }

        // Build policies
        let mut policies = role.policies.clone();
        policies.extend(role.token_policies.iter().cloned());
        if policies.is_empty() {
            policies.push("default".to_string());
        }

        // Create token
        let request = CreateTokenRequest {
            display_name: format!("approle-{}", role.role_name),
            policies: policies.clone(),
            ttl: role.token_ttl as i64,
            renewable: true,
            num_uses: 0,
            meta: Some(serde_json::json!({
                "role_name": role.role_name,
                "role_id": role.role_id,
                "realm_id": role.realm_id,
                "auth_method": "approle"
            })),
        };

        let path = format!("{}/login", self.mount_path);
        let (entry, raw_token) = self.token_store.create_token(&request, None, &path).await?;

        Ok(AppRoleLoginResponse {
            client_token: raw_token,
            accessor: format!("accessor.{}", entry.id),
            policies,
            token_ttl: role.token_ttl as i64,
            renewable: true,
            realm_id: role.realm_id,
        })
    }

    /// Validate a secret_id
    /// SECURITY: Uses constant-time comparison to prevent timing attacks
    async fn validate_secret_id(&self, approle_id: Uuid, secret_id: &str) -> VaultResult<()> {
        // Get all active secret IDs for this role
        let rows = sqlx::query!(
            r#"
            SELECT id, secret_id_hash, num_uses_remaining, expires_at
            FROM vault_approle_secret_ids
            WHERE approle_id = $1 AND is_active = true
            "#,
            approle_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to lookup secret_id: {}", e)))?;

        let now = Utc::now();
        let mut found_valid_id: Option<Uuid> = None;
        let mut found_exhausted = false;

        // SECURITY: Always verify ALL hashes to maintain constant timing
        // This prevents timing attacks that could distinguish between:
        // - Invalid hash format (fast error)
        // - Valid hash, wrong secret (slow bcrypt comparison)
        for row in rows {
            let (id, hash, num_uses, expires_at) = (row.id, row.secret_id_hash, row.num_uses_remaining, row.expires_at);
            // Check expiration (but still verify hash for constant time)
            let is_expired = if let Some(exp) = expires_at {
                now > exp
            } else {
                false
            };

            // ALWAYS perform bcrypt verification regardless of expiration
            // This maintains constant-time behavior
            let hash_valid = verify(secret_id, &hash).unwrap_or_else(|_e| {
                // Even on error, maintain consistent timing
                // Log internally but don't expose timing difference
                tracing::debug!("Bcrypt verification error for secret_id");
                false
            });

            // Only consider this secret_id if hash matches AND not expired
            if hash_valid && !is_expired {
                if num_uses == Some(0) {
                    // Mark as exhausted but continue checking other hashes
                    found_exhausted = true;
                } else if found_valid_id.is_none() {
                    // Found first valid, non-exhausted secret_id
                    found_valid_id = Some(id);
                }
            }
        }

        // After checking all hashes (constant time complete), process result
        if let Some(valid_id) = found_valid_id {
            // Decrement uses atomically
            let result: Option<i32> = sqlx::query_scalar!(
                r#"
                UPDATE vault_approle_secret_ids
                SET num_uses_remaining = CASE
                        WHEN num_uses_remaining > 0 THEN num_uses_remaining - 1
                        ELSE num_uses_remaining
                    END,
                    last_used_at = NOW()
                WHERE id = $1 AND (num_uses_remaining > 0 OR num_uses_remaining = -1)
                RETURNING num_uses_remaining as "num_uses_remaining!"
                "#,
                valid_id
            )
            .fetch_optional(&self.pool)
            .await
            .ok()
            .flatten();

            match result {
                Some(remaining) => {
                    if remaining == 0 {
                        // Secret ID exhausted, mark inactive
                        sqlx::query!("UPDATE vault_approle_secret_ids SET is_active = false WHERE id = $1", valid_id)
                            .execute(&self.pool)
                            .await
                            .ok();
                    }
                    return Ok(());
                }
                None => {
                    // Race condition or invalid state
                    return Err(VaultError::Vault("secret_id validation failed".to_string()));
                }
            }
        } else if found_exhausted {
            return Err(VaultError::Vault("secret_id has no remaining uses".to_string()));
        }

        // Generic error message - don't reveal whether secret_id exists
        Err(VaultError::Vault("invalid secret_id".to_string()))
    }

    /// Get role_id for a role
    pub async fn get_role_id(&self, role_name: &str, realm_id: Option<Uuid>) -> VaultResult<Uuid> {
        let role = self
            .get_role(role_name, realm_id)
            .await?
            .ok_or_else(|| VaultError::Vault("approle not found".to_string()))?;

        Ok(role.role_id)
    }
}

#[async_trait]
impl Backend for AppRoleBackend {
    async fn handle_request(&self, req: &mut Request) -> VaultResult<Option<Response>> {
        let realm_id = req.realm_id;
        
        let path = req.path.trim_start_matches(&self.mount_path).trim_start_matches('/');
        let parts: Vec<&str> = path.split('/').collect();

        match (req.operation.clone(), parts.as_slice()) {
            // List roles: GET /auth/approle/role
            (crate::logical::request::Operation::List, ["role"]) => {
                let roles = self.list_roles(realm_id).await?;
                let mut data = serde_json::Map::new();
                data.insert("keys".to_string(), serde_json::json!(roles));
                Ok(Some(Response {
                    data: Some(data),
                    ..Default::default()
                }))
            }

            // Create/update role: POST /auth/approle/role/:role_name
            (crate::logical::request::Operation::Write, ["role", role_name]) => {
                let body = req.data.as_ref().ok_or_else(|| {
                    VaultError::Vault("missing request body".to_string())
                })?;

                let policies: Vec<String> = body
                    .get("policies")
                    .and_then(|v| v.as_array())
                    .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                    .unwrap_or_default();

                let request = CreateAppRoleRequest {
                    role_name: role_name.to_string(),
                    policies,
                    bind_secret_id: body.get("bind_secret_id").and_then(|v| v.as_bool()).unwrap_or(true),
                    secret_id_ttl: body.get("secret_id_ttl").and_then(|v| v.as_i64()).map(|v| v as i32).unwrap_or(3600),
                    secret_id_num_uses: body.get("secret_id_num_uses").and_then(|v| v.as_i64()).map(|v| v as i32).unwrap_or(0),
                    token_ttl: body.get("token_ttl").and_then(|v| v.as_i64()).map(|v| v as i32).unwrap_or(3600),
                    token_max_ttl: body.get("token_max_ttl").and_then(|v| v.as_i64()).map(|v| v as i32).unwrap_or(86400),
                    token_policies: body.get("token_policies").and_then(|v| v.as_array())
                        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                        .unwrap_or_default(),
                    realm_id,
                };

                self.create_role(&request).await?;
                Ok(Some(Response::default()))
            }

            // Read role: GET /auth/approle/role/:role_name
            (crate::logical::request::Operation::Read, ["role", role_name]) => {
                match self.get_role(role_name, realm_id).await? {
                    Some(role) => {
                        let mut data = serde_json::Map::new();
                        data.insert("role_name".to_string(), serde_json::json!(role.role_name));
                        data.insert("policies".to_string(), serde_json::json!(role.policies));
                        data.insert("bind_secret_id".to_string(), serde_json::json!(role.bind_secret_id));
                        data.insert("secret_id_ttl".to_string(), serde_json::json!(role.secret_id_ttl));
                        data.insert("secret_id_num_uses".to_string(), serde_json::json!(role.secret_id_num_uses));
                        data.insert("token_ttl".to_string(), serde_json::json!(role.token_ttl));
                        data.insert("token_max_ttl".to_string(), serde_json::json!(role.token_max_ttl));
                        Ok(Some(Response {
                            data: Some(data),
                            ..Default::default()
                        }))
                    }
                    None => Err(VaultError::Vault("approle not found".to_string())),
                }
            }

            // Delete role: DELETE /auth/approle/role/:role_name
            (crate::logical::request::Operation::Delete, ["role", role_name]) => {
                self.delete_role(role_name, realm_id).await?;
                Ok(Some(Response::default()))
            }

            // Get role_id: GET /auth/approle/role/:role_name/role-id
            (crate::logical::request::Operation::Read, ["role", role_name, "role-id"]) => {
                let role_id = self.get_role_id(role_name, realm_id).await?;
                let mut data = serde_json::Map::new();
                data.insert("role_id".to_string(), serde_json::json!(role_id.to_string()));
                Ok(Some(Response {
                    data: Some(data),
                    ..Default::default()
                }))
            }

            // Generate secret_id: POST /auth/approle/role/:role_name/secret-id
            (crate::logical::request::Operation::Write, ["role", role_name, "secret-id"]) => {
                let metadata = req.data.as_ref().and_then(|d| d.get("metadata").cloned());
                let response = self.generate_secret_id(role_name, realm_id, metadata).await?;
                
                let mut data = serde_json::Map::new();
                data.insert("secret_id".to_string(), serde_json::json!(response.secret_id));
                data.insert("secret_id_accessor".to_string(), serde_json::json!(response.accessor.to_string()));
                data.insert("secret_id_ttl".to_string(), serde_json::json!(response.ttl));
                data.insert("secret_id_num_uses".to_string(), serde_json::json!(response.num_uses));
                Ok(Some(Response {
                    data: Some(data),
                    ..Default::default()
                }))
            }

            // Login: POST /auth/approle/login
            (crate::logical::request::Operation::Write, ["login"]) => {
                let body = req.data.as_ref().ok_or_else(|| {
                    VaultError::Vault("missing request body".to_string())
                })?;

                let role_id_str = body
                    .get("role_id")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| VaultError::Vault("role_id is required".to_string()))?;

                let role_id = Uuid::parse_str(role_id_str)
                    .map_err(|_| VaultError::Vault("invalid role_id format".to_string()))?;

                let secret_id = body.get("secret_id").and_then(|v| v.as_str());

                let response = self.login(role_id, secret_id).await?;

                let mut data = serde_json::Map::new();
                data.insert("client_token".to_string(), serde_json::json!(response.client_token.clone()));
                data.insert("accessor".to_string(), serde_json::json!(response.accessor.clone()));
                data.insert("policies".to_string(), serde_json::json!(response.policies.clone()));
                data.insert("token_ttl".to_string(), serde_json::json!(response.token_ttl));
                data.insert("renewable".to_string(), serde_json::json!(response.renewable));

                Ok(Some(Response {
                    data: Some(data),
                    auth: Some(crate::logical::ResponseAuth {
                        client_token: response.client_token,
                        accessor: response.accessor,
                        policies: response.policies,
                        token_ttl: response.token_ttl,
                        renewable: response.renewable,
                        ..Default::default()
                    }),
                    ..Default::default()
                }))
            }

            _ => Ok(None),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_secret_id_hash_and_verify() {
        let secret_id = Uuid::new_v4().to_string();
        let hash = hash(&secret_id, DEFAULT_COST).unwrap();
        
        assert!(verify(&secret_id, &hash).unwrap());
        assert!(!verify("wrong_secret", &hash).unwrap());
    }
}

