//! OPD Connector - Integrates with OPD queue and visit management

use async_trait::async_trait;
use serde_json::{json, Value};

use super::{Connector, ConnectorAction, ConnectorParameter};
use crate::shared::{AppError, AppResult};

/// OPD Connector - handles OPD operations
pub struct OPDConnector {
    api_base_url: String,
}

impl OPDConnector {
    pub fn new(api_base_url: &str) -> Self {
        Self {
            api_base_url: api_base_url.to_string(),
        }
    }

    /// Create a visit record
    async fn create_visit(&self, params: Value) -> AppResult<Value> {
        let patient_id = params.get("patientId")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::Validation("patientId required".to_string()))?;

        let visit_type = params.get("visitType")
            .and_then(|v| v.as_str())
            .unwrap_or("outpatient");

        let chief_complaint = params.get("chiefComplaint")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        // TODO: Call actual YottaDB API to create visit
        // For now, return mock data
        Ok(json!({
            "visitId": format!("V{}", chrono::Utc::now().timestamp()),
            "patientId": patient_id,
            "visitType": visit_type,
            "chiefComplaint": chief_complaint,
            "status": "checked_in",
            "checkInTime": chrono::Utc::now().to_rfc3339(),
        }))
    }

    /// Update OPD queue status
    async fn update_queue_status(&self, params: Value) -> AppResult<Value> {
        let queue_entry_id = params.get("queueEntryId")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::Validation("queueEntryId required".to_string()))?;

        let status = params.get("status")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::Validation("status required".to_string()))?;

        // TODO: Call actual API to update queue
        Ok(json!({
            "queueEntryId": queue_entry_id,
            "status": status,
            "updatedAt": chrono::Utc::now().to_rfc3339(),
        }))
    }

    /// Call patient to consultation room
    async fn call_patient(&self, params: Value) -> AppResult<Value> {
        let patient_id = params.get("patientId")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::Validation("patientId required".to_string()))?;

        let room_number = params.get("roomNumber")
            .and_then(|v| v.as_str())
            .unwrap_or("1");

        // TODO: Emit notification to patient display system
        Ok(json!({
            "patientId": patient_id,
            "roomNumber": room_number,
            "calledAt": chrono::Utc::now().to_rfc3339(),
            "message": format!("Patient {} called to room {}", patient_id, room_number),
        }))
    }
}

#[async_trait]
impl Connector for OPDConnector {
    fn name(&self) -> &str {
        "opd"
    }

    fn display_name(&self) -> &str {
        "OPD Connector"
    }

    fn description(&self) -> &str {
        "Outpatient department operations"
    }

    async fn execute(&self, action: &str, params: Value) -> AppResult<Value> {
        // Validate parameters first
        self.validate_params(action, &params)?;

        match action {
            "createVisit" => self.create_visit(params).await,
            "updateQueueStatus" => self.update_queue_status(params).await,
            "callPatient" => self.call_patient(params).await,
            _ => Err(AppError::Validation(format!("Unknown OPD action: {}", action))),
        }
    }

    fn available_actions(&self) -> Vec<ConnectorAction> {
        vec![
            ConnectorAction {
                name: "createVisit".to_string(),
                description: "Create a new patient visit record".to_string(),
                parameters: vec![
                    ConnectorParameter {
                        name: "patientId".to_string(),
                        param_type: "string".to_string(),
                        required: true,
                        description: "Patient ID (IEN)".to_string(),
                    },
                    ConnectorParameter {
                        name: "visitType".to_string(),
                        param_type: "string".to_string(),
                        required: false,
                        description: "Visit type (outpatient, inpatient, emergency)".to_string(),
                    },
                    ConnectorParameter {
                        name: "chiefComplaint".to_string(),
                        param_type: "string".to_string(),
                        required: false,
                        description: "Patient's chief complaint".to_string(),
                    },
                ],
            },
            ConnectorAction {
                name: "updateQueueStatus".to_string(),
                description: "Update OPD queue entry status".to_string(),
                parameters: vec![
                    ConnectorParameter {
                        name: "queueEntryId".to_string(),
                        param_type: "string".to_string(),
                        required: true,
                        description: "Queue entry ID".to_string(),
                    },
                    ConnectorParameter {
                        name: "status".to_string(),
                        param_type: "string".to_string(),
                        required: true,
                        description: "New status (waiting, in_consultation, completed)".to_string(),
                    },
                ],
            },
            ConnectorAction {
                name: "callPatient".to_string(),
                description: "Call patient to consultation room".to_string(),
                parameters: vec![
                    ConnectorParameter {
                        name: "patientId".to_string(),
                        param_type: "string".to_string(),
                        required: true,
                        description: "Patient ID".to_string(),
                    },
                    ConnectorParameter {
                        name: "roomNumber".to_string(),
                        param_type: "string".to_string(),
                        required: false,
                        description: "Consultation room number".to_string(),
                    },
                ],
            },
        ]
    }

    fn validate_params(&self, action: &str, params: &Value) -> AppResult<()> {
        let actions = self.available_actions();
        let action_def = actions.iter()
            .find(|a| a.name == action)
            .ok_or_else(|| AppError::Validation(format!("Unknown action: {}", action)))?;

        // Check required parameters
        for param in &action_def.parameters {
            if param.required && params.get(&param.name).is_none() {
                return Err(AppError::Validation(format!(
                    "Required parameter missing: {}",
                    param.name
                )));
            }
        }

        Ok(())
    }
}
