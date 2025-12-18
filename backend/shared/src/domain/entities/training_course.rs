use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use uuid::Uuid;
use crate::shared::AuditFields;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "content_type", rename_all = "snake_case")]
pub enum ContentType {
    Video,
    Document,
    Quiz,
    Interactive,
    Scorm,
    Link,
    Other,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "training_status", rename_all = "snake_case")]
pub enum TrainingStatus {
    NotStarted,
    InProgress,
    Completed,
    Expired,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "training_frequency", rename_all = "snake_case")]
pub enum TrainingFrequency {
    Once,
    Annual,
    Biannual,
    Quarterly,
    OnChange,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TrainingCourse {
    pub id: Uuid,
    pub code: String,
    pub title: String,
    pub description: Option<String>,
    pub content_type: ContentType,
    pub duration_minutes: i32,
    pub passing_score: Option<i32>,
    pub version: String,
    pub metadata: Value,
    // Audit fields
    pub request_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub system_id: Option<String>,
    pub version_number: i64,
    pub deleted_at: Option<DateTime<Utc>>,
    pub deleted_by: Option<Uuid>,
}

impl TrainingCourse {
    pub fn new(
        code: String,
        title: String,
        content_type: ContentType,
        duration_minutes: i32,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            code,
            title,
            description: None,
            content_type,
            duration_minutes,
            passing_score: None,
            version: "1.0".to_string(),
            metadata: serde_json::json!({}),
            request_id: audit.request_id,
            created_at: audit.created_at,
            updated_at: audit.updated_at,
            created_by: audit.created_by,
            updated_by: audit.updated_by,
            system_id: audit.system_id,
            version_number: audit.version,
            deleted_at: None,
            deleted_by: None,
        }
    }

    pub fn touch(&mut self, request_id: Option<String>, updated_by: Option<Uuid>) {
        self.request_id = request_id;
        self.updated_at = Utc::now();
        self.updated_by = updated_by;
        self.version_number += 1;
    }

    pub fn is_active(&self) -> bool {
        self.deleted_at.is_none()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CourseContent {
    pub id: Uuid,
    pub course_id: Uuid,
    pub parent_content_id: Option<Uuid>,
    pub title: String,
    pub content_type: ContentType,
    pub content_data: Value,
    pub order_index: i32,
    pub duration_minutes: i32,
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

impl CourseContent {
    pub fn new(
        course_id: Uuid,
        title: String,
        content_type: ContentType,
        content_data: Value,
        order_index: i32,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            course_id,
            parent_content_id: None,
            title,
            content_type,
            content_data,
            order_index,
            duration_minutes: 0,
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

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RegulationTrainingRequirement {
    pub id: Uuid,
    pub regulation_id: Uuid,
    pub section_id: Option<Uuid>,
    pub course_id: Uuid,
    pub role_id: Uuid,
    pub frequency: TrainingFrequency,
    pub grace_period_days: i32,
    pub is_mandatory: bool,
    pub effective_from: DateTime<Utc>,
    pub effective_to: Option<DateTime<Utc>>,
    // Audit fields
    pub request_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub system_id: Option<String>,
    pub version: i64,
}

impl RegulationTrainingRequirement {
    pub fn new(
        regulation_id: Uuid,
        course_id: Uuid,
        role_id: Uuid,
        frequency: TrainingFrequency,
        is_mandatory: bool,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            regulation_id,
            section_id: None,
            course_id,
            role_id,
            frequency,
            grace_period_days: 30,
            is_mandatory,
            effective_from: Utc::now(),
            effective_to: None,
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

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserTrainingProgress {
    pub id: Uuid,
    pub user_id: Uuid,
    pub course_id: Uuid,
    pub requirement_id: Option<Uuid>,
    pub status: TrainingStatus,
    pub score: Option<i32>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub certificate_id: Option<Uuid>,
    pub progress_data: Value,
    // Audit fields
    pub request_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub system_id: Option<String>,
    pub version: i64,
}

impl UserTrainingProgress {
    pub fn new(user_id: Uuid, course_id: Uuid, requirement_id: Option<Uuid>) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            user_id,
            course_id,
            requirement_id,
            status: TrainingStatus::NotStarted,
            score: None,
            started_at: None,
            completed_at: None,
            expires_at: None,
            certificate_id: None,
            progress_data: serde_json::json!({}),
            request_id: audit.request_id,
            created_at: audit.created_at,
            updated_at: audit.updated_at,
            created_by: audit.created_by,
            updated_by: audit.updated_by,
            system_id: audit.system_id,
            version: audit.version,
        }
    }

    pub fn start(&mut self) {
        self.status = TrainingStatus::InProgress;
        self.started_at = Some(Utc::now());
        self.touch(None, None);
    }

    pub fn complete(&mut self, score: Option<i32>) {
        self.status = TrainingStatus::Completed;
        self.completed_at = Some(Utc::now());
        self.score = score;
        self.touch(None, None);
    }

    pub fn touch(&mut self, request_id: Option<String>, updated_by: Option<Uuid>) {
        self.request_id = request_id;
        self.updated_at = Utc::now();
        self.updated_by = updated_by;
        self.version += 1;
    }

    pub fn is_expired(&self) -> bool {
        self.expires_at
            .map(|expires| expires < Utc::now())
            .unwrap_or(false)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Certificate {
    pub id: Uuid,
    pub user_id: Uuid,
    pub course_id: Uuid,
    pub training_progress_id: Uuid,
    pub certificate_number: String,
    pub issued_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub certificate_data: Value,
    // Audit fields
    pub request_id: Option<String>,
    pub created_by: Option<Uuid>,
    pub system_id: Option<String>,
}

impl Certificate {
    pub fn new(
        user_id: Uuid,
        course_id: Uuid,
        training_progress_id: Uuid,
        certificate_number: String,
        expires_at: Option<DateTime<Utc>>,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            user_id,
            course_id,
            training_progress_id,
            certificate_number,
            issued_at: Utc::now(),
            expires_at,
            certificate_data: serde_json::json!({}),
            request_id: audit.request_id,
            created_by: audit.created_by,
            system_id: audit.system_id,
        }
    }
}

