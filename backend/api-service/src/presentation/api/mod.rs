pub mod routes;
pub mod handlers;
pub mod middleware;

pub use routes::create_router;
// Re-export AppState type alias
pub type AppState = shared::AppState<
    authz_core::auth::LoginUseCase,
    authz_core::auth::RefreshTokenUseCase,
    authz_core::auth::LogoutUseCase,
    authz_core::auth::UserInfoUseCase,
    admin_service::use_cases::setup::SetupOrganizationUseCase,
    admin_service::use_cases::setup::CreateSuperAdminUseCase,
>;

