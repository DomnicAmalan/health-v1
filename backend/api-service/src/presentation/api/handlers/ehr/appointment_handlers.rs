//! Appointment Management Handlers
//!
//! Provides REST API handlers for clinical appointment scheduling including:
//! - Appointment CRUD operations
//! - Check-in/check-out workflow
//! - Provider availability management
//! - Calendar views and scheduling
//! - Cancellation and no-show tracking

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc, NaiveDate, Datelike};
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
pub struct ListAppointmentsRequest {
    pub patient_id: Option<Uuid>,
    pub provider_id: Option<Uuid>,
    pub department: Option<String>,
    pub status: Option<String>,
    pub date_from: Option<String>,  // YYYY-MM-DD
    pub date_to: Option<String>,    // YYYY-MM-DD
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AppointmentResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub ien: Option<i32>,
    pub patient_id: Uuid,
    pub patient_ien: i32,
    pub provider_id: Option<Uuid>,
    pub provider_name: Option<String>,
    pub appointment_type: String,
    pub scheduled_datetime: DateTime<Utc>,
    pub duration_minutes: i32,
    pub scheduled_end_datetime: DateTime<Utc>,
    pub location_id: Option<Uuid>,
    pub location_name: Option<String>,
    pub room: Option<String>,
    pub department: Option<String>,
    pub status: String,
    pub check_in_datetime: Option<DateTime<Utc>>,
    pub check_out_datetime: Option<DateTime<Utc>>,
    pub reason: Option<String>,
    pub chief_complaint: Option<String>,
    pub patient_instructions: Option<String>,
    pub notes: Option<String>,
    pub reminder_sent: Option<bool>,
    pub wait_time_minutes: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAppointmentRequest {
    pub patient_id: Uuid,
    pub provider_id: Option<Uuid>,
    pub appointment_type: String,
    pub scheduled_datetime: String,  // ISO 8601 format
    pub duration_minutes: Option<i32>,
    pub location_id: Option<Uuid>,
    pub department: Option<String>,
    pub reason: Option<String>,
    pub patient_instructions: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAppointmentRequest {
    pub provider_id: Option<Uuid>,
    pub scheduled_datetime: Option<String>,
    pub duration_minutes: Option<i32>,
    pub location_id: Option<Uuid>,
    pub department: Option<String>,
    pub reason: Option<String>,
    pub patient_instructions: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CheckInRequest {
    pub check_in_datetime: Option<String>,
    pub chief_complaint: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CancelAppointmentRequest {
    pub reason_code: String,
    pub cancellation_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CheckAvailabilityRequest {
    pub provider_id: Uuid,
    pub date: String,  // YYYY-MM-DD
    pub duration_minutes: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct AvailabilitySlotResponse {
    pub start_time: String,
    pub end_time: String,
    pub is_available: bool,
    pub existing_appointments_count: i64,
}

#[derive(Debug, Serialize)]
pub struct CalendarDayResponse {
    pub date: NaiveDate,
    pub appointments: Vec<AppointmentResponse>,
    pub total_appointments: i64,
    pub available_slots: i64,
}

// ============================================================================
// Handlers
// ============================================================================

/// GET /v1/ehr/appointments - List appointments with filters
#[tracing::instrument(skip(state))]
pub async fn list_appointments(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListAppointmentsRequest>,
) -> Result<Json<ApiResponse<Vec<AppointmentResponse>>>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let organization_id = Uuid::nil();

    info!("Listing appointments");

    let limit = params.limit.unwrap_or(100).min(1000);

    let mut query_builder = sqlx::QueryBuilder::new(
        "SELECT id, organization_id, ien, patient_id, patient_ien, provider_id, provider_name,
                appointment_type, scheduled_datetime, duration_minutes, scheduled_end_datetime,
                location_id, location_name, room, department, status, check_in_datetime,
                check_out_datetime, reason, chief_complaint, patient_instructions, notes,
                reminder_sent, wait_time_minutes, created_at, updated_at
         FROM appointments
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

    if let Some(department) = params.department {
        query_builder.push(" AND department = ");
        query_builder.push_bind(department);
    }

    if let Some(status) = params.status {
        query_builder.push(" AND status = ");
        query_builder.push_bind(status);
    }

    if let Some(date_from) = params.date_from {
        query_builder.push(" AND DATE(scheduled_datetime) >= ");
        query_builder.push_bind(date_from);
    }

    if let Some(date_to) = params.date_to {
        query_builder.push(" AND DATE(scheduled_datetime) <= ");
        query_builder.push_bind(date_to);
    }

    query_builder.push(" ORDER BY scheduled_datetime ASC LIMIT ");
    query_builder.push_bind(limit);

    let appointments = query_builder
        .build_query_as::<AppointmentResponse>()
        .fetch_all(state.database_pool.as_ref())
        .await
        .map_err(|e| {
            error!("Failed to fetch appointments: {:?}", e);
            AppError::Internal(format!("Failed to fetch appointments: {}", e))
        })?;

    info!("Retrieved {} appointments", appointments.len());
    Ok(Json(ApiResponse::success(appointments)))
}

/// POST /v1/ehr/appointments - Create new appointment
#[tracing::instrument(skip(state))]
pub async fn create_appointment(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateAppointmentRequest>,
) -> Result<Json<ApiResponse<AppointmentResponse>>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();
    let organization_id = Uuid::nil();

    info!("Creating appointment for patient: {}", payload.patient_id);

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
        AppError::Internal(format!("Failed to fetch patient: {}", e))
    })?
    .ok_or_else(|| {
        warn!("Patient not found: {}", payload.patient_id);
        AppError::NotFound("Patient not found".to_string())
    })?;

    // Parse scheduled datetime
    let scheduled_datetime = DateTime::parse_from_rfc3339(&payload.scheduled_datetime)
        .map_err(|e| {
            error!("Invalid scheduled_datetime format: {:?}", e);
            AppError::Validation("Invalid datetime format, expected ISO 8601".to_string())
        })?
        .with_timezone(&Utc);

    let duration_minutes = payload.duration_minutes.unwrap_or(30);

    // Assertion 2: Validate duration
    debug_assert!(
        duration_minutes > 0 && duration_minutes <= 480,
        "Duration must be between 1 and 480 minutes"
    );

    // Check provider availability if provider specified
    if let Some(provider_id) = payload.provider_id {
        let conflicts = sqlx::query_scalar!(
            r#"SELECT COUNT(*) as "count!"
               FROM appointments
               WHERE provider_id = $1
                 AND organization_id = $2
                 AND status NOT IN ('cancelled', 'no_show', 'completed')
                 AND deleted_at IS NULL
                 AND (
                     (scheduled_datetime, scheduled_end_datetime) OVERLAPS ($3::timestamptz, $3::timestamptz + ($4 || ' minutes')::interval)
                 )"#,
            provider_id,
            organization_id,
            scheduled_datetime,
            duration_minutes.to_string()
        )
        .fetch_one(state.database_pool.as_ref())
        .await
        .map_err(|e| {
            error!("Failed to check appointment conflicts: {:?}", e);
            AppError::Internal(format!("Failed to check appointment conflicts: {}", e))
        })?;

        if conflicts > 0 {
            return Err(AppError::Conflict("Provider has conflicting appointment".to_string()).into());
        }
    }

    let appointment = sqlx::query_as!(
        AppointmentResponse,
        r#"
        INSERT INTO appointments (
            organization_id, patient_id, patient_ien, provider_id,
            appointment_type, scheduled_datetime, duration_minutes,
            location_id, department, reason, patient_instructions,
            status, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'scheduled', $12)
        RETURNING
            id, organization_id, ien, patient_id, patient_ien, provider_id, provider_name,
            appointment_type, scheduled_datetime, duration_minutes, scheduled_end_datetime,
            location_id, location_name, room, department, status, check_in_datetime,
            check_out_datetime, reason, chief_complaint, patient_instructions, notes,
            reminder_sent, wait_time_minutes, created_at, updated_at
        "#,
        organization_id,
        payload.patient_id,
        patient.ien,
        payload.provider_id,
        payload.appointment_type,
        scheduled_datetime,
        duration_minutes,
        payload.location_id,
        payload.department,
        payload.reason,
        payload.patient_instructions,
        user_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to create appointment: {:?}", e);
        AppError::Internal(format!("Failed to create appointment: {}", e))
    })?;

    info!("Created appointment: {}", appointment.id);
    Ok(Json(ApiResponse::success(appointment)))
}

/// GET /v1/ehr/appointments/:id - Get appointment details
#[tracing::instrument(skip(state))]
pub async fn get_appointment(
    State(state): State<Arc<AppState>>,
    Path(appointment_id): Path<Uuid>,
) -> Result<Json<ApiResponse<AppointmentResponse>>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let organization_id = Uuid::nil();

    info!("Getting appointment: {}", appointment_id);

    let appointment = sqlx::query_as!(
        AppointmentResponse,
        r#"SELECT id, organization_id, ien, patient_id, patient_ien, provider_id, provider_name,
                  appointment_type, scheduled_datetime, duration_minutes, scheduled_end_datetime,
                  location_id, location_name, room, department, status, check_in_datetime,
                  check_out_datetime, reason, chief_complaint, patient_instructions, notes,
                  reminder_sent, wait_time_minutes, created_at, updated_at
           FROM appointments
           WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL"#,
        appointment_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch appointment: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Appointment not found".to_string())
        } else {
            AppError::Internal(format!("Failed to fetch appointment: {}", e))
        }
    })?;

    Ok(Json(ApiResponse::success(appointment)))
}

