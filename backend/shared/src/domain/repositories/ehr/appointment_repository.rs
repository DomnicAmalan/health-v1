//! EHR Appointment Repository Trait

use async_trait::async_trait;
use chrono::{DateTime, NaiveDate, Utc};
use uuid::Uuid;

use crate::domain::entities::ehr::{EhrAppointment, AppointmentType, AppointmentStatus};
use crate::domain::repositories::ehr::patient_repository::{PaginatedResult, Pagination};
use crate::shared::AppResult;

/// Appointment search criteria
#[derive(Debug, Clone, Default)]
pub struct AppointmentSearchCriteria {
    /// Filter by patient
    pub patient_id: Option<Uuid>,
    /// Filter by provider
    pub provider_id: Option<Uuid>,
    /// Filter by location
    pub location_id: Option<Uuid>,
    /// Filter by appointment type
    pub appointment_type: Option<AppointmentType>,
    /// Filter by status
    pub status: Option<AppointmentStatus>,
    /// Filter by date range (start)
    pub date_from: Option<NaiveDate>,
    /// Filter by date range (end)
    pub date_to: Option<NaiveDate>,
    /// Filter by specific date
    pub date: Option<NaiveDate>,
}

/// Time slot for scheduling
#[derive(Debug, Clone)]
pub struct TimeSlot {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
    pub available: bool,
}

/// EHR Appointment Repository Trait
#[async_trait]
pub trait EhrAppointmentRepository: Send + Sync {
    /// Create a new appointment
    async fn create(&self, appointment: EhrAppointment) -> AppResult<EhrAppointment>;

    /// Find appointment by ID
    async fn find_by_id(&self, id: Uuid, organization_id: Uuid) -> AppResult<Option<EhrAppointment>>;

    /// Find appointment by IEN
    async fn find_by_ien(&self, ien: i64, organization_id: Uuid) -> AppResult<Option<EhrAppointment>>;

    /// Update appointment
    async fn update(&self, appointment: EhrAppointment) -> AppResult<EhrAppointment>;

    /// Delete appointment (soft delete)
    async fn delete(&self, id: Uuid, organization_id: Uuid) -> AppResult<()>;

    /// Search appointments
    async fn search(
        &self,
        organization_id: Uuid,
        criteria: AppointmentSearchCriteria,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrAppointment>>;

    /// Get appointments for a patient
    async fn find_by_patient(
        &self,
        patient_id: Uuid,
        organization_id: Uuid,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrAppointment>>;

    /// Get today's appointments for a provider
    async fn find_today_by_provider(
        &self,
        provider_id: Uuid,
        organization_id: Uuid,
    ) -> AppResult<Vec<EhrAppointment>>;

    /// Get appointments for a date range and provider
    async fn find_by_provider_date_range(
        &self,
        provider_id: Uuid,
        organization_id: Uuid,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> AppResult<Vec<EhrAppointment>>;

    /// Get appointments for a date range and location
    async fn find_by_location_date_range(
        &self,
        location_id: Uuid,
        organization_id: Uuid,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> AppResult<Vec<EhrAppointment>>;

    /// Get checked-in appointments (waiting patients)
    async fn find_checked_in(
        &self,
        organization_id: Uuid,
        location_id: Option<Uuid>,
    ) -> AppResult<Vec<EhrAppointment>>;

    /// Get upcoming appointments for a patient
    async fn find_upcoming_by_patient(
        &self,
        patient_id: Uuid,
        organization_id: Uuid,
        limit: u32,
    ) -> AppResult<Vec<EhrAppointment>>;

    /// Check for scheduling conflicts
    async fn find_conflicts(
        &self,
        provider_id: Uuid,
        organization_id: Uuid,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
        exclude_id: Option<Uuid>,
    ) -> AppResult<Vec<EhrAppointment>>;

    /// Get next IEN
    async fn next_ien(&self, organization_id: Uuid) -> AppResult<i64>;
}
