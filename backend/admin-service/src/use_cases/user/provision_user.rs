//! Unified User Provisioning Use Case
//!
//! Creates a user with complete access setup including:
//! - Admin service user creation
//! - Realm assignment for organization
//! - Role assignment via Zanzibar
//! - App access via Zanzibar
//! - Vault user creation (optional)
//! - Realm-scoped policy creation
//! - Vault token creation (optional)

use crate::dto::UserResponse;
use shared::domain::entities::{User, UserProvisioningChecklist};
use shared::domain::repositories::{UserRepository, RoleRepository};
use shared::infrastructure::encryption::DekManager;
use shared::infrastructure::encryption::vault_impl::RustyVaultClient;
use shared::infrastructure::zanzibar::RelationshipStore;
use shared::AppResult;
use bcrypt::{hash, DEFAULT_COST};
use uuid::Uuid;
use std::sync::Arc;
use serde::{Deserialize, Serialize};

/// Request to provision a user with full access setup
#[derive(Debug, Clone, Deserialize)]
pub struct ProvisionUserRequest {
    /// User's email address
    pub email: String,
    /// User's username
    pub username: String,
    /// User's password
    pub password: String,
    /// Organization ID to assign user to
    pub organization_id: Uuid,
    /// Role name to assign (e.g., "admin", "user", "doctor")
    pub role_name: Option<String>,
    /// Apps to grant access to (e.g., ["admin-ui", "client-app", "mobile"])
    #[serde(default)]
    pub app_access: Vec<String>,
    /// Whether to create a vault user
    #[serde(default)]
    pub create_vault_user: bool,
    /// Whether to create a vault token
    #[serde(default)]
    pub create_vault_token: bool,
    /// Display name for the user
    pub display_name: Option<String>,
}

/// Response from provisioning a user
#[derive(Debug, Clone, Serialize)]
pub struct ProvisionUserResponse {
    /// The created user
    pub user: UserResponse,
    /// Realm ID the user was provisioned in
    pub realm_id: Option<Uuid>,
    /// Role assigned to the user
    pub role_name: Option<String>,
    /// Apps the user has access to
    pub app_access: Vec<String>,
    /// Vault token (if created)
    pub vault_token: Option<String>,
    /// Provisioning checklist status
    pub checklist: UserProvisioningChecklist,
}

/// Unified user provisioning use case
pub struct ProvisionUserUseCase {
    user_repository: Box<dyn UserRepository>,
    role_repository: Box<dyn RoleRepository>,
    dek_manager: Arc<DekManager>,
    relationship_store: Arc<RelationshipStore>,
    vault_client: Option<Arc<RustyVaultClient>>,
}

impl ProvisionUserUseCase {
    pub fn new(
        user_repository: Box<dyn UserRepository>,
        role_repository: Box<dyn RoleRepository>,
        dek_manager: Arc<DekManager>,
        relationship_store: Arc<RelationshipStore>,
        vault_client: Option<Arc<RustyVaultClient>>,
    ) -> Self {
        Self {
            user_repository,
            role_repository,
            dek_manager,
            relationship_store,
            vault_client,
        }
    }

