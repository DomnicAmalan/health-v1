//! Test helpers for vault integration tests

use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::oneshot;
use uuid::Uuid;
use tempfile::TempDir;
use std::time::Duration;

use rustyvault_service::{
    config::{VaultSettings, ServerConfig, DatabaseConfig, BarrierConfig, SealConfig, StorageConfig, MountsConfig},
    core::{VaultCore, SealConfig as CoreSealConfig},
    http::routes::{create_router, AppState},
    modules::{
        policy::PolicyStore,
        auth::{TokenStore, UserPassBackend, AppRoleBackend},
        realm::{RealmStore, RealmApplicationStore},
        kv::KvBackend,
    },
    storage::{StorageAdapter, BarrierStore, MetadataStore, physical_file::FileBackend, barrier_aes_gcm::AESGCMBarrier},
    services::key_storage::KeyStorage,
};
use shared::infrastructure::database::create_pool_with_options;
use shared::config::{LoggingConfig, DeploymentConfig, deployment::{DeploymentEnvironment, CloudProvider}};

/// Test server configuration
pub struct TestServer {
    pub addr: SocketAddr,
    pub shutdown: oneshot::Sender<()>,
}

/// Test environment with cleanup
pub struct TestEnv {
    pub server: TestServer,
    pub client: reqwest::Client,
    pub base_url: String,
    pub temp_dir: TempDir,
    pub database_url: String,
}

impl TestEnv {
    pub async fn shutdown(self) {
        let _ = self.shutdown.send(());
    }
}

/// Setup test database pool
pub async fn setup_test_database(database_url: &str) -> sqlx::PgPool {
    let pool = create_pool_with_options(
        database_url,
        5,
        1,
        Duration::from_secs(10),
    )
    .await
    .expect("Failed to create test database pool");
    
    // Run migrations if needed
    // sqlx::migrate!("../../migrations").run(&pool).await.expect("Failed to run migrations");
    
    pool
}

/// Setup test vault storage (async version)
pub async fn setup_test_storage_async(
    database_url: &str,
    storage_path: &str,
) -> Arc<StorageAdapter> {
    let pool = setup_test_database(database_url).await;
    let physical_backend = Arc::new(
        FileBackend::new(storage_path)
            .expect("Failed to create test file backend")
    );
    
    let barrier = Arc::new(AESGCMBarrier::new(physical_backend.clone()));
    let metadata_store = Arc::new(MetadataStore::new(Arc::new(pool.clone())));
    let barrier_store = Arc::new(BarrierStore::with_barrier(barrier.clone()));
    
    Arc::new(StorageAdapter::new(metadata_store, barrier_store))
}

/// Create test vault core
pub async fn setup_test_vault_core(
    database_url: &str,
    storage_path: &str,
) -> Arc<VaultCore> {
    let pool = setup_test_database(database_url).await;
    let physical_backend = Arc::new(
        FileBackend::new(storage_path)
            .expect("Failed to create test file backend")
    );
    
    let barrier = Arc::new(AESGCMBarrier::new(physical_backend.clone()));
    let metadata_store = Arc::new(MetadataStore::new(Arc::new(pool.clone())));
    let barrier_store = Arc::new(BarrierStore::with_barrier(barrier.clone()));
    let storage_adapter = Arc::new(StorageAdapter::new(metadata_store, barrier_store));
    
    let vault_core = Arc::new(VaultCore::with_barrier(storage_adapter, barrier.clone()));
    
    // Register default KV backend at "secret" mount
    let kv_backend = Arc::new(KvBackend::new(
        barrier_store.barrier(),
        "secret".to_string(),
    ));
    vault_core.router.add_backend("secret".to_string(), kv_backend);
    
    vault_core
}

/// Create test app state
pub async fn setup_test_app_state(
    database_url: &str,
    storage_path: &str,
) -> Arc<AppState> {
    let pool = setup_test_database(database_url).await;
    let vault_core = setup_test_vault_core(database_url, storage_path).await;
    
    let policy_store = Arc::new(PolicyStore::new(pool.clone()));
    policy_store.init().await.expect("Failed to initialize policy store");
    
    let token_store = Arc::new(TokenStore::new(pool.clone()));
    let userpass_backend = Arc::new(UserPassBackend::new(pool.clone(), "auth/userpass".to_string()));
    let approle_backend = Arc::new(AppRoleBackend::new(pool.clone(), "auth/approle".to_string()));
    let realm_store = Arc::new(RealmStore::new(pool.clone()));
    let app_store = Arc::new(RealmApplicationStore::new(pool.clone()));
    let key_storage = Arc::new(KeyStorage::new());
    
    Arc::new(AppState {
        core: vault_core,
        policy_store: Some(policy_store),
        token_store: Some(token_store),
        userpass: Some(userpass_backend),
        approle_backend: Some(approle_backend),
        realm_store: Some(realm_store),
        app_store: Some(app_store),
        key_storage,
    })
}

