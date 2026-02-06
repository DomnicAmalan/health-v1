// Lab Results Handlers
// Enter, verify, and manage laboratory test results

use axum::{
    extract::{Path, State},
    Json,
};
use bigdecimal::{BigDecimal, ToPrimitive};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info, warn};
use uuid::Uuid;

use super::AppState;
use shared::shared::api_response::{ApiError, ApiResponse};
use shared::shared::error::AppError;

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterResultsRequest {
    pub results: Vec<ResultEntry>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResultEntry {
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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResultInterpretation {
    pub is_abnormal: bool,
    pub is_critical: bool,
    pub abnormal_flag: Option<String>,  // H, L, HH, LL
    pub reference_range_text: String,
}

// ============================================================================
// Handlers
// ============================================================================

/// POST /v1/ehr/lab-orders/:id/results - Enter results for an order
#[tracing::instrument(skip(state, payload))]
pub async fn enter_results(
    State(state): State<Arc<AppState>>,
    Path(order_id): Path<Uuid>,
    Json(payload): Json<EnterResultsRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, ApiError> {
    info!("Entering results for order: {}", order_id);

    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();
    let user_full_name = "System".to_string();
    let organization_id = Uuid::nil();

    // Assertion 1: Validate order exists and is in correct state
    let order = sqlx::query!(
        "SELECT id, status, patient_id FROM lab_orders WHERE id = $1 AND organization_id = $2",
        order_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Order not found: {:?}", e);
        AppError::NotFound("Lab order not found".to_string())
    })?;

    // Must be received or in_lab to enter results
    if !matches!(order.status.as_str(), "received" | "in_lab") {
        return Err(AppError::InvalidState(
            format!("Cannot enter results for order in {} state", order.status)
        ).into());
    }

    let mut tx = state.database_pool.begin().await.map_err(|e| {
        error!("Failed to begin transaction: {:?}", e);
        AppError::from(e)
    })?;

    // Update order status to in_lab if still received
    if order.status == "received" {
        sqlx::query!(
            "UPDATE lab_orders SET status = 'in_lab', processing_started_datetime = NOW() WHERE id = $1",
            order_id
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            error!("Failed to update order status: {:?}", e);
            AppError::from(e)
        })?;
    }

    let mut critical_results = Vec::new();

    // Process each result
    for result in &payload.results {
        // Get test details and reference ranges
        let item = sqlx::query!(
            r#"
            SELECT
                oi.id, oi.test_id, oi.test_name,
                t.result_type, t.result_unit as default_unit
            FROM lab_order_items oi
            LEFT JOIN lab_tests t ON t.id = oi.test_id
            WHERE oi.id = $1 AND oi.order_id = $2
            "#,
            result.item_id,
            order_id
        )
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| {
            error!("Order item not found: {:?}", e);
            AppError::NotFound("Order item not found".to_string())
        })?;

        // Parse numeric value if applicable
        let result_numeric_f64 = if item.result_type == Some("numeric".to_string()) {
            result.result_value.parse::<f64>().ok()
        } else {
            None
        };
        // Convert to BigDecimal for database storage
        let result_numeric: Option<BigDecimal> = result_numeric_f64
            .and_then(|v| BigDecimal::try_from(v).ok());

        // Get interpretation (abnormal/critical flags)
        let interpretation = if let Some(test_id) = item.test_id {
            interpret_result(
                &mut tx,
                test_id,
                &result.result_value,
                result_numeric_f64,
                order.patient_id,
            )
            .await?
        } else {
            ResultInterpretation {
                is_abnormal: false,
                is_critical: false,
                abnormal_flag: None,
                reference_range_text: String::new(),
            }
        };

        // Update order item with result
        sqlx::query!(
            r#"
            UPDATE lab_order_items
            SET
                result_value = $1,
                result_unit = $2,
                result_numeric = $3,
                is_abnormal = $4,
                is_critical = $5,
                abnormal_flag = $6,
                reference_range_text = $7,
                result_comment = $8,
                status = 'completed',
                resulted_datetime = NOW()
            WHERE id = $9
            "#,
            result.result_value,
            result.result_unit.as_ref().or(item.default_unit.as_ref()),
            result_numeric,
            interpretation.is_abnormal,
            interpretation.is_critical,
            interpretation.abnormal_flag,
            interpretation.reference_range_text,
            result.result_comment,
            result.item_id
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            error!("Failed to update result: {:?}", e);
            AppError::from(e)
        })?;

        if interpretation.is_critical {
            critical_results.push((item.test_name, result.result_value.clone()));
        }
    }

    // Update order result entry metadata
    sqlx::query!(
        r#"
        UPDATE lab_orders
        SET
            result_entered_by = $1,
            result_entered_by_name = $2,
            result_entered_datetime = NOW(),
            result_status = 'preliminary',
            updated_at = NOW(),
            updated_by = $1
        WHERE id = $3
        "#,
        user_id,
        user_full_name,
        order_id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        error!("Failed to update order: {:?}", e);
        AppError::from(e)
    })?;

    // If critical results, create notification
    if !critical_results.is_empty() {
        warn!("Critical values detected for order {}: {:?}", order_id, critical_results);

        let order_details = sqlx::query!(
            "SELECT ordering_provider_id, patient_name, order_number FROM lab_orders WHERE id = $1",
            order_id
        )
        .fetch_one(&mut *tx)
        .await?;

        let critical_list = critical_results
            .iter()
            .map(|(test, value)| format!("{}: {}", test, value))
            .collect::<Vec<_>>()
            .join(", ");

        // Create notification for ordering provider
        let _ = sqlx::query!(
            r#"
            INSERT INTO notifications (
                user_id, notification_type, title, message,
                action_url, entity_type, entity_id, priority
            )
            VALUES ($1, 'critical_value', $2, $3, $4, 'lab_order', $5, 'stat')
            "#,
            order_details.ordering_provider_id,
            format!("CRITICAL: {} for {}", critical_list, order_details.patient_name.unwrap_or_default()),
            format!("Critical laboratory values require immediate attention. Order: {}", order_details.order_number),
            format!("/lab-orders/{}", order_id),
            order_id
        )
        .execute(&mut *tx)
        .await;

        // Create task for critical value notification
        let _ = sqlx::query!(
            r#"
            INSERT INTO task_queue (
                organization_id, task_type, task_title, task_category,
                assigned_to_role, priority, status, patient_id, order_id
            )
            VALUES ($1, 'critical_value_notification', $2, 'clinical', 'nurse', 'stat', 'pending', $3, $4)
            "#,
            organization_id,
            format!("Notify CRITICAL values: {}", critical_list),
            order.patient_id,
            order_id
        )
        .execute(&mut *tx)
        .await;
    }

    tx.commit().await.map_err(|e| {
        error!("Failed to commit results: {:?}", e);
        AppError::from(e)
    })?;

    info!("Results entered for order: {}, critical: {}", order_id, !critical_results.is_empty());

    Ok(Json(ApiResponse::success(serde_json::json!({
        "order_id": order_id,
        "results_entered": payload.results.len(),
        "has_critical_values": !critical_results.is_empty(),
        "critical_results": critical_results
    }))))
}

