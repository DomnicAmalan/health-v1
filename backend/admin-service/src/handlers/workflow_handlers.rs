//! Visual Workflow Handlers for Admin Service
//!
//! REST API endpoints for n8n-style visual workflow management.
//! Each handler instantiates the repository, calls the appropriate method,
//! and converts domain entities into response DTOs.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use shared::domain::entities::{
    CreateVisualWorkflow, HumanTask, StartWorkflowInstance, UpdateVisualWorkflow,
    VisualWorkflow, VisualWorkflowSummary, WorkflowInstance,
};
use shared::domain::repositories::VisualWorkflowRepository;
use shared::infrastructure::repositories::VisualWorkflowRepositoryImpl;
use shared::RequestContext;
use std::sync::Arc;
use tracing::error;
use uuid::Uuid;

// Type alias for app state
type ConcreteAppState = shared::AppState<
    authz_core::auth::LoginUseCase,
    authz_core::auth::RefreshTokenUseCase,
    authz_core::auth::LogoutUseCase,
    authz_core::auth::UserInfoUseCase,
    crate::use_cases::setup::SetupOrganizationUseCase,
    crate::use_cases::setup::CreateSuperAdminUseCase,
>;

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct CreateWorkflowRequest {
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub nodes: serde_json::Value,
    pub edges: serde_json::Value,
    pub input_schema: Option<serde_json::Value>,
    pub output_schema: Option<serde_json::Value>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateWorkflowRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub nodes: Option<serde_json::Value>,
    pub edges: Option<serde_json::Value>,
    pub input_schema: Option<serde_json::Value>,
    pub output_schema: Option<serde_json::Value>,
    pub is_active: Option<bool>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct ListWorkflowsQuery {
    pub category: Option<String>,
    pub is_active: Option<bool>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct CloneWorkflowRequest {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct StartWorkflowRequest {
    pub variables: Option<serde_json::Value>,
    pub correlation_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListInstancesQuery {
    pub status: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct ListTasksQuery {
    pub assignee: Option<String>,
    pub status: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct CompleteTaskRequest {
    pub result: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct WorkflowResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub version: i32,
    pub nodes: serde_json::Value,
    pub edges: serde_json::Value,
    pub input_schema: Option<serde_json::Value>,
    pub output_schema: Option<serde_json::Value>,
    pub is_active: bool,
    pub tags: Option<Vec<String>>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct WorkflowSummaryResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub version: i32,
    pub is_active: bool,
    pub tags: Option<Vec<String>>,
    pub node_count: i32,
    pub edge_count: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct InstanceResponse {
    pub id: Uuid,
    pub workflow_id: Uuid,
    pub workflow_version: i32,
    pub status: String,
    pub current_nodes: Vec<String>,
    pub variables: serde_json::Value,
    pub history: serde_json::Value,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub error: Option<String>,
    pub correlation_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TaskResponse {
    pub id: Uuid,
    pub instance_id: Uuid,
    pub node_id: String,
    pub name: String,
    pub description: Option<String>,
    pub assignee: String,
    pub form_schema: Option<serde_json::Value>,
    pub form_data: Option<serde_json::Value>,
    pub status: String,
    pub priority: Option<String>,
    pub due_date: Option<String>,
    pub claimed_by: Option<Uuid>,
    pub completed_at: Option<String>,
    pub result: Option<serde_json::Value>,
    pub created_at: String,
}

// ============================================================================
// Entity → Response Conversions
// ============================================================================

impl From<VisualWorkflow> for WorkflowResponse {
    fn from(w: VisualWorkflow) -> Self {
        WorkflowResponse {
            id: w.id,
            name: w.name,
            description: w.description,
            category: w.category,
            version: w.version,
            nodes: w.nodes,
            edges: w.edges,
            input_schema: w.input_schema,
            output_schema: w.output_schema,
            is_active: w.is_active,
            tags: w.tags,
            created_at: w.created_at.to_rfc3339(),
            updated_at: w.updated_at.to_rfc3339(),
        }
    }
}

impl From<VisualWorkflowSummary> for WorkflowSummaryResponse {
    fn from(s: VisualWorkflowSummary) -> Self {
        WorkflowSummaryResponse {
            id: s.id,
            name: s.name,
            description: s.description,
            category: s.category,
            version: s.version,
            is_active: s.is_active,
            tags: s.tags,
            node_count: s.node_count,
            edge_count: s.edge_count,
            created_at: s.created_at.to_rfc3339(),
            updated_at: s.updated_at.to_rfc3339(),
        }
    }
}

impl From<WorkflowInstance> for InstanceResponse {
    fn from(i: WorkflowInstance) -> Self {
        InstanceResponse {
            id: i.id,
            workflow_id: i.workflow_id,
            workflow_version: i.workflow_version,
            status: i.status,
            current_nodes: i.current_nodes,
            variables: i.variables,
            history: i.history,
            started_at: i.started_at.to_rfc3339(),
            completed_at: i.completed_at.map(|t| t.to_rfc3339()),
            error: i.error,
            correlation_id: i.correlation_id,
        }
    }
}

impl From<HumanTask> for TaskResponse {
    fn from(t: HumanTask) -> Self {
        TaskResponse {
            id: t.id,
            instance_id: t.instance_id,
            node_id: t.node_id,
            name: t.name,
            description: t.description,
            assignee: t.assignee,
            form_schema: t.form_schema,
            form_data: t.form_data,
            status: t.status,
            priority: t.priority,
            due_date: t.due_date.map(|d| d.to_rfc3339()),
            claimed_by: t.claimed_by,
            completed_at: t.completed_at.map(|d| d.to_rfc3339()),
            result: t.result,
            created_at: t.created_at.to_rfc3339(),
        }
    }
}

// ============================================================================
// Helper: map AppError to HTTP response
// ============================================================================

fn error_response(err: shared::AppError) -> impl IntoResponse {
    let (status, message) = match &err {
        shared::AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
        shared::AppError::Validation(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
        shared::AppError::Conflict(msg) => (StatusCode::CONFLICT, msg.clone()),
        _ => {
            error!(error = %err, "Workflow handler error");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error".to_string(),
            )
        }
    };
    (status, Json(serde_json::json!({ "error": message })))
}

// ============================================================================
// Workflow Definition Handlers
// ============================================================================

/// Create a new workflow
/// POST /v1/admin/workflows
pub async fn create_workflow(
    State(state): State<Arc<ConcreteAppState>>,
    ctx: RequestContext,
    Json(request): Json<CreateWorkflowRequest>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    let org_id = match ctx.organization_id {
        Some(id) => id,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": "Organization ID not found in auth context" })),
            )
                .into_response();
        }
    };

    let create = CreateVisualWorkflow {
        organization_id: org_id,
        name: request.name,
        description: request.description,
        category: request.category,
        nodes: request.nodes,
        edges: request.edges,
        input_schema: request.input_schema,
        output_schema: request.output_schema,
        tags: request.tags,
        created_by: Some(ctx.user_id),
    };

    match repo.create_workflow(create).await {
        Ok(workflow) => {
            let resp: WorkflowResponse = workflow.into();
            (StatusCode::CREATED, Json(serde_json::to_value(resp).unwrap_or_default())).into_response()
        }
        Err(err) => error_response(err).into_response(),
    }
}

/// List all workflows
/// GET /v1/admin/workflows
pub async fn list_workflows(
    State(state): State<Arc<ConcreteAppState>>,
    ctx: RequestContext,
    Query(query): Query<ListWorkflowsQuery>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    let org_id = match ctx.organization_id {
        Some(id) => id,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": "Organization ID not found in auth context" })),
            )
                .into_response();
        }
    };

    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);

    let result = if let Some(ref category) = query.category {
        repo.find_workflows_by_category(org_id, category).await
    } else {
        repo.find_workflows_by_org(org_id, limit, offset).await
    };

    match result {
        Ok(workflows) => {
            let total = workflows.len();
            let items: Vec<WorkflowSummaryResponse> =
                workflows.into_iter().map(Into::into).collect();
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "workflows": items,
                    "total": total
                })),
            )
                .into_response()
        }
        Err(err) => error_response(err).into_response(),
    }
}

