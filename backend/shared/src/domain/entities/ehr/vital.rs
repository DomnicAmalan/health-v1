//! EHR Vital Signs Entity
//!
//! Corresponds to VistA File #120.5 (^GMR) - Vital Signs

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::shared::AuditFields;

/// Vital sign type with LOINC codes
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "snake_case")]
pub enum VitalType {
    /// Blood pressure (systolic/diastolic) - LOINC 85354-9
    #[serde(rename = "blood_pressure")]
    BloodPressure,
    /// Heart rate/Pulse - LOINC 8867-4
    #[serde(rename = "heart_rate")]
    HeartRate,
    /// Temperature - LOINC 8310-5
    #[serde(rename = "temperature")]
    Temperature,
    /// Respiratory rate - LOINC 9279-1
    #[serde(rename = "respiratory_rate")]
    RespiratoryRate,
    /// Oxygen saturation - LOINC 2708-6
    #[serde(rename = "oxygen_saturation")]
    OxygenSaturation,
    /// Height - LOINC 8302-2
    #[serde(rename = "height")]
    Height,
    /// Weight - LOINC 29463-7
    #[serde(rename = "weight")]
    Weight,
    /// BMI - LOINC 39156-5
    #[serde(rename = "bmi")]
    BMI,
    /// Pain level - LOINC 72514-3
    #[serde(rename = "pain")]
    Pain,
}

impl VitalType {
    /// Get LOINC code for this vital type
    pub fn loinc_code(&self) -> &'static str {
        match self {
            VitalType::BloodPressure => "85354-9",
            VitalType::HeartRate => "8867-4",
            VitalType::Temperature => "8310-5",
            VitalType::RespiratoryRate => "9279-1",
            VitalType::OxygenSaturation => "2708-6",
            VitalType::Height => "8302-2",
            VitalType::Weight => "29463-7",
            VitalType::BMI => "39156-5",
            VitalType::Pain => "72514-3",
        }
    }

    /// Get standard unit for this vital type
    pub fn standard_unit(&self) -> &'static str {
        match self {
            VitalType::BloodPressure => "mmHg",
            VitalType::HeartRate => "bpm",
            VitalType::Temperature => "°F",
            VitalType::RespiratoryRate => "/min",
            VitalType::OxygenSaturation => "%",
            VitalType::Height => "in",
            VitalType::Weight => "lb",
            VitalType::BMI => "kg/m²",
            VitalType::Pain => "/10",
        }
    }

    /// Get display name
    pub fn display_name(&self) -> &'static str {
        match self {
            VitalType::BloodPressure => "Blood Pressure",
            VitalType::HeartRate => "Heart Rate",
            VitalType::Temperature => "Temperature",
            VitalType::RespiratoryRate => "Respiratory Rate",
            VitalType::OxygenSaturation => "O2 Saturation",
            VitalType::Height => "Height",
            VitalType::Weight => "Weight",
            VitalType::BMI => "BMI",
            VitalType::Pain => "Pain Level",
        }
    }
}

/// EHR Vital Signs Entity
///
/// Represents a single vital sign measurement.
/// Corresponds to VistA File #120.5 (^GMR - Vitals).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EhrVital {
    pub id: Uuid,

    /// Internal Entry Number (VistA IEN)
    pub ien: i64,

    /// Organization (multi-tenant)
    pub organization_id: Uuid,

    /// Patient ID
    pub patient_id: Uuid,

    /// Visit when recorded
    pub visit_id: Option<Uuid>,

    /// Vital type
    pub vital_type: VitalType,

    /// LOINC code
    pub loinc_code: String,

    /// Primary value (e.g., systolic BP, or single value)
    pub value: f64,

    /// Secondary value (e.g., diastolic BP)
    pub value2: Option<f64>,

    /// Unit of measure
    pub unit: String,

    /// Date/time of measurement
    pub measurement_datetime: DateTime<Utc>,

    /// Recording provider/nurse
    pub recorded_by: Option<Uuid>,

    /// Location where taken
    pub location: Option<String>,

    /// Method/device used
    pub method: Option<String>,

    /// Position (sitting, standing, lying)
    pub position: Option<String>,

    /// Comments
    pub comments: Option<String>,

    /// Abnormal flag (L=Low, H=High, N=Normal)
    pub abnormal_flag: Option<String>,

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

impl EhrVital {
    /// Create a new vital sign measurement
    pub fn new(
        organization_id: Uuid,
        patient_id: Uuid,
        vital_type: VitalType,
        value: f64,
    ) -> Self {
        let audit = AuditFields::new();
        let loinc = vital_type.loinc_code().to_string();
        let unit = vital_type.standard_unit().to_string();

        Self {
            id: Uuid::new_v4(),
            ien: 0,
            organization_id,
            patient_id,
            visit_id: None,
            vital_type,
            loinc_code: loinc,
            value,
            value2: None,
            unit,
            measurement_datetime: Utc::now(),
            recorded_by: None,
            location: None,
            method: None,
            position: None,
            comments: None,
            abnormal_flag: None,
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

    /// Create blood pressure reading
    pub fn blood_pressure(
        organization_id: Uuid,
        patient_id: Uuid,
        systolic: f64,
        diastolic: f64,
    ) -> Self {
        let mut vital = Self::new(organization_id, patient_id, VitalType::BloodPressure, systolic);
        vital.value2 = Some(diastolic);
        vital
    }

    /// Get display value (formatted)
    pub fn display_value(&self) -> String {
        match self.vital_type {
            VitalType::BloodPressure => {
                if let Some(diastolic) = self.value2 {
                    format!("{:.0}/{:.0} {}", self.value, diastolic, self.unit)
                } else {
                    format!("{:.0} {}", self.value, self.unit)
                }
            }
            VitalType::Temperature => format!("{:.1} {}", self.value, self.unit),
            VitalType::BMI => format!("{:.1} {}", self.value, self.unit),
            _ => format!("{:.0} {}", self.value, self.unit),
        }
    }

    /// Check if value is abnormal (basic logic - should be expanded for clinical use)
    pub fn is_abnormal(&self) -> bool {
        match self.vital_type {
            VitalType::HeartRate => self.value < 60.0 || self.value > 100.0,
            VitalType::Temperature => self.value < 97.0 || self.value > 99.5,
            VitalType::RespiratoryRate => self.value < 12.0 || self.value > 20.0,
            VitalType::OxygenSaturation => self.value < 95.0,
            VitalType::BloodPressure => {
                let diastolic = self.value2.unwrap_or(80.0);
                self.value > 140.0 || self.value < 90.0 || diastolic > 90.0 || diastolic < 60.0
            }
            VitalType::Pain => self.value >= 7.0,
            _ => false,
        }
    }
}
