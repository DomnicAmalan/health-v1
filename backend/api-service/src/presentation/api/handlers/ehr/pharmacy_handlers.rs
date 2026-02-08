//! Pharmacy API handlers
//!
//! Provides REST API endpoints for pharmacy operations:
//! - Drug catalog search
//! - Drug interaction checking
//! - Prescription management (bridges to YottaDB)
//! - Dispensing workflow

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use super::super::super::AppState;

// =============================================================================
// Query Parameters
// =============================================================================

/// Drug search query parameters
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DrugSearchQuery {
    /// Search term (generic name, brand name, or drug code)
    pub q: String,
    /// Catalog ID (optional, defaults to primary catalog for region)
    pub catalog_id: Option<Uuid>,
    /// Limit results
    pub limit: Option<i64>,
    /// Therapeutic class filter
    pub therapeutic_class: Option<String>,
    /// Only formulary drugs
    pub formulary_only: Option<bool>,
}

/// Drug interaction check request
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InteractionCheckRequest {
    /// List of drug IDs to check for interactions
    pub drug_ids: Vec<Uuid>,
    /// Patient ID (optional, for allergy cross-check)
    pub patient_ien: Option<i64>,
    /// Include minor interactions
    pub include_minor: Option<bool>,
}

// =============================================================================
// Response DTOs
// =============================================================================

/// Drug catalog response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DrugCatalogResponse {
    pub id: Uuid,
    pub catalog_code: String,
    pub catalog_name: String,
    pub catalog_version: Option<String>,
    pub country_code: String,
    pub regulatory_body: Option<String>,
    pub is_primary: bool,
    pub is_active: bool,
}

/// Drug schedule response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DrugScheduleResponse {
    pub id: Uuid,
    pub schedule_code: String,
    pub schedule_name: String,
    pub schedule_type: String,
    pub description: Option<String>,
    pub prescriber_requirements: Option<String>,
    pub dispensing_requirements: Option<String>,
    pub record_keeping_days: Option<i32>,
    pub refill_allowed: bool,
    pub max_refills: Option<i32>,
    pub max_quantity_days: Option<i32>,
}

/// Drug master response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DrugResponse {
    pub id: Uuid,
    pub drug_code: String,
    pub generic_name: String,
    pub brand_names: Vec<String>,
    pub therapeutic_class: Option<String>,
    pub pharmacological_class: Option<String>,
    pub atc_code: Option<String>,
    pub rxnorm_code: Option<String>,
    pub form: String,
    pub route: String,
    pub strength: Option<String>,
    pub strength_unit: Option<String>,
    pub usual_dose: Option<String>,
    pub max_daily_dose: Option<String>,
    pub pediatric_dose: Option<String>,
    pub geriatric_dose: Option<String>,
    pub pregnancy_category: Option<String>,
    pub lactation_safe: Option<bool>,
    pub renal_adjustment_required: bool,
    pub hepatic_adjustment_required: bool,
    pub storage_conditions: Option<String>,
    pub is_formulary: bool,
    pub schedule: Option<DrugScheduleResponse>,
}

/// Drug interaction response
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DrugInteractionResponse {
    pub id: Uuid,
    pub drug1_id: Uuid,
    pub drug1_name: String,
    pub drug2_id: Uuid,
    pub drug2_name: String,
    pub severity: String,
    pub interaction_type: Option<String>,
    pub mechanism: Option<String>,
    pub clinical_effect: String,
    pub management: Option<String>,
    pub evidence_level: Option<String>,
}

/// Drug contraindication response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContraindicationResponse {
    pub id: Uuid,
    pub drug_id: Uuid,
    pub contraindication_type: String,
    pub condition_code: Option<String>,
    pub condition_name: String,
    pub description: Option<String>,
    pub severity: String,
    pub alternative_recommendation: Option<String>,
}

/// Allergy alert response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AllergyAlertResponse {
    pub drug_id: Uuid,
    pub drug_name: String,
    pub allergen_class: String,
    pub patient_allergy: String,
    pub cross_reactivity_class: Option<String>,
    pub severity: String,
}

