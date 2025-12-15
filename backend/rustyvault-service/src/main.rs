mod core;
mod errors;
mod logical;
mod modules;
mod router;
mod storage;
mod http;
mod config;
mod shamir;
mod services;

use std::net::SocketAddr;
use std::sync::Arc;
use tracing::info;

fn main() -> Result<(), String> {
    let rt = shared::infrastructure::runtime::create_runtime()?;
    rt.block_on(async_main())
}

async fn async_main() -> Result<(), String> {
    // Load environment variables
    dotenv::dotenv().ok();

    // Load configuration
    let settings = config::VaultSettings::from_env()
        .map_err(|e| {
            eprintln!("Failed to load configuration: {}", e);
            format!("Failed to load configuration: {}", e)
        })?;

    // Initialize logger with settings and deployment config (single point of control for dev mode)
    shared::infrastructure::logging::init_from_settings_with_deployment(
        &settings.logging,
        &settings.deployment,
    );

    info!("Starting rustyvault-service on {}:{}", settings.server.host, settings.server.port);

    // Initialize database connection
    info!("Connecting to database...");
    use std::time::Duration;
    let pool = shared::infrastructure::database::create_pool_with_options(
        &settings.database.url,
        settings.database.max_connections,
        settings.database.min_connections,
        Duration::from_secs(10),
    )
    .await
    .map_err(|e| format!("Failed to connect to database: {}", e))?;
    info!("Database pool configured: max={}, min={}", 
        settings.database.max_connections, 
        settings.database.min_connections);
    
    // Verify database health
    let database_service = Arc::new(shared::infrastructure::database::DatabaseService::new(pool.clone()));
    database_service.health_check().await
        .map_err(|e| format!("Database health check failed: {}", e))?;
    info!("Database health check passed");
    
    // Note: Migrations are handled by api-service which shares the same database.
    // rustyvault-service expects the database schema to already be set up.
    info!("Skipping migrations (handled by api-service)");

    // Initialize physical storage for barrier data
    let storage_path = settings.storage.path.clone()
        .unwrap_or_else(|| "./vault-data".to_string());
    let physical_backend = Arc::new(storage::physical_file::FileBackend::new(&storage_path)
        .map_err(|e| format!("Failed to create file backend: {}", e))?);

    // Initialize storage
    let metadata_store = Arc::new(storage::MetadataStore::new(Arc::new(pool.clone())));
    
    // Create barrier once and share it between BarrierStore and VaultCore
    let barrier = Arc::new(storage::barrier_aes_gcm::AESGCMBarrier::new(physical_backend.clone()));
    let barrier_store = Arc::new(storage::BarrierStore::with_barrier(barrier.clone()));
    let storage_adapter = Arc::new(storage::StorageAdapter::new(
        metadata_store,
        barrier_store.clone(),
    ));

    // Initialize vault core with the same barrier instance
    let vault_core = Arc::new(core::VaultCore::with_barrier(storage_adapter, barrier.clone()));
    
    // Register default KV backend at "secret" mount
    let kv_backend = Arc::new(modules::kv::KvBackend::new(
        barrier_store.barrier(),
        "secret".to_string(),
    ));
    vault_core.router.add_backend("secret".to_string(), kv_backend);
    
    info!("Vault core initialized");

    // Initialize policy store
    let policy_store = Arc::new(modules::policy::PolicyStore::new(pool.clone()));
    policy_store.init().await
        .map_err(|e| format!("Failed to initialize policy store: {}", e))?;
    info!("Policy store initialized");

    // Initialize token store
    let token_store = Arc::new(modules::auth::TokenStore::new(pool.clone()));
    info!("Token store initialized");

    // Initialize UserPass backend
    let userpass_backend = Arc::new(modules::auth::UserPassBackend::new(
        pool.clone(),
        "auth/userpass",
    ));
    info!("UserPass backend initialized");

    // Initialize Realm store
    let realm_store = Arc::new(modules::realm::RealmStore::new(pool.clone()));
    info!("Realm store initialized");

    // Initialize Realm Application store
    let app_store = Arc::new(modules::realm::RealmApplicationStore::new(pool.clone()));
    info!("Realm application store initialized");

    // Initialize key storage for temporary credential storage
    let key_storage = Arc::new(crate::services::key_storage::KeyStorage::new());
    info!("Key storage service initialized");

    // Create app state
    let app_state = Arc::new(http::routes::AppState {
        core: vault_core,
        policy_store: Some(policy_store),
        token_store: Some(token_store),
        userpass: Some(userpass_backend),
        realm_store: Some(realm_store),
        app_store: Some(app_store),
        key_storage,
    });

    // Create router - using closures to capture state
    let app = http::routes::create_router(app_state, &settings);

    // Start server - need to convert Router<Arc<AppState>> to service
    let addr = SocketAddr::from(([0, 0, 0, 0], settings.server.port));
    let listener = tokio::net::TcpListener::bind(addr).await
        .map_err(|e| format!("Failed to bind to address {}: {}", addr, e))?;
    
    info!("RustyVault service listening on {}", addr);
    // Router<Arc<AppState>> needs IntoMakeService - the router has state already filled
    axum::serve(listener, app).await
        .map_err(|e| format!("Server error: {}", e))?;
    
    Ok(())
}

