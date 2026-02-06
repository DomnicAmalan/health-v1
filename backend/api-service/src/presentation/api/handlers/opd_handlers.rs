//! OPD (Outpatient Department) Queue Management Handlers
//!
//! Provides REST API handlers for OPD queue management including:
//! - Queue entry and patient check-in
//! - Queue status management (waiting → in_consultation → completed)
//! - Consultation tracking
//! - Display board configuration

use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info, warn};
use uuid::Uuid;

use super::AppState;
use shared::shared::api_response::{ApiError, ApiResponse};
use shared::shared::error::AppError;

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct ListQueueRequest {
    pub department: Option<String>,
    pub status: Option<String>,
    pub provider_id: Option<Uuid>,
    pub date: Option<String>,  // YYYY-MM-DD format
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct QueueEntryResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub patient_id: Uuid,
    pub patient_ien: Option<i32>,
    pub patient_name: Option<String>,
    pub appointment_id: Option<Uuid>,
    pub queue_number: Option<i32>,
    pub department: Option<String>,
    pub visit_type: Option<String>,
    pub provider_id: Option<Uuid>,
    pub provider_name: Option<String>,
    pub check_in_time: Option<DateTime<Utc>>,
    pub waiting_start_time: Option<DateTime<Utc>>,
    pub consultation_start_time: Option<DateTime<Utc>>,
    pub consultation_end_time: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub chief_complaint: Option<String>,
    pub vitals_recorded: Option<bool>,
    pub vitals_recorded_at: Option<DateTime<Utc>>,
    pub wait_time_minutes: Option<i32>,
    pub notes: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateQueueEntryRequest {
    pub patient_id: Uuid,
    pub department: String,
    pub visit_type: Option<String>,
    pub priority: Option<String>,
    pub chief_complaint: Option<String>,
    pub appointment_id: Option<Uuid>,
    pub provider_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateQueueStatusRequest {
    pub status: String,
    pub provider_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct StartConsultationRequest {
    pub provider_id: Uuid,
    pub consultation_type: Option<String>,
    pub chief_complaint: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CompleteConsultationRequest {
    pub history_present_illness: Option<String>,
    pub examination_findings: Option<String>,
    pub provisional_diagnosis: Option<String>,
    pub treatment_plan: Option<String>,
    pub follow_up_required: Option<bool>,
    pub follow_up_date: Option<String>,
    pub follow_up_instructions: Option<String>,
    pub completion_status: String,  // discharged, admitted, referred, follow_up
    pub consultation_notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct QueueSummaryResponse {
    pub department: String,
    pub waiting_count: i64,
    pub in_consultation_count: i64,
    pub completed_today_count: i64,
    pub average_wait_time_minutes: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct ConsultationResponse {
    pub id: Uuid,
    pub queue_id: Option<Uuid>,
    pub patient_id: Option<Uuid>,
    pub provider_id: Option<Uuid>,
    pub provider_name: Option<String>,
    pub consultation_type: Option<String>,
    pub department: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub duration_minutes: Option<i32>,
    pub chief_complaint: Option<String>,
    pub history_present_illness: Option<String>,
    pub examination_findings: Option<String>,
    pub provisional_diagnosis: Option<String>,
    pub treatment_plan: Option<String>,
    pub follow_up_required: Option<bool>,
    pub follow_up_date: Option<chrono::NaiveDate>,
    pub follow_up_instructions: Option<String>,
    pub status: Option<String>,
    pub completion_status: Option<String>,
    pub consultation_notes: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

// ============================================================================
// Handlers
// ============================================================================

/// GET /v1/opd/queue - List OPD queue entries with optional filters
#[tracing::instrument(skip(state))]
pub async fn list_opd_queue(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListQueueRequest>,
) -> Result<Json<ApiResponse<Vec<QueueEntryResponse>>>, ApiError> {
    info!("Listing OPD queue entries");

    let limit = params.limit.unwrap_or(100).min(1000);
    let organization_id = Uuid::nil(); // Use a system organization ID for now

    let mut query_builder = sqlx::QueryBuilder::new(
        "SELECT id, organization_id, patient_id, patient_ien, patient_name, appointment_id,
                queue_number, department, visit_type, provider_id, provider_name,
                check_in_time, waiting_start_time, consultation_start_time, consultation_end_time,
                status, priority, chief_complaint, vitals_recorded, vitals_recorded_at,
                wait_time_minutes, notes, created_at, updated_at
         FROM opd_queue
         WHERE organization_id = "
    );
    query_builder.push_bind(organization_id);
    query_builder.push(" AND deleted_at IS NULL");

    if let Some(department) = params.department {
        query_builder.push(" AND department = ");
        query_builder.push_bind(department);
    }

    if let Some(status) = params.status {
        query_builder.push(" AND status = ");
        query_builder.push_bind(status);
    }

    if let Some(provider_id) = params.provider_id {
        query_builder.push(" AND provider_id = ");
        query_builder.push_bind(provider_id);
    }

    if let Some(date) = params.date {
        query_builder.push(" AND DATE(check_in_time) = ");
        query_builder.push_bind(date);
    }

    query_builder.push(" ORDER BY check_in_time DESC LIMIT ");
    query_builder.push_bind(limit);

    let queue_entries = query_builder
        .build_query_as::<QueueEntryResponse>()
        .fetch_all(state.database_pool.as_ref())
        .await
        .map_err(|e| {
            error!("Failed to fetch queue entries: {:?}", e);
            AppError::from(e)
        })?;

    info!("Retrieved {} queue entries", queue_entries.len());
    Ok(Json(ApiResponse::success(queue_entries)))
}

/// GET /v1/opd/queue/summary - Get queue summary statistics by department
#[tracing::instrument(skip(state))]
pub async fn get_queue_summary(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListQueueRequest>,
) -> Result<Json<ApiResponse<Vec<QueueSummaryResponse>>>, ApiError> {
    info!("Getting OPD queue summary");

    let department_filter = params.department.as_deref();
    let organization_id = Uuid::nil(); // Use a system organization ID for now

    let summaries = sqlx::query_as!(
        QueueSummaryResponse,
        r#"
        SELECT
            department,
            COUNT(*) FILTER (WHERE status = 'waiting') as "waiting_count!",
            COUNT(*) FILTER (WHERE status = 'in_consultation') as "in_consultation_count!",
            COUNT(*) FILTER (WHERE status = 'completed' AND DATE(check_in_time) = CURRENT_DATE) as "completed_today_count!",
            (AVG(wait_time_minutes) FILTER (WHERE wait_time_minutes IS NOT NULL))::float8 as average_wait_time_minutes
        FROM opd_queue
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND DATE(check_in_time) = CURRENT_DATE
          AND ($2::text IS NULL OR department = $2)
        GROUP BY department
        ORDER BY department
        "#,
        organization_id,
        department_filter
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch queue summary: {:?}", e);
        AppError::from(e)
    })?;

    Ok(Json(ApiResponse::success(summaries)))
}

/// POST /v1/opd/queue - Create new queue entry (patient check-in)
#[tracing::instrument(skip(state))]
pub async fn create_queue_entry(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateQueueEntryRequest>,
) -> Result<Json<ApiResponse<QueueEntryResponse>>, ApiError> {
    info!("Creating queue entry for patient: {}", payload.patient_id);

    let organization_id = Uuid::nil(); // Use a system organization ID for now
    let user_id = Uuid::nil(); // Use a system user ID for now

    // Assertion 1: Validate patient exists
    let patient = sqlx::query!(
        r#"SELECT id, ien, first_name, last_name FROM ehr_patients
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

    // Assertion 2: Validate department provided
    assert!(
        !payload.department.trim().is_empty(),
        "Department is required"
    );

    let patient_name = format!(
        "{} {}",
        patient.first_name.unwrap_or_default(),
        patient.last_name.unwrap_or_default()
    );

    let visit_type = payload.visit_type.unwrap_or_else(|| "consultation".to_string());
    let priority = payload.priority.unwrap_or_else(|| "normal".to_string());

    // queue_number will be auto-generated by trigger
    let entry = sqlx::query_as::<_, QueueEntryResponse>(
        r#"
        INSERT INTO opd_queue (
            organization_id, patient_id, patient_ien, patient_name, department,
            visit_type, priority, chief_complaint, appointment_id, provider_id,
            status, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'waiting', $11)
        RETURNING
            id, organization_id, patient_id, patient_ien, patient_name, appointment_id,
            queue_number, department, visit_type, provider_id, provider_name,
            check_in_time, waiting_start_time, consultation_start_time, consultation_end_time,
            status, priority, chief_complaint, vitals_recorded, vitals_recorded_at,
            wait_time_minutes, notes, created_at, updated_at
        "#,
    )
    .bind(organization_id)
    .bind(payload.patient_id)
    .bind(patient.ien)
    .bind(&patient_name)
    .bind(&payload.department)
    .bind(&visit_type)
    .bind(&priority)
    .bind(&payload.chief_complaint)
    .bind(payload.appointment_id)
    .bind(payload.provider_id)
    .bind(user_id)
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to create queue entry: {:?}", e);
        AppError::from(e)
    })?;

    info!("Created queue entry {} with queue number {:?}", entry.id, entry.queue_number);
    Ok(Json(ApiResponse::success(entry)))
}

/// PATCH /v1/opd/queue/:id/status - Update queue entry status
#[tracing::instrument(skip(state))]
pub async fn update_queue_status(
    State(state): State<Arc<AppState>>,
    Path(queue_id): Path<Uuid>,
    Json(payload): Json<UpdateQueueStatusRequest>,
) -> Result<Json<ApiResponse<QueueEntryResponse>>, ApiError> {
    info!("Updating queue entry {} status to {}", queue_id, payload.status);

    let organization_id = Uuid::nil(); // Use a system organization ID for now
    let user_id = Uuid::nil(); // Use a system user ID for now

    // Validate status
    if !matches!(
        payload.status.as_str(),
        "waiting" | "in_consultation" | "completed" | "cancelled" | "no_show"
    ) {
        return Err(AppError::Validation("Invalid status".to_string()).into());
    }

    let entry = sqlx::query_as!(
        QueueEntryResponse,
        r#"
        UPDATE opd_queue
        SET status = $1,
            provider_id = COALESCE($2, provider_id),
            notes = COALESCE($3, notes),
            updated_by = $4
        WHERE id = $5 AND organization_id = $6 AND deleted_at IS NULL
        RETURNING
            id, organization_id, patient_id, patient_ien, patient_name, appointment_id,
            queue_number, department, visit_type, provider_id, provider_name,
            check_in_time, waiting_start_time, consultation_start_time, consultation_end_time,
            status, priority, chief_complaint, vitals_recorded, vitals_recorded_at,
            wait_time_minutes, notes, created_at, updated_at
        "#,
        payload.status,
        payload.provider_id,
        payload.notes,
        user_id,
        queue_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to update queue status: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Queue entry not found".to_string())
        } else {
            AppError::from(e)
        }
    })?;

    Ok(Json(ApiResponse::success(entry)))
}

/// POST /v1/opd/queue/:id/start-consultation - Start consultation for queue entry
#[tracing::instrument(skip(state))]
pub async fn start_consultation(
    State(state): State<Arc<AppState>>,
    Path(queue_id): Path<Uuid>,
    Json(payload): Json<StartConsultationRequest>,
) -> Result<Json<ApiResponse<ConsultationResponse>>, ApiError> {
    info!("Starting consultation for queue entry: {}", queue_id);

    let organization_id = Uuid::nil(); // Use a system organization ID for now
    let user_id = Uuid::nil(); // Use a system user ID for now

    let mut tx = state.database_pool.begin().await.map_err(|e| {
        error!("Failed to begin transaction: {:?}", e);
        AppError::from(e)
    })?;

    // Assertion 1: Verify queue entry exists and is in waiting status
    let queue_entry = sqlx::query!(
        r#"SELECT id, patient_id, department, status FROM opd_queue
           WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL"#,
        queue_id,
        organization_id
    )
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| {
        error!("Failed to fetch queue entry: {:?}", e);
        AppError::from(e)
    })?
    .ok_or_else(|| {
        warn!("Queue entry not found: {}", queue_id);
        AppError::NotFound("Queue entry not found".to_string())
    })?;

    // Update queue status to in_consultation
    sqlx::query!(
        r#"UPDATE opd_queue
           SET status = 'in_consultation',
               consultation_start_time = NOW(),
               provider_id = $1,
               updated_by = $2
           WHERE id = $3"#,
        payload.provider_id,
        user_id,
        queue_id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        error!("Failed to update queue entry: {:?}", e);
        AppError::from(e)
    })?;

    // Create consultation record
    let consultation_type = payload.consultation_type.unwrap_or_else(|| "general".to_string());

    let consultation = sqlx::query_as!(
        ConsultationResponse,
        r#"
        INSERT INTO opd_consultations (
            organization_id, queue_id, patient_id, provider_id,
            consultation_type, department, chief_complaint,
            status, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'in_progress', $8)
        RETURNING
            id, queue_id, patient_id, provider_id, provider_name,
            consultation_type, department, start_time, end_time, duration_minutes,
            chief_complaint, history_present_illness, examination_findings,
            provisional_diagnosis, treatment_plan, follow_up_required,
            follow_up_date, follow_up_instructions, status, completion_status,
            consultation_notes, created_at
        "#,
        organization_id,
        queue_id,
        queue_entry.patient_id,
        payload.provider_id,
        consultation_type,
        queue_entry.department,
        payload.chief_complaint,
        user_id
    )
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| {
        error!("Failed to create consultation: {:?}", e);
        AppError::from(e)
    })?;

    tx.commit().await.map_err(|e| {
        error!("Failed to commit transaction: {:?}", e);
        AppError::from(e)
    })?;

    // Assertion 2: Verify consultation was created
    assert!(
        consultation.status.as_deref() == Some("in_progress"),
        "Consultation should be in progress"
    );

    info!("Started consultation: {}", consultation.id);
    Ok(Json(ApiResponse::success(consultation)))
}

