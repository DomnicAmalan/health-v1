//! Request structure for vault operations

use serde_json::{Map, Value};
use std::collections::HashMap;
use uuid::Uuid;

/// Logical request for vault operations
#[derive(Debug, Clone, Default)]
pub struct Request {
    pub id: String,
    pub operation: Operation,
    pub path: String,
    pub client_token: String,
    pub data: Option<Map<String, Value>>,
    pub headers: HashMap<String, String>,
    /// Realm ID for multi-tenancy support
    pub realm_id: Option<Uuid>,
}

impl Default for Operation {
    fn default() -> Self {
        Operation::Read
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Operation {
    Read,
    Write,
    Delete,
    List,
}

impl From<&str> for Operation {
    fn from(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "GET" | "READ" => Operation::Read,
            "POST" | "PUT" | "WRITE" => Operation::Write,
            "DELETE" => Operation::Delete,
            "LIST" => Operation::List,
            _ => Operation::Read,
        }
    }
}

impl Request {
    pub fn new_read_request(path: impl Into<String>) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            operation: Operation::Read,
            path: path.into(),
            client_token: String::new(),
            data: None,
            headers: HashMap::new(),
            realm_id: None,
        }
    }

    pub fn new_write_request(path: impl Into<String>, data: Option<Map<String, Value>>) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            operation: Operation::Write,
            path: path.into(),
            client_token: String::new(),
            data,
            headers: HashMap::new(),
            realm_id: None,
        }
    }

    pub fn new_delete_request(path: impl Into<String>, data: Option<Map<String, Value>>) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            operation: Operation::Delete,
            path: path.into(),
            client_token: String::new(),
            data,
            headers: HashMap::new(),
            realm_id: None,
        }
    }

    pub fn new_list_request(path: impl Into<String>) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            operation: Operation::List,
            path: path.into(),
            client_token: String::new(),
            data: None,
            headers: HashMap::new(),
            realm_id: None,
        }
    }

    /// Create a request with realm context
    pub fn with_realm(mut self, realm_id: Option<Uuid>) -> Self {
        self.realm_id = realm_id;
        self
    }

    /// Set the realm ID
    pub fn set_realm_id(&mut self, realm_id: Option<Uuid>) {
        self.realm_id = realm_id;
    }

    /// Get the realm ID
    pub fn get_realm_id(&self) -> Option<Uuid> {
        self.realm_id
    }
}

/// Context for realm-scoped operations
#[derive(Debug, Clone, Default)]
pub struct RealmContext {
    /// The realm ID extracted from the request path
    pub realm_id: Option<Uuid>,
    /// The original path without realm prefix
    pub stripped_path: String,
    /// Whether this is a realm-scoped request
    pub is_realm_scoped: bool,
}

impl RealmContext {
    /// Extract realm context from a request path
    /// Patterns:
    /// - /v1/realm/{realm_id}/... -> realm-scoped
    /// - /v1/... -> global
    pub fn from_path(path: &str) -> Self {
        // Try to match /v1/realm/{uuid}/...
        let parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
        
        // Look for pattern: v1/realm/{uuid}/...
        if parts.len() >= 3 && parts[0] == "v1" && parts[1] == "realm" {
            if let Ok(realm_id) = Uuid::parse_str(parts[2]) {
                // Remove /v1/realm/{uuid} prefix and join remaining parts
                let remaining_path = if parts.len() > 3 {
                    format!("/v1/{}", parts[3..].join("/"))
                } else {
                    "/v1".to_string()
                };
                
                return Self {
                    realm_id: Some(realm_id),
                    stripped_path: remaining_path,
                    is_realm_scoped: true,
                };
            }
        }
        
        // Not a realm-scoped request
        Self {
            realm_id: None,
            stripped_path: path.to_string(),
            is_realm_scoped: false,
        }
    }

    /// Create a global context (no realm)
    pub fn global() -> Self {
        Self {
            realm_id: None,
            stripped_path: String::new(),
            is_realm_scoped: false,
        }
    }

    /// Create a realm-scoped context
    pub fn for_realm(realm_id: Uuid, path: &str) -> Self {
        Self {
            realm_id: Some(realm_id),
            stripped_path: path.to_string(),
            is_realm_scoped: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_realm_context_from_path_global() {
        let ctx = RealmContext::from_path("/v1/secret/foo");
        assert!(ctx.realm_id.is_none());
        assert!(!ctx.is_realm_scoped);
        assert_eq!(ctx.stripped_path, "/v1/secret/foo");
    }

    #[test]
    fn test_realm_context_from_path_realm_scoped() {
        let realm_id = Uuid::new_v4();
        let path = format!("/v1/realm/{}/secret/foo", realm_id);
        
        let ctx = RealmContext::from_path(&path);
        assert_eq!(ctx.realm_id, Some(realm_id));
        assert!(ctx.is_realm_scoped);
        assert_eq!(ctx.stripped_path, "/v1/secret/foo");
    }

    #[test]
    fn test_realm_context_from_path_invalid_uuid() {
        let ctx = RealmContext::from_path("/v1/realm/not-a-uuid/secret/foo");
        assert!(ctx.realm_id.is_none());
        assert!(!ctx.is_realm_scoped);
    }

    #[test]
    fn test_request_with_realm() {
        let realm_id = Uuid::new_v4();
        let request = Request::new_read_request("secret/foo")
            .with_realm(Some(realm_id));
        
        assert_eq!(request.realm_id, Some(realm_id));
    }
}
