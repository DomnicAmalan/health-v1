/**
 * Authentication Integration Tests
 *
 * Tests for user registration, login, logout, and token management.
 */

mod common;

use axum::http::{Method, StatusCode};
use common::*;
use serde_json::json;

#[tokio::test]
#[ignore] // Requires test database - run with: cargo test --test '*' -- --ignored
async fn test_login_success() {
    let app = setup_test_app().await;

    // Login with test admin credentials
    let login_payload = json!({
        "email": "admin@test.com",
        "password": "testpassword123"
    });

    let response = make_request(
        &app,
        Method::POST,
        "/api/v1/auth/login",
        Some(login_payload),
    )
    .await;

    assert_status(&response, StatusCode::OK);

    let body: serde_json::Value = extract_json_body(response).await;

    // Verify response structure
    assert!(body["data"].is_object());
    assert!(body["data"]["accessToken"].is_string());
    assert!(body["data"]["refreshToken"].is_string());
    assert!(body["data"]["user"].is_object());
    assert_eq!(body["data"]["user"]["email"], "admin@test.com");

    teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_login_invalid_credentials() {
    let app = setup_test_app().await;

    // Attempt login with wrong password
    let login_payload = json!({
        "email": "admin@test.com",
        "password": "wrongpassword"
    });

    let response = make_request(
        &app,
        Method::POST,
        "/api/v1/auth/login",
        Some(login_payload),
    )
    .await;

    assert_status(&response, StatusCode::UNAUTHORIZED);

    let body: serde_json::Value = extract_json_body(response).await;
    assert!(body["error"].is_string());
    assert!(body["data"].is_null());

    teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_login_nonexistent_user() {
    let app = setup_test_app().await;

    let login_payload = json!({
        "email": "nonexistent@test.com",
        "password": "anypassword"
    });

    let response = make_request(
        &app,
        Method::POST,
        "/api/v1/auth/login",
        Some(login_payload),
    )
    .await;

    assert_status(&response, StatusCode::UNAUTHORIZED);

    teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_refresh_token_success() {
    let app = setup_test_app().await;

    // First, login to get refresh token
    let login_payload = json!({
        "email": "admin@test.com",
        "password": "testpassword123"
    });

    let login_response = make_request(
        &app,
        Method::POST,
        "/api/v1/auth/login",
        Some(login_payload),
    )
    .await;

    let login_body: serde_json::Value = extract_json_body(login_response).await;
    let refresh_token = login_body["data"]["refreshToken"]
        .as_str()
        .expect("Refresh token not found");

    // Use refresh token to get new access token
    let refresh_payload = json!({
        "refreshToken": refresh_token
    });

    let response = make_request(
        &app,
        Method::POST,
        "/api/v1/auth/refresh",
        Some(refresh_payload),
    )
    .await;

    assert_status(&response, StatusCode::OK);

    let body: serde_json::Value = extract_json_body(response).await;
    assert!(body["data"]["accessToken"].is_string());

    teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_logout_success() {
    let app = setup_test_app().await;

    // Login first
    let login_payload = json!({
        "email": "admin@test.com",
        "password": "testpassword123"
    });

    let login_response = make_request(
        &app,
        Method::POST,
        "/api/v1/auth/login",
        Some(login_payload),
    )
    .await;

    let login_body: serde_json::Value = extract_json_body(login_response).await;
    let access_token = login_body["data"]["accessToken"]
        .as_str()
        .expect("Access token not found");

    // Logout
    let response = make_authenticated_request(
        &app,
        Method::POST,
        "/api/v1/auth/logout",
        access_token,
        None::<()>,
    )
    .await;

    assert_status(&response, StatusCode::OK);

    // Verify subsequent requests with same token fail
    let protected_response = make_authenticated_request(
        &app,
        Method::GET,
        "/api/v1/me",
        access_token,
        None::<()>,
    )
    .await;

    assert_status(&protected_response, StatusCode::UNAUTHORIZED);

    teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_protected_endpoint_without_token() {
    let app = setup_test_app().await;

    let response = make_request(&app, Method::GET, "/api/v1/me", None::<()>).await;

    assert_status(&response, StatusCode::UNAUTHORIZED);

    teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_protected_endpoint_with_invalid_token() {
    let app = setup_test_app().await;

    let response = make_authenticated_request(
        &app,
        Method::GET,
        "/api/v1/me",
        "invalid_token",
        None::<()>,
    )
    .await;

    assert_status(&response, StatusCode::UNAUTHORIZED);

    teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_login_validation_errors() {
    let app = setup_test_app().await;

    // Missing password
    let payload = json!({
        "email": "admin@test.com"
    });

    let response = make_request(&app, Method::POST, "/api/v1/auth/login", Some(payload)).await;
    assert_status(&response, StatusCode::BAD_REQUEST);

    // Invalid email format
    let payload = json!({
        "email": "not-an-email",
        "password": "password123"
    });

    let response = make_request(&app, Method::POST, "/api/v1/auth/login", Some(payload)).await;
    assert_status(&response, StatusCode::BAD_REQUEST);

    teardown_test_app(&app).await;
}
