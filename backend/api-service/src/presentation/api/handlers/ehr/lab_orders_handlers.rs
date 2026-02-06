// Lab Orders Handlers
// Create and manage laboratory test orders with dual-write to YottaDB

use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use tracing::{error, info};
use uuid::Uuid;

use super::AppState;
use shared::shared::api_response::{ApiError, ApiResponse};
use shared::shared::error::AppError;

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateLabOrderRequest {
    pub patient_id: Uuid,
    pub encounter_id: Option<Uuid>,
    pub priority: Option<String>,
    pub clinical_indication: Option<String>,
    pub clinical_question: Option<String>,
    pub special_instructions: Option<String>,
    pub tests: Vec<OrderTestItem>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OrderTestItem {
    pub test_id: Option<Uuid>,
    pub panel_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LabOrderResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub ien: Option<i32>,
    pub order_number: String,
    pub accession_number: Option<String>,
    pub patient_id: Uuid,
    pub patient_name: Option<String>,
    pub patient_mrn: Option<String>,
    pub encounter_id: Option<Uuid>,
    pub ordering_provider_id: Uuid,
    pub ordering_provider_name: Option<String>,
    pub ordering_datetime: chrono::DateTime<chrono::Utc>,
    pub priority: String,
    pub clinical_indication: Option<String>,
    pub clinical_question: Option<String>,
    pub special_instructions: Option<String>,
    pub status: String,
    pub collection_required: bool,
    pub collected_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub collected_by: Option<Uuid>,
    pub collected_by_name: Option<String>,
    pub received_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub received_by_name: Option<String>,
    pub completed_datetime: Option<chrono::DateTime<chrono::Utc>>,
    pub result_status: Option<String>,
    pub has_critical_values: bool,
    pub items: Vec<LabOrderItemResponse>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LabOrderItemResponse {
    pub id: Uuid,
    pub test_id: Option<Uuid>,
    pub panel_id: Option<Uuid>,
    pub test_name: String,
    pub test_code: Option<String>,
    pub specimen_id: Option<String>,
    pub specimen_type: Option<String>,
    pub status: String,
    pub result_value: Option<String>,
    pub result_unit: Option<String>,
    pub is_abnormal: bool,
    pub is_critical: bool,
    pub abnormal_flag: Option<String>,
    pub reference_range_text: Option<String>,
    pub result_comment: Option<String>,
    pub resulted_datetime: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListOrdersQuery {
    pub patient_id: Option<Uuid>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub from_date: Option<chrono::DateTime<chrono::Utc>>,
    pub to_date: Option<chrono::DateTime<chrono::Utc>>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectSpecimenRequest {
    pub specimen_quality: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceiveSpecimenRequest {
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterResultRequest {
    pub item_id: Uuid,
    pub result_value: String,
    pub result_unit: Option<String>,
    pub result_comment: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifyResultsRequest {
    pub verification_notes: Option<String>,
}

// ============================================================================
// Handlers
// ============================================================================

/// POST /v1/ehr/lab-orders - Create lab order
#[tracing::instrument(skip(state, payload))]
pub async fn create_lab_order(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateLabOrderRequest>,
) -> Result<Json<ApiResponse<LabOrderResponse>>, ApiError> {
    info!("Creating lab order for patient: {}", payload.patient_id);

    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();
    let user_full_name = "System".to_string();
    let organization_id = Uuid::nil();

    // Assertion 1: Validate patient exists
    let patient = sqlx::query!(
        "SELECT id, first_name, last_name, mrn FROM ehr_patients WHERE id = $1 AND organization_id = $2",
        payload.patient_id,
        organization_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch patient: {:?}", e);
        AppError::from(e)
    })?
    .ok_or_else(|| AppError::NotFound("Patient not found".to_string()))?;

    let patient_name = format!("{} {}",
        patient.first_name.unwrap_or_default(),
        patient.last_name.unwrap_or_default()
    );

    // Validate priority
    let priority = payload.priority.as_deref().unwrap_or("routine");
    if !matches!(priority, "stat" | "urgent" | "routine") {
        return Err(AppError::Validation("Invalid priority".to_string()).into());
    }

    // Assertion 2: Validate at least one test/panel provided
    debug_assert!(!payload.tests.is_empty(), "At least one test or panel required");

    // Start transaction for consistency
    let mut tx = state.database_pool.begin().await.map_err(|e| {
        error!("Failed to begin transaction: {:?}", e);
        AppError::from(e)
    })?;

    // Create lab order
    let order = sqlx::query!(
        r#"
        INSERT INTO lab_orders (
            organization_id, patient_id, patient_name, patient_mrn,
            encounter_id, ordering_provider_id, ordering_provider_name,
            ordering_datetime, priority, clinical_indication,
            clinical_question, special_instructions, status,
            created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11, 'pending', $12, $12)
        RETURNING id, organization_id, ien, order_number, accession_number,
                  patient_id, patient_name, patient_mrn, encounter_id,
                  ordering_provider_id, ordering_provider_name, ordering_datetime,
                  priority, clinical_indication, clinical_question, special_instructions,
                  status, collection_required, has_critical_values, created_at
        "#,
        organization_id,
        payload.patient_id,
        patient_name,
        patient.mrn,
        payload.encounter_id,
        user_id,
        user_full_name.clone(),
        priority,
        payload.clinical_indication,
        payload.clinical_question,
        payload.special_instructions,
        user_id
    )
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| {
        error!("Failed to create lab order: {:?}", e);
        AppError::from(e)
    })?;

    info!("Lab order created: {} ({})", order.id, order.order_number);

    // Create order items (expand panels into individual tests)
    let mut order_items = Vec::new();

    for test_item in &payload.tests {
        if let Some(test_id) = test_item.test_id {
            // Single test
            let test = sqlx::query!(
                "SELECT test_code, test_name, specimen_type FROM lab_tests WHERE id = $1",
                test_id
            )
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| {
                error!("Test not found: {}", test_id);
                AppError::NotFound("Test not found".to_string())
            })?;

            let item = sqlx::query!(
                r#"
                INSERT INTO lab_order_items (
                    order_id, test_id, test_name, test_code, specimen_type, status
                )
                VALUES ($1, $2, $3, $4, $5, 'pending')
                RETURNING id
                "#,
                order.id,
                test_id,
                test.test_name,
                test.test_code,
                test.specimen_type
            )
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| {
                error!("Failed to create order item: {:?}", e);
                AppError::from(e)
            })?;

            order_items.push(item.id);

        } else if let Some(panel_id) = test_item.panel_id {
            // Panel - expand into individual tests
            let panel_tests = sqlx::query!(
                r#"
                SELECT t.id, t.test_code, t.test_name, t.specimen_type
                FROM lab_tests t
                INNER JOIN lab_panel_tests pt ON pt.test_id = t.id
                WHERE pt.panel_id = $1
                ORDER BY pt.display_order
                "#,
                panel_id
            )
            .fetch_all(&mut *tx)
            .await
            .map_err(|e| {
                error!("Failed to fetch panel tests: {:?}", e);
                AppError::from(e)
            })?;

            for test in panel_tests {
                let item = sqlx::query!(
                    r#"
                    INSERT INTO lab_order_items (
                        order_id, test_id, panel_id, test_name, test_code, specimen_type, status
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, 'pending')
                    RETURNING id
                    "#,
                    order.id,
                    test.id,
                    panel_id,
                    test.test_name,
                    test.test_code,
                    test.specimen_type
                )
                .fetch_one(&mut *tx)
                .await
                .map_err(|e| {
                    error!("Failed to create panel order item: {:?}", e);
                    AppError::from(e)
                })?;

                order_items.push(item.id);
            }
        }
    }

    // Create task for specimen collection
    let task_priority = match priority {
        "stat" => "stat",
        "urgent" => "urgent",
        _ => "normal",
    };

    let _ = sqlx::query!(
        r#"
        INSERT INTO task_queue (
            organization_id, task_type, task_title, task_description,
            task_category, assigned_to_role, priority, status,
            patient_id, patient_name, order_id, task_data
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10, $11)
        "#,
        organization_id,
        if priority == "stat" { "lab_collection_stat" } else { "lab_collection" },
        format!("Collect specimen for {}", patient_name),
        format!("Lab order {}: {} tests", order.order_number, order_items.len()),
        "laboratory",
        "lab_tech",
        task_priority,
        payload.patient_id,
        patient_name.clone(),
        order.id,
        serde_json::json!({
            "order_number": order.order_number,
            "priority": priority,
            "test_count": order_items.len()
        })
    )
    .execute(&mut *tx)
    .await;

    // Commit transaction
    tx.commit().await.map_err(|e| {
        error!("Failed to commit lab order transaction: {:?}", e);
        AppError::from(e)
    })?;

    // Fetch complete order with items
    let order = get_lab_order_internal(state.database_pool.as_ref(), organization_id, order.id).await?;
    Ok(Json(ApiResponse::success(order)))
}

/// GET /v1/ehr/lab-orders - List lab orders
#[tracing::instrument(skip(state))]
pub async fn list_lab_orders(
    State(state): State<Arc<AppState>>,
    Query(query): Query<ListOrdersQuery>,
) -> Result<Json<ApiResponse<Vec<LabOrderResponse>>>, ApiError> {
    info!("Listing lab orders");

    // Use a system user ID for now - in production, extract from auth middleware
    let organization_id = Uuid::nil();

    let limit = query.limit.unwrap_or(100).min(1000);

    let orders = sqlx::query!(
        r#"
        SELECT
            id, organization_id, ien, order_number, accession_number,
            patient_id, patient_name, patient_mrn, encounter_id,
            ordering_provider_id, ordering_provider_name, ordering_datetime,
            priority, clinical_indication, clinical_question, special_instructions,
            status, collection_required, collected_datetime, collected_by,
            collected_by_name, received_datetime, received_by_name,
            completed_datetime, result_status, has_critical_values, created_at
        FROM lab_orders
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND ($2::uuid IS NULL OR patient_id = $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::text IS NULL OR priority = $4)
          AND ($5::timestamptz IS NULL OR ordering_datetime >= $5)
          AND ($6::timestamptz IS NULL OR ordering_datetime <= $6)
        ORDER BY
            CASE priority
                WHEN 'stat' THEN 1
                WHEN 'urgent' THEN 2
                WHEN 'routine' THEN 3
            END,
            ordering_datetime DESC
        LIMIT $7
        "#,
        organization_id,
        query.patient_id,
        query.status,
        query.priority,
        query.from_date,
        query.to_date,
        limit
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch lab orders: {:?}", e);
        AppError::from(e)
    })?;

    let mut order_responses = Vec::new();

    for order in orders {
        let items = fetch_order_items(state.database_pool.as_ref(), order.id).await?;

        order_responses.push(LabOrderResponse {
            id: order.id,
            organization_id: order.organization_id,
            ien: order.ien,
            order_number: order.order_number,
            accession_number: order.accession_number,
            patient_id: order.patient_id,
            patient_name: order.patient_name,
            patient_mrn: order.patient_mrn,
            encounter_id: order.encounter_id,
            ordering_provider_id: order.ordering_provider_id,
            ordering_provider_name: order.ordering_provider_name,
            ordering_datetime: order.ordering_datetime,
            priority: order.priority.unwrap_or_else(|| "routine".to_string()),
            clinical_indication: order.clinical_indication,
            clinical_question: order.clinical_question,
            special_instructions: order.special_instructions,
            status: order.status,
            collection_required: order.collection_required.unwrap_or(false),
            collected_datetime: order.collected_datetime,
            collected_by: order.collected_by,
            collected_by_name: order.collected_by_name,
            received_datetime: order.received_datetime,
            received_by_name: order.received_by_name,
            completed_datetime: order.completed_datetime,
            result_status: order.result_status,
            has_critical_values: order.has_critical_values.unwrap_or(false),
            items,
            created_at: order.created_at,
        });
    }

    Ok(Json(ApiResponse::success(order_responses)))
}

/// GET /v1/ehr/lab-orders/:id - Get order details
#[tracing::instrument(skip(state))]
pub async fn get_lab_order(
    State(state): State<Arc<AppState>>,
    Path(order_id): Path<Uuid>,
) -> Result<Json<ApiResponse<LabOrderResponse>>, ApiError> {
    info!("Getting lab order: {}", order_id);

    // Use a system user ID for now - in production, extract from auth middleware
    let organization_id = Uuid::nil();

    let order = get_lab_order_internal(state.database_pool.as_ref(), organization_id, order_id).await?;
    Ok(Json(ApiResponse::success(order)))
}

/// PATCH /v1/ehr/lab-orders/:id/collect - Mark specimens collected
#[tracing::instrument(skip(state, payload))]
pub async fn collect_specimen(
    State(state): State<Arc<AppState>>,
    Path(order_id): Path<Uuid>,
    Json(payload): Json<CollectSpecimenRequest>,
) -> Result<Json<ApiResponse<LabOrderResponse>>, ApiError> {
    info!("Collecting specimen for order: {}", order_id);

    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();
    let user_full_name = "System".to_string();
    let organization_id = Uuid::nil();

    // Assertion: Order must be in pending state
    let current = sqlx::query!(
        "SELECT status FROM lab_orders WHERE id = $1 AND organization_id = $2",
        order_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|_e| AppError::NotFound("Order not found".to_string()))?;

    debug_assert_eq!(current.status, "pending",
        "Can only collect specimens for pending orders, got: {}", current.status);

    let updated = sqlx::query!(
        r#"
        UPDATE lab_orders
        SET
            status = 'collected',
            collected_datetime = NOW(),
            collected_by = $1,
            collected_by_name = $2,
            specimen_quality = $3,
            technician_notes = $4,
            updated_at = NOW(),
            updated_by = $1
        WHERE id = $5
          AND organization_id = $6
          AND status = 'pending'
        RETURNING id
        "#,
        user_id,
        user_full_name.clone(),
        payload.specimen_quality,
        payload.notes,
        order_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to update order status: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Order not found or not in pending state".to_string())
        } else {
            AppError::from(e)
        }
    })?;

    // Update order items
    let _ = sqlx::query!(
        "UPDATE lab_order_items SET status = 'collected' WHERE order_id = $1",
        order_id
    )
    .execute(state.database_pool.as_ref())
    .await;

    // Complete collection task
    let _ = sqlx::query!(
        r#"
        UPDATE task_queue
        SET status = 'completed', completed_datetime = NOW(), completed_by = $1, completed_by_name = $2
        WHERE order_id = $3 AND task_type IN ('lab_collection', 'lab_collection_stat') AND status != 'completed'
        "#,
        user_id,
        user_full_name,
        order_id
    )
    .execute(state.database_pool.as_ref())
    .await;

    info!("Specimen collected for order: {}", updated.id);

    let order = get_lab_order_internal(state.database_pool.as_ref(), organization_id, order_id).await?;
    Ok(Json(ApiResponse::success(order)))
}

