//! RustyVault client implementation
//! 
//! Extends the base Vault trait with policy and token management
//! for integration with RustyVault service.

use crate::infrastructure::encryption::vault::Vault;
use crate::shared::{AppError, AppResult};
use async_trait::async_trait;
use base64::{Engine as _, engine::general_purpose::STANDARD};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// RustyVault client for secrets, policies, and token management
pub struct RustyVaultClient {
    client: Client,
    addr: String,
    token: String,
    mount_path: String,
}

/// Token creation request
#[derive(Debug, Serialize)]
pub struct CreateTokenRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub policies: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ttl: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<serde_json::Map<String, serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub renewable: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub num_uses: Option<i32>,
}

/// Token response
#[derive(Debug, Deserialize)]
pub struct TokenResponse {
    pub auth: Option<TokenAuth>,
}

#[derive(Debug, Deserialize)]
pub struct TokenAuth {
    pub client_token: String,
    pub accessor: String,
    pub policies: Vec<String>,
    pub lease_duration: i64,
    pub renewable: bool,
}

/// Token entry from lookup
#[derive(Debug, Clone, Deserialize)]
pub struct TokenEntry {
    pub id: String,
    pub accessor: String,
    pub policies: Vec<String>,
    pub display_name: Option<String>,
    pub meta: Option<serde_json::Map<String, serde_json::Value>>,
    pub ttl: i64,
    pub renewable: bool,
}

impl RustyVaultClient {
    /// Create a new RustyVault client
    pub fn new(addr: &str, token: &str, mount_path: &str) -> Self {
        Self {
            client: Client::new(),
            addr: addr.trim_end_matches('/').to_string(),
            token: token.to_string(),
            mount_path: mount_path.to_string(),
        }
    }

    /// Create from environment variables
    pub fn from_env() -> AppResult<Self> {
        let addr = std::env::var("VAULT_ADDR")
            .unwrap_or_else(|_| "http://localhost:8201".to_string());
        let token = std::env::var("VAULT_TOKEN")
            .map_err(|_| AppError::Configuration("VAULT_TOKEN not set".to_string()))?;
        let mount_path = std::env::var("VAULT_MOUNT_PATH")
            .unwrap_or_else(|_| "secret".to_string());
        
        Ok(Self::new(&addr, &token, &mount_path))
    }

    // ==========================================
    // Policy Management
    // ==========================================

    /// Create or update a policy
    pub async fn write_policy(&self, name: &str, policy: &str) -> AppResult<()> {
        let path = format!("{}/v1/sys/policies/acl/{}", self.addr, name);
        let data = serde_json::json!({
            "policy": policy
        });

        let response = self.client
            .post(&path)
            .header("X-RustyVault-Token", &self.token)
            .json(&data)
            .send()
            .await
            .map_err(|e| AppError::Encryption(format!("Vault policy write error: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Encryption(format!(
                "Failed to write policy '{}': {} - {}", name, status, error_text
            )));
        }