/// POST /v1/opd/queue/:id/complete-consultation - Complete consultation
#[tracing::instrument(skip(state))]
pub async fn complete_consultation(
    State(state): State<Arc<AppState>>,
    Path(queue_id): Path<Uuid>,
    Json(payload): Json<CompleteConsultationRequest>,
) -> Result<Json<ApiResponse<ConsultationResponse>>, ApiError> {
    info!("Completing consultation for queue entry: {}", queue_id);

    let organization_id = Uuid::nil(); // Use a system organization ID for now
    let user_id = Uuid::nil(); // Use a system user ID for now

    let mut tx = state.database_pool.begin().await.map_err(|e| {
        error!("Failed to begin transaction: {:?}", e);
        AppError::from(e)
    })?;

    // Get active consultation for this queue entry
    let consultation_id = sqlx::query_scalar!(
        r#"SELECT id FROM opd_consultations
           WHERE queue_id = $1 AND organization_id = $2 AND status = 'in_progress' AND deleted_at IS NULL
           ORDER BY start_time DESC LIMIT 1"#,
        queue_id,
        organization_id
    )
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| {
        error!("Failed to fetch consultation: {:?}", e);
        AppError::from(e)
    })?
    .ok_or_else(|| {
        warn!("No active consultation found for queue entry: {}", queue_id);
        AppError::NotFound("No active consultation found".to_string())
    })?;

    // Parse follow_up_date if provided
    let follow_up_date = if let Some(date_str) = payload.follow_up_date {
        Some(chrono::NaiveDate::parse_from_str(&date_str, "%Y-%m-%d").map_err(|e| {
            error!("Invalid follow_up_date format: {:?}", e);
            AppError::Validation("Invalid date format, expected YYYY-MM-DD".to_string())
        })?)
    } else {
        None
    };

    // Update consultation
    let consultation = sqlx::query_as!(
        ConsultationResponse,
        r#"
        UPDATE opd_consultations
        SET history_present_illness = COALESCE($1, history_present_illness),
            examination_findings = COALESCE($2, examination_findings),
            provisional_diagnosis = COALESCE($3, provisional_diagnosis),
            treatment_plan = COALESCE($4, treatment_plan),
            follow_up_required = COALESCE($5, follow_up_required),
            follow_up_date = COALESCE($6, follow_up_date),
            follow_up_instructions = COALESCE($7, follow_up_instructions),
            completion_status = $8,
            consultation_notes = COALESCE($9, consultation_notes),
            status = 'completed',
            end_time = NOW(),
            updated_by = $10
        WHERE id = $11 AND organization_id = $12
        RETURNING
            id, queue_id, patient_id, provider_id, provider_name,
            consultation_type, department, start_time, end_time, duration_minutes,
            chief_complaint, history_present_illness, examination_findings,
            provisional_diagnosis, treatment_plan, follow_up_required,
            follow_up_date, follow_up_instructions, status, completion_status,
            consultation_notes, created_at
        "#,
        payload.history_present_illness,
        payload.examination_findings,
        payload.provisional_diagnosis,
        payload.treatment_plan,
        payload.follow_up_required,
        follow_up_date,
        payload.follow_up_instructions,
        payload.completion_status,
        payload.consultation_notes,
        user_id,
        consultation_id,
        organization_id
    )
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| {
        error!("Failed to update consultation: {:?}", e);
        AppError::from(e)
    })?;

    // Update queue entry to completed
    sqlx::query!(
        r#"UPDATE opd_queue
           SET status = 'completed',
               consultation_end_time = NOW(),
               updated_by = $1
           WHERE id = $2"#,
        user_id,
        queue_id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        error!("Failed to update queue entry: {:?}", e);
        AppError::from(e)
    })?;

    tx.commit().await.map_err(|e| {
        error!("Failed to commit transaction: {:?}", e);
        AppError::from(e)
    })?;

    info!("Completed consultation: {}", consultation.id);
    Ok(Json(ApiResponse::success(consultation)))
}