/// PATCH /v1/ehr/lab-orders/:id/receive - Mark specimens received in lab
#[tracing::instrument(skip(state, _payload))]
pub async fn receive_specimen(
    State(state): State<Arc<AppState>>,
    Path(order_id): Path<Uuid>,
    Json(_payload): Json<ReceiveSpecimenRequest>,
) -> Result<Json<ApiResponse<LabOrderResponse>>, ApiError> {
    info!("Receiving specimen for order: {}", order_id);

    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();
    let user_full_name = "System".to_string();
    let organization_id = Uuid::nil();

    let _ = sqlx::query!(
        r#"
        UPDATE lab_orders
        SET
            status = 'received',
            received_datetime = NOW(),
            received_by = $1,
            received_by_name = $2,
            updated_at = NOW(),
            updated_by = $1
        WHERE id = $3
          AND organization_id = $4
          AND status = 'collected'
        "#,
        user_id,
        user_full_name,
        order_id,
        organization_id
    )
    .execute(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to update order status: {:?}", e);
        AppError::from(e)
    })?;

    let order = get_lab_order_internal(state.database_pool.as_ref(), organization_id, order_id).await?;
    Ok(Json(ApiResponse::success(order)))
}

/// POST /v1/ehr/lab-orders/:id/cancel - Cancel order
#[tracing::instrument(skip(state))]
pub async fn cancel_lab_order(
    State(state): State<Arc<AppState>>,
    Path(order_id): Path<Uuid>,
) -> Result<Json<ApiResponse<LabOrderResponse>>, ApiError> {
    info!("Cancelling lab order: {}", order_id);

    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();
    let organization_id = Uuid::nil();

    let _ = sqlx::query!(
        r#"
        UPDATE lab_orders
        SET
            status = 'cancelled',
            cancelled_by = $1,
            cancelled_datetime = NOW(),
            updated_at = NOW(),
            updated_by = $1
        WHERE id = $2
          AND organization_id = $3
          AND status IN ('pending', 'collected')
        "#,
        user_id,
        order_id,
        organization_id
    )
    .execute(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to cancel order: {:?}", e);
        AppError::from(e)
    })?;

    // Cancel related tasks
    let _ = sqlx::query!(
        "UPDATE task_queue SET status = 'cancelled' WHERE order_id = $1 AND status = 'pending'",
        order_id
    )
    .execute(state.database_pool.as_ref())
    .await;

    let order = get_lab_order_internal(state.database_pool.as_ref(), organization_id, order_id).await?;
    Ok(Json(ApiResponse::success(order)))
}