/// Create test settings
pub fn create_test_settings(port: u16, database_url: &str, storage_path: &str) -> VaultSettings {
    VaultSettings {
        server: ServerConfig {
            host: "127.0.0.1".to_string(),
            port,
            cors_allowed_origins: vec!["*".to_string()],
        },
        database: DatabaseConfig {
            url: database_url.to_string(),
            max_connections: 5,
            min_connections: 1,
        },
        logging: LoggingConfig {
            level: "error".to_string(),
            rust_log: "error".to_string(),
        },
        deployment: DeploymentConfig {
            environment: shared::config::deployment::DeploymentEnvironment::Development,
            cloud_provider: shared::config::deployment::CloudProvider::None,
        },
        barrier: BarrierConfig {
            algorithm: "aes-gcm".to_string(),
            key_length: 32,
        },
        seal: SealConfig {
            secret_shares: 5,
            secret_threshold: 3,
        },
        storage: StorageConfig {
            backend: "file".to_string(),
            path: Some(storage_path.to_string()),
        },
        mounts: MountsConfig {
            default_lease_ttl: 2764800,
            max_lease_ttl: 2764800,
        },
    }
}

/// Start test HTTP server
pub async fn start_test_server(
    app_state: Arc<AppState>,
    settings: VaultSettings,
) -> TestServer {
    let router = create_router(app_state, &settings);
    let addr = SocketAddr::from(([127, 0, 0, 1], settings.server.port));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind test server");
    
    let (shutdown_tx, mut shutdown_rx) = oneshot::channel::<()>();
    
    let server_handle = tokio::spawn(async move {
        let mut shutdown = shutdown_rx;
        axum::serve(listener, router)
            .with_graceful_shutdown(async {
                shutdown.await.ok();
            })
            .await
            .expect("Test server failed");
    });
    
    // Give server a moment to start
    tokio::time::sleep(Duration::from_millis(100)).await;
    
    TestServer {
        addr,
        shutdown: shutdown_tx,
    }
}

/// Create complete test environment
pub async fn create_test_env() -> TestEnv {
    // Create temporary directory for storage
    let temp_dir = tempfile::tempdir().expect("Failed to create temp directory");
    let storage_path = temp_dir.path().join("vault-data").to_str().unwrap().to_string();
    
    // Use test database (should be set via DATABASE_URL env var)
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://localhost/health_v1_test".to_string());
    
    // Find available port
    let port = find_available_port().await;
    
    let settings = create_test_settings(port, &database_url, &storage_path);
    let app_state = setup_test_app_state(&database_url, &storage_path).await;
    let server = start_test_server(app_state, settings.clone()).await;
    
    let base_url = format!("http://{}", server.addr);
    let client = create_test_client(&base_url);
    
    TestEnv {
        server,
        client,
        base_url,
        temp_dir,
        database_url,
    }
}

/// Find available port
async fn find_available_port() -> u16 {
    use std::net::TcpListener;
    let listener = TcpListener::bind("127.0.0.1:0").expect("Failed to bind");
    listener.local_addr().unwrap().port()
}

/// Create test HTTP client
pub fn create_test_client(base_url: &str) -> reqwest::Client {
    reqwest::Client::builder()
        .base_url(base_url.parse().unwrap())
        .build()
        .unwrap()
}

/// Helper to make authenticated request
pub fn add_auth_header(
    request: reqwest::RequestBuilder,
    token: Option<&str>,
) -> reqwest::RequestBuilder {
    if let Some(token) = token {
        request.header("X-Vault-Token", token)
    } else {
        request
    }
}

/// Helper to decode base64 unseal key
pub fn decode_unseal_key(key_base64: &str) -> Vec<u8> {
    base64::engine::general_purpose::STANDARD
        .decode(key_base64)
        .expect("Failed to decode unseal key")
}

/// Helper to encode unseal key to base64
pub fn encode_unseal_key(key: &[u8]) -> String {
    base64::engine::general_purpose::STANDARD.encode(key)
}

/// Initialize vault for testing
pub async fn init_vault_for_test(
    client: &reqwest::Client,
    secret_shares: u8,
    secret_threshold: u8,
) -> serde_json::Value {
    let response = client
        .post("/v1/sys/init")
        .json(&serde_json::json!({
            "secret_shares": secret_shares,
            "secret_threshold": secret_threshold,
        }))
        .send()
        .await
        .expect("Failed to initialize vault");
    
    assert!(response.status().is_success(), "Vault initialization failed");
    response.json().await.expect("Failed to parse init response")
}

/// Unseal vault with keys
pub async fn unseal_vault_with_keys(
    client: &reqwest::Client,
    keys: &[String],
) -> bool {
    let mut unsealed = false;
    for key in keys {
        let response = client
            .post("/v1/sys/unseal")
            .json(&serde_json::json!({ "key": key }))
            .send()
            .await
            .expect("Failed to unseal vault");
        
        assert!(response.status().is_success(), "Unseal request failed");
        let result: serde_json::Value = response.json().await.expect("Failed to parse unseal response");
        unsealed = result.get("sealed")
            .and_then(|v| v.as_bool())
            .map(|s| !s)
            .unwrap_or(false);
        
        if unsealed {
            break;
        }
    }
    unsealed
}

