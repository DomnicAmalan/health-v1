//! PostgreSQL implementation of the Visual Workflow Repository
//!
//! Implements n8n-style visual workflow persistence using compile-time checked
//! sqlx queries (`query_as!` / `query!` / `query_scalar!`).

use async_trait::async_trait;
use chrono::Utc;
use std::sync::Arc;
use uuid::Uuid;

use crate::domain::entities::{
    CreateHumanTask, CreateVisualWorkflow, HumanTask, StartWorkflowInstance,
    UpdateVisualWorkflow, VisualWorkflow, VisualWorkflowSummary, WorkflowInstance,
};
use crate::domain::repositories::VisualWorkflowRepository;
use crate::infrastructure::database::{DatabaseService, RepositoryErrorExt};
use crate::shared::{AppError, AppResult};

/// Maximum page size for paginated queries (Tiger Style: explicit resource limits)
const PAGINATION_LIMIT_MAX: i64 = 1000;

/// PostgreSQL implementation of the Visual Workflow Repository
pub struct VisualWorkflowRepositoryImpl {
    database_service: Arc<DatabaseService>,
}

impl VisualWorkflowRepositoryImpl {
    pub fn new(database_service: Arc<DatabaseService>) -> Self {
        Self { database_service }
    }
}

/// Clamp a pagination limit to the maximum allowed value.
fn clamp_limit(limit: u32) -> i64 {
    let clamped = (limit as i64).min(PAGINATION_LIMIT_MAX);
    assert!(clamped <= PAGINATION_LIMIT_MAX, "Limit exceeds maximum");
    clamped
}

#[async_trait]
impl VisualWorkflowRepository for VisualWorkflowRepositoryImpl {
    // ========================================================================
    // Workflow Definition CRUD
    // ========================================================================

    async fn create_workflow(&self, workflow: CreateVisualWorkflow) -> AppResult<VisualWorkflow> {
        assert!(!workflow.name.is_empty(), "Workflow name must not be empty");
        assert!(workflow.name.len() <= 200, "Workflow name exceeds 200 chars");

        let id = Uuid::new_v4();
        let now = Utc::now();

        let row = sqlx::query_as!(
            VisualWorkflow,
            r#"
            INSERT INTO visual_workflows (
                id, organization_id, name, description, category, version,
                nodes, edges, input_schema, output_schema,
                is_active, tags, created_at, updated_at, created_by
            )
            VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $8, $9, false, $10, $11, $11, $12)
            RETURNING
                id, organization_id, name, description, category, version,
                nodes, edges, input_schema, output_schema,
                is_active, tags, created_at, updated_at, created_by
            "#,
            id,
            workflow.organization_id,
            workflow.name,
            workflow.description,
            workflow.category,
            workflow.nodes,
            workflow.edges,
            workflow.input_schema,
            workflow.output_schema,
            workflow.tags.as_deref(),
            now,
            workflow.created_by,
        )
        .fetch_one(self.database_service.pool())
        .await
        .map_db_error("create", "visual_workflow")?;

