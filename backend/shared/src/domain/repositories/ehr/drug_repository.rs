//! Drug Repository Trait
//!
//! Repository interface for drug catalog, schedules, and drug master.

use async_trait::async_trait;
use uuid::Uuid;

use crate::domain::entities::ehr::{
    Drug, DrugCatalog, DrugFormType, DrugRoute, DrugSchedule,
    DrugInteraction, DrugContraindication, DrugAllergyMapping,
    InteractionCheckResult, InteractionSeverity,
};
use crate::domain::repositories::ehr::patient_repository::{PaginatedResult, Pagination};
use crate::shared::AppResult;

// =============================================================================
// SEARCH CRITERIA
// =============================================================================

/// Drug catalog search criteria
#[derive(Debug, Clone, Default)]
pub struct DrugCatalogSearchCriteria {
    /// Filter by country code (ISO 3166-1 alpha-3)
    pub country_code: Option<String>,
    /// Filter by region
    pub region_id: Option<Uuid>,
    /// Only active catalogs
    pub active_only: bool,
    /// Only primary catalogs
    pub primary_only: bool,
}

/// Drug search criteria
#[derive(Debug, Clone, Default)]
pub struct DrugSearchCriteria {
    /// Search query (generic name, brand names)
    pub query: Option<String>,
    /// Filter by catalog
    pub catalog_id: Option<Uuid>,
    /// Filter by schedule
    pub schedule_id: Option<Uuid>,
    /// Filter by therapeutic class
    pub therapeutic_class: Option<String>,
    /// Filter by pharmacological class
    pub pharmacological_class: Option<String>,
    /// Filter by form
    pub form: Option<DrugFormType>,
    /// Filter by route
    pub route: Option<DrugRoute>,
    /// Filter by ATC code prefix
    pub atc_code_prefix: Option<String>,
    /// Only formulary drugs
    pub formulary_only: bool,
    /// Only active drugs
    pub active_only: bool,
    /// Organization filter (None for system-wide)
    pub organization_id: Option<Uuid>,
}

/// Drug interaction search criteria
#[derive(Debug, Clone, Default)]
pub struct InteractionSearchCriteria {
    /// Drug IDs to check for interactions
    pub drug_ids: Vec<Uuid>,
    /// Filter by severity
    pub min_severity: Option<InteractionSeverity>,
    /// Catalog scope
    pub catalog_id: Option<Uuid>,
    /// Only active interactions
    pub active_only: bool,
}

// =============================================================================
// DRUG CATALOG REPOSITORY
// =============================================================================

/// Drug Catalog Repository Trait
#[async_trait]
pub trait DrugCatalogRepository: Send + Sync {
    /// Create a new drug catalog
    async fn create(&self, catalog: DrugCatalog) -> AppResult<DrugCatalog>;

    /// Find catalog by ID
    async fn find_by_id(&self, id: Uuid) -> AppResult<Option<DrugCatalog>>;

    /// Find catalog by code and country
    async fn find_by_code(&self, catalog_code: &str, country_code: &str) -> AppResult<Option<DrugCatalog>>;

    /// Update catalog
    async fn update(&self, catalog: DrugCatalog) -> AppResult<DrugCatalog>;

    /// Delete catalog
    async fn delete(&self, id: Uuid) -> AppResult<()>;

    /// Search catalogs
    async fn search(
        &self,
        criteria: DrugCatalogSearchCriteria,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<DrugCatalog>>;

    /// List all active catalogs
    async fn list_active(&self) -> AppResult<Vec<DrugCatalog>>;

    /// Get primary catalog for a country
    async fn find_primary_for_country(&self, country_code: &str) -> AppResult<Option<DrugCatalog>>;

    /// Get all catalogs for a region
    async fn find_by_region(&self, region_id: Uuid) -> AppResult<Vec<DrugCatalog>>;
}

// =============================================================================
// DRUG SCHEDULE REPOSITORY
// =============================================================================

/// Drug Schedule Repository Trait
#[async_trait]
pub trait DrugScheduleRepository: Send + Sync {
    /// Create a new schedule
    async fn create(&self, schedule: DrugSchedule) -> AppResult<DrugSchedule>;

