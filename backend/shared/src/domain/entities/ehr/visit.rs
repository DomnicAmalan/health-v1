//! EHR Visit/Encounter Entity
//!
//! Corresponds to VistA File #9000010 (^AUPNVSIT) - Visit/Encounter

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::shared::AuditFields;

/// Visit type classification
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum VisitType {
    #[serde(rename = "outpatient")]
    Outpatient,
    #[serde(rename = "inpatient")]
    Inpatient,
    #[serde(rename = "emergency")]
    Emergency,
    #[serde(rename = "telehealth")]
    Telehealth,
    #[serde(rename = "home")]
    Home,
    #[serde(rename = "observation")]
    Observation,
}

impl Default for VisitType {
    fn default() -> Self {
        VisitType::Outpatient
    }
}

/// Visit status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum VisitStatus {
    #[serde(rename = "scheduled")]
    Scheduled,
    #[serde(rename = "checked_in")]
    CheckedIn,
    #[serde(rename = "in_progress")]
    InProgress,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "cancelled")]
    Cancelled,
    #[serde(rename = "no_show")]
    NoShow,
}

impl Default for VisitStatus {
    fn default() -> Self {
        VisitStatus::Scheduled
    }
}

/// EHR Visit Entity
///
/// Represents a patient encounter/visit in the EHR system.
/// Corresponds to VistA File #9000010 (^AUPNVSIT - Visit).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EhrVisit {
    pub id: Uuid,

    /// Internal Entry Number (VistA IEN)
    pub ien: i64,

    /// Organization (multi-tenant)
    pub organization_id: Uuid,

    /// Patient ID (FK to ehr_patients)
    pub patient_id: Uuid,

    /// Visit type (outpatient, inpatient, etc.)
    pub visit_type: VisitType,

    /// Visit status
    pub status: VisitStatus,

    /// Visit date/time
    pub visit_datetime: DateTime<Utc>,

    /// Check-in time
    pub check_in_time: Option<DateTime<Utc>>,

    /// Check-out time
    pub check_out_time: Option<DateTime<Utc>>,

    /// Location (clinic, hospital, etc.)
    pub location_id: Option<Uuid>,
    pub location_name: Option<String>,

    /// Primary provider
    pub provider_id: Option<Uuid>,
    pub provider_name: Option<String>,

    /// Chief complaint
    pub chief_complaint: Option<String>,

    /// Reason for visit (CPT E/M level or custom)
    pub reason_for_visit: Option<String>,

    /// Service category (medicine, surgery, etc.)
    pub service_category: Option<String>,

    /// Disposition (discharged, admitted, transferred)
    pub disposition: Option<String>,

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

impl EhrVisit {
    /// Create a new visit
    pub fn new(
        organization_id: Uuid,
        patient_id: Uuid,
        visit_type: VisitType,
        visit_datetime: DateTime<Utc>,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            ien: 0,
            organization_id,
            patient_id,
            visit_type,
            status: VisitStatus::Scheduled,
            visit_datetime,
            check_in_time: None,
            check_out_time: None,
            location_id: None,
            location_name: None,
            provider_id: None,
            provider_name: None,
            chief_complaint: None,
            reason_for_visit: None,
            service_category: None,
            disposition: None,
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

    /// Check in the patient
    pub fn check_in(&mut self) {
        self.status = VisitStatus::CheckedIn;
        self.check_in_time = Some(Utc::now());
        self.updated_at = Utc::now();
    }

    /// Start the visit
    pub fn start(&mut self) {
        self.status = VisitStatus::InProgress;
        self.updated_at = Utc::now();
    }

    /// Complete the visit
    pub fn complete(&mut self, disposition: Option<String>) {
        self.status = VisitStatus::Completed;
        self.check_out_time = Some(Utc::now());
        self.disposition = disposition;
        self.updated_at = Utc::now();
    }

    /// Cancel the visit
    pub fn cancel(&mut self) {
        self.status = VisitStatus::Cancelled;
        self.updated_at = Utc::now();
    }

    /// Mark as no-show
    pub fn mark_no_show(&mut self) {
        self.status = VisitStatus::NoShow;
        self.updated_at = Utc::now();
    }

    /// Check if visit is active (can be modified)
    pub fn is_active(&self) -> bool {
        matches!(
            self.status,
            VisitStatus::Scheduled | VisitStatus::CheckedIn | VisitStatus::InProgress
        )
    }

    /// Get visit duration in minutes (if completed)
    pub fn duration_minutes(&self) -> Option<i64> {
        match (self.check_in_time, self.check_out_time) {
            (Some(start), Some(end)) => {
                Some((end - start).num_minutes())
            }
            _ => None,
        }
    }
}
