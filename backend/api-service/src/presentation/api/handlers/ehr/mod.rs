//! EHR (Electronic Health Record) API handlers
//!
//! This module provides REST API handlers for the EHR system,
//! inspired by VistA CPRS with MUMPS-style hierarchical storage.

// Re-export AppState for ehr handler modules
pub use super::AppState;

pub mod anatomy_findings_handlers;
pub mod appointment_handlers;
pub mod body_system_handlers;
pub mod clinical_note_handlers;
pub mod encounter_handlers;
pub mod imaging_orders_handlers;
pub mod lab_orders_handlers;
pub mod lab_results_handlers;
pub mod lab_tests_handlers;
pub mod patient_handlers;
pub mod pharmacy_handlers;
pub mod problem_list_handlers;
pub mod vital_signs_handlers;

pub use anatomy_findings_handlers::*;
pub use appointment_handlers::*;
pub use body_system_handlers::*;
pub use clinical_note_handlers::*;
pub use encounter_handlers::*;
pub use imaging_orders_handlers::*;
pub use lab_orders_handlers::*;
pub use lab_results_handlers::*;
pub use lab_tests_handlers::*;
pub use patient_handlers::*;
pub use pharmacy_handlers::*;
pub use problem_list_handlers::*;
pub use vital_signs_handlers::*;
