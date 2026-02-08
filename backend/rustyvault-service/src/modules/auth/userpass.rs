//! UserPass authentication method for RustyVault
//!
//! Provides username/password based authentication with:
//! - User CRUD operations (realm-scoped)
//! - Password hashing with bcrypt
//! - Token issuance on successful login

use async_trait::async_trait;
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use super::token::{CreateTokenRequest, TokenStore};
use crate::errors::{VaultError, VaultResult};
use crate::logical::{Backend, Request, Response};

/// User entry in the database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserEntry {
    pub id: Uuid,
    pub username: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub policies: Vec<String>,
    pub ttl: i64,
    pub max_ttl: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    /// Realm ID for multi-tenancy (None = global user)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub realm_id: Option<Uuid>,
    /// Email address (optional)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    /// Display name (optional)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    /// Whether the user is active
    #[serde(default = "default_true")]
    pub is_active: bool,
    /// Whether the user is a super user
    #[serde(default)]
    pub is_super_user: bool,
}

fn default_true() -> bool {
    true
}

/// Request to create or update a user
#[derive(Debug, Clone, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub password: String,
    #[serde(default)]
    pub policies: Vec<String>,
    #[serde(default = "default_ttl")]
    pub ttl: i64,
    #[serde(default = "default_max_ttl")]
    pub max_ttl: i64,
    /// Realm ID for realm-scoped user
    pub realm_id: Option<Uuid>,
    /// Email address
    pub email: Option<String>,
    /// Display name
    pub display_name: Option<String>,
}

fn default_ttl() -> i64 {
    3600
}

fn default_max_ttl() -> i64 {
    86400
}

/// Response when looking up a user
#[derive(Debug, Clone, Serialize)]
pub struct UserResponse {
    pub username: String,
    pub policies: Vec<String>,
    pub ttl: i64,
    pub max_ttl: i64,
    pub realm_id: Option<Uuid>,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub is_active: bool,
}

/// Login request
#[derive(Debug, Clone, Deserialize)]
pub struct LoginRequest {
    pub password: String,
}

/// Login response
#[derive(Debug, Clone, Serialize)]
pub struct LoginResponse {
    pub client_token: String,
    pub accessor: String,
    pub policies: Vec<String>,
    pub token_ttl: i64,
    pub renewable: bool,
    pub realm_id: Option<Uuid>,
}

/// UserPass backend for authentication
pub struct UserPassBackend {
    pool: PgPool,
    token_store: TokenStore,
    mount_path: String,
    bcrypt_cost: u32,
}

impl UserPassBackend {
    /// Create a new UserPass backend
    pub fn new(pool: PgPool, mount_path: &str, bcrypt_cost: u32) -> Self {
        let token_store = TokenStore::new(pool.clone());
        UserPassBackend {
            pool,
            token_store,
            mount_path: mount_path.to_string(),
            bcrypt_cost,
        }
    }

    /// Create a new user (realm-scoped or global)
    pub async fn create_user(&self, request: &CreateUserRequest) -> VaultResult<UserEntry> {
        self.create_user_in_realm(request, request.realm_id).await
    }