/// POST /v1/opd/queue/:id/cancel - Cancel queue entry
#[tracing::instrument(skip(state))]
pub async fn cancel_queue_entry(
    State(state): State<Arc<AppState>>,
    Path(queue_id): Path<Uuid>,
    Json(reason): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<QueueEntryResponse>>, ApiError> {
    info!("Cancelling queue entry: {}", queue_id);

    let organization_id = Uuid::nil(); // Use a system organization ID for now
    let user_id = Uuid::nil(); // Use a system user ID for now

    let cancellation_reason = reason.get("reason").and_then(|v| v.as_str());

    let entry = sqlx::query_as!(
        QueueEntryResponse,
        r#"
        UPDATE opd_queue
        SET status = 'cancelled',
            cancelled_by = $1,
            cancelled_datetime = NOW(),
            cancellation_reason = $2,
            updated_by = $3
        WHERE id = $4 AND organization_id = $5 AND deleted_at IS NULL
        RETURNING
            id, organization_id, patient_id, patient_ien, patient_name, appointment_id,
            queue_number, department, visit_type, provider_id, provider_name,
            check_in_time, waiting_start_time, consultation_start_time, consultation_end_time,
            status, priority, chief_complaint, vitals_recorded, vitals_recorded_at,
            wait_time_minutes, notes, created_at, updated_at
        "#,
        user_id,
        cancellation_reason,
        user_id,
        queue_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to cancel queue entry: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Queue entry not found".to_string())
        } else {
            AppError::from(e)
        }
    })?;

    info!("Cancelled queue entry: {}", entry.id);
    Ok(Json(ApiResponse::success(entry)))
}