/// Full interaction check response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InteractionCheckResponse {
    pub drug_interactions: Vec<DrugInteractionResponse>,
    pub contraindications: Vec<ContraindicationResponse>,
    pub allergy_alerts: Vec<AllergyAlertResponse>,
    pub has_critical: bool,
    pub summary: String,
}

/// Paginated drug response wrapper
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DrugPaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

/// Pharmacy error response
#[derive(Debug, Serialize)]
pub struct PharmacyErrorResponse {
    pub error: String,
    pub message: String,
}

// =============================================================================
// Drug Catalog Handlers
// =============================================================================

/// List drug catalogs
///
/// GET /v1/pharmacy/catalogs
pub async fn list_catalogs(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let result = sqlx::query!(
        r#"
        SELECT id, catalog_code, catalog_name, catalog_version, country_code,
               regulatory_body, is_primary, is_active
        FROM drug_catalogs
        WHERE is_active = true
        ORDER BY is_primary DESC, catalog_name ASC
        "#
    )
    .fetch_all(&*state.database_pool)
    .await;

    match result {
        Ok(rows) => {
            let catalogs: Vec<DrugCatalogResponse> = rows.iter().map(|r| DrugCatalogResponse {
                id: r.id,
                catalog_code: r.catalog_code.clone(),
                catalog_name: r.catalog_name.clone(),
                catalog_version: r.catalog_version.clone(),
                country_code: r.country_code.clone(),
                regulatory_body: r.regulatory_body.clone(),
                is_primary: r.is_primary,
                is_active: r.is_active,
            }).collect();
            (StatusCode::OK, Json(catalogs)).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to fetch catalogs: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(PharmacyErrorResponse {
                    error: "database_error".to_string(),
                    message: "Failed to fetch drug catalogs".to_string(),
                }),
            ).into_response()
        }
    }
}

