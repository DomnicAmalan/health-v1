// Clinical Decision Support (CDS) Handlers
// Alerts, warnings, and clinical intelligence

use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info};
use uuid::Uuid;

use super::AppState;
use shared::shared::api_response::{ApiError, ApiResponse};
use shared::shared::error::AppError;

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClinicalAlertResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub alert_code: String,
    pub alert_type: String,
    pub severity: String,
    pub patient_id: Uuid,
    pub patient_name: Option<String>,
    pub encounter_id: Option<Uuid>,
    pub alert_title: String,
    pub alert_message: String,
    pub recommendation: Option<String>,
    pub clinical_rationale: Option<String>,
    pub triggered_by_entity_type: Option<String>,
    pub triggered_by_entity_id: Option<Uuid>,
    pub triggered_by_user_id: Option<Uuid>,
    pub triggered_by_user_name: Option<String>,
    pub triggered_datetime: chrono::DateTime<chrono::Utc>,
    pub alert_data: Option<serde_json::Value>,
    pub acknowledged: Option<bool>,
    pub acknowledged_by: Option<Uuid>,
    pub acknowledged_by_name: Option<String>,
    pub acknowledged_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub override_reason: Option<String>,
    pub action_taken: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlertQuery {
    pub patient_id: Option<Uuid>,
    pub severity: Option<String>,
    pub alert_type: Option<String>,
    pub acknowledged: Option<bool>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AcknowledgeAlertRequest {
    pub override_reason: Option<String>,
    pub override_justification: Option<String>,
    pub action_taken: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckMedicationRequest {
    pub patient_id: Uuid,
    pub medication_name: String,
    pub dose: String,
    pub route: String,
    pub frequency: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckMedicationResponse {
    pub has_alerts: bool,
    pub alerts: Vec<MedicationAlert>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MedicationAlert {
    pub alert_type: String,
    pub severity: String,
    pub message: String,
    pub recommendation: Option<String>,
}

// ============================================================================
// Handlers
// ============================================================================

/// GET /v1/cds/alerts - List clinical alerts
#[tracing::instrument(skip(state))]
pub async fn list_alerts(
    State(state): State<Arc<AppState>>,
    Query(query): Query<AlertQuery>,
) -> Result<Json<ApiResponse<Vec<ClinicalAlertResponse>>>, ApiError> {
    // Use a system organization ID for now
    let organization_id = Uuid::nil();
    info!("Listing clinical alerts for organization {}", organization_id);

    let limit = query.limit.unwrap_or(100).min(1000);

    let alerts = sqlx::query_as!(
        ClinicalAlertResponse,
        r#"
        SELECT
            id, organization_id, alert_code, alert_type, severity,
            patient_id, patient_name, encounter_id,
            alert_title, alert_message, recommendation, clinical_rationale,
            triggered_by_entity_type, triggered_by_entity_id,
            triggered_by_user_id, triggered_by_user_name, triggered_datetime,
            alert_data, acknowledged, acknowledged_by, acknowledged_by_name,
            acknowledged_datetime, override_reason, action_taken,
            created_at
        FROM clinical_alerts
        WHERE organization_id = $1
          AND ($2::uuid IS NULL OR patient_id = $2)
          AND ($3::text IS NULL OR severity = $3)
          AND ($4::text IS NULL OR alert_type = $4)
          AND ($5::boolean IS NULL OR acknowledged = $5)
        ORDER BY
            CASE severity
                WHEN 'critical' THEN 1
                WHEN 'warning' THEN 2
                WHEN 'info' THEN 3
            END,
            triggered_datetime DESC
        LIMIT $6
        "#,
        organization_id,
        query.patient_id,
        query.severity,
        query.alert_type,
        query.acknowledged,
        limit
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch alerts: {:?}", e);
        AppError::from(e)
    })?;

    Ok(Json(ApiResponse::success(alerts)))
}

/// GET /v1/cds/alerts/:patient_id - Get alerts for specific patient
#[tracing::instrument(skip(state))]
pub async fn get_patient_alerts(
    State(state): State<Arc<AppState>>,
    Path(patient_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<ClinicalAlertResponse>>>, ApiError> {
    info!("Getting alerts for patient: {}", patient_id);

    // Use a system organization ID for now
    let organization_id = Uuid::nil();

    let alerts = sqlx::query_as!(
        ClinicalAlertResponse,
        r#"
        SELECT
            id, organization_id, alert_code, alert_type, severity,
            patient_id, patient_name, encounter_id,
            alert_title, alert_message, recommendation, clinical_rationale,
            triggered_by_entity_type, triggered_by_entity_id,
            triggered_by_user_id, triggered_by_user_name, triggered_datetime,
            alert_data, acknowledged, acknowledged_by, acknowledged_by_name,
            acknowledged_datetime, override_reason, action_taken,
            created_at
        FROM clinical_alerts
        WHERE organization_id = $1
          AND patient_id = $2
          AND acknowledged = FALSE
        ORDER BY
            CASE severity
                WHEN 'critical' THEN 1
                WHEN 'warning' THEN 2
                WHEN 'info' THEN 3
            END,
            triggered_datetime DESC
        "#,
        organization_id,
        patient_id
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch patient alerts: {:?}", e);
        AppError::from(e)
    })?;

    Ok(Json(ApiResponse::success(alerts)))
}

/// POST /v1/cds/alerts/:id/acknowledge - Acknowledge an alert
#[tracing::instrument(skip(state))]
pub async fn acknowledge_alert(
    State(state): State<Arc<AppState>>,
    Path(alert_id): Path<Uuid>,
    Json(payload): Json<AcknowledgeAlertRequest>,
) -> Result<Json<ApiResponse<ClinicalAlertResponse>>, ApiError> {
    info!("Acknowledging alert: {}", alert_id);

    // Use a system organization ID for now
    let organization_id = Uuid::nil();
    // Use a system user ID for now
    let user_id = Uuid::nil();
    let user_name: Option<String> = Some("System".to_string());

    // First, check if alert is blockable
    let alert_check = sqlx::query!(
        r#"
        SELECT ca.severity, cr.is_blockable
        FROM clinical_alerts ca
        LEFT JOIN cds_rules cr ON ca.alert_code = cr.rule_code
        WHERE ca.id = $1 AND ca.organization_id = $2
        "#,
        alert_id,
        organization_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to check alert: {:?}", e);
        AppError::from(e)
    })?;

    let alert_check = alert_check.ok_or_else(|| AppError::NotFound("Alert not found".to_string()))?;

    // If alert is not blockable, require override reason
    if let Some(false) = alert_check.is_blockable {
        if payload.override_reason.is_none() {
            return Err(AppError::Validation("Override reason required for non-blockable alerts".to_string()).into());
        }
    }

    let alert = sqlx::query_as!(
        ClinicalAlertResponse,
        r#"
        UPDATE clinical_alerts
        SET
            acknowledged = TRUE,
            acknowledged_by = $1,
            acknowledged_by_name = $2,
            acknowledged_datetime = NOW(),
            override_reason = $3,
            override_justification = $4,
            action_taken = $5,
            updated_at = NOW()
        WHERE id = $6
          AND organization_id = $7
        RETURNING
            id, organization_id, alert_code, alert_type, severity,
            patient_id, patient_name, encounter_id,
            alert_title, alert_message, recommendation, clinical_rationale,
            triggered_by_entity_type, triggered_by_entity_id,
            triggered_by_user_id, triggered_by_user_name, triggered_datetime,
            alert_data, acknowledged, acknowledged_by, acknowledged_by_name,
            acknowledged_datetime, override_reason, action_taken,
            created_at
        "#,
        user_id,
        user_name,
        payload.override_reason,
        payload.override_justification,
        payload.action_taken,
        alert_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to acknowledge alert: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Alert not found".to_string())
        } else {
            AppError::from(e)
        }
    })?;

    info!("Alert acknowledged: {}", alert.id);
    Ok(Json(ApiResponse::success(alert)))
}

/// POST /v1/cds/check-medication - Check medication for interactions and allergies
#[tracing::instrument(skip(state))]
pub async fn check_medication(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CheckMedicationRequest>,
) -> Result<Json<ApiResponse<CheckMedicationResponse>>, ApiError> {
    info!("Checking medication for patient: {}", payload.patient_id);

    let mut alerts = Vec::new();

    // Check for drug allergies
    let allergy_check = sqlx::query!(
        r#"
        SELECT da.drug_name, da.reaction, da.severity
        FROM drug_allergies da
        WHERE da.patient_id = $1
          AND LOWER(da.drug_name) = LOWER($2)
          AND da.status = 'active'
          AND da.deleted_at IS NULL
        "#,
        payload.patient_id,
        payload.medication_name
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to check allergies: {:?}", e);
        AppError::from(e)
    })?;

    if let Some(allergy) = allergy_check {
        alerts.push(MedicationAlert {
            alert_type: "allergy".to_string(),
            severity: allergy.severity.unwrap_or_else(|| "warning".to_string()),
            message: format!(
                "ALLERGY ALERT: Patient has documented {} allergy. Previous reaction: {}",
                allergy.drug_name,
                allergy.reaction.unwrap_or_else(|| "Unknown".to_string())
            ),
            recommendation: Some("Do not administer unless benefit outweighs risk. Consider alternative medication.".to_string()),
        });
    }

    // Check for drug-drug interactions with current medications
    // This is a simplified check - in production, use drug interaction database
    let current_meds = sqlx::query!(
        r#"
        SELECT drug_name
        FROM prescriptions
        WHERE patient_id = $1
          AND status = 'active'
        "#,
        payload.patient_id
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to check current medications: {:?}", e);
        AppError::from(e)
    })?;

    // Example: Check for warfarin + NSAID interaction
    let new_med_lower = payload.medication_name.to_lowercase();
    let is_nsaid = new_med_lower.contains("ibuprofen")
        || new_med_lower.contains("naproxen")
        || new_med_lower.contains("diclofenac");

    for med in current_meds {
        let current_med_lower = med.drug_name.to_lowercase();

        if current_med_lower.contains("warfarin") && is_nsaid {
            alerts.push(MedicationAlert {
                alert_type: "drug_interaction".to_string(),
                severity: "warning".to_string(),
                message: format!(
                    "DRUG INTERACTION: Concurrent use of warfarin and {} significantly increases bleeding risk.",
                    payload.medication_name
                ),
                recommendation: Some("Consider acetaminophen as alternative. If combination necessary, monitor INR more frequently and provide gastric protection (PPI).".to_string()),
            });
        }
    }

    let response = CheckMedicationResponse {
        has_alerts: !alerts.is_empty(),
        alerts,
    };

    Ok(Json(ApiResponse::success(response)))
}

/// GET /v1/cds/rules - List active CDS rules
#[tracing::instrument(skip(state))]
pub async fn list_cds_rules(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, ApiError> {
    // Use a system organization ID for now
    let organization_id = Uuid::nil();
    info!("Listing CDS rules for organization {}", organization_id);

    let rules = sqlx::query!(
        r#"
        SELECT
            id, rule_code, rule_name, rule_category, rule_type,
            alert_severity, is_blockable, is_active
        FROM cds_rules
        WHERE organization_id = $1
          AND is_active = TRUE
          AND deleted_at IS NULL
        ORDER BY execution_priority DESC, rule_name
        "#,
        organization_id
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch CDS rules: {:?}", e);
        AppError::from(e)
    })?;

    let rules_json: Vec<serde_json::Value> = rules
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "id": r.id,
                "ruleCode": r.rule_code,
                "ruleName": r.rule_name,
                "ruleCategory": r.rule_category,
                "ruleType": r.rule_type,
                "alertSeverity": r.alert_severity,
                "isBlockable": r.is_blockable,
                "isActive": r.is_active,
            })
        })
        .collect();

    Ok(Json(ApiResponse::success(rules_json)))
}
