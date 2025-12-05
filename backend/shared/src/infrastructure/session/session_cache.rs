use crate::domain::entities::Session;
use chrono::Utc;
use lru::LruCache;
use std::num::NonZeroUsize;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

/// In-memory cache for active sessions
/// Provides fast access to session data without hitting the database
/// Uses LRU eviction to limit memory usage
pub struct SessionCache {
    sessions: Arc<Mutex<LruCache<String, Session>>>,
    max_entries: usize,
}

impl SessionCache {
    pub fn new() -> Self {
        Self::with_max_entries(1000)
    }

    pub fn with_max_entries(max_entries: usize) -> Self {
        let capacity = NonZeroUsize::new(max_entries.max(1)).unwrap();
        Self {
            sessions: Arc::new(Mutex::new(LruCache::new(capacity))),
            max_entries,
        }
    }

    /// Get session from cache by token
    /// This promotes the entry to most recently used
    pub fn get(&self, token: &str) -> Option<Session> {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.get(token).cloned()
    }

    /// Store session in cache
    /// Automatically evicts least recently used entries when at capacity
    pub fn set(&self, token: &str, session: Session) {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.put(token.to_string(), session);
    }

    /// Remove session from cache
    pub fn remove(&self, token: &str) {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.pop(token);
    }

    /// Remove session by ID (requires iterating through cache)
    pub fn remove_by_id(&self, id: Uuid) {
        let mut sessions = self.sessions.lock().unwrap();
        // LruCache doesn't have retain, so we need to collect keys to remove
        let keys_to_remove: Vec<String> = sessions
            .iter()
            .filter(|(_, session)| session.id == id)
            .map(|(key, _)| key.clone())
            .collect();
        for key in keys_to_remove {
            sessions.pop(&key);
        }
    }

    /// Clean up expired sessions from cache
    pub fn cleanup_expired(&self) -> usize {
        let mut sessions = self.sessions.lock().unwrap();
        let now = Utc::now();
        let initial_size = sessions.len();
        // LruCache doesn't have retain, so we need to collect keys to remove
        let keys_to_remove: Vec<String> = sessions
            .iter()
            .filter(|(_, session)| {
                !(session.is_active && !session.is_expired() && session.expires_at > now)
            })
            .map(|(key, _)| key.clone())
            .collect();
        for key in keys_to_remove {
            sessions.pop(&key);
        }
        initial_size - sessions.len()
    }

    /// Get all active sessions (for debugging/admin purposes)
    pub fn get_all(&self) -> Vec<Session> {
        let sessions = self.sessions.lock().unwrap();
        sessions.iter().map(|(_, v)| v.clone()).collect()
    }

    /// Get current cache size
    pub fn len(&self) -> usize {
        let sessions = self.sessions.lock().unwrap();
        sessions.len()
    }

    /// Get max entries limit
    pub fn max_entries(&self) -> usize {
        self.max_entries
    }

    /// Clear all sessions from cache
    pub fn clear(&self) {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.clear();
    }
}

impl Default for SessionCache {
    fn default() -> Self {
        Self::new()
    }
}