/// PUT /v1/ehr/appointments/:id - Update appointment
#[tracing::instrument(skip(state))]
pub async fn update_appointment(
    State(state): State<Arc<AppState>>,
    Path(appointment_id): Path<Uuid>,
    Json(payload): Json<UpdateAppointmentRequest>,
) -> Result<Json<ApiResponse<AppointmentResponse>>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();
    let organization_id = Uuid::nil();

    info!("Updating appointment: {}", appointment_id);

    // Parse scheduled_datetime if provided
    let scheduled_datetime = if let Some(dt_str) = payload.scheduled_datetime {
        Some(DateTime::parse_from_rfc3339(&dt_str)
            .map_err(|e| {
                error!("Invalid scheduled_datetime format: {:?}", e);
                AppError::Validation("Invalid datetime format, expected ISO 8601".to_string())
            })?
            .with_timezone(&Utc))
    } else {
        None
    };

    let appointment = sqlx::query_as!(
        AppointmentResponse,
        r#"
        UPDATE appointments
        SET provider_id = COALESCE($1, provider_id),
            scheduled_datetime = COALESCE($2, scheduled_datetime),
            duration_minutes = COALESCE($3, duration_minutes),
            location_id = COALESCE($4, location_id),
            department = COALESCE($5, department),
            reason = COALESCE($6, reason),
            patient_instructions = COALESCE($7, patient_instructions),
            notes = COALESCE($8, notes),
            updated_by = $9
        WHERE id = $10 AND organization_id = $11 AND deleted_at IS NULL
        RETURNING
            id, organization_id, ien, patient_id, patient_ien, provider_id, provider_name,
            appointment_type, scheduled_datetime, duration_minutes, scheduled_end_datetime,
            location_id, location_name, room, department, status, check_in_datetime,
            check_out_datetime, reason, chief_complaint, patient_instructions, notes,
            reminder_sent, wait_time_minutes, created_at, updated_at
        "#,
        payload.provider_id,
        scheduled_datetime,
        payload.duration_minutes,
        payload.location_id,
        payload.department,
        payload.reason,
        payload.patient_instructions,
        payload.notes,
        user_id,
        appointment_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to update appointment: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Appointment not found".to_string())
        } else {
            AppError::Internal(format!("Failed to update appointment: {}", e))
        }
    })?;

    info!("Updated appointment: {}", appointment.id);
    Ok(Json(ApiResponse::success(appointment)))
}

