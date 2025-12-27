//! Integration tests for user management

mod common;

use common::test_helpers::*;

#[tokio::test]
#[ignore] // Requires docker-compose services to be running
async fn test_create_user() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    let username = "newuser";
    let password = "securepassword";
    
    let response = client
        .post(&format!("/v1/auth/userpass/users/{}", username))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "password": password,
            "policies": ["default"]
        }))
        .send()
        .await
        .expect("Failed to create user");
    
    assert!(response.status().is_success(), "User creation should succeed");
}

#[tokio::test]
#[ignore]
async fn test_get_user() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    let username = "getuser";
    
    // Create user first
    client
        .post(&format!("/v1/auth/userpass/users/{}", username))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "password": "password"
        }))
        .send()
        .await
        .expect("Failed to create user");
    
    // Get user
    let response = client
        .get(&format!("/v1/auth/userpass/users/{}", username))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to get user");
    
    assert!(response.status().is_success(), "Get user should succeed");
    
    let result: serde_json::Value = response.json().await.expect("Failed to parse response");
    assert!(result.get("data").is_some(), "Response should have data object");
}

#[tokio::test]
#[ignore]
async fn test_update_user() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    let username = "updateuser";
    
    // Create user first
    client
        .post(&format!("/v1/auth/userpass/users/{}", username))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "password": "oldpassword",
            "policies": ["default"]
        }))
        .send()
        .await
        .expect("Failed to create user");
    
    // Update user
    let response = client
        .post(&format!("/v1/auth/userpass/users/{}", username))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "password": "newpassword",
            "policies": ["default", "admin"]
        }))
        .send()
        .await
        .expect("Failed to update user");
    
    assert!(response.status().is_success(), "Update user should succeed");
    
    // Verify update
    let get_response = client
        .get(&format!("/v1/auth/userpass/users/{}", username))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to get user");
    
    let result: serde_json::Value = get_response.json().await.expect("Failed to parse response");
    let policies = result.get("data")
        .and_then(|v| v.get("policies"))
        .and_then(|v| v.as_array())
        .expect("Response should have policies array");
    
    assert!(policies.len() >= 2, "User should have updated policies");
}

#[tokio::test]
#[ignore]
async fn test_delete_user() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    let username = "deleteuser";
    
    // Create user first
    client
        .post(&format!("/v1/auth/userpass/users/{}", username))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "password": "password"
        }))
        .send()
        .await
        .expect("Failed to create user");
    
    // Delete user
    let response = client
        .delete(&format!("/v1/auth/userpass/users/{}", username))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to delete user");
    
    assert!(response.status().is_success(), "Delete user should succeed");
    
    // Verify user is deleted
    let get_response = client
        .get(&format!("/v1/auth/userpass/users/{}", username))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to get user");
    
    assert_eq!(get_response.status(), 404, "User should not exist after deletion");
}

#[tokio::test]
#[ignore]
async fn test_user_policy_assignment() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create a policy first
    let policy_name = "test-policy";
    client
        .post(&format!("/v1/sys/policies/acl/{}", policy_name))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "policy": r#"path "secret/*" { capabilities = ["read"] }"#
        }))
        .send()
        .await
        .expect("Failed to create policy");
    
    // Create user with policy
    let username = "policyuser";
    client
        .post(&format!("/v1/auth/userpass/users/{}", username))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "password": "password",
            "policies": [policy_name]
        }))
        .send()
        .await
        .expect("Failed to create user");
    
    // Verify user has policy
    let get_response = client
        .get(&format!("/v1/auth/userpass/users/{}", username))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to get user");
    
    let result: serde_json::Value = get_response.json().await.expect("Failed to parse response");
    let policies = result.get("data")
        .and_then(|v| v.get("policies"))
        .and_then(|v| v.as_array())
        .expect("Response should have policies array");
    
    assert!(policies.iter().any(|p| p.as_str() == Some(policy_name)), "User should have the assigned policy");
}
