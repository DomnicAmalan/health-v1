//! HTTP Connector - Generic REST API calls (like n8n HTTP Request node)

use async_trait::async_trait;
use serde_json::{json, Value};

use super::{Connector, ConnectorAction, ConnectorParameter};
use crate::shared::{AppError, AppResult};

pub struct HTTPConnector;

impl HTTPConnector {
    pub fn new() -> Self {
        Self
    }

    async fn http_request(&self, params: Value) -> AppResult<Value> {
        let url = params.get("url")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::Validation("url required".to_string()))?;

        let method = params.get("method")
            .and_then(|v| v.as_str())
            .unwrap_or("GET");

        let body = params.get("body");

        // TODO: Make actual HTTP request using reqwest
        // For now, return mock response
        Ok(json!({
            "url": url,
            "method": method,
            "status": 200,
            "body": body,
            "executedAt": chrono::Utc::now().to_rfc3339(),
        }))
    }
}

impl Default for HTTPConnector {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Connector for HTTPConnector {
    fn name(&self) -> &str {
        "http"
    }

    fn display_name(&self) -> &str {
        "HTTP Connector"
    }

    fn description(&self) -> &str {
        "Generic REST API calls"
    }

    async fn execute(&self, action: &str, params: Value) -> AppResult<Value> {
        self.validate_params(action, &params)?;
        match action {
            "request" => self.http_request(params).await,
            _ => Err(AppError::Validation(format!("Unknown HTTP action: {}", action))),
        }
    }

    fn available_actions(&self) -> Vec<ConnectorAction> {
        vec![
            ConnectorAction {
                name: "request".to_string(),
                description: "Make an HTTP request".to_string(),
                parameters: vec![
                    ConnectorParameter {
                        name: "url".to_string(),
                        param_type: "string".to_string(),
                        required: true,
                        description: "Request URL".to_string(),
                    },
                    ConnectorParameter {
                        name: "method".to_string(),
                        param_type: "string".to_string(),
                        required: false,
                        description: "HTTP method (GET, POST, PUT, DELETE)".to_string(),
                    },
                    ConnectorParameter {
                        name: "body".to_string(),
                        param_type: "object".to_string(),
                        required: false,
                        description: "Request body (JSON)".to_string(),
                    },
                    ConnectorParameter {
                        name: "headers".to_string(),
                        param_type: "object".to_string(),
                        required: false,
                        description: "HTTP headers".to_string(),
                    },
                ],
            },
        ]
    }

    fn validate_params(&self, _action: &str, _params: &Value) -> AppResult<()> {
        Ok(())
    }
}
