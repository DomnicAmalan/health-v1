//! Clinical Notes & Documentation Handlers
//!
//! Provides REST API handlers for clinical documentation including:
//! - SOAP format notes (Subjective, Objective, Assessment, Plan)
//! - Note templates and macros
//! - Electronic signature workflow
//! - Amendments and addendums
//! - Structured diagnoses (ICD-10) and procedures (CPT)

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info, warn};
use uuid::Uuid;

use shared::shared::error::AppError;
use shared::shared::api_response::{ApiError, ApiResponse};

use super::AppState;

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct ListNotesRequest {
    pub patient_id: Option<Uuid>,
    pub provider_id: Option<Uuid>,
    pub encounter_id: Option<Uuid>,
    pub note_type: Option<String>,
    pub status: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ClinicalNoteResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub ien: Option<i32>,
    pub encounter_id: Option<Uuid>,
    pub patient_id: Uuid,
    pub patient_ien: i32,
    pub provider_id: Uuid,
    pub provider_name: Option<String>,
    pub note_type: String,
    pub note_title: Option<String>,
    pub template_id: Option<Uuid>,
    pub subjective: Option<String>,
    pub objective: Option<String>,
    pub assessment: Option<String>,
    pub plan: Option<String>,
    pub chief_complaint: Option<String>,
    pub history_present_illness: Option<String>,
    pub diagnoses: Option<serde_json::Value>,
    pub procedures: Option<serde_json::Value>,
    pub status: String,
    pub signed_by: Option<Uuid>,
    pub signed_datetime: Option<DateTime<Utc>>,
    pub is_amended: Option<bool>,
    pub is_addendum: Option<bool>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateNoteRequest {
    pub patient_id: Uuid,
    pub encounter_id: Option<Uuid>,
    pub note_type: String,
    pub note_title: Option<String>,
    pub template_id: Option<Uuid>,
    pub subjective: Option<String>,
    pub objective: Option<String>,
    pub assessment: Option<String>,
    pub plan: Option<String>,
    pub chief_complaint: Option<String>,
    pub history_present_illness: Option<String>,
    pub past_medical_history: Option<String>,
    pub medications: Option<String>,
    pub allergies: Option<String>,
    pub physical_examination: Option<String>,
    pub diagnoses: Option<serde_json::Value>,
    pub procedures: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateNoteRequest {
    pub note_title: Option<String>,
    pub subjective: Option<String>,
    pub objective: Option<String>,
    pub assessment: Option<String>,
    pub plan: Option<String>,
    pub chief_complaint: Option<String>,
    pub history_present_illness: Option<String>,
    pub past_medical_history: Option<String>,
    pub medications: Option<String>,
    pub allergies: Option<String>,
    pub physical_examination: Option<String>,
    pub diagnoses: Option<serde_json::Value>,
    pub procedures: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct SignNoteRequest {
    pub electronic_signature: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AmendNoteRequest {
    pub amendment_reason: String,
    pub subjective: Option<String>,
    pub objective: Option<String>,
    pub assessment: Option<String>,
    pub plan: Option<String>,
}

/// Full clinical note response with all fields for GET endpoint
#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ClinicalNoteFullResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub ien: Option<i32>,
    pub encounter_id: Option<Uuid>,
    pub patient_id: Uuid,
    pub patient_ien: i32,
    pub provider_id: Uuid,
    pub provider_name: Option<String>,
    pub note_type: String,
    pub note_title: Option<String>,
    pub template_id: Option<Uuid>,
    pub subjective: Option<String>,
    pub objective: Option<String>,
    pub assessment: Option<String>,
    pub plan: Option<String>,
    pub chief_complaint: Option<String>,
    pub history_present_illness: Option<String>,
    pub past_medical_history: Option<String>,
    pub past_surgical_history: Option<String>,
    pub medications: Option<String>,
    pub allergies: Option<String>,
    pub social_history: Option<String>,
    pub family_history: Option<String>,
    pub review_of_systems: Option<String>,
    pub physical_examination: Option<String>,
    pub diagnoses: Option<serde_json::Value>,
    pub procedures: Option<serde_json::Value>,
    pub discharge_disposition: Option<String>,
    pub discharge_medications: Option<String>,
    pub discharge_instructions: Option<String>,
    pub procedure_performed: Option<String>,
    pub procedure_indication: Option<String>,
    pub procedure_findings: Option<String>,
    pub status: String,
    pub signed_by: Option<Uuid>,
    pub signed_datetime: Option<DateTime<Utc>>,
    pub is_amended: Option<bool>,
    pub amended_by: Option<Uuid>,
    pub amended_datetime: Option<DateTime<Utc>>,
    pub amendment_reason: Option<String>,
    pub is_addendum: Option<bool>,
    pub requires_cosign: Option<bool>,
    pub cosigned_by: Option<Uuid>,
    pub cosigned_datetime: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct NoteTemplateResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub template_name: String,
    pub note_type: String,
    pub description: Option<String>,
    pub template_sections: serde_json::Value,
    pub required_fields: Option<serde_json::Value>,
    pub department: Option<String>,
    pub specialty: Option<String>,
    pub is_active: Option<bool>,
    pub is_default: Option<bool>,
}

// ============================================================================
// Handlers
// ============================================================================

/// GET /v1/ehr/clinical-notes - List clinical notes with filters
#[tracing::instrument(skip(state))]
pub async fn list_clinical_notes(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListNotesRequest>,
) -> Result<Json<ApiResponse<Vec<ClinicalNoteResponse>>>, ApiError> {
    info!("Listing clinical notes");

    // Use a system organization ID for now
    let organization_id = Uuid::nil();

    let limit = params.limit.unwrap_or(100).min(1000);

    let mut query_builder = sqlx::QueryBuilder::new(
        "SELECT id, organization_id, ien, encounter_id, patient_id, patient_ien,
                provider_id, provider_name, note_type, note_title, template_id,
                subjective, objective, assessment, plan, chief_complaint,
                history_present_illness, diagnoses, procedures, status,
                signed_by, signed_datetime, is_amended, is_addendum,
                created_at, updated_at
         FROM clinical_notes
         WHERE organization_id = "
    );
    query_builder.push_bind(organization_id);
    query_builder.push(" AND deleted_at IS NULL");

    if let Some(patient_id) = params.patient_id {
        query_builder.push(" AND patient_id = ");
        query_builder.push_bind(patient_id);
    }

    if let Some(provider_id) = params.provider_id {
        query_builder.push(" AND provider_id = ");
        query_builder.push_bind(provider_id);
    }

    if let Some(encounter_id) = params.encounter_id {
        query_builder.push(" AND encounter_id = ");
        query_builder.push_bind(encounter_id);
    }

    if let Some(note_type) = params.note_type {
        query_builder.push(" AND note_type = ");
        query_builder.push_bind(note_type);
    }

    if let Some(status) = params.status {
        query_builder.push(" AND status = ");
        query_builder.push_bind(status);
    }

    if let Some(date_from) = params.date_from {
        query_builder.push(" AND DATE(created_at) >= ");
        query_builder.push_bind(date_from);
    }

    if let Some(date_to) = params.date_to {
        query_builder.push(" AND DATE(created_at) <= ");
        query_builder.push_bind(date_to);
    }

    query_builder.push(" ORDER BY created_at DESC LIMIT ");
    query_builder.push_bind(limit);

    let notes = query_builder
        .build_query_as::<ClinicalNoteResponse>()
        .fetch_all(state.database_pool.as_ref())
        .await
        .map_err(|e| {
            error!("Failed to fetch clinical notes: {:?}", e);
            AppError::from(e)
        })?;

    info!("Retrieved {} clinical notes", notes.len());
    Ok(Json(ApiResponse::success(notes)))
}

/// POST /v1/ehr/clinical-notes - Create new clinical note
#[tracing::instrument(skip(state))]
pub async fn create_clinical_note(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateNoteRequest>,
) -> Result<Json<ApiResponse<ClinicalNoteResponse>>, ApiError> {
    info!("Creating clinical note for patient: {}", payload.patient_id);

    // Use a system user ID for now
    let user_id = Uuid::nil();
    // Use a system organization ID for now
    let organization_id = Uuid::nil();

    // Assertion 1: Validate patient exists
    let patient = sqlx::query!(
        r#"SELECT id, ien FROM ehr_patients
           WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL"#,
        payload.patient_id,
        organization_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch patient: {:?}", e);
        AppError::from(e)
    })?
    .ok_or_else(|| {
        warn!("Patient not found: {}", payload.patient_id);
        AppError::NotFound("Patient not found".to_string())
    })?;

    // Assertion 2: Validate note type is not empty
    debug_assert!(
        !payload.note_type.trim().is_empty(),
        "Note type is required"
    );

    let note = sqlx::query_as!(
        ClinicalNoteResponse,
        r#"
        INSERT INTO clinical_notes (
            organization_id, patient_id, patient_ien, encounter_id,
            provider_id, note_type, note_title, template_id,
            subjective, objective, assessment, plan,
            chief_complaint, history_present_illness, past_medical_history,
            medications, allergies, physical_examination,
            diagnoses, procedures, status, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'draft', $21)
        RETURNING
            id, organization_id, ien, encounter_id, patient_id, patient_ien,
            provider_id, provider_name, note_type, note_title, template_id,
            subjective, objective, assessment, plan, chief_complaint,
            history_present_illness, diagnoses, procedures, status,
            signed_by, signed_datetime, is_amended, is_addendum,
            created_at, updated_at
        "#,
        organization_id,
        payload.patient_id,
        patient.ien,
        payload.encounter_id,
        user_id,
        payload.note_type,
        payload.note_title,
        payload.template_id,
        payload.subjective,
        payload.objective,
        payload.assessment,
        payload.plan,
        payload.chief_complaint,
        payload.history_present_illness,
        payload.past_medical_history,
        payload.medications,
        payload.allergies,
        payload.physical_examination,
        payload.diagnoses,
        payload.procedures,
        user_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to create clinical note: {:?}", e);
        AppError::from(e)
    })?;

    info!("Created clinical note: {}", note.id);
    Ok(Json(ApiResponse::success(note)))
}

/// GET /v1/ehr/clinical-notes/:id - Get clinical note details
#[tracing::instrument(skip(state))]
pub async fn get_clinical_note(
    State(state): State<Arc<AppState>>,
    Path(note_id): Path<Uuid>,
) -> Result<Json<ApiResponse<ClinicalNoteFullResponse>>, ApiError> {
    info!("Getting clinical note: {}", note_id);

    // Use a system organization ID for now
    let organization_id = Uuid::nil();

    let note = sqlx::query_as!(
        ClinicalNoteFullResponse,
        r#"SELECT id, organization_id, ien, encounter_id, patient_id, patient_ien,
                  provider_id, provider_name, note_type, note_title, template_id,
                  subjective, objective, assessment, plan, chief_complaint,
                  history_present_illness, past_medical_history, past_surgical_history,
                  medications, allergies, social_history, family_history,
                  review_of_systems, physical_examination, diagnoses, procedures,
                  discharge_disposition, discharge_medications, discharge_instructions,
                  procedure_performed, procedure_indication, procedure_findings,
                  status, signed_by, signed_datetime, is_amended, amended_by,
                  amended_datetime, amendment_reason, is_addendum, requires_cosign,
                  cosigned_by, cosigned_datetime, created_at, updated_at
           FROM clinical_notes
           WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL"#,
        note_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch clinical note: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Clinical note not found".to_string())
        } else {
            AppError::Internal(format!("Failed to fetch clinical note: {}", e))
        }
    })?;

    Ok(Json(ApiResponse::success(note)))
}