/// POST /v1/ehr/appointments/:id/check-in - Check in patient for appointment
#[tracing::instrument(skip(state))]
pub async fn check_in_appointment(
    State(state): State<Arc<AppState>>,
    Path(appointment_id): Path<Uuid>,
    Json(payload): Json<CheckInRequest>,
) -> Result<Json<ApiResponse<AppointmentResponse>>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();
    let organization_id = Uuid::nil();

    info!("Checking in appointment: {}", appointment_id);

    let check_in_time = if let Some(dt_str) = payload.check_in_datetime {
        DateTime::parse_from_rfc3339(&dt_str)
            .map_err(|e| {
                error!("Invalid check_in_datetime format: {:?}", e);
                AppError::Validation("Invalid datetime format, expected ISO 8601".to_string())
            })?
            .with_timezone(&Utc)
    } else {
        Utc::now()
    };

    let appointment = sqlx::query_as!(
        AppointmentResponse,
        r#"
        UPDATE appointments
        SET status = 'checked_in',
            check_in_datetime = $1,
            chief_complaint = COALESCE($2, chief_complaint),
            updated_by = $3
        WHERE id = $4 AND organization_id = $5 AND deleted_at IS NULL
        RETURNING
            id, organization_id, ien, patient_id, patient_ien, provider_id, provider_name,
            appointment_type, scheduled_datetime, duration_minutes, scheduled_end_datetime,
            location_id, location_name, room, department, status, check_in_datetime,
            check_out_datetime, reason, chief_complaint, patient_instructions, notes,
            reminder_sent, wait_time_minutes, created_at, updated_at
        "#,
        check_in_time,
        payload.chief_complaint,
        user_id,
        appointment_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to check in appointment: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Appointment not found".to_string())
        } else {
            AppError::Internal(format!("Failed to check in appointment: {}", e))
        }
    })?;

    info!("Checked in appointment: {}", appointment.id);
    Ok(Json(ApiResponse::success(appointment)))
}

