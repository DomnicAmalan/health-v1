use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use uuid::Uuid;
use crate::shared::AuditFields;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "geographic_level", rename_all = "snake_case")]
pub enum GeographicLevel {
    Continent,
    Country,
    State,
    Province,
    City,
    District,
    Town,
    Village,
    Street,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GeographicRegion {
    pub id: Uuid,
    pub parent_id: Option<Uuid>,
    pub name: String,
    pub code: Option<String>,
    pub level: GeographicLevel,
    pub metadata: Value,
    pub boundaries: Option<String>, // PostGIS geometry as WKT or GeoJSON
    pub effective_from: DateTime<Utc>,
    pub effective_to: Option<DateTime<Utc>>,
    pub version: i64,
    // Audit fields
    pub request_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub system_id: Option<String>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub deleted_by: Option<Uuid>,
}

impl GeographicRegion {
    pub fn new(
        parent_id: Option<Uuid>,
        name: String,
        code: Option<String>,
        level: GeographicLevel,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            parent_id,
            name,
            code,
            level,
            metadata: serde_json::json!({}),
            boundaries: None,
            effective_from: Utc::now(),
            effective_to: None,
            version: audit.version,
            request_id: audit.request_id,
            created_at: audit.created_at,
            updated_at: audit.updated_at,
            created_by: audit.created_by,
            updated_by: audit.updated_by,
            system_id: audit.system_id,
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

    pub fn soft_delete(&mut self, deleted_by: Option<Uuid>) {
        self.deleted_at = Some(Utc::now());
        self.deleted_by = deleted_by;
        self.touch(None, deleted_by);
    }

    pub fn is_active(&self) -> bool {
        self.deleted_at.is_none()
            && self.effective_from <= Utc::now()
            && (self.effective_to.is_none() || self.effective_to.unwrap() > Utc::now())
    }
}