/// Search drugs
///
/// GET /v1/pharmacy/drugs/search?q=...
pub async fn search_drugs(
    State(state): State<Arc<AppState>>,
    Query(query): Query<DrugSearchQuery>,
) -> impl IntoResponse {
    let limit = query.limit.unwrap_or(20).min(100);
    let search_term = format!("%{}%", query.q.to_lowercase());
    let formulary_only = query.formulary_only.unwrap_or(false);

    let result = sqlx::query!(
        r#"
        SELECT
            dm.id, dm.drug_code, dm.generic_name, dm.brand_names,
            dm.therapeutic_class, dm.pharmacological_class,
            dm.atc_code, dm.rxnorm_code, dm.form::text as "form!", dm.route::text as "route!",
            dm.strength, dm.strength_unit, dm.usual_dose, dm.max_daily_dose,
            dm.pediatric_dose, dm.geriatric_dose, dm.pregnancy_category,
            dm.lactation_safe, dm.renal_adjustment_required, dm.hepatic_adjustment_required,
            dm.storage_conditions, dm.is_formulary,
            ds.id as "schedule_id?", ds.schedule_code as "schedule_code?", ds.schedule_name as "schedule_name?",
            ds.schedule_type::text as "schedule_type", ds.description as "schedule_description",
            ds.prescriber_requirements as "prescriber_requirements?", ds.dispensing_requirements as "dispensing_requirements?",
            ds.record_keeping_days as "record_keeping_days?", ds.refill_allowed as "refill_allowed?",
            ds.max_refills as "max_refills?", ds.max_quantity_days as "max_quantity_days?"
        FROM drug_master dm
        LEFT JOIN drug_schedules ds ON dm.schedule_id = ds.id
        WHERE dm.is_active = true
          AND (
            LOWER(dm.generic_name) LIKE $1
            OR dm.drug_code ILIKE $1
            OR dm.atc_code ILIKE $1
            OR EXISTS (
                SELECT 1 FROM unnest(dm.brand_names) AS bn
                WHERE LOWER(bn) LIKE $1
            )
          )
          AND ($2 = false OR dm.is_formulary = true)
        ORDER BY
            CASE WHEN LOWER(dm.generic_name) = LOWER($3) THEN 0 ELSE 1 END,
            dm.generic_name ASC
        LIMIT $4
        "#,
        &search_term,
        formulary_only,
        &query.q,
        limit
    )
    .fetch_all(&*state.database_pool)
    .await;

    match result {
        Ok(rows) => {
            let drugs: Vec<DrugResponse> = rows.iter().map(|r| {
                let schedule = r.schedule_id.map(|sid| {
                    DrugScheduleResponse {
                        id: sid,
                        schedule_code: r.schedule_code.clone().unwrap_or_default(),
                        schedule_name: r.schedule_name.clone().unwrap_or_default(),
                        schedule_type: r.schedule_type.clone().unwrap_or_default(),
                        description: r.schedule_description.clone(),
                        prescriber_requirements: r.prescriber_requirements.clone(),
                        dispensing_requirements: r.dispensing_requirements.clone(),
                        record_keeping_days: r.record_keeping_days,
                        refill_allowed: r.refill_allowed.unwrap_or(true),
                        max_refills: r.max_refills,
                        max_quantity_days: r.max_quantity_days,
                    }
                });

                DrugResponse {
                    id: r.id,
                    drug_code: r.drug_code.clone(),
                    generic_name: r.generic_name.clone(),
                    brand_names: r.brand_names.clone().unwrap_or_default(),
                    therapeutic_class: r.therapeutic_class.clone(),
                    pharmacological_class: r.pharmacological_class.clone(),
                    atc_code: r.atc_code.clone(),
                    rxnorm_code: r.rxnorm_code.clone(),
                    form: r.form.clone(),
                    route: r.route.clone(),
                    strength: r.strength.clone(),
                    strength_unit: r.strength_unit.clone(),
                    usual_dose: r.usual_dose.clone(),
                    max_daily_dose: r.max_daily_dose.clone(),
                    pediatric_dose: r.pediatric_dose.clone(),
                    geriatric_dose: r.geriatric_dose.clone(),
                    pregnancy_category: r.pregnancy_category.clone(),
                    lactation_safe: r.lactation_safe,
                    renal_adjustment_required: r.renal_adjustment_required.unwrap_or(false),
                    hepatic_adjustment_required: r.hepatic_adjustment_required.unwrap_or(false),
                    storage_conditions: r.storage_conditions.clone(),
                    is_formulary: r.is_formulary,
                    schedule,
                }
            }).collect();

            let total = drugs.len() as i64;
            (StatusCode::OK, Json(DrugPaginatedResponse {
                items: drugs,
                total,
                limit,
                offset: 0,
            })).into_response()
        }
        Err(e) => {
            tracing::error!("Drug search failed: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(PharmacyErrorResponse {
                    error: "database_error".to_string(),
                    message: "Failed to search drugs".to_string(),
                }),
            ).into_response()
        }
    }
}

