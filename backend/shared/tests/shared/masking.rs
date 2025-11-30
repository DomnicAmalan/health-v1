use shared::shared::masking::*;

#[test]
fn test_mask_field() {
    assert_eq!(mask_field("1234567890", '*', 4), "******7890");
    assert_eq!(mask_field("short", '*', 4), "short");
}

#[test]
fn test_mask_email() {
    assert_eq!(mask_email("test@example.com"), "**st@example.com");
}

#[test]
fn test_mask_phone() {
    assert_eq!(mask_phone("123-456-7890"), "***-***-7890");
}

#[test]
fn test_mask_ssn() {
    assert_eq!(mask_ssn("123-45-6789"), "***-**-6789");
}

