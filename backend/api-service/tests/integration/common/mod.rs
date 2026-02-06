/**
 * Common Integration Test Utilities
 *
 * Provides shared setup, teardown, and helper functions for API service integration tests.
 */

use axum::Router;
use sqlx::PgPool;
use std::sync::Arc;
use tower::ServiceExt;

/// Test application state
pub struct TestApp {
    pub pool: PgPool,
    pub router: Router,
}

/// Setup test application
///
/// Creates a test database pool, runs migrations, seeds data, and returns configured app.
///
/// # Examples
///
/// ```rust
/// #[tokio::test]
/// async fn test_endpoint() {
///     let app = setup_test_app().await;
///     // ... test implementation
/// }
/// ```
pub async fn setup_test_app() -> TestApp {
    // Create test database pool
    let pool = shared::testing::create_test_pool().await;

    // Run migrations
    shared::testing::run_migrations(&pool).await;

    // Seed test data
    shared::testing::seed_test_data(&pool).await;

    // Create application router
    // Note: Adjust this based on your actual app creation logic
    let router = create_test_router(pool.clone()).await;

    TestApp { pool, router }
}

/// Create test router with all routes
///
/// Note: This is a placeholder - adjust based on your actual API service structure
async fn create_test_router(pool: PgPool) -> Router {
    // TODO: Import and use your actual app creation function
    // Example:
    // api_service::create_app(pool).await

    Router::new()
        // Add routes here
}

/// Cleanup test data after tests
///
/// # Examples
///
/// ```rust
/// #[tokio::test]
/// async fn test_example() {
///     let app = setup_test_app().await;
///     // ... test implementation
///     teardown_test_app(&app).await;
/// }
/// ```
pub async fn teardown_test_app(app: &TestApp) {
    shared::testing::cleanup_database(&app.pool).await;
}

/// Make a test request to the app
///
/// Helper function to simplify making requests in tests.
///
/// # Examples
///
/// ```rust
/// let response = make_request(
///     &app,
///     Method::GET,
///     "/api/v1/users",
///     None::<()>
/// ).await;
/// ```
pub async fn make_request<T: serde::Serialize>(
    app: &TestApp,
    method: axum::http::Method,
    uri: &str,
    body: Option<T>,
) -> axum::http::Response<axum::body::Body> {
    use axum::http::Request;

    let mut request_builder = Request::builder()
        .method(method)
        .uri(uri)
        .header("Content-Type", "application/json");

    let request = if let Some(body) = body {
        let json = serde_json::to_string(&body).expect("Failed to serialize request body");
        request_builder
            .body(axum::body::Body::from(json))
            .expect("Failed to build request")
    } else {
        request_builder
            .body(axum::body::Body::empty())
            .expect("Failed to build request")
    };

    app.router
        .clone()
        .oneshot(request)
        .await
        .expect("Failed to execute request")
}

/// Make an authenticated request
///
/// Adds authorization header with test token.
///
/// # Examples
///
/// ```rust
/// let response = make_authenticated_request(
///     &app,
///     Method::GET,
///     "/api/v1/me",
///     "test_token",
///     None::<()>
/// ).await;
/// ```
pub async fn make_authenticated_request<T: serde::Serialize>(
    app: &TestApp,
    method: axum::http::Method,
    uri: &str,
    token: &str,
    body: Option<T>,
) -> axum::http::Response<axum::body::Body> {
    use axum::http::Request;

    let mut request_builder = Request::builder()
        .method(method)
        .uri(uri)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", token));

    let request = if let Some(body) = body {
        let json = serde_json::to_string(&body).expect("Failed to serialize request body");
        request_builder
            .body(axum::body::Body::from(json))
            .expect("Failed to build request")
    } else {
        request_builder
            .body(axum::body::Body::empty())
            .expect("Failed to build request")
    };

    app.router
        .clone()
        .oneshot(request)
        .await
        .expect("Failed to execute request")
}

/// Extract JSON response body
///
/// # Examples
///
/// ```rust
/// let response = make_request(&app, Method::GET, "/api/v1/users", None::<()>).await;
/// let users: Vec<User> = extract_json_body(response).await;
/// ```
pub async fn extract_json_body<T: serde::de::DeserializeOwned>(
    response: axum::http::Response<axum::body::Body>,
) -> T {
    use axum::body::to_bytes;

    let body_bytes = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("Failed to read response body");

    serde_json::from_slice(&body_bytes).expect("Failed to deserialize response body")
}

/// Assert response status
///
/// # Examples
///
/// ```rust
/// let response = make_request(&app, Method::GET, "/api/v1/users", None::<()>).await;
/// assert_status(&response, StatusCode::OK);
/// ```
pub fn assert_status(
    response: &axum::http::Response<axum::body::Body>,
    expected: axum::http::StatusCode,
) {
    assert_eq!(
        response.status(),
        expected,
        "Expected status {} but got {}",
        expected,
        response.status()
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore] // Requires test database
    async fn test_setup_test_app() {
        let app = setup_test_app().await;
        assert!(app.pool.size() > 0);
        teardown_test_app(&app).await;
    }
}