        Ok(())
    }

    /// Delete a policy
    pub async fn delete_policy(&self, name: &str) -> AppResult<()> {
        let path = format!("{}/v1/sys/policies/acl/{}", self.addr, name);

        let response = self.client
            .delete(&path)
            .header("X-RustyVault-Token", &self.token)
            .send()
            .await
            .map_err(|e| AppError::Encryption(format!("Vault policy delete error: {}", e)))?;

        if !response.status().is_success() && response.status() != 404 {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Encryption(format!(
                "Failed to delete policy '{}': {} - {}", name, status, error_text
            )));
        }

        Ok(())
    }

    /// List all policies
    pub async fn list_policies(&self) -> AppResult<Vec<String>> {
        let path = format!("{}/v1/sys/policies/acl", self.addr);

        let response = self.client
            .get(&path)
            .header("X-RustyVault-Token", &self.token)
            .send()
            .await
            .map_err(|e| AppError::Encryption(format!("Vault policy list error: {}", e)))?;

        if response.status().is_success() {
            let json: serde_json::Value = response.json().await
                .map_err(|e| AppError::Encryption(format!("Parse error: {}", e)))?;
            
            let policies = json
                .get("data")
                .and_then(|d| d.get("keys"))
                .and_then(|k| k.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default();
            
            Ok(policies)
        } else {
            Ok(vec![])
        }
    }

    // ==========================================
    // Token Management
    // ==========================================

    /// Create a new token
    pub async fn create_token(&self, request: &CreateTokenRequest) -> AppResult<TokenAuth> {
        let path = format!("{}/v1/auth/token/create", self.addr);

        let response = self.client
            .post(&path)
            .header("X-RustyVault-Token", &self.token)
            .json(request)
            .send()
            .await
            .map_err(|e| AppError::Encryption(format!("Vault token create error: {}", e)))?;

        if response.status().is_success() {
            let token_response: TokenResponse = response.json().await
                .map_err(|e| AppError::Encryption(format!("Parse error: {}", e)))?;
            
            token_response.auth.ok_or_else(|| {
                AppError::Encryption("No auth in token response".to_string())
            })
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            Err(AppError::Encryption(format!(
                "Failed to create token: {} - {}", status, error_text
            )))
        }
    }

    /// Lookup a token
    pub async fn lookup_token(&self, token: &str) -> AppResult<Option<TokenEntry>> {
        let path = format!("{}/v1/auth/token/lookup", self.addr);
        let data = serde_json::json!({ "token": token });

        let response = self.client
            .post(&path)
            .header("X-RustyVault-Token", &self.token)
            .json(&data)
            .send()
            .await
            .map_err(|e| AppError::Encryption(format!("Vault token lookup error: {}", e)))?;

        if response.status().is_success() {
            let json: serde_json::Value = response.json().await
                .map_err(|e| AppError::Encryption(format!("Parse error: {}", e)))?;
            
            if let Some(data) = json.get("data") {
                let entry: TokenEntry = serde_json::from_value(data.clone())
                    .map_err(|e| AppError::Encryption(format!("Parse error: {}", e)))?;
                Ok(Some(entry))
            } else {
                Ok(None)
            }
        } else if response.status() == 404 {
            Ok(None)
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            Err(AppError::Encryption(format!(
                "Failed to lookup token: {} - {}", status, error_text
            )))
        }
    }

    /// Revoke a token
    pub async fn revoke_token(&self, token: &str) -> AppResult<()> {
        let path = format!("{}/v1/auth/token/revoke", self.addr);
        let data = serde_json::json!({ "token": token });

        let response = self.client
            .post(&path)
            .header("X-RustyVault-Token", &self.token)
            .json(&data)
            .send()
            .await
            .map_err(|e| AppError::Encryption(format!("Vault token revoke error: {}", e)))?;

        if !response.status().is_success() && response.status() != 404 {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Encryption(format!(
                "Failed to revoke token: {} - {}", status, error_text
            )));
        }

        Ok(())
    }

    // ==========================================
    // Super Admin Policy Helpers
    // ==========================================

    /// Generate and create super admin policy
    pub async fn create_super_admin_policy(&self, org_id: Uuid) -> AppResult<String> {
        let policy_name = format!("super-admin-{}", org_id);
        let policy = format!(r#"
# Super Admin Policy for Organization {}
# Full access to all paths

path "secret/*" {{
    capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}}

path "secret/data/*" {{
    capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}}

path "secret/metadata/*" {{
    capabilities = ["read", "list", "delete"]
}}

path "secret/realms/{}/*" {{
    capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}}

path "auth/*" {{
    capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}}

path "sys/*" {{
    capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}}

path "sys/policies/*" {{
    capabilities = ["create", "read", "update", "delete", "list"]
}}
"#, org_id, org_id);

        self.write_policy(&policy_name, &policy).await?;
        Ok(policy_name)
    }

    /// Create a token for super admin with the super admin policy
    pub async fn create_super_admin_token(
        &self,
        user_id: Uuid,
        org_id: Uuid,
        policy_name: &str,
    ) -> AppResult<TokenAuth> {
        let mut meta = serde_json::Map::new();
        meta.insert("user_id".to_string(), serde_json::json!(user_id.to_string()));
        meta.insert("org_id".to_string(), serde_json::json!(org_id.to_string()));
        meta.insert("role".to_string(), serde_json::json!("super_admin"));

        let request = CreateTokenRequest {
            policies: Some(vec!["root".to_string(), policy_name.to_string()]),
            ttl: Some("720h".to_string()), // 30 days
            display_name: Some(format!("super-admin-{}", user_id)),
            meta: Some(meta),
            renewable: Some(true),
            num_uses: None, // Unlimited uses
        };

        self.create_token(&request).await
    }

    // ==========================================
    // Realm Management (Phase 9)
    // ==========================================

    /// Get or create a realm for an organization
    pub async fn get_or_create_realm_for_org(&self, organization_id: Uuid) -> AppResult<Uuid> {
        // First try to get existing realm
        let path = format!("{}/v1/sys/realm/organization/{}", self.addr, organization_id);
        
        let response = self.client
            .get(&path)
            .header("X-RustyVault-Token", &self.token)
            .send()
            .await
            .map_err(|e| AppError::Encryption(format!("Vault realm lookup error: {}", e)))?;

        if response.status().is_success() {
            let json: serde_json::Value = response.json().await
                .map_err(|e| AppError::Encryption(format!("Parse error: {}", e)))?;
            
            // Check if we got realms
            if let Some(realms) = json.get("data").and_then(|d| d.get("realms")).and_then(|r| r.as_array()) {
                if let Some(first_realm) = realms.first() {
                    if let Some(id_str) = first_realm.get("id").and_then(|v| v.as_str()) {
                        if let Ok(realm_id) = Uuid::parse_str(id_str) {
                            return Ok(realm_id);
                        }
                    }
                }
            }
        }

        // Create new realm for organization
        let create_path = format!("{}/v1/sys/realm", self.addr);
        let realm_name = format!("org-{}", organization_id);
        let data = serde_json::json!({
            "name": realm_name,
            "description": format!("Realm for organization {}", organization_id),
            "organization_id": organization_id.to_string()
        });

        let response = self.client
            .post(&create_path)
            .header("X-RustyVault-Token", &self.token)
            .json(&data)
            .send()
            .await
            .map_err(|e| AppError::Encryption(format!("Vault realm create error: {}", e)))?;

        if response.status().is_success() {
            let json: serde_json::Value = response.json().await
                .map_err(|e| AppError::Encryption(format!("Parse error: {}", e)))?;
            
            if let Some(id_str) = json.get("data").and_then(|d| d.get("id")).and_then(|v| v.as_str()) {
                Uuid::parse_str(id_str)
                    .map_err(|e| AppError::Encryption(format!("Invalid realm ID: {}", e)))
            } else {
                Err(AppError::Encryption("No realm ID in response".to_string()))
            }
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            Err(AppError::Encryption(format!(
                "Failed to create realm: {} - {}", status, error_text
            )))
        }
    }

    /// Create a user in a realm
    pub async fn create_realm_user(
        &self,
        realm_id: Uuid,
        username: &str,
        password: &str,
        policies: &[String],
    ) -> AppResult<()> {
        let path = format!("{}/v1/realm/{}/auth/userpass/users/{}", self.addr, realm_id, username);
        let data = serde_json::json!({
            "password": password,
            "policies": policies
        });

        let response = self.client
            .post(&path)
            .header("X-RustyVault-Token", &self.token)
            .json(&data)
            .send()
            .await
            .map_err(|e| AppError::Encryption(format!("Vault user create error: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Encryption(format!(
                "Failed to create realm user: {} - {}", status, error_text
            )));
        }

        Ok(())
    }

    /// Create a token in a realm
    pub async fn create_realm_token(
        &self,
        realm_id: Uuid,
        user_id: Uuid,
        policies: &[String],
    ) -> AppResult<String> {
        let path = format!("{}/v1/auth/token/create", self.addr);
        
        let mut meta = serde_json::Map::new();
        meta.insert("user_id".to_string(), serde_json::json!(user_id.to_string()));
        meta.insert("realm_id".to_string(), serde_json::json!(realm_id.to_string()));

        let request = CreateTokenRequest {
            policies: Some(policies.to_vec()),
            ttl: Some("24h".to_string()),
            display_name: Some(format!("user-{}-realm-{}", user_id, realm_id)),
            meta: Some(meta),
            renewable: Some(true),
            num_uses: None,
        };

        let response = self.client
            .post(&path)
            .header("X-RustyVault-Token", &self.token)
            .json(&request)
            .send()
            .await
            .map_err(|e| AppError::Encryption(format!("Vault token create error: {}", e)))?;

        if response.status().is_success() {
            let token_response: TokenResponse = response.json().await
                .map_err(|e| AppError::Encryption(format!("Parse error: {}", e)))?;
            
            token_response.auth
                .map(|auth| auth.client_token)
                .ok_or_else(|| AppError::Encryption("No auth in token response".to_string()))
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            Err(AppError::Encryption(format!(
                "Failed to create realm token: {} - {}", status, error_text
            )))
        }
    }

    /// Create a policy in a realm
    pub async fn create_realm_policy(&self, realm_id: Uuid, name: &str, policy: &str) -> AppResult<()> {
        let path = format!("{}/v1/realm/{}/sys/policies/acl/{}", self.addr, realm_id, name);
        let data = serde_json::json!({
            "policy": policy
        });

        let response = self.client
            .post(&path)
            .header("X-RustyVault-Token", &self.token)
            .json(&data)
            .send()
            .await
            .map_err(|e| AppError::Encryption(format!("Vault realm policy write error: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Encryption(format!(
                "Failed to write realm policy '{}': {} - {}", name, status, error_text
            )));
        }

        Ok(())
    }

    /// Register an application in a realm
    pub async fn register_realm_app(
        &self,
        realm_id: Uuid,
        app_name: &str,
        app_type: &str,
        display_name: Option<&str>,
        allowed_auth_methods: Option<&[String]>,
    ) -> AppResult<()> {
        let path = format!("{}/v1/realm/{}/sys/apps", self.addr, realm_id);
        let data = serde_json::json!({
            "app_name": app_name,
            "app_type": app_type,
            "display_name": display_name,
            "allowed_auth_methods": allowed_auth_methods
        });

        let response = self.client
            .post(&path)
            .header("X-RustyVault-Token", &self.token)
            .json(&data)
            .send()
            .await
            .map_err(|e| AppError::Encryption(format!("Vault app register error: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Encryption(format!(
                "Failed to register app '{}': {} - {}", app_name, status, error_text
            )));
        }

        Ok(())
    }

    /// Register default apps in a realm
    pub async fn register_default_realm_apps(&self, realm_id: Uuid) -> AppResult<()> {
        let path = format!("{}/v1/realm/{}/sys/apps/register-defaults", self.addr, realm_id);

        let response = self.client
            .post(&path)
            .header("X-RustyVault-Token", &self.token)
            .send()
            .await
            .map_err(|e| AppError::Encryption(format!("Vault app register error: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Encryption(format!(
                "Failed to register default apps: {} - {}", status, error_text
            )));
        }

        Ok(())
    }
}