/// PUT /v1/ehr/clinical-notes/:id - Update clinical note (draft only)
#[tracing::instrument(skip(state))]
pub async fn update_clinical_note(
    State(state): State<Arc<AppState>>,
    Path(note_id): Path<Uuid>,
    Json(payload): Json<UpdateNoteRequest>,
) -> Result<Json<ApiResponse<ClinicalNoteResponse>>, ApiError> {
    info!("Updating clinical note: {}", note_id);

    // Use a system user ID for now
    let user_id = Uuid::nil();
    // Use a system organization ID for now
    let organization_id = Uuid::nil();

    // Check if note is in draft status
    let current_status = sqlx::query_scalar!(
        "SELECT status FROM clinical_notes WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL",
        note_id,
        organization_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to check note status: {:?}", e);
        AppError::from(e)
    })?
    .ok_or_else(|| AppError::NotFound("Clinical note not found".to_string()))?;

    if current_status != "draft" {
        return Err(AppError::Validation("Only draft notes can be updated. Use amend for signed notes.".to_string()).into());
    }

    let note = sqlx::query_as!(
        ClinicalNoteResponse,
        r#"
        UPDATE clinical_notes
        SET note_title = COALESCE($1, note_title),
            subjective = COALESCE($2, subjective),
            objective = COALESCE($3, objective),
            assessment = COALESCE($4, assessment),
            plan = COALESCE($5, plan),
            chief_complaint = COALESCE($6, chief_complaint),
            history_present_illness = COALESCE($7, history_present_illness),
            past_medical_history = COALESCE($8, past_medical_history),
            medications = COALESCE($9, medications),
            allergies = COALESCE($10, allergies),
            physical_examination = COALESCE($11, physical_examination),
            diagnoses = COALESCE($12, diagnoses),
            procedures = COALESCE($13, procedures),
            updated_by = $14
        WHERE id = $15 AND organization_id = $16 AND deleted_at IS NULL
        RETURNING
            id, organization_id, ien, encounter_id, patient_id, patient_ien,
            provider_id, provider_name, note_type, note_title, template_id,
            subjective, objective, assessment, plan, chief_complaint,
            history_present_illness, diagnoses, procedures, status,
            signed_by, signed_datetime, is_amended, is_addendum,
            created_at, updated_at
        "#,
        payload.note_title,
        payload.subjective,
        payload.objective,
        payload.assessment,
        payload.plan,
        payload.chief_complaint,
        payload.history_present_illness,
        payload.past_medical_history,
        payload.medications,
        payload.allergies,
        payload.physical_examination,
        payload.diagnoses,
        payload.procedures,
        user_id,
        note_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to update clinical note: {:?}", e);
        AppError::from(e)
    })?;

    info!("Updated clinical note: {}", note.id);
    Ok(Json(ApiResponse::success(note)))
}

