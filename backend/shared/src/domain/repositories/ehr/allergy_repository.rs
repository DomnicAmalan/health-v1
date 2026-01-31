//! EHR Allergy Repository Trait

use async_trait::async_trait;
use uuid::Uuid;

use crate::domain::entities::ehr::{EhrAllergy, AllergyType, AllergyStatus};
use crate::domain::repositories::ehr::patient_repository::{PaginatedResult, Pagination};
use crate::shared::AppResult;

/// Allergy search criteria
#[derive(Debug, Clone, Default)]
pub struct AllergySearchCriteria {
    /// Filter by patient
    pub patient_id: Option<Uuid>,
    /// Filter by allergy type
    pub allergy_type: Option<AllergyType>,
    /// Filter by status
    pub status: Option<AllergyStatus>,
    /// Search by allergen name
    pub allergen: Option<String>,
    /// Filter by verified status
    pub verified_only: bool,
}

/// EHR Allergy Repository Trait
#[async_trait]
pub trait EhrAllergyRepository: Send + Sync {
    /// Create a new allergy
    async fn create(&self, allergy: EhrAllergy) -> AppResult<EhrAllergy>;

    /// Find allergy by ID
    async fn find_by_id(&self, id: Uuid, organization_id: Uuid) -> AppResult<Option<EhrAllergy>>;

    /// Update allergy
    async fn update(&self, allergy: EhrAllergy) -> AppResult<EhrAllergy>;

    /// Delete allergy (soft delete)
    async fn delete(&self, id: Uuid, organization_id: Uuid) -> AppResult<()>;

    /// Search allergies
    async fn search(
        &self,
        organization_id: Uuid,
        criteria: AllergySearchCriteria,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrAllergy>>;

    /// Get active allergies for a patient
    async fn find_active_by_patient(
        &self,
        patient_id: Uuid,
        organization_id: Uuid,
    ) -> AppResult<Vec<EhrAllergy>>;

    /// Get drug allergies for a patient (for drug interaction checking)
    async fn find_drug_allergies_by_patient(
        &self,
        patient_id: Uuid,
        organization_id: Uuid,
    ) -> AppResult<Vec<EhrAllergy>>;

    /// Get all allergies for a patient
    async fn find_by_patient(
        &self,
        patient_id: Uuid,
        organization_id: Uuid,
    ) -> AppResult<Vec<EhrAllergy>>;

    /// Get next IEN
    async fn next_ien(&self, organization_id: Uuid) -> AppResult<i64>;
}
