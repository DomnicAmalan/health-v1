use authz_core::dto::*;
use serde_json;

#[test]
fn test_login_request_serialization() {
    let request = LoginRequest {
        email: "test@example.com".to_string(),
        password: "password123".to_string(),
    };

    let json = serde_json::to_string(&request).unwrap();
    assert!(json.contains("test@example.com"));
    assert!(json.contains("password123"));
}

#[test]
fn test_login_request_deserialization() {
    let json = r#"{"email":"test@example.com","password":"password123"}"#;
    let request: LoginRequest = serde_json::from_str(json).unwrap();
    
    assert_eq!(request.email, "test@example.com");
    assert_eq!(request.password, "password123");
}

#[test]
fn test_login_response_serialization() {
    let response = LoginResponse {
        access_token: "access-token".to_string(),
        refresh_token: "refresh-token".to_string(),
        expires_in: 3600,
        user: LoginUserResponse {
            id: "user-id".to_string(),
            email: "test@example.com".to_string(),
            username: Some("testuser".to_string()),
            role: "admin".to_string(),
            permissions: vec!["read:users".to_string()],
            created_at: Some("2024-01-01T00:00:00Z".to_string()),
        },
    };

    let json = serde_json::to_string(&response).unwrap();
    assert!(json.contains("accessToken"));
    assert!(json.contains("refreshToken"));
    assert!(json.contains("expiresIn"));
}

#[test]
fn test_login_response_deserialization() {
    let json = r#"{"accessToken":"access-token","refreshToken":"refresh-token","expiresIn":3600,"user":{"id":"user-id","email":"test@example.com","username":"testuser","role":"admin","permissions":["read:users"],"createdAt":"2024-01-01T00:00:00Z"}}"#;
    let response: LoginResponse = serde_json::from_str(json).unwrap();
    
    assert_eq!(response.access_token, "access-token");
    assert_eq!(response.refresh_token, "refresh-token");
    assert_eq!(response.expires_in, 3600);
    assert_eq!(response.user.email, "test@example.com");
}

#[test]
fn test_refresh_token_request_serialization() {
    let request = RefreshTokenRequest {
        refresh_token: "refresh-token".to_string(),
    };

    let json = serde_json::to_string(&request).unwrap();
    assert!(json.contains("refreshToken"));
    assert!(json.contains("refresh-token"));
}

#[test]
fn test_refresh_token_response_serialization() {
    let response = RefreshTokenResponse {
        access_token: "new-access-token".to_string(),
        refresh_token: "new-refresh-token".to_string(),
        expires_in: 3600,
    };

    let json = serde_json::to_string(&response).unwrap();
    assert!(json.contains("accessToken"));
    assert!(json.contains("refreshToken"));
    assert!(json.contains("expiresIn"));
}

#[test]
fn test_user_info_response_serialization() {
    let response = UserInfoResponse {
        sub: "user-id".to_string(),
        email: "test@example.com".to_string(),
        name: Some("Test User".to_string()),
        role: Some("admin".to_string()),
        permissions: Some(vec!["read:users".to_string(), "write:users".to_string()]),
    };

    let json = serde_json::to_string(&response).unwrap();
    assert!(json.contains("test@example.com"));
    assert!(json.contains("admin"));
}

#[test]
fn test_user_info_response_with_none_fields() {
    let response = UserInfoResponse {
        sub: "user-id".to_string(),
        email: "test@example.com".to_string(),
        name: None,
        role: None,
        permissions: None,
    };

    let json = serde_json::to_string(&response).unwrap();
    // None fields should be omitted
    assert!(!json.contains("name"));
    assert!(!json.contains("role"));
    assert!(!json.contains("permissions"));
}

#[test]
fn test_login_user_response_serialization() {
    let response = LoginUserResponse {
        id: "user-id".to_string(),
        email: "test@example.com".to_string(),
        username: Some("testuser".to_string()),
        role: "admin".to_string(),
        permissions: vec!["read:users".to_string()],
        created_at: Some("2024-01-01T00:00:00Z".to_string()),
    };

    let json = serde_json::to_string(&response).unwrap();
    assert!(json.contains("test@example.com"));
    assert!(json.contains("admin"));
}

#[test]
fn test_token_info_serialization() {
    let token_info = TokenInfo {
        sub: "user-id".to_string(),
        email: "test@example.com".to_string(),
        exp: 1234567890,
        iat: 1234567890,
        role: Some("admin".to_string()),
        permissions: Some(vec!["read:users".to_string()]),
    };

    let json = serde_json::to_string(&token_info).unwrap();
    assert!(json.contains("test@example.com"));
    assert!(json.contains("admin"));
}