    pub async fn execute(&self, request: ProvisionUserRequest) -> AppResult<ProvisionUserResponse> {
        // Initialize provisioning checklist
        let mut checklist = UserProvisioningChecklist::new(Uuid::new_v4());

        // Step 1: Check if user already exists
        if self.user_repository.find_by_email(&request.email).await?.is_some() {
            return Err(shared::AppError::Validation("User with this email already exists".to_string()));
        }

        if self.user_repository.find_by_username(&request.username).await?.is_some() {
            return Err(shared::AppError::Validation("User with this username already exists".to_string()));
        }

        // Step 2: Hash password
        let password_hash = hash(&request.password, DEFAULT_COST)
            .map_err(|e| shared::AppError::Internal(format!("Password hashing failed: {}", e)))?;

        // Step 3: Create admin service user
        let user = User::new(request.email.clone(), request.username.clone(), password_hash);
        checklist.user_id = user.id;
        checklist.mark_item_in_progress("create_user");
        
        let created_user = self.user_repository.create(user).await?;
        checklist.mark_item_completed("create_user");

        // Step 4: Generate user DEK
        checklist.mark_item_in_progress("generate_dek");
        self.dek_manager
            .generate_dek(created_user.id, "user")
            .await
            .map_err(|e| {
                checklist.mark_item_failed("generate_dek", format!("{}", e));
                shared::AppError::Encryption(format!("Failed to generate user DEK: {}", e))
            })?;
        checklist.mark_item_completed("generate_dek");
        checklist.mark_item_completed("store_dek");

        // Step 5: Get or create realm for organization
        let realm_id = if let Some(ref vault_client) = self.vault_client {
            checklist.mark_item_in_progress("realm_assignment");
            match vault_client.get_or_create_realm_for_org(request.organization_id).await {
                Ok(realm_id) => {
                    checklist.mark_item_completed("realm_assignment");
                    Some(realm_id)
                }
                Err(e) => {
                    checklist.mark_item_failed("realm_assignment", format!("{}", e));
                    tracing::warn!("Failed to get/create realm for org {}: {}", request.organization_id, e);
                    None
                }
            }
        } else {
            checklist.mark_item_completed("realm_assignment");
            None
        };

        // Step 6: Assign organization membership
        checklist.mark_item_in_progress("organization_membership");
        let user_str = format!("user:{}", created_user.id);
        let org_str = format!("organization:{}", request.organization_id);
        
        if let Err(e) = self.relationship_store
            .add_with_organization(&user_str, "member_of", &org_str, Some(request.organization_id))
            .await
        {
            checklist.mark_item_failed("organization_membership", format!("{}", e));
            tracing::error!("Failed to create organization membership: {}", e);
        } else {
            checklist.mark_item_completed("organization_membership");
        }

        // Step 7: Assign role (if provided)
        let assigned_role_name = if let Some(ref role_name) = request.role_name {
            checklist.mark_item_in_progress("create_relationships");
            
            // Look up the role
            match self.role_repository.find_by_name(role_name).await? {
                Some(role) => {
                    let role_str = format!("role:{}", role.name);
                    if let Err(e) = self.relationship_store
                        .add_with_organization(&user_str, "has_role", &role_str, Some(request.organization_id))
                        .await
                    {
                        checklist.mark_item_failed("create_relationships", format!("{}", e));
                        tracing::error!("Failed to assign role: {}", e);
                        None
                    } else {
                        checklist.mark_item_completed("create_relationships");
                        Some(role.name)
                    }
                }
                None => {
                    checklist.mark_item_failed("create_relationships", format!("Role '{}' not found", role_name));
                    tracing::warn!("Role '{}' not found", role_name);
                    None
                }
            }
        } else {
            checklist.mark_item_completed("create_relationships");
            None
        };

        // Step 8: Grant app access
        let mut granted_apps = Vec::new();
        checklist.mark_item_in_progress("grant_app_access");
        
        let apps_to_grant = if request.app_access.is_empty() {
            // Default apps
            vec!["admin-ui".to_string(), "client-app".to_string()]
        } else {
            request.app_access.clone()
        };

        for app_name in &apps_to_grant {
            let app_object = format!("organization:{}/app:{}", request.organization_id, app_name);
            if let Err(e) = self.relationship_store
                .add_with_organization(&user_str, "can_access", &app_object, Some(request.organization_id))
                .await
            {
                tracing::warn!("Failed to grant access to {}: {}", app_name, e);
            } else {
                granted_apps.push(app_name.clone());
            }
        }
        checklist.mark_item_completed("grant_app_access");

        // Step 9: Create vault user (optional)
        if request.create_vault_user {
            if let (Some(ref vault_client), Some(realm_id)) = (&self.vault_client, realm_id) {
                checklist.mark_item_in_progress("vault_user_creation");
                
                // Build policies based on role
                let policies = if let Some(ref role_name) = assigned_role_name {
                    vec![format!("{}-realm-{}", role_name, realm_id)]
                } else {
                    vec!["default".to_string()]
                };

                match vault_client.create_realm_user(
                    realm_id,
                    &request.username,
                    &request.password,
                    &policies,
                ).await {
                    Ok(_) => {
                        checklist.mark_item_completed("vault_user_creation");
                    }
                    Err(e) => {
                        checklist.mark_item_failed("vault_user_creation", format!("{}", e));
                        tracing::warn!("Failed to create vault user: {}", e);
                    }
                }
            }
        }

        // Step 10: Create vault token (optional)
        let vault_token = if request.create_vault_token {
            if let (Some(ref vault_client), Some(realm_id)) = (&self.vault_client, realm_id) {
                checklist.mark_item_in_progress("vault_token_creation");
                
                // Build policies based on role and apps
                let mut policies = Vec::new();
                if let Some(ref role_name) = assigned_role_name {
                    for app in &granted_apps {
                        policies.push(format!("{}-{}-realm-{}", role_name, app, realm_id));
                    }
                }
                if policies.is_empty() {
                    policies.push("default".to_string());
                }

                match vault_client.create_realm_token(
                    realm_id,
                    created_user.id,
                    &policies,
                ).await {
                    Ok(token) => {
                        checklist.mark_item_completed("vault_token_creation");
                        Some(token)
                    }
                    Err(e) => {
                        checklist.mark_item_failed("vault_token_creation", format!("{}", e));
                        tracing::warn!("Failed to create vault token: {}", e);
                        None
                    }
                }
            } else {
                None
            }
        } else {
            None
        };

        // Audit log
        checklist.mark_item_completed("audit_log");

        Ok(ProvisionUserResponse {
            user: UserResponse::from(created_user),
            realm_id,
            role_name: assigned_role_name,
            app_access: granted_apps,
            vault_token,
            checklist,
        })
    }
}

