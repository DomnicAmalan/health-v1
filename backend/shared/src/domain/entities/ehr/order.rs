//! EHR Order Entry Entity
//!
//! Corresponds to VistA File #100 (^OR) - Orders (CPRS-style)

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::shared::AuditFields;

/// Order type/category
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum OrderType {
    #[serde(rename = "lab")]
    Lab,
    #[serde(rename = "radiology")]
    Radiology,
    #[serde(rename = "medication")]
    Medication,
    #[serde(rename = "consult")]
    Consult,
    #[serde(rename = "procedure")]
    Procedure,
    #[serde(rename = "diet")]
    Diet,
    #[serde(rename = "nursing")]
    Nursing,
    #[serde(rename = "activity")]
    Activity,
    #[serde(rename = "other")]
    Other,
}

impl Default for OrderType {
    fn default() -> Self {
        OrderType::Other
    }
}

/// Order status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum OrderStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "discontinued")]
    Discontinued,
    #[serde(rename = "cancelled")]
    Cancelled,
    #[serde(rename = "expired")]
    Expired,
    #[serde(rename = "held")]
    Held,
}

impl Default for OrderStatus {
    fn default() -> Self {
        OrderStatus::Pending
    }
}

/// Order urgency
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum OrderUrgency {
    #[serde(rename = "stat")]
    Stat,
    #[serde(rename = "asap")]
    ASAP,
    #[serde(rename = "routine")]
    Routine,
    #[serde(rename = "timed")]
    Timed,
}

impl Default for OrderUrgency {
    fn default() -> Self {
        OrderUrgency::Routine
    }
}

/// EHR Order Entity
///
/// Represents a clinical order (lab, radiology, medication, consult, etc.).
/// Corresponds to VistA File #100 (^OR - Orders).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EhrOrder {
    pub id: Uuid,

    /// Internal Entry Number (VistA IEN)
    pub ien: i64,

    /// Organization (multi-tenant)
    pub organization_id: Uuid,

    /// Patient ID
    pub patient_id: Uuid,

    /// Visit/encounter
    pub visit_id: Option<Uuid>,

    /// Order type
    pub order_type: OrderType,

    /// Order text/description
    pub order_text: String,

    /// Orderable item code (e.g., LOINC for labs)
    pub orderable_code: Option<String>,

    /// Status
    pub status: OrderStatus,

    /// Urgency
    pub urgency: OrderUrgency,

    /// Start datetime
    pub start_datetime: DateTime<Utc>,

    /// Stop datetime
    pub stop_datetime: Option<DateTime<Utc>>,

    /// Ordering provider
    pub ordering_provider_id: Uuid,
    pub ordering_provider_name: Option<String>,

    /// Signed by
    pub signed_by: Option<Uuid>,
    pub signed_datetime: Option<DateTime<Utc>>,

    /// Discontinue info
    pub discontinued_by: Option<Uuid>,
    pub discontinued_datetime: Option<DateTime<Utc>>,
    pub discontinued_reason: Option<String>,

    /// Instructions/notes
    pub instructions: Option<String>,

    /// Clinical indication
    pub indication: Option<String>,

    /// ICD-10 diagnosis supporting the order
    pub diagnosis_code: Option<String>,

    /// Order details (JSON for type-specific data)
    pub order_details: Option<JsonValue>,

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

impl EhrOrder {
    /// Create a new order
    pub fn new(
        organization_id: Uuid,
        patient_id: Uuid,
        order_type: OrderType,
        order_text: String,
        ordering_provider_id: Uuid,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            ien: 0,
            organization_id,
            patient_id,
            visit_id: None,
            order_type,
            order_text,
            orderable_code: None,
            status: OrderStatus::Pending,
            urgency: OrderUrgency::Routine,
            start_datetime: Utc::now(),
            stop_datetime: None,
            ordering_provider_id,
            ordering_provider_name: None,
            signed_by: None,
            signed_datetime: None,
            discontinued_by: None,
            discontinued_datetime: None,
            discontinued_reason: None,
            instructions: None,
            indication: None,
            diagnosis_code: None,
            order_details: None,
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

    /// Create a lab order
    pub fn lab_order(
        organization_id: Uuid,
        patient_id: Uuid,
        test_name: String,
        loinc_code: Option<String>,
        ordering_provider_id: Uuid,
    ) -> Self {
        let mut order = Self::new(
            organization_id,
            patient_id,
            OrderType::Lab,
            test_name,
            ordering_provider_id,
        );
        order.orderable_code = loinc_code;
        order
    }

    /// Create a radiology order
    pub fn radiology_order(
        organization_id: Uuid,
        patient_id: Uuid,
        procedure_name: String,
        ordering_provider_id: Uuid,
    ) -> Self {
        Self::new(
            organization_id,
            patient_id,
            OrderType::Radiology,
            procedure_name,
            ordering_provider_id,
        )
    }

    /// Sign the order
    pub fn sign(&mut self, provider_id: Uuid) {
        self.signed_by = Some(provider_id);
        self.signed_datetime = Some(Utc::now());
        self.status = OrderStatus::Active;
        self.updated_at = Utc::now();
    }

    /// Complete the order
    pub fn complete(&mut self) {
        self.status = OrderStatus::Completed;
        self.stop_datetime = Some(Utc::now());
        self.updated_at = Utc::now();
    }

    /// Discontinue the order
    pub fn discontinue(&mut self, provider_id: Uuid, reason: Option<String>) {
        self.status = OrderStatus::Discontinued;
        self.discontinued_by = Some(provider_id);
        self.discontinued_datetime = Some(Utc::now());
        self.discontinued_reason = reason;
        self.stop_datetime = Some(Utc::now());
        self.updated_at = Utc::now();
    }

    /// Cancel the order
    pub fn cancel(&mut self) {
        self.status = OrderStatus::Cancelled;
        self.stop_datetime = Some(Utc::now());
        self.updated_at = Utc::now();
    }

    /// Hold the order
    pub fn hold(&mut self) {
        self.status = OrderStatus::Held;
        self.updated_at = Utc::now();
    }

    /// Release a held order
    pub fn release(&mut self) {
        self.status = OrderStatus::Active;
        self.updated_at = Utc::now();
    }

    /// Check if order is active
    pub fn is_active(&self) -> bool {
        matches!(self.status, OrderStatus::Active | OrderStatus::Pending)
    }

    /// Check if order is signed
    pub fn is_signed(&self) -> bool {
        self.signed_by.is_some() && self.signed_datetime.is_some()
    }

    /// Check if order needs signature
    pub fn needs_signature(&self) -> bool {
        self.status == OrderStatus::Pending && !self.is_signed()
    }
}
