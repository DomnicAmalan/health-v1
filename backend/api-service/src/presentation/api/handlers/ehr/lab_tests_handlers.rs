// Lab Test Catalog Handlers
// Manage laboratory test definitions, panels, and reference ranges

use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info};
use uuid::Uuid;

use super::AppState;
use shared::shared::api_response::{ApiError, ApiResponse};
use shared::shared::error::AppError;

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct LabTestResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub ien: Option<i32>,
    pub test_code: String,
    pub test_name: String,
    pub test_name_short: Option<String>,
    pub loinc_code: Option<String>,
    pub category: String,
    pub specimen_type: String,
    pub specimen_volume: Option<String>,
    pub container_type: Option<String>,
    pub container_color: Option<String>,
    pub turnaround_time_hours: Option<i32>,
    pub requires_fasting: Option<bool>,
    pub result_type: Option<String>,
    pub result_unit: Option<String>,
    pub is_active: Option<bool>,
    pub service_id: Option<Uuid>,
    pub method_name: Option<String>,
    pub department: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LabPanelResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub panel_code: String,
    pub panel_name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub is_active: Option<bool>,
    pub tests: Vec<LabTestResponse>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceRangeResponse {
    pub id: Uuid,
    pub test_id: Uuid,
    pub age_min_years: Option<i32>,
    pub age_max_years: Option<i32>,
    pub gender: Option<String>,
    pub reference_min: Option<sqlx::types::BigDecimal>,
    pub reference_max: Option<sqlx::types::BigDecimal>,
    pub unit: String,
    pub critical_min: Option<sqlx::types::BigDecimal>,
    pub critical_max: Option<sqlx::types::BigDecimal>,
    pub interpretation: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchTestsQuery {
    pub q: Option<String>,  // Search term
    pub category: Option<String>,
    pub specimen_type: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, sqlx::FromRow)]
pub struct LabPanelRow {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub panel_code: String,
    pub panel_name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub is_active: Option<bool>,
}

// ============================================================================
// Handlers
// ============================================================================

/// GET /v1/ehr/lab-tests - List available lab tests
#[tracing::instrument(skip(state))]
pub async fn list_lab_tests(
    State(state): State<Arc<AppState>>,
    Query(query): Query<SearchTestsQuery>,
) -> Result<Json<ApiResponse<Vec<LabTestResponse>>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    info!("Listing lab tests for organization {}", organization_id);

    let limit = query.limit.unwrap_or(100).min(1000);

    let tests = sqlx::query_as!(
        LabTestResponse,
        r#"
        SELECT
            id, organization_id, ien, test_code, test_name, test_name_short,
            loinc_code, category, specimen_type, specimen_volume,
            container_type, container_color, turnaround_time_hours,
            requires_fasting, result_type, result_unit, is_active,
            service_id, method_name, department
        FROM lab_tests
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND is_active = TRUE
          AND ($2::text IS NULL OR category = $2)
          AND ($3::text IS NULL OR specimen_type = $3)
          AND ($4::text IS NULL OR (
              test_name ILIKE '%' || $4 || '%' OR
              test_code ILIKE '%' || $4 || '%'
          ))
        ORDER BY category, test_name
        LIMIT $5
        "#,
        organization_id,
        query.category.as_deref(),
        query.specimen_type.as_deref(),
        query.q.as_deref(),
        limit
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch lab tests: {:?}", e);
        AppError::from(e)
    })?;

    Ok(Json(ApiResponse::success(tests)))
}

/// GET /v1/ehr/lab-tests/:id - Get test details
#[tracing::instrument(skip(state))]
pub async fn get_lab_test(
    State(state): State<Arc<AppState>>,
    Path(test_id): Path<Uuid>,
) -> Result<Json<ApiResponse<LabTestResponse>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    info!("Getting lab test: {}", test_id);

    let test = sqlx::query_as!(
        LabTestResponse,
        r#"
        SELECT
            id, organization_id, ien, test_code, test_name, test_name_short,
            loinc_code, category, specimen_type, specimen_volume,
            container_type, container_color, turnaround_time_hours,
            requires_fasting, result_type, result_unit, is_active,
            service_id, method_name, department
        FROM lab_tests
        WHERE id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
        "#,
        test_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch lab test: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Lab test not found".to_string())
        } else {
            AppError::from(e)
        }
    })?;

    Ok(Json(ApiResponse::success(test)))
}

