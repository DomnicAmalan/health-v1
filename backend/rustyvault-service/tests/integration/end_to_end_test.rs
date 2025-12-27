//! End-to-end integration tests for complete vault workflows

mod common;

use common::test_helpers::*;

#[tokio::test]
#[ignore] // Requires docker-compose services to be running
async fn test_complete_vault_workflow() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    
    // 1. Initialize vault
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // 2. Create a realm
    let realm_response = client
        .post("/v1/sys/realm")
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "name": "e2e-realm",
            "organization_id": "e2e-org-123"
        }))
        .send()
        .await
        .expect("Failed to create realm");
    
    let realm_data: serde_json::Value = realm_response.json().await.expect("Failed to parse response");
    let realm_id = realm_data.get("realm_id")
        .and_then(|v| v.as_str())
        .expect("Response should have realm_id");
    
    // 3. Create a policy
    let policy_name = "e2e-policy";
    client
        .post(&format!("/v1/sys/policies/acl/{}", policy_name))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "policy": r#"path "secret/data/*" { capabilities = ["read", "write"] }"#
        }))
        .send()
        .await
        .expect("Failed to create policy");
    
    // 4. Create a user in the realm
    let username = "e2e-user";
    client
        .post(&format!("/v1/realm/{}/auth/userpass/users/{}", realm_id, username))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "password": "e2e-password",
            "policies": [policy_name]
        }))
        .send()
        .await
        .expect("Failed to create user");
    
    // 5. Login with the user
    let login_response = client
        .post(&format!("/v1/realm/{}/auth/userpass/login/{}", realm_id, username))
        .json(&serde_json::json!({
            "password": "e2e-password"
        }))
        .send()
        .await
        .expect("Failed to login");
    
    let login_data: serde_json::Value = login_response.json().await.expect("Failed to parse response");
    let user_token = login_data.get("auth")
        .and_then(|v| v.get("client_token"))
        .and_then(|v| v.as_str())
        .expect("Response should have client_token");
    
    // 6. Create a secret in the realm using user token
    let secret_data = serde_json::json!({
        "api_key": "secret-api-key-123",
        "database_url": "postgresql://localhost/db"
    });
    
    let secret_response = client
        .post(&format!("/v1/realm/{}/secret/data/app/config", realm_id))
        .header("X-Vault-Token", user_token)
        .json(&secret_data)
        .send()
        .await
        .expect("Failed to create secret");
    
    assert!(secret_response.status().is_success(), "Secret creation should succeed");
    
    // 7. Read the secret
    let read_response = client
        .get(&format!("/v1/realm/{}/secret/data/app/config", realm_id))
        .header("X-Vault-Token", user_token)
        .send()
        .await
        .expect("Failed to read secret");
    
    assert!(read_response.status().is_success(), "Secret read should succeed");
    
    let read_result: serde_json::Value = read_response.json().await.expect("Failed to parse response");
    let data = read_result.get("data")
        .and_then(|v| v.get("data"))
        .and_then(|v| v.as_object())
        .expect("Response should have data object");
    
    assert_eq!(data.get("api_key").and_then(|v| v.as_str()), Some("secret-api-key-123"));
    assert_eq!(data.get("database_url").and_then(|v| v.as_str()), Some("postgresql://localhost/db"));
}

#[tokio::test]
#[ignore]
async fn test_multi_realm_isolation() {
    let client = create_docker_compose_test_env().await.expect("Failed to setup test environment");
    let (root_token, _keys) = setup_initialized_vault(&client, 5, 3).await;
    
    // Create two realms
    let realm1_response = client
        .post("/v1/sys/realm")
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "name": "realm1",
            "organization_id": "org1"
        }))
        .send()
        .await
        .expect("Failed to create realm1");
    
    let realm2_response = client
        .post("/v1/sys/realm")
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "name": "realm2",
            "organization_id": "org2"
        }))
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
    
    // Create users in each realm
    let user1_response = client
        .post(&format!("/v1/realm/{}/auth/userpass/users/user1", realm1_id))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "password": "password1"
        }))
        .send()
        .await
        .expect("Failed to create user1");
    
    let user2_response = client
        .post(&format!("/v1/realm/{}/auth/userpass/users/user2", realm2_id))
        .header("X-Vault-Token", &root_token)
        .json(&serde_json::json!({
            "password": "password2"
        }))
        .send()
        .await
        .expect("Failed to create user2");
    
    // Login users
    let login1_response = client
        .post(&format!("/v1/realm/{}/auth/userpass/login/user1", realm1_id))
        .json(&serde_json::json!({
            "password": "password1"
        }))
        .send()
        .await
        .expect("Failed to login user1");
    
    let login2_response = client
        .post(&format!("/v1/realm/{}/auth/userpass/login/user2", realm2_id))
        .json(&serde_json::json!({
            "password": "password2"
        }))
        .send()
        .await
        .expect("Failed to login user2");
    
    let token1 = login1_response.json::<serde_json::Value>().await
        .expect("Failed to parse login1 response")
        .get("auth")
        .and_then(|v| v.get("client_token"))
        .and_then(|v| v.as_str())
        .expect("Login1 should have client_token")
        .to_string();
    
    let token2 = login2_response.json::<serde_json::Value>().await
        .expect("Failed to parse login2 response")
        .get("auth")
        .and_then(|v| v.get("client_token"))
        .and_then(|v| v.as_str())
        .expect("Login2 should have client_token")
        .to_string();
    
    // Create secrets in each realm
    client
        .post(&format!("/v1/realm/{}/secret/data/isolated", realm1_id))
        .header("X-Vault-Token", &token1)
        .json(&serde_json::json!({
            "secret": "realm1-secret"
        }))
        .send()
        .await
        .expect("Failed to create secret in realm1");
    
    client
        .post(&format!("/v1/realm/{}/secret/data/isolated", realm2_id))
        .header("X-Vault-Token", &token2)
        .json(&serde_json::json!({
            "secret": "realm2-secret"
        }))
        .send()
        .await
        .expect("Failed to create secret in realm2");
    
    // Verify isolation: user1 cannot access realm2 secret
    let cross_realm_response = client
        .get(&format!("/v1/realm/{}/secret/data/isolated", realm2_id))
        .header("X-Vault-Token", &token1)
        .send()
        .await
        .expect("Failed to send cross-realm request");
    
    // Should fail due to isolation
    assert!(!cross_realm_response.status().is_success(), "Cross-realm access should be denied");
}
