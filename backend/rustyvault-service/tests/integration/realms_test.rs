//! Integration tests for realm management

mod common;

use common::test_helpers::*;

#[tokio::test]
#[ignore] // Requires docker-compose services to be running
async fn test_create_realm() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create a realm
    let realm_data = serde_json::json!({
        "name": "test-realm",
        "organization_id": "123e4567-e89b-12d3-a456-426614174000"
    });
    
    let response = client
        .post("/v1/sys/realm")
        .header("X-Vault-Token", &root_token)
        .json(&realm_data)
        .send()
        .await
        .expect("Failed to create realm");
    
    assert!(response.status().is_success(), "Realm creation should succeed");
    
    let result: serde_json::Value = response.json().await.expect("Failed to parse response");
    assert!(result.get("realm_id").is_some(), "Response should include realm_id");
}

#[tokio::test]
#[ignore]
async fn test_list_realms() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create multiple realms
    for i in 0..3 {
        let realm_data = serde_json::json!({
            "name": format!("test-realm-{}", i),
            "organization_id": format!("123e4567-e89b-12d3-a456-42661417400{}", i)
        });
        
        client
            .post("/v1/sys/realm")
            .header("X-Vault-Token", &root_token)
            .json(&realm_data)
            .send()
            .await
            .expect("Failed to create realm");
    }
    
    // List realms
    let response = client
        .get("/v1/sys/realm")
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to list realms");
    
    assert!(response.status().is_success(), "List realms should succeed");
    
    let result: serde_json::Value = response.json().await.expect("Failed to parse response");
    let realms = result.get("realms")
        .and_then(|v| v.as_array())
        .expect("Response should have realms array");
    
    assert!(realms.len() >= 3, "Should list at least 3 realms");
}

#[tokio::test]
#[ignore]
async fn test_get_realm() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create a realm
    let realm_data = serde_json::json!({
        "name": "get-test-realm",
        "organization_id": "123e4567-e89b-12d3-a456-426614174001"
    });
    
    let create_response = client
        .post("/v1/sys/realm")
        .header("X-Vault-Token", &root_token)
        .json(&realm_data)
        .send()
        .await
        .expect("Failed to create realm");
    
    let create_result: serde_json::Value = create_response.json().await.expect("Failed to parse response");
    let realm_id = create_result.get("realm_id")
        .and_then(|v| v.as_str())
        .expect("Response should include realm_id");
    
    // Get the realm
    let response = client
        .get(&format!("/v1/sys/realm/{}", realm_id))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to get realm");
    
    assert!(response.status().is_success(), "Get realm should succeed");
    
    let result: serde_json::Value = response.json().await.expect("Failed to parse response");
    assert_eq!(result.get("name").and_then(|v| v.as_str()), Some("get-test-realm"));
}

#[tokio::test]
#[ignore]
async fn test_update_realm() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create a realm
    let realm_data = serde_json::json!({
        "name": "update-test-realm",
        "organization_id": "123e4567-e89b-12d3-a456-426614174002"
    });
    
    let create_response = client
        .post("/v1/sys/realm")
        .header("X-Vault-Token", &root_token)
        .json(&realm_data)
        .send()
        .await
        .expect("Failed to create realm");
    
    let create_result: serde_json::Value = create_response.json().await.expect("Failed to parse response");
    let realm_id = create_result.get("realm_id")
        .and_then(|v| v.as_str())
        .expect("Response should include realm_id");
    
    // Update the realm
    let update_data = serde_json::json!({
        "name": "updated-realm-name"
    });
    
    let response = client
        .post(&format!("/v1/sys/realm/{}", realm_id))
        .header("X-Vault-Token", &root_token)
        .json(&update_data)
        .send()
        .await
        .expect("Failed to update realm");
    
    assert!(response.status().is_success(), "Update realm should succeed");
    
    // Verify the update
    let get_response = client
        .get(&format!("/v1/sys/realm/{}", realm_id))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to get realm");
    
    let result: serde_json::Value = get_response.json().await.expect("Failed to parse response");
    assert_eq!(result.get("name").and_then(|v| v.as_str()), Some("updated-realm-name"));
}

#[tokio::test]
#[ignore]
async fn test_delete_realm() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create a realm
    let realm_data = serde_json::json!({
        "name": "delete-test-realm",
        "organization_id": "123e4567-e89b-12d3-a456-426614174003"
    });
    
    let create_response = client
        .post("/v1/sys/realm")
        .header("X-Vault-Token", &root_token)
        .json(&realm_data)
        .send()
        .await
        .expect("Failed to create realm");
    
    let create_result: serde_json::Value = create_response.json().await.expect("Failed to parse response");
    let realm_id = create_result.get("realm_id")
        .and_then(|v| v.as_str())
        .expect("Response should include realm_id");
    
    // Delete the realm
    let response = client
        .delete(&format!("/v1/sys/realm/{}", realm_id))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to delete realm");
    
    assert!(response.status().is_success(), "Delete realm should succeed");
    
    // Verify the realm is deleted
    let get_response = client
        .get(&format!("/v1/sys/realm/{}", realm_id))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to get realm");
    
    assert_eq!(get_response.status(), 404, "Realm should not exist after deletion");
}

#[tokio::test]
#[ignore]
async fn test_realm_isolation() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create two realms
    let realm1_data = serde_json::json!({
        "name": "realm1",
        "organization_id": "11111111-1111-1111-1111-111111111111"
    });
    
    let realm2_data = serde_json::json!({
        "name": "realm2",
        "organization_id": "22222222-2222-2222-2222-222222222222"
    });
    
    let realm1_response = client
        .post("/v1/sys/realm")
        .header("X-Vault-Token", &root_token)
        .json(&realm1_data)
        .send()
        .await
        .expect("Failed to create realm1");
    
    let realm2_response = client
        .post("/v1/sys/realm")
        .header("X-Vault-Token", &root_token)
        .json(&realm2_data)
        .send()
        .await
        .expect("Failed to create realm2");
    
    let realm1_id = realm1_response.json::<serde_json::Value>().await
        .expect("Failed to parse realm1 response")
        .get("realm_id")
        .and_then(|v| v.as_str())
        .expect("Realm1 should have realm_id")
        .to_string();
    
    let realm2_id = realm2_response.json::<serde_json::Value>().await
        .expect("Failed to parse realm2 response")
        .get("realm_id")
        .and_then(|v| v.as_str())
        .expect("Realm2 should have realm_id")
        .to_string();
    
    // Create a secret in realm1
    let secret_data = serde_json::json!({
        "secret_key": "realm1_secret"
    });
    
    client
        .post(&format!("/v1/realm/{}/secret/data/test", realm1_id))
        .header("X-Vault-Token", &root_token)
        .json(&secret_data)
        .send()
        .await
        .expect("Failed to create secret in realm1");
    
    // Try to read the secret from realm2 (should fail or return empty)
    let response = client
        .get(&format!("/v1/realm/{}/secret/data/test", realm2_id))
        .header("X-Vault-Token", &root_token)
        .send()
        .await
        .expect("Failed to read secret from realm2");
    
    // Should not find the secret in realm2 (isolation)
    assert_ne!(response.status(), 200, "Secret from realm1 should not be accessible in realm2");
}