/// POST /v1/ehr/appointments/:id/cancel - Cancel appointment
#[tracing::instrument(skip(state))]
pub async fn cancel_appointment(
    State(state): State<Arc<AppState>>,
    Path(appointment_id): Path<Uuid>,
    Json(payload): Json<CancelAppointmentRequest>,
) -> Result<Json<ApiResponse<AppointmentResponse>>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();
    let organization_id = Uuid::nil();

    info!("Cancelling appointment: {}", appointment_id);

    let appointment = sqlx::query_as!(
        AppointmentResponse,
        r#"
        UPDATE appointments
        SET status = 'cancelled',
            cancelled_by = $1,
            cancelled_datetime = NOW(),
            cancellation_reason = $2,
            updated_by = $3
        WHERE id = $4 AND organization_id = $5 AND deleted_at IS NULL
        RETURNING
            id, organization_id, ien, patient_id, patient_ien, provider_id, provider_name,
            appointment_type, scheduled_datetime, duration_minutes, scheduled_end_datetime,
            location_id, location_name, room, department, status, check_in_datetime,
            check_out_datetime, reason, chief_complaint, patient_instructions, notes,
            reminder_sent, wait_time_minutes, created_at, updated_at
        "#,
        user_id,
        payload.cancellation_reason,
        user_id,
        appointment_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to cancel appointment: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Appointment not found".to_string())
        } else {
            AppError::Internal(format!("Failed to cancel appointment: {}", e))
        }
    })?;

    info!("Cancelled appointment: {}", appointment.id);
    Ok(Json(ApiResponse::success(appointment)))
}