/// Get a specific workflow
/// GET /v1/admin/workflows/:id
pub async fn get_workflow(
    State(state): State<Arc<ConcreteAppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    match repo.find_workflow_by_id(id).await {
        Ok(Some(workflow)) => {
            let resp: WorkflowResponse = workflow.into();
            (StatusCode::OK, Json(serde_json::to_value(resp).unwrap_or_default())).into_response()
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": format!("Workflow {} not found", id) })),
        )
            .into_response(),
        Err(err) => error_response(err).into_response(),
    }
}

/// Update a workflow
/// PUT /v1/admin/workflows/:id
pub async fn update_workflow(
    State(state): State<Arc<ConcreteAppState>>,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateWorkflowRequest>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    let update = UpdateVisualWorkflow {
        name: request.name,
        description: request.description,
        category: request.category,
        nodes: request.nodes,
        edges: request.edges,
        input_schema: request.input_schema,
        output_schema: request.output_schema,
        is_active: request.is_active,
        tags: request.tags,
    };

    match repo.update_workflow(id, update).await {
        Ok(workflow) => {
            let resp: WorkflowResponse = workflow.into();
            (StatusCode::OK, Json(serde_json::to_value(resp).unwrap_or_default())).into_response()
        }
        Err(err) => error_response(err).into_response(),
    }
}

