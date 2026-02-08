//! Configurable Workflow System
//!
//! Database-driven workflows that can be customized per organization.
//! Each hospital can define their own states, transitions, guards, and actions.
//!
//! # Architecture
//!
//! ```text
//! workflow_definitions (per org)
//!     └── workflow_states (e.g., Scheduled, CheckedIn)
//!         └── workflow_transitions (from → to with guards/actions)
//! ```
//!
//! # Example
//!
//! ```ignore
//! // Load workflow for this organization
//! let workflow = repo.get_workflow(org_id, EntityType::Appointment).await?;
//!
//! // Check if transition is valid
//! let can_checkin = workflow.can_transition("scheduled", "check_in", &ctx)?;
//!
//! // Execute transition
//! let new_state = workflow.transition("scheduled", "check_in", &mut ctx)?;
//! ```

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use uuid::Uuid;

use super::TransitionError;

// ============================================================================
// Entity Types
// ============================================================================

/// Types of entities that can have configurable workflows
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "workflow_entity_type", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum WorkflowEntityType {
    Appointment,
    LabOrder,
    ImagingOrder,
    Prescription,
    Admission,
    Encounter,
    Referral,
    Surgery,
}

impl std::fmt::Display for WorkflowEntityType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Appointment => write!(f, "appointment"),
            Self::LabOrder => write!(f, "lab_order"),
            Self::ImagingOrder => write!(f, "imaging_order"),
            Self::Prescription => write!(f, "prescription"),
            Self::Admission => write!(f, "admission"),
            Self::Encounter => write!(f, "encounter"),
            Self::Referral => write!(f, "referral"),
            Self::Surgery => write!(f, "surgery"),
        }
    }
}

// ============================================================================
// Workflow Definition
// ============================================================================

/// A complete workflow definition loaded from database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowDefinition {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub entity_type: WorkflowEntityType,
    pub name: String,
    pub description: Option<String>,
    pub version: i32,
    pub is_active: bool,

    /// States indexed by code for O(1) lookup
    pub states: HashMap<String, WorkflowState>,
    /// Initial state code
    pub initial_state: String,
    /// Terminal state codes
    pub terminal_states: Vec<String>,
    /// Transitions indexed by (from_state, event_code)
    pub transitions: HashMap<(String, String), WorkflowTransition>,
}

/// A state within a workflow
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowState {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub is_initial: bool,
    pub is_terminal: bool,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub display_order: i32,
}

/// A transition between states
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowTransition {
    pub id: Uuid,
    pub from_state: String,
    pub to_state: String,
    pub event_code: String,
    pub event_name: String,

    /// Guard conditions (JSON array)
    pub guard_conditions: Option<Vec<GuardCondition>>,
    /// Actions to execute
    pub actions: Option<Vec<TransitionAction>>,

    pub required_permissions: Vec<String>,
    pub allowed_roles: Vec<String>,

    pub button_label: Option<String>,
    pub button_color: Option<String>,
    pub confirm_message: Option<String>,

    pub is_api_enabled: bool,
    pub is_ui_enabled: bool,
}

// ============================================================================
// Guards and Actions
// ============================================================================

/// A guard condition that must pass for transition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuardCondition {
    /// Guard type: "time_check", "permission_check", "field_check", "custom"
    #[serde(rename = "type")]
    pub guard_type: String,
    /// Parameters for the guard
    pub params: Value,
}

/// An action to execute on transition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransitionAction {
    /// Action type: "send_notification", "update_field", "create_task", "webhook"
    #[serde(rename = "type")]
    pub action_type: String,
    /// Parameters for the action
    pub params: Value,
}

// ============================================================================
// Runtime Context
// ============================================================================

/// Context for evaluating guards and executing actions
#[derive(Debug, Clone)]
pub struct WorkflowContext {
    /// Current user ID
    pub user_id: Option<Uuid>,
    /// User's roles
    pub user_roles: Vec<String>,
    /// User's permissions
    pub user_permissions: Vec<String>,
    /// Entity data (for field checks)
    pub entity_data: Value,
    /// Current timestamp
    pub now: DateTime<Utc>,
    /// Additional context
    pub extra: HashMap<String, Value>,
}

impl WorkflowContext {
    /// Create a new context
    pub fn new(entity_data: Value) -> Self {
        Self {
            user_id: None,
            user_roles: vec![],
            user_permissions: vec![],
            entity_data,
            now: Utc::now(),
            extra: HashMap::new(),
        }
    }

    /// Set the current user
    pub fn with_user(mut self, user_id: Uuid, roles: Vec<String>, permissions: Vec<String>) -> Self {
        self.user_id = Some(user_id);
        self.user_roles = roles;
        self.user_permissions = permissions;
        self
    }