/// Get drug by ID
///
/// GET /v1/pharmacy/drugs/:id
pub async fn get_drug(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let result = sqlx::query!(
        r#"
        SELECT
            dm.id, dm.drug_code, dm.generic_name, dm.brand_names,
            dm.therapeutic_class, dm.pharmacological_class,
            dm.atc_code, dm.rxnorm_code, dm.form::text as "form!", dm.route::text as "route!",
            dm.strength, dm.strength_unit, dm.usual_dose, dm.max_daily_dose,
            dm.pediatric_dose, dm.geriatric_dose, dm.pregnancy_category,
            dm.lactation_safe, dm.renal_adjustment_required, dm.hepatic_adjustment_required,
            dm.storage_conditions, dm.is_formulary,
            ds.id as "schedule_id?", ds.schedule_code as "schedule_code?", ds.schedule_name as "schedule_name?",
            ds.schedule_type::text as "schedule_type", ds.description as "schedule_description",
            ds.prescriber_requirements as "prescriber_requirements?", ds.dispensing_requirements as "dispensing_requirements?",
            ds.record_keeping_days as "record_keeping_days?", ds.refill_allowed as "refill_allowed?",
            ds.max_refills as "max_refills?", ds.max_quantity_days as "max_quantity_days?"
        FROM drug_master dm
        LEFT JOIN drug_schedules ds ON dm.schedule_id = ds.id
        WHERE dm.id = $1 AND dm.is_active = true
        "#,
        id
    )
    .fetch_optional(&*state.database_pool)
    .await;

    match result {
        Ok(Some(r)) => {
            let schedule = r.schedule_id.map(|sid| {
                DrugScheduleResponse {
                    id: sid,
                    schedule_code: r.schedule_code.clone().unwrap_or_default(),
                    schedule_name: r.schedule_name.clone().unwrap_or_default(),
                    schedule_type: r.schedule_type.clone().unwrap_or_default(),
                    description: r.schedule_description.clone(),
                    prescriber_requirements: r.prescriber_requirements.clone(),
                    dispensing_requirements: r.dispensing_requirements.clone(),
                    record_keeping_days: r.record_keeping_days,
                    refill_allowed: r.refill_allowed.unwrap_or(true),
                    max_refills: r.max_refills,
                    max_quantity_days: r.max_quantity_days,
                }
            });

            let drug = DrugResponse {
                id: r.id,
                drug_code: r.drug_code.clone(),
                generic_name: r.generic_name.clone(),
                brand_names: r.brand_names.clone().unwrap_or_default(),
                therapeutic_class: r.therapeutic_class.clone(),
                pharmacological_class: r.pharmacological_class.clone(),
                atc_code: r.atc_code.clone(),
                rxnorm_code: r.rxnorm_code.clone(),
                form: r.form.clone(),
                route: r.route.clone(),
                strength: r.strength.clone(),
                strength_unit: r.strength_unit.clone(),
                usual_dose: r.usual_dose.clone(),
                max_daily_dose: r.max_daily_dose.clone(),
                pediatric_dose: r.pediatric_dose.clone(),
                geriatric_dose: r.geriatric_dose.clone(),
                pregnancy_category: r.pregnancy_category.clone(),
                lactation_safe: r.lactation_safe,
                renal_adjustment_required: r.renal_adjustment_required.unwrap_or(false),
                hepatic_adjustment_required: r.hepatic_adjustment_required.unwrap_or(false),
                storage_conditions: r.storage_conditions.clone(),
                is_formulary: r.is_formulary,
                schedule,
            };
            (StatusCode::OK, Json(drug)).into_response()
        }
        Ok(None) => {
            (
                StatusCode::NOT_FOUND,
                Json(PharmacyErrorResponse {
                    error: "not_found".to_string(),
                    message: format!("Drug with ID {} not found", id),
                }),
            ).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to fetch drug: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(PharmacyErrorResponse {
                    error: "database_error".to_string(),
                    message: "Failed to fetch drug".to_string(),
                }),
            ).into_response()
        }
    }
}

