//! Integration tests for policy management

mod common;

use common::test_helpers::*;

#[tokio::test]
#[ignore] // Requires docker-compose services to be running
async fn test_create_policy() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    let policy_name = "test-policy";
    let policy_hcl = r#"path "secret/*" {
  capabilities = ["read", "list"]
}"#;
    
    let response = client
        .post(&format!("/v1/sys/policies/acl/{}", policy_name))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "policy": policy_hcl
        }))
        .send()
        .await
        .expect("Failed to create policy");
    
    assert!(response.status().is_success(), "Policy creation should succeed");
}

#[tokio::test]
#[ignore]
async fn test_get_policy() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    let policy_name = "get-policy";
    let policy_hcl = r#"path "secret/data/*" {
  capabilities = ["read"]
}"#;
    
    // Create policy first
    client
        .post(&format!("/v1/sys/policies/acl/{}", policy_name))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "policy": policy_hcl
        }))
        .send()
        .await
        .expect("Failed to create policy");
    
    // Get policy
    let response = client
        .get(&format!("/v1/sys/policies/acl/{}", policy_name))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to get policy");
    
    assert!(response.status().is_success(), "Get policy should succeed");
    
    let result: serde_json::Value = response.json().await.expect("Failed to parse response");
    assert!(result.get("data").is_some(), "Response should have data object");
    assert!(result.get("data").and_then(|v| v.get("policy")).is_some(), "Response should have policy");
}

#[tokio::test]
#[ignore]
async fn test_list_policies() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create multiple policies
    for i in 0..3 {
        let policy_name = format!("list-policy-{}", i);
        client
            .post(&format!("/v1/sys/policies/acl/{}", policy_name))
            .header("X-Vault-Token", &root_token)
            .json(&serde_json::json!({
                "policy": r#"path "secret/*" { capabilities = ["read"] }"#
            }))
            .send()
            .await
            .expect("Failed to create policy");
    }
    
    // List policies
    let response = client
        .get("/v1/sys/policies/acl")
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to list policies");
    
    assert!(response.status().is_success(), "List policies should succeed");
    
    let result: serde_json::Value = response.json().await.expect("Failed to parse response");
    let policies = result.get("data")
        .and_then(|v| v.get("policies"))
        .and_then(|v| v.as_array())
        .expect("Response should have policies array");
    
    assert!(policies.len() >= 3, "Should list at least 3 policies");
}

#[tokio::test]
#[ignore]
async fn test_delete_policy() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    let policy_name = "delete-policy";
    
    // Create policy first
    client
        .post(&format!("/v1/sys/policies/acl/{}", policy_name))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "policy": r#"path "secret/*" { capabilities = ["read"] }"#
        }))
        .send()
        .await
        .expect("Failed to create policy");
    
    // Delete policy
    let response = client
        .delete(&format!("/v1/sys/policies/acl/{}", policy_name))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to delete policy");
    
    assert!(response.status().is_success(), "Delete policy should succeed");
    
    // Verify policy is deleted
    let get_response = client
        .get(&format!("/v1/sys/policies/acl/{}", policy_name))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to get policy");
    
    assert_eq!(get_response.status(), 404, "Policy should not exist after deletion");
}

#[tokio::test]
#[ignore]
async fn test_policy_assignment_to_user() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create policy
    let policy_name = "user-policy";
    client
        .post(&format!("/v1/sys/policies/acl/{}", policy_name))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "policy": r#"path "secret/data/*" { capabilities = ["read"] }"#
        }))
        .send()
        .await
        .expect("Failed to create policy");
    
    // Create user with policy
    let username = "policy-assigned-user";
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
    
    // Login and verify policy is applied
    let login_response = client
        .post(&format!("/v1/auth/userpass/login/{}", username))
        .json(&serde_json::json!({
            "password": "password"
        }))
        .send()
        .await
        .expect("Failed to login");
    
    let login_result: serde_json::Value = login_response.json().await.expect("Failed to parse response");
    let user_token = login_result.get("auth")
        .and_then(|v| v.get("client_token"))
        .and_then(|v| v.as_str())
        .expect("Response should have client_token");
    
    // Verify token has the policy
    let lookup_response = client
        .get(&format!("/v1/auth/token/lookup/{}", user_token))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to lookup token");
    
    let lookup_result: serde_json::Value = lookup_response.json().await.expect("Failed to parse response");
    let policies = lookup_result.get("data")
        .and_then(|v| v.get("policies"))
        .and_then(|v| v.as_array())
        .expect("Response should have policies array");
    
    assert!(policies.iter().any(|p| p.as_str() == Some(policy_name)), "Token should have the assigned policy");
}
