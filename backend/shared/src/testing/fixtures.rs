/**
 * Test Fixtures
 *
 * Predefined test data with well-known IDs for integration testing.
 * These fixtures correspond to the SQL seed data.
 *
 * # Examples
 *
 * ```rust
 * use shared::testing::fixtures::{TEST_ADMIN_ID, TEST_DOCTOR_ID};
 *
 * let admin_id = Uuid::parse_str(TEST_ADMIN_ID).unwrap();
 * ```
 */

use uuid::Uuid;
use once_cell::sync::Lazy;

/// Well-known test user IDs (matches seed data)
pub const TEST_ADMIN_ID: &str = "00000000-0000-0000-0000-000000000001";
pub const TEST_DOCTOR_ID: &str = "00000000-0000-0000-0000-000000000002";
pub const TEST_NURSE_ID: &str = "00000000-0000-0000-0000-000000000003";
pub const TEST_RECEPTIONIST_ID: &str = "00000000-0000-0000-0000-000000000004";
pub const TEST_PATIENT_ID: &str = "00000000-0000-0000-0000-000000000005";

/// Well-known test organization ID
pub const TEST_ORG_ID: &str = "00000000-0000-0000-0000-000000000100";

/// Test user credentials (matches seed data)
pub const TEST_PASSWORD: &str = "testpassword123";

/// Parsed test admin UUID
pub static TEST_ADMIN_UUID: Lazy<Uuid> =
    Lazy::new(|| Uuid::parse_str(TEST_ADMIN_ID).expect("Invalid test admin ID"));

/// Parsed test doctor UUID
pub static TEST_DOCTOR_UUID: Lazy<Uuid> =
    Lazy::new(|| Uuid::parse_str(TEST_DOCTOR_ID).expect("Invalid test doctor ID"));

/// Parsed test nurse UUID
pub static TEST_NURSE_UUID: Lazy<Uuid> =
    Lazy::new(|| Uuid::parse_str(TEST_NURSE_ID).expect("Invalid test nurse ID"));

/// Parsed test receptionist UUID
pub static TEST_RECEPTIONIST_UUID: Lazy<Uuid> =
    Lazy::new(|| Uuid::parse_str(TEST_RECEPTIONIST_ID).expect("Invalid test receptionist ID"));

/// Parsed test patient UUID
pub static TEST_PATIENT_UUID: Lazy<Uuid> =
    Lazy::new(|| Uuid::parse_str(TEST_PATIENT_ID).expect("Invalid test patient ID"));

/// Parsed test organization UUID
pub static TEST_ORG_UUID: Lazy<Uuid> =
    Lazy::new(|| Uuid::parse_str(TEST_ORG_ID).expect("Invalid test org ID"));

/// Test user emails (matches seed data)
pub mod test_emails {
    pub const ADMIN: &str = "admin@test.com";
    pub const DOCTOR: &str = "doctor@test.com";
    pub const NURSE: &str = "nurse@test.com";
    pub const RECEPTIONIST: &str = "receptionist@test.com";
    pub const PATIENT: &str = "patient@test.com";
}

/// Test user usernames (matches seed data)
pub mod test_usernames {
    pub const ADMIN: &str = "admin";
    pub const DOCTOR: &str = "dr_smith";
    pub const NURSE: &str = "nurse_jones";
    pub const RECEPTIONIST: &str = "receptionist_brown";
    pub const PATIENT: &str = "patient_john";
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fixtures_parse_correctly() {
        assert_eq!(*TEST_ADMIN_UUID, Uuid::parse_str(TEST_ADMIN_ID).unwrap());
        assert_eq!(*TEST_DOCTOR_UUID, Uuid::parse_str(TEST_DOCTOR_ID).unwrap());
        assert_eq!(*TEST_ORG_UUID, Uuid::parse_str(TEST_ORG_ID).unwrap());
    }

    #[test]
    fn test_credentials_defined() {
        assert!(!TEST_PASSWORD.is_empty());
        assert_eq!(TEST_PASSWORD, "testpassword123");
    }
}
