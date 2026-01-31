//! Workflow Engine - Visual Workflow Designer and Execution
//!
//! This module provides:
//! - Workflow definition storage and management
//! - Visual workflow representation (nodes, edges, conditions)
//! - Workflow execution with state tracking
//! - Integration with Rules Engine for decision points

use std::collections::HashMap;
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::sync::RwLock;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::shared::{AppError, AppResult};
use super::rules_engine::{RulesEngine, RuleContext, SharedRulesEngine};

/// Node types in a workflow
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum NodeType {
    /// Start node - entry point
    Start,
    /// End node - completion point
    End,
    /// Action node - perform an operation
    Action,
    /// Decision node - branch based on condition
    Decision,
    /// Parallel split - execute branches in parallel
    ParallelSplit,
    /// Parallel join - wait for parallel branches
    ParallelJoin,
    /// Human task - requires user interaction
    HumanTask,
    /// Timer - wait for duration or until time
    Timer,
    /// SubWorkflow - execute another workflow
    SubWorkflow,
    /// Script - execute custom logic
    Script,
    /// Notification - send alerts/emails
    Notification,
    /// Rule - evaluate business rule
    Rule,
}

/// A node in the workflow graph
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowNode {
    /// Unique node ID
    pub id: String,
    /// Node type
    pub node_type: NodeType,
    /// Display name
    pub name: String,
    /// Description
    #[serde(default)]
    pub description: Option<String>,
    /// Position for visual designer (x, y)
    pub position: (f64, f64),
    /// Node-specific configuration
    #[serde(default)]
    pub config: NodeConfig,
    /// Custom metadata
    #[serde(default)]
    pub metadata: HashMap<String, Value>,
}

/// Node configuration based on type
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct NodeConfig {
    // Action node
    /// Action to perform
    #[serde(default)]
    pub action: Option<String>,
    /// Parameters for the action
    #[serde(default)]
    pub parameters: HashMap<String, Value>,

    // Decision node
    /// Condition expression
    #[serde(default)]
    pub condition: Option<String>,
    /// Rule ID for rule-based decisions
    #[serde(default)]
    pub rule_id: Option<String>,

    // Human task
    /// Assignee (role or user ID)
    #[serde(default)]
    pub assignee: Option<String>,
    /// Form schema for task input
    #[serde(default)]
    pub form_schema: Option<Value>,
    /// Due date offset (e.g., "+1d", "+2h")
    #[serde(default)]
    pub due_offset: Option<String>,
    /// Escalation rules
    #[serde(default)]
    pub escalation: Option<EscalationConfig>,

    // Timer node
    /// Duration (e.g., "PT1H", "P1D")
    #[serde(default)]
    pub duration: Option<String>,
    /// Specific datetime
    #[serde(default)]
    pub until: Option<DateTime<Utc>>,
    /// Cron expression for recurring
    #[serde(default)]
    pub cron: Option<String>,

    // SubWorkflow
    /// Referenced workflow ID
    #[serde(default)]
    pub workflow_id: Option<String>,
    /// Input mapping
    #[serde(default)]
    pub input_mapping: HashMap<String, String>,
    /// Output mapping
    #[serde(default)]
    pub output_mapping: HashMap<String, String>,

    // Script node
    /// Script language (javascript, python, expression)
    #[serde(default)]
    pub language: Option<String>,
    /// Script code
    #[serde(default)]
    pub script: Option<String>,

    // Notification node
    /// Notification type (email, sms, push, webhook)
    #[serde(default)]
    pub notification_type: Option<String>,
    /// Recipients
    #[serde(default)]
    pub recipients: Vec<String>,
    /// Template ID
    #[serde(default)]
    pub template_id: Option<String>,
}

/// Escalation configuration for human tasks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EscalationConfig {
    /// Time before escalation
    pub after: String,
    /// Escalation target (role or user)
    pub escalate_to: String,
    /// Escalation action
    pub action: String,
}

/// An edge connecting nodes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowEdge {
    /// Unique edge ID
    pub id: String,
    /// Source node ID
    pub source: String,
    /// Target node ID
    pub target: String,
    /// Condition label (for decision branches)
    #[serde(default)]
    pub label: Option<String>,
    /// Condition expression (when to follow this edge)
    #[serde(default)]
    pub condition: Option<String>,
    /// Priority (for multiple matching edges)
    #[serde(default)]
    pub priority: i32,
}

