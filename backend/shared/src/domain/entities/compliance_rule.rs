use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use uuid::Uuid;
use crate::shared::AuditFields;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "entity_type", rename_all = "snake_case")]
pub enum EntityType {
    Hospital,
    Clinic,
    Patient,
    Provider,
    Organization,
    Facility,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ComplianceRule {
    pub id: Uuid,
    pub regulation_id: Uuid,
    pub region_id: Uuid,
    pub entity_type: EntityType,
    pub conditions: Value,
    pub priority: i32,
    pub effective_from: DateTime<Utc>,
    pub effective_to: Option<DateTime<Utc>>,
    pub override_parent: bool,
    // Audit fields
    pub request_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub system_id: Option<String>,
    pub version: i64,
}

impl ComplianceRule {
    pub fn new(
        regulation_id: Uuid,
        region_id: Uuid,
        entity_type: EntityType,
        priority: i32,
        override_parent: bool,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            regulation_id,
            region_id,
            entity_type,
            conditions: serde_json::json!({}),
            priority,
            effective_from: Utc::now(),
            effective_to: None,
            override_parent,
            request_id: audit.request_id,
            created_at: audit.created_at,
            updated_at: audit.updated_at,
            created_by: audit.created_by,
            updated_by: audit.updated_by,
            system_id: audit.system_id,
            version: audit.version,
        }
    }

    pub fn touch(&mut self, request_id: Option<String>, updated_by: Option<Uuid>) {
        self.request_id = request_id;
        self.updated_at = Utc::now();
        self.updated_by = updated_by;
        self.version += 1;
    }

    pub fn is_active(&self) -> bool {
        self.effective_from <= Utc::now()
            && (self.effective_to.is_none() || self.effective_to.unwrap() > Utc::now())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
// Using VARCHAR in DB, but we'll validate in Rust
// Manual implementations below to map to VARCHAR instead of enum type
pub enum ComplianceStatus {
    Compliant,
    NonCompliant,
    Partial,
    Pending,
}

impl sqlx::Type<sqlx::Postgres> for ComplianceStatus {
    fn type_info() -> sqlx::postgres::PgTypeInfo {
        <String as sqlx::Type<sqlx::Postgres>>::type_info()
    }
}

impl<'r> sqlx::Decode<'r, sqlx::Postgres> for ComplianceStatus {
    fn decode(
        value: sqlx::postgres::PgValueRef<'r>,
    ) -> Result<Self, sqlx::error::BoxDynError> {
        let s = <String as sqlx::Decode<sqlx::Postgres>>::decode(value)?;
        match s.as_str() {
            "compliant" => Ok(ComplianceStatus::Compliant),
            "non_compliant" => Ok(ComplianceStatus::NonCompliant),
            "partial" => Ok(ComplianceStatus::Partial),
            "pending" => Ok(ComplianceStatus::Pending),
            _ => Err(format!("Invalid compliance status: {}", s).into()),
        }
    }
}

impl sqlx::Encode<'_, sqlx::Postgres> for ComplianceStatus {
    fn encode_by_ref(
        &self,
        buf: &mut sqlx::postgres::PgArgumentBuffer,
    ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
        let s = match self {
            ComplianceStatus::Compliant => "compliant",
            ComplianceStatus::NonCompliant => "non_compliant",
            ComplianceStatus::Partial => "partial",
            ComplianceStatus::Pending => "pending",
        };
        <String as sqlx::Encode<sqlx::Postgres>>::encode(s.to_string(), buf)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ComplianceAssessment {
    pub id: Uuid,
    pub organization_id: Option<Uuid>,
    pub facility_id: Option<Uuid>,
    pub regulation_id: Uuid,
    pub assessment_date: DateTime<Utc>,
    pub status: String, // Using String for now, can be enum later
    pub score: Option<i32>,
    pub notes: Option<String>,
    pub assessed_by: Option<Uuid>,
    pub next_assessment_due: Option<DateTime<Utc>>,
    // Audit fields
    pub request_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub system_id: Option<String>,
    pub version: i64,
}

impl ComplianceAssessment {
    pub fn new(
        organization_id: Option<Uuid>,
        facility_id: Option<Uuid>,
        regulation_id: Uuid,
        assessed_by: Option<Uuid>,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            organization_id,
            facility_id,
            regulation_id,
            assessment_date: Utc::now(),
            status: "pending".to_string(),
            score: None,
            notes: None,
            assessed_by,
            next_assessment_due: None,
            request_id: audit.request_id,
            created_at: audit.created_at,
            updated_at: audit.updated_at,
            created_by: audit.created_by,
            updated_by: audit.updated_by,
            system_id: audit.system_id,
            version: audit.version,
        }
    }

    pub fn touch(&mut self, request_id: Option<String>, updated_by: Option<Uuid>) {
        self.request_id = request_id;
        self.updated_at = Utc::now();
        self.updated_by = updated_by;
        self.version += 1;
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ComplianceGap {
    pub id: Uuid,
    pub assessment_id: Uuid,
    pub regulation_id: Uuid,
    pub section_id: Option<Uuid>,
    pub gap_description: String,
    pub severity: String, // 'critical', 'high', 'medium', 'low'
    pub remediation_plan: Option<String>,
    pub target_resolution_date: Option<DateTime<Utc>>,
    pub actual_resolution_date: Option<DateTime<Utc>>,
    pub status: String, // 'open', 'in_progress', 'resolved', 'closed'
    // Audit fields
    pub request_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub system_id: Option<String>,
    pub version: i64,
}

impl ComplianceGap {
    pub fn new(
        assessment_id: Uuid,
        regulation_id: Uuid,
        gap_description: String,
        severity: String,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            assessment_id,
            regulation_id,
            section_id: None,
            gap_description,
            severity,
            remediation_plan: None,
            target_resolution_date: None,
            actual_resolution_date: None,
            status: "open".to_string(),
            request_id: audit.request_id,
            created_at: audit.created_at,
            updated_at: audit.updated_at,
            created_by: audit.created_by,
            updated_by: audit.updated_by,
            system_id: audit.system_id,
            version: audit.version,
        }
    }

    pub fn touch(&mut self, request_id: Option<String>, updated_by: Option<Uuid>) {
        self.request_id = request_id;
        self.updated_at = Utc::now();
        self.updated_by = updated_by;
        self.version += 1;
    }

    pub fn resolve(&mut self) {
        self.status = "resolved".to_string();
        self.actual_resolution_date = Some(Utc::now());
        self.touch(None, None);
    }
}

