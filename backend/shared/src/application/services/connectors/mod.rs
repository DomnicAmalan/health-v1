//! Workflow Connectors - MuleSoft/n8n-style module integrations
//!
//! Connectors allow workflow Action nodes to call external systems:
//! - OPD (create visit, update queue status)
//! - Pharmacy (create prescription, dispense medication)
//! - Billing (create invoice, add items, finalize)
//! - HTTP (call any REST API)
//! - Database (execute SQL queries)

use async_trait::async_trait;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;

use crate::shared::{AppError, AppResult};

pub mod opd_connector;
pub mod pharmacy_connector;
pub mod billing_connector;
pub mod http_connector;

pub use opd_connector::OPDConnector;
pub use pharmacy_connector::PharmacyConnector;
pub use billing_connector::BillingConnector;
pub use http_connector::HTTPConnector;

/// Connector trait - interface for all workflow connectors
/// Similar to MuleSoft's connector pattern
#[async_trait]
pub trait Connector: Send + Sync {
    /// Connector ID (e.g., "opd", "pharmacy", "billing")
    fn name(&self) -> &str;

    /// Display name (e.g., "OPD Connector")
    fn display_name(&self) -> &str {
        self.name()
    }

    /// Connector description
    fn description(&self) -> &str {
        ""
    }

    /// Execute an action with parameters
    ///
    /// # Arguments
    /// * `action` - Action name (e.g., "createVisit", "createInvoice")
    /// * `params` - Parameters for the action as JSON
    ///
    /// # Returns
    /// Result data as JSON
    async fn execute(&self, action: &str, params: Value) -> AppResult<Value>;

    /// Get available actions for this connector
    fn available_actions(&self) -> Vec<ConnectorAction>;

    /// Validate parameters for an action
    fn validate_params(&self, action: &str, params: &Value) -> AppResult<()>;
}

/// Connector action metadata
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ConnectorAction {
    pub name: String,
    pub description: String,
    pub parameters: Vec<ConnectorParameter>,
}

/// Connector parameter metadata
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ConnectorParameter {
    pub name: String,
    pub param_type: String,
    pub required: bool,
    pub description: String,
}

/// Connector metadata for API responses
#[derive(Debug, Clone, serde::Serialize)]
pub struct ConnectorMetadata {
    pub id: String,
    pub name: String,
    pub description: String,
    pub actions: Vec<ConnectorAction>,
}

/// Connector registry - manages all available connectors
pub struct ConnectorRegistry {
    connectors: HashMap<String, Arc<dyn Connector>>,
}

impl ConnectorRegistry {
    /// Create a new connector registry
    pub fn new() -> Self {
        Self {
            connectors: HashMap::new(),
        }
    }

    /// Register a connector
    pub fn register(&mut self, connector: Arc<dyn Connector>) {
        self.connectors.insert(connector.name().to_string(), connector);
    }

    /// Get a connector by name
    pub fn get(&self, name: &str) -> Option<Arc<dyn Connector>> {
        self.connectors.get(name).cloned()
    }

    /// Execute a connector action
    pub async fn execute(&self, connector_name: &str, action: &str, params: Value) -> AppResult<Value> {
        let connector = self.get(connector_name)
            .ok_or_else(|| AppError::NotFound(format!("Connector not found: {}", connector_name)))?;

        connector.execute(action, params).await
    }

    /// List all available connectors
    pub fn list_connectors(&self) -> Vec<String> {
        self.connectors.keys().cloned().collect()
    }

    /// Get metadata for all connectors
    pub fn get_all_metadata(&self) -> Vec<ConnectorMetadata> {
        self.connectors.values().map(|connector| {
            ConnectorMetadata {
                id: connector.name().to_string(),
                name: connector.display_name().to_string(),
                description: connector.description().to_string(),
                actions: connector.available_actions(),
            }
        }).collect()
    }
}

impl Default for ConnectorRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Create a connector registry with all built-in connectors
pub fn create_connector_registry(api_base_url: &str) -> ConnectorRegistry {
    let mut registry = ConnectorRegistry::new();

    // Register OPD connector
    registry.register(Arc::new(OPDConnector::new(api_base_url)));

    // Register Pharmacy connector
    registry.register(Arc::new(PharmacyConnector::new(api_base_url)));

    // Register Billing connector
    registry.register(Arc::new(BillingConnector::new(api_base_url)));

    // Register HTTP connector
    registry.register(Arc::new(HTTPConnector::new()));

    registry
}
