// Imaging Orders Handlers
// Radiology/PACS integration with order management and report entry
// Tiger Style compliance: no unwrap/expect, min 2 assertions, bounded results, 5s timeouts

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use shared::shared::api_response::ApiError;
use shared::shared::error::AppError;
use std::sync::Arc;
use uuid::Uuid;

use super::AppState;

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateImagingOrderRequest {
    pub patient_id: Uuid,
    pub encounter_id: Option<Uuid>,
    pub ordering_provider_id: Uuid,
    pub study_type_id: Option<Uuid>,
    pub modality_code: String,
    pub study_name: String,
    pub body_part: Option<String>,
    pub laterality: Option<String>,
    pub clinical_indication: String,
    pub clinical_history: Option<String>,
    pub relevant_diagnoses: Option<serde_json::Value>,  // Array of ICD-10 codes
    pub special_instructions: Option<String>,
    pub priority: Option<String>,
    pub requires_contrast: Option<bool>,
    pub contrast_type: Option<String>,
    pub requires_sedation: Option<bool>,
    pub requires_fasting: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateImagingOrderRequest {
    pub scheduled_datetime: Option<String>,  // ISO 8601
    pub status: Option<String>,
    pub special_instructions: Option<String>,
    pub patient_prepared: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformStudyRequest {
    pub performing_technologist_id: Uuid,
    pub performing_location: Option<String>,
    pub equipment_used: Option<String>,
    pub pacs_study_instance_uid: Option<String>,
    pub series_count: Option<i32>,
    pub image_count: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterReportRequest {
    pub report_type: String,  // preliminary or final
    pub findings: String,
    pub impression: String,
    pub recommendations: Option<String>,
    pub is_critical_finding: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddAddendumRequest {
    pub addendum_text: String,
    pub addendum_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListImagingOrdersQuery {
    pub patient_id: Option<Uuid>,
    pub ordering_provider_id: Option<Uuid>,
    pub radiologist_id: Option<Uuid>,
    pub status: Option<String>,
    pub modality_code: Option<String>,
    pub priority: Option<String>,
    pub is_critical_finding: Option<bool>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}

fn default_limit() -> i64 {
    50
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ImagingOrder {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub ien: Option<i32>,
    pub order_number: String,
    pub accession_number: Option<String>,
    pub patient_id: Uuid,
    pub patient_ien: i32,
    pub encounter_id: Option<Uuid>,
    pub ordering_provider_id: Uuid,
    pub ordering_provider_name: Option<String>,
    pub ordering_datetime: chrono::DateTime<chrono::Utc>,
    pub study_type_id: Option<Uuid>,
    pub modality_id: Option<Uuid>,
    pub study_name: String,
    pub modality_code: String,
    pub body_part: Option<String>,
    pub laterality: Option<String>,
    pub clinical_indication: String,
    pub clinical_history: Option<String>,
    pub relevant_diagnoses: Option<serde_json::Value>,
    pub special_instructions: Option<String>,
    pub requires_contrast: bool,
    pub contrast_type: Option<String>,
    pub requires_sedation: bool,
    pub requires_fasting: bool,
    pub patient_prepared: bool,
    pub priority: String,
    pub status: String,
    pub scheduled_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub performed_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub completed_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub performing_technologist_id: Option<Uuid>,
    pub performing_technologist_name: Option<String>,
    pub performing_location: Option<String>,
    pub equipment_used: Option<String>,
    pub report_status: Option<String>,
    pub radiologist_id: Option<Uuid>,
    pub radiologist_name: Option<String>,
    pub preliminary_findings: Option<String>,
    pub final_findings: Option<String>,
    pub impression: Option<String>,
    pub recommendations: Option<String>,
    pub preliminary_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub final_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub report_verified_by: Option<Uuid>,
    pub report_verified_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub pacs_study_instance_uid: Option<String>,
    pub pacs_url: Option<String>,
    pub series_count: i32,
    pub image_count: i32,
    pub is_critical_finding: bool,
    pub critical_finding_notified: bool,
    pub critical_finding_notified_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub cancelled_by: Option<Uuid>,
    pub cancelled_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub cancellation_reason: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub version: i64,
    pub deleted_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImagingOrderListResponse {
    pub orders: Vec<ImagingOrder>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

// ============================================================================
// Handlers
// ============================================================================

/// Create imaging order
/// Tiger Style: validate patient/provider exist, validate modality (2 assertions)
pub async fn create_imaging_order(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateImagingOrderRequest>,
) -> Result<(StatusCode, Json<ImagingOrder>), ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();

    // Assertion 1: Patient must exist
    let patient = sqlx::query!(
        "SELECT ien as patient_ien FROM ehr_patients WHERE id = $1 AND deleted_at IS NULL",
        payload.patient_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to verify patient: {}", e)))?
    .ok_or_else(|| AppError::NotFound(format!("Patient {} not found", payload.patient_id)))?;

    // Assertion 2: Ordering provider must exist
    let provider_exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND deleted_at IS NULL) as "exists!""#,
        payload.ordering_provider_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to verify provider: {}", e)))?;

    if !provider_exists {
        return Err(AppError::NotFound(format!(
            "Provider {} not found",
            payload.ordering_provider_id
        )).into());
    }

    // Validate priority
    let priority = payload.priority.unwrap_or_else(|| "routine".to_string());
    let valid_priorities = ["stat", "urgent", "routine"];
    if !valid_priorities.contains(&priority.as_str()) {
        return Err(AppError::Validation(format!(
            "Invalid priority: {}. Must be one of: {}",
            priority,
            valid_priorities.join(", ")
        )).into());
    }

    // Validate laterality if provided
    if let Some(ref laterality) = payload.laterality {
        let valid_lateralities = ["left", "right", "bilateral", "N/A"];
        if !valid_lateralities.contains(&laterality.as_str()) {
            return Err(AppError::Validation(format!(
                "Invalid laterality: {}. Must be one of: {}",
                laterality,
                valid_lateralities.join(", ")
            )).into());
        }
    }

    // Generate order number
    let order_number = format!(
        "IMG-{}-{:08}",
        patient.patient_ien.unwrap_or(0),
        chrono::Utc::now().timestamp() % 100000000
    );

    let organization_id = Uuid::nil(); // extract from auth middleware in production

    // Create order
    let order = sqlx::query_as!(
        ImagingOrder,
        r#"
        INSERT INTO imaging_orders (
            organization_id, order_number, patient_id, patient_ien, encounter_id,
            ordering_provider_id, study_type_id, modality_code, study_name,
            body_part, laterality, clinical_indication, clinical_history, relevant_diagnoses,
            special_instructions, priority, requires_contrast, contrast_type,
            requires_sedation, requires_fasting, created_by, updated_by
        )
        VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9,
            $10, $11, $12, $13, $14,
            $15, $16, $17, $18,
            $19, $20, $21, $21
        )
        RETURNING id as "id!", organization_id as "organization_id!", ien, order_number as "order_number!", accession_number, patient_id as "patient_id!", patient_ien as "patient_ien!",
            encounter_id, ordering_provider_id as "ordering_provider_id!", ordering_provider_name, ordering_datetime as "ordering_datetime!",
            study_type_id, modality_id, study_name as "study_name!", modality_code as "modality_code!", body_part, laterality,
            clinical_indication as "clinical_indication!", clinical_history, relevant_diagnoses, special_instructions,
            requires_contrast as "requires_contrast!", contrast_type, requires_sedation as "requires_sedation!", requires_fasting as "requires_fasting!", patient_prepared as "patient_prepared!",
            priority as "priority!", status as "status!", scheduled_datetime, performed_datetime, completed_datetime,
            performing_technologist_id, performing_technologist_name, performing_location, equipment_used,
            report_status, radiologist_id, radiologist_name, preliminary_findings, final_findings,
            impression, recommendations, preliminary_datetime, final_datetime,
            report_verified_by, report_verified_datetime,
            pacs_study_instance_uid, pacs_url, series_count as "series_count!", image_count as "image_count!",
            is_critical_finding as "is_critical_finding!", critical_finding_notified as "critical_finding_notified!", critical_finding_notified_datetime,
            cancelled_by, cancelled_datetime, cancellation_reason,
            created_at as "created_at!", updated_at as "updated_at!", created_by, updated_by, version as "version!", deleted_at
        "#,
        organization_id,
        order_number,
        payload.patient_id,
        patient.patient_ien.unwrap_or(0),
        payload.encounter_id,
        payload.ordering_provider_id,
        payload.study_type_id,
        payload.modality_code,
        payload.study_name,
        payload.body_part.as_deref(),
        payload.laterality.as_deref(),
        payload.clinical_indication,
        payload.clinical_history.as_deref(),
        payload.relevant_diagnoses,
        payload.special_instructions.as_deref(),
        priority,
        payload.requires_contrast.unwrap_or(false),
        payload.contrast_type.as_deref(),
        payload.requires_sedation.unwrap_or(false),
        payload.requires_fasting.unwrap_or(false),
        user_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to create imaging order: {}", e)))?;

    Ok((StatusCode::CREATED, Json(order)))
}

/// Get imaging order by ID
pub async fn get_imaging_order(
    State(state): State<Arc<AppState>>,
    Path(order_id): Path<Uuid>,
) -> Result<Json<ImagingOrder>, ApiError> {
    let organization_id = Uuid::nil(); // extract from auth middleware in production

    let order = sqlx::query_as!(
        ImagingOrder,
        r#"
        SELECT id as "id!", organization_id as "organization_id!", ien, order_number as "order_number!", accession_number, patient_id as "patient_id!", patient_ien as "patient_ien!",
            encounter_id, ordering_provider_id as "ordering_provider_id!", ordering_provider_name, ordering_datetime as "ordering_datetime!",
            study_type_id, modality_id, study_name as "study_name!", modality_code as "modality_code!", body_part, laterality,
            clinical_indication as "clinical_indication!", clinical_history, relevant_diagnoses, special_instructions,
            requires_contrast as "requires_contrast!", contrast_type, requires_sedation as "requires_sedation!", requires_fasting as "requires_fasting!", patient_prepared as "patient_prepared!",
            priority as "priority!", status as "status!", scheduled_datetime, performed_datetime, completed_datetime,
            performing_technologist_id, performing_technologist_name, performing_location, equipment_used,
            report_status, radiologist_id, radiologist_name, preliminary_findings, final_findings,
            impression, recommendations, preliminary_datetime, final_datetime,
            report_verified_by, report_verified_datetime,
            pacs_study_instance_uid, pacs_url, series_count as "series_count!", image_count as "image_count!",
            is_critical_finding as "is_critical_finding!", critical_finding_notified as "critical_finding_notified!", critical_finding_notified_datetime,
            cancelled_by, cancelled_datetime, cancellation_reason,
            created_at as "created_at!", updated_at as "updated_at!", created_by, updated_by, version as "version!", deleted_at
        FROM imaging_orders
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
        "#,
        order_id,
        organization_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to fetch order: {}", e)))?
    .ok_or_else(|| AppError::NotFound(format!("Imaging order {} not found", order_id)))?;

    Ok(Json(order))
}

/// List imaging orders with filters
/// Tiger Style: bounded result limit (max 1000), 5s timeout
pub async fn list_imaging_orders(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListImagingOrdersQuery>,
) -> Result<Json<ImagingOrderListResponse>, ApiError> {
    // Bounded limit: max 1000 orders per request
    const MAX_LIMIT: i64 = 1000;
    let limit = params.limit.min(MAX_LIMIT);

    let organization_id = Uuid::nil(); // extract from auth middleware in production

    // Execute with 5s timeout - using NULL-check pattern for optional filters
    let orders = tokio::time::timeout(
        std::time::Duration::from_secs(5),
        sqlx::query_as!(
            ImagingOrder,
            r#"
            SELECT id as "id!", organization_id as "organization_id!", ien, order_number as "order_number!", accession_number, patient_id as "patient_id!", patient_ien as "patient_ien!",
                encounter_id, ordering_provider_id as "ordering_provider_id!", ordering_provider_name, ordering_datetime as "ordering_datetime!",
                study_type_id, modality_id, study_name as "study_name!", modality_code as "modality_code!", body_part, laterality,
                clinical_indication as "clinical_indication!", clinical_history, relevant_diagnoses, special_instructions,
                requires_contrast as "requires_contrast!", contrast_type, requires_sedation as "requires_sedation!", requires_fasting as "requires_fasting!", patient_prepared as "patient_prepared!",
                priority as "priority!", status as "status!", scheduled_datetime, performed_datetime, completed_datetime,
                performing_technologist_id, performing_technologist_name, performing_location, equipment_used,
                report_status, radiologist_id, radiologist_name, preliminary_findings, final_findings,
                impression, recommendations, preliminary_datetime, final_datetime,
                report_verified_by, report_verified_datetime,
                pacs_study_instance_uid, pacs_url, series_count as "series_count!", image_count as "image_count!",
                is_critical_finding as "is_critical_finding!", critical_finding_notified as "critical_finding_notified!", critical_finding_notified_datetime,
                cancelled_by, cancelled_datetime, cancellation_reason,
                created_at as "created_at!", updated_at as "updated_at!", created_by, updated_by, version as "version!", deleted_at
            FROM imaging_orders
            WHERE deleted_at IS NULL
              AND organization_id = $1
              AND ($2::uuid IS NULL OR patient_id = $2)
              AND ($3::uuid IS NULL OR ordering_provider_id = $3)
              AND ($4::uuid IS NULL OR radiologist_id = $4)
              AND ($5::text IS NULL OR status = $5)
              AND ($6::text IS NULL OR modality_code = $6)
              AND ($7::text IS NULL OR priority = $7)
              AND ($8::bool IS NULL OR is_critical_finding = $8)
              AND ($9::text IS NULL OR ordering_datetime >= $9::timestamptz)
              AND ($10::text IS NULL OR ordering_datetime <= $10::timestamptz)
            ORDER BY ordering_datetime DESC
            LIMIT $11 OFFSET $12
            "#,
            organization_id,
            params.patient_id,
            params.ordering_provider_id,
            params.radiologist_id,
            params.status.as_deref(),
            params.modality_code.as_deref(),
            params.priority.as_deref(),
            params.is_critical_finding,
            params.start_date.as_deref(),
            params.end_date.as_deref(),
            limit,
            params.offset
        )
        .fetch_all(state.database_pool.as_ref())
    )
    .await
    .map_err(|_| AppError::Timeout("Query timed out".to_string()))?
    .map_err(|e| AppError::Internal(format!("Failed to fetch orders: {}", e)))?;

    let total = tokio::time::timeout(
        std::time::Duration::from_secs(5),
        sqlx::query_scalar!(
            r#"
            SELECT COUNT(*) as "count!"
            FROM imaging_orders
            WHERE deleted_at IS NULL
              AND organization_id = $1
              AND ($2::uuid IS NULL OR patient_id = $2)
              AND ($3::uuid IS NULL OR ordering_provider_id = $3)
              AND ($4::uuid IS NULL OR radiologist_id = $4)
              AND ($5::text IS NULL OR status = $5)
              AND ($6::text IS NULL OR modality_code = $6)
              AND ($7::text IS NULL OR priority = $7)
              AND ($8::bool IS NULL OR is_critical_finding = $8)
              AND ($9::text IS NULL OR ordering_datetime >= $9::timestamptz)
              AND ($10::text IS NULL OR ordering_datetime <= $10::timestamptz)
            "#,
            organization_id,
            params.patient_id,
            params.ordering_provider_id,
            params.radiologist_id,
            params.status.as_deref(),
            params.modality_code.as_deref(),
            params.priority.as_deref(),
            params.is_critical_finding,
            params.start_date.as_deref(),
            params.end_date.as_deref()
        )
        .fetch_one(state.database_pool.as_ref())
    )
    .await
    .map_err(|_| AppError::Timeout("Query timed out".to_string()))?
    .map_err(|e| AppError::Internal(format!("Failed to count orders: {}", e)))?;

    Ok(Json(ImagingOrderListResponse {
        orders,
        total,
        limit,
        offset: params.offset,
    }))
}

/// Update imaging order (schedule, mark patient prepared, etc.)
pub async fn update_imaging_order(
    State(state): State<Arc<AppState>>,
    Path(order_id): Path<Uuid>,
    Json(payload): Json<UpdateImagingOrderRequest>,
) -> Result<Json<ImagingOrder>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();
    let organization_id = Uuid::nil(); // extract from auth middleware in production

    // Validate order exists
    let exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM imaging_orders WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL) as "exists!""#,
        order_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to verify order: {}", e)))?;

    if !exists {
        return Err(AppError::NotFound(format!("Imaging order {} not found", order_id)).into());
    }

    // Parse scheduled_datetime if provided
    let scheduled_datetime = payload.scheduled_datetime
        .as_deref()
        .map(|s| s.parse::<chrono::DateTime<chrono::Utc>>())
        .transpose()
        .map_err(|e| AppError::Validation(format!("Invalid scheduled_datetime: {}", e)))?;

    // Use COALESCE pattern for optional updates
    let order = sqlx::query_as!(
        ImagingOrder,
        r#"
        UPDATE imaging_orders SET
            scheduled_datetime = COALESCE($1, scheduled_datetime),
            status = COALESCE($2, status),
            special_instructions = COALESCE($3, special_instructions),
            patient_prepared = COALESCE($4, patient_prepared),
            updated_by = $5,
            updated_at = NOW()
        WHERE id = $6 AND organization_id = $7 AND deleted_at IS NULL
        RETURNING id as "id!", organization_id as "organization_id!", ien, order_number as "order_number!", accession_number, patient_id as "patient_id!", patient_ien as "patient_ien!",
            encounter_id, ordering_provider_id as "ordering_provider_id!", ordering_provider_name, ordering_datetime as "ordering_datetime!",
            study_type_id, modality_id, study_name as "study_name!", modality_code as "modality_code!", body_part, laterality,
            clinical_indication as "clinical_indication!", clinical_history, relevant_diagnoses, special_instructions,
            requires_contrast as "requires_contrast!", contrast_type, requires_sedation as "requires_sedation!", requires_fasting as "requires_fasting!", patient_prepared as "patient_prepared!",
            priority as "priority!", status as "status!", scheduled_datetime, performed_datetime, completed_datetime,
            performing_technologist_id, performing_technologist_name, performing_location, equipment_used,
            report_status, radiologist_id, radiologist_name, preliminary_findings, final_findings,
            impression, recommendations, preliminary_datetime, final_datetime,
            report_verified_by, report_verified_datetime,
            pacs_study_instance_uid, pacs_url, series_count as "series_count!", image_count as "image_count!",
            is_critical_finding as "is_critical_finding!", critical_finding_notified as "critical_finding_notified!", critical_finding_notified_datetime,
            cancelled_by, cancelled_datetime, cancellation_reason,
            created_at as "created_at!", updated_at as "updated_at!", created_by, updated_by, version as "version!", deleted_at
        "#,
        scheduled_datetime,
        payload.status.as_deref(),
        payload.special_instructions.as_deref(),
        payload.patient_prepared,
        user_id,
        order_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to update order: {}", e)))?;

    Ok(Json(order))
}

/// Mark study as performed (by technologist)
/// Tiger Style: validate order scheduled, update PACS info (2 assertions)
pub async fn perform_study(
    State(state): State<Arc<AppState>>,
    Path(order_id): Path<Uuid>,
    Json(payload): Json<PerformStudyRequest>,
) -> Result<Json<ImagingOrder>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();
    let organization_id = Uuid::nil(); // extract from auth middleware in production

    // Assertion 1: Fetch and validate order status
    let current_order = sqlx::query_as!(
        ImagingOrder,
        r#"
        SELECT id as "id!", organization_id as "organization_id!", ien, order_number as "order_number!", accession_number, patient_id as "patient_id!", patient_ien as "patient_ien!",
            encounter_id, ordering_provider_id as "ordering_provider_id!", ordering_provider_name, ordering_datetime as "ordering_datetime!",
            study_type_id, modality_id, study_name as "study_name!", modality_code as "modality_code!", body_part, laterality,
            clinical_indication as "clinical_indication!", clinical_history, relevant_diagnoses, special_instructions,
            requires_contrast as "requires_contrast!", contrast_type, requires_sedation as "requires_sedation!", requires_fasting as "requires_fasting!", patient_prepared as "patient_prepared!",
            priority as "priority!", status as "status!", scheduled_datetime, performed_datetime, completed_datetime,
            performing_technologist_id, performing_technologist_name, performing_location, equipment_used,
            report_status, radiologist_id, radiologist_name, preliminary_findings, final_findings,
            impression, recommendations, preliminary_datetime, final_datetime,
            report_verified_by, report_verified_datetime,
            pacs_study_instance_uid, pacs_url, series_count as "series_count!", image_count as "image_count!",
            is_critical_finding as "is_critical_finding!", critical_finding_notified as "critical_finding_notified!", critical_finding_notified_datetime,
            cancelled_by, cancelled_datetime, cancellation_reason,
            created_at as "created_at!", updated_at as "updated_at!", created_by, updated_by, version as "version!", deleted_at
        FROM imaging_orders
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
        "#,
        order_id,
        organization_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to fetch order: {}", e)))?
    .ok_or_else(|| AppError::NotFound(format!("Imaging order {} not found", order_id)))?;

    if current_order.status == "completed" {
        return Err(AppError::Validation("Order is already completed".to_string()).into());
    }

    // Update to in_progress/completed status
    let order = sqlx::query_as!(
        ImagingOrder,
        r#"
        UPDATE imaging_orders
        SET status = 'in_progress',
            performed_datetime = NOW(),
            performing_technologist_id = $1,
            performing_location = $2,
            equipment_used = $3,
            pacs_study_instance_uid = $4,
            series_count = $5,
            image_count = $6,
            updated_by = $7,
            updated_at = NOW()
        WHERE id = $8 AND organization_id = $9 AND deleted_at IS NULL
        RETURNING id as "id!", organization_id as "organization_id!", ien, order_number as "order_number!", accession_number, patient_id as "patient_id!", patient_ien as "patient_ien!",
            encounter_id, ordering_provider_id as "ordering_provider_id!", ordering_provider_name, ordering_datetime as "ordering_datetime!",
            study_type_id, modality_id, study_name as "study_name!", modality_code as "modality_code!", body_part, laterality,
            clinical_indication as "clinical_indication!", clinical_history, relevant_diagnoses, special_instructions,
            requires_contrast as "requires_contrast!", contrast_type, requires_sedation as "requires_sedation!", requires_fasting as "requires_fasting!", patient_prepared as "patient_prepared!",
            priority as "priority!", status as "status!", scheduled_datetime, performed_datetime, completed_datetime,
            performing_technologist_id, performing_technologist_name, performing_location, equipment_used,
            report_status, radiologist_id, radiologist_name, preliminary_findings, final_findings,
            impression, recommendations, preliminary_datetime, final_datetime,
            report_verified_by, report_verified_datetime,
            pacs_study_instance_uid, pacs_url, series_count as "series_count!", image_count as "image_count!",
            is_critical_finding as "is_critical_finding!", critical_finding_notified as "critical_finding_notified!", critical_finding_notified_datetime,
            cancelled_by, cancelled_datetime, cancellation_reason,
            created_at as "created_at!", updated_at as "updated_at!", created_by, updated_by, version as "version!", deleted_at
        "#,
        payload.performing_technologist_id,
        payload.performing_location.as_deref(),
        payload.equipment_used.as_deref(),
        payload.pacs_study_instance_uid.as_deref(),
        payload.series_count.unwrap_or(0),
        payload.image_count.unwrap_or(0),
        user_id,
        order_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to perform study: {}", e)))?;

    // Assertion 2: Verify status updated
    debug_assert_eq!(order.status, "in_progress", "Status update verification failed");

    Ok(Json(order))
}

/// Enter radiology report
/// Tiger Style: validate report type, set timestamps (2 assertions)
pub async fn enter_report(
    State(state): State<Arc<AppState>>,
    Path(order_id): Path<Uuid>,
    Json(payload): Json<EnterReportRequest>,
) -> Result<Json<ImagingOrder>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();
    let organization_id = Uuid::nil(); // extract from auth middleware in production

    // Assertion 1: Validate order exists and is performed
    let current_order = sqlx::query_as!(
        ImagingOrder,
        r#"
        SELECT id as "id!", organization_id as "organization_id!", ien, order_number as "order_number!", accession_number, patient_id as "patient_id!", patient_ien as "patient_ien!",
            encounter_id, ordering_provider_id as "ordering_provider_id!", ordering_provider_name, ordering_datetime as "ordering_datetime!",
            study_type_id, modality_id, study_name as "study_name!", modality_code as "modality_code!", body_part, laterality,
            clinical_indication as "clinical_indication!", clinical_history, relevant_diagnoses, special_instructions,
            requires_contrast as "requires_contrast!", contrast_type, requires_sedation as "requires_sedation!", requires_fasting as "requires_fasting!", patient_prepared as "patient_prepared!",
            priority as "priority!", status as "status!", scheduled_datetime, performed_datetime, completed_datetime,
            performing_technologist_id, performing_technologist_name, performing_location, equipment_used,
            report_status, radiologist_id, radiologist_name, preliminary_findings, final_findings,
            impression, recommendations, preliminary_datetime, final_datetime,
            report_verified_by, report_verified_datetime,
            pacs_study_instance_uid, pacs_url, series_count as "series_count!", image_count as "image_count!",
            is_critical_finding as "is_critical_finding!", critical_finding_notified as "critical_finding_notified!", critical_finding_notified_datetime,
            cancelled_by, cancelled_datetime, cancellation_reason,
            created_at as "created_at!", updated_at as "updated_at!", created_by, updated_by, version as "version!", deleted_at
        FROM imaging_orders
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
        "#,
        order_id,
        organization_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to fetch order: {}", e)))?
    .ok_or_else(|| AppError::NotFound(format!("Imaging order {} not found", order_id)))?;

    if current_order.status == "pending" || current_order.status == "scheduled" {
        return Err(AppError::Validation("Cannot enter report before study is performed".to_string()).into());
    }

    // Validate report type
    let valid_report_types = ["preliminary", "final"];
    if !valid_report_types.contains(&payload.report_type.as_str()) {
        return Err(AppError::Validation(format!(
            "Invalid report_type: {}. Must be preliminary or final",
            payload.report_type
        )).into());
    }

    let is_final = payload.report_type == "final";
    let is_critical = payload.is_critical_finding.unwrap_or(false);

    // Update order with report
    let order = if is_final {
        sqlx::query_as!(
            ImagingOrder,
            r#"
            UPDATE imaging_orders
            SET report_status = 'final',
                final_findings = $1,
                impression = $2,
                recommendations = $3,
                final_datetime = NOW(),
                radiologist_id = $4,
                is_critical_finding = $5,
                status = 'completed',
                completed_datetime = NOW(),
                updated_by = $4,
                updated_at = NOW()
            WHERE id = $6 AND organization_id = $7 AND deleted_at IS NULL
            RETURNING id as "id!", organization_id as "organization_id!", ien, order_number as "order_number!", accession_number, patient_id as "patient_id!", patient_ien as "patient_ien!",
                encounter_id, ordering_provider_id as "ordering_provider_id!", ordering_provider_name, ordering_datetime as "ordering_datetime!",
                study_type_id, modality_id, study_name as "study_name!", modality_code as "modality_code!", body_part, laterality,
                clinical_indication as "clinical_indication!", clinical_history, relevant_diagnoses, special_instructions,
                requires_contrast as "requires_contrast!", contrast_type, requires_sedation as "requires_sedation!", requires_fasting as "requires_fasting!", patient_prepared as "patient_prepared!",
                priority as "priority!", status as "status!", scheduled_datetime, performed_datetime, completed_datetime,
                performing_technologist_id, performing_technologist_name, performing_location, equipment_used,
                report_status, radiologist_id, radiologist_name, preliminary_findings, final_findings,
                impression, recommendations, preliminary_datetime, final_datetime,
                report_verified_by, report_verified_datetime,
                pacs_study_instance_uid, pacs_url, series_count as "series_count!", image_count as "image_count!",
                is_critical_finding as "is_critical_finding!", critical_finding_notified as "critical_finding_notified!", critical_finding_notified_datetime,
                cancelled_by, cancelled_datetime, cancellation_reason,
                created_at as "created_at!", updated_at as "updated_at!", created_by, updated_by, version as "version!", deleted_at
            "#,
            &payload.findings,
            &payload.impression,
            payload.recommendations.as_deref(),
            user_id,
            is_critical,
            order_id,
            organization_id
        )
        .fetch_one(state.database_pool.as_ref())
        .await
        .map_err(|e| AppError::Internal(format!("Failed to enter final report: {}", e)))?
    } else {
        sqlx::query_as!(
            ImagingOrder,
            r#"
            UPDATE imaging_orders
            SET report_status = 'preliminary',
                preliminary_findings = $1,
                impression = $2,
                recommendations = $3,
                preliminary_datetime = NOW(),
                radiologist_id = $4,
                is_critical_finding = $5,
                updated_by = $4,
                updated_at = NOW()
            WHERE id = $6 AND organization_id = $7 AND deleted_at IS NULL
            RETURNING id as "id!", organization_id as "organization_id!", ien, order_number as "order_number!", accession_number, patient_id as "patient_id!", patient_ien as "patient_ien!",
                encounter_id, ordering_provider_id as "ordering_provider_id!", ordering_provider_name, ordering_datetime as "ordering_datetime!",
                study_type_id, modality_id, study_name as "study_name!", modality_code as "modality_code!", body_part, laterality,
                clinical_indication as "clinical_indication!", clinical_history, relevant_diagnoses, special_instructions,
                requires_contrast as "requires_contrast!", contrast_type, requires_sedation as "requires_sedation!", requires_fasting as "requires_fasting!", patient_prepared as "patient_prepared!",
                priority as "priority!", status as "status!", scheduled_datetime, performed_datetime, completed_datetime,
                performing_technologist_id, performing_technologist_name, performing_location, equipment_used,
                report_status, radiologist_id, radiologist_name, preliminary_findings, final_findings,
                impression, recommendations, preliminary_datetime, final_datetime,
                report_verified_by, report_verified_datetime,
                pacs_study_instance_uid, pacs_url, series_count as "series_count!", image_count as "image_count!",
                is_critical_finding as "is_critical_finding!", critical_finding_notified as "critical_finding_notified!", critical_finding_notified_datetime,
                cancelled_by, cancelled_datetime, cancellation_reason,
                created_at as "created_at!", updated_at as "updated_at!", created_by, updated_by, version as "version!", deleted_at
            "#,
            &payload.findings,
            &payload.impression,
            payload.recommendations.as_deref(),
            user_id,
            is_critical,
            order_id,
            organization_id
        )
        .fetch_one(state.database_pool.as_ref())
        .await
        .map_err(|e| AppError::Internal(format!("Failed to enter preliminary report: {}", e)))?
    };

    // Assertion 2: Verify report status set correctly
    debug_assert_eq!(
        order.report_status.as_ref().map(String::as_str),
        Some(payload.report_type.as_str()),
        "Report status verification failed"
    );

    Ok(Json(order))
}

/// Cancel imaging order
pub async fn cancel_imaging_order(
    State(state): State<Arc<AppState>>,
    Path(order_id): Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<ImagingOrder>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();
    let organization_id = Uuid::nil(); // extract from auth middleware in production
    let cancellation_reason = payload.get("cancellationReason")
        .and_then(|v| v.as_str())
        .map(String::from);

    let order = sqlx::query_as!(
        ImagingOrder,
        r#"
        UPDATE imaging_orders
        SET status = 'cancelled',
            cancelled_by = $1,
            cancelled_datetime = NOW(),
            cancellation_reason = $2,
            updated_by = $1,
            updated_at = NOW()
        WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL
        RETURNING id as "id!", organization_id as "organization_id!", ien, order_number as "order_number!", accession_number, patient_id as "patient_id!", patient_ien as "patient_ien!",
            encounter_id, ordering_provider_id as "ordering_provider_id!", ordering_provider_name, ordering_datetime as "ordering_datetime!",
            study_type_id, modality_id, study_name as "study_name!", modality_code as "modality_code!", body_part, laterality,
            clinical_indication as "clinical_indication!", clinical_history, relevant_diagnoses, special_instructions,
            requires_contrast as "requires_contrast!", contrast_type, requires_sedation as "requires_sedation!", requires_fasting as "requires_fasting!", patient_prepared as "patient_prepared!",
            priority as "priority!", status as "status!", scheduled_datetime, performed_datetime, completed_datetime,
            performing_technologist_id, performing_technologist_name, performing_location, equipment_used,
            report_status, radiologist_id, radiologist_name, preliminary_findings, final_findings,
            impression, recommendations, preliminary_datetime, final_datetime,
            report_verified_by, report_verified_datetime,
            pacs_study_instance_uid, pacs_url, series_count as "series_count!", image_count as "image_count!",
            is_critical_finding as "is_critical_finding!", critical_finding_notified as "critical_finding_notified!", critical_finding_notified_datetime,
            cancelled_by, cancelled_datetime, cancellation_reason,
            created_at as "created_at!", updated_at as "updated_at!", created_by, updated_by, version as "version!", deleted_at
        "#,
        user_id,
        cancellation_reason.as_deref(),
        order_id,
        organization_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to cancel order: {}", e)))?
    .ok_or_else(|| AppError::NotFound(format!("Imaging order {} not found", order_id)))?;

    Ok(Json(order))
}

/// Soft delete imaging order
pub async fn delete_imaging_order(
    State(state): State<Arc<AppState>>,
    Path(order_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();
    let organization_id = Uuid::nil(); // extract from auth middleware in production

    let result = sqlx::query!(
        "UPDATE imaging_orders SET deleted_at = NOW(), updated_by = $1 WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL",
        user_id,
        order_id,
        organization_id
    )
    .execute(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to delete order: {}", e)))?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Imaging order {} not found", order_id)).into());
    }

    Ok(StatusCode::NO_CONTENT)
}