/// A complete workflow definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowDefinition {
    /// Unique workflow ID
    pub id: String,
    /// Workflow name
    pub name: String,
    /// Description
    #[serde(default)]
    pub description: Option<String>,
    /// Version number
    pub version: i32,
    /// Workflow category
    #[serde(default)]
    pub category: Option<String>,
    /// Nodes in the workflow
    pub nodes: Vec<WorkflowNode>,
    /// Edges connecting nodes
    pub edges: Vec<WorkflowEdge>,
    /// Input variables schema
    #[serde(default)]
    pub input_schema: Option<Value>,
    /// Output variables schema
    #[serde(default)]
    pub output_schema: Option<Value>,
    /// Whether the workflow is active
    pub is_active: bool,
    /// Organization ID
    #[serde(default)]
    pub organization_id: Option<String>,
    /// Tags
    #[serde(default)]
    pub tags: Vec<String>,
    /// Created timestamp
    pub created_at: DateTime<Utc>,
    /// Updated timestamp
    pub updated_at: DateTime<Utc>,
    /// Created by user ID
    #[serde(default)]
    pub created_by: Option<String>,
}

/// Workflow execution instance
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowInstance {
    /// Unique instance ID
    pub id: String,
    /// Workflow definition ID
    pub workflow_id: String,
    /// Workflow version at start
    pub workflow_version: i32,
    /// Current status
    pub status: WorkflowStatus,
    /// Current node ID(s) - can be multiple for parallel execution
    pub current_nodes: Vec<String>,
    /// Workflow variables
    pub variables: HashMap<String, Value>,
    /// Execution history
    pub history: Vec<ExecutionStep>,
    /// Started timestamp
    pub started_at: DateTime<Utc>,
    /// Completed timestamp
    #[serde(default)]
    pub completed_at: Option<DateTime<Utc>>,
    /// Error message if failed
    #[serde(default)]
    pub error: Option<String>,
    /// Parent instance ID (for sub-workflows)
    #[serde(default)]
    pub parent_instance_id: Option<String>,
    /// Correlation ID for tracking related workflows
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Workflow execution status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum WorkflowStatus {
    /// Workflow is running
    Running,
    /// Waiting for external input (human task, timer)
    Waiting,
    /// Paused by user/system
    Paused,
    /// Completed successfully
    Completed,
    /// Failed with error
    Failed,
    /// Cancelled
    Cancelled,
}

/// A single execution step in history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionStep {
    /// Step ID
    pub id: String,
    /// Node ID that was executed
    pub node_id: String,
    /// Node name
    pub node_name: String,
    /// Start time
    pub started_at: DateTime<Utc>,
    /// End time
    #[serde(default)]
    pub ended_at: Option<DateTime<Utc>>,
    /// Duration in milliseconds
    #[serde(default)]
    pub duration_ms: Option<i64>,
    /// Input data
    #[serde(default)]
    pub input: Option<Value>,
    /// Output data
    #[serde(default)]
    pub output: Option<Value>,
    /// Error if failed
    #[serde(default)]
    pub error: Option<String>,
    /// Decision taken (for decision nodes)
    #[serde(default)]
    pub decision: Option<String>,
}

/// Human task for user interaction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HumanTask {
    /// Task ID
    pub id: String,
    /// Workflow instance ID
    pub instance_id: String,
    /// Node ID
    pub node_id: String,
    /// Task name
    pub name: String,
    /// Task description
    #[serde(default)]
    pub description: Option<String>,
    /// Assignee (user or role)
    pub assignee: String,
    /// Form schema
    #[serde(default)]
    pub form_schema: Option<Value>,
    /// Form data (pre-filled)
    #[serde(default)]
    pub form_data: Option<Value>,
    /// Status
    pub status: TaskStatus,
    /// Due date
    #[serde(default)]
    pub due_date: Option<DateTime<Utc>>,
    /// Priority
    #[serde(default)]
    pub priority: Option<String>,
    /// Created timestamp
    pub created_at: DateTime<Utc>,
    /// Claimed by user ID
    #[serde(default)]
    pub claimed_by: Option<String>,
    /// Completed timestamp
    #[serde(default)]
    pub completed_at: Option<DateTime<Utc>>,
    /// Result data
    #[serde(default)]
    pub result: Option<Value>,
}

