//! State Machine Framework
//!
//! Provides type-safe state machines with:
//! - Compile-time transition validation via proc macro
//! - Runtime guards for business rules
//! - Actions for side effects
//! - Automatic audit trail generation
//!
//! # Why State Machines for Healthcare?
//!
//! Hospital Information Systems (HIS) and Laboratory Information Systems (LIS)
//! require strict workflow control because:
//!
//! 1. **Compliance**: HIPAA, NABH, JCI require audit trails for all state changes
//! 2. **Safety**: Can't complete a lab order without sample collection
//! 3. **Configurability**: Different hospitals have different workflows
//! 4. **Error Prevention**: Invalid state transitions are blocked at compile/runtime
//!
//! # Usage
//!
//! ```ignore
//! use shared::domain::state_machine::{state_machine, TransitionError};
//!
//! state_machine! {
//!     AppointmentStateMachine for AppointmentStatus {
//!         initial: Scheduled,
//!
//!         Scheduled => {
//!             Confirm => Confirmed,
//!             Cancel [guard: cancellation_allowed] => Cancelled,
//!         },
//!         Confirmed => {
//!             CheckIn [action: record_arrival] => CheckedIn,
//!         },
//!     }
//! }
//! ```

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fmt::Debug;

// Re-export the proc macro
pub use state_machine_macro::state_machine;

// Configurable (database-driven) workflows
pub mod configurable;
pub use configurable::{
    WorkflowDefinition, WorkflowState, WorkflowTransition,
    WorkflowContext, WorkflowEntityType, TransitionResult, ValidEvent,
};

// ============================================================================
// Core Types (used by generated code)
// ============================================================================

/// State machine transition error
#[derive(Debug, Clone, PartialEq)]
pub enum TransitionError {
    /// The transition is not valid from the current state
    InvalidTransition {
        from: String,
        event: String,
    },
    /// A guard function rejected the transition
    GuardFailed {
        from: String,
        event: String,
        guard: String,
    },
}

impl std::fmt::Display for TransitionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TransitionError::InvalidTransition { from, event } => {
                write!(f, "Invalid transition: {} -> {} is not allowed", from, event)
            }
            TransitionError::GuardFailed { from, event, guard } => {
                write!(f, "Guard '{}' rejected transition {} -> {}", guard, from, event)
            }
        }
    }
}

impl std::error::Error for TransitionError {}

/// Trait for state enums
pub trait State: Debug + Clone + Copy + PartialEq + Eq + std::hash::Hash + Send + Sync {}

/// Trait for event enums
pub trait Event: Debug + Clone + Copy + PartialEq + Eq + std::hash::Hash + Send + Sync {}

/// Audit entry for state transitions (database-ready)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateTransitionAudit {
    /// Entity type (e.g., "appointment", "order")
    pub entity_type: String,
    /// Entity ID
    pub entity_id: String,
    /// Previous state
    pub from_state: String,
    /// New state
    pub to_state: String,
    /// Event that triggered the transition
    pub event: String,
    /// User who initiated the transition
    pub initiated_by: Option<String>,
    /// Timestamp of the transition
    pub timestamp: DateTime<Utc>,
    /// Additional context (JSON)
    pub context: Option<serde_json::Value>,
}

impl StateTransitionAudit {
    /// Create a new audit entry
    pub fn new(
        entity_type: impl Into<String>,
        entity_id: impl Into<String>,
        from_state: impl Into<String>,
        to_state: impl Into<String>,
        event: impl Into<String>,
    ) -> Self {
        Self {
            entity_type: entity_type.into(),
            entity_id: entity_id.into(),
            from_state: from_state.into(),
            to_state: to_state.into(),
            event: event.into(),
            initiated_by: None,
            timestamp: Utc::now(),
            context: None,
        }
    }

    /// Set the user who initiated the transition
    pub fn with_user(mut self, user_id: impl Into<String>) -> Self {
        self.initiated_by = Some(user_id.into());
        self
    }

    /// Add context data
    pub fn with_context(mut self, context: serde_json::Value) -> Self {
        self.context = Some(context);
        self
    }
}

