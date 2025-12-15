//! Realm module
//!
//! Provides multi-tenancy isolation in Vault. Each realm is a completely
//! isolated namespace that contains policies, applications, auth methods,
//! secrets, and mounts.

mod app_store;
mod realm_store;

pub use app_store::{
    AppType,
    AuthMethod,
    CreateAppRequest,
    RealmApplication,
    RealmApplicationStore,
    UpdateAppRequest,
};
pub use realm_store::{
    CreateRealmRequest,
    Realm,
    RealmStore,
    UpdateRealmRequest,
};

use std::sync::Arc;
use uuid::Uuid;

use crate::errors::VaultResult;

/// Realm manager for managing vault realms
pub struct RealmManager {
    store: Arc<RealmStore>,
}

impl RealmManager {
    /// Create a new realm manager
    pub fn new(store: Arc<RealmStore>) -> Self {
        Self { store }
    }

    /// Create a new realm
    pub async fn create_realm(&self, request: &CreateRealmRequest) -> VaultResult<Realm> {
        self.store.create(request).await
    }

    /// Get a realm by ID
    pub async fn get_realm(&self, id: Uuid) -> VaultResult<Option<Realm>> {
        self.store.get(id).await
    }

    /// Get a realm by name
    pub async fn get_realm_by_name(&self, name: &str) -> VaultResult<Option<Realm>> {
        self.store.get_by_name(name).await
    }

    /// Get a realm by organization ID
    pub async fn get_realm_by_organization(&self, organization_id: Uuid) -> VaultResult<Option<Realm>> {
        self.store.get_by_organization(organization_id).await
    }

    /// List all realms
    pub async fn list_realms(&self) -> VaultResult<Vec<Realm>> {
        self.store.list().await
    }

    /// List realms by organization ID
    pub async fn list_realms_by_organization(&self, organization_id: Uuid) -> VaultResult<Vec<Realm>> {
        self.store.list_by_organization(organization_id).await
    }

    /// Update a realm
    pub async fn update_realm(&self, id: Uuid, request: &UpdateRealmRequest) -> VaultResult<Realm> {
        self.store.update(id, request).await
    }

    /// Delete a realm
    pub async fn delete_realm(&self, id: Uuid) -> VaultResult<()> {
        self.store.delete(id).await
    }

    /// Get or create a realm for an organization
    pub async fn get_or_create_for_organization(
        &self,
        organization_id: Uuid,
        default_name: &str,
    ) -> VaultResult<Realm> {
        self.store.get_or_create_for_organization(organization_id, default_name).await
    }

    /// Check if a realm exists
    pub async fn exists(&self, id: Uuid) -> VaultResult<bool> {
        self.store.exists(id).await
    }

    /// Get the store reference
    pub fn store(&self) -> &Arc<RealmStore> {
        &self.store
    }
}
