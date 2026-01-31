//! EHR Repository Implementations
//!
//! PostgreSQL implementations of EHR repository traits.

pub mod patient_repository_impl;

pub use patient_repository_impl::EhrPatientRepositoryImpl;
