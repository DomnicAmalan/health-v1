//! Drug Domain Entities
//!
//! Country-specific drug catalogs with regulatory classification.
//! Corresponds to tables: drug_catalogs, drug_schedules, drug_master

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Type;
use uuid::Uuid;

use crate::shared::AuditFields;

/// Drug schedule type (regulatory classification)
/// Varies by jurisdiction - supports India, USA, and general schedules
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "drug_schedule_type")]
#[sqlx(rename_all = "snake_case")]
pub enum DrugScheduleType {
    // India (Drugs and Cosmetics Act)
    /// Prescription only
    #[serde(rename = "schedule_h")]
    ScheduleH,
    /// Stricter prescription (antibiotics, etc.)
    #[serde(rename = "schedule_h1")]
    ScheduleH1,
    /// Narcotics/controlled substances
    #[serde(rename = "schedule_x")]
    ScheduleX,
    /// Restricted to hospitals
    #[serde(rename = "schedule_g")]
    ScheduleG,
    /// Over the counter
    #[serde(rename = "otc")]
    Otc,

    // US DEA Controlled Substances Act
    /// No accepted medical use, high abuse potential
    #[serde(rename = "schedule_i")]
    ScheduleI,
    /// High abuse potential, severe dependence
    #[serde(rename = "schedule_ii")]
    ScheduleII,
    /// Moderate abuse potential
    #[serde(rename = "schedule_iii")]
    ScheduleIII,
    /// Low abuse potential
    #[serde(rename = "schedule_iv")]
    ScheduleIV,
    /// Lowest abuse potential
    #[serde(rename = "schedule_v")]
    ScheduleV,
    /// Prescription only (non-controlled)
    #[serde(rename = "rx_only")]
    RxOnly,

    // General
    /// No schedule restrictions
    #[serde(rename = "unscheduled")]
    Unscheduled,
    /// Clinical trial only
    #[serde(rename = "investigational")]
    Investigational,
}

impl Default for DrugScheduleType {
    fn default() -> Self {
        DrugScheduleType::Unscheduled
    }
}

/// Drug form type
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "drug_form_type")]
#[sqlx(rename_all = "snake_case")]
pub enum DrugFormType {
    #[serde(rename = "tablet")]
    Tablet,
    #[serde(rename = "capsule")]
    Capsule,
    #[serde(rename = "syrup")]
    Syrup,
    #[serde(rename = "suspension")]
    Suspension,
    #[serde(rename = "injection")]
    Injection,
    #[serde(rename = "iv_fluid")]
    IvFluid,
    #[serde(rename = "cream")]
    Cream,
    #[serde(rename = "ointment")]
    Ointment,
    #[serde(rename = "gel")]
    Gel,
    #[serde(rename = "drops")]
    Drops,
    #[serde(rename = "inhaler")]
    Inhaler,
    #[serde(rename = "patch")]
    Patch,
    #[serde(rename = "suppository")]
    Suppository,
    #[serde(rename = "powder")]
    Powder,
    #[serde(rename = "solution")]
    Solution,
    #[serde(rename = "spray")]
    Spray,
    #[serde(rename = "lozenge")]
    Lozenge,
    #[serde(rename = "granules")]
    Granules,
    #[serde(rename = "other")]
    Other,
}

impl Default for DrugFormType {
    fn default() -> Self {
        DrugFormType::Tablet
    }
}

/// Drug route of administration
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "drug_route")]
#[sqlx(rename_all = "snake_case")]
pub enum DrugRoute {
    #[serde(rename = "oral")]
    Oral,
    #[serde(rename = "sublingual")]
    Sublingual,
    #[serde(rename = "buccal")]
    Buccal,
    #[serde(rename = "intravenous")]
    Intravenous,
    #[serde(rename = "intramuscular")]
    Intramuscular,
    #[serde(rename = "subcutaneous")]
    Subcutaneous,
    #[serde(rename = "intradermal")]
    Intradermal,
    #[serde(rename = "topical")]
    Topical,
    #[serde(rename = "transdermal")]
    Transdermal,
    #[serde(rename = "inhalation")]
    Inhalation,
    #[serde(rename = "nasal")]
    Nasal,
    #[serde(rename = "ophthalmic")]
    Ophthalmic,
    #[serde(rename = "otic")]
    Otic,
    #[serde(rename = "rectal")]
    Rectal,
    #[serde(rename = "vaginal")]
    Vaginal,
    #[serde(rename = "intrathecal")]
    Intrathecal,
    #[serde(rename = "epidural")]
    Epidural,
    #[serde(rename = "other")]
    Other,
}

impl Default for DrugRoute {
    fn default() -> Self {
        DrugRoute::Oral
    }
}

// =============================================================================
// DRUG CATALOG
// =============================================================================

