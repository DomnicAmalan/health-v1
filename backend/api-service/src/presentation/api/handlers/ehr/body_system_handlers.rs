// Body System Handlers
// Anatomical taxonomy and context-aware lab recommendations
// Tiger Style compliance: no unwrap/expect, bounded results (max 20 recommendations), 5s timeouts

use axum::{
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use shared::shared::api_response::ApiError;
use shared::shared::error::AppError;
use std::sync::Arc;
use uuid::Uuid;

use super::AppState;

// ============================================================================
// Response Types
// ============================================================================

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct BodySystem {
    pub id: Uuid,
    pub system_code: String,
    pub system_name: String,
    pub parent_system_id: Option<Uuid>,
    pub icd10_chapter: Option<String>,
    pub snomed_code: Option<String>,
    pub fma_code: Option<String>,
    pub model_region_id: String,
    pub display_color: String,
    pub common_findings: Vec<String>,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BodySystemListResponse {
    pub systems: Vec<BodySystem>,
    pub total: i64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct LabRecommendation {
    pub id: Uuid,
    #[sqlx(rename = "test_id")]
    pub test_id: Option<Uuid>,
    #[sqlx(rename = "panel_id")]
    pub panel_id: Option<Uuid>,
    #[sqlx(rename = "test_code")]
    pub test_code: Option<String>,
    #[sqlx(rename = "test_name")]
    pub test_name: Option<String>,
    #[sqlx(rename = "panel_code")]
    pub panel_code: Option<String>,
    #[sqlx(rename = "panel_name")]
    pub panel_name: Option<String>,
    pub relevance_score: bigdecimal::BigDecimal,
    pub recommendation_reason: String,
    pub category: Option<String>,
    pub specimen_type: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LabRecommendationResponse {
    pub recommendations: Vec<LabRecommendation>,
    pub body_system_id: Uuid,
    pub body_system_name: String,
}

// ============================================================================
// Handlers
// ============================================================================

/// List all body systems
/// Tiger Style: bounded result, hierarchical structure preserved
pub async fn list_body_systems(
    State(state): State<Arc<AppState>>,
) -> Result<Json<BodySystemListResponse>, ApiError> {
    // Bounded result: max 500 body systems (more than enough for comprehensive anatomy)
    const MAX_SYSTEMS: i64 = 500;

    let systems = tokio::time::timeout(
        std::time::Duration::from_secs(5),
        sqlx::query_as!(
            BodySystem,
            r#"
            SELECT id, system_code, system_name, parent_system_id,
                icd10_chapter, snomed_code, fma_code, model_region_id,
                display_color, common_findings as "common_findings!", is_active,
                created_at, updated_at
            FROM body_systems
            WHERE is_active = true
            ORDER BY system_code
            LIMIT $1
            "#,
            MAX_SYSTEMS
        )
        .fetch_all(state.database_pool.as_ref())
    )
    .await
    .map_err(|_| AppError::Timeout("Query timed out".to_string()))?
    .map_err(|e| AppError::Internal(format!("Failed to fetch body systems: {}", e)))?;

    let total = systems.len() as i64;

    Ok(Json(BodySystemListResponse { systems, total }))
}

/// Get body system by ID
pub async fn get_body_system(
    State(state): State<Arc<AppState>>,
    Path(system_id): Path<Uuid>,
) -> Result<Json<BodySystem>, ApiError> {
    let system = sqlx::query_as!(
        BodySystem,
        r#"
        SELECT id, system_code, system_name, parent_system_id,
            icd10_chapter, snomed_code, fma_code, model_region_id,
            display_color, common_findings as "common_findings!", is_active,
            created_at, updated_at
        FROM body_systems WHERE id = $1 AND is_active = true
        "#,
        system_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to fetch body system: {}", e)))?
    .ok_or_else(|| AppError::NotFound(format!("Body system {} not found", system_id)))?;

    Ok(Json(system))
}

/// Get context-aware lab recommendations for body system
/// Tiger Style: bounded result (max 20 recommendations), sorted by relevance_score
pub async fn get_lab_recommendations(
    State(state): State<Arc<AppState>>,
    Path(system_id): Path<Uuid>,
) -> Result<Json<LabRecommendationResponse>, ApiError> {
    // Assertion 1: Body system must exist
    let system = sqlx::query_as!(
        BodySystem,
        r#"
        SELECT id, system_code, system_name, parent_system_id,
            icd10_chapter, snomed_code, fma_code, model_region_id,
            display_color, common_findings as "common_findings!", is_active,
            created_at, updated_at
        FROM body_systems WHERE id = $1 AND is_active = true
        "#,
        system_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to fetch body system: {}", e)))?
    .ok_or_else(|| AppError::NotFound(format!("Body system {} not found", system_id)))?;

    // Bounded result: max 20 lab recommendations (clinically reasonable)
    const MAX_RECOMMENDATIONS: i64 = 20;

    // Fetch lab test recommendations
    let recommendations = tokio::time::timeout(
        std::time::Duration::from_secs(5),
        sqlx::query_as!(
            LabRecommendation,
            r#"
            SELECT
                bslt.id,
                bslt.lab_test_id as test_id,
                bslt.lab_panel_id as panel_id,
                lt.test_code,
                lt.test_name,
                lp.panel_code,
                lp.panel_name,
                bslt.relevance_score,
                bslt.recommendation_reason,
                lt.category,
                lt.specimen_type
            FROM body_system_lab_tests bslt
            LEFT JOIN lab_tests lt ON bslt.lab_test_id = lt.id
            LEFT JOIN lab_panels lp ON bslt.lab_panel_id = lp.id
            WHERE bslt.body_system_id = $1
              AND bslt.is_active = true
              AND (
                (lt.id IS NOT NULL AND lt.is_active = true)
                OR (lp.id IS NOT NULL AND lp.is_active = true)
              )
            ORDER BY bslt.relevance_score DESC
            LIMIT $2
            "#,
            system_id,
            MAX_RECOMMENDATIONS
        )
        .fetch_all(state.database_pool.as_ref())
    )
    .await
    .map_err(|_| AppError::Timeout("Query timed out".to_string()))?
    .map_err(|e| AppError::Internal(format!("Failed to fetch lab recommendations: {}", e)))?;

    // Assertion 2: Verify results are within bounds
    debug_assert!(
        recommendations.len() as i64 <= MAX_RECOMMENDATIONS,
        "Lab recommendations exceeded maximum limit"
    );

    Ok(Json(LabRecommendationResponse {
        recommendations,
        body_system_id: system.id,
        body_system_name: system.system_name,
    }))
}
