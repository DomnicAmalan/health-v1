// Task Queue / Worklist Handlers
// Universal task management for clinical and operational workflows

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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskRequest {
    pub task_type: String,
    pub task_title: String,
    pub task_description: Option<String>,
    pub task_category: Option<String>,
    pub assigned_to_role: Option<String>,
    pub assigned_to_user_id: Option<Uuid>,
    pub priority: Option<String>,
    pub patient_id: Option<Uuid>,
    pub patient_name: Option<String>,
    pub encounter_id: Option<Uuid>,
    pub order_id: Option<Uuid>,
    pub appointment_id: Option<Uuid>,
    pub due_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub task_data: Option<serde_json::Value>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub task_type: String,
    pub task_title: String,
    pub task_description: Option<String>,
    pub task_category: Option<String>,
    pub assigned_to_role: Option<String>,
    pub assigned_to_user_id: Option<Uuid>,
    pub assigned_by: Option<Uuid>,
    pub assigned_by_name: Option<String>,
    pub priority: String,
    pub status: String,
    pub patient_id: Option<Uuid>,
    pub patient_name: Option<String>,
    pub encounter_id: Option<Uuid>,
    pub order_id: Option<Uuid>,
    pub appointment_id: Option<Uuid>,
    pub due_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub started_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub completed_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub completed_by: Option<Uuid>,
    pub completed_by_name: Option<String>,
    pub task_data: Option<serde_json::Value>,
    pub notes: Option<String>,
    pub completion_notes: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorklistQuery {
    pub status: Option<String>,
    pub priority: Option<String>,
    pub task_type: Option<String>,
    pub assigned_to_role: Option<String>,
    pub patient_id: Option<Uuid>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskRequest {
    pub status: Option<String>,
    pub assigned_to_user_id: Option<Uuid>,
    pub priority: Option<String>,
    pub notes: Option<String>,
    pub completion_notes: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorklistSummary {
    pub total_pending: i64,
    pub total_in_progress: i64,
    pub total_stat: i64,
    pub total_urgent: i64,
    pub by_type: Vec<TaskTypeSummary>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskTypeSummary {
    pub task_type: String,
    pub count: i64,
}

// ============================================================================
// Handlers
// ============================================================================

/// GET /v1/worklist - Get tasks for current user's role
#[tracing::instrument(skip(state))]
pub async fn list_worklist(
    State(state): State<Arc<AppState>>,
    Query(query): Query<WorklistQuery>,
) -> Result<Json<ApiResponse<Vec<TaskResponse>>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    info!("Listing worklist for organization {}", organization_id);

    let limit = query.limit.unwrap_or(100).min(1000);
    let offset = query.offset.unwrap_or(0);

    // Execute query (using sqlx query builder)
    let tasks = sqlx::query_as!(
        TaskResponse,
        r#"
        SELECT
            id, organization_id, task_type, task_title, task_description, task_category,
            assigned_to_role, assigned_to_user_id, assigned_by, assigned_by_name,
            priority, status, patient_id, patient_name, encounter_id, order_id, appointment_id,
            due_datetime, started_datetime, completed_datetime, completed_by, completed_by_name,
            task_data, notes, completion_notes, created_at, updated_at
        FROM task_queue
        WHERE deleted_at IS NULL
          AND organization_id = $1
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR priority = $3)
          AND ($4::text IS NULL OR task_type = $4)
          AND ($5::uuid IS NULL OR patient_id = $5)
        ORDER BY
            CASE priority
                WHEN 'stat' THEN 1
                WHEN 'urgent' THEN 2
                WHEN 'normal' THEN 3
                WHEN 'low' THEN 4
            END,
            due_datetime ASC NULLS LAST,
            created_at DESC
        LIMIT $6 OFFSET $7
        "#,
        organization_id,
        query.status,
        query.priority,
        query.task_type,
        query.patient_id,
        limit,
        offset
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch worklist: {:?}", e);
        AppError::from(e)
    })?;

    Ok(Json(ApiResponse::success(tasks)))
}

/// GET /v1/worklist/summary - Get worklist summary
#[tracing::instrument(skip(state))]
pub async fn get_worklist_summary(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ApiResponse<WorklistSummary>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    info!("Getting worklist summary for organization {}", organization_id);

    // Get counts by status
    let status_counts = sqlx::query!(
        r#"
        SELECT
            COUNT(*) FILTER (WHERE status = 'pending') as "total_pending!",
            COUNT(*) FILTER (WHERE status = 'in_progress') as "total_in_progress!",
            COUNT(*) FILTER (WHERE priority = 'stat') as "total_stat!",
            COUNT(*) FILTER (WHERE priority = 'urgent') as "total_urgent!"
        FROM task_queue
        WHERE deleted_at IS NULL
          AND organization_id = $1
          AND status IN ('pending', 'in_progress')
        "#,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch status counts: {:?}", e);
        AppError::from(e)
    })?;

    // Get counts by task type
    let type_counts = sqlx::query_as!(
        TaskTypeSummary,
        r#"
        SELECT
            task_type,
            COUNT(*) as "count!"
        FROM task_queue
        WHERE deleted_at IS NULL
          AND organization_id = $1
          AND status IN ('pending', 'in_progress')
        GROUP BY task_type
        ORDER BY COUNT(*) DESC
        "#,
        organization_id
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch type counts: {:?}", e);
        AppError::from(e)
    })?;

    let summary = WorklistSummary {
        total_pending: status_counts.total_pending,
        total_in_progress: status_counts.total_in_progress,
        total_stat: status_counts.total_stat,
        total_urgent: status_counts.total_urgent,
        by_type: type_counts,
    };

    Ok(Json(ApiResponse::success(summary)))
}

