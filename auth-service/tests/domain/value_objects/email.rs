use auth_service::domain::value_objects::email::Email;

#[test]
fn test_valid_email() {
    let email = Email::new("test@example.com".to_string());
    assert!(email.is_ok());
}

#[test]
fn test_invalid_email() {
    let email = Email::new("invalid".to_string());
    assert!(email.is_err());
}

