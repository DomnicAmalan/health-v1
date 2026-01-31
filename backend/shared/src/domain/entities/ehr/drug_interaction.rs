//! Drug Interaction Domain Entities
//!
//! Drug-drug interactions, contraindications, and allergy mappings.
//! Corresponds to tables: drug_interactions, drug_contraindications, drug_allergy_mapping

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Type;
use uuid::Uuid;

use crate::shared::AuditFields;

/// Interaction severity
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "interaction_severity")]
#[sqlx(rename_all = "snake_case")]
pub enum InteractionSeverity {
    /// Do not use together
    #[serde(rename = "contraindicated")]
    Contraindicated,
    /// Serious - may require intervention
    #[serde(rename = "major")]
    Major,
    /// Significant - monitor closely
    #[serde(rename = "moderate")]
    Moderate,
    /// Limited clinical significance
    #[serde(rename = "minor")]
    Minor,
    /// Insufficient data
    #[serde(rename = "unknown")]
    Unknown,
}

impl Default for InteractionSeverity {
    fn default() -> Self {
        InteractionSeverity::Unknown
    }
}

impl InteractionSeverity {
    /// Get display color for UI
    pub fn color(&self) -> &'static str {
        match self {
            InteractionSeverity::Contraindicated => "red",
            InteractionSeverity::Major => "orange",
            InteractionSeverity::Moderate => "yellow",
            InteractionSeverity::Minor => "blue",
            InteractionSeverity::Unknown => "gray",
        }
    }

    /// Check if this requires immediate attention
    pub fn is_critical(&self) -> bool {
        matches!(
            self,
            InteractionSeverity::Contraindicated | InteractionSeverity::Major
        )
    }
}

/// Contraindication type
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContraindicationType {
    /// Absolutely should not be used
    Absolute,
    /// Should be used with caution
    Relative,
    /// Use with awareness
    Precaution,
}

impl Default for ContraindicationType {
    fn default() -> Self {
        ContraindicationType::Relative
    }
}

// =============================================================================
// DRUG INTERACTION
// =============================================================================

/// Drug-drug interaction
///
/// Represents a known interaction between two drugs.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrugInteraction {
    pub id: Uuid,

    /// First interacting drug
    pub drug_id_1: Uuid,
    /// Second interacting drug
    pub drug_id_2: Uuid,

    /// Generic name for cross-catalog matching
    pub generic_name_1: Option<String>,
    pub generic_name_2: Option<String>,

    /// Interaction severity
    pub severity: InteractionSeverity,

    /// Interaction type (e.g., "pharmacokinetic", "pharmacodynamic")
    pub interaction_type: Option<String>,

    /// How the interaction occurs
    pub mechanism: Option<String>,

    /// What happens clinically
    pub clinical_effect: String,

    /// How to handle the interaction
    pub management: Option<String>,

    /// Evidence level (e.g., "established", "probable", "suspected")
    pub evidence_level: Option<String>,

    /// Source of interaction data
    pub reference_source: Option<String>,

    /// Catalog scope
    pub catalog_id: Option<Uuid>,

    /// Status
    pub is_active: bool,

    // Audit fields
    pub request_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub system_id: Option<String>,
    pub version: i64,
}

impl DrugInteraction {
    /// Create a new drug interaction
    pub fn new(
        drug_id_1: Uuid,
        drug_id_2: Uuid,
        severity: InteractionSeverity,
        clinical_effect: String,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            drug_id_1,
            drug_id_2,
            generic_name_1: None,
            generic_name_2: None,
            severity,
            interaction_type: None,
            mechanism: None,
            clinical_effect,
            management: None,
            evidence_level: None,
            reference_source: None,
            catalog_id: None,
            is_active: true,
            request_id: audit.request_id,
            created_at: audit.created_at,
            updated_at: audit.updated_at,
            created_by: audit.created_by,
            updated_by: audit.updated_by,
            system_id: audit.system_id,
            version: audit.version,
        }
    }

    /// Check if interaction involves a specific drug
    pub fn involves_drug(&self, drug_id: Uuid) -> bool {
        self.drug_id_1 == drug_id || self.drug_id_2 == drug_id
    }

    /// Get the other drug in the interaction
    pub fn other_drug(&self, drug_id: Uuid) -> Option<Uuid> {
        if self.drug_id_1 == drug_id {
            Some(self.drug_id_2)
        } else if self.drug_id_2 == drug_id {
            Some(self.drug_id_1)
        } else {
            None
        }
    }

    /// Check if this is a critical interaction
    pub fn is_critical(&self) -> bool {
        self.severity.is_critical()
    }
}

// =============================================================================
// DRUG CONTRAINDICATION
// =============================================================================

/// Drug contraindication
///
/// Represents a condition under which a drug should not be used.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrugContraindication {
    pub id: Uuid,

    /// Drug reference
    pub drug_id: Uuid,

    /// Type: absolute, relative, precaution
    pub contraindication_type: String,

    /// ICD-10 or SNOMED code
    pub condition_code: Option<String>,

    /// Condition name (e.g., "Renal failure", "Pregnancy")
    pub condition_name: String,

    /// Description
    pub description: Option<String>,

    /// Severity
    pub severity: InteractionSeverity,

    /// Alternative drug recommendation
    pub alternative_recommendation: Option<String>,

    /// Catalog scope
    pub catalog_id: Option<Uuid>,

    /// Status
    pub is_active: bool,

    // Audit fields
    pub request_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub system_id: Option<String>,
    pub version: i64,
}

