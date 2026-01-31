//! EHR Document Repository Trait

use async_trait::async_trait;
use chrono::NaiveDate;
use uuid::Uuid;

use crate::domain::entities::ehr::{EhrDocument, DocumentType, DocumentStatus};
use crate::domain::repositories::ehr::patient_repository::{PaginatedResult, Pagination};
use crate::shared::AppResult;

/// Document search criteria
#[derive(Debug, Clone, Default)]
pub struct DocumentSearchCriteria {
    /// Filter by patient
    pub patient_id: Option<Uuid>,
    /// Filter by visit
    pub visit_id: Option<Uuid>,
    /// Filter by document type
    pub document_type: Option<DocumentType>,
    /// Filter by status
    pub status: Option<DocumentStatus>,
    /// Filter by author
    pub author_id: Option<Uuid>,
    /// Filter by signer
    pub signer_id: Option<Uuid>,
    /// Search by title
    pub title: Option<String>,
    /// Search in content
    pub content_search: Option<String>,
    /// Filter by date range (start)
    pub date_from: Option<NaiveDate>,
    /// Filter by date range (end)
    pub date_to: Option<NaiveDate>,
    /// Filter by service
    pub service: Option<String>,
    /// Unsigned documents only
    pub unsigned_only: bool,
}

/// EHR Document Repository Trait
#[async_trait]
pub trait EhrDocumentRepository: Send + Sync {
    /// Create a new document
    async fn create(&self, document: EhrDocument) -> AppResult<EhrDocument>;

    /// Find document by ID
    async fn find_by_id(&self, id: Uuid, organization_id: Uuid) -> AppResult<Option<EhrDocument>>;

    /// Find document by IEN
    async fn find_by_ien(&self, ien: i64, organization_id: Uuid) -> AppResult<Option<EhrDocument>>;

    /// Update document
    async fn update(&self, document: EhrDocument) -> AppResult<EhrDocument>;

    /// Delete document (soft delete)
    async fn delete(&self, id: Uuid, organization_id: Uuid) -> AppResult<()>;

    /// Search documents
    async fn search(
        &self,
        organization_id: Uuid,
        criteria: DocumentSearchCriteria,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrDocument>>;

    /// Get documents for a patient
    async fn find_by_patient(
        &self,
        patient_id: Uuid,
        organization_id: Uuid,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrDocument>>;

    /// Get documents for a visit
    async fn find_by_visit(
        &self,
        visit_id: Uuid,
        organization_id: Uuid,
    ) -> AppResult<Vec<EhrDocument>>;

    /// Get unsigned documents for a provider
    async fn find_unsigned_by_signer(
        &self,
        expected_signer_id: Uuid,
        organization_id: Uuid,
    ) -> AppResult<Vec<EhrDocument>>;

    /// Get addendums for a document
    async fn find_addendums(
        &self,
        parent_document_id: Uuid,
        organization_id: Uuid,
    ) -> AppResult<Vec<EhrDocument>>;

    /// Get recent documents by author
    async fn find_recent_by_author(
        &self,
        author_id: Uuid,
        organization_id: Uuid,
        limit: u32,
    ) -> AppResult<Vec<EhrDocument>>;

    /// Get next IEN
    async fn next_ien(&self, organization_id: Uuid) -> AppResult<i64>;
}