/// Initialize and unseal vault for testing
pub async fn setup_initialized_vault(
    client: &reqwest::Client,
    secret_shares: u8,
    secret_threshold: u8,
) -> (String, Vec<String>) {
    let init_response = init_vault_for_test(client, secret_shares, secret_threshold).await;
    
    let root_token = init_response
        .get("root_token")
        .and_then(|v| v.as_str())
        .expect("No root_token in init response")
        .to_string();
    
    let keys: Vec<String> = init_response
        .get("keys_base64")
        .and_then(|v| v.as_array())
        .expect("No keys_base64 in init response")
        .iter()
        .filter_map(|v| v.as_str().map(|s| s.to_string()))
        .collect();
    
    // Unseal with threshold keys
    let keys_to_use: Vec<String> = keys.iter().take(secret_threshold as usize).cloned().collect();
    unseal_vault_with_keys(client, &keys_to_use).await;
    
    (root_token, keys)
}

/// Cleanup test database (truncate tables)
pub async fn cleanup_test_database(database_url: &str) {
    let pool = setup_test_database(database_url).await;
    
    // Truncate vault-related tables
    sqlx::query("TRUNCATE TABLE vault_tokens CASCADE")
        .execute(&pool)
        .await
        .ok();
    sqlx::query("TRUNCATE TABLE vault_userpass_users CASCADE")
        .execute(&pool)
        .await
        .ok();
    sqlx::query("TRUNCATE TABLE vault_approles CASCADE")
        .execute(&pool)
        .await
        .ok();
    sqlx::query("TRUNCATE TABLE vault_approle_secret_ids CASCADE")
        .execute(&pool)
        .await
        .ok();
    sqlx::query("TRUNCATE TABLE vault_policies CASCADE")
        .execute(&pool)
        .await
        .ok();
    sqlx::query("TRUNCATE TABLE vault_realms CASCADE")
        .execute(&pool)
        .await
        .ok();
    sqlx::query("TRUNCATE TABLE vault_realm_applications CASCADE")
        .execute(&pool)
        .await
        .ok();
}

/// Get test database URL from environment or use default for docker-compose
pub fn get_test_database_url() -> String {
    std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| {
            // Default to docker-compose test postgres
            "postgresql://test_user:test_password@localhost:5433/vault_test_db".to_string()
        })
}

/// Get test vault service URL from environment or use default for docker-compose
pub fn get_test_vault_url() -> String {
    std::env::var("VAULT_TEST_URL")
        .unwrap_or_else(|_| {
            // Default to docker-compose test vault service
            "http://localhost:8217".to_string()
        })
}

/// Wait for docker-compose service to be ready
/// Checks health endpoint or database connectivity
pub async fn wait_for_service_ready(
    service_url: &str,
    health_path: Option<&str>,
    max_retries: u32,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let health_path = health_path.unwrap_or("/v1/sys/health");
    let health_url = format!("{}{}", service_url, health_path);
    
    for i in 0..max_retries {
        match client.get(&health_url).send().await {
            Ok(response) if response.status().is_success() => {
                return Ok(());
            }
            Ok(_) => {
                // Service is responding but not healthy yet
            }
            Err(_) => {
                // Service not ready yet
            }
        }
        
        if i < max_retries - 1 {
            tokio::time::sleep(Duration::from_secs(1)).await;
        }
    }
    
    Err(format!("Service at {} not ready after {} retries", service_url, max_retries))
}

/// Wait for PostgreSQL to be ready
pub async fn wait_for_postgres_ready(
    database_url: &str,
    max_retries: u32,
) -> Result<(), String> {
    for i in 0..max_retries {
        match setup_test_database(database_url).await {
            pool => {
                // Try a simple query
                match sqlx::query("SELECT 1").execute(&pool).await {
                    Ok(_) => return Ok(()),
                    Err(_) => {}
                }
            }
        }
        
        if i < max_retries - 1 {
            tokio::time::sleep(Duration::from_secs(1)).await;
        }
    }
    
    Err(format!("PostgreSQL at {} not ready after {} retries", database_url, max_retries))
}

/// Create test client connected to docker-compose vault service
pub fn create_docker_compose_test_client() -> reqwest::Client {
    let vault_url = get_test_vault_url();
    reqwest::Client::builder()
        .base_url(vault_url.parse().expect("Invalid vault URL"))
        .timeout(Duration::from_secs(30))
        .build()
        .expect("Failed to create test client")
}

/// Setup test environment using docker-compose services
pub async fn create_docker_compose_test_env() -> Result<reqwest::Client, String> {
    // Wait for services to be ready
    let database_url = get_test_database_url();
    let vault_url = get_test_vault_url();
    
    // Wait for postgres
    wait_for_postgres_ready(&database_url, 30).await?;
    
    // Wait for vault service
    wait_for_service_ready(&vault_url, Some("/v1/sys/health"), 30).await?;
    
    // Create client
    Ok(create_docker_compose_test_client())
}