    /// Create a new user in a specific realm
    pub async fn create_user_in_realm(&self, request: &CreateUserRequest, realm_id: Option<Uuid>) -> VaultResult<UserEntry> {
        let username = request.username.to_lowercase().trim().to_string();

        if username.is_empty() {
            return Err(VaultError::Vault("username cannot be empty".to_string()));
        }

        if request.password.is_empty() {
            return Err(VaultError::Vault("password cannot be empty".to_string()));
        }

        // Hash the password with configured cost
        let password_hash = hash(&request.password, self.bcrypt_cost)
            .map_err(|e| VaultError::Vault(format!("failed to hash password: {}", e)))?;

        let id = Uuid::new_v4();
        let now = Utc::now();

        let entry = UserEntry {
            id,
            username: username.clone(),
            password_hash,
            policies: request.policies.clone(),
            ttl: request.ttl,
            max_ttl: request.max_ttl,
            created_at: now,
            updated_at: now,
            realm_id,
            email: request.email.clone(),
            display_name: request.display_name.clone(),
            is_active: true,
            is_super_user: false,
        };

        // Insert into database (upsert with realm context)
        if let Some(realm_id) = realm_id {
            sqlx::query!(
                r#"
                INSERT INTO vault_users (id, username, password_hash, policies, ttl, max_ttl, created_at, updated_at, realm_id, email, display_name, is_active, is_super_user)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, false)
                ON CONFLICT (realm_id, username) WHERE realm_id IS NOT NULL DO UPDATE SET
                    password_hash = $3,
                    policies = $4,
                    ttl = $5,
                    max_ttl = $6,
                    updated_at = $8,
                    email = $10,
                    display_name = $11
                "#,
                entry.id,
                &entry.username,
                &entry.password_hash,
                &entry.policies,
                entry.ttl,
                entry.max_ttl,
                entry.created_at,
                entry.updated_at,
                realm_id,
                entry.email.as_deref(),
                entry.display_name.as_deref()
            )
            .execute(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to create realm user: {}", e)))?;
        } else {
            sqlx::query!(
                r#"
                INSERT INTO vault_users (id, username, password_hash, policies, ttl, max_ttl, created_at, updated_at, realm_id, email, display_name, is_active, is_super_user)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10, true, false)
                ON CONFLICT (username) WHERE realm_id IS NULL DO UPDATE SET
                    password_hash = $3,
                    policies = $4,
                    ttl = $5,
                    max_ttl = $6,
                    updated_at = $8,
                    email = $9,
                    display_name = $10
                "#,
                entry.id,
                &entry.username,
                &entry.password_hash,
                &entry.policies,
                entry.ttl,
                entry.max_ttl,
                entry.created_at,
                entry.updated_at,
                entry.email.as_deref(),
                entry.display_name.as_deref()
            )
            .execute(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to create global user: {}", e)))?;
        }

        Ok(entry)
    }

    /// Get a user by username (realm-scoped or global)
    pub async fn get_user(&self, username: &str) -> VaultResult<Option<UserEntry>> {
        self.get_user_in_realm(username, None).await
    }

    /// Get a user by username in a specific realm
    pub async fn get_user_in_realm(&self, username: &str, realm_id: Option<Uuid>) -> VaultResult<Option<UserEntry>> {
        let username = username.to_lowercase().trim().to_string();

        let entry = if let Some(realm_id) = realm_id {
            // Try realm-specific first
            let realm_row = sqlx::query!(
                r#"
                SELECT id, username, password_hash,
                       policies as "policies!", ttl as "ttl!", max_ttl as "max_ttl!",
                       created_at as "created_at!", updated_at as "updated_at!",
                       realm_id, email, display_name, is_active, is_super_user
                FROM vault_users
                WHERE username = $1 AND realm_id = $2
                "#,
                &username,
                realm_id
            )
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to get realm user: {}", e)))?
            .map(|r| UserEntry {
                id: r.id, username: r.username, password_hash: r.password_hash,
                policies: r.policies, ttl: r.ttl, max_ttl: r.max_ttl,
                created_at: r.created_at, updated_at: r.updated_at, realm_id: r.realm_id,
                email: r.email, display_name: r.display_name,
                is_active: r.is_active.unwrap_or(true), is_super_user: r.is_super_user.unwrap_or(false),
            });

            // If not found in realm, try global
            if realm_row.is_none() {
                sqlx::query!(
                    r#"
                    SELECT id, username, password_hash,
                           policies as "policies!", ttl as "ttl!", max_ttl as "max_ttl!",
                           created_at as "created_at!", updated_at as "updated_at!",
                           realm_id, email, display_name, is_active, is_super_user
                    FROM vault_users
                    WHERE username = $1 AND realm_id IS NULL
                    "#,
                    &username
                )
                .fetch_optional(&self.pool)
                .await
                .map_err(|e| VaultError::Vault(format!("failed to get global user: {}", e)))?
                .map(|r| UserEntry {
                    id: r.id, username: r.username, password_hash: r.password_hash,
                    policies: r.policies, ttl: r.ttl, max_ttl: r.max_ttl,
                    created_at: r.created_at, updated_at: r.updated_at, realm_id: r.realm_id,
                    email: r.email, display_name: r.display_name,
                    is_active: r.is_active.unwrap_or(true), is_super_user: r.is_super_user.unwrap_or(false),
                })
            } else {
                realm_row
            }
        } else {
            // Get global user only
            sqlx::query!(
                r#"
                SELECT id, username, password_hash,
                       policies as "policies!", ttl as "ttl!", max_ttl as "max_ttl!",
                       created_at as "created_at!", updated_at as "updated_at!",
                       realm_id, email, display_name, is_active, is_super_user
                FROM vault_users
                WHERE username = $1 AND realm_id IS NULL
                "#,
                &username
            )
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to get user: {}", e)))?
            .map(|r| UserEntry {
                id: r.id, username: r.username, password_hash: r.password_hash,
                policies: r.policies, ttl: r.ttl, max_ttl: r.max_ttl,
                created_at: r.created_at, updated_at: r.updated_at, realm_id: r.realm_id,
                email: r.email, display_name: r.display_name,
                is_active: r.is_active.unwrap_or(true), is_super_user: r.is_super_user.unwrap_or(false),
            })
        };

        Ok(entry)
    }

