//! EHR Medication Repository Trait

use async_trait::async_trait;
use uuid::Uuid;

use crate::domain::entities::ehr::{EhrMedication, MedicationStatus};
use crate::domain::repositories::ehr::patient_repository::{PaginatedResult, Pagination};
use crate::shared::AppResult;

/// Medication search criteria
#[derive(Debug, Clone, Default)]
pub struct MedicationSearchCriteria {
    /// Filter by patient
    pub patient_id: Option<Uuid>,
    /// Filter by status
    pub status: Option<MedicationStatus>,
    /// Search by drug name
    pub drug_name: Option<String>,
    /// Search by RxNorm code
    pub rxnorm_code: Option<String>,
    /// Filter by prescriber
    pub prescriber_id: Option<Uuid>,
    /// Active only (convenience filter)
    pub active_only: bool,
}

/// EHR Medication Repository Trait
#[async_trait]
pub trait EhrMedicationRepository: Send + Sync {
    /// Create a new medication
    async fn create(&self, medication: EhrMedication) -> AppResult<EhrMedication>;

    /// Find medication by ID
    async fn find_by_id(&self, id: Uuid, organization_id: Uuid) -> AppResult<Option<EhrMedication>>;

    /// Update medication
    async fn update(&self, medication: EhrMedication) -> AppResult<EhrMedication>;

    /// Delete medication (soft delete)
    async fn delete(&self, id: Uuid, organization_id: Uuid) -> AppResult<()>;

    /// Search medications
    async fn search(
        &self,
        organization_id: Uuid,
        criteria: MedicationSearchCriteria,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrMedication>>;

    /// Get active medications for a patient
    async fn find_active_by_patient(
        &self,
        patient_id: Uuid,
        organization_id: Uuid,
    ) -> AppResult<Vec<EhrMedication>>;

    /// Get all medications for a patient
    async fn find_by_patient(
        &self,
        patient_id: Uuid,
        organization_id: Uuid,
        include_inactive: bool,
    ) -> AppResult<Vec<EhrMedication>>;

    /// Get next IEN
    async fn next_ien(&self, organization_id: Uuid) -> AppResult<i64>;
}
