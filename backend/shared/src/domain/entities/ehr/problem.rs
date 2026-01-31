//! EHR Problem List Entity
//!
//! Corresponds to VistA File #9000011 (^AUPNPROB) - Problem List

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::shared::AuditFields;

/// Problem status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum ProblemStatus {
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "inactive")]
    Inactive,
    #[serde(rename = "resolved")]
    Resolved,
}

impl Default for ProblemStatus {
    fn default() -> Self {
        ProblemStatus::Active
    }
}

/// Problem acuity (chronic vs acute)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum ProblemAcuity {
    #[serde(rename = "acute")]
    Acute,
    #[serde(rename = "chronic")]
    Chronic,
}

impl Default for ProblemAcuity {
    fn default() -> Self {
        ProblemAcuity::Chronic
    }
}

/// EHR Problem Entity
///
/// Represents a diagnosis/condition on the patient's problem list.
/// Corresponds to VistA File #9000011 (^AUPNPROB - Problem).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EhrProblem {
    pub id: Uuid,

    /// Internal Entry Number (VistA IEN)
    pub ien: i64,

    /// Organization (multi-tenant)
    pub organization_id: Uuid,

    /// Patient ID (FK to ehr_patients)
    pub patient_id: Uuid,

    /// Visit when problem was documented (optional)
    pub visit_id: Option<Uuid>,

    /// ICD-10 diagnosis code
    pub icd10_code: Option<String>,

    /// SNOMED CT code
    pub snomed_code: Option<String>,

    /// Problem description (free text)
    pub description: String,

    /// Problem status (active, inactive, resolved)
    pub status: ProblemStatus,

    /// Acuity (acute vs chronic)
    pub acuity: ProblemAcuity,

    /// Date of onset
    pub onset_date: Option<NaiveDate>,

    /// Date resolved
    pub resolved_date: Option<NaiveDate>,

    /// Priority/severity (1=high, 2=medium, 3=low)
    pub priority: Option<i32>,

    /// Responsible provider
    pub provider_id: Option<Uuid>,

    /// Clinical notes about the problem
    pub notes: Option<String>,

    /// MUMPS global data (for flexible storage)
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

impl EhrProblem {
    /// Create a new problem
    pub fn new(
        organization_id: Uuid,
        patient_id: Uuid,
        description: String,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            ien: 0,
            organization_id,
            patient_id,
            visit_id: None,
            icd10_code: None,
            snomed_code: None,
            description,
            status: ProblemStatus::Active,
            acuity: ProblemAcuity::Chronic,
            onset_date: None,
            resolved_date: None,
            priority: None,
            provider_id: None,
            notes: None,
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

    /// Create with ICD-10 code
    pub fn with_icd10(mut self, code: String, description: String) -> Self {
        self.icd10_code = Some(code);
        self.description = description;
        self
    }

    /// Mark problem as resolved
    pub fn resolve(&mut self) {
        self.status = ProblemStatus::Resolved;
        self.resolved_date = Some(Utc::now().date_naive());
        self.updated_at = Utc::now();
    }

    /// Mark problem as inactive
    pub fn inactivate(&mut self) {
        self.status = ProblemStatus::Inactive;
        self.updated_at = Utc::now();
    }

    /// Reactivate a resolved/inactive problem
    pub fn reactivate(&mut self) {
        self.status = ProblemStatus::Active;
        self.resolved_date = None;
        self.updated_at = Utc::now();
    }

    /// Get display string with code
    pub fn display_with_code(&self) -> String {
        if let Some(ref code) = self.icd10_code {
            format!("{} ({})", self.description, code)
        } else {
            self.description.clone()
        }
    }

    /// Duration of problem in days (from onset)
    pub fn duration_days(&self) -> Option<i64> {
        self.onset_date.map(|onset| {
            let end = self.resolved_date.unwrap_or_else(|| Utc::now().date_naive());
            (end - onset).num_days()
        })
    }
}
