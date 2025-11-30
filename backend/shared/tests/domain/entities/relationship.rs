use shared::domain::entities::relationship::Relationship;

#[test]
fn test_relationship_tuple_string() {
    let rel = Relationship::new(
        "user:123".to_string(),
        "member".to_string(),
        "group:456".to_string(),
    );
    assert_eq!(rel.to_tuple_string(), "user:123#member@group:456");
}

#[test]
fn test_relationship_from_tuple_string() {
    let rel = Relationship::from_tuple_string("user:123#member@group:456").unwrap();
    assert_eq!(rel.user, "user:123");
    assert_eq!(rel.relation, "member");
    assert_eq!(rel.object, "group:456");
}

