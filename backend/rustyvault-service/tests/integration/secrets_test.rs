//! Integration tests for secrets CRUD operations

mod common;

use common::test_helpers::*;

#[tokio::test]
#[ignore] // Requires docker-compose services to be running
async fn test_create_secret() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create a secret
    let secret_path = "test/secret";
    let secret_data = serde_json::json!({
        "username": "testuser",
        "password": "testpass"
    });
    
    let response = client
        .post(&format!("/v1/secret/{}", secret_path))
        .header("X-Vault-Token", &root_token)
        .json(&secret_data)
        .send()
        .await
        .expect("Failed to create secret");
    
    assert!(response.status().is_success(), "Secret creation should succeed");
}

#[tokio::test]
#[ignore]
async fn test_read_secret() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create a secret first
    let secret_path = "test/read-secret";
    let secret_data = serde_json::json!({
        "key1": "value1",
        "key2": "value2"
    });
    
    client
        .post(&format!("/v1/secret/{}", secret_path))
        .header("X-Vault-Token", &root_token)
        .json(&secret_data)
        .send()
        .await
        .expect("Failed to create secret");
    
    // Read the secret
    let response = client
        .get(&format!("/v1/secret/{}", secret_path))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to read secret");
    
    assert!(response.status().is_success(), "Secret read should succeed");
    
    let result: serde_json::Value = response.json().await.expect("Failed to parse response");
    let data = result.get("data")
        .and_then(|v| v.as_object())
        .expect("Response should have data object");
    
    assert_eq!(data.get("key1").and_then(|v| v.as_str()), Some("value1"));
    assert_eq!(data.get("key2").and_then(|v| v.as_str()), Some("value2"));
}

#[tokio::test]
#[ignore]
async fn test_update_secret() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create a secret first
    let secret_path = "test/update-secret";
    let initial_data = serde_json::json!({
        "key1": "value1"
    });
    
    client
        .post(&format!("/v1/secret/{}", secret_path))
        .header("X-Vault-Token", &root_token)
        .json(&initial_data)
        .send()
        .await
        .expect("Failed to create secret");
    
    // Update the secret
    let updated_data = serde_json::json!({
        "key1": "updated_value1",
        "key2": "new_value2"
    });
    
    let response = client
        .post(&format!("/v1/secret/{}", secret_path))
        .header("X-Vault-Token", &root_token)
        .json(&updated_data)
        .send()
        .await
        .expect("Failed to update secret");
    
    assert!(response.status().is_success(), "Secret update should succeed");
    
    // Verify the update
    let read_response = client
        .get(&format!("/v1/secret/{}", secret_path))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to read secret");
    
    let result: serde_json::Value = read_response.json().await.expect("Failed to parse response");
    let data = result.get("data")
        .and_then(|v| v.as_object())
        .expect("Response should have data object");
    
    assert_eq!(data.get("key1").and_then(|v| v.as_str()), Some("updated_value1"));
    assert_eq!(data.get("key2").and_then(|v| v.as_str()), Some("new_value2"));
}

#[tokio::test]
#[ignore]
async fn test_delete_secret() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create a secret first
    let secret_path = "test/delete-secret";
    let secret_data = serde_json::json!({
        "key1": "value1"
    });
    
    client
        .post(&format!("/v1/secret/{}", secret_path))
        .header("X-Vault-Token", &root_token)
        .json(&secret_data)
        .send()
        .await
        .expect("Failed to create secret");
    
    // Delete the secret
    let response = client
        .delete(&format!("/v1/secret/{}", secret_path))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to delete secret");
    
    assert!(response.status().is_success(), "Secret deletion should succeed");
    
    // Verify the secret is deleted
    let read_response = client
        .get(&format!("/v1/secret/{}", secret_path))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to read secret");
    
    assert_eq!(read_response.status(), 404, "Secret should not exist after deletion");
}

#[tokio::test]
#[ignore]
async fn test_list_secrets() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create multiple secrets
    let secrets = vec!["test/list/secret1", "test/list/secret2", "test/list/secret3"];
    
    for secret_path in &secrets {
        let secret_data = serde_json::json!({
            "key": "value"
        });
        
        client
            .post(&format!("/v1/secret/{}", secret_path))
            .header("X-Vault-Token", &root_token)
            .json(&secret_data)
            .send()
            .await
            .expect("Failed to create secret");
    }
    
    // List secrets
    let response = client
        .get("/v1/secret/test/list/")
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to list secrets");
    
    assert!(response.status().is_success(), "List secrets should succeed");
    
    let result: serde_json::Value = response.json().await.expect("Failed to parse response");
    let keys = result.get("data")
        .and_then(|v| v.get("keys"))
        .and_then(|v| v.as_array())
        .expect("Response should have keys array");
    
    assert!(keys.len() >= 3, "Should list at least 3 secrets");
}

#[tokio::test]
#[ignore]
async fn test_secret_path_navigation() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create nested secrets
    let nested_paths = vec![
        "app/database/username",
        "app/database/password",
        "app/api/key"
    ];
    
    for path in &nested_paths {
        let secret_data = serde_json::json!({
            "value": format!("value_for_{}", path.replace("/", "_"))
        });
        
        client
            .post(&format!("/v1/secret/{}", path))
            .header("X-Vault-Token", &root_token)
            .json(&secret_data)
            .send()
            .await
            .expect("Failed to create secret");
    }
    
    // List at app level
    let response = client
        .get("/v1/secret/app/")
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to list app secrets");
    
    assert!(response.status().is_success(), "List should succeed");
    
    let result: serde_json::Value = response.json().await.expect("Failed to parse response");
    let keys = result.get("data")
        .and_then(|v| v.get("keys"))
        .and_then(|v| v.as_array())
        .expect("Response should have keys array");
    
    assert!(keys.len() >= 2, "Should list database and api directories");
}