/// Human task status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    /// Waiting to be claimed
    Pending,
    /// Claimed by a user
    Claimed,
    /// Completed
    Completed,
    /// Expired (past due)
    Expired,
    /// Cancelled
    Cancelled,
}

/// Workflow Engine Service
pub struct WorkflowEngine {
    /// Workflow definitions cache
    definitions: Arc<RwLock<HashMap<String, WorkflowDefinition>>>,
    /// Running instances cache
    instances: Arc<RwLock<HashMap<String, WorkflowInstance>>>,
    /// Human tasks cache
    tasks: Arc<RwLock<HashMap<String, HumanTask>>>,
    /// Rules engine for decision nodes
    rules_engine: Option<SharedRulesEngine>,
}

impl WorkflowEngine {
    /// Create a new workflow engine
    pub fn new() -> Self {
        Self {
            definitions: Arc::new(RwLock::new(HashMap::new())),
            instances: Arc::new(RwLock::new(HashMap::new())),
            tasks: Arc::new(RwLock::new(HashMap::new())),
            rules_engine: None,
        }
    }

    /// Create with rules engine integration
    pub fn with_rules_engine(rules_engine: SharedRulesEngine) -> Self {
        Self {
            definitions: Arc::new(RwLock::new(HashMap::new())),
            instances: Arc::new(RwLock::new(HashMap::new())),
            tasks: Arc::new(RwLock::new(HashMap::new())),
            rules_engine: Some(rules_engine),
        }
    }

    /// Register a workflow definition
    pub async fn register_workflow(&self, definition: WorkflowDefinition) -> AppResult<()> {
        // Validate the workflow
        self.validate_workflow(&definition)?;

        let mut defs = self.definitions.write().await;
        defs.insert(definition.id.clone(), definition);
        Ok(())
    }

    /// Get a workflow definition
    pub async fn get_workflow(&self, workflow_id: &str) -> Option<WorkflowDefinition> {
        let defs = self.definitions.read().await;
        defs.get(workflow_id).cloned()
    }

    /// List all workflow definitions
    pub async fn list_workflows(&self) -> Vec<WorkflowDefinition> {
        let defs = self.definitions.read().await;
        defs.values().cloned().collect()
    }

    /// Start a new workflow instance
    pub async fn start_workflow(
        &self,
        workflow_id: &str,
        variables: HashMap<String, Value>,
        correlation_id: Option<String>,
    ) -> AppResult<WorkflowInstance> {
        let definition = self.get_workflow(workflow_id).await
            .ok_or_else(|| AppError::NotFound(format!("Workflow not found: {}", workflow_id)))?;

        if !definition.is_active {
            return Err(AppError::Validation("Workflow is not active".to_string()));
        }

        // Find start node
        let start_node = definition.nodes.iter()
            .find(|n| n.node_type == NodeType::Start)
            .ok_or_else(|| AppError::Internal("Workflow has no start node".to_string()))?;

        let instance = WorkflowInstance {
            id: Uuid::new_v4().to_string(),
            workflow_id: workflow_id.to_string(),
            workflow_version: definition.version,
            status: WorkflowStatus::Running,
            current_nodes: vec![start_node.id.clone()],
            variables,
            history: vec![],
            started_at: Utc::now(),
            completed_at: None,
            error: None,
            parent_instance_id: None,
            correlation_id,
        };

        let mut instances = self.instances.write().await;
        instances.insert(instance.id.clone(), instance.clone());

        // Start execution (would normally be async)
        // self.execute_instance(&instance.id).await?;

        Ok(instance)
    }

    /// Get a workflow instance
    pub async fn get_instance(&self, instance_id: &str) -> Option<WorkflowInstance> {
        let instances = self.instances.read().await;
        instances.get(instance_id).cloned()
    }

