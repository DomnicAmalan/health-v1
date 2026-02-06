use crate::shared::{AppError, AppResult};

/// Validates that a string field is not empty after trimming whitespace.
///
/// This utility eliminates 27+ duplicate `trim().is_empty()` validations
/// across admin-service use cases.
///
/// # Examples
///
/// ```rust,ignore
/// # use shared::infrastructure::validation::validate_non_empty;
/// // Before: 4-5 lines per validation
/// // if name.trim().is_empty() {
/// //     return Err(AppError::Validation("Name cannot be empty".to_string()));
/// // }
///
/// // After: 1 line
/// validate_non_empty(name, "Group name")?;
/// ```
///
/// # Arguments
///
/// * `value` - The string value to validate
/// * `field_name` - The name of the field for error messages
///
/// # Errors
///
/// Returns `AppError::Validation` if the trimmed value is empty
pub fn validate_non_empty(value: &str, field_name: &str) -> AppResult<()> {
    if value.trim().is_empty() {
        return Err(AppError::Validation(
            format!("{} cannot be empty", field_name)
        ));
    }
    Ok(())
}

pub fn validate_email(email: &str) -> AppResult<()> {
    if email.trim().is_empty() || !email.contains('@') {
        return Err(AppError::Validation("Invalid email address".to_string()));
    }

    let parts: Vec<&str> = email.split('@').collect();
    if parts.len() != 2 || parts[0].is_empty() || parts[1].is_empty() {
        return Err(AppError::Validation("Invalid email format".to_string()));
    }

    let domain = parts[1];
    if !domain.contains('.') || domain.split('.').any(|part| part.is_empty()) {
        return Err(AppError::Validation("Invalid email domain".to_string()));
    }

    Ok(())
}

pub fn validate_username(username: &str) -> AppResult<()> {
    if username.trim().is_empty() {
        return Err(AppError::Validation("Username cannot be empty".to_string()));
    }

    if username.len() < 3 {
        return Err(AppError::Validation("Username must be at least 3 characters long".to_string()));
    }

    if username.len() > 50 {
        return Err(AppError::Validation("Username must be less than 50 characters".to_string()));
    }

    if !username.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
        return Err(AppError::Validation("Username can only contain alphanumeric characters, underscores, and hyphens".to_string()));
    }

    Ok(())
}

pub fn validate_password(password: &str) -> AppResult<()> {
    if password.len() < 8 {
        return Err(AppError::Validation("Password must be at least 8 characters long".to_string()));
    }

    Ok(())
}