// Implement base Vault trait for RustyVaultClient
#[async_trait]
impl Vault for RustyVaultClient {
    async fn store_dek(&self, entity_id: &str, entity_type: &str, encrypted_dek: &[u8]) -> AppResult<()> {
        let path = format!("{}/v1/{}/data/{}/{}", self.addr, self.mount_path, entity_type, entity_id);
        let data = serde_json::json!({
            "data": {
                "encrypted_dek": STANDARD.encode(encrypted_dek)
            }
        });
        
        let response = self.client
            .post(&path)
            .header("X-RustyVault-Token", &self.token)
            .json(&data)
            .send()
            .await
            .map_err(|e| AppError::Encryption(format!("Vault request error: {}", e)))?;
        
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Encryption(format!(
                "Failed to store DEK: {} - {}", status, error_text
            )));
        }
        
        Ok(())
    }

    async fn get_dek(&self, entity_id: &str, entity_type: &str) -> AppResult<Option<Vec<u8>>> {
        let path = format!("{}/v1/{}/data/{}/{}", self.addr, self.mount_path, entity_type, entity_id);
        
        let response = self.client
            .get(&path)
            .header("X-RustyVault-Token", &self.token)
            .send()
            .await
            .map_err(|e| AppError::Encryption(format!("Vault request error: {}", e)))?;

        if response.status().is_success() {
            let json: serde_json::Value = response.json().await
                .map_err(|e| AppError::Encryption(format!("Vault response parse error: {}", e)))?;
            
            if let Some(encrypted_dek_str) = json
                .get("data")
                .and_then(|d| d.get("data"))
                .and_then(|d| d.get("encrypted_dek"))
                .and_then(|v| v.as_str())
            {
                let dek = STANDARD.decode(encrypted_dek_str)
                    .map_err(|e| AppError::Encryption(format!("Base64 decode error: {}", e)))?;
                Ok(Some(dek))
            } else {
                Ok(None)
            }
        } else {
            Ok(None)
        }
    }

    async fn delete_dek(&self, entity_id: &str, entity_type: &str) -> AppResult<()> {
        let path = format!("{}/v1/{}/data/{}/{}", self.addr, self.mount_path, entity_type, entity_id);
        
        let response = self.client
            .delete(&path)
            .header("X-RustyVault-Token", &self.token)
            .send()
            .await
            .map_err(|e| AppError::Encryption(format!("Vault delete error: {}", e)))?;
        
        if !response.status().is_success() && response.status() != 404 {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Encryption(format!(
                "Failed to delete DEK: {} - {}", status, error_text
            )));
        }
        
        Ok(())
    }

    async fn rotate_master_key(&self, _new_master_key: &[u8]) -> AppResult<()> {
        Err(AppError::Encryption(
            "Master key rotation not yet implemented for RustyVault".to_string(),
        ))
    }

    async fn store_master_key(&self, master_key: &[u8]) -> AppResult<()> {
        let path = format!("{}/v1/{}/data/master_key", self.addr, self.mount_path);
        let data = serde_json::json!({
            "data": {
                "master_key": STANDARD.encode(master_key)
            }
        });
        
        let response = self.client
            .post(&path)
            .header("X-RustyVault-Token", &self.token)
            .json(&data)
            .send()
            .await
            .map_err(|e| AppError::Encryption(format!("Vault request error: {}", e)))?;
        
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Encryption(
                format!("Failed to store master key in vault: {} - {}", status, error_text)
            ));
        }
        
        Ok(())
    }

    async fn get_master_key(&self) -> AppResult<Option<Vec<u8>>> {
        let path = format!("{}/v1/{}/data/master_key", self.addr, self.mount_path);
        
        let response = self.client
            .get(&path)
            .header("X-RustyVault-Token", &self.token)
            .send()
            .await
            .map_err(|e| AppError::Encryption(format!("Vault request error: {}", e)))?;

        if response.status().is_success() {
            let json: serde_json::Value = response.json().await
                .map_err(|e| AppError::Encryption(format!("Vault response parse error: {}", e)))?;
            
            if let Some(master_key_str) = json
                .get("data")
                .and_then(|d| d.get("data"))
                .and_then(|d| d.get("master_key"))
                .and_then(|v| v.as_str())
            {
                let master_key = STANDARD.decode(master_key_str)
                    .map_err(|e| AppError::Encryption(format!("Base64 decode error: {}", e)))?;
                Ok(Some(master_key))
            } else {
                Ok(None)
            }
        } else if response.status() == 404 {
            Ok(None)
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            Err(AppError::Encryption(
                format!("Failed to retrieve master key from vault: {} - {}", status, error_text)
            ))
        }
    }
}

