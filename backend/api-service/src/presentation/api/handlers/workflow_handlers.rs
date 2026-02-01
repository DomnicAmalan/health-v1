//! Workflow Engine HTTP Handlers - n8n-style orchestration
//! Simplified implementation focusing on core functionality

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::Row;
use std::sync::Arc;
use uuid::Uuid;
use chrono::Utc;

use crate::presentation::api::AppState;

// ============================================================================
// Request/Response DTOs
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct CreateWorkflowRequest {
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub nodes: Value,
    pub edges: Value,
}

#[derive(Debug, Deserialize)]
pub struct StartWorkflowRequest {
    pub variables: Value,
}

#[derive(Debug, Deserialize)]
pub struct EmitEventRequest {
    pub payload: Value,
}

// ============================================================================
// Handlers
// ============================================================================

/// List all workflows
pub async fn list_workflows(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let result = sqlx::query(
        "SELECT id, name, description, category, is_active, created_at FROM workflows ORDER BY updated_at DESC"
    )
    .fetch_all(&*state.database_pool)
    .await;

    match result {
        Ok(rows) => {
            let workflows: Vec<Value> = rows.iter().map(|row| {
                serde_json::json!({
                    "id": row.get::<Uuid, _>("id"),
                    "name": row.get::<String, _>("name"),
                    "description": row.get::<Option<String>, _>("description"),
                    "category": row.get::<Option<String>, _>("category"),
                    "isActive": row.get::<bool, _>("is_active"),
                    "createdAt": row.get::<chrono::DateTime<Utc>, _>("created_at"),
                })
            }).collect();
            (StatusCode::OK, Json(workflows)).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Database error: {}", e)}))
        ).into_response()
    }
}

/// Get a workflow by ID
pub async fn get_workflow(
    State(state): State<Arc<AppState>>,
    Path(workflow_id): Path<Uuid>,
) -> impl IntoResponse {
    let result = sqlx::query(
        "SELECT * FROM workflows WHERE id = $1"
    )
    .bind(workflow_id)
    .fetch_optional(&*state.database_pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let workflow = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "name": row.get::<String, _>("name"),
                "description": row.get::<Option<String>, _>("description"),
                "version": row.get::<i32, _>("version"),
                "category": row.get::<Option<String>, _>("category"),
                "nodes": row.get::<Value, _>("nodes"),
                "edges": row.get::<Value, _>("edges"),
                "isActive": row.get::<bool, _>("is_active"),
                "tags": row.get::<Vec<String>, _>("tags"),
            });
            (StatusCode::OK, Json(workflow)).into_response()
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Workflow not found"}))
        ).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Database error: {}", e)}))
        ).into_response()
    }
}

/// Create a new workflow
pub async fn create_workflow(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateWorkflowRequest>,
) -> impl IntoResponse {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        INSERT INTO workflows (id, name, description, version, category, nodes, edges, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, 1, $4, $5, $6, true, $7, $8)
        RETURNING *
        "#
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.category)
    .bind(&req.nodes)
    .bind(&req.edges)
    .bind(now)
    .bind(now)
    .fetch_one(&*state.database_pool)
    .await;

    match result {
        Ok(row) => {
            let workflow = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "name": row.get::<String, _>("name"),
                "description": row.get::<Option<String>, _>("description"),
                "version": row.get::<i32, _>("version"),
                "category": row.get::<Option<String>, _>("category"),
                "nodes": row.get::<Value, _>("nodes"),
                "edges": row.get::<Value, _>("edges"),
                "isActive": row.get::<bool, _>("is_active"),
            });
            (StatusCode::CREATED, Json(workflow)).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to create workflow: {}", e)}))
        ).into_response()
    }
}