    /// Find schedule by ID
    async fn find_by_id(&self, id: Uuid) -> AppResult<Option<DrugSchedule>>;

    /// Find schedule by code within a catalog
    async fn find_by_code(&self, schedule_code: &str, catalog_id: Uuid) -> AppResult<Option<DrugSchedule>>;

    /// Update schedule
    async fn update(&self, schedule: DrugSchedule) -> AppResult<DrugSchedule>;

    /// Delete schedule
    async fn delete(&self, id: Uuid) -> AppResult<()>;

    /// List all schedules for a catalog
    async fn find_by_catalog(&self, catalog_id: Uuid) -> AppResult<Vec<DrugSchedule>>;

    /// List all schedules for a region
    async fn find_by_region(&self, region_id: Uuid) -> AppResult<Vec<DrugSchedule>>;

    /// List controlled substance schedules
    async fn find_controlled(&self, catalog_id: Uuid) -> AppResult<Vec<DrugSchedule>>;
}

// =============================================================================
// DRUG REPOSITORY
// =============================================================================

/// Drug Repository Trait
#[async_trait]
pub trait DrugRepository: Send + Sync {
    /// Create a new drug
    async fn create(&self, drug: Drug) -> AppResult<Drug>;

    /// Find drug by ID
    async fn find_by_id(&self, id: Uuid) -> AppResult<Option<Drug>>;

    /// Find drug by code within a catalog
    async fn find_by_code(&self, drug_code: &str, catalog_id: Uuid) -> AppResult<Option<Drug>>;

    /// Find drug by RxNorm code
    async fn find_by_rxnorm(&self, rxnorm_code: &str) -> AppResult<Option<Drug>>;

    /// Find drug by NDC code
    async fn find_by_ndc(&self, ndc_code: &str) -> AppResult<Option<Drug>>;

    /// Find drug by ATC code
    async fn find_by_atc(&self, atc_code: &str, catalog_id: Option<Uuid>) -> AppResult<Vec<Drug>>;

    /// Update drug
    async fn update(&self, drug: Drug) -> AppResult<Drug>;

    /// Soft delete drug
    async fn delete(&self, id: Uuid, deleted_by: Option<Uuid>) -> AppResult<()>;

