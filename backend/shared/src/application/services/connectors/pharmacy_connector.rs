//! Pharmacy Connector - Prescription and medication management

use async_trait::async_trait;
use serde_json::{json, Value};

use super::{Connector, ConnectorAction, ConnectorParameter};
use crate::shared::{AppError, AppResult};

pub struct PharmacyConnector {
    api_base_url: String,
}

impl PharmacyConnector {
    pub fn new(api_base_url: &str) -> Self {
        Self {
            api_base_url: api_base_url.to_string(),
        }
    }

    async fn create_prescription(&self, params: Value) -> AppResult<Value> {
        let patient_id = params.get("patientId")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::Validation("patientId required".to_string()))?;

        Ok(json!({
            "prescriptionId": format!("RX{}", chrono::Utc::now().timestamp()),
            "patientId": patient_id,
            "status": "pending_verification",
            "createdAt": chrono::Utc::now().to_rfc3339(),
        }))
    }

    async fn dispense_medication(&self, params: Value) -> AppResult<Value> {
        let prescription_id = params.get("prescriptionId")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::Validation("prescriptionId required".to_string()))?;

        Ok(json!({
            "prescriptionId": prescription_id,
            "status": "dispensed",
            "dispensedAt": chrono::Utc::now().to_rfc3339(),
        }))
    }
}

#[async_trait]
impl Connector for PharmacyConnector {
    fn name(&self) -> &str {
        "pharmacy"
    }

    fn display_name(&self) -> &str {
        "Pharmacy Connector"
    }

    fn description(&self) -> &str {
        "Prescription and medication management"
    }

    async fn execute(&self, action: &str, params: Value) -> AppResult<Value> {
        self.validate_params(action, &params)?;
        match action {
            "createPrescription" => self.create_prescription(params).await,
            "dispenseMedication" => self.dispense_medication(params).await,
            _ => Err(AppError::Validation(format!("Unknown pharmacy action: {}", action))),
        }
    }

    fn available_actions(&self) -> Vec<ConnectorAction> {
        vec![
            ConnectorAction {
                name: "createPrescription".to_string(),
                description: "Create a new prescription".to_string(),
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
                name: "dispenseMedication".to_string(),
                description: "Dispense medication from prescription".to_string(),
                parameters: vec![
                    ConnectorParameter {
                        name: "prescriptionId".to_string(),
                        param_type: "string".to_string(),
                        required: true,
                        description: "Prescription ID".to_string(),
                    },
                ],
            },
        ]
    }

    fn validate_params(&self, _action: &str, _params: &Value) -> AppResult<()> {
        Ok(())
    }
}