/// GET /v1/ehr/lab-panels - List available lab panels
#[tracing::instrument(skip(state))]
pub async fn list_lab_panels(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ApiResponse<Vec<LabPanelResponse>>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    info!("Listing lab panels for organization {}", organization_id);

    // Get panels
    let panels = sqlx::query_as!(
        LabPanelRow,
        r#"
        SELECT id, organization_id, panel_code, panel_name, description, category, is_active
        FROM lab_panels
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND is_active = TRUE
        ORDER BY category, panel_name
        "#,
        organization_id
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch lab panels: {:?}", e);
        AppError::from(e)
    })?;

    // For each panel, get its tests
    let mut panel_responses = Vec::new();

    for panel in panels {
        let tests = sqlx::query_as!(
            LabTestResponse,
            r#"
            SELECT
                t.id, t.organization_id, t.ien, t.test_code, t.test_name, t.test_name_short,
                t.loinc_code, t.category, t.specimen_type, t.specimen_volume,
                t.container_type, t.container_color, t.turnaround_time_hours,
                t.requires_fasting, t.result_type, t.result_unit, t.is_active,
                t.service_id, t.method_name, t.department
            FROM lab_tests t
            INNER JOIN lab_panel_tests pt ON pt.test_id = t.id
            WHERE pt.panel_id = $1
            ORDER BY pt.display_order
            "#,
            panel.id
        )
        .fetch_all(state.database_pool.as_ref())
        .await
        .map_err(|e| {
            error!("Failed to fetch panel tests: {:?}", e);
            AppError::from(e)
        })?;

        panel_responses.push(LabPanelResponse {
            id: panel.id,
            organization_id: panel.organization_id,
            panel_code: panel.panel_code,
            panel_name: panel.panel_name,
            description: panel.description,
            category: panel.category,
            is_active: panel.is_active,
            tests,
        });
    }

    Ok(Json(ApiResponse::success(panel_responses)))
}

/// GET /v1/ehr/lab-tests/:id/reference-ranges - Get reference ranges for a test
#[tracing::instrument(skip(state))]
pub async fn get_test_reference_ranges(
    State(state): State<Arc<AppState>>,
    Path(test_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<ReferenceRangeResponse>>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    info!("Getting reference ranges for test: {}", test_id);

    // Verify test belongs to organization
    let _ = sqlx::query_scalar!(
        r#"SELECT id FROM lab_tests WHERE id = $1 AND organization_id = $2"#,
        test_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Test not found or access denied: {:?}", e);
        AppError::NotFound("Lab test not found".to_string())
    })?;

    let ranges = sqlx::query_as!(
        ReferenceRangeResponse,
        r#"
        SELECT
            id, test_id, age_min_years, age_max_years, gender,
            reference_min, reference_max, unit,
            critical_min, critical_max, interpretation
        FROM lab_reference_ranges
        WHERE test_id = $1
        ORDER BY
            CASE gender
                WHEN 'all' THEN 1
                WHEN 'male' THEN 2
                WHEN 'female' THEN 3
            END,
            age_min_years NULLS FIRST
        "#,
        test_id
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch reference ranges: {:?}", e);
        AppError::from(e)
    })?;

    Ok(Json(ApiResponse::success(ranges)))
}

/// GET /v1/ehr/lab-tests/categories - List test categories
#[tracing::instrument(skip(state))]
pub async fn list_test_categories(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ApiResponse<Vec<String>>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    info!("Listing lab test categories");

    let categories: Vec<String> = sqlx::query_scalar!(
        r#"
        SELECT DISTINCT category
        FROM lab_tests
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND is_active = TRUE
        ORDER BY category
        "#,
        organization_id
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch categories: {:?}", e);
        AppError::from(e)
    })?;

    Ok(Json(ApiResponse::success(categories)))
}
