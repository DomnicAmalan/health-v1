//! EHR Visit Repository Trait

use async_trait::async_trait;
use chrono::NaiveDate;
use uuid::Uuid;

use crate::domain::entities::ehr::{EhrVisit, VisitStatus, VisitType};
use crate::domain::repositories::ehr::patient_repository::{PaginatedResult, Pagination};
use crate::shared::AppResult;

/// Visit search criteria
#[derive(Debug, Clone, Default)]
pub struct VisitSearchCriteria {
    /// Filter by patient
    pub patient_id: Option<Uuid>,
    /// Filter by visit type
    pub visit_type: Option<VisitType>,
    /// Filter by status
    pub status: Option<VisitStatus>,
    /// Filter by provider
    pub provider_id: Option<Uuid>,
    /// Filter by location
    pub location_id: Option<Uuid>,
    /// Filter by date range (start)
    pub date_from: Option<NaiveDate>,
    /// Filter by date range (end)
    pub date_to: Option<NaiveDate>,
}

/// EHR Visit Repository Trait
#[async_trait]
pub trait EhrVisitRepository: Send + Sync {
    /// Create a new visit
    async fn create(&self, visit: EhrVisit) -> AppResult<EhrVisit>;

    /// Find visit by ID
    async fn find_by_id(&self, id: Uuid, organization_id: Uuid) -> AppResult<Option<EhrVisit>>;

    /// Find visit by IEN
    async fn find_by_ien(&self, ien: i64, organization_id: Uuid) -> AppResult<Option<EhrVisit>>;

    /// Update visit
    async fn update(&self, visit: EhrVisit) -> AppResult<EhrVisit>;

    /// Delete visit (soft delete)
    async fn delete(&self, id: Uuid, organization_id: Uuid) -> AppResult<()>;

    /// Search visits with criteria
    async fn search(
        &self,
        organization_id: Uuid,
        criteria: VisitSearchCriteria,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrVisit>>;

    /// Get visits for a patient
    async fn find_by_patient(
        &self,
        patient_id: Uuid,
        organization_id: Uuid,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrVisit>>;

    /// Get today's visits for a provider
    async fn find_today_by_provider(
        &self,
        provider_id: Uuid,
        organization_id: Uuid,
    ) -> AppResult<Vec<EhrVisit>>;

    /// Get active visits (checked-in or in progress)
    async fn find_active(
        &self,
        organization_id: Uuid,
        location_id: Option<Uuid>,
    ) -> AppResult<Vec<EhrVisit>>;

    /// Get next IEN
    async fn next_ien(&self, organization_id: Uuid) -> AppResult<i64>;
}