/// POST /v1/ehr/lab-orders/:id/verify - Verify results (pathologist/supervisor review)
#[tracing::instrument(skip(state))]
pub async fn verify_results(
    State(state): State<Arc<AppState>>,
    Path(order_id): Path<Uuid>,
    Json(payload): Json<VerifyResultsRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, ApiError> {
    info!("Verifying results for order: {}", order_id);

    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();
    let user_full_name = "System".to_string();
    let organization_id = Uuid::nil();

    // Assertion: Order must have preliminary results
    let order = sqlx::query!(
        "SELECT id, result_status FROM lab_orders WHERE id = $1 AND organization_id = $2",
        order_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|_e| AppError::NotFound("Order not found".to_string()))?;

    debug_assert_eq!(order.result_status.as_deref(), Some("preliminary"),
        "Can only verify orders with preliminary results");

    // Update order to final/completed
    let updated = sqlx::query!(
        r#"
        UPDATE lab_orders
        SET
            status = 'completed',
            result_status = 'final',
            result_verified_by = $1,
            result_verified_by_name = $2,
            result_verified_datetime = NOW(),
            completed_datetime = NOW(),
            lab_comments = COALESCE(lab_comments || E'\n' || $3, $3),
            updated_at = NOW(),
            updated_by = $1
        WHERE id = $4
          AND organization_id = $5
        RETURNING id
        "#,
        user_id,
        user_full_name,
        payload.verification_notes,
        order_id,
        organization_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to verify results: {:?}", e);
        AppError::from(e)
    })?;

    // Create notification for ordering provider
    let order_info = sqlx::query!(
        "SELECT ordering_provider_id, patient_name, order_number FROM lab_orders WHERE id = $1",
        order_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await?;

    let _ = sqlx::query!(
        r#"
        INSERT INTO notifications (
            user_id, notification_type, title, message,
            action_url, entity_type, entity_id, priority
        )
        VALUES ($1, 'result_ready', $2, $3, $4, 'lab_order', $5, 'normal')
        "#,
        order_info.ordering_provider_id,
        format!("Lab results ready: {}", order_info.patient_name.unwrap_or_default()),
        format!("Final laboratory results available for order {}", order_info.order_number),
        format!("/lab-orders/{}", order_id),
        order_id
    )
    .execute(state.database_pool.as_ref())
    .await;

    info!("Results verified for order: {}", updated.id);

    Ok(Json(ApiResponse::success(serde_json::json!({
        "order_id": order_id,
        "status": "verified",
        "result_status": "final"
    }))))
}

// ============================================================================
// Helper Functions
// ============================================================================

async fn interpret_result(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    test_id: Uuid,
    _result_value: &str,
    result_numeric: Option<f64>,
    patient_id: Uuid,
) -> Result<ResultInterpretation, ApiError> {
    // Get patient age and gender for range selection
    let patient = sqlx::query!(
        "SELECT date_of_birth, sex as gender FROM ehr_patients WHERE id = $1",
        patient_id
    )
    .fetch_optional(&mut **tx)
    .await
    .map_err(|e| {
        error!("Failed to fetch patient: {:?}", e);
        AppError::from(e)
    })?;

    let age = patient
        .as_ref()
        .and_then(|p| p.date_of_birth)
        .map(|dob| {
            let now = chrono::Utc::now().date_naive();
            let age_years = now.years_since(dob).unwrap_or(0);
            age_years as i32
        });

    let gender = patient
        .and_then(|p| p.gender)
        .unwrap_or_else(|| "all".to_string());

    // Get appropriate reference range
    let range = sqlx::query!(
        r#"
        SELECT
            reference_min, reference_max, unit,
            critical_min, critical_max,
            CONCAT(
                COALESCE(reference_min::text, ''), ' - ',
                COALESCE(reference_max::text, ''), ' ', unit
            ) as range_text
        FROM lab_reference_ranges
        WHERE test_id = $1
          AND (gender = $2 OR gender = 'all')
          AND ($3::integer IS NULL OR (
              ($3 >= COALESCE(age_min_years, 0)) AND
              ($3 <= COALESCE(age_max_years, 999))
          ))
        ORDER BY
            CASE gender WHEN $2 THEN 1 ELSE 2 END,
            age_min_years NULLS FIRST
        LIMIT 1
        "#,
        test_id,
        gender,
        age
    )
    .fetch_optional(&mut **tx)
    .await
    .map_err(|e| {
        error!("Failed to fetch reference range: {:?}", e);
        AppError::from(e)
    })?;

    if let Some(range) = range {
        if let Some(numeric_value) = result_numeric {
            // Determine if result is abnormal or critical
            // Convert BigDecimal to f64 for comparison
            let is_critical_low = range.critical_min
                .and_then(|min| min.to_f64())
                .map(|min| numeric_value < min)
                .unwrap_or(false);

            let is_critical_high = range.critical_max
                .and_then(|max| max.to_f64())
                .map(|max| numeric_value > max)
                .unwrap_or(false);

            let is_abnormal_low = range.reference_min
                .and_then(|min| min.to_f64())
                .map(|min| numeric_value < min)
                .unwrap_or(false);

            let is_abnormal_high = range.reference_max
                .and_then(|max| max.to_f64())
                .map(|max| numeric_value > max)
                .unwrap_or(false);

            let abnormal_flag = if is_critical_low {
                Some("LL".to_string())
            } else if is_critical_high {
                Some("HH".to_string())
            } else if is_abnormal_low {
                Some("L".to_string())
            } else if is_abnormal_high {
                Some("H".to_string())
            } else {
                None
            };

            return Ok(ResultInterpretation {
                is_abnormal: is_abnormal_low || is_abnormal_high,
                is_critical: is_critical_low || is_critical_high,
                abnormal_flag,
                reference_range_text: range.range_text.unwrap_or_default(),
            });
        }
    }

    // No range found or non-numeric result
    Ok(ResultInterpretation {
        is_abnormal: false,
        is_critical: false,
        abnormal_flag: None,
        reference_range_text: String::new(),
    })
}
