/**
 * Test Helper Functions
 *
 * Utilities for test database setup, cleanup, and common operations.
 *
 * # Examples
 *
 * ```rust
 * use shared::testing::helpers::{create_test_pool, cleanup_database};
 *
 * #[tokio::test]
 * async fn test_example() {
 *     let pool = create_test_pool().await;
 *     cleanup_database(&pool).await;
 *     // ... test implementation
 * }
 * ```
 */

use sqlx::{PgPool, Postgres, Transaction};
use std::env;

/// Get test database URL from environment or use default
pub fn test_database_url() -> String {
    env::var("TEST_DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://test_user:test_password@localhost:5433/vault_test_db".to_string())
}

/// Create a test database pool with optimized settings
///
/// # Examples
///
/// ```rust
/// let pool = create_test_pool().await;
/// ```
pub async fn create_test_pool() -> PgPool {
    let db_url = test_database_url();

    PgPool::connect(&db_url)
        .await
        .expect("Failed to connect to test database. Make sure the test database is running.")
}

/// Run migrations on test database
///
/// Note: Uses sqlx CLI or script to run migrations since the macro
/// requires the migrations directory at compile time.
///
/// # Examples
///
/// ```rust
/// // Run from project root: make db-migrate-test
/// let pool = create_test_pool().await;
/// run_migrations(&pool).await;
/// ```
pub async fn run_migrations(_pool: &PgPool) {
    // Migrations should be run via CLI before tests:
    //   sqlx migrate run --database-url=$TEST_DATABASE_URL
    // Or via make target:
    //   make db-migrate-test
    //
    // The sqlx::migrate! macro requires migrations at compile time,
    // but they live in the workspace root's migrations folder.
    // This function is kept for API compatibility.
}

/// Clean all test data from database (preserves schema)
///
/// Truncates tables in correct order to respect foreign key constraints.
///
/// # Examples
///
/// ```rust
/// cleanup_database(&pool).await;
/// ```
pub async fn cleanup_database(pool: &PgPool) {
    let tables = vec![
        // Dependent tables first (tables with foreign keys)
        "audit_logs",
        "sessions",
        "refresh_tokens",
        "user_roles",
        "role_permissions",
        "passkey_credentials",
        "relationships",
        "request_logs",
        "policy_assignments",
        "user_provisioning_checklists",

        // Base tables
        "users",
        "roles",
        "permissions",
        "groups",
        "policy_templates",
        "modules",

        // Organization tables
        "organizations",
    ];

    for table in tables {
        let query = format!("TRUNCATE TABLE {} RESTART IDENTITY CASCADE", table);
        if let Err(e) = sqlx::query(&query).execute(pool).await {
            eprintln!("Warning: Failed to truncate table {}: {}", table, e);
            // Continue with other tables even if one fails
        }
    }
}

/// Begin a test transaction for isolated testing
///
/// The transaction can be rolled back to avoid test interference.
///
/// # Examples
///
/// ```rust
/// let mut tx = test_transaction(&pool).await;
/// // ... perform operations on tx
/// tx.rollback().await.unwrap(); // Cleanup
/// ```
pub async fn test_transaction(pool: &PgPool) -> Transaction<'static, Postgres> {
    pool.begin()
        .await
        .expect("Failed to begin test transaction")
}

/// Check if test database is accessible
///
/// # Examples
///
/// ```rust
/// if !is_test_db_available().await {
///     panic!("Test database not available");
/// }
/// ```
pub async fn is_test_db_available() -> bool {
    let db_url = test_database_url();
    PgPool::connect(&db_url).await.is_ok()
}

/// Setup test database with seed data
///
/// This is a convenience function that:
/// 1. Creates pool
/// 2. Optionally seeds data
///
/// Note: Run migrations before calling this via `make db-migrate-test`
///
/// # Examples
///
/// ```rust
/// let pool = setup_test_database(true).await;
/// ```
pub async fn setup_test_database(seed: bool) -> PgPool {
    let pool = create_test_pool().await;

    if seed {
        // Run seed scripts
        seed_test_data(&pool).await;
    }

    pool
}

/// Seed test database with fixtures
///
/// Loads test users, organizations, and other seed data.
///
/// # Examples
///
/// ```rust
/// seed_test_data(&pool).await;
/// ```
pub async fn seed_test_data(pool: &PgPool) {
    use crate::testing::fixtures::*;

    // Insert test organization
    let org_id = *TEST_ORG_UUID;
    sqlx::query!(
        r#"
        INSERT INTO organizations (id, name, slug, domain, settings, created_at, updated_at)
        VALUES ($1, 'Test Medical Center', 'test-medical-center', 'test.example.com', '{}'::jsonb, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
        "#,
        org_id
    )
    .execute(pool)
    .await
    .expect("Failed to seed test organization");

    // Note: User seeding should be done via SQL scripts to ensure
    // password hashing is consistent. See migrations/seeds/test_users.sql
}

/// Create a test pool and cleanup before tests
///
/// Convenience function for common test setup pattern.
///
/// # Examples
///
/// ```rust
/// let pool = setup_clean_test_db().await;
/// ```
pub async fn setup_clean_test_db() -> PgPool {
    let pool = create_test_pool().await;
    cleanup_database(&pool).await;
    pool
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_database_url_returns_value() {
        let url = test_database_url();
        assert!(url.contains("postgresql://"));
    }

    #[tokio::test]
    #[ignore] // Requires test database to be running
    async fn test_create_test_pool() {
        let pool = create_test_pool().await;
        assert!(pool.size() > 0);
    }

    #[tokio::test]
    #[ignore] // Requires test database to be running
    async fn test_cleanup_database() {
        let pool = create_test_pool().await;
        cleanup_database(&pool).await;
        // Should not panic
    }
}
