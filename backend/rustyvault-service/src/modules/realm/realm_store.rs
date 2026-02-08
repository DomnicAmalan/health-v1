//! Realm Store for managing realms in PostgreSQL
//!
//! Provides CRUD operations for realms with organization scoping.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::{VaultError, VaultResult};

/// Realm entity representing a multi-tenant namespace in vault
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Realm {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub display_name: Option<String>,
    pub organization_id: Option<Uuid>,
    pub config: Option<serde_json::Value>,
    pub default_lease_ttl: Option<i32>,
    pub max_lease_ttl: Option<i32>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub request_id: Option<String>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

/// Request to create a new realm
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateRealmRequest {
    pub name: String,
    pub description: Option<String>,
    pub display_name: Option<String>,
    pub organization_id: Option<Uuid>,
    pub config: Option<serde_json::Value>,
    pub default_lease_ttl: Option<i32>,
    pub max_lease_ttl: Option<i32>,
}

/// Request to update a realm
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateRealmRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub display_name: Option<String>,
    pub config: Option<serde_json::Value>,
    pub default_lease_ttl: Option<i32>,
    pub max_lease_ttl: Option<i32>,
    pub is_active: Option<bool>,
}

/// Realm store for managing vault realms
pub struct RealmStore {
    pool: PgPool,
}

impl RealmStore {
    /// Create a new realm store
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create a new realm
    pub async fn create(&self, request: &CreateRealmRequest) -> VaultResult<Realm> {
        let realm = sqlx::query_as!(
            Realm,
            r#"
            INSERT INTO vault_realms (
                name,
                description,
                display_name,
                organization_id,
                config,
                default_lease_ttl,
                max_lease_ttl,
                is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, true)
            RETURNING
                id, name, description, display_name, organization_id, config,
                default_lease_ttl, max_lease_ttl, is_active,
                created_at, updated_at, request_id, created_by, updated_by
            "#,
            &request.name,
            request.description.as_deref(),
            request.display_name.as_deref(),
            request.organization_id,
            request.config.as_ref(),
            request.default_lease_ttl.unwrap_or(3600),
            request.max_lease_ttl.unwrap_or(86400)
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            if e.to_string().contains("duplicate key") {
                VaultError::Vault(format!("realm '{}' already exists", request.name))
            } else {
                VaultError::Vault(format!("failed to create realm: {}", e))
            }
        })?;

