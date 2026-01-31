//! EHR Patient Repository Trait

use async_trait::async_trait;
use chrono::NaiveDate;
use uuid::Uuid;

use crate::domain::entities::ehr::{EhrPatient, PatientStatus};
use crate::shared::AppResult;

/// Patient search criteria
#[derive(Debug, Clone, Default)]
pub struct PatientSearchCriteria {
    /// Search by name (partial match)
    pub name: Option<String>,
    /// Search by MRN (exact match)
    pub mrn: Option<String>,
    /// Search by date of birth
    pub date_of_birth: Option<NaiveDate>,
    /// Search by SSN last 4
    pub ssn_last_four: Option<String>,
    /// Filter by status
    pub status: Option<PatientStatus>,
    /// Filter by primary provider
    pub primary_provider_id: Option<Uuid>,
    /// Filter by primary location
    pub primary_location_id: Option<Uuid>,
}

/// Pagination parameters
#[derive(Debug, Clone)]
pub struct Pagination {
    pub limit: u32,
    pub offset: u32,
}

impl Default for Pagination {
    fn default() -> Self {
        Self {
            limit: 50,
            offset: 0,
        }
    }
}

/// Paginated result
#[derive(Debug, Clone)]
pub struct PaginatedResult<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub limit: u32,
    pub offset: u32,
}

impl<T> PaginatedResult<T> {
    pub fn has_more(&self) -> bool {
        (self.offset as i64 + self.items.len() as i64) < self.total
    }
}

/// EHR Patient Repository Trait
#[async_trait]
pub trait EhrPatientRepository: Send + Sync {
    /// Create a new patient
    async fn create(&self, patient: EhrPatient) -> AppResult<EhrPatient>;

    /// Find patient by ID
    async fn find_by_id(&self, id: Uuid, organization_id: Uuid) -> AppResult<Option<EhrPatient>>;

    /// Find patient by IEN (VistA Internal Entry Number)
    async fn find_by_ien(&self, ien: i64, organization_id: Uuid) -> AppResult<Option<EhrPatient>>;

    /// Find patient by MRN
    async fn find_by_mrn(&self, mrn: &str, organization_id: Uuid) -> AppResult<Option<EhrPatient>>;

    /// Update patient
    async fn update(&self, patient: EhrPatient) -> AppResult<EhrPatient>;

    /// Delete patient (soft delete)
    async fn delete(&self, id: Uuid, organization_id: Uuid) -> AppResult<()>;

    /// Search patients with criteria and pagination
    async fn search(
        &self,
        organization_id: Uuid,
        criteria: PatientSearchCriteria,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrPatient>>;

    /// List all patients for an organization with pagination
    async fn list(
        &self,
        organization_id: Uuid,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrPatient>>;

    /// Count patients for an organization
    async fn count(&self, organization_id: Uuid) -> AppResult<i64>;

    /// Get the next IEN for the organization
    async fn next_ien(&self, organization_id: Uuid) -> AppResult<i64>;
}
