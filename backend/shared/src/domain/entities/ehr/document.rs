//! EHR Clinical Document Entity
//!
//! Corresponds to VistA File #8925 (^TIU) - TIU Documents

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::shared::AuditFields;

/// Document status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum DocumentStatus {
    #[serde(rename = "draft")]
    Draft,
    #[serde(rename = "unsigned")]
    Unsigned,
    #[serde(rename = "signed")]
    Signed,
    #[serde(rename = "cosigned")]
    Cosigned,
    #[serde(rename = "amended")]
    Amended,
    #[serde(rename = "deleted")]
    Deleted,
}

impl Default for DocumentStatus {
    fn default() -> Self {
        DocumentStatus::Draft
    }
}

/// Document type
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "snake_case")]
pub enum DocumentType {
    #[serde(rename = "progress_note")]
    ProgressNote,
    #[serde(rename = "soap_note")]
    SoapNote,
    #[serde(rename = "h_and_p")]
    HistoryAndPhysical,
    #[serde(rename = "discharge_summary")]
    DischargeSummary,
    #[serde(rename = "consultation")]
    Consultation,
    #[serde(rename = "procedure_note")]
    ProcedureNote,
    #[serde(rename = "telephone_note")]
    TelephoneNote,
    #[serde(rename = "addendum")]
    Addendum,
    #[serde(rename = "other")]
    Other,
}

impl Default for DocumentType {
    fn default() -> Self {
        DocumentType::ProgressNote
    }
}

impl DocumentType {
    /// Get display name
    pub fn display_name(&self) -> &'static str {
        match self {
            DocumentType::ProgressNote => "Progress Note",
            DocumentType::SoapNote => "SOAP Note",
            DocumentType::HistoryAndPhysical => "History & Physical",
            DocumentType::DischargeSummary => "Discharge Summary",
            DocumentType::Consultation => "Consultation",
            DocumentType::ProcedureNote => "Procedure Note",
            DocumentType::TelephoneNote => "Telephone Note",
            DocumentType::Addendum => "Addendum",
            DocumentType::Other => "Other",
        }
    }
}

/// EHR Clinical Document Entity
///
/// Represents a clinical note/document (TIU).
/// Corresponds to VistA File #8925 (^TIU - Text Integration Utilities).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EhrDocument {
    pub id: Uuid,

    /// Internal Entry Number (VistA IEN)
    pub ien: i64,

    /// Organization (multi-tenant)
    pub organization_id: Uuid,

    /// Patient ID
    pub patient_id: Uuid,

    /// Visit/encounter associated with this document
    pub visit_id: Option<Uuid>,

    /// Document type
    pub document_type: DocumentType,

    /// Document title
    pub title: String,

    /// Document content (rich text/HTML)
    pub content: String,

    /// Structured content (JSON for form-based notes)
    pub structured_content: Option<JsonValue>,

    /// Form template used (if any)
    pub template_id: Option<Uuid>,

    /// Status
    pub status: DocumentStatus,

    /// Author (who wrote it)
    pub author_id: Uuid,
    pub author_name: Option<String>,

    /// Expected signer (may differ from author)
    pub expected_signer_id: Option<Uuid>,

    /// Actual signer
    pub signer_id: Option<Uuid>,
    pub signer_name: Option<String>,
    pub signed_datetime: Option<DateTime<Utc>>,

    /// Co-signer (for residents/students)
    pub cosigner_id: Option<Uuid>,
    pub cosigner_name: Option<String>,
    pub cosigned_datetime: Option<DateTime<Utc>>,

    /// Reference datetime (clinical time, may differ from entry time)
    pub reference_datetime: DateTime<Utc>,

    /// Parent document (for addendums)
    pub parent_document_id: Option<Uuid>,

    /// Service/specialty
    pub service: Option<String>,

    /// Location where documented
    pub location_id: Option<Uuid>,

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

impl EhrDocument {
    /// Create a new document
    pub fn new(
        organization_id: Uuid,
        patient_id: Uuid,
        document_type: DocumentType,
        title: String,
        author_id: Uuid,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            ien: 0,
            organization_id,
            patient_id,
            visit_id: None,
            document_type,
            title,
            content: String::new(),
            structured_content: None,
            template_id: None,
            status: DocumentStatus::Draft,
            author_id,
            author_name: None,
            expected_signer_id: None,
            signer_id: None,
            signer_name: None,
            signed_datetime: None,
            cosigner_id: None,
            cosigner_name: None,
            cosigned_datetime: None,
            reference_datetime: Utc::now(),
            parent_document_id: None,
            service: None,
            location_id: None,
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

    /// Create a SOAP note
    pub fn soap_note(
        organization_id: Uuid,
        patient_id: Uuid,
        author_id: Uuid,
    ) -> Self {
        Self::new(
            organization_id,
            patient_id,
            DocumentType::SoapNote,
            "SOAP Note".to_string(),
            author_id,
        )
    }

    /// Sign the document
    pub fn sign(&mut self, signer_id: Uuid, signer_name: String) {
        self.signer_id = Some(signer_id);
        self.signer_name = Some(signer_name);
        self.signed_datetime = Some(Utc::now());
        self.status = DocumentStatus::Signed;
        self.updated_at = Utc::now();
    }

    /// Co-sign the document
    pub fn cosign(&mut self, cosigner_id: Uuid, cosigner_name: String) {
        self.cosigner_id = Some(cosigner_id);
        self.cosigner_name = Some(cosigner_name);
        self.cosigned_datetime = Some(Utc::now());
        self.status = DocumentStatus::Cosigned;
        self.updated_at = Utc::now();
    }

    /// Create an addendum to this document
    pub fn create_addendum(&self, author_id: Uuid) -> Self {
        let mut addendum = Self::new(
            self.organization_id,
            self.patient_id,
            DocumentType::Addendum,
            format!("Addendum to {}", self.title),
            author_id,
        );
        addendum.parent_document_id = Some(self.id);
        addendum.visit_id = self.visit_id;
        addendum
    }

    /// Check if document can be edited
    pub fn is_editable(&self) -> bool {
        matches!(self.status, DocumentStatus::Draft | DocumentStatus::Unsigned)
    }

    /// Check if document is signed
    pub fn is_signed(&self) -> bool {
        matches!(
            self.status,
            DocumentStatus::Signed | DocumentStatus::Cosigned | DocumentStatus::Amended
        )
    }

    /// Check if this is an addendum
    pub fn is_addendum(&self) -> bool {
        self.document_type == DocumentType::Addendum || self.parent_document_id.is_some()
    }

    /// Get content preview (first N characters)
    pub fn content_preview(&self, max_chars: usize) -> String {
        // Strip HTML tags for preview
        let plain_text = self.content
            .replace("<br>", " ")
            .replace("<br/>", " ")
            .replace("<p>", "")
            .replace("</p>", " ");

        // Remove any remaining HTML tags
        let mut result = String::new();
        let mut in_tag = false;
        for c in plain_text.chars() {
            if c == '<' {
                in_tag = true;
            } else if c == '>' {
                in_tag = false;
            } else if !in_tag {
                result.push(c);
            }
        }

        if result.len() > max_chars {
            format!("{}...", &result[..max_chars])
        } else {
            result
        }
    }
}