        assert_eq!(row.id, id, "Created workflow ID mismatch");
        Ok(row)
    }

    async fn find_workflow_by_id(&self, id: Uuid) -> AppResult<Option<VisualWorkflow>> {
        assert!(!id.is_nil(), "Workflow ID must not be nil");

        let row = sqlx::query_as!(
            VisualWorkflow,
            r#"
            SELECT
                id, organization_id, name, description, category, version,
                nodes, edges, input_schema, output_schema,
                is_active, tags, created_at, updated_at, created_by
            FROM visual_workflows
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("fetch", "visual_workflow")?;

        Ok(row)
    }

    async fn find_workflows_by_org(
        &self,
        org_id: Uuid,
        limit: u32,
        offset: u32,
    ) -> AppResult<Vec<VisualWorkflowSummary>> {
        assert!(!org_id.is_nil(), "Organization ID must not be nil");
        let limit_val = clamp_limit(limit);
        assert!(limit_val > 0, "Limit must be positive");

        let rows = sqlx::query_as!(
            VisualWorkflowSummary,
            r#"
            SELECT
                id, organization_id, name, description, category, version,
                is_active, tags,
                jsonb_array_length(nodes)::int as "node_count!",
                jsonb_array_length(edges)::int as "edge_count!",
                created_at, updated_at
            FROM visual_workflows
            WHERE organization_id = $1
            ORDER BY updated_at DESC
            LIMIT $2 OFFSET $3
            "#,
            org_id,
            limit_val,
            offset as i64,
        )
        .fetch_all(self.database_service.pool())
        .await
        .map_db_error("list", "visual_workflows")?;

        Ok(rows)
    }

    async fn find_workflows_by_category(
        &self,
        org_id: Uuid,
        category: &str,
    ) -> AppResult<Vec<VisualWorkflowSummary>> {
        assert!(!org_id.is_nil(), "Organization ID must not be nil");
        assert!(!category.is_empty(), "Category must not be empty");

        let rows = sqlx::query_as!(
            VisualWorkflowSummary,
            r#"
            SELECT
                id, organization_id, name, description, category, version,
                is_active, tags,
                jsonb_array_length(nodes)::int as "node_count!",
                jsonb_array_length(edges)::int as "edge_count!",
                created_at, updated_at
            FROM visual_workflows
            WHERE organization_id = $1 AND category = $2
            ORDER BY updated_at DESC
            LIMIT 1000
            "#,
            org_id,
            category,
        )
        .fetch_all(self.database_service.pool())
        .await
        .map_db_error("list_by_category", "visual_workflows")?;

        Ok(rows)
    }

    async fn update_workflow(
        &self,
        id: Uuid,
        update: UpdateVisualWorkflow,
    ) -> AppResult<VisualWorkflow> {
        assert!(!id.is_nil(), "Workflow ID must not be nil");

        let now = Utc::now();
        let row = sqlx::query_as!(
            VisualWorkflow,
            r#"
            UPDATE visual_workflows SET
                name = COALESCE($2, name),
                description = COALESCE($3, description),
                category = COALESCE($4, category),
                nodes = COALESCE($5, nodes),
                edges = COALESCE($6, edges),
                input_schema = COALESCE($7, input_schema),
                output_schema = COALESCE($8, output_schema),
                is_active = COALESCE($9, is_active),
                tags = COALESCE($10, tags),
                version = version + 1,
                updated_at = $11
            WHERE id = $1
            RETURNING
                id, organization_id, name, description, category, version,
                nodes, edges, input_schema, output_schema,
                is_active, tags, created_at, updated_at, created_by
            "#,
            id,
            update.name,
            update.description,
            update.category,
            update.nodes,
            update.edges,
            update.input_schema,
            update.output_schema,
            update.is_active,
            update.tags.as_deref(),
            now,
        )
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("update", "visual_workflow")?
        .ok_or_else(|| AppError::NotFound(format!("Workflow {} not found", id)))?;

        assert_eq!(row.id, id, "Updated workflow ID mismatch");
        Ok(row)
    }

    async fn delete_workflow(&self, id: Uuid) -> AppResult<()> {
        assert!(!id.is_nil(), "Workflow ID must not be nil");

        let result = sqlx::query!(
            "DELETE FROM visual_workflows WHERE id = $1",
            id
        )
        .execute(self.database_service.pool())
        .await
        .map_db_error("delete", "visual_workflow")?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound(format!("Workflow {} not found", id)));
        }
        assert_eq!(result.rows_affected(), 1, "Delete affected unexpected row count");
        Ok(())
    }

    async fn clone_workflow(&self, id: Uuid, new_name: String) -> AppResult<VisualWorkflow> {
        assert!(!id.is_nil(), "Workflow ID must not be nil");
        assert!(!new_name.is_empty(), "New name must not be empty");

        let original = self
            .find_workflow_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("Workflow {} not found", id)))?;

        let new_id = Uuid::new_v4();
        let now = Utc::now();

        let row = sqlx::query_as!(
            VisualWorkflow,
            r#"
            INSERT INTO visual_workflows (
                id, organization_id, name, description, category, version,
                nodes, edges, input_schema, output_schema,
                is_active, tags, created_at, updated_at, created_by
            )
            VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $8, $9, false, $10, $11, $11, $12)
            RETURNING
                id, organization_id, name, description, category, version,
                nodes, edges, input_schema, output_schema,
                is_active, tags, created_at, updated_at, created_by
            "#,
            new_id,
            original.organization_id,
            new_name,
            original.description,
            original.category,
            original.nodes,
            original.edges,
            original.input_schema,
            original.output_schema,
            original.tags.as_deref(),
            now,
            original.created_by,
        )
        .fetch_one(self.database_service.pool())
        .await
        .map_db_error("clone", "visual_workflow")?;

        assert_eq!(row.id, new_id, "Cloned workflow ID mismatch");
        Ok(row)
    }

    async fn activate_workflow(&self, id: Uuid) -> AppResult<VisualWorkflow> {
        assert!(!id.is_nil(), "Workflow ID must not be nil");

        let row = sqlx::query_as!(
            VisualWorkflow,
            r#"
            UPDATE visual_workflows
            SET is_active = true, updated_at = $2
            WHERE id = $1
            RETURNING
                id, organization_id, name, description, category, version,
                nodes, edges, input_schema, output_schema,
                is_active, tags, created_at, updated_at, created_by
            "#,
            id,
            Utc::now(),
        )
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("activate", "visual_workflow")?
        .ok_or_else(|| AppError::NotFound(format!("Workflow {} not found", id)))?;

        assert!(row.is_active, "Workflow should be active after activation");
        Ok(row)
    }

    async fn deactivate_workflow(&self, id: Uuid) -> AppResult<VisualWorkflow> {
        assert!(!id.is_nil(), "Workflow ID must not be nil");

        let row = sqlx::query_as!(
            VisualWorkflow,
            r#"
            UPDATE visual_workflows
            SET is_active = false, updated_at = $2
            WHERE id = $1
            RETURNING
                id, organization_id, name, description, category, version,
                nodes, edges, input_schema, output_schema,
                is_active, tags, created_at, updated_at, created_by
            "#,
            id,
            Utc::now(),
        )
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("deactivate", "visual_workflow")?
        .ok_or_else(|| AppError::NotFound(format!("Workflow {} not found", id)))?;

        assert!(!row.is_active, "Workflow should be inactive after deactivation");
        Ok(row)
    }

    // ========================================================================
    // Workflow Instance Operations
    // ========================================================================

    async fn start_instance(&self, request: StartWorkflowInstance) -> AppResult<WorkflowInstance> {
        assert!(!request.workflow_id.is_nil(), "Workflow ID must not be nil");

        // Fetch the current workflow to get version
        let workflow = self
            .find_workflow_by_id(request.workflow_id)
            .await?
            .ok_or_else(|| {
                AppError::NotFound(format!("Workflow {} not found", request.workflow_id))
            })?;

        let id = Uuid::new_v4();
        let now = Utc::now();
        let variables = request.variables.unwrap_or(serde_json::json!({}));
        let empty_nodes: Vec<String> = vec![];
        let empty_history = serde_json::json!([]);

        let row = sqlx::query_as!(
            WorkflowInstance,
            r#"
            INSERT INTO workflow_instances (
                id, workflow_id, workflow_version, status,
                current_nodes, variables, history,
                started_at, correlation_id, parent_instance_id
            )
            VALUES ($1, $2, $3, 'running', $4, $5, $6, $7, $8, $9)
            RETURNING
                id, workflow_id, workflow_version, status,
                current_nodes, variables, history,
                started_at, completed_at, error,
                correlation_id, parent_instance_id
            "#,
            id,
            request.workflow_id,
            workflow.version,
            &empty_nodes,
            variables,
            empty_history,
            now,
            request.correlation_id,
            request.parent_instance_id,
        )
        .fetch_one(self.database_service.pool())
        .await
        .map_db_error("start", "workflow_instance")?;

        assert_eq!(row.id, id, "Created instance ID mismatch");
        assert_eq!(row.status, "running", "New instance should have running status");
        Ok(row)
    }

    async fn get_instance(&self, instance_id: Uuid) -> AppResult<Option<WorkflowInstance>> {
        assert!(!instance_id.is_nil(), "Instance ID must not be nil");

        let row = sqlx::query_as!(
            WorkflowInstance,
            r#"
            SELECT
                id, workflow_id, workflow_version, status,
                current_nodes, variables, history,
                started_at, completed_at, error,
                correlation_id, parent_instance_id
            FROM workflow_instances
            WHERE id = $1
            "#,
            instance_id
        )
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("fetch", "workflow_instance")?;

        Ok(row)
    }

    async fn list_instances(
        &self,
        workflow_id: Uuid,
        limit: u32,
        offset: u32,
    ) -> AppResult<Vec<WorkflowInstance>> {
        assert!(!workflow_id.is_nil(), "Workflow ID must not be nil");
        let limit_val = clamp_limit(limit);
        assert!(limit_val > 0, "Limit must be positive");

        let rows = sqlx::query_as!(
            WorkflowInstance,
            r#"
            SELECT
                id, workflow_id, workflow_version, status,
                current_nodes, variables, history,
                started_at, completed_at, error,
                correlation_id, parent_instance_id
            FROM workflow_instances
            WHERE workflow_id = $1
            ORDER BY started_at DESC
            LIMIT $2 OFFSET $3
            "#,
            workflow_id,
            limit_val,
            offset as i64,
        )
        .fetch_all(self.database_service.pool())
        .await
        .map_db_error("list", "workflow_instances")?;

        Ok(rows)
    }

    async fn list_instances_by_status(
        &self,
        org_id: Uuid,
        status: &str,
        limit: u32,
        offset: u32,
    ) -> AppResult<Vec<WorkflowInstance>> {
        assert!(!org_id.is_nil(), "Organization ID must not be nil");
        assert!(!status.is_empty(), "Status must not be empty");
        let limit_val = clamp_limit(limit);

        let rows = sqlx::query_as!(
            WorkflowInstance,
            r#"
            SELECT
                wi.id, wi.workflow_id, wi.workflow_version, wi.status,
                wi.current_nodes, wi.variables, wi.history,
                wi.started_at, wi.completed_at, wi.error,
                wi.correlation_id, wi.parent_instance_id
            FROM workflow_instances wi
            INNER JOIN visual_workflows vw ON vw.id = wi.workflow_id
            WHERE vw.organization_id = $1 AND wi.status = $2
            ORDER BY wi.started_at DESC
            LIMIT $3 OFFSET $4
            "#,
            org_id,
            status,
            limit_val,
            offset as i64,
        )
        .fetch_all(self.database_service.pool())
        .await
        .map_db_error("list_by_status", "workflow_instances")?;

        Ok(rows)
    }

    async fn update_instance_status(
        &self,
        instance_id: Uuid,
        status: &str,
        error: Option<String>,
    ) -> AppResult<WorkflowInstance> {
        assert!(!instance_id.is_nil(), "Instance ID must not be nil");
        assert!(!status.is_empty(), "Status must not be empty");

        let is_terminal = matches!(status, "completed" | "failed" | "cancelled");
        let completed_at = if is_terminal { Some(Utc::now()) } else { None };

        let row = sqlx::query_as!(
            WorkflowInstance,
            r#"
            UPDATE workflow_instances SET
                status = $2,
                error = $3,
                completed_at = COALESCE($4, completed_at)
            WHERE id = $1
            RETURNING
                id, workflow_id, workflow_version, status,
                current_nodes, variables, history,
                started_at, completed_at, error,
                correlation_id, parent_instance_id
            "#,
            instance_id,
            status,
            error,
            completed_at,
        )
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("update_status", "workflow_instance")?
        .ok_or_else(|| AppError::NotFound(format!("Instance {} not found", instance_id)))?;

        assert_eq!(row.status, status, "Status should match after update");
        Ok(row)
    }

    async fn update_instance_nodes(
        &self,
        instance_id: Uuid,
        current_nodes: Vec<String>,
    ) -> AppResult<WorkflowInstance> {
        assert!(!instance_id.is_nil(), "Instance ID must not be nil");

        let row = sqlx::query_as!(
            WorkflowInstance,
            r#"
            UPDATE workflow_instances SET current_nodes = $2
            WHERE id = $1
            RETURNING
                id, workflow_id, workflow_version, status,
                current_nodes, variables, history,
                started_at, completed_at, error,
                correlation_id, parent_instance_id
            "#,
            instance_id,
            &current_nodes,
        )
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("update_nodes", "workflow_instance")?
        .ok_or_else(|| AppError::NotFound(format!("Instance {} not found", instance_id)))?;

        assert_eq!(row.id, instance_id, "Updated instance ID mismatch");
        Ok(row)
    }

    async fn update_instance_variables(
        &self,
        instance_id: Uuid,
        variables: serde_json::Value,
    ) -> AppResult<WorkflowInstance> {
        assert!(!instance_id.is_nil(), "Instance ID must not be nil");

        let row = sqlx::query_as!(
            WorkflowInstance,
            r#"
            UPDATE workflow_instances SET variables = $2
            WHERE id = $1
            RETURNING
                id, workflow_id, workflow_version, status,
                current_nodes, variables, history,
                started_at, completed_at, error,
                correlation_id, parent_instance_id
            "#,
            instance_id,
            variables,
        )
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("update_variables", "workflow_instance")?
        .ok_or_else(|| AppError::NotFound(format!("Instance {} not found", instance_id)))?;

        assert_eq!(row.id, instance_id, "Updated instance ID mismatch");
        Ok(row)
    }

    async fn append_instance_history(
        &self,
        instance_id: Uuid,
        step: serde_json::Value,
    ) -> AppResult<WorkflowInstance> {
        assert!(!instance_id.is_nil(), "Instance ID must not be nil");

        let row = sqlx::query_as!(
            WorkflowInstance,
            r#"
            UPDATE workflow_instances
            SET history = history || $2::jsonb
            WHERE id = $1
            RETURNING
                id, workflow_id, workflow_version, status,
                current_nodes, variables, history,
                started_at, completed_at, error,
                correlation_id, parent_instance_id
            "#,
            instance_id,
            step,
        )
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("append_history", "workflow_instance")?
        .ok_or_else(|| AppError::NotFound(format!("Instance {} not found", instance_id)))?;

        assert_eq!(row.id, instance_id, "Updated instance ID mismatch");
        Ok(row)
    }

    // ========================================================================
    // Human Task Operations
    // ========================================================================

    async fn create_task(&self, task: CreateHumanTask) -> AppResult<HumanTask> {
        assert!(!task.name.is_empty(), "Task name must not be empty");
        assert!(!task.assignee.is_empty(), "Assignee must not be empty");

        let id = Uuid::new_v4();
        let now = Utc::now();
        let priority_str = task.priority.map(|p| p.to_string());

        let row = sqlx::query_as!(
            HumanTask,
            r#"
            INSERT INTO human_tasks (
                id, instance_id, node_id, name, description,
                assignee, form_schema, form_data,
                status, priority, due_date, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11)
            RETURNING
                id, instance_id, node_id, name, description,
                assignee, form_schema, form_data,
                status, priority, due_date, claimed_by,
                completed_at, result, created_at
            "#,
            id,
            task.instance_id,
            task.node_id,
            task.name,
            task.description,
            task.assignee,
            task.form_schema,
            task.form_data,
            priority_str,
            task.due_date,
            now,
        )
        .fetch_one(self.database_service.pool())
        .await
        .map_db_error("create", "human_task")?;

        assert_eq!(row.id, id, "Created task ID mismatch");
        Ok(row)
    }

    async fn get_task(&self, task_id: Uuid) -> AppResult<Option<HumanTask>> {
        assert!(!task_id.is_nil(), "Task ID must not be nil");

        let row = sqlx::query_as!(
            HumanTask,
            r#"
            SELECT
                id, instance_id, node_id, name, description,
                assignee, form_schema, form_data,
                status, priority, due_date, claimed_by,
                completed_at, result, created_at
            FROM human_tasks
            WHERE id = $1
            "#,
            task_id
        )
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("fetch", "human_task")?;

        Ok(row)
    }

    async fn get_pending_tasks(
        &self,
        assignee: &str,
        limit: u32,
        offset: u32,
    ) -> AppResult<Vec<HumanTask>> {
        assert!(!assignee.is_empty(), "Assignee must not be empty");
        let limit_val = clamp_limit(limit);

        let rows = sqlx::query_as!(
            HumanTask,
            r#"
            SELECT
                id, instance_id, node_id, name, description,
                assignee, form_schema, form_data,
                status, priority, due_date, claimed_by,
                completed_at, result, created_at
            FROM human_tasks
            WHERE assignee = $1 AND status = 'pending'
            ORDER BY
                CASE priority
                    WHEN 'urgent' THEN 0
                    WHEN 'high' THEN 1
                    WHEN 'normal' THEN 2
                    WHEN 'low' THEN 3
                    ELSE 4
                END,
                created_at ASC
            LIMIT $2 OFFSET $3
            "#,
            assignee,
            limit_val,
            offset as i64,
        )
        .fetch_all(self.database_service.pool())
        .await
        .map_db_error("list_pending", "human_tasks")?;

        Ok(rows)
    }

    async fn get_tasks_by_instance(&self, instance_id: Uuid) -> AppResult<Vec<HumanTask>> {
        assert!(!instance_id.is_nil(), "Instance ID must not be nil");

        let rows = sqlx::query_as!(
            HumanTask,
            r#"
            SELECT
                id, instance_id, node_id, name, description,
                assignee, form_schema, form_data,
                status, priority, due_date, claimed_by,
                completed_at, result, created_at
            FROM human_tasks
            WHERE instance_id = $1
            ORDER BY created_at ASC
            LIMIT 1000
            "#,
            instance_id
        )
        .fetch_all(self.database_service.pool())
        .await
        .map_db_error("list_by_instance", "human_tasks")?;

        Ok(rows)
    }

    async fn claim_task(&self, task_id: Uuid, user_id: Uuid) -> AppResult<HumanTask> {
        assert!(!task_id.is_nil(), "Task ID must not be nil");
        assert!(!user_id.is_nil(), "User ID must not be nil");

        let row = sqlx::query_as!(
            HumanTask,
            r#"
            UPDATE human_tasks SET
                status = 'claimed',
                claimed_by = $2
            WHERE id = $1 AND status = 'pending'
            RETURNING
                id, instance_id, node_id, name, description,
                assignee, form_schema, form_data,
                status, priority, due_date, claimed_by,
                completed_at, result, created_at
            "#,
            task_id,
            user_id,
        )
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("claim", "human_task")?
        .ok_or_else(|| {
            AppError::NotFound(format!(
                "Task {} not found or not in pending status",
                task_id
            ))
        })?;

        assert_eq!(row.status, "claimed", "Task should be claimed after claim");
        Ok(row)
    }

    async fn unclaim_task(&self, task_id: Uuid) -> AppResult<HumanTask> {
        assert!(!task_id.is_nil(), "Task ID must not be nil");

        let row = sqlx::query_as!(
            HumanTask,
            r#"
            UPDATE human_tasks SET
                status = 'pending',
                claimed_by = NULL
            WHERE id = $1 AND status = 'claimed'
            RETURNING
                id, instance_id, node_id, name, description,
                assignee, form_schema, form_data,
                status, priority, due_date, claimed_by,
                completed_at, result, created_at
            "#,
            task_id,
        )
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("unclaim", "human_task")?
        .ok_or_else(|| {
            AppError::NotFound(format!(
                "Task {} not found or not in claimed status",
                task_id
            ))
        })?;

        assert_eq!(row.status, "pending", "Task should be pending after unclaim");
        Ok(row)
    }

    async fn complete_task(
        &self,
        task_id: Uuid,
        result: serde_json::Value,
    ) -> AppResult<HumanTask> {
        assert!(!task_id.is_nil(), "Task ID must not be nil");

        let now = Utc::now();
        let row = sqlx::query_as!(
            HumanTask,
            r#"
            UPDATE human_tasks SET
                status = 'completed',
                result = $2,
                completed_at = $3
            WHERE id = $1 AND status IN ('pending', 'claimed')
            RETURNING
                id, instance_id, node_id, name, description,
                assignee, form_schema, form_data,
                status, priority, due_date, claimed_by,
                completed_at, result, created_at
            "#,
            task_id,
            result,
            now,
        )
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("complete", "human_task")?
        .ok_or_else(|| {
            AppError::NotFound(format!(
                "Task {} not found or already completed/cancelled",
                task_id
            ))
        })?;

        assert_eq!(row.status, "completed", "Task should be completed after completion");
        Ok(row)
    }

    async fn cancel_task(&self, task_id: Uuid) -> AppResult<HumanTask> {
        assert!(!task_id.is_nil(), "Task ID must not be nil");

        let row = sqlx::query_as!(
            HumanTask,
            r#"
            UPDATE human_tasks SET status = 'cancelled'
            WHERE id = $1 AND status IN ('pending', 'claimed')
            RETURNING
                id, instance_id, node_id, name, description,
                assignee, form_schema, form_data,
                status, priority, due_date, claimed_by,
                completed_at, result, created_at
            "#,
            task_id,
        )
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("cancel", "human_task")?
        .ok_or_else(|| {
            AppError::NotFound(format!(
                "Task {} not found or already completed/cancelled",
                task_id
            ))
        })?;

        assert_eq!(row.status, "cancelled", "Task should be cancelled after cancellation");
        Ok(row)
    }

    // ========================================================================
    // Statistics
    // ========================================================================

    async fn count_workflows_by_org(&self, org_id: Uuid) -> AppResult<i64> {
        assert!(!org_id.is_nil(), "Organization ID must not be nil");

        let count = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM visual_workflows WHERE organization_id = $1",
            org_id
        )
        .fetch_one(self.database_service.pool())
        .await
        .map_db_error("count", "visual_workflows")?;

        let result = count.unwrap_or(0);
        assert!(result >= 0, "Count should be non-negative");
        Ok(result)
    }

    async fn count_active_instances(&self, workflow_id: Uuid) -> AppResult<i64> {
        assert!(!workflow_id.is_nil(), "Workflow ID must not be nil");

        let count = sqlx::query_scalar!(
            r#"
            SELECT COUNT(*)
            FROM workflow_instances
            WHERE workflow_id = $1 AND status IN ('running', 'waiting', 'paused')
            "#,
            workflow_id
        )
        .fetch_one(self.database_service.pool())
        .await
        .map_db_error("count_active", "workflow_instances")?;

        let result = count.unwrap_or(0);
        assert!(result >= 0, "Count should be non-negative");
        Ok(result)
    }

    async fn count_pending_tasks(&self, assignee: &str) -> AppResult<i64> {
        assert!(!assignee.is_empty(), "Assignee must not be empty");

        let count = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM human_tasks WHERE assignee = $1 AND status = 'pending'",
            assignee
        )
        .fetch_one(self.database_service.pool())
        .await
        .map_db_error("count_pending", "human_tasks")?;

        let result = count.unwrap_or(0);
        assert!(result >= 0, "Count should be non-negative");
        Ok(result)
    }
}