/// Drug catalog (country/region specific)
///
/// Examples:
/// - Indian Pharmacopoeia (IND-IP)
/// - US National Drug Code (US-NDC)
/// - WHO ATC Classification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrugCatalog {
    pub id: Uuid,

    /// Catalog code (e.g., "IND-IP", "US-NDC")
    pub catalog_code: String,

    /// Catalog name (e.g., "Indian Pharmacopoeia")
    pub catalog_name: String,

    /// Version/edition
    pub catalog_version: Option<String>,

    /// Geographic scope
    pub region_id: Uuid,
    pub country_code: String,

    /// Regulatory body (e.g., "CDSCO", "FDA", "EMA")
    pub regulatory_body: Option<String>,
    pub regulatory_url: Option<String>,

    /// Effective dates
    pub effective_from: NaiveDate,
    pub effective_to: Option<NaiveDate>,

    /// Primary catalog for region
    pub is_primary: bool,

    /// Status
    pub is_active: bool,

    // Audit fields
    pub request_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub system_id: Option<String>,
    pub version: i64,
}

impl DrugCatalog {
    /// Create a new drug catalog
    pub fn new(
        catalog_code: String,
        catalog_name: String,
        region_id: Uuid,
        country_code: String,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            catalog_code,
            catalog_name,
            catalog_version: None,
            region_id,
            country_code,
            regulatory_body: None,
            regulatory_url: None,
            effective_from: Utc::now().date_naive(),
            effective_to: None,
            is_primary: false,
            is_active: true,
            request_id: audit.request_id,
            created_at: audit.created_at,
            updated_at: audit.updated_at,
            created_by: audit.created_by,
            updated_by: audit.updated_by,
            system_id: audit.system_id,
            version: audit.version,
        }
    }

    /// Check if the catalog is currently effective
    pub fn is_effective(&self) -> bool {
        let today = Utc::now().date_naive();
        self.is_active
            && self.effective_from <= today
            && self.effective_to.map_or(true, |end| today <= end)
    }
}

// =============================================================================
// DRUG SCHEDULE
// =============================================================================

/// Drug schedule (regulatory classification per region)
///
/// Examples:
/// - India: Schedule H, H1, X, G
/// - USA: Schedule I-V (DEA), Rx Only
/// - UK: POM, P, GSL
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrugSchedule {
    pub id: Uuid,

    /// Schedule code (e.g., "H", "H1", "II")
    pub schedule_code: String,

    /// Schedule name (e.g., "Schedule H - Prescription Only")
    pub schedule_name: String,

    /// Schedule type
    pub schedule_type: DrugScheduleType,

    /// Geographic scope
    pub catalog_id: Uuid,
    pub region_id: Uuid,

    /// Schedule rules
    pub description: Option<String>,
    /// Who can prescribe
    pub prescriber_requirements: Option<String>,
    /// Dispensing rules
    pub dispensing_requirements: Option<String>,
    /// How long to keep records
    pub record_keeping_days: Option<i32>,
    /// Whether refills are allowed
    pub refill_allowed: bool,
    /// Maximum number of refills
    pub max_refills: Option<i32>,
    /// Maximum days supply per fill
    pub max_quantity_days: Option<i32>,

    /// Status
    pub is_active: bool,

    // Audit fields
    pub request_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub system_id: Option<String>,
    pub version: i64,
}

impl DrugSchedule {
    /// Create a new drug schedule
    pub fn new(
        schedule_code: String,
        schedule_name: String,
        schedule_type: DrugScheduleType,
        catalog_id: Uuid,
        region_id: Uuid,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            schedule_code,
            schedule_name,
            schedule_type,
            catalog_id,
            region_id,
            description: None,
            prescriber_requirements: None,
            dispensing_requirements: None,
            record_keeping_days: None,
            refill_allowed: true,
            max_refills: None,
            max_quantity_days: None,
            is_active: true,
            request_id: audit.request_id,
            created_at: audit.created_at,
            updated_at: audit.updated_at,
            created_by: audit.created_by,
            updated_by: audit.updated_by,
            system_id: audit.system_id,
            version: audit.version,
        }
    }

    /// Check if this is a controlled substance schedule
    pub fn is_controlled(&self) -> bool {
        matches!(
            self.schedule_type,
            DrugScheduleType::ScheduleX
                | DrugScheduleType::ScheduleI
                | DrugScheduleType::ScheduleII
                | DrugScheduleType::ScheduleIII
                | DrugScheduleType::ScheduleIV
                | DrugScheduleType::ScheduleV
        )
    }

    /// Check if prescription is required
    pub fn requires_prescription(&self) -> bool {
        !matches!(
            self.schedule_type,
            DrugScheduleType::Otc | DrugScheduleType::Unscheduled
        )
    }
}

// =============================================================================
// DRUG (Master)
// =============================================================================

