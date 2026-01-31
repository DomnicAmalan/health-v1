//! EHR Repository Traits
//!
//! Repository interfaces for EHR domain entities.

pub mod patient_repository;
pub mod visit_repository;
pub mod problem_repository;
pub mod medication_repository;
pub mod allergy_repository;
pub mod vital_repository;
pub mod lab_result_repository;
pub mod document_repository;
pub mod order_repository;
pub mod appointment_repository;
pub mod drug_repository;

pub use patient_repository::EhrPatientRepository;
pub use visit_repository::EhrVisitRepository;
pub use problem_repository::EhrProblemRepository;
pub use medication_repository::EhrMedicationRepository;
pub use allergy_repository::EhrAllergyRepository;
pub use vital_repository::EhrVitalRepository;
pub use lab_result_repository::EhrLabResultRepository;
pub use document_repository::EhrDocumentRepository;
pub use order_repository::EhrOrderRepository;
pub use appointment_repository::EhrAppointmentRepository;
pub use drug_repository::{
    DrugCatalogRepository, DrugScheduleRepository, DrugRepository,
    DrugInteractionRepository, DrugContraindicationRepository,
    DrugAllergyMappingRepository, DrugInteractionCheckService,
    DrugCatalogSearchCriteria, DrugSearchCriteria, InteractionSearchCriteria,
};