    /// Complete a human task
    pub async fn complete_task(
        &self,
        task_id: &str,
        result: Value,
        user_id: &str,
    ) -> AppResult<()> {
        let mut tasks = self.tasks.write().await;
        let task = tasks.get_mut(task_id)
            .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", task_id)))?;

        // Verify task is claimed by this user
        if task.claimed_by.as_ref() != Some(&user_id.to_string()) {
            return Err(AppError::Authorization("Task not claimed by this user".to_string()));
        }

        task.status = TaskStatus::Completed;
        task.completed_at = Some(Utc::now());
        task.result = Some(result);

        // Resume workflow execution
        // self.resume_instance(&task.instance_id).await?;

        Ok(())
    }

    /// Validate a workflow definition
    fn validate_workflow(&self, definition: &WorkflowDefinition) -> AppResult<()> {
        // Must have at least one start node
        let start_count = definition.nodes.iter()
            .filter(|n| n.node_type == NodeType::Start)
            .count();
        if start_count == 0 {
            return Err(AppError::Validation("Workflow must have a Start node".to_string()));
        }
        if start_count > 1 {
            return Err(AppError::Validation("Workflow can only have one Start node".to_string()));
        }

        // Must have at least one end node
        let end_count = definition.nodes.iter()
            .filter(|n| n.node_type == NodeType::End)
            .count();
        if end_count == 0 {
            return Err(AppError::Validation("Workflow must have at least one End node".to_string()));
        }

        // All edges must reference valid nodes
        let node_ids: std::collections::HashSet<_> = definition.nodes.iter()
            .map(|n| &n.id)
            .collect();

        for edge in &definition.edges {
            if !node_ids.contains(&edge.source) {
                return Err(AppError::Validation(format!(
                    "Edge {} references invalid source node: {}",
                    edge.id, edge.source
                )));
            }
            if !node_ids.contains(&edge.target) {
                return Err(AppError::Validation(format!(
                    "Edge {} references invalid target node: {}",
                    edge.id, edge.target
                )));
            }
        }

        // Decision nodes must have at least 2 outgoing edges
        for node in &definition.nodes {
            if node.node_type == NodeType::Decision {
                let outgoing = definition.edges.iter()
                    .filter(|e| e.source == node.id)
                    .count();
                if outgoing < 2 {
                    return Err(AppError::Validation(format!(
                        "Decision node '{}' must have at least 2 outgoing edges",
                        node.name
                    )));
                }
            }
        }

        Ok(())
    }

