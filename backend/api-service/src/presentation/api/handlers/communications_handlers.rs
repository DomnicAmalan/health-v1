// Communications Handlers
// Internal messages and notifications for clinical staff

use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info};
use uuid::Uuid;

use shared::shared::api_response::{ApiError, ApiResponse};
use shared::shared::error::AppError;
use super::AppState;

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageRequest {
    pub recipient_id: Uuid,
    pub subject: String,
    pub message_body: String,
    pub message_type: Option<String>,
    pub priority: Option<String>,
    pub patient_id: Option<Uuid>,
    pub patient_name: Option<String>,
    pub encounter_id: Option<Uuid>,
    pub reply_to_message_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InternalMessageResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub subject: String,
    pub message_body: String,
    pub message_type: Option<String>,
    pub sender_id: Uuid,
    pub sender_name: Option<String>,
    pub sender_role: Option<String>,
    pub recipient_id: Uuid,
    pub recipient_name: Option<String>,
    pub recipient_role: Option<String>,
    pub patient_id: Option<Uuid>,
    pub patient_name: Option<String>,
    pub encounter_id: Option<Uuid>,
    pub priority: Option<String>,
    pub read: Option<bool>,
    pub read_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub archived: Option<bool>,
    pub reply_to_message_id: Option<Uuid>,
    pub thread_root_id: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageQuery {
    pub folder: Option<String>,  // inbox, sent, archived
    pub read: Option<bool>,
    pub message_type: Option<String>,
    pub patient_id: Option<Uuid>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub user_name: Option<String>,
    pub notification_type: String,
    pub title: String,
    pub message: String,
    pub action_url: Option<String>,
    pub entity_type: Option<String>,
    pub entity_id: Option<Uuid>,
    pub read: Option<bool>,
    pub read_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub priority: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationQuery {
    pub read: Option<bool>,
    pub notification_type: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNotificationRequest {
    pub user_id: Uuid,
    pub notification_type: String,
    pub title: String,
    pub message: String,
    pub action_url: Option<String>,
    pub entity_type: Option<String>,
    pub entity_id: Option<Uuid>,
    pub priority: Option<String>,
}

// ============================================================================
// Internal Message Handlers
// ============================================================================

/// POST /v1/messages - Send internal message
#[tracing::instrument(skip(state))]
pub async fn send_message(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<SendMessageRequest>,
) -> Result<Json<ApiResponse<InternalMessageResponse>>, ApiError> {
    // Use a system user ID for now
    let user_id = Uuid::nil();
    // Use a system organization ID for now
    let organization_id = Uuid::nil();
    let user_full_name = "System".to_string();
    let user_role = "system".to_string();

    info!("Sending message from {} to {}", user_id, payload.recipient_id);

    // Get recipient info
    let recipient = sqlx::query!(
        "SELECT username as full_name, 'user' as role FROM users WHERE id = $1",
        payload.recipient_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch recipient: {:?}", e);
        AppError::from(e)
    })?
    .ok_or_else(|| AppError::NotFound("Recipient not found".to_string()))?;

    let message_type = payload.message_type.as_deref().unwrap_or("general");
    let priority = payload.priority.as_deref().unwrap_or("normal");

    // Validate message_type and priority
    if !matches!(message_type, "general" | "consult" | "handoff" | "alert" | "urgent") {
        return Err(AppError::Validation("Invalid message_type".to_string()).into());
    }
    if !matches!(priority, "stat" | "urgent" | "normal" | "low") {
        return Err(AppError::Validation("Invalid priority".to_string()).into());
    }

    let message = sqlx::query_as!(
        InternalMessageResponse,
        r#"
        INSERT INTO internal_messages (
            organization_id, subject, message_body, message_type,
            sender_id, sender_name, sender_role,
            recipient_id, recipient_name, recipient_role,
            patient_id, patient_name, encounter_id,
            priority, reply_to_message_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING
            id, organization_id, subject, message_body, message_type,
            sender_id, sender_name, sender_role,
            recipient_id, recipient_name, recipient_role,
            patient_id, patient_name, encounter_id,
            priority, read, read_datetime, archived,
            reply_to_message_id, thread_root_id, created_at
        "#,
        organization_id,
        payload.subject,
        payload.message_body,
        message_type,
        user_id,
        user_full_name,
        user_role,
        payload.recipient_id,
        recipient.full_name,
        recipient.role,
        payload.patient_id,
        payload.patient_name,
        payload.encounter_id,
        priority,
        payload.reply_to_message_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to send message: {:?}", e);
        AppError::from(e)
    })?;

    // Create notification for recipient
    let _ = sqlx::query!(
        r#"
        INSERT INTO notifications (
            user_id, notification_type, title, message,
            action_url, entity_type, entity_id, priority
        )
        VALUES ($1, 'new_message', $2, $3, $4, 'message', $5, $6)
        "#,
        payload.recipient_id,
        format!("New message from {}", user_full_name),
        payload.subject,
        format!("/messages/{}", message.id),
        message.id,
        priority
    )
    .execute(state.database_pool.as_ref())
    .await;

    info!("Message sent: {}", message.id);
    Ok(Json(ApiResponse::success(message)))
}

/// GET /v1/messages - Get messages (inbox/sent/archived)
#[tracing::instrument(skip(state))]
pub async fn list_messages(
    State(state): State<Arc<AppState>>,
    Query(query): Query<MessageQuery>,
) -> Result<Json<ApiResponse<Vec<InternalMessageResponse>>>, ApiError> {
    // Use a system user ID for now
    let user_id = Uuid::nil();

    info!("Listing messages for user: {}", user_id);

    let limit = query.limit.unwrap_or(100).min(1000);
    let folder = query.folder.as_deref().unwrap_or("inbox");

    let messages = match folder {
        "inbox" => {
            sqlx::query_as!(
                InternalMessageResponse,
                r#"
                SELECT
                    id, organization_id, subject, message_body, message_type,
                    sender_id, sender_name, sender_role,
                    recipient_id, recipient_name, recipient_role,
                    patient_id, patient_name, encounter_id,
                    priority, read, read_datetime, archived,
                    reply_to_message_id, thread_root_id, created_at
                FROM internal_messages
                WHERE recipient_id = $1
                  AND deleted_at IS NULL
                  AND archived = FALSE
                  AND ($2::boolean IS NULL OR read = $2)
                  AND ($3::text IS NULL OR message_type = $3)
                  AND ($4::uuid IS NULL OR patient_id = $4)
                ORDER BY created_at DESC
                LIMIT $5
                "#,
                user_id,
                query.read,
                query.message_type,
                query.patient_id,
                limit
            )
            .fetch_all(state.database_pool.as_ref())
            .await
        }
        "sent" => {
            sqlx::query_as!(
                InternalMessageResponse,
                r#"
                SELECT
                    id, organization_id, subject, message_body, message_type,
                    sender_id, sender_name, sender_role,
                    recipient_id, recipient_name, recipient_role,
                    patient_id, patient_name, encounter_id,
                    priority, read, read_datetime, archived,
                    reply_to_message_id, thread_root_id, created_at
                FROM internal_messages
                WHERE sender_id = $1
                  AND deleted_at IS NULL
                  AND ($2::text IS NULL OR message_type = $2)
                  AND ($3::uuid IS NULL OR patient_id = $3)
                ORDER BY created_at DESC
                LIMIT $4
                "#,
                user_id,
                query.message_type,
                query.patient_id,
                limit
            )
            .fetch_all(state.database_pool.as_ref())
            .await
        }
        "archived" => {
            sqlx::query_as!(
                InternalMessageResponse,
                r#"
                SELECT
                    id, organization_id, subject, message_body, message_type,
                    sender_id, sender_name, sender_role,
                    recipient_id, recipient_name, recipient_role,
                    patient_id, patient_name, encounter_id,
                    priority, read, read_datetime, archived,
                    reply_to_message_id, thread_root_id, created_at
                FROM internal_messages
                WHERE recipient_id = $1
                  AND deleted_at IS NULL
                  AND archived = TRUE
                  AND ($2::text IS NULL OR message_type = $2)
                  AND ($3::uuid IS NULL OR patient_id = $3)
                ORDER BY created_at DESC
                LIMIT $4
                "#,
                user_id,
                query.message_type,
                query.patient_id,
                limit
            )
            .fetch_all(state.database_pool.as_ref())
            .await
        }
        _ => {
            return Err(AppError::Validation("Invalid folder".to_string()).into());
        }
    }
    .map_err(|e| {
        error!("Failed to fetch messages: {:?}", e);
        AppError::from(e)
    })?;

    Ok(Json(ApiResponse::success(messages)))
}

/// PATCH /v1/messages/:id/read - Mark message as read
#[tracing::instrument(skip(state))]
pub async fn mark_message_read(
    State(state): State<Arc<AppState>>,
    Path(message_id): Path<Uuid>,
) -> Result<Json<ApiResponse<InternalMessageResponse>>, ApiError> {
    // Use a system user ID for now
    let user_id = Uuid::nil();

    info!("Marking message as read: {}", message_id);

    let message = sqlx::query_as!(
        InternalMessageResponse,
        r#"
        UPDATE internal_messages
        SET read = TRUE, read_datetime = NOW(), updated_at = NOW()
        WHERE id = $1
          AND recipient_id = $2
          AND deleted_at IS NULL
        RETURNING
            id, organization_id, subject, message_body, message_type,
            sender_id, sender_name, sender_role,
            recipient_id, recipient_name, recipient_role,
            patient_id, patient_name, encounter_id,
            priority, read, read_datetime, archived,
            reply_to_message_id, thread_root_id, created_at
        "#,
        message_id,
        user_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to mark message as read: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Message not found".to_string())
        } else {
            AppError::from(e)
        }
    })?;

    Ok(Json(ApiResponse::success(message)))
}

