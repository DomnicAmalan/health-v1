//! Billing Connector - Invoice and payment management

use async_trait::async_trait;
use serde_json::{json, Value};

use super::{Connector, ConnectorAction, ConnectorParameter};
use crate::shared::{AppError, AppResult};

pub struct BillingConnector {
    api_base_url: String,
}

impl BillingConnector {
    pub fn new(api_base_url: &str) -> Self {
        Self {
            api_base_url: api_base_url.to_string(),
        }
    }

    async fn create_invoice(&self, params: Value) -> AppResult<Value> {
        let patient_id = params.get("patientId")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::Validation("patientId required".to_string()))?;

        Ok(json!({
            "invoiceId": format!("INV{}", chrono::Utc::now().timestamp()),
            "patientId": patient_id,
            "status": "draft",
            "subtotal": 0,
            "total": 0,
            "createdAt": chrono::Utc::now().to_rfc3339(),
        }))
    }

    async fn add_invoice_item(&self, params: Value) -> AppResult<Value> {
        let invoice_id = params.get("invoiceId")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::Validation("invoiceId required".to_string()))?;

        let service_code = params.get("serviceCode")
            .and_then(|v| v.as_str())
            .unwrap_or("MISC");

        let amount = params.get("amount")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);

        Ok(json!({
            "invoiceId": invoice_id,
            "itemId": format!("ITEM{}", chrono::Utc::now().timestamp()),
            "serviceCode": service_code,
            "amount": amount,
            "addedAt": chrono::Utc::now().to_rfc3339(),
        }))
    }

    async fn finalize_invoice(&self, params: Value) -> AppResult<Value> {
        let invoice_id = params.get("invoiceId")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::Validation("invoiceId required".to_string()))?;

        Ok(json!({
            "invoiceId": invoice_id,
            "status": "finalized",
            "finalizedAt": chrono::Utc::now().to_rfc3339(),
        }))
    }
}

#[async_trait]
impl Connector for BillingConnector {
    fn name(&self) -> &str {
        "billing"
    }

    fn display_name(&self) -> &str {
        "Billing Connector"
    }

    fn description(&self) -> &str {
        "Invoice and payment management"
    }

    async fn execute(&self, action: &str, params: Value) -> AppResult<Value> {
        self.validate_params(action, &params)?;
        match action {
            "createInvoice" => self.create_invoice(params).await,
            "addInvoiceItem" => self.add_invoice_item(params).await,
            "finalizeInvoice" => self.finalize_invoice(params).await,
            _ => Err(AppError::Validation(format!("Unknown billing action: {}", action))),
        }
    }

    fn available_actions(&self) -> Vec<ConnectorAction> {
        vec![
            ConnectorAction {
                name: "createInvoice".to_string(),
                description: "Create a new invoice".to_string(),
                parameters: vec![
                    ConnectorParameter {
                        name: "patientId".to_string(),
                        param_type: "string".to_string(),
                        required: true,
                        description: "Patient ID".to_string(),
                    },
                ],
            },
            ConnectorAction {
                name: "addInvoiceItem".to_string(),
                description: "Add item to invoice".to_string(),
                parameters: vec![
                    ConnectorParameter {
                        name: "invoiceId".to_string(),
                        param_type: "string".to_string(),
                        required: true,
                        description: "Invoice ID".to_string(),
                    },
                    ConnectorParameter {
                        name: "serviceCode".to_string(),
                        param_type: "string".to_string(),
                        required: false,
                        description: "Service code".to_string(),
                    },
                    ConnectorParameter {
                        name: "amount".to_string(),
                        param_type: "number".to_string(),
                        required: false,
                        description: "Amount".to_string(),
                    },
                ],
            },
            ConnectorAction {
                name: "finalizeInvoice".to_string(),
                description: "Finalize invoice for payment".to_string(),
                parameters: vec![
                    ConnectorParameter {
                        name: "invoiceId".to_string(),
                        param_type: "string".to_string(),
                        required: true,
                        description: "Invoice ID".to_string(),
                    },
                ],
            },
        ]
    }

    fn validate_params(&self, _action: &str, _params: &Value) -> AppResult<()> {
        Ok(())
    }
}