/// DELETE /v1/ehr/appointments/:id - Delete appointment (soft delete)
#[tracing::instrument(skip(state))]
pub async fn delete_appointment(
    State(state): State<Arc<AppState>>,
    Path(appointment_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();
    let organization_id = Uuid::nil();

    info!("Deleting appointment: {}", appointment_id);

    let result = sqlx::query!(
        r#"UPDATE appointments SET deleted_at = NOW(), updated_by = $1
           WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL"#,
        user_id,
        appointment_id,
        organization_id
    )
    .execute(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to delete appointment: {:?}", e);
        AppError::Internal(format!("Failed to delete appointment: {}", e))
    })?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Appointment not found".to_string()).into());
    }

    info!("Deleted appointment: {}", appointment_id);
    Ok(StatusCode::NO_CONTENT)
}

/// GET /v1/ehr/appointments/availability - Check provider availability
#[tracing::instrument(skip(state))]
pub async fn check_availability(
    State(state): State<Arc<AppState>>,
    Query(params): Query<CheckAvailabilityRequest>,
) -> Result<Json<ApiResponse<Vec<AvailabilitySlotResponse>>>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let organization_id = Uuid::nil();

    info!("Checking availability for provider: {}", params.provider_id);

    let date = NaiveDate::parse_from_str(&params.date, "%Y-%m-%d")
        .map_err(|e| {
            error!("Invalid date format: {:?}", e);
            AppError::Validation("Invalid date format, expected YYYY-MM-DD".to_string())
        })?;

    let duration_minutes = params.duration_minutes.unwrap_or(30);
    let day_of_week = date.weekday().num_days_from_sunday() as i32;

    // Get provider's availability template for this day
    let availability_slots = sqlx::query!(
        r#"SELECT start_time, end_time, slot_duration_minutes, max_appointments_per_slot
           FROM appointment_availability
           WHERE provider_id = $1
             AND organization_id = $2
             AND day_of_week = $3
             AND is_active = true
             AND deleted_at IS NULL
             AND (effective_start_date IS NULL OR effective_start_date <= $4)
             AND (effective_end_date IS NULL OR effective_end_date >= $4)"#,
        params.provider_id,
        organization_id,
        day_of_week,
        date
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch availability: {:?}", e);
        AppError::Internal(format!("Failed to fetch availability: {}", e))
    })?;

    let mut slots = Vec::new();

    for avail in availability_slots {
        let start_time = avail.start_time;
        let end_time = avail.end_time;
        let slot_duration = avail.slot_duration_minutes;
        let max_per_slot = avail.max_appointments_per_slot.unwrap_or(1);

        // Generate time slots
        let mut current_time = start_time;
        while current_time < end_time {
            let slot_end = std::cmp::min(
                current_time + chrono::Duration::minutes(slot_duration as i64),
                end_time
            );

            let slot_start_str = current_time.format("%H:%M:%S").to_string();
            let slot_end_str = slot_end.format("%H:%M:%S").to_string();

            // Check existing appointments in this slot
            let existing_count = sqlx::query_scalar!(
                r#"SELECT COUNT(*) as "count!"
                   FROM appointments
                   WHERE provider_id = $1
                     AND organization_id = $2
                     AND scheduled_datetime::date = $3
                     AND scheduled_datetime::time = $4
                     AND status NOT IN ('cancelled', 'no_show')
                     AND deleted_at IS NULL"#,
                params.provider_id,
                organization_id,
                date,
                current_time
            )
            .fetch_one(state.database_pool.as_ref())
            .await
            .map_err(|e| {
                error!("Failed to count existing appointments: {:?}", e);
                AppError::Internal(format!("Failed to count existing appointments: {}", e))
            })?;

            slots.push(AvailabilitySlotResponse {
                start_time: slot_start_str,
                end_time: slot_end_str,
                is_available: existing_count < max_per_slot as i64,
                existing_appointments_count: existing_count,
            });

            current_time = slot_end;
        }
    }

    Ok(Json(ApiResponse::success(slots)))
}