// ============================================================================
// Helper Functions
// ============================================================================

async fn get_lab_order_internal(
    db: &PgPool,
    organization_id: Uuid,
    order_id: Uuid,
) -> Result<LabOrderResponse, ApiError> {
    let order = sqlx::query!(
        r#"
        SELECT
            id, organization_id, ien, order_number, accession_number,
            patient_id, patient_name, patient_mrn, encounter_id,
            ordering_provider_id, ordering_provider_name, ordering_datetime,
            priority, clinical_indication, clinical_question, special_instructions,
            status, collection_required, collected_datetime, collected_by,
            collected_by_name, received_datetime, received_by_name,
            completed_datetime, result_status, has_critical_values, created_at
        FROM lab_orders
        WHERE id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
        "#,
        order_id,
        organization_id
    )
    .fetch_one(db)
    .await
    .map_err(|e| {
        error!("Failed to fetch lab order: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Lab order not found".to_string())
        } else {
            AppError::from(e)
        }
    })?;

    let items = fetch_order_items(db, order_id).await?;

    Ok(LabOrderResponse {
        id: order.id,
        organization_id: order.organization_id,
        ien: order.ien,
        order_number: order.order_number,
        accession_number: order.accession_number,
        patient_id: order.patient_id,
        patient_name: order.patient_name,
        patient_mrn: order.patient_mrn,
        encounter_id: order.encounter_id,
        ordering_provider_id: order.ordering_provider_id,
        ordering_provider_name: order.ordering_provider_name,
        ordering_datetime: order.ordering_datetime,
        priority: order.priority.unwrap_or_else(|| "routine".to_string()),
        clinical_indication: order.clinical_indication,
        clinical_question: order.clinical_question,
        special_instructions: order.special_instructions,
        status: order.status,
        collection_required: order.collection_required.unwrap_or(false),
        collected_datetime: order.collected_datetime,
        collected_by: order.collected_by,
        collected_by_name: order.collected_by_name,
        received_datetime: order.received_datetime,
        received_by_name: order.received_by_name,
        completed_datetime: order.completed_datetime,
        result_status: order.result_status,
        has_critical_values: order.has_critical_values.unwrap_or(false),
        items,
        created_at: order.created_at,
    })
}

