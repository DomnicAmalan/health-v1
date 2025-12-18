use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use uuid::Uuid;
use crate::shared::AuditFields;
use super::geographic_region::GeographicLevel;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "regulation_category", rename_all = "snake_case")]
pub enum RegulationCategory {
    Privacy,
    Security,
    Clinical,
    Billing,
    Quality,
    Safety,
    DataProtection,
    Accessibility,
    Other,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "regulation_status", rename_all = "snake_case")]
pub enum RegulationStatus {
    Draft,
    Active,
    Superseded,
    Archived,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Regulation {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub category: RegulationCategory,
    pub issuing_body: String,
    pub jurisdiction_id: Option<Uuid>,
    pub jurisdiction_level: Option<GeographicLevel>,
    pub effective_from: DateTime<Utc>,
    pub effective_to: Option<DateTime<Utc>>,
    pub status: RegulationStatus,
    pub metadata: Value,
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

impl Regulation {
    pub fn new(
        code: String,
        name: String,
        category: RegulationCategory,
        issuing_body: String,
        jurisdiction_id: Option<Uuid>,
        jurisdiction_level: Option<GeographicLevel>,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            code,
            name,
            category,
            issuing_body,
            jurisdiction_id,
            jurisdiction_level,
            effective_from: Utc::now(),
            effective_to: None,
            status: RegulationStatus::Draft,
            metadata: serde_json::json!({}),
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

    pub fn touch(&mut self, request_id: Option<String>, updated_by: Option<Uuid>) {
        self.request_id = request_id;
        self.updated_at = Utc::now();
        self.updated_by = updated_by;
        self.version += 1;
    }

    pub fn set_audit_create(
        &mut self,
        request_id: Option<String>,
        created_by: Option<Uuid>,
        system_id: Option<String>,
    ) {
        self.request_id = request_id;
        self.created_by = created_by;
        self.system_id = system_id;
    }

    pub fn activate(&mut self) {
        self.status = RegulationStatus::Active;
        self.touch(None, None);
    }

    pub fn is_active(&self) -> bool {
        self.deleted_at.is_none()
            && self.status == RegulationStatus::Active
            && self.effective_from <= Utc::now()
            && (self.effective_to.is_none() || self.effective_to.unwrap() > Utc::now())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RegulationVersion {
    pub id: Uuid,
    pub regulation_id: Uuid,
    pub version_number: String,
    pub content_hash: String,
    pub effective_from: DateTime<Utc>,
    pub effective_to: Option<DateTime<Utc>>,
    pub change_summary: Option<String>,
    // Audit fields
    pub request_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub system_id: Option<String>,
}

impl RegulationVersion {
    pub fn new(
        regulation_id: Uuid,
        version_number: String,
        content_hash: String,
        change_summary: Option<String>,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            regulation_id,
            version_number,
            content_hash,
            effective_from: Utc::now(),
            effective_to: None,
            change_summary,
            request_id: audit.request_id,
            created_at: audit.created_at,
            created_by: audit.created_by,
            system_id: audit.system_id,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RegulationSection {
    pub id: Uuid,
    pub version_id: Uuid,
    pub parent_section_id: Option<Uuid>,
    pub section_number: String,
    pub title: Option<String>,
    pub content: String,
    pub order_index: i32,
    pub metadata: Value,
    // Audit fields
    pub request_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub system_id: Option<String>,
    pub version: i64,
}

impl RegulationSection {
    pub fn new(
        version_id: Uuid,
        section_number: String,
        content: String,
        parent_section_id: Option<Uuid>,
        order_index: i32,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            version_id,
            parent_section_id,
            section_number,
            title: None,
            content,
            order_index,
            metadata: serde_json::json!({}),
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

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "change_type", rename_all = "snake_case")]
pub enum ChangeType {
    Added,
    Modified,
    Deleted,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RegulationChange {
    pub id: Uuid,
    pub section_id: Uuid,
    pub from_version_id: Option<Uuid>,
    pub to_version_id: Uuid,
    pub change_type: ChangeType,
    pub old_content: Option<String>,
    pub new_content: Option<String>,
    pub line_start: Option<i32>,
    pub line_end: Option<i32>,
    pub change_date: DateTime<Utc>,
    // Audit fields
    pub request_id: Option<String>,
    pub created_by: Option<Uuid>,
    pub system_id: Option<String>,
}

impl RegulationChange {
    pub fn new(
        section_id: Uuid,
        from_version_id: Option<Uuid>,
        to_version_id: Uuid,
        change_type: ChangeType,
        old_content: Option<String>,
        new_content: Option<String>,
        line_start: Option<i32>,
        line_end: Option<i32>,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            section_id,
            from_version_id,
            to_version_id,
            change_type,
            old_content,
            new_content,
            line_start,
            line_end,
            change_date: Utc::now(),
            request_id: None,
            created_by: None,
            system_id: None,
        }
    }
}