/// POST /v1/ehr/clinical-notes/:id/sign - Sign clinical note
#[tracing::instrument(skip(state))]
pub async fn sign_clinical_note(
    State(state): State<Arc<AppState>>,
    Path(note_id): Path<Uuid>,
    Json(_payload): Json<SignNoteRequest>,
) -> Result<Json<ApiResponse<ClinicalNoteResponse>>, ApiError> {
    info!("Signing clinical note: {}", note_id);

    // Use a system user ID for now
    let user_id = Uuid::nil();
    // Use a system organization ID for now
    let organization_id = Uuid::nil();

    let note = sqlx::query_as!(
        ClinicalNoteResponse,
        r#"
        UPDATE clinical_notes
        SET status = 'signed',
            signed_by = $1,
            signed_datetime = NOW(),
            signed_electronically = true,
            updated_by = $2
        WHERE id = $3 AND organization_id = $4 AND status = 'draft' AND deleted_at IS NULL
        RETURNING
            id, organization_id, ien, encounter_id, patient_id, patient_ien,
            provider_id, provider_name, note_type, note_title, template_id,
            subjective, objective, assessment, plan, chief_complaint,
            history_present_illness, diagnoses, procedures, status,
            signed_by, signed_datetime, is_amended, is_addendum,
            created_at, updated_at
        "#,
        user_id,
        user_id,
        note_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to sign clinical note: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Clinical note not found or already signed".to_string())
        } else {
            AppError::from(e)
        }
    })?;

    info!("Signed clinical note: {}", note.id);
    Ok(Json(ApiResponse::success(note)))
}