    /// Search drugs
    async fn search(
        &self,
        criteria: DrugSearchCriteria,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<Drug>>;

    /// Full-text search on drug names
    async fn search_by_name(
        &self,
        query: &str,
        catalog_id: Option<Uuid>,
        limit: i32,
    ) -> AppResult<Vec<Drug>>;

    /// List drugs by therapeutic class
    async fn find_by_therapeutic_class(
        &self,
        therapeutic_class: &str,
        catalog_id: Option<Uuid>,
    ) -> AppResult<Vec<Drug>>;

    /// List formulary drugs for an organization
    async fn find_formulary(
        &self,
        organization_id: Option<Uuid>,
        catalog_id: Uuid,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<Drug>>;
}

// =============================================================================
// DRUG INTERACTION REPOSITORY
// =============================================================================

/// Drug Interaction Repository Trait
#[async_trait]
pub trait DrugInteractionRepository: Send + Sync {
    /// Create a new interaction
    async fn create(&self, interaction: DrugInteraction) -> AppResult<DrugInteraction>;

    /// Find interaction by ID
    async fn find_by_id(&self, id: Uuid) -> AppResult<Option<DrugInteraction>>;

    /// Find interaction between two drugs
    async fn find_between_drugs(&self, drug_id_1: Uuid, drug_id_2: Uuid) -> AppResult<Option<DrugInteraction>>;

    /// Update interaction
    async fn update(&self, interaction: DrugInteraction) -> AppResult<DrugInteraction>;

    /// Delete interaction
    async fn delete(&self, id: Uuid) -> AppResult<()>;

    /// Find all interactions for a drug
    async fn find_for_drug(&self, drug_id: Uuid) -> AppResult<Vec<DrugInteraction>>;

    /// Check interactions between multiple drugs
    async fn check_interactions(&self, drug_ids: &[Uuid]) -> AppResult<Vec<DrugInteraction>>;

    /// Find critical interactions
    async fn find_critical(&self, catalog_id: Option<Uuid>) -> AppResult<Vec<DrugInteraction>>;
}

// =============================================================================
// DRUG CONTRAINDICATION REPOSITORY
// =============================================================================

/// Drug Contraindication Repository Trait
#[async_trait]
pub trait DrugContraindicationRepository: Send + Sync {
    /// Create a new contraindication
    async fn create(&self, contraindication: DrugContraindication) -> AppResult<DrugContraindication>;

    /// Find contraindication by ID
    async fn find_by_id(&self, id: Uuid) -> AppResult<Option<DrugContraindication>>;

    /// Update contraindication
    async fn update(&self, contraindication: DrugContraindication) -> AppResult<DrugContraindication>;

    /// Delete contraindication
    async fn delete(&self, id: Uuid) -> AppResult<()>;

    /// Find all contraindications for a drug
    async fn find_for_drug(&self, drug_id: Uuid) -> AppResult<Vec<DrugContraindication>>;

    /// Find contraindications by condition code
    async fn find_by_condition(&self, condition_code: &str) -> AppResult<Vec<DrugContraindication>>;

    /// Find absolute contraindications only
    async fn find_absolute_for_drug(&self, drug_id: Uuid) -> AppResult<Vec<DrugContraindication>>;
}

// =============================================================================
// DRUG ALLERGY REPOSITORY
// =============================================================================

/// Drug Allergy Mapping Repository Trait
#[async_trait]
pub trait DrugAllergyMappingRepository: Send + Sync {
    /// Create a new allergy mapping
    async fn create(&self, mapping: DrugAllergyMapping) -> AppResult<DrugAllergyMapping>;

    /// Find mapping by ID
    async fn find_by_id(&self, id: Uuid) -> AppResult<Option<DrugAllergyMapping>>;

    /// Update mapping
    async fn update(&self, mapping: DrugAllergyMapping) -> AppResult<DrugAllergyMapping>;

    /// Delete mapping
    async fn delete(&self, id: Uuid) -> AppResult<()>;

    /// Find all allergen mappings for a drug
    async fn find_for_drug(&self, drug_id: Uuid) -> AppResult<Vec<DrugAllergyMapping>>;

    /// Find drugs by allergen class
    async fn find_drugs_by_allergen_class(&self, allergen_class: &str) -> AppResult<Vec<Uuid>>;

    /// Find drugs with cross-reactivity to an allergen class
    async fn find_cross_reactive(&self, allergen_class: &str) -> AppResult<Vec<DrugAllergyMapping>>;
}

// =============================================================================
// INTERACTION CHECK SERVICE
// =============================================================================

/// Drug Interaction Check Service Trait
///
/// Combined service for checking drug interactions, contraindications, and allergies.
#[async_trait]
pub trait DrugInteractionCheckService: Send + Sync {
    /// Perform a comprehensive interaction check
    ///
    /// Checks:
    /// - Drug-drug interactions between all provided drugs
    /// - Contraindications for patient conditions (if patient_ien provided)
    /// - Allergy cross-reactivity (if patient_ien provided)
    async fn check_all(
        &self,
        drug_ids: &[Uuid],
        patient_ien: Option<i64>,
        organization_id: Uuid,
    ) -> AppResult<InteractionCheckResult>;

    /// Check only drug-drug interactions
    async fn check_drug_interactions(&self, drug_ids: &[Uuid]) -> AppResult<Vec<DrugInteraction>>;

    /// Check contraindications for a patient
    async fn check_contraindications(
        &self,
        drug_ids: &[Uuid],
        patient_ien: i64,
        organization_id: Uuid,
    ) -> AppResult<Vec<DrugContraindication>>;

    /// Check allergy alerts for a patient
    async fn check_allergies(
        &self,
        drug_ids: &[Uuid],
        patient_ien: i64,
        organization_id: Uuid,
    ) -> AppResult<Vec<crate::domain::entities::ehr::drug_interaction::AllergyAlert>>;
}
