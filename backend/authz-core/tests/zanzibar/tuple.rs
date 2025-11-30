use authz_core::zanzibar::RelationshipTuple;
use shared::AppResult;

#[test]
fn test_relationship_tuple_new() {
    let tuple = RelationshipTuple::new(
        "user:123".to_string(),
        "member".to_string(),
        "group:456".to_string(),
    );
    
    assert_eq!(tuple.user, "user:123");
    assert_eq!(tuple.relation, "member");
    assert_eq!(tuple.object, "group:456");
}

#[test]
fn test_relationship_tuple_to_string() {
    let tuple = RelationshipTuple::new(
        "user:123".to_string(),
        "member".to_string(),
        "group:456".to_string(),
    );
    
    assert_eq!(tuple.to_string(), "user:123#member@group:456");
}

#[test]
fn test_relationship_tuple_validate_success() {
    let tuple = RelationshipTuple::new(
        "user:123".to_string(),
        "member".to_string(),
        "group:456".to_string(),
    );
    
    let result = tuple.validate();
    assert!(result.is_ok());
}

#[test]
fn test_relationship_tuple_validate_empty_user() {
    let tuple = RelationshipTuple::new(
        "".to_string(),
        "member".to_string(),
        "group:456".to_string(),
    );
    
    let result = tuple.validate();
    assert!(result.is_err());
}

#[test]
fn test_relationship_tuple_validate_empty_relation() {
    let tuple = RelationshipTuple::new(
        "user:123".to_string(),
        "".to_string(),
        "group:456".to_string(),
    );
    
    let result = tuple.validate();
    assert!(result.is_err());
}

#[test]
fn test_relationship_tuple_validate_empty_object() {
    let tuple = RelationshipTuple::new(
        "user:123".to_string(),
        "member".to_string(),
        "".to_string(),
    );
    
    let result = tuple.validate();
    assert!(result.is_err());
}

