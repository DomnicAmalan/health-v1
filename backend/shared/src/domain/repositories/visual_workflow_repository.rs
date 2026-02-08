//! Visual Workflow Repository Trait
//!
//! Defines the contract for visual workflow persistence operations

use async_trait::async_trait;
use uuid::Uuid;

use crate::domain::entities::{
    VisualWorkflow, VisualWorkflowSummary, CreateVisualWorkflow, UpdateVisualWorkflow,
    WorkflowInstance, StartWorkflowInstance,
    HumanTask, CreateHumanTask,
};
use crate::shared::AppResult;

/// Repository trait for visual workflow operations
#[async_trait]
pub trait VisualWorkflowRepository: Send + Sync {
    // ========================================================================
    // Workflow Definition CRUD
    // ========================================================================

    /// Create a new workflow definition
    async fn create_workflow(&self, workflow: CreateVisualWorkflow) -> AppResult<VisualWorkflow>;

    /// Find a workflow by ID
    async fn find_workflow_by_id(&self, id: Uuid) -> AppResult<Option<VisualWorkflow>>;

    /// Find all workflows for an organization
    async fn find_workflows_by_org(
        &self,
        org_id: Uuid,
        limit: u32,
        offset: u32,
    ) -> AppResult<Vec<VisualWorkflowSummary>>;

    /// Find workflows by category
    async fn find_workflows_by_category(
        &self,
        org_id: Uuid,
        category: &str,
    ) -> AppResult<Vec<VisualWorkflowSummary>>;

    /// Update a workflow definition (creates new version)
    async fn update_workflow(
        &self,
        id: Uuid,
        update: UpdateVisualWorkflow,
    ) -> AppResult<VisualWorkflow>;

    /// Delete a workflow definition
    async fn delete_workflow(&self, id: Uuid) -> AppResult<()>;

    /// Clone a workflow with a new name
    async fn clone_workflow(&self, id: Uuid, new_name: String) -> AppResult<VisualWorkflow>;

    /// Activate a workflow (set is_active = true)
    async fn activate_workflow(&self, id: Uuid) -> AppResult<VisualWorkflow>;

    /// Deactivate a workflow (set is_active = false)
    async fn deactivate_workflow(&self, id: Uuid) -> AppResult<VisualWorkflow>;

    // ========================================================================
    // Workflow Instance (Execution) Operations
    // ========================================================================

    /// Start a new workflow instance
    async fn start_instance(&self, request: StartWorkflowInstance) -> AppResult<WorkflowInstance>;

    /// Get a workflow instance by ID
    async fn get_instance(&self, instance_id: Uuid) -> AppResult<Option<WorkflowInstance>>;

    /// List instances for a workflow
    async fn list_instances(
        &self,
        workflow_id: Uuid,
        limit: u32,
        offset: u32,
    ) -> AppResult<Vec<WorkflowInstance>>;

    /// List instances by status
    async fn list_instances_by_status(
        &self,
        org_id: Uuid,
        status: &str,
        limit: u32,
        offset: u32,
    ) -> AppResult<Vec<WorkflowInstance>>;

    /// Update instance status
    async fn update_instance_status(
        &self,
        instance_id: Uuid,
        status: &str,
        error: Option<String>,
    ) -> AppResult<WorkflowInstance>;

    /// Update instance current nodes
    async fn update_instance_nodes(
        &self,
        instance_id: Uuid,
        current_nodes: Vec<String>,
    ) -> AppResult<WorkflowInstance>;

    /// Update instance variables
    async fn update_instance_variables(
        &self,
        instance_id: Uuid,
        variables: serde_json::Value,
    ) -> AppResult<WorkflowInstance>;

    /// Append to instance history
    async fn append_instance_history(
        &self,
        instance_id: Uuid,
        step: serde_json::Value,
    ) -> AppResult<WorkflowInstance>;

    // ========================================================================
    // Human Task Operations
    // ========================================================================

    /// Create a human task
    async fn create_task(&self, task: CreateHumanTask) -> AppResult<HumanTask>;

    /// Get a task by ID
    async fn get_task(&self, task_id: Uuid) -> AppResult<Option<HumanTask>>;

    /// Get pending tasks for an assignee
    async fn get_pending_tasks(
        &self,
        assignee: &str,
        limit: u32,
        offset: u32,
    ) -> AppResult<Vec<HumanTask>>;

    /// Get tasks for an instance
    async fn get_tasks_by_instance(&self, instance_id: Uuid) -> AppResult<Vec<HumanTask>>;

    /// Claim a task (set claimed_by and status = claimed)
    async fn claim_task(&self, task_id: Uuid, user_id: Uuid) -> AppResult<HumanTask>;

    /// Unclaim a task (set claimed_by = null and status = pending)
    async fn unclaim_task(&self, task_id: Uuid) -> AppResult<HumanTask>;

    /// Complete a task
    async fn complete_task(
        &self,
        task_id: Uuid,
        result: serde_json::Value,
    ) -> AppResult<HumanTask>;

    /// Cancel a task
    async fn cancel_task(&self, task_id: Uuid) -> AppResult<HumanTask>;

    // ========================================================================
    // Statistics
    // ========================================================================

    /// Count workflows by organization
    async fn count_workflows_by_org(&self, org_id: Uuid) -> AppResult<i64>;

    /// Count active instances by workflow
    async fn count_active_instances(&self, workflow_id: Uuid) -> AppResult<i64>;

    /// Count pending tasks by assignee
    async fn count_pending_tasks(&self, assignee: &str) -> AppResult<i64>;
}