/// Delete a workflow
/// DELETE /v1/admin/workflows/:id
pub async fn delete_workflow(
    State(state): State<Arc<ConcreteAppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    match repo.delete_workflow(id).await {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(err) => error_response(err).into_response(),
    }
}

/// Clone a workflow
/// POST /v1/admin/workflows/:id/clone
pub async fn clone_workflow(
    State(state): State<Arc<ConcreteAppState>>,
    Path(id): Path<Uuid>,
    Json(request): Json<CloneWorkflowRequest>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    match repo.clone_workflow(id, request.name).await {
        Ok(workflow) => {
            let resp: WorkflowResponse = workflow.into();
            (StatusCode::CREATED, Json(serde_json::to_value(resp).unwrap_or_default())).into_response()
        }
        Err(err) => error_response(err).into_response(),
    }
}

/// Activate a workflow
/// POST /v1/admin/workflows/:id/activate
pub async fn activate_workflow(
    State(state): State<Arc<ConcreteAppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    match repo.activate_workflow(id).await {
        Ok(workflow) => {
            let resp: WorkflowResponse = workflow.into();
            (StatusCode::OK, Json(serde_json::to_value(resp).unwrap_or_default())).into_response()
        }
        Err(err) => error_response(err).into_response(),
    }
}

/// Deactivate a workflow
/// POST /v1/admin/workflows/:id/deactivate
pub async fn deactivate_workflow(
    State(state): State<Arc<ConcreteAppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    match repo.deactivate_workflow(id).await {
        Ok(workflow) => {
            let resp: WorkflowResponse = workflow.into();
            (StatusCode::OK, Json(serde_json::to_value(resp).unwrap_or_default())).into_response()
        }
        Err(err) => error_response(err).into_response(),
    }
}

// ============================================================================
// Workflow Instance Handlers
// ============================================================================

/// Start a workflow instance
/// POST /v1/admin/workflows/:id/start
pub async fn start_instance(
    State(state): State<Arc<ConcreteAppState>>,
    Path(workflow_id): Path<Uuid>,
    Json(request): Json<StartWorkflowRequest>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    let start = StartWorkflowInstance {
        workflow_id,
        variables: request.variables,
        correlation_id: request.correlation_id,
        parent_instance_id: None,
    };

    match repo.start_instance(start).await {
        Ok(instance) => {
            let resp: InstanceResponse = instance.into();
            (StatusCode::CREATED, Json(serde_json::to_value(resp).unwrap_or_default())).into_response()
        }
        Err(err) => error_response(err).into_response(),
    }
}

/// List workflow instances
/// GET /v1/admin/workflows/:id/instances
pub async fn list_instances(
    State(state): State<Arc<ConcreteAppState>>,
    Path(workflow_id): Path<Uuid>,
    Query(query): Query<ListInstancesQuery>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);

    match repo.list_instances(workflow_id, limit, offset).await {
        Ok(instances) => {
            let total = instances.len();
            let items: Vec<InstanceResponse> = instances.into_iter().map(Into::into).collect();
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "instances": items,
                    "total": total
                })),
            )
                .into_response()
        }
        Err(err) => error_response(err).into_response(),
    }
}

/// Get a workflow instance
/// GET /v1/admin/workflow-instances/:id
pub async fn get_instance(
    State(state): State<Arc<ConcreteAppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    match repo.get_instance(id).await {
        Ok(Some(instance)) => {
            let resp: InstanceResponse = instance.into();
            (StatusCode::OK, Json(serde_json::to_value(resp).unwrap_or_default())).into_response()
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": format!("Instance {} not found", id) })),
        )
            .into_response(),
        Err(err) => error_response(err).into_response(),
    }
}

