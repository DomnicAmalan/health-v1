//! Visual Workflow Domain Entities
//!
//! n8n-style visual workflow definitions, instances, and human tasks

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// ============================================================================
// Node Types
// ============================================================================

/// Types of nodes in a workflow
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum NodeType {
    Start,
    End,
    Action,
    Decision,
    ParallelSplit,
    ParallelJoin,
    HumanTask,
    Timer,
    SubWorkflow,
    Script,
    Notification,
    Rule,
}

// ============================================================================
// Workflow Definition
// ============================================================================

/// A visual workflow definition (n8n-style)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VisualWorkflow {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub version: i32,
    /// JSON array of WorkflowNode objects
    pub nodes: serde_json::Value,
    /// JSON array of WorkflowEdge objects
    pub edges: serde_json::Value,
    pub input_schema: Option<serde_json::Value>,
    pub output_schema: Option<serde_json::Value>,
    pub is_active: bool,
    pub tags: Option<Vec<String>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}

/// Summary of a workflow (for list views)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualWorkflowSummary {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub version: i32,
    pub is_active: bool,
    pub tags: Option<Vec<String>>,
    pub node_count: i32,
    pub edge_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Request to create a new workflow
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVisualWorkflow {
    pub organization_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub nodes: serde_json::Value,
    pub edges: serde_json::Value,
    pub input_schema: Option<serde_json::Value>,
    pub output_schema: Option<serde_json::Value>,
    pub tags: Option<Vec<String>>,
    pub created_by: Option<Uuid>,
}

/// Request to update an existing workflow
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateVisualWorkflow {
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

// ============================================================================
// Workflow Instance
// ============================================================================

/// Workflow execution status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum WorkflowStatus {
    Running,
    Waiting,
    Paused,
    Completed,
    Failed,
    Cancelled,
}

impl std::fmt::Display for WorkflowStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WorkflowStatus::Running => write!(f, "running"),
            WorkflowStatus::Waiting => write!(f, "waiting"),
            WorkflowStatus::Paused => write!(f, "paused"),
            WorkflowStatus::Completed => write!(f, "completed"),
            WorkflowStatus::Failed => write!(f, "failed"),
            WorkflowStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

/// A workflow execution instance
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WorkflowInstance {
    pub id: Uuid,
    pub workflow_id: Uuid,
    pub workflow_version: i32,
    pub status: String,
    pub current_nodes: Vec<String>,
    pub variables: serde_json::Value,
    pub history: serde_json::Value,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub error: Option<String>,
    pub correlation_id: Option<String>,
    pub parent_instance_id: Option<Uuid>,
}

/// Request to start a workflow instance
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartWorkflowInstance {
    pub workflow_id: Uuid,
    pub variables: Option<serde_json::Value>,
    pub correlation_id: Option<String>,
    pub parent_instance_id: Option<Uuid>,
}

// ============================================================================
// Human Tasks
// ============================================================================

/// Human task status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Pending,
    Claimed,
    Completed,
    Expired,
    Cancelled,
}

impl std::fmt::Display for TaskStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TaskStatus::Pending => write!(f, "pending"),
            TaskStatus::Claimed => write!(f, "claimed"),
            TaskStatus::Completed => write!(f, "completed"),
            TaskStatus::Expired => write!(f, "expired"),
            TaskStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

/// Task priority
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum TaskPriority {
    Urgent,
    High,
    Normal,
    Low,
}

impl std::fmt::Display for TaskPriority {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TaskPriority::Urgent => write!(f, "urgent"),
            TaskPriority::High => write!(f, "high"),
            TaskPriority::Normal => write!(f, "normal"),
            TaskPriority::Low => write!(f, "low"),
        }
    }
}

/// A human task for user interaction
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct HumanTask {
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
    pub due_date: Option<DateTime<Utc>>,
    pub claimed_by: Option<Uuid>,
    pub completed_at: Option<DateTime<Utc>>,
    pub result: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

/// Request to create a human task
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateHumanTask {
    pub instance_id: Uuid,
    pub node_id: String,
    pub name: String,
    pub description: Option<String>,
    pub assignee: String,
    pub form_schema: Option<serde_json::Value>,
    pub form_data: Option<serde_json::Value>,
    pub priority: Option<TaskPriority>,
    pub due_date: Option<DateTime<Utc>>,
}

/// Request to complete a task
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompleteTaskRequest {
    pub result: serde_json::Value,
}

// ============================================================================
// Execution Logs
// ============================================================================

/// Workflow execution log entry
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WorkflowExecutionLog {
    pub id: Uuid,
    pub instance_id: Uuid,
    pub node_id: String,
    pub node_type: String,
    pub action: String,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub duration_ms: Option<i32>,
    pub input_summary: Option<serde_json::Value>,
    pub output_summary: Option<serde_json::Value>,
    pub error: Option<String>,
    pub decision: Option<String>,
}
