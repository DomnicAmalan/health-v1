//! EHR Problem Repository Trait

use async_trait::async_trait;
use uuid::Uuid;

use crate::domain::entities::ehr::{EhrProblem, ProblemStatus};
use crate::domain::repositories::ehr::patient_repository::{PaginatedResult, Pagination};
use crate::shared::AppResult;

/// Problem search criteria
#[derive(Debug, Clone, Default)]
pub struct ProblemSearchCriteria {
    /// Filter by patient
    pub patient_id: Option<Uuid>,
    /// Filter by status
    pub status: Option<ProblemStatus>,
    /// Search by ICD-10 code
    pub icd10_code: Option<String>,
    /// Search by description
    pub description: Option<String>,
    /// Filter by provider
    pub provider_id: Option<Uuid>,
}

/// EHR Problem Repository Trait
#[async_trait]
pub trait EhrProblemRepository: Send + Sync {
    /// Create a new problem
    async fn create(&self, problem: EhrProblem) -> AppResult<EhrProblem>;

    /// Find problem by ID
    async fn find_by_id(&self, id: Uuid, organization_id: Uuid) -> AppResult<Option<EhrProblem>>;

    /// Update problem
    async fn update(&self, problem: EhrProblem) -> AppResult<EhrProblem>;

    /// Delete problem (soft delete)
    async fn delete(&self, id: Uuid, organization_id: Uuid) -> AppResult<()>;

    /// Search problems
    async fn search(
        &self,
        organization_id: Uuid,
        criteria: ProblemSearchCriteria,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrProblem>>;

    /// Get active problems for a patient
    async fn find_active_by_patient(
        &self,
        patient_id: Uuid,
        organization_id: Uuid,
    ) -> AppResult<Vec<EhrProblem>>;

    /// Get all problems for a patient
    async fn find_by_patient(
        &self,
        patient_id: Uuid,
        organization_id: Uuid,
        include_inactive: bool,
    ) -> AppResult<Vec<EhrProblem>>;

    /// Get next IEN
    async fn next_ien(&self, organization_id: Uuid) -> AppResult<i64>;
}
