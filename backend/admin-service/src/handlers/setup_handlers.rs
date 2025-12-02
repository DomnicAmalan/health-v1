use axum::{Json, extract::State, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
// Note: AppState is defined in api-service, but admin-service handlers are used by api-service
// So we import from shared which has the generic type
use std::sync::Arc;
use uuid::Uuid;
use tracing;

// Type aliases for convenience - these match the concrete types used in api-service
type ConcreteAppState = shared::AppState<
    authz_core::auth::LoginUseCase,
    authz_core::auth::RefreshTokenUseCase,
    authz_core::auth::LogoutUseCase,
    authz_core::auth::UserInfoUseCase,
    crate::use_cases::setup::SetupOrganizationUseCase,
    crate::use_cases::setup::CreateSuperAdminUseCase,
>;

#[derive(Debug, Deserialize)]
pub struct SetupRequest {
    pub organization_name: String,
    pub organization_slug: String,
    pub organization_domain: Option<String>,
    pub admin_email: String,
    pub admin_username: String,
    pub admin_password: String,
}

#[derive(Debug, Serialize)]
pub struct SetupResponse {
    pub success: bool,
    pub message: String,
    pub organization_id: Uuid,
    pub admin_user_id: Uuid,
}

/// Initialize the system (one-time setup)
pub async fn initialize_setup(
    State(state): State<Arc<ConcreteAppState>>,
    Json(request): Json<SetupRequest>,
) -> impl IntoResponse {
    let location = concat!(file!(), ":", line!());
    // Check if setup is already completed
    let is_completed = match state.setup_repository.is_setup_completed().await {
        Ok(c) => c,
        Err(e) => {
            e.log_with_operation(location, "initialize_setup");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": format!("Failed to check setup status: {}", e)
                })),
            )
                .into_response();
        }
    };

    if is_completed {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "Setup has already been completed"
            })),
        )
            .into_response();
    }

    // Create organization
    let org_id = match state
        .setup_organization_use_case
        .execute(
            &request.organization_name,
            &request.organization_slug,
            request.organization_domain.as_deref(),
            false, // force flag - API handlers should not use force mode
        )
        .await
    {
        Ok(id) => id,
        Err(e) => {
            e.log_with_operation(location, "initialize_setup");
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": format!("Failed to create organization: {}", e)
                })),
            )
                .into_response();
        }
    };

    // Create super admin
    let admin_user = match state
        .create_super_admin_use_case
        .execute(
            &request.admin_email,
            &request.admin_username,
            &request.admin_password,
            Some(org_id),
        )
        .await
    {
        Ok(user) => user,
        Err(e) => {
            e.log_with_operation(location, "initialize_setup");
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": format!("Failed to create super admin: {}", e)
                })),
            )
                .into_response();
        }
    };

    // Generate DEK for organization
    if let Err(e) = state.dek_manager.generate_dek(org_id, "organization").await {
        e.log_with_operation(location, "initialize_setup");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to generate organization DEK: {}", e)
            })),
        )
            .into_response();
    }

    // Generate DEK for super admin user
    if let Err(e) = state.dek_manager.generate_dek(admin_user.id, "user").await {
        e.log_with_operation(location, "initialize_setup");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to generate user DEK: {}", e)
            })),
        )
            .into_response();
    }

    // Create Zanzibar relationships
    let user_str = format!("user:{}", admin_user.id);
    let org_str = format!("organization:{}", org_id);
    
    // Log relationship creation (logger config controls visibility based on dev mode)
    tracing::debug!("Creating Zanzibar relationships for super admin user {}", admin_user.id);
    
    // Organization ownership and membership
    if let Err(e) = state.relationship_store.add(&user_str, "owner", &org_str).await {
        e.log_with_operation(location, "initialize_setup");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to create owner relationship: {}", e)
            })),
        )
            .into_response();
    }
    tracing::debug!("✓ Created relationship: {} → owner → {}", user_str, org_str);
    
    if let Err(e) = state.relationship_store.add(&user_str, "member", &org_str).await {
        e.log_with_operation(location, "initialize_setup");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to create member relationship: {}", e)
            })),
        )
            .into_response();
    }
    tracing::debug!("✓ Created relationship: {} → member → {}", user_str, org_str);
    
    // Admin role relationship
    if let Err(e) = state.relationship_store.add(&user_str, "has_role", "role:admin").await {
        e.log_with_operation(location, "initialize_setup");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to create admin role relationship: {}", e)
            })),
        )
            .into_response();
    }
    tracing::debug!("✓ Created relationship: {} → has_role → role:admin", user_str);
    
    // Reverse: organization admin
    if let Err(e) = state.relationship_store.add(&org_str, "admin", &user_str).await {
        e.log_with_operation(location, "initialize_setup");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to create organization admin relationship: {}", e)
            })),
        )
            .into_response();
    }
    tracing::debug!("✓ Created relationship: {} → admin → {}", org_str, user_str);

    // App access relationships - admin gets access to all apps
    if let Err(e) = state.relationship_store.add(&user_str, "can_access", "app:admin-ui").await {
        e.log_with_operation(location, "initialize_setup");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to create admin-ui access: {}", e)
            })),
        )
            .into_response();
    }
    tracing::debug!("✓ Created relationship: {} → can_access → app:admin-ui", user_str);
    
    if let Err(e) = state.relationship_store.add(&user_str, "can_access", "app:client-app").await {
        e.log_with_operation(location, "initialize_setup");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to create client-app access: {}", e)
            })),
        )
            .into_response();
    }
    tracing::debug!("✓ Created relationship: {} → can_access → app:client-app", user_str);
    
    if let Err(e) = state.relationship_store.add(&user_str, "can_access", "app:mobile").await {
        e.log_with_operation(location, "initialize_setup");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to create mobile access: {}", e)
            })),
        )
            .into_response();
    }
    tracing::debug!("✓ Created relationship: {} → can_access → app:mobile", user_str);

    // Create role-to-app relationships for all roles
    tracing::debug!("Creating role-to-app access relationships");
    
    // Admin role
    if let Err(e) = state.relationship_store.add("role:admin", "can_access", "app:admin-ui").await {
        e.log_with_operation(location, "initialize_setup");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to create role:admin → admin-ui relationship: {}", e)
            })),
        )
            .into_response();
    }
    tracing::debug!("✓ Created relationship: role:admin → can_access → app:admin-ui");
    
    if let Err(e) = state.relationship_store.add("role:admin", "can_access", "app:client-app").await {
        e.log_with_operation(location, "initialize_setup");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to create role:admin → client-app relationship: {}", e)
            })),
        )
            .into_response();
    }
    tracing::debug!("✓ Created relationship: role:admin → can_access → app:client-app");
    
    if let Err(e) = state.relationship_store.add("role:admin", "can_access", "app:mobile").await {
        e.log_with_operation(location, "initialize_setup");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to create role:admin → mobile relationship: {}", e)
            })),
        )
            .into_response();
    }
    tracing::debug!("✓ Created relationship: role:admin → can_access → app:mobile");

    // Doctor role
    if let Err(e) = state.relationship_store.add("role:doctor", "can_access", "app:client-app").await {
        e.log_with_operation(location, "initialize_setup");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to create role:doctor → client-app relationship: {}", e)
            })),
        )
            .into_response();
    }
    tracing::debug!("✓ Created relationship: role:doctor → can_access → app:client-app");
    
    if let Err(e) = state.relationship_store.add("role:doctor", "can_access", "app:mobile").await {
        e.log_with_operation(location, "initialize_setup");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to create role:doctor → mobile relationship: {}", e)
            })),
        )
            .into_response();
    }
    tracing::debug!("✓ Created relationship: role:doctor → can_access → app:mobile");

    // Nurse role
    if let Err(e) = state.relationship_store.add("role:nurse", "can_access", "app:client-app").await {
        e.log_with_operation(location, "initialize_setup");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to create role:nurse → client-app relationship: {}", e)
            })),
        )
            .into_response();
    }
    tracing::debug!("✓ Created relationship: role:nurse → can_access → app:client-app");
    
    if let Err(e) = state.relationship_store.add("role:nurse", "can_access", "app:mobile").await {
        e.log_with_operation(location, "initialize_setup");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to create role:nurse → mobile relationship: {}", e)
            })),
        )
            .into_response();
    }
    tracing::debug!("✓ Created relationship: role:nurse → can_access → app:mobile");

    // Receptionist role
    if let Err(e) = state.relationship_store.add("role:receptionist", "can_access", "app:client-app").await {
        e.log_with_operation(location, "initialize_setup");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to create role:receptionist → client-app relationship: {}", e)
            })),
        )
            .into_response();
    }
    tracing::debug!("✓ Created relationship: role:receptionist → can_access → app:client-app");

    // Admin role assignment is already done via Zanzibar relationship above
    // No need to insert into user_roles table anymore

    // Verify relationships were created
    tracing::info!("Verifying relationships for super admin user {}", admin_user.id);
    let mut verified_count = 0;
    let mut failed_verifications = Vec::new();
    
    let relationships_to_verify = vec![
        (user_str.as_str(), "owner", org_str.as_str()),
        (user_str.as_str(), "member", org_str.as_str()),
        (user_str.as_str(), "has_role", "role:admin"),
        (user_str.as_str(), "can_access", "app:admin-ui"),
        (user_str.as_str(), "can_access", "app:client-app"),
        (user_str.as_str(), "can_access", "app:mobile"),
    ];
    
    let total_relationships = relationships_to_verify.len();
    for (user, relation, object) in relationships_to_verify {
        match state.relationship_store.check(user, relation, object).await {
            Ok(true) => {
                verified_count += 1;
                tracing::debug!("✓ Verified relationship: {} → {} → {}", user, relation, object);
            }
            Ok(false) => {
                failed_verifications.push(format!("{} → {} → {}", user, relation, object));
                tracing::warn!("✗ Failed to verify relationship: {} → {} → {}", user, relation, object);
            }
            Err(e) => {
                failed_verifications.push(format!("{} → {} → {} (error: {})", user, relation, object, e));
                tracing::warn!("✗ Error verifying relationship: {} → {} → {}: {}", user, relation, object, e);
            }
        }
    }
    
    tracing::info!(
        "Relationship verification complete: {}/{} relationships verified for user {}",
        verified_count,
        total_relationships,
        admin_user.id
    );
    
    if !failed_verifications.is_empty() {
        tracing::warn!(
            "Some relationships failed verification: {:?}",
            failed_verifications
        );
    }

    (
        StatusCode::OK,
        Json(SetupResponse {
            success: true,
            message: format!(
                "Setup completed successfully. {} relationships created and verified.",
                verified_count
            ),
            organization_id: org_id,
            admin_user_id: admin_user.id,
        }),
    )
        .into_response()
}

/// Check setup status
pub async fn check_setup_status(
    State(state): State<Arc<ConcreteAppState>>,
) -> impl IntoResponse {
    let location = concat!(file!(), ":", line!());
    match state.setup_repository.is_setup_completed().await {
        Ok(is_completed) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "setup_completed": is_completed
            })),
        )
            .into_response(),
        Err(e) => {
            e.log_with_operation(location, "check_setup_status");
            (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to check setup status: {}", e)
            })),
        )
                .into_response()
        }
    }
}

