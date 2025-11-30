use shared::infrastructure::database::mumps::globals::Global;

#[test]
fn test_global_to_string() {
    let global = Global::new("PATIENT".to_string())
        .with_subscript("123".to_string());
    assert_eq!(global.to_string(), "^PATIENT(\"123\")");
}

#[test]
fn test_global_from_string() {
    let global = Global::from_string("^PATIENT(\"123\")").unwrap();
    assert_eq!(global.name, "PATIENT");
    assert_eq!(global.subscripts, vec!["123"]);
}

