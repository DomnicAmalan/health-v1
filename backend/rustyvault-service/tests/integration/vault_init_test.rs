//! Integration tests for vault initialization and seal/unseal operations

mod common;

use common::test_helpers::*;

#[tokio::test]
#[ignore] // Requires docker-compose services to be running
async fn test_vault_initialization() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    
    // Test initialization
    let init_response = init_vault_for_test(&client, 5, 3).await;
    
    // Verify response structure
    assert!(init_response.get("root_token").is_some(), "Missing root_token");
    assert!(init_response.get("keys_base64").is_some(), "Missing keys_base64");
    
    let keys: Vec<String> = init_response
        .get("keys_base64")
        .and_then(|v| v.as_array())
        .expect("keys_base64 should be an array")
        .iter()
        .filter_map(|v| v.as_str().map(|s| s.to_string()))
        .collect();
    
    assert_eq!(keys.len(), 5, "Should have 5 unseal keys");
    
    // Verify vault is sealed after initialization
    let health_response = client
        .get("/v1/sys/health")
        .send()
        .await
        .expect("Failed to get health");
    
    let health: serde_json::Value = health_response.json().await.expect("Failed to parse health");
    assert_eq!(health.get("sealed").and_then(|v| v.as_bool()), Some(true), "Vault should be sealed after init");
}

#[tokio::test]
#[ignore]
async fn test_vault_unseal() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    
    // Initialize vault
    let init_response = init_vault_for_test(&client, 5, 3).await;
    
    let keys: Vec<String> = init_response
        .get("keys_base64")
        .and_then(|v| v.as_array())
        .expect("keys_base64 should be an array")
        .iter()
        .filter_map(|v| v.as_str().map(|s| s.to_string()))
        .collect();
    
    // Unseal with threshold keys
    let keys_to_use: Vec<String> = keys.iter().take(3).cloned().collect();
    let unsealed = unseal_vault_with_keys(&client, &keys_to_use).await;
    
    assert!(unsealed, "Vault should be unsealed after providing threshold keys");
    
    // Verify vault is unsealed
    let health_response = client
        .get("/v1/sys/health")
        .send()
        .await
        .expect("Failed to get health");
    
    let health: serde_json::Value = health_response.json().await.expect("Failed to parse health");
    assert_eq!(health.get("sealed").and_then(|v| v.as_bool()), Some(false), "Vault should be unsealed");
}

#[tokio::test]
#[ignore]
async fn test_vault_unseal_insufficient_keys() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    
    // Initialize vault
    let init_response = init_vault_for_test(&client, 5, 3).await;
    
    let keys: Vec<String> = init_response
        .get("keys_base64")
        .and_then(|v| v.as_array())
        .expect("keys_base64 should be an array")
        .iter()
        .filter_map(|v| v.as_str().map(|s| s.to_string()))
        .collect();
    
    // Try to unseal with insufficient keys (only 2 instead of 3)
    let keys_to_use: Vec<String> = keys.iter().take(2).cloned().collect();
    let unsealed = unseal_vault_with_keys(&client, &keys_to_use).await;
    
    assert!(!unsealed, "Vault should not be unsealed with insufficient keys");
    
    // Verify vault is still sealed
    let health_response = client
        .get("/v1/sys/health")
        .send()
        .await
        .expect("Failed to get health");
    
    let health: serde_json::Value = health_response.json().await.expect("Failed to parse health");
    assert_eq!(health.get("sealed").and_then(|v| v.as_bool()), Some(true), "Vault should still be sealed");
}

#[tokio::test]
#[ignore]
async fn test_vault_seal() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    
    // Initialize and unseal vault
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Seal the vault
    let seal_response = client
        .post("/v1/sys/seal")
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to seal vault");
    
    assert!(seal_response.status().is_success(), "Seal request should succeed");
    
    // Verify vault is sealed
    let health_response = client
        .get("/v1/sys/health")
        .send()
        .await
        .expect("Failed to get health");
    
    let health: serde_json::Value = health_response.json().await.expect("Failed to parse health");
    assert_eq!(health.get("sealed").and_then(|v| v.as_bool()), Some(true), "Vault should be sealed");
}

#[tokio::test]
#[ignore]
async fn test_vault_unseal_duplicate_key() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    
    // Initialize vault
    let init_response = init_vault_for_test(&client, 5, 3).await;
    
    let keys: Vec<String> = init_response
        .get("keys_base64")
        .and_then(|v| v.as_array())
        .expect("keys_base64 should be an array")
        .iter()
        .filter_map(|v| v.as_str().map(|s| s.to_string()))
        .collect();
    
    // Try to unseal with duplicate key (same key twice)
    let duplicate_keys = vec![keys[0].clone(), keys[0].clone(), keys[1].clone()];
    let unsealed = unseal_vault_with_keys(&client, &duplicate_keys).await;
    
    // Should not unseal because duplicate key doesn't count
    assert!(!unsealed, "Vault should not unseal with duplicate keys");
}
