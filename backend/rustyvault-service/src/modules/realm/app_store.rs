//! Realm Application Store for managing applications registered in realms
//!
//! Provides CRUD operations for realm applications with support for different
//! app types and authentication methods.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::{VaultError, VaultResult};

/// Application types supported in the system
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AppType {
    #[serde(rename = "admin-ui")]
    AdminUi,
    #[serde(rename = "client-app")]
    ClientApp,
    #[serde(rename = "mobile")]
    Mobile,
    #[serde(rename = "api")]
    Api,
    #[serde(rename = "service")]
    Service,
}

impl AppType {
    pub fn as_str(&self) -> &'static str {
        match self {
            AppType::AdminUi => "admin-ui",
            AppType::ClientApp => "client-app",
            AppType::Mobile => "mobile",
            AppType::Api => "api",
            AppType::Service => "service",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "admin-ui" => Some(AppType::AdminUi),
            "client-app" => Some(AppType::ClientApp),
            "mobile" => Some(AppType::Mobile),
            "api" => Some(AppType::Api),
            "service" => Some(AppType::Service),
            _ => None,
        }
    }
}

impl std::fmt::Display for AppType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// Authentication methods supported for applications
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AuthMethod {
    #[serde(rename = "token")]
    Token,
    #[serde(rename = "userpass")]
    UserPass,
    #[serde(rename = "approle")]
    AppRole,
    #[serde(rename = "jwt")]
    Jwt,
    #[serde(rename = "oidc")]
    Oidc,
}

impl AuthMethod {
    pub fn as_str(&self) -> &'static str {
        match self {
            AuthMethod::Token => "token",
            AuthMethod::UserPass => "userpass",
            AuthMethod::AppRole => "approle",
            AuthMethod::Jwt => "jwt",
            AuthMethod::Oidc => "oidc",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "token" => Some(AuthMethod::Token),
            "userpass" => Some(AuthMethod::UserPass),
            "approle" => Some(AuthMethod::AppRole),
            "jwt" => Some(AuthMethod::Jwt),
            "oidc" => Some(AuthMethod::Oidc),
            _ => None,
        }
    }
}