        Ok(realm)
    }

    /// Get a realm by ID
    pub async fn get(&self, id: Uuid) -> VaultResult<Option<Realm>> {
        let realm = sqlx::query_as!(
            Realm,
            r#"
            SELECT
                id, name, description, display_name, organization_id, config,
                default_lease_ttl, max_lease_ttl, is_active,
                created_at, updated_at, request_id, created_by, updated_by
            FROM vault_realms
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to get realm: {}", e)))?;

        Ok(realm)
    }

    /// Get a realm by name
    pub async fn get_by_name(&self, name: &str) -> VaultResult<Option<Realm>> {
        let realm = sqlx::query_as!(
            Realm,
            r#"
            SELECT
                id, name, description, display_name, organization_id, config,
                default_lease_ttl, max_lease_ttl, is_active,
                created_at, updated_at, request_id, created_by, updated_by
            FROM vault_realms
            WHERE name = $1
            "#,
            name
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to get realm by name: {}", e)))?;

        Ok(realm)
    }

    /// Get a realm by organization ID
    pub async fn get_by_organization(&self, organization_id: Uuid) -> VaultResult<Option<Realm>> {
        let realm = sqlx::query_as!(
            Realm,
            r#"
            SELECT
                id, name, description, display_name, organization_id, config,
                default_lease_ttl, max_lease_ttl, is_active,
                created_at, updated_at, request_id, created_by, updated_by
            FROM vault_realms
            WHERE organization_id = $1
            ORDER BY created_at ASC
            LIMIT 1
            "#,
            organization_id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to get realm by organization: {}", e)))?;

        Ok(realm)
    }

    /// List all realms
    pub async fn list(&self) -> VaultResult<Vec<Realm>> {
        let realms = sqlx::query_as!(
            Realm,
            r#"
            SELECT
                id, name, description, display_name, organization_id, config,
                default_lease_ttl, max_lease_ttl, is_active,
                created_at, updated_at, request_id, created_by, updated_by
            FROM vault_realms
            ORDER BY name
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to list realms: {}", e)))?;

        Ok(realms)
    }

    /// List realms by organization ID
    pub async fn list_by_organization(&self, organization_id: Uuid) -> VaultResult<Vec<Realm>> {
        let realms = sqlx::query_as!(
            Realm,
            r#"
            SELECT
                id, name, description, display_name, organization_id, config,
                default_lease_ttl, max_lease_ttl, is_active,
                created_at, updated_at, request_id, created_by, updated_by
            FROM vault_realms
            WHERE organization_id = $1
            ORDER BY name
            "#,
            organization_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to list realms by organization: {}", e)))?;

        Ok(realms)
    }

    /// Update a realm
    pub async fn update(&self, id: Uuid, request: &UpdateRealmRequest) -> VaultResult<Realm> {
        // Build dynamic update query
        let mut set_clauses = Vec::new();
        let mut param_index = 2; // $1 is id

        if request.name.is_some() {
            set_clauses.push(format!("name = ${}", param_index));
            param_index += 1;
        }
        if request.description.is_some() {
            set_clauses.push(format!("description = ${}", param_index));
            param_index += 1;
        }
        if request.display_name.is_some() {
            set_clauses.push(format!("display_name = ${}", param_index));
            param_index += 1;
        }
        if request.config.is_some() {
            set_clauses.push(format!("config = ${}", param_index));
            param_index += 1;
        }
        if request.default_lease_ttl.is_some() {
            set_clauses.push(format!("default_lease_ttl = ${}", param_index));
            param_index += 1;
        }
        if request.max_lease_ttl.is_some() {
            set_clauses.push(format!("max_lease_ttl = ${}", param_index));
            param_index += 1;
        }
        if request.is_active.is_some() {
            set_clauses.push(format!("is_active = ${}", param_index));
            // param_index += 1;
        }

        if set_clauses.is_empty() {
            // No updates, just return the current realm
            return self.get(id).await?.ok_or_else(|| {
                VaultError::Vault("realm not found".to_string())
            });
        }

        set_clauses.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE vault_realms
            SET {}
            WHERE id = $1
            RETURNING 
                id, name, description, display_name, organization_id, config,
                default_lease_ttl, max_lease_ttl, is_active,
                created_at, updated_at, request_id, created_by, updated_by
            "#,
            set_clauses.join(", ")
        );

        // Build and execute query with dynamic parameters
        let mut query_builder = sqlx::query_as::<_, Realm>(&query);
        query_builder = query_builder.bind(id);

        if let Some(ref name) = request.name {
            query_builder = query_builder.bind(name);
        }
        if let Some(ref description) = request.description {
            query_builder = query_builder.bind(description);
        }
        if let Some(ref display_name) = request.display_name {
            query_builder = query_builder.bind(display_name);
        }
        if let Some(ref config) = request.config {
            query_builder = query_builder.bind(config);
        }
        if let Some(default_lease_ttl) = request.default_lease_ttl {
            query_builder = query_builder.bind(default_lease_ttl);
        }
        if let Some(max_lease_ttl) = request.max_lease_ttl {
            query_builder = query_builder.bind(max_lease_ttl);
        }
        if let Some(is_active) = request.is_active {
            query_builder = query_builder.bind(is_active);
        }

        let realm: Realm = query_builder
            .fetch_one(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to update realm: {}", e)))?;

        Ok(realm)
    }

    /// Delete a realm
    pub async fn delete(&self, id: Uuid) -> VaultResult<()> {
        let result = sqlx::query!("DELETE FROM vault_realms WHERE id = $1", id)
            .execute(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to delete realm: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(VaultError::Vault("realm not found".to_string()));
        }

        Ok(())
    }

    /// Check if a realm exists
    pub async fn exists(&self, id: Uuid) -> VaultResult<bool> {
        let count: i64 = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM vault_realms WHERE id = $1",
            id
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to check realm existence: {}", e)))?
        .unwrap_or(0);

        Ok(count > 0)
    }

    /// Check if a realm name exists
    pub async fn name_exists(&self, name: &str) -> VaultResult<bool> {
        let count: i64 = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM vault_realms WHERE name = $1",
            name
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to check realm name existence: {}", e)))?
        .unwrap_or(0);

        Ok(count > 0)
    }

    /// Get or create a realm for an organization
    pub async fn get_or_create_for_organization(
        &self,
        organization_id: Uuid,
        default_name: &str,
    ) -> VaultResult<Realm> {
        // Try to get existing realm
        if let Some(realm) = self.get_by_organization(organization_id).await? {
            return Ok(realm);
        }

        // Create new realm for organization
        let request = CreateRealmRequest {
            name: default_name.to_string(),
            description: Some(format!("Default realm for organization {}", organization_id)),
            display_name: Some(default_name.to_string()),
            organization_id: Some(organization_id),
            config: None,
            default_lease_ttl: None,
            max_lease_ttl: None,
        };

        self.create(&request).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_realm_request_serialization() {
        let request = CreateRealmRequest {
            name: "test-realm".to_string(),
            description: Some("Test realm".to_string()),
            display_name: Some("Test Realm".to_string()),
            organization_id: Some(Uuid::new_v4()),
            config: Some(serde_json::json!({"key": "value"})),
            default_lease_ttl: Some(3600),
            max_lease_ttl: Some(86400),
        };

        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("test-realm"));
    }
}