/// POST /v1/worklist - Create new task
#[tracing::instrument(skip(state))]
pub async fn create_task(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateTaskRequest>,
) -> Result<Json<ApiResponse<TaskResponse>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    let user_id = Uuid::nil(); // Use system user for now
    let user_name = "System".to_string();
    info!("Creating task: {:?}", payload.task_title);

    // Validate priority
    let priority = payload.priority.as_deref().unwrap_or("normal");
    if !matches!(priority, "stat" | "urgent" | "normal" | "low") {
        return Err(AppError::Validation("Invalid priority".to_string()).into());
    }

    let task = sqlx::query_as!(
        TaskResponse,
        r#"
        INSERT INTO task_queue (
            organization_id, task_type, task_title, task_description, task_category,
            assigned_to_role, assigned_to_user_id, assigned_by, assigned_by_name,
            priority, status, patient_id, patient_name, encounter_id, order_id, appointment_id,
            due_datetime, task_data, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING
            id, organization_id, task_type, task_title, task_description, task_category,
            assigned_to_role, assigned_to_user_id, assigned_by, assigned_by_name,
            priority, status, patient_id, patient_name, encounter_id, order_id, appointment_id,
            due_datetime, started_datetime, completed_datetime, completed_by, completed_by_name,
            task_data, notes, completion_notes, created_at, updated_at
        "#,
        organization_id,
        payload.task_type,
        payload.task_title,
        payload.task_description,
        payload.task_category,
        payload.assigned_to_role,
        payload.assigned_to_user_id,
        Some(user_id),
        Some(user_name),
        priority,
        payload.patient_id,
        payload.patient_name,
        payload.encounter_id,
        payload.order_id,
        payload.appointment_id,
        payload.due_datetime,
        payload.task_data,
        payload.notes
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to create task: {:?}", e);
        AppError::from(e)
    })?;

    info!("Task created: {}", task.id);
    Ok(Json(ApiResponse::success(task)))
}

/// PATCH /v1/worklist/:id/claim - Claim a task
#[tracing::instrument(skip(state))]
pub async fn claim_task(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<TaskResponse>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    let user_id = Uuid::nil(); // Use system user for now
    info!("Claiming task: {}", id);

    let task = sqlx::query_as!(
        TaskResponse,
        r#"
        UPDATE task_queue
        SET
            assigned_to_user_id = $1,
            status = 'in_progress',
            started_datetime = NOW(),
            updated_at = NOW()
        WHERE id = $2
          AND organization_id = $3
          AND deleted_at IS NULL
          AND status = 'pending'
        RETURNING
            id, organization_id, task_type, task_title, task_description, task_category,
            assigned_to_role, assigned_to_user_id, assigned_by, assigned_by_name,
            priority, status, patient_id, patient_name, encounter_id, order_id, appointment_id,
            due_datetime, started_datetime, completed_datetime, completed_by, completed_by_name,
            task_data, notes, completion_notes, created_at, updated_at
        "#,
        user_id,
        id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to claim task: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Task not found or already claimed".to_string())
        } else {
            AppError::from(e)
        }
    })?;

    info!("Task claimed: {}", task.id);
    Ok(Json(ApiResponse::success(task)))
}

/// PATCH /v1/worklist/:id/complete - Complete a task
#[tracing::instrument(skip(state))]
pub async fn complete_task(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateTaskRequest>,
) -> Result<Json<ApiResponse<TaskResponse>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    let user_id = Uuid::nil(); // Use system user for now
    let user_name = "System".to_string();
    info!("Completing task: {}", id);

    let task = sqlx::query_as!(
        TaskResponse,
        r#"
        UPDATE task_queue
        SET
            status = 'completed',
            completed_datetime = NOW(),
            completed_by = $1,
            completed_by_name = $2,
            completion_notes = $3,
            updated_at = NOW()
        WHERE id = $4
          AND organization_id = $5
          AND deleted_at IS NULL
          AND status IN ('pending', 'in_progress')
        RETURNING
            id, organization_id, task_type, task_title, task_description, task_category,
            assigned_to_role, assigned_to_user_id, assigned_by, assigned_by_name,
            priority, status, patient_id, patient_name, encounter_id, order_id, appointment_id,
            due_datetime, started_datetime, completed_datetime, completed_by, completed_by_name,
            task_data, notes, completion_notes, created_at, updated_at
        "#,
        user_id,
        user_name,
        payload.completion_notes,
        id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to complete task: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Task not found or already completed".to_string())
        } else {
            AppError::from(e)
        }
    })?;

    info!("Task completed: {}", task.id);
    Ok(Json(ApiResponse::success(task)))
}

/// PATCH /v1/worklist/:id/cancel - Cancel a task
#[tracing::instrument(skip(state))]
pub async fn cancel_task(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<TaskResponse>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    info!("Cancelling task: {}", id);

    let task = sqlx::query_as!(
        TaskResponse,
        r#"
        UPDATE task_queue
        SET
            status = 'cancelled',
            updated_at = NOW()
        WHERE id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
          AND status IN ('pending', 'in_progress')
        RETURNING
            id, organization_id, task_type, task_title, task_description, task_category,
            assigned_to_role, assigned_to_user_id, assigned_by, assigned_by_name,
            priority, status, patient_id, patient_name, encounter_id, order_id, appointment_id,
            due_datetime, started_datetime, completed_datetime, completed_by, completed_by_name,
            task_data, notes, completion_notes, created_at, updated_at
        "#,
        id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to cancel task: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Task not found or already completed/cancelled".to_string())
        } else {
            AppError::from(e)
        }
    })?;

    info!("Task cancelled: {}", task.id);
    Ok(Json(ApiResponse::success(task)))
}