/// DELETE /v1/ehr/clinical-notes/:id - Delete clinical note (soft delete, draft only)
#[tracing::instrument(skip(state))]
pub async fn delete_clinical_note(
    State(state): State<Arc<AppState>>,
    Path(note_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    info!("Deleting clinical note: {}", note_id);

    // Use a system user ID for now
    let user_id = Uuid::nil();
    // Use a system organization ID for now
    let organization_id = Uuid::nil();

    let result = sqlx::query!(
        r#"UPDATE clinical_notes SET deleted_at = NOW(), updated_by = $1
           WHERE id = $2 AND organization_id = $3 AND status = 'draft' AND deleted_at IS NULL"#,
        user_id,
        note_id,
        organization_id
    )
    .execute(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to delete clinical note: {:?}", e);
        AppError::from(e)
    })?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Clinical note not found or cannot be deleted (only drafts can be deleted)".to_string()).into());
    }

    info!("Deleted clinical note: {}", note_id);
    Ok(StatusCode::NO_CONTENT)
}

/// GET /v1/ehr/clinical-notes/templates - List note templates
#[tracing::instrument(skip(state))]
pub async fn list_note_templates(
    State(state): State<Arc<AppState>>,
    Query(params): Query<serde_json::Value>,
) -> Result<Json<ApiResponse<Vec<NoteTemplateResponse>>>, ApiError> {
    info!("Listing note templates");

    // Use a system organization ID for now
    let organization_id = Uuid::nil();

    let note_type = params.get("note_type").and_then(|v| v.as_str());

    let templates = if let Some(nt) = note_type {
        sqlx::query_as!(
            NoteTemplateResponse,
            r#"SELECT id, organization_id, template_name, note_type, description,
                      template_sections, required_fields, department, specialty,
                      is_active, is_default
               FROM note_templates
               WHERE organization_id = $1 AND note_type = $2 AND is_active = true AND deleted_at IS NULL
               ORDER BY is_default DESC, template_name"#,
            organization_id,
            nt
        )
        .fetch_all(state.database_pool.as_ref())
        .await
    } else {
        sqlx::query_as!(
            NoteTemplateResponse,
            r#"SELECT id, organization_id, template_name, note_type, description,
                      template_sections, required_fields, department, specialty,
                      is_active, is_default
               FROM note_templates
               WHERE organization_id = $1 AND is_active = true AND deleted_at IS NULL
               ORDER BY note_type, is_default DESC, template_name"#,
            organization_id
        )
        .fetch_all(state.database_pool.as_ref())
        .await
    }
    .map_err(|e| {
        error!("Failed to fetch note templates: {:?}", e);
        AppError::from(e)
    })?;

    Ok(Json(ApiResponse::success(templates)))
}
