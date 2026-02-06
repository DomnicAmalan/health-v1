/**
 * Test Data Factories
 *
 * Provides factory functions for creating test entities with realistic defaults.
 * Eliminates boilerplate in test setup.
 *
 * # Examples
 *
 * ```rust
 * use shared::testing::UserFactory;
 *
 * let user = UserFactory::build();
 * let admin = UserFactory::build_admin();
 * let custom_user = UserFactory::build_with(|u| {
 *     u.email = "custom@test.com".to_string();
 * });
 * ```
 */

use chrono::Utc;
use uuid::Uuid;
use crate::domain::entities::user::User;

/// User Factory
pub struct UserFactory;

impl UserFactory {
    /// Build a basic test user with defaults
    pub fn build() -> User {
        let timestamp = Utc::now().timestamp_millis();
        User {
            id: Uuid::new_v4(),
            email: format!("test-user-{}@example.com", timestamp),
            username: format!("testuser_{}", timestamp),
            password_hash: "$argon2id$v=19$m=19456,t=2,p=1$testpassword123$J8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3".to_string(),
            is_active: true,
            is_verified: true,
            is_super_user: false,
            organization_id: None,
            last_login: None,
            request_id: Some(format!("test-req-{}", Uuid::new_v4())),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            created_by: None,
            updated_by: None,
            system_id: Some("test-system".to_string()),
            version: 1,
        }
    }

    /// Build an admin user
    pub fn build_admin() -> User {
        let mut user = Self::build();
        user.is_super_user = true;
        user.email = format!("admin-{}@example.com", Utc::now().timestamp_millis());
        user.username = format!("admin_{}", Utc::now().timestamp_millis());
        user
    }

    /// Build with custom modifications
    pub fn build_with<F>(modifier: F) -> User
    where
        F: FnOnce(&mut User),
    {
        let mut user = Self::build();
        modifier(&mut user);
        user
    }

    /// Build with specific email
    pub fn build_with_email(email: &str) -> User {
        Self::build_with(|u| {
            u.email = email.to_string();
        })
    }

    /// Build with specific organization
    pub fn build_with_organization(org_id: Uuid) -> User {
        Self::build_with(|u| {
            u.organization_id = Some(org_id);
        })
    }

    /// Build unverified user
    pub fn build_unverified() -> User {
        Self::build_with(|u| {
            u.is_verified = false;
        })
    }

    /// Build inactive user
    pub fn build_inactive() -> User {
        Self::build_with(|u| {
            u.is_active = false;
        })
    }

    /// Build multiple users at once
    pub fn build_many(count: usize) -> Vec<User> {
        (0..count).map(|i| {
            Self::build_with(|u| {
                u.email = format!("test-user-{}@example.com", i);
                u.username = format!("testuser_{}", i);
            })
        }).collect()
    }
}

/// Parse test organization ID
pub fn test_org_id() -> Uuid {
    use crate::testing::fixtures::TEST_ORG_ID;
    Uuid::parse_str(TEST_ORG_ID).expect("Invalid test org ID")
}

/// Generate a test UUID with prefix
pub fn test_uuid(prefix: &str) -> Uuid {
    let timestamp = Utc::now().timestamp_millis();
    // Create a deterministic but unique UUID for testing
    let uuid_str = format!("{:08x}-0000-4000-8000-{:012x}",
        prefix.bytes().fold(0u32, |acc, b| acc.wrapping_add(b as u32)),
        timestamp
    );
    Uuid::parse_str(&uuid_str).unwrap_or_else(|_| Uuid::new_v4())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_factory_build() {
        let user = UserFactory::build();
        assert!(user.email.contains("@example.com"));
        assert!(user.is_active);
        assert!(user.is_verified);
        assert!(!user.is_super_user);
    }

    #[test]
    fn test_user_factory_build_admin() {
        let admin = UserFactory::build_admin();
        assert!(admin.is_super_user);
        assert!(admin.email.contains("admin"));
    }

    #[test]
    fn test_user_factory_build_with() {
        let user = UserFactory::build_with(|u| {
            u.email = "custom@test.com".to_string();
        });
        assert_eq!(user.email, "custom@test.com");
    }

    #[test]
    fn test_user_factory_build_many() {
        let users = UserFactory::build_many(5);
        assert_eq!(users.len(), 5);
        // Ensure emails are unique
        let emails: Vec<String> = users.iter().map(|u| u.email.clone()).collect();
        let unique_emails: std::collections::HashSet<String> = emails.into_iter().collect();
        assert_eq!(unique_emails.len(), 5);
    }
}
