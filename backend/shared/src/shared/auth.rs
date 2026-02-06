// Authentication and Authorization Types
// User context and authentication state

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Authenticated user context
/// This is extracted from JWT tokens and provided to handlers via Extension
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: Option<String>,
    pub full_name: String,
    pub organization_id: Uuid,
    pub role: String,
    pub permissions: Vec<String>,
}

impl User {
    pub fn new(
        id: Uuid,
        username: String,
        email: Option<String>,
        full_name: String,
        organization_id: Uuid,
        role: String,
        permissions: Vec<String>,
    ) -> Self {
        Self {
            id,
            username,
            email,
            full_name,
            organization_id,
            role,
            permissions,
        }
    }

    pub fn has_permission(&self, permission: &str) -> bool {
        self.permissions.iter().any(|p| p == permission)
    }

    pub fn has_role(&self, role: &str) -> bool {
        self.role == role
    }
}