    /// Add extra context data
    pub fn with_extra(mut self, key: impl Into<String>, value: Value) -> Self {
        self.extra.insert(key.into(), value);
        self
    }
}

// ============================================================================
// Workflow Execution
// ============================================================================

impl WorkflowDefinition {
    /// Get the initial state
    pub fn initial_state(&self) -> Option<&WorkflowState> {
        self.states.get(&self.initial_state)
    }

    /// Check if a state is terminal
    pub fn is_terminal(&self, state_code: &str) -> bool {
        self.terminal_states.contains(&state_code.to_string())
    }

    /// Get valid transitions from a state
    pub fn valid_transitions(&self, from_state: &str) -> Vec<&WorkflowTransition> {
        self.transitions
            .iter()
            .filter(|((from, _), _)| from == from_state)
            .map(|(_, t)| t)
            .collect()
    }

    /// Get valid events from a state (for UI)
    pub fn valid_events(&self, from_state: &str, ctx: &WorkflowContext) -> Vec<ValidEvent> {
        self.valid_transitions(from_state)
            .into_iter()
            .filter(|t| t.is_ui_enabled)
            .filter(|t| self.check_role_access(t, ctx))
            .map(|t| ValidEvent {
                event_code: t.event_code.clone(),
                event_name: t.event_name.clone(),
                to_state: t.to_state.clone(),
                button_label: t.button_label.clone().unwrap_or_else(|| t.event_name.clone()),
                button_color: t.button_color.clone(),
                requires_confirmation: t.confirm_message.is_some(),
                confirm_message: t.confirm_message.clone(),
            })
            .collect()
    }

    /// Check if user has role access to transition
    fn check_role_access(&self, transition: &WorkflowTransition, ctx: &WorkflowContext) -> bool {
        if transition.allowed_roles.is_empty() {
            return true; // No role restriction
        }
        ctx.user_roles.iter().any(|r| transition.allowed_roles.contains(r))
    }

    /// Check if a transition is valid (without executing)
    pub fn can_transition(
        &self,
        from_state: &str,
        event_code: &str,
        ctx: &WorkflowContext,
    ) -> Result<bool, TransitionError> {
        let key = (from_state.to_string(), event_code.to_string());

        let transition = self.transitions.get(&key).ok_or_else(|| {
            TransitionError::InvalidTransition {
                from: from_state.to_string(),
                event: event_code.to_string(),
            }
        })?;

        // Check role access
        if !self.check_role_access(transition, ctx) {
            return Ok(false);
        }

        // Check permission access
        if !transition.required_permissions.is_empty() {
            let has_permission = transition.required_permissions.iter()
                .all(|p| ctx.user_permissions.contains(p));
            if !has_permission {
                return Ok(false);
            }
        }

        // Evaluate guards
        if let Some(guards) = &transition.guard_conditions {
            for guard in guards {
                if !self.evaluate_guard(guard, ctx) {
                    return Ok(false);
                }
            }
        }

        Ok(true)
    }

    /// Execute a transition
    pub fn transition(
        &self,
        from_state: &str,
        event_code: &str,
        ctx: &mut WorkflowContext,
    ) -> Result<TransitionResult, TransitionError> {
        let key = (from_state.to_string(), event_code.to_string());

        let transition = self.transitions.get(&key).ok_or_else(|| {
            TransitionError::InvalidTransition {
                from: from_state.to_string(),
                event: event_code.to_string(),
            }
        })?;

        // Check role access
        if !self.check_role_access(transition, ctx) {
            return Err(TransitionError::GuardFailed {
                from: from_state.to_string(),
                event: event_code.to_string(),
                guard: "role_check".to_string(),
            });
        }

        // Check permission access
        if !transition.required_permissions.is_empty() {
            let has_permission = transition.required_permissions.iter()
                .all(|p| ctx.user_permissions.contains(p));
            if !has_permission {
                return Err(TransitionError::GuardFailed {
                    from: from_state.to_string(),
                    event: event_code.to_string(),
                    guard: "permission_check".to_string(),
                });
            }
        }

        // Evaluate guards
        if let Some(guards) = &transition.guard_conditions {
            for guard in guards {
                if !self.evaluate_guard(guard, ctx) {
                    return Err(TransitionError::GuardFailed {
                        from: from_state.to_string(),
                        event: event_code.to_string(),
                        guard: guard.guard_type.clone(),
                    });
                }
            }
        }

        // Collect actions to execute
        let actions_to_execute = transition.actions.clone().unwrap_or_default();

        Ok(TransitionResult {
            from_state: from_state.to_string(),
            to_state: transition.to_state.clone(),
            event_code: event_code.to_string(),
            actions: actions_to_execute,
            timestamp: Utc::now(),
        })
    }