/// Helper macro for implementing State trait
#[macro_export]
macro_rules! impl_state {
    ($($t:ty),*) => {
        $(
            impl $crate::domain::state_machine::State for $t {}
        )*
    };
}

/// Helper macro for implementing Event trait
#[macro_export]
macro_rules! impl_event {
    ($($t:ty),*) => {
        $(
            impl $crate::domain::state_machine::Event for $t {}
        )*
    };
}

// ============================================================================
// Example: Appointment Status State Machine
// ============================================================================

/// Appointment status states
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AppointmentStatus {
    /// Initial state - appointment is scheduled
    Scheduled,
    /// Patient/provider confirmed attendance
    Confirmed,
    /// Patient has arrived and checked in
    CheckedIn,
    /// Exam/visit is in progress
    InProgress,
    /// Visit completed successfully
    Completed,
    /// Appointment was cancelled
    Cancelled,
    /// Patient did not show up
    NoShow,
}

impl State for AppointmentStatus {}

impl std::fmt::Display for AppointmentStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Scheduled => write!(f, "scheduled"),
            Self::Confirmed => write!(f, "confirmed"),
            Self::CheckedIn => write!(f, "checked_in"),
            Self::InProgress => write!(f, "in_progress"),
            Self::Completed => write!(f, "completed"),
            Self::Cancelled => write!(f, "cancelled"),
            Self::NoShow => write!(f, "no_show"),
        }
    }
}

impl std::str::FromStr for AppointmentStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "scheduled" => Ok(Self::Scheduled),
            "confirmed" => Ok(Self::Confirmed),
            "checked_in" | "checkedin" => Ok(Self::CheckedIn),
            "in_progress" | "inprogress" => Ok(Self::InProgress),
            "completed" => Ok(Self::Completed),
            "cancelled" | "canceled" => Ok(Self::Cancelled),
            "no_show" | "noshow" => Ok(Self::NoShow),
            _ => Err(format!("Unknown appointment status: {}", s)),
        }
    }
}

// Define the state machine using the proc macro
state_machine! {
    AppointmentStateMachine for AppointmentStatus {
        initial: Scheduled,

        Scheduled => {
            Confirm => Confirmed,
            Cancel [guard: cancellation_allowed] => Cancelled,
        },
        Confirmed => {
            CheckIn [action: record_check_in_time] => CheckedIn,
            Cancel [guard: cancellation_allowed] => Cancelled,
            MarkNoShow [guard: past_scheduled_time] => NoShow,
        },
        CheckedIn => {
            StartExam [action: record_exam_start] => InProgress,
            Cancel => Cancelled,
        },
        InProgress => {
            Complete [action: record_completion] => Completed,
        },
    }
}

/// Context for appointment state transitions
#[derive(Debug, Clone)]
pub struct AppointmentContext {
    /// Scheduled appointment time
    pub scheduled_time: DateTime<Utc>,
    /// When patient checked in
    pub check_in_time: Option<DateTime<Utc>>,
    /// When exam started
    pub exam_start_time: Option<DateTime<Utc>>,
    /// When appointment completed
    pub completion_time: Option<DateTime<Utc>>,
    /// Cancellation reason (if cancelled)
    pub cancellation_reason: Option<String>,
    /// Calculated wait time in minutes
    pub wait_time_minutes: Option<i32>,
    /// Calculated exam duration in minutes
    pub exam_duration_minutes: Option<i32>,
}

impl AppointmentContext {
    /// Create a new context with scheduled time
    pub fn new(scheduled_time: DateTime<Utc>) -> Self {
        Self {
            scheduled_time,
            check_in_time: None,
            exam_start_time: None,
            completion_time: None,
            cancellation_reason: None,
            wait_time_minutes: None,
            exam_duration_minutes: None,
        }
    }
}

/// Appointment state machine implementation
pub struct AppointmentMachine;

impl AppointmentStateMachine<AppointmentContext> for AppointmentMachine {
    /// Guard: Can only cancel if appointment is > 2 hours away
    fn cancellation_allowed(ctx: &AppointmentContext) -> bool {
        ctx.scheduled_time > Utc::now() + chrono::Duration::hours(2)
    }

