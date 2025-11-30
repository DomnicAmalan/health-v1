use authz_core::oidc::TokenManager;
use shared::domain::entities::User;
use uuid::Uuid;

#[test]
fn test_token_manager_new() {
    let manager = TokenManager::new(
        "test-secret-key",
        "test-issuer".to_string(),
        3600,
    );
    
    // TokenManager doesn't expose fields, so we test by using it
    let user = User::new(
        "test@example.com".to_string(),
        "testuser".to_string(),
        "hash".to_string(),
    );
    
    let token_result = manager.generate_access_token(&user);
    assert!(token_result.is_ok());
}

#[test]
fn test_token_manager_generate_access_token() {
    let manager = TokenManager::new(
        "test-secret-key-for-token-generation",
        "test-issuer".to_string(),
        3600,
    );
    
    let user = User::new(
        "test@example.com".to_string(),
        "testuser".to_string(),
        "hash".to_string(),
    );
    
    let token_result = manager.generate_access_token(&user);
    assert!(token_result.is_ok());
    
    let token = token_result.unwrap();
    assert!(!token.is_empty());
}

#[test]
fn test_token_manager_generate_access_token_with_permissions() {
    let manager = TokenManager::new(
        "test-secret-key-for-permissions",
        "test-issuer".to_string(),
        3600,
    );
    
    let user = User::new(
        "test@example.com".to_string(),
        "testuser".to_string(),
        "hash".to_string(),
    );
    
    let permissions = vec!["read:users".to_string(), "write:users".to_string()];
    let token_result = manager.generate_access_token_with_permissions(&user, "admin", &permissions);
    assert!(token_result.is_ok());
    
    let token = token_result.unwrap();
    assert!(!token.is_empty());
}

#[test]
fn test_token_manager_generate_refresh_token() {
    let manager = TokenManager::new(
        "test-secret-key-for-refresh",
        "test-issuer".to_string(),
        3600,
    );
    
    let user = User::new(
        "test@example.com".to_string(),
        "testuser".to_string(),
        "hash".to_string(),
    );
    
    let token_result = manager.generate_refresh_token(&user);
    assert!(token_result.is_ok());
    
    let token = token_result.unwrap();
    assert!(!token.is_empty());
}

#[test]
fn test_token_manager_validate_token() {
    let manager = TokenManager::new(
        "test-secret-key-for-validation",
        "test-issuer".to_string(),
        3600,
    );
    
    let user = User::new(
        "test@example.com".to_string(),
        "testuser".to_string(),
        "hash".to_string(),
    );
    
    let token = manager.generate_access_token(&user).unwrap();
    let claims_result = manager.validate_token(&token);
    
    assert!(claims_result.is_ok());
    let claims = claims_result.unwrap();
    assert_eq!(claims.sub, user.id.to_string());
    assert_eq!(claims.email, user.email);
    assert_eq!(claims.iss, "test-issuer");
    assert_eq!(claims.aud, "api-service");
}

#[test]
fn test_token_manager_validate_invalid_token() {
    let manager = TokenManager::new(
        "test-secret-key",
        "test-issuer".to_string(),
        3600,
    );
    
    let invalid_token = "invalid.token.here";
    let claims_result = manager.validate_token(invalid_token);
    
    assert!(claims_result.is_err());
}