impl DrugContraindication {
    /// Create a new contraindication
    pub fn new(
        drug_id: Uuid,
        contraindication_type: ContraindicationType,
        condition_name: String,
        severity: InteractionSeverity,
    ) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            drug_id,
            contraindication_type: match contraindication_type {
                ContraindicationType::Absolute => "absolute".to_string(),
                ContraindicationType::Relative => "relative".to_string(),
                ContraindicationType::Precaution => "precaution".to_string(),
            },
            condition_code: None,
            condition_name,
            description: None,
            severity,
            alternative_recommendation: None,
            catalog_id: None,
            is_active: true,
            request_id: audit.request_id,
            created_at: audit.created_at,
            updated_at: audit.updated_at,
            created_by: audit.created_by,
            updated_by: audit.updated_by,
            system_id: audit.system_id,
            version: audit.version,
        }
    }

    /// Check if this is an absolute contraindication
    pub fn is_absolute(&self) -> bool {
        self.contraindication_type == "absolute"
    }

    /// Check if this is a critical contraindication
    pub fn is_critical(&self) -> bool {
        self.is_absolute() || self.severity.is_critical()
    }
}

// =============================================================================
// DRUG ALLERGY MAPPING
// =============================================================================

/// Drug allergy mapping
///
/// Maps drugs to allergen classes for cross-sensitivity checking.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrugAllergyMapping {
    pub id: Uuid,

    /// Drug reference
    pub drug_id: Uuid,

    /// Allergen class (e.g., "Penicillin", "Sulfonamide")
    pub allergen_class: String,

    /// Specific allergen name
    pub allergen_name: Option<String>,

    /// Cross-reactivity group
    pub cross_reactivity_class: Option<String>,

    /// Typical severity
    pub typical_severity: String,

    /// Status
    pub is_active: bool,

    // Audit fields
    pub request_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub system_id: Option<String>,
    pub version: i64,
}

impl DrugAllergyMapping {
    /// Create a new allergy mapping
    pub fn new(drug_id: Uuid, allergen_class: String) -> Self {
        let audit = AuditFields::new();
        Self {
            id: Uuid::new_v4(),
            drug_id,
            allergen_class,
            allergen_name: None,
            cross_reactivity_class: None,
            typical_severity: "moderate".to_string(),
            is_active: true,
            request_id: audit.request_id,
            created_at: audit.created_at,
            updated_at: audit.updated_at,
            created_by: audit.created_by,
            updated_by: audit.updated_by,
            system_id: audit.system_id,
            version: audit.version,
        }
    }
}

// =============================================================================
// INTERACTION CHECK RESULT
// =============================================================================

/// Result of a drug interaction check
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractionCheckResult {
    /// Drug-drug interactions found
    pub drug_interactions: Vec<DrugInteraction>,

    /// Contraindications found
    pub contraindications: Vec<DrugContraindication>,

    /// Allergy alerts
    pub allergy_alerts: Vec<AllergyAlert>,

    /// Whether any critical issues were found
    pub has_critical: bool,

    /// Summary message
    pub summary: String,
}

/// Allergy alert from interaction check
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllergyAlert {
    /// Drug that triggered the alert
    pub drug_id: Uuid,
    pub drug_name: String,

    /// Allergen that matched
    pub allergen: String,
    pub allergen_class: Option<String>,

    /// Match type (exact, class, cross-reactivity)
    pub match_type: String,

    /// Severity
    pub severity: String,

    /// Patient's allergy IEN (if applicable)
    pub patient_allergy_ien: Option<i64>,
}

impl InteractionCheckResult {
    /// Create an empty result
    pub fn empty() -> Self {
        Self {
            drug_interactions: Vec::new(),
            contraindications: Vec::new(),
            allergy_alerts: Vec::new(),
            has_critical: false,
            summary: "No interactions found".to_string(),
        }
    }

    /// Create result with interactions
    pub fn with_interactions(
        drug_interactions: Vec<DrugInteraction>,
        contraindications: Vec<DrugContraindication>,
        allergy_alerts: Vec<AllergyAlert>,
    ) -> Self {
        let has_critical = drug_interactions.iter().any(|i| i.is_critical())
            || contraindications.iter().any(|c| c.is_critical())
            || allergy_alerts
                .iter()
                .any(|a| a.severity == "severe" || a.severity == "life_threatening");

        let critical_count = drug_interactions.iter().filter(|i| i.is_critical()).count()
            + contraindications.iter().filter(|c| c.is_critical()).count();

        let summary = if has_critical {
            format!(
                "CRITICAL: {} critical interaction(s) found. Review required before dispensing.",
                critical_count
            )
        } else if !drug_interactions.is_empty()
            || !contraindications.is_empty()
            || !allergy_alerts.is_empty()
        {
            format!(
                "{} interaction(s), {} contraindication(s), {} allergy alert(s) found.",
                drug_interactions.len(),
                contraindications.len(),
                allergy_alerts.len()
            )
        } else {
            "No interactions found".to_string()
        };

        Self {
            drug_interactions,
            contraindications,
            allergy_alerts,
            has_critical,
            summary,
        }
    }
}