// ============================================================================
// Notification Handlers
// ============================================================================

/// GET /v1/notifications - Get notifications for current user
#[tracing::instrument(skip(state))]
pub async fn list_notifications(
    State(state): State<Arc<AppState>>,
    Query(query): Query<NotificationQuery>,
) -> Result<Json<ApiResponse<Vec<NotificationResponse>>>, ApiError> {
    // Use a system user ID for now
    let user_id = Uuid::nil();

    info!("Listing notifications for user: {}", user_id);

    let limit = query.limit.unwrap_or(100).min(1000);

    let notifications = sqlx::query_as!(
        NotificationResponse,
        r#"
        SELECT
            id, user_id, user_name, notification_type,
            title, message, action_url, entity_type, entity_id,
            read, read_datetime, priority, created_at
        FROM notifications
        WHERE user_id = $1
          AND dismissed = FALSE
          AND ($2::boolean IS NULL OR read = $2)
          AND ($3::text IS NULL OR notification_type = $3)
        ORDER BY
            CASE priority
                WHEN 'stat' THEN 1
                WHEN 'urgent' THEN 2
                WHEN 'normal' THEN 3
                WHEN 'low' THEN 4
            END,
            created_at DESC
        LIMIT $4
        "#,
        user_id,
        query.read,
        query.notification_type,
        limit
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch notifications: {:?}", e);
        AppError::from(e)
    })?;

    Ok(Json(ApiResponse::success(notifications)))
}

