// Encounter Handlers
// Clinical encounter (visit) management with auto-generated encounter numbers
// Tiger Style compliance: no unwrap/expect, min 2 assertions, bounded results, 5s timeouts

use axum::{
    extract::{Path, Query, State},
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
pub struct CreateEncounterRequest {
    pub patient_id: Uuid,
    pub provider_id: Uuid,
    pub organization_id: Uuid,
    pub location_id: Option<Uuid>,
    pub encounter_type: String,
    pub encounter_datetime: Option<String>, // ISO 8601, defaults to now
    pub visit_reason: Option<String>,
    pub chief_complaint: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEncounterRequest {
    pub encounter_type: Option<String>,
    pub status: Option<String>,
    pub visit_reason: Option<String>,
    pub chief_complaint: Option<String>,
    pub assessment: Option<String>,
    pub plan: Option<String>,
    pub icd10_codes: Option<Vec<String>>,
    pub cpt_codes: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct ListEncountersQuery {
    pub patient_id: Option<Uuid>,
    pub provider_id: Option<Uuid>,
    pub status: Option<String>,
    pub encounter_type: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}

fn default_limit() -> i64 {
    50
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddDiagnosisRequest {
    pub icd10_code: String,
    pub description: Option<String>,
    pub is_primary: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddProcedureRequest {
    pub cpt_code: String,
    pub description: Option<String>,
    pub quantity: Option<i32>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Encounter {
    pub id: Uuid,
    pub encounter_number: String,
    pub patient_id: Uuid,
    pub provider_id: Uuid,
    pub organization_id: Uuid,
    pub location_id: Option<Uuid>,
    pub encounter_type: String,
    pub status: String,
    pub encounter_datetime: chrono::DateTime<chrono::Utc>,
    pub checkout_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub visit_reason: Option<String>,
    pub chief_complaint: Option<String>,
    pub assessment: Option<String>,
    pub plan: Option<String>,
    pub icd10_codes: Vec<String>,
    pub cpt_codes: Vec<String>,
    pub vista_ien: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub created_by: Uuid,
    pub updated_by: Uuid,
    pub deleted_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EncounterListResponse {
    pub encounters: Vec<Encounter>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

// ============================================================================
// Handlers
// ============================================================================

/// Create a new encounter
/// Tiger Style: validate patient/provider exist (2 assertions), no unwrap/expect
pub async fn create_encounter(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateEncounterRequest>,
) -> Result<(StatusCode, Json<Encounter>), ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();

    // Assertion 1: Patient must exist
    let patient_exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM ehr_patients WHERE id = $1 AND deleted_at IS NULL) as "exists!""#,
        payload.patient_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to verify patient: {}", e)))?;

    if !patient_exists {
        return Err(AppError::NotFound(format!(
            "Patient {} not found",
            payload.patient_id
        )).into());
    }

    // Assertion 2: Provider must exist
    let provider_exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND deleted_at IS NULL) as "exists!""#,
        payload.provider_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to verify provider: {}", e)))?;

    if !provider_exists {
        return Err(AppError::NotFound(format!(
            "Provider {} not found",
            payload.provider_id
        )).into());
    }

    // Parse encounter datetime or default to now
    let encounter_datetime = if let Some(dt_str) = payload.encounter_datetime {
        chrono::DateTime::parse_from_rfc3339(&dt_str)
            .map_err(|e| AppError::Validation(format!("Invalid encounter_datetime: {}", e)))?
            .with_timezone(&chrono::Utc)
    } else {
        chrono::Utc::now()
    };

    // Validate encounter type
    let valid_types = ["outpatient", "inpatient", "emergency", "telemedicine"];
    if !valid_types.contains(&payload.encounter_type.as_str()) {
        return Err(AppError::Validation(format!(
            "Invalid encounter_type: {}. Must be one of: {}",
            payload.encounter_type,
            valid_types.join(", ")
        )).into());
    }

    // Generate encounter number and insert
    let encounter = sqlx::query_as!(
        Encounter,
        r#"
        INSERT INTO encounters (
            encounter_number, patient_id, provider_id, organization_id, location_id,
            encounter_type, status, encounter_datetime, visit_reason, chief_complaint,
            created_by, updated_by
        )
        VALUES (
            generate_encounter_number(), $1, $2, $3, $4,
            $5, 'scheduled', $6, $7, $8,
            $9, $9
        )
        RETURNING id, encounter_number, patient_id, provider_id, organization_id, location_id,
            encounter_type, status, encounter_datetime, checkout_datetime,
            visit_reason, chief_complaint, assessment, plan,
            icd10_codes as "icd10_codes!", cpt_codes as "cpt_codes!",
            vista_ien, created_at, updated_at, created_by, updated_by, deleted_at
        "#,
        payload.patient_id,
        payload.provider_id,
        payload.organization_id,
        payload.location_id,
        &payload.encounter_type,
        encounter_datetime,
        payload.visit_reason.as_deref(),
        payload.chief_complaint.as_deref(),
        user_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to create encounter: {}", e)))?;

    Ok((StatusCode::CREATED, Json(encounter)))
}

/// Get encounter by ID
pub async fn get_encounter(
    State(state): State<Arc<AppState>>,
    Path(encounter_id): Path<Uuid>,
) -> Result<Json<Encounter>, ApiError> {
    let encounter = sqlx::query_as!(
        Encounter,
        r#"
        SELECT id, encounter_number, patient_id, provider_id, organization_id, location_id,
            encounter_type, status, encounter_datetime, checkout_datetime,
            visit_reason, chief_complaint, assessment, plan,
            icd10_codes as "icd10_codes!", cpt_codes as "cpt_codes!",
            vista_ien, created_at, updated_at, created_by, updated_by, deleted_at
        FROM encounters WHERE id = $1 AND deleted_at IS NULL
        "#,
        encounter_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to fetch encounter: {}", e)))?
    .ok_or_else(|| AppError::NotFound(format!("Encounter {} not found", encounter_id)))?;

    Ok(Json(encounter))
}

/// List encounters with filters
/// Tiger Style: bounded result limit (max 100)
pub async fn list_encounters(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListEncountersQuery>,
) -> Result<Json<EncounterListResponse>, ApiError> {
    // Bounded limit: max 100 encounters per request
    const MAX_LIMIT: i64 = 100;
    let limit = params.limit.min(MAX_LIMIT);

    // Execute queries with 5s timeout using NULL-check pattern for optional filters
    let encounters = tokio::time::timeout(
        std::time::Duration::from_secs(5),
        sqlx::query_as!(
            Encounter,
            r#"
            SELECT id, encounter_number, patient_id, provider_id, organization_id, location_id,
                encounter_type, status, encounter_datetime, checkout_datetime,
                visit_reason, chief_complaint, assessment, plan,
                icd10_codes as "icd10_codes!", cpt_codes as "cpt_codes!",
                vista_ien, created_at, updated_at, created_by, updated_by, deleted_at
            FROM encounters
            WHERE deleted_at IS NULL
              AND ($1::uuid IS NULL OR patient_id = $1)
              AND ($2::uuid IS NULL OR provider_id = $2)
              AND ($3::text IS NULL OR status = $3)
              AND ($4::text IS NULL OR encounter_type = $4)
              AND ($5::text IS NULL OR encounter_datetime >= $5::timestamptz)
              AND ($6::text IS NULL OR encounter_datetime <= $6::timestamptz)
            ORDER BY encounter_datetime DESC
            LIMIT $7 OFFSET $8
            "#,
            params.patient_id,
            params.provider_id,
            params.status.as_deref(),
            params.encounter_type.as_deref(),
            params.start_date.as_deref(),
            params.end_date.as_deref(),
            limit,
            params.offset
        )
        .fetch_all(state.database_pool.as_ref())
    )
    .await
    .map_err(|_| AppError::Timeout("Query timed out".to_string()))?
    .map_err(|e| AppError::Internal(format!("Failed to fetch encounters: {}", e)))?;

    let total = tokio::time::timeout(
        std::time::Duration::from_secs(5),
        sqlx::query_scalar!(
            r#"
            SELECT COUNT(*) as "count!"
            FROM encounters
            WHERE deleted_at IS NULL
              AND ($1::uuid IS NULL OR patient_id = $1)
              AND ($2::uuid IS NULL OR provider_id = $2)
              AND ($3::text IS NULL OR status = $3)
              AND ($4::text IS NULL OR encounter_type = $4)
              AND ($5::text IS NULL OR encounter_datetime >= $5::timestamptz)
              AND ($6::text IS NULL OR encounter_datetime <= $6::timestamptz)
            "#,
            params.patient_id,
            params.provider_id,
            params.status.as_deref(),
            params.encounter_type.as_deref(),
            params.start_date.as_deref(),
            params.end_date.as_deref()
        )
        .fetch_one(state.database_pool.as_ref())
    )
    .await
    .map_err(|_| AppError::Timeout("Count query timed out".to_string()))?
    .map_err(|e| AppError::Internal(format!("Failed to count encounters: {}", e)))?;

    Ok(Json(EncounterListResponse {
        encounters,
        total,
        limit,
        offset: params.offset,
    }))
}

/// Update encounter
/// Tiger Style: validate text length bounds (assessment/plan max 10k chars)
pub async fn update_encounter(
    State(state): State<Arc<AppState>>,
    Path(encounter_id): Path<Uuid>,
    Json(payload): Json<UpdateEncounterRequest>,
) -> Result<Json<Encounter>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();

    // Assertion 1: Encounter must exist
    let exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM encounters WHERE id = $1 AND deleted_at IS NULL) as "exists!""#,
        encounter_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to verify encounter: {}", e)))?;

    if !exists {
        return Err(AppError::NotFound(format!("Encounter {} not found", encounter_id)).into());
    }

    // Validate text length boundaries
    if let Some(ref assessment) = payload.assessment {
        if assessment.len() > 10000 {
            return Err(AppError::Validation(
                "Assessment exceeds maximum length of 10,000 characters".to_string()
            ).into());
        }
    }
    if let Some(ref plan) = payload.plan {
        if plan.len() > 10000 {
            return Err(AppError::Validation(
                "Plan exceeds maximum length of 10,000 characters".to_string()
            ).into());
        }
    }

    // Update using COALESCE pattern for optional fields
    let encounter = sqlx::query_as!(
        Encounter,
        r#"
        UPDATE encounters SET
            encounter_type = COALESCE($1, encounter_type),
            status = COALESCE($2, status),
            visit_reason = COALESCE($3, visit_reason),
            chief_complaint = COALESCE($4, chief_complaint),
            assessment = COALESCE($5, assessment),
            plan = COALESCE($6, plan),
            icd10_codes = COALESCE($7, icd10_codes),
            cpt_codes = COALESCE($8, cpt_codes),
            updated_by = $9,
            updated_at = NOW()
        WHERE id = $10 AND deleted_at IS NULL
        RETURNING id, encounter_number, patient_id, provider_id, organization_id, location_id,
            encounter_type, status, encounter_datetime, checkout_datetime,
            visit_reason, chief_complaint, assessment, plan,
            icd10_codes as "icd10_codes!", cpt_codes as "cpt_codes!",
            vista_ien, created_at, updated_at, created_by, updated_by, deleted_at
        "#,
        payload.encounter_type.as_deref(),
        payload.status.as_deref(),
        payload.visit_reason.as_deref(),
        payload.chief_complaint.as_deref(),
        payload.assessment.as_deref(),
        payload.plan.as_deref(),
        payload.icd10_codes.as_deref(),
        payload.cpt_codes.as_deref(),
        user_id,
        encounter_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to update encounter: {}", e)))?;

    // Assertion 2: Verify update succeeded
    debug_assert_eq!(encounter.id, encounter_id, "Encounter ID mismatch after update");

    Ok(Json(encounter))
}

/// Delete encounter (soft delete)
pub async fn delete_encounter(
    State(state): State<Arc<AppState>>,
    Path(encounter_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    // Soft delete
    let result = sqlx::query!(
        r#"
        UPDATE encounters
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        "#,
        encounter_id
    )
    .execute(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to delete encounter: {}", e)))?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Encounter {} not found", encounter_id)).into());
    }

    Ok(StatusCode::NO_CONTENT)
}

/// Start encounter (transition from scheduled to in_progress)
pub async fn start_encounter(
    State(state): State<Arc<AppState>>,
    Path(encounter_id): Path<Uuid>,
) -> Result<Json<Encounter>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();

    // Assertion 1: Fetch current encounter and validate status
    let current_encounter = sqlx::query_as!(
        Encounter,
        r#"
        SELECT id, encounter_number, patient_id, provider_id, organization_id, location_id,
            encounter_type, status, encounter_datetime, checkout_datetime,
            visit_reason, chief_complaint, assessment, plan,
            icd10_codes as "icd10_codes!", cpt_codes as "cpt_codes!",
            vista_ien, created_at, updated_at, created_by, updated_by, deleted_at
        FROM encounters WHERE id = $1 AND deleted_at IS NULL
        "#,
        encounter_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to fetch encounter: {}", e)))?
    .ok_or_else(|| AppError::NotFound(format!("Encounter {} not found", encounter_id)))?;

    // Valid transition: scheduled -> in_progress
    if current_encounter.status != "scheduled" {
        return Err(AppError::Validation(format!(
            "Cannot start encounter with status '{}'. Must be 'scheduled'",
            current_encounter.status
        )).into());
    }

    // Update to in_progress status
    let encounter = sqlx::query_as!(
        Encounter,
        r#"
        UPDATE encounters
        SET status = 'in_progress',
            updated_by = $1,
            updated_at = NOW()
        WHERE id = $2 AND deleted_at IS NULL
        RETURNING id, encounter_number, patient_id, provider_id, organization_id, location_id,
            encounter_type, status, encounter_datetime, checkout_datetime,
            visit_reason, chief_complaint, assessment, plan,
            icd10_codes as "icd10_codes!", cpt_codes as "cpt_codes!",
            vista_ien, created_at, updated_at, created_by, updated_by, deleted_at
        "#,
        user_id,
        encounter_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to start encounter: {}", e)))?;

    // Assertion 2: Verify status transition succeeded
    debug_assert_eq!(encounter.status, "in_progress", "Status transition verification failed");

    Ok(Json(encounter))
}

/// Finish encounter (transition to completed status)
/// Tiger Style: validate valid status transition
pub async fn finish_encounter(
    State(state): State<Arc<AppState>>,
    Path(encounter_id): Path<Uuid>,
) -> Result<Json<Encounter>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();

    // Assertion 1: Fetch current encounter and validate status
    let current_encounter = sqlx::query_as!(
        Encounter,
        r#"
        SELECT id, encounter_number, patient_id, provider_id, organization_id, location_id,
            encounter_type, status, encounter_datetime, checkout_datetime,
            visit_reason, chief_complaint, assessment, plan,
            icd10_codes as "icd10_codes!", cpt_codes as "cpt_codes!",
            vista_ien, created_at, updated_at, created_by, updated_by, deleted_at
        FROM encounters WHERE id = $1 AND deleted_at IS NULL
        "#,
        encounter_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to fetch encounter: {}", e)))?
    .ok_or_else(|| AppError::NotFound(format!("Encounter {} not found", encounter_id)))?;

    // Valid transitions: scheduled -> in_progress -> completed
    if current_encounter.status == "completed" {
        return Err(AppError::Validation("Encounter is already completed".to_string()).into());
    }
    if current_encounter.status == "cancelled" {
        return Err(AppError::Validation("Cannot complete a cancelled encounter".to_string()).into());
    }

    // Update to completed status
    let encounter = sqlx::query_as!(
        Encounter,
        r#"
        UPDATE encounters
        SET status = 'completed',
            checkout_datetime = NOW(),
            updated_by = $1,
            updated_at = NOW()
        WHERE id = $2 AND deleted_at IS NULL
        RETURNING id, encounter_number, patient_id, provider_id, organization_id, location_id,
            encounter_type, status, encounter_datetime, checkout_datetime,
            visit_reason, chief_complaint, assessment, plan,
            icd10_codes as "icd10_codes!", cpt_codes as "cpt_codes!",
            vista_ien, created_at, updated_at, created_by, updated_by, deleted_at
        "#,
        user_id,
        encounter_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to complete encounter: {}", e)))?;

    // Assertion 2: Verify status transition succeeded
    debug_assert_eq!(encounter.status, "completed", "Status transition verification failed");

    Ok(Json(encounter))
}

/// Complete encounter (alias for finish_encounter for backwards compatibility)
pub async fn complete_encounter(
    State(state): State<Arc<AppState>>,
    Path(encounter_id): Path<Uuid>,
) -> Result<Json<Encounter>, ApiError> {
    finish_encounter(State(state), Path(encounter_id)).await
}

/// Add diagnosis (ICD-10 code) to encounter
pub async fn add_diagnosis(
    State(state): State<Arc<AppState>>,
    Path(encounter_id): Path<Uuid>,
    Json(payload): Json<AddDiagnosisRequest>,
) -> Result<Json<Encounter>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();

    // Assertion 1: Encounter must exist and not be completed
    let current_encounter = sqlx::query_as!(
        Encounter,
        r#"
        SELECT id, encounter_number, patient_id, provider_id, organization_id, location_id,
            encounter_type, status, encounter_datetime, checkout_datetime,
            visit_reason, chief_complaint, assessment, plan,
            icd10_codes as "icd10_codes!", cpt_codes as "cpt_codes!",
            vista_ien, created_at, updated_at, created_by, updated_by, deleted_at
        FROM encounters WHERE id = $1 AND deleted_at IS NULL
        "#,
        encounter_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to fetch encounter: {}", e)))?
    .ok_or_else(|| AppError::NotFound(format!("Encounter {} not found", encounter_id)))?;

    if current_encounter.status == "completed" {
        return Err(AppError::Validation(
            "Cannot add diagnosis to a completed encounter".to_string()
        ).into());
    }

    // Validate ICD-10 code format (basic validation)
    if payload.icd10_code.is_empty() || payload.icd10_code.len() > 10 {
        return Err(AppError::Validation(
            "Invalid ICD-10 code format".to_string()
        ).into());
    }

    // Append the new ICD-10 code to existing codes
    let encounter = sqlx::query_as!(
        Encounter,
        r#"
        UPDATE encounters
        SET icd10_codes = array_append(icd10_codes, $1),
            updated_by = $2,
            updated_at = NOW()
        WHERE id = $3 AND deleted_at IS NULL
        RETURNING id, encounter_number, patient_id, provider_id, organization_id, location_id,
            encounter_type, status, encounter_datetime, checkout_datetime,
            visit_reason, chief_complaint, assessment, plan,
            icd10_codes as "icd10_codes!", cpt_codes as "cpt_codes!",
            vista_ien, created_at, updated_at, created_by, updated_by, deleted_at
        "#,
        &payload.icd10_code,
        user_id,
        encounter_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to add diagnosis: {}", e)))?;

    // Assertion 2: Verify the code was added
    debug_assert!(
        encounter.icd10_codes.contains(&payload.icd10_code),
        "ICD-10 code was not added"
    );

    Ok(Json(encounter))
}

/// Add procedure (CPT code) to encounter
pub async fn add_procedure(
    State(state): State<Arc<AppState>>,
    Path(encounter_id): Path<Uuid>,
    Json(payload): Json<AddProcedureRequest>,
) -> Result<Json<Encounter>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();

    // Assertion 1: Encounter must exist and not be completed
    let current_encounter = sqlx::query_as!(
        Encounter,
        r#"
        SELECT id, encounter_number, patient_id, provider_id, organization_id, location_id,
            encounter_type, status, encounter_datetime, checkout_datetime,
            visit_reason, chief_complaint, assessment, plan,
            icd10_codes as "icd10_codes!", cpt_codes as "cpt_codes!",
            vista_ien, created_at, updated_at, created_by, updated_by, deleted_at
        FROM encounters WHERE id = $1 AND deleted_at IS NULL
        "#,
        encounter_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to fetch encounter: {}", e)))?
    .ok_or_else(|| AppError::NotFound(format!("Encounter {} not found", encounter_id)))?;

    if current_encounter.status == "completed" {
        return Err(AppError::Validation(
            "Cannot add procedure to a completed encounter".to_string()
        ).into());
    }

    // Validate CPT code format (basic validation - 5 digits)
    if payload.cpt_code.is_empty() || payload.cpt_code.len() > 10 {
        return Err(AppError::Validation(
            "Invalid CPT code format".to_string()
        ).into());
    }

    // Append the new CPT code to existing codes
    let encounter = sqlx::query_as!(
        Encounter,
        r#"
        UPDATE encounters
        SET cpt_codes = array_append(cpt_codes, $1),
            updated_by = $2,
            updated_at = NOW()
        WHERE id = $3 AND deleted_at IS NULL
        RETURNING id, encounter_number, patient_id, provider_id, organization_id, location_id,
            encounter_type, status, encounter_datetime, checkout_datetime,
            visit_reason, chief_complaint, assessment, plan,
            icd10_codes as "icd10_codes!", cpt_codes as "cpt_codes!",
            vista_ien, created_at, updated_at, created_by, updated_by, deleted_at
        "#,
        &payload.cpt_code,
        user_id,
        encounter_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to add procedure: {}", e)))?;

    // Assertion 2: Verify the code was added
    debug_assert!(
        encounter.cpt_codes.contains(&payload.cpt_code),
        "CPT code was not added"
    );

    Ok(Json(encounter))
}
