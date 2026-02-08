//! Payment API Handlers
//!
//! Payment processing and allocation

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use bigdecimal::BigDecimal;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use std::sync::Arc;
use uuid::Uuid;

use crate::presentation::api::AppState;

/// Helper to convert f64 to BigDecimal for SQL DECIMAL parameters
fn to_bd(v: f64) -> BigDecimal {
    BigDecimal::from_str(&v.to_string()).unwrap_or_default()
}

/// Helper to parse decimal string to f64
fn parse_decimal(s: Option<String>) -> f64 {
    s.and_then(|v| v.parse().ok()).unwrap_or(0.0)
}

// === DTOs ===

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentResponse {
    pub id: Uuid,
    pub receipt_number: String,
    pub payment_date: String,
    pub patient_id: Uuid,
    pub patient_name: Option<String>,
    pub payer_name: Option<String>,
    pub amount: f64,
    pub currency: String,
    pub payment_method: String,
    pub payment_status: String,
    pub transaction_id: Option<String>,
    pub is_advance: bool,
    pub is_allocated: bool,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentListResponse {
    pub data: Vec<PaymentResponse>,
    pub total: i64,
    pub page: i32,
    pub page_size: i32,
}

#[derive(Debug, Deserialize)]
pub struct PaymentSearchQuery {
    pub patient_id: Option<Uuid>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub payment_method: Option<String>,
    pub page: Option<i32>,
    pub page_size: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePaymentRequest {
    pub patient_id: Uuid,
    pub patient_name: Option<String>,
    pub payer_name: Option<String>,
    pub amount: f64,
    pub payment_method: String, // cash, card, upi, net_banking, cheque, etc.
    pub payment_details: Option<serde_json::Value>, // Method-specific details
    pub transaction_id: Option<String>,
    pub bank_reference: Option<String>,
    pub is_advance: Option<bool>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AllocatePaymentRequest {
    pub invoice_id: Uuid,
    pub amount: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundPaymentRequest {
    pub amount: f64,
    pub reason: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentErrorResponse {
    pub error: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PatientBalanceResponse {
    pub patient_id: Uuid,
    pub current_balance: f64,
    pub total_billed: f64,
    pub total_paid: f64,
    pub advance_balance: f64,
    pub pending_invoices: i32,
}

// === Handlers ===

/// Generate receipt number
fn generate_receipt_number() -> String {
    let now = chrono::Utc::now();
    let year = now.format("%Y");
    let random = uuid::Uuid::new_v4().to_string()[..8].to_uppercase();
    format!("RCP-{}-{}", year, random)
}

/// List payments
pub async fn list_payments(
    State(state): State<Arc<AppState>>,
    Query(query): Query<PaymentSearchQuery>,
) -> impl IntoResponse {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query!(
        r#"
        SELECT id, receipt_number, payment_date, patient_id, patient_name, payer_name,
               amount::text as amount, COALESCE(currency, 'INR') as "currency!",
               payment_method::text as "payment_method!",
               payment_status::text as "payment_status!",
               transaction_id,
               is_advance as "is_advance!", is_allocated as "is_allocated!", notes
        FROM payments
        WHERE payment_status != 'cancelled'
        ORDER BY payment_date DESC
        LIMIT $1 OFFSET $2
        "#,
        page_size as i64,
        offset as i64
    )
    .fetch_all(&*state.database_pool)
    .await;

    match result {
        Ok(rows) => {
            let payments: Vec<PaymentResponse> = rows
                .iter()
                .map(|row| {
                    PaymentResponse {
                        id: row.id,
                        receipt_number: row.receipt_number.clone(),
                        payment_date: row.payment_date.to_rfc3339(),
                        patient_id: row.patient_id,
                        patient_name: row.patient_name.clone(),
                        payer_name: row.payer_name.clone(),
                        amount: parse_decimal(row.amount.clone()),
                        currency: row.currency.clone(),
                        payment_method: row.payment_method.clone(),
                        payment_status: row.payment_status.clone(),
                        transaction_id: row.transaction_id.clone(),
                        is_advance: row.is_advance,
                        is_allocated: row.is_allocated,
                        notes: row.notes.clone(),
                    }
                })
                .collect();

            let total = payments.len() as i64;

            (StatusCode::OK, Json(PaymentListResponse {
                data: payments,
                total,
                page,
                page_size,
            })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(PaymentErrorResponse { error: e.to_string() }),
        ).into_response(),
    }
}

/// Get payment by ID
pub async fn get_payment(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let result = sqlx::query!(
        r#"
        SELECT id, receipt_number, payment_date, patient_id, patient_name, payer_name,
               amount::text as amount, COALESCE(currency, 'INR') as "currency!",
               payment_method::text as "payment_method!",
               payment_status::text as "payment_status!",
               transaction_id,
               is_advance as "is_advance!", is_allocated as "is_allocated!", notes
        FROM payments
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(&*state.database_pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let payment = PaymentResponse {
                id: row.id,
                receipt_number: row.receipt_number.clone(),
                payment_date: row.payment_date.to_rfc3339(),
                patient_id: row.patient_id,
                patient_name: row.patient_name.clone(),
                payer_name: row.payer_name.clone(),
                amount: parse_decimal(row.amount.clone()),
                currency: row.currency.clone(),
                payment_method: row.payment_method.clone(),
                payment_status: row.payment_status.clone(),
                transaction_id: row.transaction_id.clone(),
                is_advance: row.is_advance,
                is_allocated: row.is_allocated,
                notes: row.notes.clone(),
            };
            (StatusCode::OK, Json(payment)).into_response()
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(PaymentErrorResponse { error: "Payment not found".to_string() }),
        ).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(PaymentErrorResponse { error: e.to_string() }),
        ).into_response(),
    }
}

/// Create a new payment
pub async fn create_payment(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreatePaymentRequest>,
) -> impl IntoResponse {
    let org_id = Uuid::nil(); // In production, get from auth context
    let receipt_number = generate_receipt_number();
    let is_advance = req.is_advance.unwrap_or(false);

    // Convert f64 to BigDecimal for PostgreSQL DECIMAL columns
    let result = sqlx::query!(
        r#"
        INSERT INTO payments (
            organization_id, receipt_number, patient_id, patient_name, payer_name,
            amount, payment_method, payment_details, transaction_id, bank_reference,
            is_advance, notes, payment_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::text::payment_method, $8, $9, $10, $11, $12, 'completed'::payment_status)
        RETURNING id
        "#,
        org_id,
        &receipt_number,
        req.patient_id,
        req.patient_name.as_deref(),
        req.payer_name.as_deref(),
        to_bd(req.amount),
        &req.payment_method,
        req.payment_details.as_ref(),
        req.transaction_id.as_deref(),
        req.bank_reference.as_deref(),
        is_advance,
        req.notes.as_deref()
    )
    .fetch_one(&*state.database_pool)
    .await;

    match result {
        Ok(row) => {
            let id = row.id;
            (StatusCode::CREATED, Json(serde_json::json!({
                "id": id,
                "receiptNumber": receipt_number,
                "success": true
            }))).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(PaymentErrorResponse { error: e.to_string() }),
        ).into_response(),
    }
}

/// Allocate payment to invoice
pub async fn allocate_payment(
    State(state): State<Arc<AppState>>,
    Path(payment_id): Path<Uuid>,
    Json(req): Json<AllocatePaymentRequest>,
) -> impl IntoResponse {
    // Start transaction
    let mut tx = match state.database_pool.begin().await {
        Ok(tx) => tx,
        Err(e) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(PaymentErrorResponse { error: e.to_string() }),
        ).into_response(),
    };

    // Create allocation record - convert f64 to BigDecimal
    let alloc_amount = to_bd(req.amount);
    let alloc_result = sqlx::query!(
        r#"
        INSERT INTO payment_allocations (payment_id, invoice_id, allocated_amount)
        VALUES ($1, $2, $3)
        ON CONFLICT (payment_id, invoice_id) DO UPDATE SET
            allocated_amount = payment_allocations.allocated_amount + $3
        RETURNING id
        "#,
        payment_id,
        req.invoice_id,
        alloc_amount
    )
    .fetch_one(&mut *tx)
    .await;

    if let Err(e) = alloc_result {
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(PaymentErrorResponse { error: e.to_string() }),
        ).into_response();
    }

    // Update invoice amount_paid and balance_due
    let update_amount = to_bd(req.amount);
    let invoice_result = sqlx::query!(
        r#"
        UPDATE invoices SET
            amount_paid = amount_paid + $1,
            balance_due = balance_due - $1,
            status = CASE
                WHEN balance_due - $1 <= 0 THEN 'paid'::invoice_status
                WHEN amount_paid + $1 > 0 THEN 'partially_paid'::invoice_status
                ELSE status
            END,
            updated_at = NOW()
        WHERE id = $2
        "#,
        update_amount,
        req.invoice_id
    )
    .execute(&mut *tx)
    .await;

    if let Err(e) = invoice_result {
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(PaymentErrorResponse { error: e.to_string() }),
        ).into_response();
    }

    // Mark payment as allocated
    let _ = sqlx::query!(
        "UPDATE payments SET is_allocated = true, updated_at = NOW() WHERE id = $1",
        payment_id
    )
    .execute(&mut *tx)
    .await;

    // Commit transaction
    if let Err(e) = tx.commit().await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(PaymentErrorResponse { error: e.to_string() }),
        ).into_response();
    }

    (StatusCode::OK, Json(serde_json::json!({
        "success": true,
        "message": "Payment allocated to invoice"
    }))).into_response()
}

/// Process refund
pub async fn refund_payment(
    State(state): State<Arc<AppState>>,
    Path(payment_id): Path<Uuid>,
    Json(req): Json<RefundPaymentRequest>,
) -> impl IntoResponse {
    let org_id = Uuid::nil();
    let receipt_number = generate_receipt_number();

    // Get original payment details
    let original = sqlx::query!(
        r#"SELECT patient_id, patient_name, payment_method::text as "payment_method!" FROM payments WHERE id = $1"#,
        payment_id
    )
    .fetch_optional(&*state.database_pool)
    .await;

    let (patient_id, patient_name, payment_method) = match original {
        Ok(Some(row)) => (row.patient_id, row.patient_name, row.payment_method),
        Ok(None) => return (
            StatusCode::NOT_FOUND,
            Json(PaymentErrorResponse { error: "Original payment not found".to_string() }),
        ).into_response(),
        Err(e) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(PaymentErrorResponse { error: e.to_string() }),
        ).into_response(),
    };

    let neg_amount = to_bd(-req.amount);

    // Create refund record - use negative BigDecimal
    let result = sqlx::query!(
        r#"
        INSERT INTO payments (
            organization_id, receipt_number, patient_id, patient_name,
            amount, payment_method, is_refund, original_payment_id,
            refund_reason, payment_status, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6::text::payment_method, true, $7, $8, 'completed'::payment_status, $9)
        RETURNING id
        "#,
        org_id,
        &receipt_number,
        patient_id,
        patient_name.as_deref(),
        neg_amount, // Negative amount for refund
        &payment_method,
        payment_id,
        &req.reason,
        &req.reason
    )
    .fetch_one(&*state.database_pool)
    .await;

    match result {
        Ok(row) => {
            let id = row.id;

            // Update original payment status
            let _ = sqlx::query!(
                "UPDATE payments SET payment_status = 'refunded'::payment_status WHERE id = $1",
                payment_id
            )
            .execute(&*state.database_pool)
            .await;

            (StatusCode::CREATED, Json(serde_json::json!({
                "id": id,
                "receiptNumber": receipt_number,
                "success": true
            }))).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(PaymentErrorResponse { error: e.to_string() }),
        ).into_response(),
    }
}

