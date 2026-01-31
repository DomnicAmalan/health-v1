//! EHR Medication Entity
//!
//! Corresponds to VistA File #52 (^PS) - Pharmacy/Prescriptions

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::shared::AuditFields;

/// Medication status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum MedicationStatus {
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "discontinued")]
    Discontinued,
    #[serde(rename = "on_hold")]
    OnHold,
    #[serde(rename = "cancelled")]
    Cancelled,
}

impl Default for MedicationStatus {
    fn default() -> Self {
        MedicationStatus::Active
    }
}

/// Medication type
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum MedicationType {
    #[serde(rename = "outpatient")]
    Outpatient,
    #[serde(rename = "inpatient")]
    Inpatient,
    #[serde(rename = "iv")]
    IV,
    #[serde(rename = "prn")]
    PRN,
}

impl Default for MedicationType {
    fn default() -> Self {
        MedicationType::Outpatient
    }
}

/// EHR Medication Entity
///
/// Represents a medication prescription/order.
/// Corresponds to VistA File #52 (^PS - Pharmacy).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EhrMedication {
    pub id: Uuid,

    /// Internal Entry Number (VistA IEN)
    pub ien: i64,

    /// Organization (multi-tenant)
    pub organization_id: Uuid,

    /// Patient ID
    pub patient_id: Uuid,

    /// Visit when ordered (optional)
    pub visit_id: Option<Uuid>,

    /// RxNorm code
    pub rxnorm_code: Option<String>,

    /// NDC code
    pub ndc_code: Option<String>,

    /// Drug name (generic)
    pub drug_name: String,

    /// Brand name (if applicable)
    pub brand_name: Option<String>,

    /// Dosage (e.g., "500mg")
    pub dosage: String,

    /// Dosage form (tablet, capsule, liquid, etc.)
    pub dosage_form: Option<String>,

    /// Route (oral, IV, topical, etc.)
    pub route: Option<String>,

    /// Frequency (e.g., "BID", "Q8H", "Daily")
    pub frequency: String,

    /// SIG (complete directions)
    pub sig: String,

    /// Quantity dispensed
    pub quantity: Option<i32>,

    /// Days supply
    pub days_supply: Option<i32>,

    /// Refills remaining
    pub refills_remaining: Option<i32>,

    /// Status
    pub status: MedicationStatus,

    /// Medication type
    pub medication_type: MedicationType,

    /// Start date
    pub start_date: NaiveDate,

    /// End date
    pub end_date: Option<NaiveDate>,

    /// Discontinue date
    pub discontinued_date: Option<NaiveDate>,

    /// Discontinue reason
    pub discontinued_reason: Option<String>,

    /// Prescribing provider
    pub prescriber_id: Option<Uuid>,

    /// Pharmacy (if filled)
    pub pharmacy: Option<String>,

    /// Instructions/notes
    pub instructions: Option<String>,

    /// MUMPS global data
    pub mumps_data: Option<JsonValue>,

    // Audit fields
    pub request_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub system_id: Option<String>,
    pub version: i64,
}

impl EhrMedication {
    /// Create a new medication
    pub fn new(
        organization_id: Uuid,
        patient_id: Uuid,
        drug_name: String,
        dosage: String,
        frequency: String,
        sig: String,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            ien: 0,
            organization_id,
            patient_id,
            visit_id: None,
            rxnorm_code: None,
            ndc_code: None,
            drug_name,
            brand_name: None,
            dosage,
            dosage_form: None,
            route: Some("oral".to_string()),
            frequency,
            sig,
            quantity: None,
            days_supply: None,
            refills_remaining: None,
            status: MedicationStatus::Active,
            medication_type: MedicationType::Outpatient,
            start_date: Utc::now().date_naive(),
            end_date: None,
            discontinued_date: None,
            discontinued_reason: None,
            prescriber_id: None,
            pharmacy: None,
            instructions: None,
            mumps_data: None,
            request_id: audit.request_id,
            created_at: audit.created_at,
            updated_at: audit.updated_at,
            created_by: audit.created_by,
            updated_by: audit.updated_by,
            system_id: audit.system_id,
            version: audit.version,
        }
    }

    /// Discontinue the medication
    pub fn discontinue(&mut self, reason: Option<String>) {
        self.status = MedicationStatus::Discontinued;
        self.discontinued_date = Some(Utc::now().date_naive());
        self.discontinued_reason = reason;
        self.updated_at = Utc::now();
    }

    /// Put medication on hold
    pub fn hold(&mut self) {
        self.status = MedicationStatus::OnHold;
        self.updated_at = Utc::now();
    }

    /// Resume a held medication
    pub fn resume(&mut self) {
        self.status = MedicationStatus::Active;
        self.updated_at = Utc::now();
    }

    /// Check if medication is currently active
    pub fn is_active(&self) -> bool {
        self.status == MedicationStatus::Active
    }

    /// Get display string (drug + dosage)
    pub fn display_name(&self) -> String {
        format!("{} {}", self.drug_name, self.dosage)
    }

    /// Get full prescription display
    pub fn full_display(&self) -> String {
        format!("{} {} - {}", self.drug_name, self.dosage, self.sig)
    }
}
