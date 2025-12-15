//! Authentication modules for RustyVault
//!
//! This module provides various authentication methods:
//! - Token: Token-based authentication (core)
//! - UserPass: Username/password authentication
//! - AppRole: Application role-based authentication
//! - Cert: X.509 certificate authentication (planned)

pub mod approle;
pub mod token;
pub mod userpass;

// Re-export commonly used types
pub use approle::{
    AppRoleBackend, AppRoleEntry, CreateAppRoleRequest, SecretIdResponse,
};
pub use token::{
    CreateTokenRequest, TokenEntry, TokenStore,
};
pub use userpass::{
    CreateUserRequest, UserPassBackend,
};
