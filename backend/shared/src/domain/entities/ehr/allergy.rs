//! EHR Allergy Entity
//!
//! Corresponds to VistA File #120.8 (^GMR) - Patient Allergies

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::shared::AuditFields;

/// Allergy type
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum AllergyType {
    #[serde(rename = "drug")]
    Drug,
    #[serde(rename = "food")]
    Food,
    #[serde(rename = "environmental")]
    Environmental,
    #[serde(rename = "other")]
    Other,
}

impl Default for AllergyType {
    fn default() -> Self {
        AllergyType::Other
    }
}

/// Allergy severity
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum AllergySeverity {
    #[serde(rename = "mild")]
    Mild,
    #[serde(rename = "moderate")]
    Moderate,
    #[serde(rename = "severe")]
    Severe,
    #[serde(rename = "unknown")]
    Unknown,
}

impl Default for AllergySeverity {
    fn default() -> Self {
        AllergySeverity::Unknown
    }
}

/// Allergy status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum AllergyStatus {
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "inactive")]
    Inactive,
    #[serde(rename = "entered_in_error")]
    EnteredInError,
}

impl Default for AllergyStatus {
    fn default() -> Self {
        AllergyStatus::Active
    }
}

/// EHR Allergy Entity
///
/// Represents a patient allergy/adverse reaction.
/// Corresponds to VistA File #120.8 (^GMR - Allergies).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EhrAllergy {
    pub id: Uuid,

    /// Internal Entry Number (VistA IEN)
    pub ien: i64,

    /// Organization (multi-tenant)
    pub organization_id: Uuid,

    /// Patient ID
    pub patient_id: Uuid,

    /// Allergen name
    pub allergen: String,

    /// Allergy type (drug, food, environmental)
    pub allergy_type: AllergyType,

    /// Severity
    pub severity: AllergySeverity,

    /// Status
    pub status: AllergyStatus,

    /// Reactions (comma-separated or JSON array)
    pub reactions: Option<String>,

    /// Reaction date (when first noticed)
    pub reaction_date: Option<NaiveDate>,

    /// Verified by provider
    pub verified: bool,

    /// Verifying provider ID
    pub verified_by: Option<Uuid>,

    /// Verification date
    pub verified_date: Option<DateTime<Utc>>,

    /// Source of information (patient, family, chart)
    pub source: Option<String>,

    /// Comments/notes
    pub comments: Option<String>,

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

impl EhrAllergy {
    /// Create a new allergy
    pub fn new(
        organization_id: Uuid,
        patient_id: Uuid,
        allergen: String,
        allergy_type: AllergyType,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            ien: 0,
            organization_id,
            patient_id,
            allergen,
            allergy_type,
            severity: AllergySeverity::Unknown,
            status: AllergyStatus::Active,
            reactions: None,
            reaction_date: None,
            verified: false,
            verified_by: None,
            verified_date: None,
            source: None,
            comments: None,
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

    /// Verify the allergy
    pub fn verify(&mut self, provider_id: Uuid) {
        self.verified = true;
        self.verified_by = Some(provider_id);
        self.verified_date = Some(Utc::now());
        self.updated_at = Utc::now();
    }

    /// Mark as entered in error
    pub fn mark_entered_in_error(&mut self) {
        self.status = AllergyStatus::EnteredInError;
        self.updated_at = Utc::now();
    }

    /// Inactivate the allergy
    pub fn inactivate(&mut self) {
        self.status = AllergyStatus::Inactive;
        self.updated_at = Utc::now();
    }

    /// Check if this is a drug allergy
    pub fn is_drug_allergy(&self) -> bool {
        self.allergy_type == AllergyType::Drug
    }

    /// Get reactions as a vector
    pub fn reactions_list(&self) -> Vec<String> {
        self.reactions
            .as_ref()
            .map(|r| r.split(',').map(|s| s.trim().to_string()).collect())
            .unwrap_or_default()
    }

    /// Display string with severity
    pub fn display_with_severity(&self) -> String {
        format!("{} ({:?})", self.allergen, self.severity)
    }
}