    /// Guard: Can only mark no-show if appointment time has passed
    fn past_scheduled_time(ctx: &AppointmentContext) -> bool {
        ctx.scheduled_time < Utc::now()
    }

    /// Action: Record check-in time and calculate wait time
    fn record_check_in_time(ctx: &mut AppointmentContext) {
        let now = Utc::now();
        ctx.check_in_time = Some(now);

        // Calculate wait time (negative if early)
        let wait = now - ctx.scheduled_time;
        ctx.wait_time_minutes = Some(wait.num_minutes() as i32);
    }

    /// Action: Record exam start time
    fn record_exam_start(ctx: &mut AppointmentContext) {
        ctx.exam_start_time = Some(Utc::now());
    }

    /// Action: Record completion and calculate duration
    fn record_completion(ctx: &mut AppointmentContext) {
        let now = Utc::now();
        ctx.completion_time = Some(now);

        // Calculate exam duration
        if let Some(start) = ctx.exam_start_time {
            ctx.exam_duration_minutes = Some((now - start).num_minutes() as i32);
        }
    }
}

// ============================================================================
// Example: Order Status State Machine
// ============================================================================

/// Order status states
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OrderStatus {
    /// Order created, awaiting signature
    Draft,
    /// Order signed and active
    Active,
    /// Order on hold
    OnHold,
    /// Order in progress (e.g., lab sample collected)
    InProgress,
    /// Order completed with results
    Completed,
    /// Order discontinued
    Discontinued,
    /// Order cancelled before execution
    Cancelled,
}

impl State for OrderStatus {}

impl std::fmt::Display for OrderStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Draft => write!(f, "draft"),
            Self::Active => write!(f, "active"),
            Self::OnHold => write!(f, "on_hold"),
            Self::InProgress => write!(f, "in_progress"),
            Self::Completed => write!(f, "completed"),
            Self::Discontinued => write!(f, "discontinued"),
            Self::Cancelled => write!(f, "cancelled"),
        }
    }
}

// Define order state machine
state_machine! {
    OrderStateMachine for OrderStatus {
        initial: Draft,

        Draft => {
            Sign [guard: has_valid_signature] => Active,
            Cancel => Cancelled,
        },
        Active => {
            Hold [guard: hold_allowed] => OnHold,
            Start [action: record_start_time] => InProgress,
            Discontinue [action: record_discontinue_reason] => Discontinued,
        },
        OnHold => {
            Release => Active,
            Discontinue [action: record_discontinue_reason] => Discontinued,
        },
        InProgress => {
            Complete [action: record_results] => Completed,
            Discontinue [action: record_discontinue_reason] => Discontinued,
        },
    }
}

/// Context for order state transitions
#[derive(Debug, Clone)]
pub struct OrderContext {
    /// Order ID
    pub order_id: String,
    /// Signing provider ID
    pub signed_by: Option<String>,
    /// Signature timestamp
    pub signed_at: Option<DateTime<Utc>>,
    /// When order execution started
    pub started_at: Option<DateTime<Utc>>,
    /// When order completed
    pub completed_at: Option<DateTime<Utc>>,
    /// Discontinue reason
    pub discontinue_reason: Option<String>,
    /// Results (for completed orders)
    pub results: Option<serde_json::Value>,
}

impl OrderContext {
    /// Create a new order context
    pub fn new(order_id: impl Into<String>) -> Self {
        Self {
            order_id: order_id.into(),
            signed_by: None,
            signed_at: None,
            started_at: None,
            completed_at: None,
            discontinue_reason: None,
            results: None,
        }
    }
}

/// Order state machine implementation
pub struct OrderMachine;

impl OrderStateMachine<OrderContext> for OrderMachine {
    /// Guard: Order must have a valid signature
    fn has_valid_signature(ctx: &OrderContext) -> bool {
        ctx.signed_by.is_some()
    }

    /// Guard: Check if hold is allowed (e.g., not past certain point)
    fn hold_allowed(_ctx: &OrderContext) -> bool {
        // Business rule: always allow hold for active orders
        true
    }

