//! Test helpers for vault integration tests

use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::oneshot;
use uuid::Uuid;

use rustyvault_service::{
    config::VaultSettings,
    core::VaultCore,
    http::routes::create_router,
    modules::policy::PolicyStore,
    modules::realm::RealmStore,
    storage::{StorageAdapter, BarrierStore, MetadataStore, physical_file::FileBackend, barrier_aes_gcm::AESGCMBarrier},
};
use shared::infrastructure::database::create_pool_with_options;
use std::time::Duration;
use base64::engine::Engine;

/// Test server configuration
pub struct TestServer {
    pub addr: SocketAddr,
    pub shutdown: oneshot::Sender<()>,
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

/// Setup test vault storage
pub async fn setup_test_storage(storage_path: &str, database_url: &str) -> Arc<StorageAdapter> {
    let physical_backend = Arc::new(
        FileBackend::new(storage_path)
            .expect("Failed to create test file backend")
    );
    
    let barrier = Arc::new(AESGCMBarrier::new(physical_backend.clone()));
    let barrier_store = Arc::new(BarrierStore::with_barrier(barrier.clone()));
    
    let pool = setup_test_database(database_url).await;
    Arc::new(StorageAdapter::new(
        Arc::new(MetadataStore::new(Arc::new(pool))),
        barrier_store.clone(),
    ))
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
    
    Arc::new(VaultCore::with_barrier(storage_adapter, barrier))
}

/// Create test HTTP client
pub fn create_test_client(_base_url: &str) -> reqwest::Client {
    reqwest::Client::builder()
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
