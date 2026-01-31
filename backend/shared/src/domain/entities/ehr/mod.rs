//! EHR (Electronic Health Record) Domain Entities
//!
//! This module contains entities for the VistA-inspired EHR system,
//! using MUMPS-style hierarchical data patterns.

pub mod patient;
pub mod visit;
pub mod problem;
pub mod medication;
pub mod allergy;
pub mod vital;
pub mod lab_result;
pub mod document;
pub mod order;
pub mod appointment;
pub mod drug;
pub mod drug_interaction;

pub use patient::*;
pub use visit::*;
pub use problem::*;
pub use medication::*;
pub use allergy::*;
pub use vital::*;
pub use lab_result::*;
pub use document::*;
pub use order::*;
pub use appointment::*;
pub use drug::*;
pub use drug_interaction::*;