/// Get drug interactions for a drug
///
/// GET /v1/pharmacy/drugs/:id/interactions
pub async fn get_drug_interactions(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let result = sqlx::query!(
        r#"
        SELECT
            di.id,
            di.drug_id_1, dm1.generic_name as "drug1_name!",
            di.drug_id_2, dm2.generic_name as "drug2_name!",
            di.severity::text as "severity!",
            di.interaction_type, di.mechanism,
            di.clinical_effect, di.management, di.evidence_level
        FROM drug_interactions di
        JOIN drug_master dm1 ON di.drug_id_1 = dm1.id
        JOIN drug_master dm2 ON di.drug_id_2 = dm2.id
        WHERE (di.drug_id_1 = $1 OR di.drug_id_2 = $1)
          AND di.is_active = true
        ORDER BY
            CASE di.severity
                WHEN 'contraindicated' THEN 1
                WHEN 'major' THEN 2
                WHEN 'moderate' THEN 3
                WHEN 'minor' THEN 4
                ELSE 5
            END
        "#,
        id
    )
    .fetch_all(&*state.database_pool)
    .await;

    match result {
        Ok(rows) => {
            let interactions: Vec<DrugInteractionResponse> = rows.iter().map(|r| {
                DrugInteractionResponse {
                    id: r.id,
                    drug1_id: r.drug_id_1,
                    drug1_name: r.drug1_name.clone(),
                    drug2_id: r.drug_id_2,
                    drug2_name: r.drug2_name.clone(),
                    severity: r.severity.clone(),
                    interaction_type: r.interaction_type.clone(),
                    mechanism: r.mechanism.clone(),
                    clinical_effect: r.clinical_effect.clone(),
                    management: r.management.clone(),
                    evidence_level: r.evidence_level.clone(),
                }
            }).collect();
            (StatusCode::OK, Json(interactions)).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to fetch interactions: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(PharmacyErrorResponse {
                    error: "database_error".to_string(),
                    message: "Failed to fetch drug interactions".to_string(),
                }),
            ).into_response()
        }
    }
}

/// Get drug contraindications
///
/// GET /v1/pharmacy/drugs/:id/contraindications
pub async fn get_drug_contraindications(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let result = sqlx::query!(
        r#"
        SELECT
            id, drug_id, contraindication_type, condition_code,
            condition_name, description, severity::text as "severity!",
            alternative_recommendation
        FROM drug_contraindications
        WHERE drug_id = $1 AND is_active = true
        ORDER BY
            CASE severity
                WHEN 'contraindicated' THEN 1
                WHEN 'major' THEN 2
                WHEN 'moderate' THEN 3
                ELSE 4
            END
        "#,
        id
    )
    .fetch_all(&*state.database_pool)
    .await;

    match result {
        Ok(rows) => {
            let contraindications: Vec<ContraindicationResponse> = rows.iter().map(|r| {
                ContraindicationResponse {
                    id: r.id,
                    drug_id: r.drug_id,
                    contraindication_type: r.contraindication_type.clone(),
                    condition_code: r.condition_code.clone(),
                    condition_name: r.condition_name.clone(),
                    description: r.description.clone(),
                    severity: r.severity.clone(),
                    alternative_recommendation: r.alternative_recommendation.clone(),
                }
            }).collect();
            (StatusCode::OK, Json(contraindications)).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to fetch contraindications: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(PharmacyErrorResponse {
                    error: "database_error".to_string(),
                    message: "Failed to fetch contraindications".to_string(),
                }),
            ).into_response()
        }
    }
}