    /// List all users (global only)
    pub async fn list_users(&self) -> VaultResult<Vec<String>> {
        self.list_users_in_realm(None).await
    }

    /// List users in a specific realm (includes global users)
    pub async fn list_users_in_realm(&self, realm_id: Option<Uuid>) -> VaultResult<Vec<String>> {
        let rows: Vec<String> = if let Some(realm_id) = realm_id {
            sqlx::query_scalar!(
                r#"
                SELECT username FROM vault_users
                WHERE realm_id = $1 OR realm_id IS NULL
                ORDER BY username
                "#,
                realm_id
            )
            .fetch_all(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to list realm users: {}", e)))?
        } else {
            sqlx::query_scalar!(
                r#"
                SELECT username FROM vault_users
                WHERE realm_id IS NULL
                ORDER BY username
                "#
            )
            .fetch_all(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to list users: {}", e)))?
        };

        Ok(rows)
    }

    /// List users in a specific realm only (excluding global)
    pub async fn list_realm_users_only(&self, realm_id: Uuid) -> VaultResult<Vec<String>> {
        let rows: Vec<String> = sqlx::query_scalar!(
            r#"
            SELECT username FROM vault_users
            WHERE realm_id = $1
            ORDER BY username
            "#,
            realm_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to list realm-only users: {}", e)))?;

        Ok(rows)
    }

    /// Delete a user (global only)
    pub async fn delete_user(&self, username: &str) -> VaultResult<()> {
        self.delete_user_in_realm(username, None).await
    }

    /// Delete a user in a specific realm
    pub async fn delete_user_in_realm(&self, username: &str, realm_id: Option<Uuid>) -> VaultResult<()> {
        let username = username.to_lowercase().trim().to_string();

        let result = if let Some(realm_id) = realm_id {
            sqlx::query!("DELETE FROM vault_users WHERE username = $1 AND realm_id = $2", &username, realm_id)
                .execute(&self.pool)
                .await
                .map_err(|e| VaultError::Vault(format!("failed to delete realm user: {}", e)))?
        } else {
            sqlx::query!("DELETE FROM vault_users WHERE username = $1 AND realm_id IS NULL", &username)
                .execute(&self.pool)
                .await
                .map_err(|e| VaultError::Vault(format!("failed to delete user: {}", e)))?
        };

        if result.rows_affected() == 0 {
            return Err(VaultError::Vault("user not found".to_string()));
        }

        Ok(())
    }

    /// Update user password (global only)
    pub async fn update_password(&self, username: &str, new_password: &str) -> VaultResult<()> {
        self.update_password_in_realm(username, new_password, None).await
    }

    /// Update user password in a specific realm
    pub async fn update_password_in_realm(&self, username: &str, new_password: &str, realm_id: Option<Uuid>) -> VaultResult<()> {
        let username = username.to_lowercase().trim().to_string();

        if new_password.is_empty() {
            return Err(VaultError::Vault("password cannot be empty".to_string()));
        }

        let password_hash = hash(new_password, self.bcrypt_cost)
            .map_err(|e| VaultError::Vault(format!("failed to hash password: {}", e)))?;

        let result = if let Some(realm_id) = realm_id {
            sqlx::query!(
                r#"
                UPDATE vault_users
                SET password_hash = $1, updated_at = NOW()
                WHERE username = $2 AND realm_id = $3
                "#,
                &password_hash,
                &username,
                realm_id
            )
            .execute(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to update password: {}", e)))?
        } else {
            sqlx::query!(
                r#"
                UPDATE vault_users
                SET password_hash = $1, updated_at = NOW()
                WHERE username = $2 AND realm_id IS NULL
                "#,
                &password_hash,
                &username
            )
            .execute(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to update password: {}", e)))?
        };

        if result.rows_affected() == 0 {
            return Err(VaultError::Vault("user not found".to_string()));
        }

        Ok(())
    }

    /// Update user policies (global only)
    pub async fn update_policies(&self, username: &str, policies: &[String]) -> VaultResult<()> {
        self.update_policies_in_realm(username, policies, None).await
    }

    /// Update user policies in a specific realm
    pub async fn update_policies_in_realm(&self, username: &str, policies: &[String], realm_id: Option<Uuid>) -> VaultResult<()> {
        let username = username.to_lowercase().trim().to_string();

        let result = if let Some(realm_id) = realm_id {
            sqlx::query!(
                r#"
                UPDATE vault_users
                SET policies = $1, updated_at = NOW()
                WHERE username = $2 AND realm_id = $3
                "#,
                policies,
                &username,
                realm_id
            )
            .execute(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to update policies: {}", e)))?
        } else {
            sqlx::query!(
                r#"
                UPDATE vault_users
                SET policies = $1, updated_at = NOW()
                WHERE username = $2 AND realm_id IS NULL
                "#,
                policies,
                &username
            )
            .execute(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to update policies: {}", e)))?
        };

        if result.rows_affected() == 0 {
            return Err(VaultError::Vault("user not found".to_string()));
        }

        Ok(())
    }

    /// Login with username and password (global)
    pub async fn login(&self, username: &str, password: &str) -> VaultResult<LoginResponse> {
        self.login_in_realm(username, password, None).await
    }

    /// Login with username and password in a specific realm
    pub async fn login_in_realm(&self, username: &str, password: &str, realm_id: Option<Uuid>) -> VaultResult<LoginResponse> {
        let user = self
            .get_user_in_realm(username, realm_id)
            .await?
            .ok_or_else(|| VaultError::Vault("invalid username or password".to_string()))?;

        // Check if user is active
        if !user.is_active {
            return Err(VaultError::Vault("user account is disabled".to_string()));
        }

        // Verify password
        let valid = verify(password, &user.password_hash)
            .map_err(|e| VaultError::Vault(format!("failed to verify password: {}", e)))?;

        if !valid {
            return Err(VaultError::Vault("invalid username or password".to_string()));
        }

        // Create token for the user
        let request = CreateTokenRequest {
            display_name: format!("userpass-{}", user.username),
            policies: user.policies.clone(),
            ttl: user.ttl,
            renewable: true,
            num_uses: 0,
            meta: Some(serde_json::json!({
                "username": user.username,
                "auth_method": "userpass",
                "realm_id": user.realm_id
            })),
        };

        let path = format!("{}/login/{}", self.mount_path, user.username);
        let (entry, raw_token) = self.token_store.create_token(&request, None, &path).await?;

        Ok(LoginResponse {
            client_token: raw_token,
            accessor: format!("accessor.{}", entry.id),
            policies: user.policies,
            token_ttl: user.ttl,
            renewable: true,
            realm_id: user.realm_id,
        })
    }

    /// Set user active status
    pub async fn set_user_active(&self, username: &str, is_active: bool, realm_id: Option<Uuid>) -> VaultResult<()> {
        let username = username.to_lowercase().trim().to_string();

        let result = if let Some(realm_id) = realm_id {
            sqlx::query!(
                r#"
                UPDATE vault_users
                SET is_active = $1, updated_at = NOW()
                WHERE username = $2 AND realm_id = $3
                "#,
                is_active,
                &username,
                realm_id
            )
            .execute(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to update user status: {}", e)))?
        } else {
            sqlx::query!(
                r#"
                UPDATE vault_users
                SET is_active = $1, updated_at = NOW()
                WHERE username = $2 AND realm_id IS NULL
                "#,
                is_active,
                &username
            )
            .execute(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to update user status: {}", e)))?
        };

        if result.rows_affected() == 0 {
            return Err(VaultError::Vault("user not found".to_string()));
        }

        Ok(())
    }
}

#[async_trait]
impl Backend for UserPassBackend {
    async fn handle_request(&self, req: &mut Request) -> VaultResult<Option<Response>> {
        // Extract realm_id from request context
        let realm_id = req.realm_id;

        // Parse the path to determine the operation
        let path = req.path.trim_start_matches(&self.mount_path).trim_start_matches('/');
        let parts: Vec<&str> = path.split('/').collect();

        match (req.operation.clone(), parts.as_slice()) {
            // List users: GET /auth/userpass/users
            (crate::logical::request::Operation::List, ["users"]) => {
                let users = self.list_users_in_realm(realm_id).await?;
                let mut data = serde_json::Map::new();
                data.insert("keys".to_string(), serde_json::json!(users));
                Ok(Some(Response {
                    data: Some(data),
                    ..Default::default()
                }))
            }

            // Create/update user: POST /auth/userpass/users/:username
            (crate::logical::request::Operation::Write, ["users", username]) => {
                let body = req.data.as_ref().ok_or_else(|| {
                    VaultError::Vault("missing request body".to_string())
                })?;

                let password = body
                    .get("password")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| VaultError::Vault("password is required".to_string()))?;

                let policies: Vec<String> = body
                    .get("policies")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect()
                    })
                    .unwrap_or_default();

                let ttl = body
                    .get("ttl")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(default_ttl());

                let max_ttl = body
                    .get("max_ttl")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(default_max_ttl());

                let email = body.get("email").and_then(|v| v.as_str()).map(String::from);
                let display_name = body.get("display_name").and_then(|v| v.as_str()).map(String::from);

                let request = CreateUserRequest {
                    username: username.to_string(),
                    password: password.to_string(),
                    policies,
                    ttl,
                    max_ttl,
                    realm_id,
                    email,
                    display_name,
                };

                self.create_user_in_realm(&request, realm_id).await?;

                Ok(Some(Response::default()))
            }

            // Read user: GET /auth/userpass/users/:username
            (crate::logical::request::Operation::Read, ["users", username]) => {
                match self.get_user_in_realm(username, realm_id).await? {
                    Some(user) => {
                        let mut data = serde_json::Map::new();
                        data.insert("username".to_string(), serde_json::json!(user.username));
                        data.insert("policies".to_string(), serde_json::json!(user.policies));
                        data.insert("ttl".to_string(), serde_json::json!(user.ttl));
                        data.insert("max_ttl".to_string(), serde_json::json!(user.max_ttl));
                        data.insert("realm_id".to_string(), serde_json::json!(user.realm_id));
                        data.insert("email".to_string(), serde_json::json!(user.email));
                        data.insert("display_name".to_string(), serde_json::json!(user.display_name));
                        data.insert("is_active".to_string(), serde_json::json!(user.is_active));
                        Ok(Some(Response {
                            data: Some(data),
                            ..Default::default()
                        }))
                    }
                    None => Err(VaultError::Vault("user not found".to_string())),
                }
            }

            // Delete user: DELETE /auth/userpass/users/:username
            (crate::logical::request::Operation::Delete, ["users", username]) => {
                self.delete_user_in_realm(username, realm_id).await?;
                Ok(Some(Response::default()))
            }

            // Login: POST /auth/userpass/login/:username
            (crate::logical::request::Operation::Write, ["login", username]) => {
                let body = req.data.as_ref().ok_or_else(|| {
                    VaultError::Vault("missing request body".to_string())
                })?;

                let password = body
                    .get("password")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| VaultError::Vault("password is required".to_string()))?;

                let response = self.login_in_realm(username, password, realm_id).await?;

                let mut data = serde_json::Map::new();
                data.insert("client_token".to_string(), serde_json::json!(response.client_token.clone()));
                data.insert("accessor".to_string(), serde_json::json!(response.accessor.clone()));
                data.insert("policies".to_string(), serde_json::json!(response.policies.clone()));
                data.insert("token_ttl".to_string(), serde_json::json!(response.token_ttl));
                data.insert("renewable".to_string(), serde_json::json!(response.renewable));
                data.insert("realm_id".to_string(), serde_json::json!(response.realm_id));

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
    fn test_password_hash_and_verify() {
        let password = "secret123";
        let hash = hash(password, DEFAULT_COST).unwrap();
        
        assert!(verify(password, &hash).unwrap());
        assert!(!verify("wrong_password", &hash).unwrap());
    }
}
