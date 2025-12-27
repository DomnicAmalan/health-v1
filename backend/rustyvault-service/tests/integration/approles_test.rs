//! Integration tests for AppRole management

mod common;

use common::test_helpers::*;

#[tokio::test]
#[ignore] // Requires docker-compose services to be running
async fn test_create_approle() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    let role_name = "test-approle";
    
    let response = client
        .post(&format!("/v1/auth/approle/role/{}", role_name))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "policies": ["default"],
            "bind_secret_id": true
        }))
        .send()
        .await
        .expect("Failed to create AppRole");
    
    assert!(response.status().is_success(), "AppRole creation should succeed");
}

#[tokio::test]
#[ignore]
async fn test_get_approle() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    let role_name = "get-approle";
    
    // Create AppRole first
    client
        .post(&format!("/v1/auth/approle/role/{}", role_name))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "policies": ["default"]
        }))
        .send()
        .await
        .expect("Failed to create AppRole");
    
    // Get AppRole
    let response = client
        .get(&format!("/v1/auth/approle/role/{}", role_name))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to get AppRole");
    
    assert!(response.status().is_success(), "Get AppRole should succeed");
    
    let result: serde_json::Value = response.json().await.expect("Failed to parse response");
    assert!(result.get("data").is_some(), "Response should have data object");
    assert!(result.get("data").and_then(|v| v.get("role_id")).is_some(), "Response should have role_id");
}

#[tokio::test]
#[ignore]
async fn test_generate_secret_id() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    let role_name = "secret-id-role";
    
    // Create AppRole first
    client
        .post(&format!("/v1/auth/approle/role/{}", role_name))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "policies": ["default"],
            "bind_secret_id": true
        }))
        .send()
        .await
        .expect("Failed to create AppRole");
    
    // Generate secret-id
    let response = client
        .post(&format!("/v1/auth/approle/role/{}/secret-id", role_name))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to generate secret-id");
    
    assert!(response.status().is_success(), "Secret-id generation should succeed");
    
    let result: serde_json::Value = response.json().await.expect("Failed to parse response");
    assert!(result.get("data").is_some(), "Response should have data object");
    assert!(result.get("data").and_then(|v| v.get("secret_id")).is_some(), "Response should have secret_id");
}

#[tokio::test]
#[ignore]
async fn test_approle_authentication_flow() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    let role_name = "auth-flow-role";
    
    // Create AppRole
    client
        .post(&format!("/v1/auth/approle/role/{}", role_name))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "policies": ["default"],
            "bind_secret_id": true
        }))
        .send()
        .await
        .expect("Failed to create AppRole");
    
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
    
    // Authenticate with AppRole
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
    
    let login_result: serde_json::Value = login_response.json().await.expect("Failed to parse response");
    assert!(login_result.get("auth").is_some(), "Response should have auth object");
    let client_token = login_result.get("auth")
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

#[tokio::test]
#[ignore]
async fn test_delete_approle() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    let role_name = "delete-approle";
    
    // Create AppRole first
    client
        .post(&format!("/v1/auth/approle/role/{}", role_name))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "policies": ["default"]
        }))
        .send()
        .await
        .expect("Failed to create AppRole");
    
    // Delete AppRole
    let response = client
        .delete(&format!("/v1/auth/approle/role/{}", role_name))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to delete AppRole");
    
    assert!(response.status().is_success(), "Delete AppRole should succeed");
    
    // Verify AppRole is deleted
    let get_response = client
        .get(&format!("/v1/auth/approle/role/{}", role_name))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to get AppRole");
    
    assert_eq!(get_response.status(), 404, "AppRole should not exist after deletion");
}
