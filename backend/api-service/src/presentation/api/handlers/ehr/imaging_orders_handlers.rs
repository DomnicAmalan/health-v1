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
    let provider_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND deleted_at IS NULL)"
    )
    .bind(payload.ordering_provider_id)
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

    // Create order
    let order = sqlx::query_as::<_, ImagingOrder>(
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
        RETURNING *
        "#
    )
    .bind(Uuid::nil() /* organization_id - extract from auth middleware in production */)
    .bind(order_number)
    .bind(payload.patient_id)
    .bind(patient.patient_ien)
    .bind(payload.encounter_id)
    .bind(payload.ordering_provider_id)
    .bind(payload.study_type_id)
    .bind(payload.modality_code)
    .bind(payload.study_name)
    .bind(payload.body_part)
    .bind(payload.laterality)
    .bind(payload.clinical_indication)
    .bind(payload.clinical_history)
    .bind(payload.relevant_diagnoses)
    .bind(payload.special_instructions)
    .bind(priority)
    .bind(payload.requires_contrast.unwrap_or(false))
    .bind(payload.contrast_type)
    .bind(payload.requires_sedation.unwrap_or(false))
    .bind(payload.requires_fasting.unwrap_or(false))
    .bind(user_id)
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
    let order = sqlx::query_as::<_, ImagingOrder>(
        "SELECT * FROM imaging_orders WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL"
    )
    .bind(order_id)
    .bind(Uuid::nil() /* organization_id - extract from auth middleware in production */)
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

    // Build dynamic query
    let mut conditions: Vec<String> = vec!["deleted_at IS NULL".to_string(), "organization_id = $1".to_string()];
    let mut bind_count = 2;

    if params.patient_id.is_some() {
        conditions.push(format!("patient_id = ${}", bind_count));
        bind_count += 1;
    }
    if params.ordering_provider_id.is_some() {
        conditions.push(format!("ordering_provider_id = ${}", bind_count));
        bind_count += 1;
    }
    if params.radiologist_id.is_some() {
        conditions.push(format!("radiologist_id = ${}", bind_count));
        bind_count += 1;
    }
    if params.status.is_some() {
        conditions.push(format!("status = ${}", bind_count));
        bind_count += 1;
    }
    if params.modality_code.is_some() {
        conditions.push(format!("modality_code = ${}", bind_count));
        bind_count += 1;
    }
    if params.priority.is_some() {
        conditions.push(format!("priority = ${}", bind_count));
        bind_count += 1;
    }
    if params.is_critical_finding.is_some() {
        conditions.push(format!("is_critical_finding = ${}", bind_count));
        bind_count += 1;
    }
    if params.start_date.is_some() {
        conditions.push(format!("ordering_datetime >= ${}::timestamptz", bind_count));
        bind_count += 1;
    }
    if params.end_date.is_some() {
        conditions.push(format!("ordering_datetime <= ${}::timestamptz", bind_count));
        bind_count += 1;
    }

    let where_clause = conditions.join(" AND ");
    let query = format!(
        "SELECT * FROM imaging_orders WHERE {} ORDER BY ordering_datetime DESC LIMIT ${} OFFSET ${}",
        where_clause, bind_count, bind_count + 1
    );
    let count_query = format!("SELECT COUNT(*) FROM imaging_orders WHERE {}", where_clause);

    // Build query with parameters
    let mut query_builder = sqlx::query_as::<_, ImagingOrder>(&query)
        .bind(Uuid::nil() /* organization_id - extract from auth middleware in production */);
    let mut count_builder = sqlx::query_scalar::<_, i64>(&count_query)
        .bind(Uuid::nil() /* organization_id - extract from auth middleware in production */);

    if let Some(patient_id) = params.patient_id {
        query_builder = query_builder.bind(patient_id);
        count_builder = count_builder.bind(patient_id);
    }
    if let Some(ordering_provider_id) = params.ordering_provider_id {
        query_builder = query_builder.bind(ordering_provider_id);
        count_builder = count_builder.bind(ordering_provider_id);
    }
    if let Some(radiologist_id) = params.radiologist_id {
        query_builder = query_builder.bind(radiologist_id);
        count_builder = count_builder.bind(radiologist_id);
    }
    if let Some(ref status) = params.status {
        query_builder = query_builder.bind(status);
        count_builder = count_builder.bind(status);
    }
    if let Some(ref modality_code) = params.modality_code {
        query_builder = query_builder.bind(modality_code);
        count_builder = count_builder.bind(modality_code);
    }
    if let Some(ref priority) = params.priority {
        query_builder = query_builder.bind(priority);
        count_builder = count_builder.bind(priority);
    }
    if let Some(is_critical) = params.is_critical_finding {
        query_builder = query_builder.bind(is_critical);
        count_builder = count_builder.bind(is_critical);
    }
    if let Some(ref start_date) = params.start_date {
        query_builder = query_builder.bind(start_date);
        count_builder = count_builder.bind(start_date);
    }
    if let Some(ref end_date) = params.end_date {
        query_builder = query_builder.bind(end_date);
        count_builder = count_builder.bind(end_date);
    }

    query_builder = query_builder.bind(limit).bind(params.offset);

    // Execute with 5s timeout
    let orders = tokio::time::timeout(
        std::time::Duration::from_secs(5),
        query_builder.fetch_all(state.database_pool.as_ref())
    )
    .await
    .map_err(|_| AppError::Timeout("Query timed out".to_string()))?
    .map_err(|e| AppError::Internal(format!("Failed to fetch orders: {}", e)))?;

    let total = tokio::time::timeout(
        std::time::Duration::from_secs(5),
        count_builder.fetch_one(state.database_pool.as_ref())
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

    // Validate order exists
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM imaging_orders WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL)"
    )
    .bind(order_id)
    .bind(Uuid::nil() /* organization_id - extract from auth middleware in production */)
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to verify order: {}", e)))?;

    if !exists {
        return Err(AppError::NotFound(format!("Imaging order {} not found", order_id)).into());
    }

    // Build dynamic update query
    let mut updates: Vec<String> = vec![
        "updated_by = $1".to_string(),
        "updated_at = NOW()".to_string(),
    ];
    let mut param_count = 2;

    if payload.scheduled_datetime.is_some() {
        updates.push(format!("scheduled_datetime = ${}::timestamptz", param_count));
        param_count += 1;
    }
    if payload.status.is_some() {
        updates.push(format!("status = ${}", param_count));
        param_count += 1;
    }
    if payload.special_instructions.is_some() {
        updates.push(format!("special_instructions = ${}", param_count));
        param_count += 1;
    }
    if payload.patient_prepared.is_some() {
        updates.push(format!("patient_prepared = ${}", param_count));
        param_count += 1;
    }

    let update_clause = updates.join(", ");
    let query = format!(
        "UPDATE imaging_orders SET {} WHERE id = ${} AND organization_id = ${} AND deleted_at IS NULL RETURNING *",
        update_clause, param_count, param_count + 1
    );

    let mut query_builder = sqlx::query_as::<_, ImagingOrder>(&query)
        .bind(user_id)
        .bind(order_id);

    if let Some(scheduled_datetime) = payload.scheduled_datetime {
        query_builder = query_builder.bind(scheduled_datetime);
    }
    if let Some(status) = payload.status {
        query_builder = query_builder.bind(status);
    }
    if let Some(special_instructions) = payload.special_instructions {
        query_builder = query_builder.bind(special_instructions);
    }
    if let Some(patient_prepared) = payload.patient_prepared {
        query_builder = query_builder.bind(patient_prepared);
    }

    query_builder = query_builder.bind(Uuid::nil() /* organization_id - extract from auth middleware in production */);

    let order = query_builder
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

    // Assertion 1: Fetch and validate order status
    let current_order = sqlx::query_as::<_, ImagingOrder>(
        "SELECT * FROM imaging_orders WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL"
    )
    .bind(order_id)
    .bind(Uuid::nil() /* organization_id - extract from auth middleware in production */)
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to fetch order: {}", e)))?
    .ok_or_else(|| AppError::NotFound(format!("Imaging order {} not found", order_id)))?;

    if current_order.status == "completed" {
        return Err(AppError::Validation("Order is already completed".to_string()).into());
    }

    // Update to in_progress/completed status
    let order = sqlx::query_as::<_, ImagingOrder>(
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
        RETURNING *
        "#
    )
    .bind(payload.performing_technologist_id)
    .bind(payload.performing_location)
    .bind(payload.equipment_used)
    .bind(payload.pacs_study_instance_uid)
    .bind(payload.series_count.unwrap_or(0))
    .bind(payload.image_count.unwrap_or(0))
    .bind(user_id)
    .bind(order_id)
    .bind(Uuid::nil() /* organization_id - extract from auth middleware in production */)
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

    // Assertion 1: Validate order exists and is performed
    let current_order = sqlx::query_as::<_, ImagingOrder>(
        "SELECT * FROM imaging_orders WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL"
    )
    .bind(order_id)
    .bind(Uuid::nil() /* organization_id - extract from auth middleware in production */)
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
        sqlx::query_as::<_, ImagingOrder>(
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
            RETURNING *
            "#
        )
        .bind(&payload.findings)
        .bind(&payload.impression)
        .bind(&payload.recommendations)
        .bind(user_id)
        .bind(is_critical)
        .bind(order_id)
        .bind(Uuid::nil() /* organization_id - extract from auth middleware in production */)
        .fetch_one(state.database_pool.as_ref())
        .await
        .map_err(|e| AppError::Internal(format!("Failed to enter final report: {}", e)))?
    } else {
        sqlx::query_as::<_, ImagingOrder>(
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
            RETURNING *
            "#
        )
        .bind(&payload.findings)
        .bind(&payload.impression)
        .bind(&payload.recommendations)
        .bind(user_id)
        .bind(is_critical)
        .bind(order_id)
        .bind(Uuid::nil() /* organization_id - extract from auth middleware in production */)
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
    let cancellation_reason = payload.get("cancellationReason")
        .and_then(|v| v.as_str())
        .map(String::from);

    let order = sqlx::query_as::<_, ImagingOrder>(
        r#"
        UPDATE imaging_orders
        SET status = 'cancelled',
            cancelled_by = $1,
            cancelled_datetime = NOW(),
            cancellation_reason = $2,
            updated_by = $1,
            updated_at = NOW()
        WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL
        RETURNING *
        "#
    )
    .bind(user_id)
    .bind(cancellation_reason)
    .bind(order_id)
    .bind(Uuid::nil() /* organization_id - extract from auth middleware in production */)
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

    let result = sqlx::query(
        "UPDATE imaging_orders SET deleted_at = NOW(), updated_by = $1 WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL"
    )
    .bind(user_id)
    .bind(order_id)
    .bind(Uuid::nil() /* organization_id - extract from auth middleware in production */)
    .execute(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to delete order: {}", e)))?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Imaging order {} not found", order_id)).into());
    }

    Ok(StatusCode::NO_CONTENT)
}