/// Pause a workflow instance
/// POST /v1/admin/workflow-instances/:id/pause
pub async fn pause_instance(
    State(state): State<Arc<ConcreteAppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    match repo.update_instance_status(id, "paused", None).await {
        Ok(instance) => {
            let resp: InstanceResponse = instance.into();
            (StatusCode::OK, Json(serde_json::to_value(resp).unwrap_or_default())).into_response()
        }
        Err(err) => error_response(err).into_response(),
    }
}

/// Resume a workflow instance
/// POST /v1/admin/workflow-instances/:id/resume
pub async fn resume_instance(
    State(state): State<Arc<ConcreteAppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    match repo.update_instance_status(id, "running", None).await {
        Ok(instance) => {
            let resp: InstanceResponse = instance.into();
            (StatusCode::OK, Json(serde_json::to_value(resp).unwrap_or_default())).into_response()
        }
        Err(err) => error_response(err).into_response(),
    }
}

/// Cancel a workflow instance
/// POST /v1/admin/workflow-instances/:id/cancel
pub async fn cancel_instance(
    State(state): State<Arc<ConcreteAppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    match repo.update_instance_status(id, "cancelled", None).await {
        Ok(instance) => {
            let resp: InstanceResponse = instance.into();
            (StatusCode::OK, Json(serde_json::to_value(resp).unwrap_or_default())).into_response()
        }
        Err(err) => error_response(err).into_response(),
    }
}

// ============================================================================
// Human Task Handlers
// ============================================================================

/// List tasks
/// GET /v1/admin/workflow-tasks
pub async fn list_tasks(
    State(state): State<Arc<ConcreteAppState>>,
    Query(query): Query<ListTasksQuery>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    let assignee = query.assignee.unwrap_or_default();
    if assignee.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "assignee query parameter is required" })),
        )
            .into_response();
    }

    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);

    match repo.get_pending_tasks(&assignee, limit, offset).await {
        Ok(tasks) => {
            let total = tasks.len();
            let items: Vec<TaskResponse> = tasks.into_iter().map(Into::into).collect();
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "tasks": items,
                    "total": total
                })),
            )
                .into_response()
        }
        Err(err) => error_response(err).into_response(),
    }
}

/// Get a task
/// GET /v1/admin/workflow-tasks/:id
pub async fn get_task(
    State(state): State<Arc<ConcreteAppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    match repo.get_task(id).await {
        Ok(Some(task)) => {
            let resp: TaskResponse = task.into();
            (StatusCode::OK, Json(serde_json::to_value(resp).unwrap_or_default())).into_response()
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": format!("Task {} not found", id) })),
        )
            .into_response(),
        Err(err) => error_response(err).into_response(),
    }
}

/// Claim a task
/// POST /v1/admin/workflow-tasks/:id/claim
pub async fn claim_task(
    State(state): State<Arc<ConcreteAppState>>,
    ctx: RequestContext,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    match repo.claim_task(id, ctx.user_id).await {
        Ok(task) => {
            let resp: TaskResponse = task.into();
            (StatusCode::OK, Json(serde_json::to_value(resp).unwrap_or_default())).into_response()
        }
        Err(err) => error_response(err).into_response(),
    }
}

/// Unclaim a task
/// POST /v1/admin/workflow-tasks/:id/unclaim
pub async fn unclaim_task(
    State(state): State<Arc<ConcreteAppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    match repo.unclaim_task(id).await {
        Ok(task) => {
            let resp: TaskResponse = task.into();
            (StatusCode::OK, Json(serde_json::to_value(resp).unwrap_or_default())).into_response()
        }
        Err(err) => error_response(err).into_response(),
    }
}

/// Complete a task
/// POST /v1/admin/workflow-tasks/:id/complete
pub async fn complete_task(
    State(state): State<Arc<ConcreteAppState>>,
    Path(id): Path<Uuid>,
    Json(request): Json<CompleteTaskRequest>,
) -> impl IntoResponse {
    let repo = VisualWorkflowRepositoryImpl::new(state.database_service.clone());

    match repo.complete_task(id, request.result).await {
        Ok(task) => {
            let resp: TaskResponse = task.into();
            (StatusCode::OK, Json(serde_json::to_value(resp).unwrap_or_default())).into_response()
        }
        Err(err) => error_response(err).into_response(),
    }
}