/// Get patient billing summary/balance
pub async fn get_patient_balance(
    State(state): State<Arc<AppState>>,
    Path(patient_id): Path<Uuid>,
) -> impl IntoResponse {
    let result = sqlx::query!(
        r#"
        SELECT
            $1::uuid as patient_id,
            COALESCE((SELECT current_balance FROM patient_billing_accounts WHERE patient_id = $1), 0)::text as current_balance,
            COALESCE((SELECT SUM(grand_total) FROM invoices WHERE patient_id = $1 AND status != 'cancelled'), 0)::text as total_billed,
            COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id = $1 AND payment_status = 'completed' AND NOT is_refund), 0)::text as total_paid,
            COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id = $1 AND is_advance AND NOT is_allocated AND payment_status = 'completed'), 0)::text as advance_balance,
            COALESCE((SELECT COUNT(*) FROM invoices WHERE patient_id = $1 AND status IN ('pending', 'partially_paid', 'overdue'))::int, 0) as pending_invoices
        "#,
        patient_id
    )
    .fetch_one(&*state.database_pool)
    .await;

    match result {
        Ok(row) => {
            let balance = PatientBalanceResponse {
                patient_id,
                current_balance: parse_decimal(row.current_balance.clone()),
                total_billed: parse_decimal(row.total_billed.clone()),
                total_paid: parse_decimal(row.total_paid.clone()),
                advance_balance: parse_decimal(row.advance_balance.clone()),
                pending_invoices: row.pending_invoices.unwrap_or(0),
            };
            (StatusCode::OK, Json(balance)).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(PaymentErrorResponse { error: e.to_string() }),
        ).into_response(),
    }
}
