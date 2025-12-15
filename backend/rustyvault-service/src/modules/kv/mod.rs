//! KV (Key-Value) secrets engine module
//!
//! KV2 implementation for versioned key-value storage
//! 
//! Supports both global secrets and realm-scoped secrets.
//! Realm-scoped secrets are stored under `realm-{realm_id}/` prefix.

use std::sync::Arc;
use async_trait::async_trait;
use serde_json::{Map, Value};
use uuid::Uuid;
use crate::errors::VaultResult;
use crate::logical::{Backend, Request, Response, Operation};
use crate::storage::StorageBackend;

/// KV secrets engine backend
pub struct KvBackend {
    storage: Arc<dyn StorageBackend>,
    mount_path: String,
}

impl KvBackend {
    pub fn new(storage: Arc<dyn StorageBackend>, mount_path: String) -> Self {
        Self {
            storage,
            mount_path,
        }
    }

    // ==========================================
    // Path Generation (Realm-Aware)
    // ==========================================

    /// Generate storage path for secret data
    /// If realm_id is provided, secrets are stored under realm-{realm_id}/
    fn storage_path(&self, key: &str, realm_id: Option<Uuid>) -> String {
        match realm_id {
            Some(rid) => format!("{}/realm-{}/data/{}", self.mount_path, rid, key),
            None => format!("{}/data/{}", self.mount_path, key),
        }
    }

    /// Generate storage path for secret metadata
    fn metadata_path(&self, key: &str, realm_id: Option<Uuid>) -> String {
        match realm_id {
            Some(rid) => format!("{}/realm-{}/metadata/{}", self.mount_path, rid, key),
            None => format!("{}/metadata/{}", self.mount_path, key),
        }
    }

    /// Generate list path prefix
    fn list_path_prefix(&self, realm_id: Option<Uuid>) -> String {
        match realm_id {
            Some(rid) => format!("{}/realm-{}/data/", self.mount_path, rid),
            None => format!("{}/data/", self.mount_path),
        }
    }

    // ==========================================
    // Secret Operations (Realm-Aware)
    // ==========================================

    async fn read_secret(&self, key: &str, realm_id: Option<Uuid>) -> VaultResult<Option<Response>> {
        let data_path = self.storage_path(key, realm_id);
        let data = self.storage.get(&data_path).await?;
        
        if data.is_none() {
            return Ok(None);
        }

        let value: Map<String, Value> = serde_json::from_slice(&data.unwrap())
            .map_err(|e| crate::errors::VaultError::Serialization(e))?;

        // Add realm context to response if present
        let mut response_data = value;
        if let Some(rid) = realm_id {
            response_data.insert("realm_id".to_string(), Value::String(rid.to_string()));
        }

        Ok(Some(Response::new().data(response_data)))
    }

    async fn write_secret(&self, key: &str, data: Map<String, Value>, realm_id: Option<Uuid>) -> VaultResult<Option<Response>> {
        let data_path = self.storage_path(key, realm_id);
        let metadata_path = self.metadata_path(key, realm_id);

        // Get existing version
        let version = if let Some(meta_data) = self.storage.get(&metadata_path).await? {
            let meta: Map<String, Value> = serde_json::from_slice(&meta_data)
                .map_err(|e| crate::errors::VaultError::Serialization(e))?;
            meta.get("current_version")
                .and_then(|v| v.as_u64())
                .unwrap_or(0) + 1
        } else {
            1
        };

        // Store data with version
        let mut versioned_data = Map::new();
        versioned_data.insert("data".to_string(), Value::Object(data.clone()));
        versioned_data.insert("version".to_string(), Value::Number(version.into()));
        if let Some(rid) = realm_id {
            versioned_data.insert("realm_id".to_string(), Value::String(rid.to_string()));
        }

        let data_json = serde_json::to_vec(&versioned_data)
            .map_err(|e| crate::errors::VaultError::Serialization(e))?;
        self.storage.put(&data_path, &data_json).await?;

        // Update metadata
        let mut metadata = Map::new();
        metadata.insert("current_version".to_string(), Value::Number(version.into()));
        metadata.insert("created_time".to_string(), Value::String(chrono::Utc::now().to_rfc3339()));
        if let Some(rid) = realm_id {
            metadata.insert("realm_id".to_string(), Value::String(rid.to_string()));
        }
        
        let meta_json = serde_json::to_vec(&metadata)
            .map_err(|e| crate::errors::VaultError::Serialization(e))?;
        self.storage.put(&metadata_path, &meta_json).await?;

        // Build response with realm context
        let mut response_data = data;
        if let Some(rid) = realm_id {
            response_data.insert("realm_id".to_string(), Value::String(rid.to_string()));
        }

        Ok(Some(Response::new().data(response_data)))
    }