/// Update a workflow
pub async fn update_workflow(
    State(state): State<Arc<AppState>>,
    Path(workflow_id): Path<Uuid>,
    Json(req): Json<CreateWorkflowRequest>,
) -> impl IntoResponse {
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        UPDATE workflows
        SET name = $2, description = $3, category = $4, nodes = $5, edges = $6, updated_at = $7
        WHERE id = $1
        RETURNING *
        "#
    )
    .bind(workflow_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.category)
    .bind(&req.nodes)
    .bind(&req.edges)
    .bind(now)
    .fetch_one(&*state.database_pool)
    .await;

    match result {
        Ok(row) => {
            let workflow = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "name": row.get::<String, _>("name"),
                "nodes": row.get::<Value, _>("nodes"),
                "edges": row.get::<Value, _>("edges"),
            });
            (StatusCode::OK, Json(workflow)).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to update workflow: {}", e)}))
        ).into_response()
    }
}

/// Delete a workflow
pub async fn delete_workflow(
    State(state): State<Arc<AppState>>,
    Path(workflow_id): Path<Uuid>,
) -> impl IntoResponse {
    let result = sqlx::query("DELETE FROM workflows WHERE id = $1")
        .bind(workflow_id)
        .execute(&*state.database_pool)
        .await;

    match result {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to delete workflow: {}", e)}))
        ).into_response()
    }
}

/// Start a workflow instance
pub async fn start_workflow_instance(
    State(state): State<Arc<AppState>>,
    Path(workflow_id): Path<Uuid>,
    Json(req): Json<StartWorkflowRequest>,
) -> impl IntoResponse {
    let instance_id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        INSERT INTO workflow_instances (id, workflow_id, workflow_version, status, current_nodes, variables, history, started_at)
        VALUES ($1, $2, 1, 'running', ARRAY['start'], $3, '[]'::jsonb, $4)
        RETURNING *
        "#
    )
    .bind(instance_id)
    .bind(workflow_id)
    .bind(&req.variables)
    .bind(now)
    .fetch_one(&*state.database_pool)
    .await;

    match result {
        Ok(row) => {
            let instance = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "workflowId": row.get::<Uuid, _>("workflow_id"),
                "status": row.get::<String, _>("status"),
                "variables": row.get::<Value, _>("variables"),
                "startedAt": row.get::<chrono::DateTime<Utc>, _>("started_at"),
            });
            (StatusCode::CREATED, Json(instance)).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to start workflow: {}", e)}))
        ).into_response()
    }
}

/// List workflow instances
pub async fn list_workflow_instances(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let result = sqlx::query(
        "SELECT * FROM workflow_instances ORDER BY started_at DESC LIMIT 100"
    )
    .fetch_all(&*state.database_pool)
    .await;

    match result {
        Ok(rows) => {
            let instances: Vec<Value> = rows.iter().map(|row| {
                serde_json::json!({
                    "id": row.get::<Uuid, _>("id"),
                    "workflowId": row.get::<Uuid, _>("workflow_id"),
                    "status": row.get::<String, _>("status"),
                    "startedAt": row.get::<chrono::DateTime<Utc>, _>("started_at"),
                })
            }).collect();
            (StatusCode::OK, Json(instances)).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Database error: {}", e)}))
        ).into_response()
    }
}

/// Get a workflow instance
pub async fn get_workflow_instance(
    State(state): State<Arc<AppState>>,
    Path(instance_id): Path<Uuid>,
) -> impl IntoResponse {
    let result = sqlx::query(
        "SELECT * FROM workflow_instances WHERE id = $1"
    )
    .bind(instance_id)
    .fetch_optional(&*state.database_pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let instance = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "workflowId": row.get::<Uuid, _>("workflow_id"),
                "status": row.get::<String, _>("status"),
                "variables": row.get::<Value, _>("variables"),
                "history": row.get::<Value, _>("history"),
                "startedAt": row.get::<chrono::DateTime<Utc>, _>("started_at"),
            });
            (StatusCode::OK, Json(instance)).into_response()
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Workflow instance not found"}))
        ).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Database error: {}", e)}))
        ).into_response()
    }
}