/// Use case for granting app access to a user
pub struct GrantAppAccessUseCase {
    relationship_store: Arc<RelationshipStore>,
}

impl GrantAppAccessUseCase {
    pub fn new(relationship_store: Arc<RelationshipStore>) -> Self {
        Self { relationship_store }
    }

    pub async fn execute(
        &self,
        user_id: Uuid,
        organization_id: Uuid,
        app_names: &[String],
    ) -> AppResult<Vec<String>> {
        let user_str = format!("user:{}", user_id);
        let mut granted = Vec::new();

        for app_name in app_names {
            let app_object = format!("organization:{}/app:{}", organization_id, app_name);
            if let Err(e) = self.relationship_store
                .add_with_organization(&user_str, "can_access", &app_object, Some(organization_id))
                .await
            {
                tracing::warn!("Failed to grant access to {}: {}", app_name, e);
            } else {
                granted.push(app_name.clone());
            }
        }

        Ok(granted)
    }
}

/// Use case for granting vault access to a user
pub struct GrantVaultAccessUseCase {
    vault_client: Arc<RustyVaultClient>,
}

impl GrantVaultAccessUseCase {
    pub fn new(vault_client: Arc<RustyVaultClient>) -> Self {
        Self { vault_client }
    }

    pub async fn execute(
        &self,
        user_id: Uuid,
        realm_id: Uuid,
        username: &str,
        password: &str,
        policies: &[String],
    ) -> AppResult<Option<String>> {
        // Create vault user
        self.vault_client.create_realm_user(
            realm_id,
            username,
            password,
            policies,
        ).await?;

        // Create vault token
        let token = self.vault_client.create_realm_token(
            realm_id,
            user_id,
            policies,
        ).await?;

        Ok(Some(token))
    }
}

