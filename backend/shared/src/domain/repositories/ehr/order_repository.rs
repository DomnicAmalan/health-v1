//! EHR Order Repository Trait

use async_trait::async_trait;
use chrono::NaiveDate;
use uuid::Uuid;

use crate::domain::entities::ehr::{EhrOrder, OrderType, OrderStatus, OrderUrgency};
use crate::domain::repositories::ehr::patient_repository::{PaginatedResult, Pagination};
use crate::shared::AppResult;

/// Order search criteria
#[derive(Debug, Clone, Default)]
pub struct OrderSearchCriteria {
    /// Filter by patient
    pub patient_id: Option<Uuid>,
    /// Filter by visit
    pub visit_id: Option<Uuid>,
    /// Filter by order type
    pub order_type: Option<OrderType>,
    /// Filter by status
    pub status: Option<OrderStatus>,
    /// Filter by urgency
    pub urgency: Option<OrderUrgency>,
    /// Filter by ordering provider
    pub ordering_provider_id: Option<Uuid>,
    /// Search in order text
    pub order_text: Option<String>,
    /// Filter by date range (start)
    pub date_from: Option<NaiveDate>,
    /// Filter by date range (end)
    pub date_to: Option<NaiveDate>,
    /// Active orders only
    pub active_only: bool,
    /// Unsigned orders only
    pub unsigned_only: bool,
}

/// EHR Order Repository Trait
#[async_trait]
pub trait EhrOrderRepository: Send + Sync {
    /// Create a new order
    async fn create(&self, order: EhrOrder) -> AppResult<EhrOrder>;

    /// Find order by ID
    async fn find_by_id(&self, id: Uuid, organization_id: Uuid) -> AppResult<Option<EhrOrder>>;

    /// Find order by IEN
    async fn find_by_ien(&self, ien: i64, organization_id: Uuid) -> AppResult<Option<EhrOrder>>;

    /// Update order
    async fn update(&self, order: EhrOrder) -> AppResult<EhrOrder>;

    /// Delete order (soft delete)
    async fn delete(&self, id: Uuid, organization_id: Uuid) -> AppResult<()>;

    /// Search orders
    async fn search(
        &self,
        organization_id: Uuid,
        criteria: OrderSearchCriteria,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrOrder>>;

    /// Get orders for a patient
    async fn find_by_patient(
        &self,
        patient_id: Uuid,
        organization_id: Uuid,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrOrder>>;

    /// Get orders for a visit
    async fn find_by_visit(
        &self,
        visit_id: Uuid,
        organization_id: Uuid,
    ) -> AppResult<Vec<EhrOrder>>;

    /// Get active orders for a patient
    async fn find_active_by_patient(
        &self,
        patient_id: Uuid,
        organization_id: Uuid,
    ) -> AppResult<Vec<EhrOrder>>;

    /// Get orders needing signature for a provider
    async fn find_unsigned_by_provider(
        &self,
        provider_id: Uuid,
        organization_id: Uuid,
    ) -> AppResult<Vec<EhrOrder>>;

    /// Get stat orders needing action
    async fn find_stat_orders(
        &self,
        organization_id: Uuid,
    ) -> AppResult<Vec<EhrOrder>>;

    /// Get next IEN
    async fn next_ien(&self, organization_id: Uuid) -> AppResult<i64>;
}
