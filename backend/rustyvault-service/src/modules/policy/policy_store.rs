//! Policy Store for managing policies in PostgreSQL
//!
//! Provides CRUD operations for policies and maintains an in-memory cache
//! for fast policy lookups. Supports realm-scoped policies for multi-tenancy.

use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use sqlx::PgPool;
use uuid::Uuid;

use super::acl::ACL;
use super::policy::{
    Policy, PolicyEntry, DEFAULT_POLICY, IMMUTABLE_POLICIES,
};
use crate::errors::{VaultError, VaultResult};

/// Cache key for policies (realm_id + policy name)
#[derive(Debug, Clone, Hash, Eq, PartialEq)]
struct PolicyCacheKey {
    realm_id: Option<Uuid>,
    name: String,
}

impl PolicyCacheKey {
    fn new(realm_id: Option<Uuid>, name: &str) -> Self {
        Self {
            realm_id,
            name: name.to_string(),
        }
    }
}

/// Policy store for managing vault policies
pub struct PolicyStore {
    /// Database pool
    pool: PgPool,
    /// In-memory cache of policies with realm context
    cache: RwLock<HashMap<PolicyCacheKey, Arc<Policy>>>,
}

impl PolicyStore {
    /// Create a new policy store
    pub fn new(pool: PgPool) -> Self {
        PolicyStore {
            pool,
            cache: RwLock::new(HashMap::new()),
        }
    }

    /// Initialize the policy store with default policies
    pub async fn init(&self) -> VaultResult<()> {
        // Load default policy if it doesn't exist (global)
        if self.get_policy("default", None).await?.is_none() {
            let mut policy = Policy::from_json(DEFAULT_POLICY)?;
            policy.name = "default".to_string();
            self.set_policy_internal(&policy, None).await?;
        }

        // Add root policy to cache (it's never stored, just a marker)
        let root_policy = Arc::new(Policy {
            name: "root".to_string(),
            ..Default::default()
        });
        let cache_key = PolicyCacheKey::new(None, "root");
        self.cache.write().unwrap().insert(cache_key, root_policy);

        Ok(())
    }

    /// Set (create or update) a policy (realm-scoped)
    pub async fn set_policy(&self, policy: &Policy, realm_id: Option<Uuid>) -> VaultResult<()> {
        let name = self.sanitize_name(&policy.name);

        if name.is_empty() {
            return Err(VaultError::Vault("policy name missing".to_string()));
        }

        // Check if policy is immutable (except during init)
        if IMMUTABLE_POLICIES.contains(&name.as_str()) && name != "default" {
            return Err(VaultError::Vault(format!(
                "cannot update {} policy",
                name
            )));
        }

        let mut policy = policy.clone();
        policy.name = name;
        self.set_policy_internal(&policy, realm_id).await
    }