/// Check interactions between multiple drugs
///
/// POST /v1/pharmacy/interactions/check
pub async fn check_interactions(
    State(state): State<Arc<AppState>>,
    Json(request): Json<InteractionCheckRequest>,
) -> impl IntoResponse {
    if request.drug_ids.len() < 2 {
        return (
            StatusCode::BAD_REQUEST,
            Json(PharmacyErrorResponse {
                error: "invalid_request".to_string(),
                message: "At least 2 drug IDs are required for interaction checking".to_string(),
            }),
        ).into_response();
    }

    let include_minor = request.include_minor.unwrap_or(false);

    // Check drug-drug interactions
    let interactions_result = sqlx::query!(
        r#"
        SELECT
            di.id,
            di.drug_id_1, dm1.generic_name as "drug1_name!",
            di.drug_id_2, dm2.generic_name as "drug2_name!",
            di.severity::text as "severity!",
            di.interaction_type, di.mechanism,
            di.clinical_effect, di.management, di.evidence_level
        FROM drug_interactions di
        JOIN drug_master dm1 ON di.drug_id_1 = dm1.id
        JOIN drug_master dm2 ON di.drug_id_2 = dm2.id
        WHERE di.drug_id_1 = ANY($1) AND di.drug_id_2 = ANY($1)
          AND di.is_active = true
          AND ($2 = true OR di.severity != 'minor')
        ORDER BY
            CASE di.severity
                WHEN 'contraindicated' THEN 1
                WHEN 'major' THEN 2
                WHEN 'moderate' THEN 3
                WHEN 'minor' THEN 4
                ELSE 5
            END
        "#,
        &request.drug_ids as &[Uuid],
        include_minor
    )
    .fetch_all(&*state.database_pool)
    .await;

    let drug_interactions: Vec<DrugInteractionResponse> = match interactions_result {
        Ok(rows) => rows.iter().map(|r| DrugInteractionResponse {
            id: r.id,
            drug1_id: r.drug_id_1,
            drug1_name: r.drug1_name.clone(),
            drug2_id: r.drug_id_2,
            drug2_name: r.drug2_name.clone(),
            severity: r.severity.clone(),
            interaction_type: r.interaction_type.clone(),
            mechanism: r.mechanism.clone(),
            clinical_effect: r.clinical_effect.clone(),
            management: r.management.clone(),
            evidence_level: r.evidence_level.clone(),
        }).collect(),
        Err(e) => {
            tracing::error!("Failed to check interactions: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(PharmacyErrorResponse {
                    error: "database_error".to_string(),
                    message: "Failed to check drug interactions".to_string(),
                }),
            ).into_response();
        }
    };

    // Check contraindications (placeholder - would need patient conditions)
    let contraindications: Vec<ContraindicationResponse> = vec![];

    // Check allergy alerts if patient_ien provided
    let allergy_alerts: Vec<AllergyAlertResponse> = vec![];
    // TODO: Query YottaDB for patient allergies and cross-reference with drug_allergy_mapping

    let has_critical = drug_interactions.iter().any(|i|
        i.severity == "contraindicated" || i.severity == "major"
    );

    let summary = if has_critical {
        format!("{} critical interaction(s) found. Review required before prescribing.",
            drug_interactions.iter().filter(|i| i.severity == "contraindicated" || i.severity == "major").count())
    } else if !drug_interactions.is_empty() {
        format!("{} interaction(s) found. Review recommended.", drug_interactions.len())
    } else {
        "No significant interactions found.".to_string()
    };

    let response = InteractionCheckResponse {
        drug_interactions,
        contraindications,
        allergy_alerts,
        has_critical,
        summary,
    };

    (StatusCode::OK, Json(response)).into_response()
}

/// Get drug schedules for a catalog
///
/// GET /v1/pharmacy/catalogs/:id/schedules
pub async fn get_catalog_schedules(
    State(state): State<Arc<AppState>>,
    Path(catalog_id): Path<Uuid>,
) -> impl IntoResponse {
    let result = sqlx::query!(
        r#"
        SELECT
            id, schedule_code, schedule_name, schedule_type::text as "schedule_type!",
            description, prescriber_requirements, dispensing_requirements,
            record_keeping_days, refill_allowed, max_refills, max_quantity_days
        FROM drug_schedules
        WHERE catalog_id = $1 AND is_active = true
        ORDER BY schedule_code
        "#,
        catalog_id
    )
    .fetch_all(&*state.database_pool)
    .await;

    match result {
        Ok(rows) => {
            let schedules: Vec<DrugScheduleResponse> = rows.iter().map(|r| {
                DrugScheduleResponse {
                    id: r.id,
                    schedule_code: r.schedule_code.clone(),
                    schedule_name: r.schedule_name.clone(),
                    schedule_type: r.schedule_type.clone(),
                    description: r.description.clone(),
                    prescriber_requirements: r.prescriber_requirements.clone(),
                    dispensing_requirements: r.dispensing_requirements.clone(),
                    record_keeping_days: r.record_keeping_days,
                    refill_allowed: r.refill_allowed,
                    max_refills: r.max_refills,
                    max_quantity_days: r.max_quantity_days,
                }
            }).collect();
            (StatusCode::OK, Json(schedules)).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to fetch schedules: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(PharmacyErrorResponse {
                    error: "database_error".to_string(),
                    message: "Failed to fetch drug schedules".to_string(),
                }),
            ).into_response()
        }
    }
}
