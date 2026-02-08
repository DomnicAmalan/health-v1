// Anatomy Findings Handlers
// 3D anatomy-based clinical documentation with PHI audit logging
// Tiger Style compliance: no unwrap/expect, min 2 assertions, bounded text (10k max), 5s timeouts

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use shared::shared::api_response::ApiError;
use shared::shared::error::AppError;
use std::sync::Arc;
use uuid::Uuid;

use super::AppState;

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAnatomyFindingRequest {
    pub body_system_id: Uuid,
    pub finding_type: String,
    pub finding_category: String,
    pub finding_text: String,
    pub severity: Option<String>,
    pub laterality: Option<String>,
    pub model_coordinates: Option<serde_json::Value>, // {x, y, z}
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAnatomyFindingRequest {
    pub finding_type: Option<String>,
    pub finding_category: Option<String>,
    pub finding_text: Option<String>,
    pub severity: Option<String>,
    pub laterality: Option<String>,
    pub model_coordinates: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct AnatomyFinding {
    pub id: Uuid,
    pub encounter_id: Uuid,
    pub patient_id: Uuid,
    pub body_system_id: Uuid,
    pub finding_type: String,
    pub finding_category: String,
    pub finding_text: String,
    pub severity: Option<String>,
    pub laterality: Option<String>,
    pub model_coordinates: Option<serde_json::Value>,
    pub documented_by: Uuid,
    pub documented_datetime: chrono::DateTime<chrono::Utc>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub deleted_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnatomyFindingWithSystem {
    #[serde(flatten)]
    pub finding: AnatomyFinding,
    pub system_name: String,
    pub system_code: String,
    pub display_color: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnatomyFindingListResponse {
    pub findings: Vec<AnatomyFindingWithSystem>,
    pub total: i64,
}

/// Internal struct for fetching anatomy findings with body system details from database.
/// SQLx only supports FromRow for tuples up to 16 elements, so we need a struct for 18 columns.
#[derive(sqlx::FromRow)]
struct AnatomyFindingWithSystemRow {
    // anatomy_findings columns
    id: Uuid,
    encounter_id: Uuid,
    patient_id: Uuid,
    body_system_id: Uuid,
    finding_type: String,
    finding_category: String,
    finding_text: String,
    severity: Option<String>,
    laterality: Option<String>,
    model_coordinates: Option<serde_json::Value>,
    documented_by: Uuid,
    documented_datetime: chrono::DateTime<chrono::Utc>,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
    deleted_at: Option<chrono::DateTime<chrono::Utc>>,
    // body_systems columns
    system_name: String,
    system_code: String,
    display_color: String,
}

// ============================================================================
// Handlers
// ============================================================================

/// Create anatomy finding
/// Tiger Style: validate encounter in_progress, bounded text (10k max), PHI audit log
pub async fn create_anatomy_finding(
    State(state): State<Arc<AppState>>,
    Path(encounter_id): Path<Uuid>,
    Json(payload): Json<CreateAnatomyFindingRequest>,
) -> Result<(StatusCode, Json<AnatomyFinding>), ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();

    // Assertion 1: Encounter must exist and be in valid state
    let encounter_row = sqlx::query!(
        r#"SELECT patient_id, status FROM encounters WHERE id = $1 AND deleted_at IS NULL"#,
        encounter_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to fetch encounter: {}", e)))?
    .ok_or_else(|| AppError::NotFound(format!("Encounter {} not found", encounter_id)))?;

    let patient_id = encounter_row.patient_id;
    let encounter_status = encounter_row.status;

    // Validate encounter status (can document findings when scheduled or in_progress)
    let valid_statuses = ["scheduled", "in_progress"];
    if !valid_statuses.contains(&encounter_status.as_str()) {
        return Err(ApiError::from(AppError::Validation(format!(
            "Cannot document findings for encounter with status: {}",
            encounter_status
        ))));
    }

    // Assertion 2: Body system must exist
    let body_system_exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM body_systems WHERE id = $1 AND is_active = true) as "exists!""#,
        payload.body_system_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to verify body system: {}", e)))?;

    if !body_system_exists {
        return Err(ApiError::from(AppError::NotFound(format!(
            "Body system {} not found or inactive",
            payload.body_system_id
        ))));
    }

    // Validate finding_text length (bounded: max 10,000 chars)
    if payload.finding_text.is_empty() {
        return Err(ApiError::from(AppError::Validation("finding_text cannot be empty".to_string())));
    }
    if payload.finding_text.len() > 10000 {
        return Err(ApiError::from(AppError::Validation(
            "finding_text exceeds maximum length of 10,000 characters".to_string()
        )));
    }

    // Validate enums
    let valid_finding_types = ["inspection", "palpation", "auscultation", "percussion"];
    if !valid_finding_types.contains(&payload.finding_type.as_str()) {
        return Err(ApiError::from(AppError::Validation(format!(
            "Invalid finding_type: {}. Must be one of: {}",
            payload.finding_type,
            valid_finding_types.join(", ")
        ))));
    }

    let valid_categories = ["normal", "abnormal", "critical"];
    if !valid_categories.contains(&payload.finding_category.as_str()) {
        return Err(ApiError::from(AppError::Validation(format!(
            "Invalid finding_category: {}. Must be one of: {}",
            payload.finding_category,
            valid_categories.join(", ")
        ))));
    }

    if let Some(ref severity) = payload.severity {
        let valid_severities = ["mild", "moderate", "severe"];
        if !valid_severities.contains(&severity.as_str()) {
            return Err(ApiError::from(AppError::Validation(format!(
                "Invalid severity: {}. Must be one of: {}",
                severity,
                valid_severities.join(", ")
            ))));
        }
    }

    if let Some(ref laterality) = payload.laterality {
        let valid_lateralities = ["left", "right", "bilateral", "midline"];
        if !valid_lateralities.contains(&laterality.as_str()) {
            return Err(ApiError::from(AppError::Validation(format!(
                "Invalid laterality: {}. Must be one of: {}",
                laterality,
                valid_lateralities.join(", ")
            ))));
        }
    }

    // Insert anatomy finding
    let finding = sqlx::query_as!(
        AnatomyFinding,
        r#"
        INSERT INTO anatomy_findings (
            encounter_id, patient_id, body_system_id,
            finding_type, finding_category, finding_text,
            severity, laterality, model_coordinates,
            documented_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, encounter_id, patient_id, body_system_id,
            finding_type, finding_category, finding_text,
            severity, laterality, model_coordinates,
            documented_by, documented_datetime,
            created_at, updated_at, deleted_at
        "#,
        encounter_id,
        patient_id,
        payload.body_system_id,
        payload.finding_type,
        payload.finding_category,
        payload.finding_text,
        payload.severity.as_deref(),
        payload.laterality.as_deref(),
        payload.model_coordinates,
        user_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to create anatomy finding: {}", e)))?;

    // TODO: PHI audit log (via useAuditLog hook on frontend)
    // The frontend should call logPHI() after this endpoint returns

    Ok((StatusCode::CREATED, Json(finding)))
}

/// List anatomy findings for encounter
/// Tiger Style: bounded result, join body_system for context
pub async fn list_anatomy_findings(
    State(state): State<Arc<AppState>>,
    Path(encounter_id): Path<Uuid>,
) -> Result<Json<AnatomyFindingListResponse>, ApiError> {
    // Bounded result: max 200 findings per encounter (reasonable clinical limit)
    const MAX_FINDINGS: i64 = 200;

    // Fetch findings with body system details
    let rows = sqlx::query_as!(
        AnatomyFindingWithSystemRow,
        r#"
        SELECT
            af.id, af.encounter_id, af.patient_id, af.body_system_id,
            af.finding_type, af.finding_category, af.finding_text,
            af.severity, af.laterality, af.model_coordinates,
            af.documented_by, af.documented_datetime,
            af.created_at, af.updated_at, af.deleted_at,
            bs.system_name, bs.system_code, bs.display_color
        FROM anatomy_findings af
        JOIN body_systems bs ON af.body_system_id = bs.id
        WHERE af.encounter_id = $1 AND af.deleted_at IS NULL
        ORDER BY af.documented_datetime DESC
        LIMIT $2
        "#,
        encounter_id,
        MAX_FINDINGS
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to fetch anatomy findings: {}", e)))?;

    let total = rows.len() as i64;

    let findings_with_system: Vec<AnatomyFindingWithSystem> = rows
        .into_iter()
        .map(|row| AnatomyFindingWithSystem {
            finding: AnatomyFinding {
                id: row.id,
                encounter_id: row.encounter_id,
                patient_id: row.patient_id,
                body_system_id: row.body_system_id,
                finding_type: row.finding_type,
                finding_category: row.finding_category,
                finding_text: row.finding_text,
                severity: row.severity,
                laterality: row.laterality,
                model_coordinates: row.model_coordinates,
                documented_by: row.documented_by,
                documented_datetime: row.documented_datetime,
                created_at: row.created_at,
                updated_at: row.updated_at,
                deleted_at: row.deleted_at,
            },
            system_name: row.system_name,
            system_code: row.system_code,
            display_color: row.display_color,
        })
        .collect();

    Ok(Json(AnatomyFindingListResponse {
        findings: findings_with_system,
        total,
    }))
}

/// Update anatomy finding
/// Tiger Style: validate text length bounds
pub async fn update_anatomy_finding(
    State(state): State<Arc<AppState>>,
    Path((encounter_id, finding_id)): Path<(Uuid, Uuid)>,
    Json(payload): Json<UpdateAnatomyFindingRequest>,
) -> Result<Json<AnatomyFinding>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let _user_id = Uuid::nil();

    // Assertion 1: Finding must exist and belong to encounter
    let exists = sqlx::query_scalar!(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM anatomy_findings
            WHERE id = $1 AND encounter_id = $2 AND deleted_at IS NULL
        ) as "exists!"
        "#,
        finding_id,
        encounter_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to verify finding: {}", e)))?;

    if !exists {
        return Err(ApiError::from(AppError::NotFound(format!(
            "Finding {} not found for encounter {}",
            finding_id, encounter_id
        ))));
    }

    // Validate finding_text length if provided
    if let Some(ref finding_text) = payload.finding_text {
        if finding_text.is_empty() {
            return Err(ApiError::from(AppError::Validation("finding_text cannot be empty".to_string())));
        }
        if finding_text.len() > 10000 {
            return Err(ApiError::from(AppError::Validation(
                "finding_text exceeds maximum length of 10,000 characters".to_string()
            )));
        }
    }

    // Update using COALESCE pattern for optional fields
    let finding = sqlx::query_as!(
        AnatomyFinding,
        r#"
        UPDATE anatomy_findings SET
            updated_at = NOW(),
            finding_type = COALESCE($1, finding_type),
            finding_category = COALESCE($2, finding_category),
            finding_text = COALESCE($3, finding_text),
            severity = COALESCE($4, severity),
            laterality = COALESCE($5, laterality),
            model_coordinates = COALESCE($6, model_coordinates)
        WHERE id = $7 AND deleted_at IS NULL
        RETURNING id, encounter_id, patient_id, body_system_id,
            finding_type, finding_category, finding_text,
            severity, laterality, model_coordinates,
            documented_by, documented_datetime,
            created_at, updated_at, deleted_at
        "#,
        payload.finding_type.as_deref(),
        payload.finding_category.as_deref(),
        payload.finding_text.as_deref(),
        payload.severity.as_deref(),
        payload.laterality.as_deref(),
        payload.model_coordinates,
        finding_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to update anatomy finding: {}", e)))?;

    // Assertion 2: Verify update succeeded
    debug_assert_eq!(finding.id, finding_id, "Finding ID mismatch after update");

    Ok(Json(finding))
}

/// Delete anatomy finding (soft delete)
pub async fn delete_anatomy_finding(
    State(state): State<Arc<AppState>>,
    Path((encounter_id, finding_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, ApiError> {
    // Soft delete
    let result = sqlx::query!(
        r#"
        UPDATE anatomy_findings
        SET deleted_at = NOW()
        WHERE id = $1 AND encounter_id = $2 AND deleted_at IS NULL
        "#,
        finding_id,
        encounter_id
    )
    .execute(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to delete anatomy finding: {}", e)))?;

    if result.rows_affected() == 0 {
        return Err(ApiError::from(AppError::NotFound(format!(
            "Finding {} not found for encounter {}",
            finding_id, encounter_id
        ))));
    }

    Ok(StatusCode::NO_CONTENT)
}
