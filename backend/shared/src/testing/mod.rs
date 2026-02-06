/**
 * Testing Utilities Module
 *
 * Provides test helpers, factories, and fixtures for backend testing.
 * Use these utilities to create consistent test data and setup.
 *
 * # Examples
 *
 * ```rust
 * use shared::testing::{UserFactory, create_test_pool, setup_test_db};
 *
 * #[tokio::test]
 * async fn test_user_creation() {
 *     let pool = create_test_pool().await;
 *     let user = UserFactory::build();
 *     // ... test implementation
 * }
 * ```
 */

pub mod factories;
pub mod fixtures;
pub mod helpers;

// Re-export commonly used test utilities
pub use factories::*;
pub use fixtures::*;
pub use helpers::*;