    /// Create a simple approval workflow template
    pub fn create_approval_workflow_template(
        name: &str,
        approver_role: &str,
    ) -> WorkflowDefinition {
        let now = Utc::now();

        WorkflowDefinition {
            id: Uuid::new_v4().to_string(),
            name: name.to_string(),
            description: Some(format!("Simple approval workflow requiring {} approval", approver_role)),
            version: 1,
            category: Some("approval".to_string()),
            nodes: vec![
                WorkflowNode {
                    id: "start".to_string(),
                    node_type: NodeType::Start,
                    name: "Start".to_string(),
                    description: None,
                    position: (100.0, 200.0),
                    config: NodeConfig::default(),
                    metadata: HashMap::new(),
                },
                WorkflowNode {
                    id: "approval".to_string(),
                    node_type: NodeType::HumanTask,
                    name: "Approval Required".to_string(),
                    description: Some("Review and approve or reject".to_string()),
                    position: (300.0, 200.0),
                    config: NodeConfig {
                        assignee: Some(approver_role.to_string()),
                        form_schema: Some(serde_json::json!({
                            "type": "object",
                            "properties": {
                                "approved": { "type": "boolean", "title": "Approved" },
                                "comments": { "type": "string", "title": "Comments" }
                            },
                            "required": ["approved"]
                        })),
                        due_offset: Some("+2d".to_string()),
                        ..Default::default()
                    },
                    metadata: HashMap::new(),
                },
                WorkflowNode {
                    id: "decision".to_string(),
                    node_type: NodeType::Decision,
                    name: "Check Approval".to_string(),
                    description: None,
                    position: (500.0, 200.0),
                    config: NodeConfig {
                        condition: Some("${approved}".to_string()),
                        ..Default::default()
                    },
                    metadata: HashMap::new(),
                },
                WorkflowNode {
                    id: "approved_end".to_string(),
                    node_type: NodeType::End,
                    name: "Approved".to_string(),
                    description: None,
                    position: (700.0, 100.0),
                    config: NodeConfig::default(),
                    metadata: HashMap::new(),
                },
                WorkflowNode {
                    id: "rejected_end".to_string(),
                    node_type: NodeType::End,
                    name: "Rejected".to_string(),
                    description: None,
                    position: (700.0, 300.0),
                    config: NodeConfig::default(),
                    metadata: HashMap::new(),
                },
            ],
            edges: vec![
                WorkflowEdge {
                    id: "e1".to_string(),
                    source: "start".to_string(),
                    target: "approval".to_string(),
                    label: None,
                    condition: None,
                    priority: 0,
                },
                WorkflowEdge {
                    id: "e2".to_string(),
                    source: "approval".to_string(),
                    target: "decision".to_string(),
                    label: None,
                    condition: None,
                    priority: 0,
                },
                WorkflowEdge {
                    id: "e3".to_string(),
                    source: "decision".to_string(),
                    target: "approved_end".to_string(),
                    label: Some("Yes".to_string()),
                    condition: Some("approved == true".to_string()),
                    priority: 0,
                },
                WorkflowEdge {
                    id: "e4".to_string(),
                    source: "decision".to_string(),
                    target: "rejected_end".to_string(),
                    label: Some("No".to_string()),
                    condition: Some("approved == false".to_string()),
                    priority: 1,
                },
            ],
            input_schema: Some(serde_json::json!({
                "type": "object",
                "properties": {
                    "request_id": { "type": "string" },
                    "request_type": { "type": "string" },
                    "description": { "type": "string" }
                }
            })),
            output_schema: Some(serde_json::json!({
                "type": "object",
                "properties": {
                    "approved": { "type": "boolean" },
                    "comments": { "type": "string" }
                }
            })),
            is_active: true,
            organization_id: None,
            tags: vec!["template".to_string(), "approval".to_string()],
            created_at: now,
            updated_at: now,
            created_by: None,
        }
    }
}

impl Default for WorkflowEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Shared workflow engine instance
pub type SharedWorkflowEngine = Arc<WorkflowEngine>;

/// Create a shared workflow engine
pub fn create_shared_workflow_engine() -> SharedWorkflowEngine {
    Arc::new(WorkflowEngine::new())
}

/// Create a workflow engine with rules integration
pub fn create_workflow_engine_with_rules(rules_engine: SharedRulesEngine) -> SharedWorkflowEngine {
    Arc::new(WorkflowEngine::with_rules_engine(rules_engine))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_workflow_engine_creation() {
        let engine = WorkflowEngine::new();
        let workflows = engine.list_workflows().await;
        assert!(workflows.is_empty());
    }

    #[tokio::test]
    async fn test_approval_template() {
        let template = WorkflowEngine::create_approval_workflow_template(
            "Test Approval",
            "manager"
        );

        assert_eq!(template.nodes.len(), 5);
        assert_eq!(template.edges.len(), 4);

        let engine = WorkflowEngine::new();
        engine.register_workflow(template).await.expect("Should register");
    }

    #[tokio::test]
    async fn test_workflow_validation() {
        let engine = WorkflowEngine::new();

        // Invalid workflow - no start node
        let invalid = WorkflowDefinition {
            id: "test".to_string(),
            name: "Test".to_string(),
            description: None,
            version: 1,
            category: None,
            nodes: vec![
                WorkflowNode {
                    id: "end".to_string(),
                    node_type: NodeType::End,
                    name: "End".to_string(),
                    description: None,
                    position: (0.0, 0.0),
                    config: NodeConfig::default(),
                    metadata: HashMap::new(),
                },
            ],
            edges: vec![],
            input_schema: None,
            output_schema: None,
            is_active: true,
            organization_id: None,
            tags: vec![],
            created_at: Utc::now(),
            updated_at: Utc::now(),
            created_by: None,
        };

        let result = engine.register_workflow(invalid).await;
        assert!(result.is_err());
    }
}