async fn fetch_order_items(db: &PgPool, order_id: Uuid) -> Result<Vec<LabOrderItemResponse>, ApiError> {
    let items = sqlx::query!(
        r#"
        SELECT
            id, test_id, panel_id, test_name, test_code, specimen_id,
            specimen_type, status, result_value, result_unit,
            is_abnormal, is_critical, abnormal_flag, reference_range_text,
            result_comment, resulted_datetime
        FROM lab_order_items
        WHERE order_id = $1
        ORDER BY created_at
        "#,
        order_id
    )
    .fetch_all(db)
    .await
    .map_err(|e| {
        error!("Failed to fetch order items: {:?}", e);
        AppError::from(e)
    })?;

    Ok(items
        .into_iter()
        .map(|item| LabOrderItemResponse {
            id: item.id,
            test_id: item.test_id,
            panel_id: item.panel_id,
            test_name: item.test_name,
            test_code: item.test_code,
            specimen_id: item.specimen_id,
            specimen_type: item.specimen_type,
            status: item.status,
            result_value: item.result_value,
            result_unit: item.result_unit,
            is_abnormal: item.is_abnormal.unwrap_or(false),
            is_critical: item.is_critical.unwrap_or(false),
            abnormal_flag: item.abnormal_flag,
            reference_range_text: item.reference_range_text,
            result_comment: item.result_comment,
            resulted_datetime: item.resulted_datetime,
        })
        .collect())
}