/// List workflow tasks
pub async fn list_tasks(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let result = sqlx::query(
        "SELECT * FROM workflow_tasks WHERE status IN ('pending', 'claimed') ORDER BY created_at DESC LIMIT 100"
    )
    .fetch_all(&*state.database_pool)
    .await;

    match result {
        Ok(rows) => {
            let tasks: Vec<Value> = rows.iter().map(|row| {
                serde_json::json!({
                    "id": row.get::<Uuid, _>("id"),
                    "instanceId": row.get::<Uuid, _>("instance_id"),
                    "name": row.get::<String, _>("name"),
                    "assignee": row.get::<String, _>("assignee"),
                    "status": row.get::<String, _>("status"),
                    "createdAt": row.get::<chrono::DateTime<Utc>, _>("created_at"),
                })
            }).collect();
            (StatusCode::OK, Json(tasks)).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Database error: {}", e)}))
        ).into_response()
    }
}

/// Claim a task
pub async fn claim_task(
    State(state): State<Arc<AppState>>,
    Path(task_id): Path<Uuid>,
    Json(user_id_req): Json<Value>,
) -> impl IntoResponse {
    let user_id = user_id_req.get("userId").and_then(|v| v.as_str()).unwrap_or("unknown");

    let result = sqlx::query(
        "UPDATE workflow_tasks SET status = 'claimed', claimed_by = $2::uuid WHERE id = $1 AND status = 'pending' RETURNING *"
    )
    .bind(task_id)
    .bind(user_id)
    .fetch_optional(&*state.database_pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let task = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "status": row.get::<String, _>("status"),
            });
            (StatusCode::OK, Json(task)).into_response()
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Task not available"}))
        ).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to claim task: {}", e)}))
        ).into_response()
    }
}

/// Complete a task
pub async fn complete_task(
    State(state): State<Arc<AppState>>,
    Path(task_id): Path<Uuid>,
    Json(result_data): Json<Value>,
) -> impl IntoResponse {
    let now = Utc::now();

    let result = sqlx::query(
        "UPDATE workflow_tasks SET status = 'completed', result = $2, completed_at = $3 WHERE id = $1 RETURNING *"
    )
    .bind(task_id)
    .bind(result_data)
    .bind(now)
    .fetch_optional(&*state.database_pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let task = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "status": row.get::<String, _>("status"),
            });
            (StatusCode::OK, Json(task)).into_response()
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Task not found"}))
        ).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to complete task: {}", e)}))
        ).into_response()
    }
}

/// Emit an event to trigger workflows (n8n-style webhook)
pub async fn emit_event(
    State(state): State<Arc<AppState>>,
    Path(event_type): Path<String>,
    Json(req): Json<EmitEventRequest>,
) -> impl IntoResponse {
    let event_id = Uuid::new_v4();
    let now = Utc::now();

    // Store the event
    let _ = sqlx::query(
        "INSERT INTO workflow_events (id, event_type, payload, status, created_at) VALUES ($1, $2, $3, 'processed', $4)"
    )
    .bind(event_id)
    .bind(&event_type)
    .bind(&req.payload)
    .bind(now)
    .execute(&*state.database_pool)
    .await;

    // TODO: Trigger workflows that listen for this event type

    let response = serde_json::json!({
        "eventId": event_id,
        "eventType": event_type,
        "message": "Event received"
    });
    (StatusCode::ACCEPTED, Json(response)).into_response()
}

/// List available connectors
pub async fn list_connectors(
    State(_state): State<Arc<AppState>>,
) -> impl IntoResponse {
    // Create connector registry (connectors are stateless)
    use shared::application::services::connectors;
    let registry = connectors::create_connector_registry("http://localhost:8080/api");
    let metadata = registry.get_all_metadata();

    (StatusCode::OK, Json(metadata)).into_response()
}