    async fn delete_secret(&self, key: &str, realm_id: Option<Uuid>) -> VaultResult<Option<Response>> {
        let metadata_path = self.metadata_path(key, realm_id);

        // Mark as deleted in metadata instead of actually deleting
        if let Some(meta_data) = self.storage.get(&metadata_path).await? {
            let mut meta: Map<String, Value> = serde_json::from_slice(&meta_data)
                .map_err(|e| crate::errors::VaultError::Serialization(e))?;
            meta.insert("deleted".to_string(), Value::Bool(true));
            meta.insert("deletion_time".to_string(), Value::String(chrono::Utc::now().to_rfc3339()));
            
            let meta_json = serde_json::to_vec(&meta)
                .map_err(|e| crate::errors::VaultError::Serialization(e))?;
            self.storage.put(&metadata_path, &meta_json).await?;
        }

        Ok(None)
    }

    async fn list_secrets(&self, prefix: &str, realm_id: Option<Uuid>) -> VaultResult<Option<Response>> {
        let list_prefix = self.list_path_prefix(realm_id);
        let list_path = format!("{}{}", list_prefix, prefix);
        let keys = self.storage.list(&list_path).await?;
        
        // Extract just the key names, removing the realm prefix if present
        let key_names: Vec<String> = keys.iter()
            .filter_map(|k| {
                k.strip_prefix(&list_prefix)
                    .map(|s| s.to_string())
            })
            .collect();

        let mut data = Map::new();
        data.insert("keys".to_string(), Value::Array(
            key_names.iter().map(|k| Value::String(k.clone())).collect()
        ));
        if let Some(rid) = realm_id {
            data.insert("realm_id".to_string(), Value::String(rid.to_string()));
        }

        Ok(Some(Response::new().data(data)))
    }

    // ==========================================
    // Public Realm-Scoped API
    // ==========================================

    /// Read a secret from a specific realm
    pub async fn read_realm_secret(&self, realm_id: Uuid, key: &str) -> VaultResult<Option<Response>> {
        self.read_secret(key, Some(realm_id)).await
    }

    /// Write a secret to a specific realm
    pub async fn write_realm_secret(&self, realm_id: Uuid, key: &str, data: Map<String, Value>) -> VaultResult<Option<Response>> {
        self.write_secret(key, data, Some(realm_id)).await
    }

    /// Delete a secret from a specific realm
    pub async fn delete_realm_secret(&self, realm_id: Uuid, key: &str) -> VaultResult<Option<Response>> {
        self.delete_secret(key, Some(realm_id)).await
    }

    /// List secrets in a specific realm
    pub async fn list_realm_secrets(&self, realm_id: Uuid, prefix: &str) -> VaultResult<Option<Response>> {
        self.list_secrets(prefix, Some(realm_id)).await
    }
}

#[async_trait]
impl Backend for KvBackend {
    async fn handle_request(&self, req: &mut Request) -> VaultResult<Option<Response>> {
        // Extract realm_id from request (set by middleware or handlers)
        let realm_id = req.realm_id;

        // Remove mount path from request path
        let key = req.path.strip_prefix(&format!("{}/", self.mount_path))
            .unwrap_or(&req.path)
            .to_string();

        // For realm-scoped requests, also strip the realm prefix from the key
        // This handles paths like /v1/realm/{realm_id}/secret/path/to/key
        let key = if realm_id.is_some() {
            // Remove potential "data/" prefix as well
            key.strip_prefix("data/")
                .unwrap_or(&key)
                .to_string()
        } else {
            key
        };

        match req.operation {
            Operation::Read => self.read_secret(&key, realm_id).await,
            Operation::Write => {
                let data = req.data.take();
                self.write_secret(&key, data.unwrap_or_default(), realm_id).await
            }
            Operation::Delete => self.delete_secret(&key, realm_id).await,
            Operation::List => self.list_secrets(&key, realm_id).await,
        }
    }
}

