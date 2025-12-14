//! Temporary key storage service for initialization credentials
//!
//! Stores unseal keys and root tokens temporarily with secure download tokens.
//! Keys are stored in memory only and automatically expire after a set time.

use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, SystemTime},
};
use tokio::sync::Mutex;
use uuid::Uuid;

/// Stored keys entry
#[derive(Clone, Debug)]
pub struct StoredKeys {
    pub keys_base64: Vec<String>,
    pub root_token: String,
    pub secret_shares: u8,
    pub secret_threshold: u8,
    pub expires_at: SystemTime,
    pub single_use: bool,
    pub used: bool,
}

impl StoredKeys {
    pub fn is_expired(&self) -> bool {
        SystemTime::now() > self.expires_at
    }

    pub fn can_use(&self) -> bool {
        !self.is_expired() && (!self.single_use || !self.used)
    }
}

/// Temporary key storage service
pub struct KeyStorage {
    keys: Arc<Mutex<HashMap<String, StoredKeys>>>,
}

impl KeyStorage {
    pub fn new() -> Self {
        let storage = Self {
            keys: Arc::new(Mutex::new(HashMap::new())),
        };
        
        // Start background cleanup task
        storage.start_cleanup_task();
        
        storage
    }

    /// Generate a secure download token
    pub fn generate_token() -> String {
        // Use UUID v4 for secure random token
        Uuid::new_v4().to_string()
    }

    /// Store keys with a download token
    pub async fn store_keys(
        &self,
        keys_base64: Vec<String>,
        root_token: String,
        secret_shares: u8,
        secret_threshold: u8,
        expiration_hours: u64,
        single_use: bool,
    ) -> String {
        let token = Self::generate_token();
        let expires_at = SystemTime::now() + Duration::from_secs(expiration_hours * 3600);

        let stored = StoredKeys {
            keys_base64,
            root_token,
            secret_shares,
            secret_threshold,
            expires_at,
            single_use,
            used: false,
        };

        let mut keys = self.keys.lock().await;
        keys.insert(token.clone(), stored);
        token
    }

    /// Retrieve keys by token (marks as used if single-use)
    pub async fn get_keys(&self, token: &str) -> Option<StoredKeys> {
        let mut keys = self.keys.lock().await;
        
        if let Some(mut stored) = keys.get(token).cloned() {
            if !stored.can_use() {
                keys.remove(token);
                return None;
            }

            if stored.single_use {
                stored.used = true;
                keys.insert(token.to_string(), stored.clone());
            }

            Some(stored)
        } else {
            None
        }
    }

    /// Remove a token (after use or expiration)
    pub async fn remove_token(&self, token: &str) {
        let mut keys = self.keys.lock().await;
        keys.remove(token);
    }

    /// Clean up expired entries
    pub async fn cleanup_expired(&self) {
        let mut keys = self.keys.lock().await;
        keys.retain(|_, stored| !stored.is_expired());
    }

    /// Start background cleanup task
    fn start_cleanup_task(&self) {
        let keys = self.keys.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(300)); // Every 5 minutes
            loop {
                interval.tick().await;
                let mut keys_guard = keys.lock().await;
                keys_guard.retain(|_, stored| !stored.is_expired());
            }
        });
    }
}

impl Default for KeyStorage {
    fn default() -> Self {
        Self::new()
    }
}

