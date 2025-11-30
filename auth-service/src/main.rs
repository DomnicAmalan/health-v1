mod config;
mod shared;
mod domain;
mod infrastructure;
mod application;
mod presentation;

use std::net::SocketAddr;
use std::sync::Arc;
use tracing::info;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load environment variables
    dotenv::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Load configuration
    let settings = config::Settings::from_env()
        .map_err(|e| format!("Failed to load configuration: {}", e))?;

    info!("Starting auth-service on {}:{}", settings.server.host, settings.server.port);

    // Initialize database connection
    info!("Connecting to database...");
    let pool = sqlx::PgPool::connect(&settings.database.url).await
        .map_err(|e| format!("Failed to connect to database: {}", e))?;
    
    // Run migrations
    info!("Running database migrations...");
    let migrations_dir = std::path::Path::new("./migrations");
    infrastructure::database::migrations::run_migrations(&pool, migrations_dir).await
        .map_err(|e| format!("Failed to run migrations: {}", e))?;
    
    info!("Database migrations completed");

    // Initialize repositories (we'll create instances as needed for use cases)
    // Note: Each use case gets its own repository instance sharing the same pool

    // Initialize token manager (create multiple instances for different use cases)
    let token_manager_for_state = infrastructure::oidc::TokenManager::new(
        &settings.oidc.jwt_secret,
        settings.oidc.issuer.clone(),
        settings.oidc.jwt_expiration,
    );
    let token_manager_arc = Arc::new(token_manager_for_state);
    
    let token_manager_clone = infrastructure::oidc::TokenManager::new(
        &settings.oidc.jwt_secret,
        settings.oidc.issuer.clone(),
        settings.oidc.jwt_expiration,
    );
    
    let token_manager_clone2 = infrastructure::oidc::TokenManager::new(
        &settings.oidc.jwt_secret,
        settings.oidc.issuer.clone(),
        settings.oidc.jwt_expiration,
    );

    // Initialize use cases
    let get_permissions_use_case = application::use_cases::auth::GetUserPermissionsUseCase::new(
        Box::new(infrastructure::repositories::UserRepositoryImpl::new(pool.clone())),
        Box::new(infrastructure::repositories::RoleRepositoryImpl::new(pool.clone())),
        Box::new(infrastructure::repositories::PermissionRepositoryImpl::new(pool.clone())),
    );

    let login_use_case = Arc::new(application::use_cases::auth::LoginUseCase::new(
        Box::new(infrastructure::repositories::UserRepositoryImpl::new(pool.clone())),
        Box::new(infrastructure::repositories::RefreshTokenRepositoryImpl::new(pool.clone())),
        Box::new(infrastructure::repositories::RoleRepositoryImpl::new(pool.clone())),
        Box::new(infrastructure::repositories::PermissionRepositoryImpl::new(pool.clone())),
        token_manager_clone,
    ));

    let refresh_token_use_case = Arc::new(application::use_cases::auth::RefreshTokenUseCase::new(
        Box::new(infrastructure::repositories::UserRepositoryImpl::new(pool.clone())),
        Box::new(infrastructure::repositories::RefreshTokenRepositoryImpl::new(pool.clone())),
        token_manager_clone2,
    ));

    let logout_use_case = Arc::new(application::use_cases::auth::LogoutUseCase::new(
        Box::new(infrastructure::repositories::RefreshTokenRepositoryImpl::new(pool.clone())),
    ));

    let userinfo_use_case = Arc::new(application::use_cases::auth::UserInfoUseCase::new(
        Box::new(infrastructure::repositories::UserRepositoryImpl::new(pool.clone())),
        get_permissions_use_case,
    ));

    // Initialize Zanzibar services
    let relationship_store = Arc::new(infrastructure::zanzibar::RelationshipStore::new(
        Box::new(infrastructure::repositories::RelationshipRepositoryImpl::new(pool.clone())),
    ));
    
    let permission_checker = Arc::new(infrastructure::zanzibar::PermissionChecker::new(
        infrastructure::zanzibar::RelationshipStore::new(
            Box::new(infrastructure::repositories::RelationshipRepositoryImpl::new(pool.clone())),
        ),
    ));

    // Create application state
    let app_state = shared::AppState {
        login_use_case,
        refresh_token_use_case,
        logout_use_case,
        userinfo_use_case,
        token_manager: token_manager_arc,
        permission_checker,
        relationship_store,
    };

    // Build application router with state and CORS
    let app = presentation::api::routes::create_router()
        .with_state(Arc::new(app_state))
        .layer(tower_http::cors::CorsLayer::permissive());

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], settings.server.port));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    
    info!("Server listening on {}", addr);
    axum::serve(listener, app).await?;

    Ok(())
}
