//! EHR Patient Entity
//!
//! Corresponds to VistA File #2 (^DPT) - Patient Demographics

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::shared::AuditFields;

/// Patient gender options
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum Gender {
    #[serde(rename = "male")]
    Male,
    #[serde(rename = "female")]
    Female,
    #[serde(rename = "other")]
    Other,
    #[serde(rename = "unknown")]
    Unknown,
}

impl Default for Gender {
    fn default() -> Self {
        Gender::Unknown
    }
}

/// Patient status in the system
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum PatientStatus {
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "inactive")]
    Inactive,
    #[serde(rename = "deceased")]
    Deceased,
}

impl Default for PatientStatus {
    fn default() -> Self {
        PatientStatus::Active
    }
}

/// EHR Patient Entity
///
/// Represents a patient record in the EHR system.
/// Corresponds to VistA File #2 (^DPT - Patient).
///
/// # VistA FileMan Fields
/// - .01 - Name (NAME)
/// - .02 - Sex (SEX)
/// - .03 - Date of Birth (DOB)
/// - .09 - Social Security Number (SSN)
/// - .131 - Street Address Line 1
/// - .132 - Street Address Line 2
/// - .114 - City
/// - .115 - State
/// - .116 - Zip Code
/// - .131 - Phone Number (Residence)
/// - .132 - Phone Number (Work)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EhrPatient {
    pub id: Uuid,

    /// Internal Entry Number (VistA IEN)
    pub ien: i64,

    /// Organization (multi-tenant)
    pub organization_id: Uuid,

    // Name fields
    pub last_name: String,
    pub first_name: String,
    pub middle_name: Option<String>,
    pub suffix: Option<String>,
    pub preferred_name: Option<String>,

    // Demographics
    pub date_of_birth: NaiveDate,
    pub gender: Gender,
    pub ssn_last_four: Option<String>,

    /// Medical Record Number (MRN)
    pub mrn: String,

    // Contact information
    pub email: Option<String>,
    pub phone_home: Option<String>,
    pub phone_mobile: Option<String>,
    pub phone_work: Option<String>,

    // Address
    pub address_line1: Option<String>,
    pub address_line2: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,

    // Emergency contact
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub emergency_contact_relationship: Option<String>,

    // Insurance (primary)
    pub insurance_carrier: Option<String>,
    pub insurance_policy_number: Option<String>,
    pub insurance_group_number: Option<String>,

    // Status
    pub status: PatientStatus,
    pub deceased_date: Option<NaiveDate>,

    // Primary care
    pub primary_provider_id: Option<Uuid>,
    pub primary_location_id: Option<Uuid>,

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

impl EhrPatient {
    /// Create a new patient with required fields
    pub fn new(
        organization_id: Uuid,
        last_name: String,
        first_name: String,
        date_of_birth: NaiveDate,
        gender: Gender,
        mrn: String,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            ien: 0, // Will be set by database
            organization_id,
            last_name,
            first_name,
            middle_name: None,
            suffix: None,
            preferred_name: None,
            date_of_birth,
            gender,
            ssn_last_four: None,
            mrn,
            email: None,
            phone_home: None,
            phone_mobile: None,
            phone_work: None,
            address_line1: None,
            address_line2: None,
            city: None,
            state: None,
            zip_code: None,
            country: None,
            emergency_contact_name: None,
            emergency_contact_phone: None,
            emergency_contact_relationship: None,
            insurance_carrier: None,
            insurance_policy_number: None,
            insurance_group_number: None,
            status: PatientStatus::Active,
            deceased_date: None,
            primary_provider_id: None,
            primary_location_id: None,
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

    /// Get full name as "Last, First Middle Suffix"
    pub fn full_name(&self) -> String {
        let mut name = format!("{}, {}", self.last_name, self.first_name);
        if let Some(ref middle) = self.middle_name {
            name.push(' ');
            name.push_str(middle);
        }
        if let Some(ref suffix) = self.suffix {
            name.push(' ');
            name.push_str(suffix);
        }
        name
    }

    /// Get display name (preferred or first)
    pub fn display_name(&self) -> String {
        self.preferred_name.as_ref()
            .unwrap_or(&self.first_name)
            .clone()
    }

    /// Calculate age from date of birth
    pub fn age(&self) -> i32 {
        let today = Utc::now().date_naive();
        let mut age = today.year() - self.date_of_birth.year();

        if today.ordinal() < self.date_of_birth.ordinal() {
            age -= 1;
        }

        age
    }

    /// Check if patient is deceased
    pub fn is_deceased(&self) -> bool {
        self.status == PatientStatus::Deceased || self.deceased_date.is_some()
    }

    /// Get formatted address
    pub fn formatted_address(&self) -> Option<String> {
        let mut parts = Vec::new();

        if let Some(ref line1) = self.address_line1 {
            parts.push(line1.clone());
        }
        if let Some(ref line2) = self.address_line2 {
            parts.push(line2.clone());
        }

        let mut city_state_zip = Vec::new();
        if let Some(ref city) = self.city {
            city_state_zip.push(city.clone());
        }
        if let Some(ref state) = self.state {
            city_state_zip.push(state.clone());
        }
        if let Some(ref zip) = self.zip_code {
            city_state_zip.push(zip.clone());
        }

        if !city_state_zip.is_empty() {
            parts.push(city_state_zip.join(", "));
        }

        if parts.is_empty() {
            None
        } else {
            Some(parts.join("\n"))
        }
    }

    /// VistA-style patient name format (LAST,FIRST MI)
    pub fn vista_name(&self) -> String {
        let mut name = format!("{},{}", self.last_name.to_uppercase(), self.first_name.to_uppercase());
        if let Some(ref middle) = self.middle_name {
            if !middle.is_empty() {
                name.push(' ');
                name.push(middle.chars().next().unwrap_or(' '));
            }
        }
        name
    }
}

use chrono::Datelike;
