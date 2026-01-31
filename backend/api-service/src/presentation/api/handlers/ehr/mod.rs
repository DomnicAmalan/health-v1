//! EHR (Electronic Health Record) API handlers
//!
//! This module provides REST API handlers for the EHR system,
//! inspired by VistA CPRS with MUMPS-style hierarchical storage.

pub mod patient_handlers;
pub mod pharmacy_handlers;

pub use patient_handlers::*;
pub use pharmacy_handlers::*;
