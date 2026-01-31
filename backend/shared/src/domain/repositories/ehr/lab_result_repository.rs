//! EHR Lab Result Repository Trait

use async_trait::async_trait;
use chrono::NaiveDate;
use uuid::Uuid;

use crate::domain::entities::ehr::{EhrLabResult, LabStatus, AbnormalFlag};
use crate::domain::repositories::ehr::patient_repository::{PaginatedResult, Pagination};
use crate::shared::AppResult;

/// Lab result search criteria
#[derive(Debug, Clone, Default)]
pub struct LabSearchCriteria {
    /// Filter by patient
    pub patient_id: Option<Uuid>,
    /// Filter by visit
    pub visit_id: Option<Uuid>,
    /// Filter by order
    pub order_id: Option<Uuid>,
    /// Filter by status
    pub status: Option<LabStatus>,
    /// Search by test name
    pub test_name: Option<String>,
    /// Search by LOINC code
    pub loinc_code: Option<String>,
    /// Filter by category
    pub category: Option<String>,
    /// Filter by abnormal flag
    pub abnormal_flag: Option<AbnormalFlag>,
    /// Filter by date range (start)
    pub date_from: Option<NaiveDate>,
    /// Filter by date range (end)
    pub date_to: Option<NaiveDate>,
    /// Filter by abnormal only
    pub abnormal_only: bool,
    /// Filter by critical only
    pub critical_only: bool,
}

/// EHR Lab Result Repository Trait
#[async_trait]
pub trait EhrLabResultRepository: Send + Sync {
    /// Create a new lab result
    async fn create(&self, lab_result: EhrLabResult) -> AppResult<EhrLabResult>;

    /// Find lab result by ID
    async fn find_by_id(&self, id: Uuid, organization_id: Uuid) -> AppResult<Option<EhrLabResult>>;

    /// Update lab result
    async fn update(&self, lab_result: EhrLabResult) -> AppResult<EhrLabResult>;

    /// Delete lab result (soft delete)
    async fn delete(&self, id: Uuid, organization_id: Uuid) -> AppResult<()>;

    /// Search lab results
    async fn search(
        &self,
        organization_id: Uuid,
        criteria: LabSearchCriteria,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrLabResult>>;

    /// Get lab results for a patient
    async fn find_by_patient(
        &self,
        patient_id: Uuid,
        organization_id: Uuid,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrLabResult>>;

    /// Get lab results for a visit
    async fn find_by_visit(
        &self,
        visit_id: Uuid,
        organization_id: Uuid,
    ) -> AppResult<Vec<EhrLabResult>>;

    /// Get lab results for an order
    async fn find_by_order(
        &self,
        order_id: Uuid,
        organization_id: Uuid,
    ) -> AppResult<Vec<EhrLabResult>>;

    /// Get pending/abnormal labs that need attention
    async fn find_actionable(
        &self,
        organization_id: Uuid,
        provider_id: Option<Uuid>,
    ) -> AppResult<Vec<EhrLabResult>>;

    /// Get next IEN
    async fn next_ien(&self, organization_id: Uuid) -> AppResult<i64>;
}
