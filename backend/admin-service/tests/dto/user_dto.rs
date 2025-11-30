use admin_service::dto::{CreateUserRequest, UpdateUserRequest, UserResponse};
use serde_json;
use uuid::Uuid;
use chrono::Utc;
use shared::domain::entities::User;

#[test]
fn test_create_user_request_serialization() {
    let request = CreateUserRequest {
        email: "test@example.com".to_string(),
        username: "testuser".to_string(),
        password: "password123".to_string(),
    };

    let json = serde_json::to_string(&request).unwrap();
    assert!(json.contains("test@example.com"));
    assert!(json.contains("testuser"));
    assert!(json.contains("password123"));
}

#[test]
fn test_create_user_request_deserialization() {
    let json = r#"{"email":"test@example.com","username":"testuser","password":"password123"}"#;
    let request: CreateUserRequest = serde_json::from_str(json).unwrap();
    
    assert_eq!(request.email, "test@example.com");
    assert_eq!(request.username, "testuser");
    assert_eq!(request.password, "password123");
}

#[test]
fn test_update_user_request_serialization() {
    let request = UpdateUserRequest {
        email: Some("newemail@example.com".to_string()),
        username: None,
        password: Some("newpassword".to_string()),
    };

    let json = serde_json::to_string(&request).unwrap();
    assert!(json.contains("newemail@example.com"));
    assert!(json.contains("newpassword"));
}

#[test]
fn test_update_user_request_deserialization() {
    let json = r#"{"email":"newemail@example.com","username":null,"password":"newpassword"}"#;
    let request: UpdateUserRequest = serde_json::from_str(json).unwrap();
    
    assert_eq!(request.email, Some("newemail@example.com".to_string()));
    assert_eq!(request.username, None);
    assert_eq!(request.password, Some("newpassword".to_string()));
}

#[test]
fn test_user_response_from_user() {
    let user = User::new(
        "test@example.com".to_string(),
        "testuser".to_string(),
        "hash".to_string(),
    );

    let response = UserResponse::from(user.clone());
    
    assert_eq!(response.id, user.id);
    assert_eq!(response.email, user.email);
    assert_eq!(response.username, user.username);
    assert_eq!(response.is_active, user.is_active);
    assert_eq!(response.is_verified, user.is_verified);
    assert_eq!(response.created_at, user.created_at);
}

#[test]
fn test_user_response_serialization() {
    let response = UserResponse {
        id: Uuid::new_v4(),
        email: "test@example.com".to_string(),
        username: "testuser".to_string(),
        is_active: true,
        is_verified: false,
        created_at: Utc::now(),
    };

    let json = serde_json::to_string(&response).unwrap();
    assert!(json.contains("test@example.com"));
    assert!(json.contains("testuser"));
}