    /// Evaluate a guard condition
    fn evaluate_guard(&self, guard: &GuardCondition, ctx: &WorkflowContext) -> bool {
        match guard.guard_type.as_str() {
            "time_check" => self.evaluate_time_guard(&guard.params, ctx),
            "field_check" => self.evaluate_field_guard(&guard.params, ctx),
            "permission_check" => self.evaluate_permission_guard(&guard.params, ctx),
            _ => true, // Unknown guards pass by default (log warning in production)
        }
    }

    /// Time-based guard (e.g., "appointment must be in the future")
    fn evaluate_time_guard(&self, params: &Value, ctx: &WorkflowContext) -> bool {
        // Example params: {"field": "scheduled_datetime", "condition": "future", "min_hours": 2}
        let field = params.get("field").and_then(|v| v.as_str()).unwrap_or("created_at");
        let condition = params.get("condition").and_then(|v| v.as_str()).unwrap_or("any");

        let field_value = ctx.entity_data.get(field)
            .and_then(|v| v.as_str())
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&Utc));

        match (field_value, condition) {
            (Some(dt), "future") => dt > ctx.now,
            (Some(dt), "past") => dt < ctx.now,
            (Some(dt), "min_hours_before") => {
                let min_hours = params.get("min_hours").and_then(|v| v.as_i64()).unwrap_or(0);
                dt > ctx.now + chrono::Duration::hours(min_hours)
            }
            _ => true,
        }
    }

    /// Field-based guard (e.g., "status must be active")
    fn evaluate_field_guard(&self, params: &Value, ctx: &WorkflowContext) -> bool {
        let field = params.get("field").and_then(|v| v.as_str());
        let expected = params.get("value");
        let operator = params.get("operator").and_then(|v| v.as_str()).unwrap_or("eq");

        match (field, expected) {
            (Some(f), Some(exp)) => {
                let actual = ctx.entity_data.get(f);
                match operator {
                    "eq" => actual == Some(exp),
                    "ne" => actual != Some(exp),
                    "exists" => actual.is_some(),
                    "not_exists" => actual.is_none(),
                    _ => true,
                }
            }
            _ => true,
        }
    }

    /// Permission-based guard
    fn evaluate_permission_guard(&self, params: &Value, ctx: &WorkflowContext) -> bool {
        let required = params.get("permission").and_then(|v| v.as_str());
        match required {
            Some(perm) => ctx.user_permissions.contains(&perm.to_string()),
            None => true,
        }
    }
}

// ============================================================================
// Result Types
// ============================================================================

/// Result of a successful transition
#[derive(Debug, Clone, Serialize)]
pub struct TransitionResult {
    pub from_state: String,
    pub to_state: String,
    pub event_code: String,
    pub actions: Vec<TransitionAction>,
    pub timestamp: DateTime<Utc>,
}

/// Valid event for UI display
#[derive(Debug, Clone, Serialize)]
pub struct ValidEvent {
    pub event_code: String,
    pub event_name: String,
    pub to_state: String,
    pub button_label: String,
    pub button_color: Option<String>,
    pub requires_confirmation: bool,
    pub confirm_message: Option<String>,
}

// ============================================================================
// Database Row Types (for sqlx)
// ============================================================================