/// PATCH /v1/notifications/:id/read - Mark notification as read
#[tracing::instrument(skip(state))]
pub async fn mark_notification_read(
    State(state): State<Arc<AppState>>,
    Path(notification_id): Path<Uuid>,
) -> Result<Json<ApiResponse<NotificationResponse>>, ApiError> {
    // Use a system user ID for now
    let user_id = Uuid::nil();

    info!("Marking notification as read: {}", notification_id);

    let notification = sqlx::query_as!(
        NotificationResponse,
        r#"
        UPDATE notifications
        SET read = TRUE, read_datetime = NOW(), updated_at = NOW()
        WHERE id = $1
          AND user_id = $2
        RETURNING
            id, user_id, user_name, notification_type,
            title, message, action_url, entity_type, entity_id,
            read, read_datetime, priority, created_at
        "#,
        notification_id,
        user_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to mark notification as read: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Notification not found".to_string())
        } else {
            AppError::from(e)
        }
    })?;

    Ok(Json(ApiResponse::success(notification)))
}

/// PATCH /v1/notifications/read-all - Mark all notifications as read
#[tracing::instrument(skip(state))]
pub async fn mark_all_notifications_read(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ApiResponse<serde_json::Value>>, ApiError> {
    // Use a system user ID for now
    let user_id = Uuid::nil();

    info!("Marking all notifications as read for user: {}", user_id);

    let result = sqlx::query!(
        r#"
        UPDATE notifications
        SET read = TRUE, read_datetime = NOW(), updated_at = NOW()
        WHERE user_id = $1 AND read = FALSE
        "#,
        user_id
    )
    .execute(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to mark all notifications as read: {:?}", e);
        AppError::from(e)
    })?;

    Ok(Json(ApiResponse::success(serde_json::json!({
        "updated": result.rows_affected()
    }))))
}

/// POST /v1/notifications - Create notification (internal use)
#[tracing::instrument(skip(state))]
pub async fn create_notification(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateNotificationRequest>,
) -> Result<Json<ApiResponse<NotificationResponse>>, ApiError> {
    info!("Creating notification for user: {}", payload.user_id);

    let priority = payload.priority.as_deref().unwrap_or("normal");
    if !matches!(priority, "stat" | "urgent" | "normal" | "low") {
        return Err(AppError::Validation("Invalid priority".to_string()).into());
    }

    let notification = sqlx::query_as!(
        NotificationResponse,
        r#"
        INSERT INTO notifications (
            user_id, notification_type, title, message,
            action_url, entity_type, entity_id, priority
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
            id, user_id, user_name, notification_type,
            title, message, action_url, entity_type, entity_id,
            read, read_datetime, priority, created_at
        "#,
        payload.user_id,
        payload.notification_type,
        payload.title,
        payload.message,
        payload.action_url,
        payload.entity_type,
        payload.entity_id,
        priority
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to create notification: {:?}", e);
        AppError::from(e)
    })?;

    info!("Notification created: {}", notification.id);
    Ok(Json(ApiResponse::success(notification)))
}