    /// Action: Record when order execution started
    fn record_start_time(ctx: &mut OrderContext) {
        ctx.started_at = Some(Utc::now());
    }

    /// Action: Record discontinue reason
    fn record_discontinue_reason(ctx: &mut OrderContext) {
        // Note: Actual reason should be set by the handler before transition
        if ctx.discontinue_reason.is_none() {
            ctx.discontinue_reason = Some("Discontinued by provider".to_string());
        }
    }

    /// Action: Record order results
    fn record_results(ctx: &mut OrderContext) {
        ctx.completed_at = Some(Utc::now());
        // Note: Actual results should be set by the handler
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_appointment_state_machine_valid_transitions() {
        let mut ctx = AppointmentContext::new(Utc::now() + chrono::Duration::days(1));

        // Scheduled -> Confirmed
        let result = AppointmentMachine::transition(
            &AppointmentStatus::Scheduled,
            AppointmentStateMachineEvent::Confirm,
            &mut ctx,
        );
        assert_eq!(result.unwrap(), AppointmentStatus::Confirmed);

        // Confirmed -> CheckedIn
        let result = AppointmentMachine::transition(
            &AppointmentStatus::Confirmed,
            AppointmentStateMachineEvent::CheckIn,
            &mut ctx,
        );
        assert_eq!(result.unwrap(), AppointmentStatus::CheckedIn);
        assert!(ctx.check_in_time.is_some());
    }

    #[test]
    fn test_appointment_invalid_transition() {
        let mut ctx = AppointmentContext::new(Utc::now() + chrono::Duration::days(1));

        // Can't go directly from Scheduled to Completed
        let result = AppointmentMachine::transition(
            &AppointmentStatus::Scheduled,
            AppointmentStateMachineEvent::Complete,
            &mut ctx,
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_appointment_guard_blocks_transition() {
        // Create appointment in the past
        let mut ctx = AppointmentContext::new(Utc::now() - chrono::Duration::hours(1));

        // Cancellation should be blocked (past cancellation window)
        let result = AppointmentMachine::transition(
            &AppointmentStatus::Scheduled,
            AppointmentStateMachineEvent::Cancel,
            &mut ctx,
        );
        assert!(matches!(result, Err(TransitionError::GuardFailed { .. })));
    }

    #[test]
    fn test_valid_transitions_list() {
        let transitions = AppointmentMachine::valid_transitions(&AppointmentStatus::Scheduled);
        assert_eq!(transitions.len(), 2); // Confirm, Cancel

        let transitions = AppointmentMachine::valid_transitions(&AppointmentStatus::Completed);
        assert!(transitions.is_empty()); // Terminal state
    }

    #[test]
    fn test_can_transition() {
        let ctx = AppointmentContext::new(Utc::now() + chrono::Duration::days(1));

        assert!(AppointmentMachine::can_transition(
            &AppointmentStatus::Scheduled,
            &AppointmentStateMachineEvent::Confirm,
            &ctx
        ));

        assert!(!AppointmentMachine::can_transition(
            &AppointmentStatus::Completed,
            &AppointmentStateMachineEvent::Confirm,
            &ctx
        ));
    }

    #[test]
    fn test_order_state_machine() {
        let mut ctx = OrderContext::new("ORD-001");
        ctx.signed_by = Some("DR-123".to_string());

        // Draft -> Active (with signature)
        let result = OrderMachine::transition(
            &OrderStatus::Draft,
            OrderStateMachineEvent::Sign,
            &mut ctx,
        );
        assert_eq!(result.unwrap(), OrderStatus::Active);
    }

    #[test]
    fn test_order_guard_blocks_unsigned() {
        let mut ctx = OrderContext::new("ORD-001");
        // No signature

        // Should fail - no signature
        let result = OrderMachine::transition(
            &OrderStatus::Draft,
            OrderStateMachineEvent::Sign,
            &mut ctx,
        );
        assert!(matches!(result, Err(TransitionError::GuardFailed { .. })));
    }
}
