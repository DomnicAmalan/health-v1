//! Integration tests for authentication (UserPass and AppRole)

mod common;

use common::test_helpers::*;

#[tokio::test]
#[ignore] // Requires docker-compose services to be running
async fn test_userpass_login() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create a user
    let username = "testuser";
    let password = "testpassword";
    
    let create_response = client
        .post(&format!("/v1/auth/userpass/users/{}", username))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "password": password
        }))
        .send()
        .await
        .expect("Failed to create user");
    
    assert!(create_response.status().is_success(), "User creation should succeed");
    
    // Login with userpass
    let login_response = client
        .post(&format!("/v1/auth/userpass/login/{}", username))
        .json(&serde_json::json!({
            "password": password
        }))
        .send()
        .await
        .expect("Failed to login");
    
    assert!(login_response.status().is_success(), "Login should succeed");
    
    let result: serde_json::Value = login_response.json().await.expect("Failed to parse response");
    assert!(result.get("auth").is_some(), "Response should have auth object");
    assert!(result.get("auth").and_then(|v| v.get("client_token")).is_some(), "Response should have client_token");
}

#[tokio::test]
#[ignore]
async fn test_userpass_login_invalid_password() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create a user
    let username = "testuser2";
    let password = "correctpassword";
    
    client
        .post(&format!("/v1/auth/userpass/users/{}", username))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "password": password
        }))
        .send()
        .await
        .expect("Failed to create user");
    
    // Try to login with wrong password
    let login_response = client
        .post(&format!("/v1/auth/userpass/login/{}", username))
        .json(&serde_json::json!({
            "password": "wrongpassword"
        }))
        .send()
        .await
        .expect("Failed to send login request");
    
    assert!(!login_response.status().is_success(), "Login with wrong password should fail");
}

#[tokio::test]
#[ignore]
async fn test_approle_login() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create an AppRole
    let role_name = "test-role";
    
    let create_response = client
        .post(&format!("/v1/auth/approle/role/{}", role_name))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "policies": ["default"]
        }))
        .send()
        .await
        .expect("Failed to create AppRole");
    
    assert!(create_response.status().is_success(), "AppRole creation should succeed");
    
    // Get role-id
    let role_response = client
        .get(&format!("/v1/auth/approle/role/{}", role_name))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to get AppRole");
    
    let role_data: serde_json::Value = role_response.json().await.expect("Failed to parse response");
    let role_id = role_data.get("data")
        .and_then(|v| v.get("role_id"))
        .and_then(|v| v.as_str())
        .expect("Response should have role_id");
    
    // Generate secret-id
    let secret_response = client
        .post(&format!("/v1/auth/approle/role/{}/secret-id", role_name))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to generate secret-id");
    
    let secret_data: serde_json::Value = secret_response.json().await.expect("Failed to parse response");
    let secret_id = secret_data.get("data")
        .and_then(|v| v.get("secret_id"))
        .and_then(|v| v.as_str())
        .expect("Response should have secret_id");
    
    // Login with AppRole
    let login_response = client
        .post("/v1/auth/approle/login")
        .json(&serde_json::json!({
            "role_id": role_id,
            "secret_id": secret_id
        }))
        .send()
        .await
        .expect("Failed to login");
    
    assert!(login_response.status().is_success(), "AppRole login should succeed");
    
    let result: serde_json::Value = login_response.json().await.expect("Failed to parse response");
    assert!(result.get("auth").is_some(), "Response should have auth object");
    assert!(result.get("auth").and_then(|v| v.get("client_token")).is_some(), "Response should have client_token");
}

#[tokio::test]
#[ignore]
async fn test_token_creation() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create a token
    let token_response = client
        .post("/v1/auth/token/create")
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "policies": ["default"],
            "ttl": "1h"
        }))
        .send()
        .await
        .expect("Failed to create token");
    
    assert!(token_response.status().is_success(), "Token creation should succeed");
    
    let result: serde_json::Value = token_response.json().await.expect("Failed to parse response");
    assert!(result.get("auth").is_some(), "Response should have auth object");
    let client_token = result.get("auth")
        .and_then(|v| v.get("client_token"))
        .and_then(|v| v.as_str())
        .expect("Response should have client_token");
    
    // Verify token works
    let lookup_response = client
        .get(&format!("/v1/auth/token/lookup/{}", client_token))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to lookup token");
    
    assert!(lookup_response.status().is_success(), "Token lookup should succeed");
}