/// Realm application entity
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RealmApplication {
    pub id: Uuid,
    pub realm_id: Uuid,
    pub app_name: String,
    pub app_type: String,
    pub display_name: Option<String>,
    pub description: Option<String>,
    pub config: Option<serde_json::Value>,
    pub allowed_auth_methods: Vec<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub request_id: Option<String>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

/// Request to create a new realm application
#[derive(Debug, Clone, Deserialize)]
pub struct CreateAppRequest {
    pub app_name: String,
    pub app_type: String,
    pub display_name: Option<String>,
    pub description: Option<String>,
    pub config: Option<serde_json::Value>,
    pub allowed_auth_methods: Option<Vec<String>>,
}

/// Request to update a realm application
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateAppRequest {
    pub display_name: Option<String>,
    pub description: Option<String>,
    pub config: Option<serde_json::Value>,
    pub allowed_auth_methods: Option<Vec<String>>,
    pub is_active: Option<bool>,
}

/// Realm application store for managing applications in realms
pub struct RealmApplicationStore {
    pool: PgPool,
}

impl RealmApplicationStore {
    /// Create a new realm application store
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create a new application in a realm
    pub async fn create(&self, realm_id: Uuid, request: &CreateAppRequest) -> VaultResult<RealmApplication> {
        // Validate app_type
        if AppType::from_str(&request.app_type).is_none() {
            return Err(VaultError::Vault(format!(
                "invalid app_type '{}'. Valid types: admin-ui, client-app, mobile, api, service",
                request.app_type
            )));
        }

        // Default auth methods based on app type
        let allowed_auth_methods = request.allowed_auth_methods.clone().unwrap_or_else(|| {
            match request.app_type.as_str() {
                "admin-ui" | "client-app" => vec!["token".to_string(), "userpass".to_string()],
                "mobile" => vec!["token".to_string(), "userpass".to_string(), "approle".to_string()],
                "api" | "service" => vec!["token".to_string(), "approle".to_string()],
                _ => vec!["token".to_string(), "userpass".to_string(), "approle".to_string()],
            }
        });

        let app: RealmApplication = sqlx::query_as(
            r#"
            INSERT INTO vault_realm_applications (
                realm_id,
                app_name,
                app_type,
                display_name,
                description,
                config,
                allowed_auth_methods,
                is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, true)
            RETURNING 
                id, realm_id, app_name, app_type, display_name, description,
                config, allowed_auth_methods, is_active,
                created_at, updated_at, request_id, created_by, updated_by
            "#,
        )
        .bind(realm_id)
        .bind(&request.app_name)
        .bind(&request.app_type)
        .bind(&request.display_name)
        .bind(&request.description)
        .bind(&request.config)
        .bind(&allowed_auth_methods)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            if e.to_string().contains("duplicate key") {
                VaultError::Vault(format!(
                    "application '{}' already exists in realm",
                    request.app_name
                ))
            } else if e.to_string().contains("check_app_type") {
                VaultError::Vault(format!(
                    "invalid app_type '{}'. Valid types: admin-ui, client-app, mobile, api, service",
                    request.app_type
                ))
            } else {
                VaultError::Vault(format!("failed to create application: {}", e))
            }
        })?;

        Ok(app)
    }

    /// Get an application by ID
    pub async fn get(&self, id: Uuid) -> VaultResult<Option<RealmApplication>> {
        let app: Option<RealmApplication> = sqlx::query_as(
            r#"
            SELECT 
                id, realm_id, app_name, app_type, display_name, description,
                config, allowed_auth_methods, is_active,
                created_at, updated_at, request_id, created_by, updated_by
            FROM vault_realm_applications
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to get application: {}", e)))?;

        Ok(app)
    }

    /// Get an application by name in a realm
    pub async fn get_by_name(&self, realm_id: Uuid, app_name: &str) -> VaultResult<Option<RealmApplication>> {
        let app: Option<RealmApplication> = sqlx::query_as(
            r#"
            SELECT 
                id, realm_id, app_name, app_type, display_name, description,
                config, allowed_auth_methods, is_active,
                created_at, updated_at, request_id, created_by, updated_by
            FROM vault_realm_applications
            WHERE realm_id = $1 AND app_name = $2
            "#,
        )
        .bind(realm_id)
        .bind(app_name)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to get application by name: {}", e)))?;

        Ok(app)
    }

    /// List all applications in a realm
    pub async fn list(&self, realm_id: Uuid) -> VaultResult<Vec<RealmApplication>> {
        let apps: Vec<RealmApplication> = sqlx::query_as(
            r#"
            SELECT 
                id, realm_id, app_name, app_type, display_name, description,
                config, allowed_auth_methods, is_active,
                created_at, updated_at, request_id, created_by, updated_by
            FROM vault_realm_applications
            WHERE realm_id = $1
            ORDER BY app_name
            "#,
        )
        .bind(realm_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to list applications: {}", e)))?;

        Ok(apps)
    }

    /// List applications by type in a realm
    pub async fn list_by_type(&self, realm_id: Uuid, app_type: &str) -> VaultResult<Vec<RealmApplication>> {
        let apps: Vec<RealmApplication> = sqlx::query_as(
            r#"
            SELECT 
                id, realm_id, app_name, app_type, display_name, description,
                config, allowed_auth_methods, is_active,
                created_at, updated_at, request_id, created_by, updated_by
            FROM vault_realm_applications
            WHERE realm_id = $1 AND app_type = $2
            ORDER BY app_name
            "#,
        )
        .bind(realm_id)
        .bind(app_type)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to list applications by type: {}", e)))?;

        Ok(apps)
    }

    /// Update an application
    pub async fn update(&self, id: Uuid, request: &UpdateAppRequest) -> VaultResult<RealmApplication> {
        // Build dynamic update query
        let mut set_clauses = Vec::new();
        let mut param_index = 2; // $1 is id

        if request.display_name.is_some() {
            set_clauses.push(format!("display_name = ${}", param_index));
            param_index += 1;
        }
        if request.description.is_some() {
            set_clauses.push(format!("description = ${}", param_index));
            param_index += 1;
        }
        if request.config.is_some() {
            set_clauses.push(format!("config = ${}", param_index));
            param_index += 1;
        }
        if request.allowed_auth_methods.is_some() {
            set_clauses.push(format!("allowed_auth_methods = ${}", param_index));
            param_index += 1;
        }
        if request.is_active.is_some() {
            set_clauses.push(format!("is_active = ${}", param_index));
            // param_index += 1;
        }

        if set_clauses.is_empty() {
            // No updates, just return the current app
            return self.get(id).await?.ok_or_else(|| {
                VaultError::Vault("application not found".to_string())
            });
        }

        set_clauses.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE vault_realm_applications
            SET {}
            WHERE id = $1
            RETURNING 
                id, realm_id, app_name, app_type, display_name, description,
                config, allowed_auth_methods, is_active,
                created_at, updated_at, request_id, created_by, updated_by
            "#,
            set_clauses.join(", ")
        );

        // Build and execute query with dynamic parameters
        let mut query_builder = sqlx::query_as::<_, RealmApplication>(&query);
        query_builder = query_builder.bind(id);

        if let Some(ref display_name) = request.display_name {
            query_builder = query_builder.bind(display_name);
        }
        if let Some(ref description) = request.description {
            query_builder = query_builder.bind(description);
        }
        if let Some(ref config) = request.config {
            query_builder = query_builder.bind(config);
        }
        if let Some(ref allowed_auth_methods) = request.allowed_auth_methods {
            query_builder = query_builder.bind(allowed_auth_methods);
        }
        if let Some(is_active) = request.is_active {
            query_builder = query_builder.bind(is_active);
        }

        let app: RealmApplication = query_builder
            .fetch_one(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to update application: {}", e)))?;

        Ok(app)
    }

    /// Delete an application
    pub async fn delete(&self, id: Uuid) -> VaultResult<()> {
        let result = sqlx::query("DELETE FROM vault_realm_applications WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to delete application: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(VaultError::Vault("application not found".to_string()));
        }

        Ok(())
    }

    /// Delete an application by name in a realm
    pub async fn delete_by_name(&self, realm_id: Uuid, app_name: &str) -> VaultResult<()> {
        let result = sqlx::query(
            "DELETE FROM vault_realm_applications WHERE realm_id = $1 AND app_name = $2"
        )
        .bind(realm_id)
        .bind(app_name)
        .execute(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to delete application: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(VaultError::Vault("application not found".to_string()));
        }

        Ok(())
    }

    /// Check if an application allows a specific auth method
    pub async fn is_auth_method_allowed(
        &self,
        realm_id: Uuid,
        app_name: &str,
        auth_method: &str,
    ) -> VaultResult<bool> {
        let app = self.get_by_name(realm_id, app_name).await?;
        
        match app {
            Some(app) => Ok(app.allowed_auth_methods.contains(&auth_method.to_string())),
            None => Err(VaultError::Vault("application not found".to_string())),
        }
    }

    /// Register default applications for a realm (admin-ui, client-app, mobile)
    pub async fn register_default_apps(&self, realm_id: Uuid) -> VaultResult<Vec<RealmApplication>> {
        let default_apps = vec![
            CreateAppRequest {
                app_name: "admin-ui".to_string(),
                app_type: "admin-ui".to_string(),
                display_name: Some("Admin Dashboard".to_string()),
                description: Some("Administrative web interface".to_string()),
                config: None,
                allowed_auth_methods: Some(vec![
                    "token".to_string(),
                    "userpass".to_string(),
                ]),
            },
            CreateAppRequest {
                app_name: "client-app".to_string(),
                app_type: "client-app".to_string(),
                display_name: Some("Client Application".to_string()),
                description: Some("Client-facing web application".to_string()),
                config: None,
                allowed_auth_methods: Some(vec![
                    "token".to_string(),
                    "userpass".to_string(),
                ]),
            },
            CreateAppRequest {
                app_name: "mobile".to_string(),
                app_type: "mobile".to_string(),
                display_name: Some("Mobile Application".to_string()),
                description: Some("Native mobile application".to_string()),
                config: None,
                allowed_auth_methods: Some(vec![
                    "token".to_string(),
                    "userpass".to_string(),
                    "approle".to_string(),
                ]),
            },
        ];

        let mut created_apps = Vec::new();
        for app_request in default_apps {
            // Skip if app already exists
            if self.get_by_name(realm_id, &app_request.app_name).await?.is_some() {
                continue;
            }
            
            let app = self.create(realm_id, &app_request).await?;
            created_apps.push(app);
        }

        Ok(created_apps)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_type_from_str() {
        assert_eq!(AppType::from_str("admin-ui"), Some(AppType::AdminUi));
        assert_eq!(AppType::from_str("client-app"), Some(AppType::ClientApp));
        assert_eq!(AppType::from_str("mobile"), Some(AppType::Mobile));
        assert_eq!(AppType::from_str("api"), Some(AppType::Api));
        assert_eq!(AppType::from_str("service"), Some(AppType::Service));
        assert_eq!(AppType::from_str("invalid"), None);
    }

    #[test]
    fn test_auth_method_from_str() {
        assert_eq!(AuthMethod::from_str("token"), Some(AuthMethod::Token));
        assert_eq!(AuthMethod::from_str("userpass"), Some(AuthMethod::UserPass));
        assert_eq!(AuthMethod::from_str("approle"), Some(AuthMethod::AppRole));
        assert_eq!(AuthMethod::from_str("invalid"), None);
    }
}

