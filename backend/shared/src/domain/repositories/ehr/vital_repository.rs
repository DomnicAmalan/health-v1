//! EHR Vital Signs Repository Trait

use async_trait::async_trait;
use chrono::NaiveDate;
use uuid::Uuid;

use crate::domain::entities::ehr::{EhrVital, VitalType};
use crate::domain::repositories::ehr::patient_repository::{PaginatedResult, Pagination};
use crate::shared::AppResult;

/// Vital signs search criteria
#[derive(Debug, Clone, Default)]
pub struct VitalSearchCriteria {
    /// Filter by patient
    pub patient_id: Option<Uuid>,
    /// Filter by visit
    pub visit_id: Option<Uuid>,
    /// Filter by vital type
    pub vital_type: Option<VitalType>,
    /// Filter by date range (start)
    pub date_from: Option<NaiveDate>,
    /// Filter by date range (end)
    pub date_to: Option<NaiveDate>,
    /// Filter by abnormal only
    pub abnormal_only: bool,
}

/// EHR Vital Signs Repository Trait
#[async_trait]
pub trait EhrVitalRepository: Send + Sync {
    /// Create a new vital sign
    async fn create(&self, vital: EhrVital) -> AppResult<EhrVital>;

    /// Find vital by ID
    async fn find_by_id(&self, id: Uuid, organization_id: Uuid) -> AppResult<Option<EhrVital>>;

    /// Update vital
    async fn update(&self, vital: EhrVital) -> AppResult<EhrVital>;

    /// Delete vital (soft delete)
    async fn delete(&self, id: Uuid, organization_id: Uuid) -> AppResult<()>;

    /// Search vitals
    async fn search(
        &self,
        organization_id: Uuid,
        criteria: VitalSearchCriteria,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrVital>>;

    /// Get vitals for a patient
    async fn find_by_patient(
        &self,
        patient_id: Uuid,
        organization_id: Uuid,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrVital>>;

    /// Get vitals for a visit
    async fn find_by_visit(
        &self,
        visit_id: Uuid,
        organization_id: Uuid,
    ) -> AppResult<Vec<EhrVital>>;

    /// Get latest vitals for a patient (one of each type)
    async fn find_latest_by_patient(
        &self,
        patient_id: Uuid,
        organization_id: Uuid,
    ) -> AppResult<Vec<EhrVital>>;

    /// Get vital trend for a patient (history of one type)
    async fn find_trend(
        &self,
        patient_id: Uuid,
        organization_id: Uuid,
        vital_type: VitalType,
        limit: u32,
    ) -> AppResult<Vec<EhrVital>>;

    /// Get next IEN
    async fn next_ien(&self, organization_id: Uuid) -> AppResult<i64>;
}