/// Database row for workflow definition
#[derive(Debug, sqlx::FromRow)]
pub struct WorkflowDefinitionRow {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub entity_type: WorkflowEntityType,
    pub name: String,
    pub description: Option<String>,
    pub version: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Database row for workflow state
#[derive(Debug, sqlx::FromRow)]
pub struct WorkflowStateRow {
    pub id: Uuid,
    pub workflow_id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub is_initial: bool,
    pub is_terminal: bool,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub display_order: i32,
}

/// Database row for workflow transition
#[derive(Debug, sqlx::FromRow)]
pub struct WorkflowTransitionRow {
    pub id: Uuid,
    pub workflow_id: Uuid,
    pub from_state_id: Uuid,
    pub to_state_id: Uuid,
    pub event_code: String,
    pub event_name: String,
    pub guard_conditions: Option<Value>,
    pub actions: Option<Value>,
    pub required_permissions: Option<Vec<String>>,
    pub allowed_roles: Option<Vec<String>>,
    pub button_label: Option<String>,
    pub button_color: Option<String>,
    pub confirm_message: Option<String>,
    pub is_api_enabled: bool,
    pub is_ui_enabled: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_workflow() -> WorkflowDefinition {
        let mut states = HashMap::new();
        states.insert("scheduled".to_string(), WorkflowState {
            id: Uuid::new_v4(),
            code: "scheduled".to_string(),
            name: "Scheduled".to_string(),
            description: None,
            is_initial: true,
            is_terminal: false,
            color: Some("blue".to_string()),
            icon: Some("calendar".to_string()),
            display_order: 0,
        });
        states.insert("checked_in".to_string(), WorkflowState {
            id: Uuid::new_v4(),
            code: "checked_in".to_string(),
            name: "Checked In".to_string(),
            description: None,
            is_initial: false,
            is_terminal: false,
            color: Some("green".to_string()),
            icon: Some("check".to_string()),
            display_order: 1,
        });
        states.insert("completed".to_string(), WorkflowState {
            id: Uuid::new_v4(),
            code: "completed".to_string(),
            name: "Completed".to_string(),
            description: None,
            is_initial: false,
            is_terminal: true,
            color: Some("gray".to_string()),
            icon: Some("check-circle".to_string()),
            display_order: 2,
        });

        let mut transitions = HashMap::new();
        transitions.insert(
            ("scheduled".to_string(), "check_in".to_string()),
            WorkflowTransition {
                id: Uuid::new_v4(),
                from_state: "scheduled".to_string(),
                to_state: "checked_in".to_string(),
                event_code: "check_in".to_string(),
                event_name: "Check In".to_string(),
                guard_conditions: None,
                actions: None,
                required_permissions: vec![],
                allowed_roles: vec![],
                button_label: Some("Check In".to_string()),
                button_color: Some("green".to_string()),
                confirm_message: None,
                is_api_enabled: true,
                is_ui_enabled: true,
            },
        );
        transitions.insert(
            ("checked_in".to_string(), "complete".to_string()),
            WorkflowTransition {
                id: Uuid::new_v4(),
                from_state: "checked_in".to_string(),
                to_state: "completed".to_string(),
                event_code: "complete".to_string(),
                event_name: "Complete".to_string(),
                guard_conditions: None,
                actions: None,
                required_permissions: vec!["appointment.complete".to_string()],
                allowed_roles: vec!["doctor".to_string()],
                button_label: Some("Complete Visit".to_string()),
                button_color: Some("blue".to_string()),
                confirm_message: Some("Are you sure you want to complete this visit?".to_string()),
                is_api_enabled: true,
                is_ui_enabled: true,
            },
        );

        WorkflowDefinition {
            id: Uuid::new_v4(),
            organization_id: Uuid::new_v4(),
            entity_type: WorkflowEntityType::Appointment,
            name: "Test Appointment Workflow".to_string(),
            description: None,
            version: 1,
            is_active: true,
            states,
            initial_state: "scheduled".to_string(),
            terminal_states: vec!["completed".to_string()],
            transitions,
        }
    }

    #[test]
    fn test_valid_transitions() {
        let workflow = create_test_workflow();

        let transitions = workflow.valid_transitions("scheduled");
        assert_eq!(transitions.len(), 1);
        assert_eq!(transitions[0].event_code, "check_in");
    }

    #[test]
    fn test_can_transition() {
        let workflow = create_test_workflow();
        let ctx = WorkflowContext::new(serde_json::json!({}));

        // Valid transition
        assert!(workflow.can_transition("scheduled", "check_in", &ctx).unwrap());

        // Invalid transition
        assert!(workflow.can_transition("scheduled", "complete", &ctx).is_err());
    }

    #[test]
    fn test_transition_with_role_check() {
        let workflow = create_test_workflow();

        // Without doctor role - should fail
        let ctx = WorkflowContext::new(serde_json::json!({}))
            .with_user(Uuid::new_v4(), vec!["nurse".to_string()], vec![]);

        let result = workflow.can_transition("checked_in", "complete", &ctx);
        assert!(!result.unwrap()); // Fails role check

        // With doctor role - should pass
        let ctx = WorkflowContext::new(serde_json::json!({}))
            .with_user(
                Uuid::new_v4(),
                vec!["doctor".to_string()],
                vec!["appointment.complete".to_string()],
            );

        let result = workflow.can_transition("checked_in", "complete", &ctx);
        assert!(result.unwrap());
    }

    #[test]
    fn test_execute_transition() {
        let workflow = create_test_workflow();
        let mut ctx = WorkflowContext::new(serde_json::json!({}));

        let result = workflow.transition("scheduled", "check_in", &mut ctx).unwrap();

        assert_eq!(result.from_state, "scheduled");
        assert_eq!(result.to_state, "checked_in");
        assert_eq!(result.event_code, "check_in");
    }

    #[test]
    fn test_valid_events_for_ui() {
        let workflow = create_test_workflow();
        let ctx = WorkflowContext::new(serde_json::json!({}))
            .with_user(
                Uuid::new_v4(),
                vec!["doctor".to_string()],
                vec!["appointment.complete".to_string()],
            );

        let events = workflow.valid_events("checked_in", &ctx);
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].event_code, "complete");
        assert!(events[0].requires_confirmation);
    }
}
