//! EHR Lab Result Entity
//!
//! Corresponds to VistA File #63 (^LR) - Lab Results

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::shared::AuditFields;

/// Lab result status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum LabStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "preliminary")]
    Preliminary,
    #[serde(rename = "final")]
    Final,
    #[serde(rename = "corrected")]
    Corrected,
    #[serde(rename = "cancelled")]
    Cancelled,
}

impl Default for LabStatus {
    fn default() -> Self {
        LabStatus::Pending
    }
}

/// Abnormality flag
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum AbnormalFlag {
    #[serde(rename = "normal")]
    Normal,
    #[serde(rename = "low")]
    Low,
    #[serde(rename = "high")]
    High,
    #[serde(rename = "critical_low")]
    CriticalLow,
    #[serde(rename = "critical_high")]
    CriticalHigh,
    #[serde(rename = "abnormal")]
    Abnormal,
}

impl Default for AbnormalFlag {
    fn default() -> Self {
        AbnormalFlag::Normal
    }
}

/// EHR Lab Result Entity
///
/// Represents a laboratory test result.
/// Corresponds to VistA File #63 (^LR - Lab Results).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EhrLabResult {
    pub id: Uuid,

    /// Internal Entry Number (VistA IEN)
    pub ien: i64,

    /// Organization (multi-tenant)
    pub organization_id: Uuid,

    /// Patient ID
    pub patient_id: Uuid,

    /// Visit when ordered
    pub visit_id: Option<Uuid>,

    /// Order ID (if from order entry)
    pub order_id: Option<Uuid>,

    /// LOINC code
    pub loinc_code: Option<String>,

    /// Test name
    pub test_name: String,

    /// Test category (chemistry, hematology, etc.)
    pub category: Option<String>,

    /// Result value (as string for flexibility)
    pub result_value: Option<String>,

    /// Numeric value (if applicable)
    pub numeric_value: Option<f64>,

    /// Unit of measure
    pub unit: Option<String>,

    /// Reference range (e.g., "70-100")
    pub reference_range: Option<String>,

    /// Reference range low
    pub reference_low: Option<f64>,

    /// Reference range high
    pub reference_high: Option<f64>,

    /// Status
    pub status: LabStatus,

    /// Abnormality flag
    pub abnormal_flag: AbnormalFlag,

    /// Specimen type (blood, urine, etc.)
    pub specimen_type: Option<String>,

    /// Collection datetime
    pub collection_datetime: Option<DateTime<Utc>>,

    /// Received datetime
    pub received_datetime: Option<DateTime<Utc>>,

    /// Result datetime
    pub result_datetime: Option<DateTime<Utc>>,

    /// Performing lab
    pub performing_lab: Option<String>,

    /// Ordering provider
    pub ordering_provider_id: Option<Uuid>,

    /// Comments
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

impl EhrLabResult {
    /// Create a new lab result
    pub fn new(
        organization_id: Uuid,
        patient_id: Uuid,
        test_name: String,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            ien: 0,
            organization_id,
            patient_id,
            visit_id: None,
            order_id: None,
            loinc_code: None,
            test_name,
            category: None,
            result_value: None,
            numeric_value: None,
            unit: None,
            reference_range: None,
            reference_low: None,
            reference_high: None,
            status: LabStatus::Pending,
            abnormal_flag: AbnormalFlag::Normal,
            specimen_type: None,
            collection_datetime: None,
            received_datetime: None,
            result_datetime: None,
            performing_lab: None,
            ordering_provider_id: None,
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

    /// Set the result with automatic abnormal flag detection
    pub fn set_result(&mut self, value: f64, unit: String) {
        self.numeric_value = Some(value);
        self.result_value = Some(value.to_string());
        self.unit = Some(unit);
        self.result_datetime = Some(Utc::now());
        self.status = LabStatus::Final;

        // Determine abnormal flag if reference range is set
        self.abnormal_flag = self.calculate_abnormal_flag(value);
        self.updated_at = Utc::now();
    }

    /// Calculate abnormal flag based on reference range
    fn calculate_abnormal_flag(&self, value: f64) -> AbnormalFlag {
        match (self.reference_low, self.reference_high) {
            (Some(low), Some(high)) => {
                // Critical ranges (typically 1.5x the normal range)
                let critical_low = low - (high - low) * 0.5;
                let critical_high = high + (high - low) * 0.5;

                if value < critical_low {
                    AbnormalFlag::CriticalLow
                } else if value > critical_high {
                    AbnormalFlag::CriticalHigh
                } else if value < low {
                    AbnormalFlag::Low
                } else if value > high {
                    AbnormalFlag::High
                } else {
                    AbnormalFlag::Normal
                }
            }
            (Some(low), None) => {
                if value < low {
                    AbnormalFlag::Low
                } else {
                    AbnormalFlag::Normal
                }
            }
            (None, Some(high)) => {
                if value > high {
                    AbnormalFlag::High
                } else {
                    AbnormalFlag::Normal
                }
            }
            _ => AbnormalFlag::Normal,
        }
    }

    /// Check if result is critical
    pub fn is_critical(&self) -> bool {
        matches!(
            self.abnormal_flag,
            AbnormalFlag::CriticalLow | AbnormalFlag::CriticalHigh
        )
    }

    /// Check if result is abnormal
    pub fn is_abnormal(&self) -> bool {
        !matches!(self.abnormal_flag, AbnormalFlag::Normal)
    }

    /// Get display value with unit
    pub fn display_value(&self) -> String {
        let value = self.result_value.as_deref().unwrap_or("-");
        if let Some(ref unit) = self.unit {
            format!("{} {}", value, unit)
        } else {
            value.to_string()
        }
    }

    /// Get display with reference range
    pub fn display_with_range(&self) -> String {
        let mut display = self.display_value();
        if let Some(ref range) = self.reference_range {
            display.push_str(&format!(" (ref: {})", range));
        }
        display
    }
}