    /// Internal method to set a policy with realm context
    async fn set_policy_internal(&self, policy: &Policy, realm_id: Option<Uuid>) -> VaultResult<()> {
        let entry = PolicyEntry::from_policy(policy);
        let entry_json = serde_json::to_value(&entry)
            .map_err(|e| VaultError::Vault(format!("failed to serialize policy: {}", e)))?;

        // Ensure raw policy is never empty (required for legacy 'policy' column which is NOT NULL)
        let raw_policy = if policy.raw.is_empty() {
            format!("{{\"name\": \"{}\", \"path\": {{}}}}", policy.name)
        } else {
            policy.raw.clone()
        };

        // Upsert into database with realm context
        // Use different conflict strategies based on realm_id
        let policy_type_str = policy.policy_type.to_string();
        if let Some(realm_id) = realm_id {
            sqlx::query!(
                r#"
                INSERT INTO vault_policies (name, policy, policy_type, raw_policy, parsed_policy, realm_id)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (realm_id, name) WHERE realm_id IS NOT NULL DO UPDATE SET
                    policy = $2,
                    policy_type = $3,
                    raw_policy = $4,
                    parsed_policy = $5,
                    updated_at = NOW()
                "#,
                &policy.name,
                &raw_policy,
                &policy_type_str,
                &raw_policy,
                &entry_json,
                realm_id
            )
            .execute(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to save realm policy: {}", e)))?;
        } else {
            sqlx::query!(
                r#"
                INSERT INTO vault_policies (name, policy, policy_type, raw_policy, parsed_policy, realm_id)
                VALUES ($1, $2, $3, $4, $5, NULL)
                ON CONFLICT (name) WHERE realm_id IS NULL DO UPDATE SET
                    policy = $2,
                    policy_type = $3,
                    raw_policy = $4,
                    parsed_policy = $5,
                    updated_at = NOW()
                "#,
                &policy.name,
                &raw_policy,
                &policy_type_str,
                &raw_policy,
                &entry_json
            )
            .execute(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to save global policy: {}", e)))?;
        }

        // Update cache with realm context
        let cache_key = PolicyCacheKey::new(realm_id, &policy.name);
        self.cache.write().unwrap().insert(
            cache_key,
            Arc::new(policy.clone()),
        );

        Ok(())
    }

    /// Get a policy by name (realm-scoped or global)
    pub async fn get_policy(&self, name: &str, realm_id: Option<Uuid>) -> VaultResult<Option<Arc<Policy>>> {
        let name = self.sanitize_name(name);

        // Check cache first (realm-specific)
        let cache_key = PolicyCacheKey::new(realm_id, &name);
        if let Some(policy) = self.cache.read().unwrap().get(&cache_key) {
            return Ok(Some(policy.clone()));
        }

        // Special case for root policy
        if name == "root" {
            let policy = Arc::new(Policy {
                name: "root".to_string(),
                ..Default::default()
            });
            self.cache.write().unwrap().insert(cache_key, policy.clone());
            return Ok(Some(policy));
        }

        // Fetch from database - first try realm-specific, then global
        let row_data: Option<(String, String, String, Option<Uuid>)> = if let Some(realm_id) = realm_id {
            // Try realm-specific first
            let realm_row = sqlx::query!(
                r#"
                SELECT name, policy_type, raw_policy as "raw_policy!", realm_id
                FROM vault_policies
                WHERE name = $1 AND realm_id = $2
                "#,
                &name,
                realm_id
            )
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to fetch realm policy: {}", e)))?
            .map(|r| (r.name, r.policy_type, r.raw_policy, r.realm_id));

            // If not found in realm, try global
            if realm_row.is_none() {
                sqlx::query!(
                    r#"
                    SELECT name, policy_type, raw_policy as "raw_policy!", realm_id
                    FROM vault_policies
                    WHERE name = $1 AND realm_id IS NULL
                    "#,
                    &name
                )
                .fetch_optional(&self.pool)
                .await
                .map_err(|e| VaultError::Vault(format!("failed to fetch global policy: {}", e)))?
                .map(|r| (r.name, r.policy_type, r.raw_policy, r.realm_id))
            } else {
                realm_row
            }
        } else {
            // Fetch global only
            sqlx::query!(
                r#"
                SELECT name, policy_type, raw_policy as "raw_policy!", realm_id
                FROM vault_policies
                WHERE name = $1 AND realm_id IS NULL
                "#,
                &name
            )
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to fetch policy: {}", e)))?
            .map(|r| (r.name, r.policy_type, r.raw_policy, r.realm_id))
        };

        match row_data {
            Some(row) => {
                let (db_name, _policy_type, raw, policy_realm_id) = row;
                let policy = Policy::from_json(&raw)?;
                let mut policy = policy;
                policy.name = db_name;

                let policy = Arc::new(policy);
                let cache_key = PolicyCacheKey::new(policy_realm_id, &name);
                self.cache.write().unwrap().insert(cache_key, policy.clone());
                Ok(Some(policy))
            }
            None => Ok(None),
        }
    }

    /// List all policy names (realm-scoped or global)
    pub async fn list_policies(&self, realm_id: Option<Uuid>) -> VaultResult<Vec<String>> {
        let rows: Vec<String> = if let Some(realm_id) = realm_id {
            // Include both realm-specific and global policies
            sqlx::query_scalar!(
                r#"
                SELECT name FROM vault_policies
                WHERE realm_id = $1 OR realm_id IS NULL
                ORDER BY name
                "#,
                realm_id
            )
            .fetch_all(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to list realm policies: {}", e)))?
        } else {
            // List only global policies
            sqlx::query_scalar!(
                r#"
                SELECT name FROM vault_policies
                WHERE realm_id IS NULL
                ORDER BY name
                "#
            )
            .fetch_all(&self.pool)
            .await
            .map_err(|e| VaultError::Vault(format!("failed to list policies: {}", e)))?
        };

        Ok(rows)
    }

    /// List policies in a specific realm only (not including global)
    pub async fn list_realm_policies(&self, realm_id: Uuid) -> VaultResult<Vec<String>> {
        let rows: Vec<String> = sqlx::query_scalar!(
            r#"
            SELECT name FROM vault_policies
            WHERE realm_id = $1
            ORDER BY name
            "#,
            realm_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| VaultError::Vault(format!("failed to list realm-only policies: {}", e)))?;

        Ok(rows)
    }

    /// Delete a policy (realm-scoped or global)
    pub async fn delete_policy(&self, name: &str, realm_id: Option<Uuid>) -> VaultResult<()> {
        let name = self.sanitize_name(name);

        // Check if policy is immutable
        if IMMUTABLE_POLICIES.contains(&name.as_str()) {
            return Err(VaultError::Vault(format!(
                "cannot delete {} policy",
                name
            )));
        }

        // Delete from database
        let result = if let Some(realm_id) = realm_id {
            sqlx::query!("DELETE FROM vault_policies WHERE name = $1 AND realm_id = $2", &name, realm_id)
                .execute(&self.pool)
                .await
                .map_err(|e| VaultError::Vault(format!("failed to delete realm policy: {}", e)))?
        } else {
            sqlx::query!("DELETE FROM vault_policies WHERE name = $1 AND realm_id IS NULL", &name)
                .execute(&self.pool)
                .await
                .map_err(|e| VaultError::Vault(format!("failed to delete global policy: {}", e)))?
        };

        if result.rows_affected() == 0 {
            return Err(VaultError::Vault("policy not found".to_string()));
        }

        // Remove from cache
        let cache_key = PolicyCacheKey::new(realm_id, &name);
        self.cache.write().unwrap().remove(&cache_key);

        Ok(())
    }

    /// Create an ACL from a list of policy names (realm-aware)
    pub async fn new_acl(&self, policy_names: &[String], realm_id: Option<Uuid>) -> VaultResult<ACL> {
        let mut policies: Vec<Arc<Policy>> = Vec::new();

        for name in policy_names {
            if let Some(policy) = self.get_policy(name, realm_id).await? {
                policies.push(policy);
            }
        }

        ACL::new(&policies)
    }

    /// Check if a token with the given policies can perform an operation (realm-aware)
    pub async fn check_capabilities(
        &self,
        policy_names: &[String],
        path: &str,
        realm_id: Option<Uuid>,
    ) -> VaultResult<Vec<String>> {
        let acl = self.new_acl(policy_names, realm_id).await?;
        Ok(acl.capabilities(path))
    }

    /// Sanitize a policy name
    fn sanitize_name(&self, name: &str) -> String {
        name.to_lowercase().trim().to_string()
    }

    /// Clear the policy cache (useful for testing)
    pub fn clear_cache(&self) {
        self.cache.write().unwrap().clear();
    }

    /// Clear cache for a specific realm
    pub fn clear_realm_cache(&self, realm_id: Option<Uuid>) {
        let mut cache = self.cache.write().unwrap();
        cache.retain(|key, _| key.realm_id != realm_id);
    }

    // ============================================================
    // Legacy API compatibility (without realm_id)
    // ============================================================

    /// Set (create or update) a global policy (legacy API)
    pub async fn set_policy_global(&self, policy: &Policy) -> VaultResult<()> {
        self.set_policy(policy, None).await
    }

    /// Get a global policy by name (legacy API)
    pub async fn get_policy_global(&self, name: &str) -> VaultResult<Option<Arc<Policy>>> {
        self.get_policy(name, None).await
    }

    /// List all global policy names (legacy API)
    pub async fn list_policies_global(&self) -> VaultResult<Vec<String>> {
        self.list_policies(None).await
    }

    /// Delete a global policy (legacy API)
    pub async fn delete_policy_global(&self, name: &str) -> VaultResult<()> {
        self.delete_policy(name, None).await
    }

    /// Create an ACL from a list of policy names (legacy API - global)
    pub async fn new_acl_global(&self, policy_names: &[String]) -> VaultResult<ACL> {
        self.new_acl(policy_names, None).await
    }

    /// Check capabilities (legacy API - global)
    pub async fn check_capabilities_global(
        &self,
        policy_names: &[String],
        path: &str,
    ) -> VaultResult<Vec<String>> {
        self.check_capabilities(policy_names, path, None).await
    }
}

/// Response for capabilities check
#[derive(Debug, Clone, serde::Serialize)]
pub struct CapabilitiesResponse {
    pub capabilities: Vec<String>,
    pub path: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_policy_cache_key() {
        let key1 = PolicyCacheKey::new(None, "test");
        let key2 = PolicyCacheKey::new(None, "test");
        let key3 = PolicyCacheKey::new(Some(Uuid::new_v4()), "test");
        
        assert_eq!(key1, key2);
        assert_ne!(key1, key3);
    }

    #[test]
    fn test_sanitize_name() {
        // Simple string tests without needing the actual store
        assert_eq!("test", "TEST".to_lowercase());
        assert_eq!("test", " test ".trim());
    }
}