/// Drug from the drug master catalog
///
/// Contains drug definitions with formulation details and regulatory classification.
/// Corresponds to ^PSDRUG (Drug File) in VistA.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Drug {
    pub id: Uuid,

    /// Unique code within catalog
    pub drug_code: String,

    /// International Nonproprietary Name (INN)
    pub generic_name: String,

    /// Array of brand names
    pub brand_names: Vec<String>,

    // Classification
    pub catalog_id: Uuid,
    pub schedule_id: Option<Uuid>,
    /// e.g., "Antibiotic", "Analgesic"
    pub therapeutic_class: Option<String>,
    /// e.g., "Beta-lactam", "NSAID"
    pub pharmacological_class: Option<String>,

    // International coding systems
    /// WHO ATC classification code
    pub atc_code: Option<String>,
    /// RxNorm CUI (US)
    pub rxnorm_code: Option<String>,
    /// National Drug Code (US)
    pub ndc_code: Option<String>,
    /// SNOMED CT code
    pub snomed_code: Option<String>,

    // Drug properties
    pub form: DrugFormType,
    pub route: DrugRoute,
    /// e.g., "500mg", "250mg/5ml"
    pub strength: Option<String>,
    /// e.g., "mg", "ml", "mcg"
    pub strength_unit: Option<String>,
    /// Numeric strength for calculations
    pub strength_value: Option<f64>,

    // Dosing information
    /// e.g., "500mg twice daily"
    pub usual_dose: Option<String>,
    pub max_daily_dose: Option<String>,
    pub pediatric_dose: Option<String>,
    pub geriatric_dose: Option<String>,

    // Special populations
    /// Pregnancy category: A, B, C, D, X
    pub pregnancy_category: Option<String>,
    pub lactation_safe: Option<bool>,
    pub renal_adjustment_required: bool,
    pub hepatic_adjustment_required: bool,

    // Storage & handling
    pub storage_conditions: Option<String>,
    pub shelf_life_months: Option<i32>,
    pub requires_refrigeration: bool,
    pub light_sensitive: bool,

    // Pricing (reference price)
    pub unit_price: Option<f64>,
    /// ISO 4217 currency code
    pub currency_code: Option<String>,
    pub price_effective_date: Option<NaiveDate>,

    // VistA integration
    /// VistA Internal Entry Number
    pub vista_ien: Option<i64>,

    // Status
    /// Whether drug is in formulary
    pub is_formulary: bool,
    pub is_active: bool,

    // Multi-tenant (None for system-wide)
    pub organization_id: Option<Uuid>,

    // Audit fields
    pub request_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub system_id: Option<String>,
    pub version: i64,
    pub deleted_at: Option<DateTime<Utc>>,
    pub deleted_by: Option<Uuid>,
}

impl Drug {
    /// Create a new drug
    pub fn new(
        drug_code: String,
        generic_name: String,
        catalog_id: Uuid,
        form: DrugFormType,
        route: DrugRoute,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            drug_code,
            generic_name,
            brand_names: Vec::new(),
            catalog_id,
            schedule_id: None,
            therapeutic_class: None,
            pharmacological_class: None,
            atc_code: None,
            rxnorm_code: None,
            ndc_code: None,
            snomed_code: None,
            form,
            route,
            strength: None,
            strength_unit: None,
            strength_value: None,
            usual_dose: None,
            max_daily_dose: None,
            pediatric_dose: None,
            geriatric_dose: None,
            pregnancy_category: None,
            lactation_safe: None,
            renal_adjustment_required: false,
            hepatic_adjustment_required: false,
            storage_conditions: None,
            shelf_life_months: None,
            requires_refrigeration: false,
            light_sensitive: false,
            unit_price: None,
            currency_code: None,
            price_effective_date: None,
            vista_ien: None,
            is_formulary: true,
            is_active: true,
            organization_id: None,
            request_id: audit.request_id,
            created_at: audit.created_at,
            updated_at: audit.updated_at,
            created_by: audit.created_by,
            updated_by: audit.updated_by,
            system_id: audit.system_id,
            version: audit.version,
            deleted_at: None,
            deleted_by: None,
        }
    }

    /// Get display name (generic name + strength)
    pub fn display_name(&self) -> String {
        match &self.strength {
            Some(s) => format!("{} {}", self.generic_name, s),
            None => self.generic_name.clone(),
        }
    }

    /// Get full display (generic + form + route)
    pub fn full_display(&self) -> String {
        format!("{} {:?} ({:?})", self.display_name(), self.form, self.route)
    }

    /// Check if drug is safe for pregnancy (category A or B)
    pub fn is_pregnancy_safe(&self) -> bool {
        matches!(
            self.pregnancy_category.as_deref(),
            Some("A") | Some("B")
        )
    }

    /// Check if drug requires dose adjustment
    pub fn requires_dose_adjustment(&self) -> bool {
        self.renal_adjustment_required || self.hepatic_adjustment_required
    }

    /// Soft delete the drug
    pub fn soft_delete(&mut self, deleted_by: Option<Uuid>) {
        self.deleted_at = Some(Utc::now());
        self.deleted_by = deleted_by;
        self.is_active = false;
        self.updated_at = Utc::now();
    }

    /// Check if drug is deleted
    pub fn is_deleted(&self) -> bool {
        self.deleted_at.is_some()
    }
}
