//! Invoice API Handlers
//!
//! GST-compliant invoice generation and management

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
pub struct InvoiceResponse {
    pub id: Uuid,
    pub invoice_number: String,
    pub invoice_type: String,
    pub invoice_date: String,
    pub due_date: Option<String>,
    pub patient_id: Uuid,
    pub patient_name: String,
    pub patient_mrn: Option<String>,
    pub visit_id: Option<Uuid>,
    pub subtotal: f64,
    pub discount_amount: f64,
    pub taxable_amount: f64,
    pub cgst_amount: f64,
    pub sgst_amount: f64,
    pub igst_amount: f64,
    pub total_tax: f64,
    pub grand_total: f64,
    pub amount_paid: f64,
    pub balance_due: f64,
    pub status: String,
    pub is_finalized: bool,
    pub items: Vec<InvoiceItemResponse>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceItemResponse {
    pub id: Uuid,
    pub service_code: String,
    pub service_name: String,
    pub quantity: f64,
    pub unit: String,
    pub unit_price: f64,
    pub gross_amount: f64,
    pub discount_amount: f64,
    pub net_amount: f64,
    pub cgst_rate: f64,
    pub cgst_amount: f64,
    pub sgst_rate: f64,
    pub sgst_amount: f64,
    pub igst_rate: f64,
    pub igst_amount: f64,
    pub total_tax: f64,
    pub total_amount: f64,
    pub line_number: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceListResponse {
    pub data: Vec<InvoiceSummaryResponse>,
    pub total: i64,
    pub page: i32,
    pub page_size: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceSummaryResponse {
    pub id: Uuid,
    pub invoice_number: String,
    pub invoice_type: String,
    pub invoice_date: String,
    pub patient_name: String,
    pub grand_total: f64,
    pub balance_due: f64,
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct InvoiceSearchQuery {
    pub patient_id: Option<Uuid>,
    pub status: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub page: Option<i32>,
    pub page_size: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateInvoiceRequest {
    pub invoice_type: String,
    pub patient_id: Uuid,
    pub patient_name: String,
    pub patient_mrn: Option<String>,
    pub visit_id: Option<Uuid>,
    pub due_date: Option<String>,
    pub place_of_supply: Option<String>,
    pub is_inter_state: Option<bool>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddInvoiceItemRequest {
    pub service_id: Option<Uuid>,
    pub service_code: String,
    pub service_name: String,
    pub description: Option<String>,
    pub tax_code: Option<String>,
    pub quantity: f64,
    pub unit: Option<String>,
    pub unit_price: f64,
    pub discount_percent: Option<f64>,
    pub cgst_rate: Option<f64>,
    pub sgst_rate: Option<f64>,
    pub igst_rate: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyDiscountRequest {
    pub discount_amount: f64,
    pub discount_reason: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceErrorResponse {
    pub error: String,
}

// === Handlers ===

/// Generate next invoice number
fn generate_invoice_number() -> String {
    let now = chrono::Utc::now();
    let year = now.format("%Y");
    let random = uuid::Uuid::new_v4().to_string()[..8].to_uppercase();
    format!("INV-{}-{}", year, random)
}

/// List invoices with filtering
pub async fn list_invoices(
    State(state): State<Arc<AppState>>,
    Query(query): Query<InvoiceSearchQuery>,
) -> impl IntoResponse {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query!(
        r#"
        SELECT id, invoice_number, invoice_type::text as "invoice_type!", invoice_date, patient_name,
               grand_total::text as grand_total, balance_due::text as balance_due,
               status::text as "status!"
        FROM invoices
        ORDER BY invoice_date DESC, invoice_number DESC
        LIMIT $1 OFFSET $2
        "#,
        page_size as i64,
        offset as i64
    )
    .fetch_all(&*state.database_pool)
    .await;

    match result {
        Ok(rows) => {
            let invoices: Vec<InvoiceSummaryResponse> = rows
                .iter()
                .map(|row| {
                    InvoiceSummaryResponse {
                        id: row.id,
                        invoice_number: row.invoice_number.clone(),
                        invoice_type: row.invoice_type.clone(),
                        invoice_date: row.invoice_date.to_string(),
                        patient_name: row.patient_name.clone(),
                        grand_total: parse_decimal(row.grand_total.clone()),
                        balance_due: parse_decimal(row.balance_due.clone()),
                        status: row.status.clone(),
                    }
                })
                .collect();

            let total = invoices.len() as i64;

            (StatusCode::OK, Json(InvoiceListResponse {
                data: invoices,
                total,
                page,
                page_size,
            })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(InvoiceErrorResponse { error: e.to_string() }),
        ).into_response(),
    }
}

/// Get invoice by ID with all items
pub async fn get_invoice(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let invoice_result = sqlx::query!(
        r#"
        SELECT id, invoice_number, invoice_type::text as "invoice_type!", invoice_date, due_date,
               patient_id, patient_name, patient_mrn, visit_id,
               subtotal::text as subtotal, discount_amount::text as discount_amount,
               taxable_amount::text as taxable_amount,
               cgst_amount::text as cgst_amount, sgst_amount::text as sgst_amount,
               igst_amount::text as igst_amount, total_tax::text as total_tax,
               grand_total::text as grand_total, amount_paid::text as amount_paid,
               balance_due::text as balance_due, status::text as "status!",
               is_finalized as "is_finalized!"
        FROM invoices
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(&*state.database_pool)
    .await;

    match invoice_result {
        Ok(Some(row)) => {
            // Get invoice items
            let items_result = sqlx::query!(
                r#"
                SELECT id, service_code, service_name,
                       quantity::text as quantity, COALESCE(unit, 'each') as "unit!",
                       unit_price::text as unit_price,
                       gross_amount::text as gross_amount, discount_amount::text as discount_amount,
                       net_amount::text as net_amount,
                       cgst_rate::text as cgst_rate, cgst_amount::text as cgst_amount,
                       sgst_rate::text as sgst_rate, sgst_amount::text as sgst_amount,
                       igst_rate::text as igst_rate, igst_amount::text as igst_amount,
                       total_tax::text as total_tax, total_amount::text as total_amount,
                       line_number
                FROM invoice_items
                WHERE invoice_id = $1
                ORDER BY line_number
                "#,
                id
            )
            .fetch_all(&*state.database_pool)
            .await;

            let items: Vec<InvoiceItemResponse> = items_result
                .map(|item_rows| {
                    item_rows.iter().map(|item| {
                        InvoiceItemResponse {
                            id: item.id,
                            service_code: item.service_code.clone(),
                            service_name: item.service_name.clone(),
                            quantity: parse_decimal(item.quantity.clone()),
                            unit: item.unit.clone(),
                            unit_price: parse_decimal(item.unit_price.clone()),
                            gross_amount: parse_decimal(item.gross_amount.clone()),
                            discount_amount: parse_decimal(item.discount_amount.clone()),
                            net_amount: parse_decimal(item.net_amount.clone()),
                            cgst_rate: parse_decimal(item.cgst_rate.clone()),
                            cgst_amount: parse_decimal(item.cgst_amount.clone()),
                            sgst_rate: parse_decimal(item.sgst_rate.clone()),
                            sgst_amount: parse_decimal(item.sgst_amount.clone()),
                            igst_rate: parse_decimal(item.igst_rate.clone()),
                            igst_amount: parse_decimal(item.igst_amount.clone()),
                            total_tax: parse_decimal(item.total_tax.clone()),
                            total_amount: parse_decimal(item.total_amount.clone()),
                            line_number: item.line_number,
                        }
                    }).collect()
                })
                .unwrap_or_default();

            let invoice = InvoiceResponse {
                id: row.id,
                invoice_number: row.invoice_number.clone(),
                invoice_type: row.invoice_type.clone(),
                invoice_date: row.invoice_date.to_string(),
                due_date: row.due_date.map(|d| d.to_string()),
                patient_id: row.patient_id,
                patient_name: row.patient_name.clone(),
                patient_mrn: row.patient_mrn.clone(),
                visit_id: row.visit_id,
                subtotal: parse_decimal(row.subtotal.clone()),
                discount_amount: parse_decimal(row.discount_amount.clone()),
                taxable_amount: parse_decimal(row.taxable_amount.clone()),
                cgst_amount: parse_decimal(row.cgst_amount.clone()),
                sgst_amount: parse_decimal(row.sgst_amount.clone()),
                igst_amount: parse_decimal(row.igst_amount.clone()),
                total_tax: parse_decimal(row.total_tax.clone()),
                grand_total: parse_decimal(row.grand_total.clone()),
                amount_paid: parse_decimal(row.amount_paid.clone()),
                balance_due: parse_decimal(row.balance_due.clone()),
                status: row.status.clone(),
                is_finalized: row.is_finalized,
                items,
            };

            (StatusCode::OK, Json(invoice)).into_response()
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(InvoiceErrorResponse { error: "Invoice not found".to_string() }),
        ).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(InvoiceErrorResponse { error: e.to_string() }),
        ).into_response(),
    }
}

/// Create a new invoice (draft)
pub async fn create_invoice(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateInvoiceRequest>,
) -> impl IntoResponse {
    let org_id = Uuid::nil(); // In production, get from auth context
    let invoice_number = generate_invoice_number();
    let invoice_date = chrono::Utc::now().date_naive();
    let is_inter_state = req.is_inter_state.unwrap_or(false);
    let due_date = req
        .due_date
        .as_deref()
        .and_then(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok());

    let result = sqlx::query!(
        r#"
        INSERT INTO invoices (
            organization_id, invoice_number, invoice_type, invoice_date, due_date,
            patient_id, patient_name, patient_mrn, visit_id,
            place_of_supply, is_inter_state, notes, status
        )
        VALUES ($1, $2, $3::text::invoice_type, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft'::invoice_status)
        RETURNING id
        "#,
        org_id,
        &invoice_number,
        &req.invoice_type,
        invoice_date,
        due_date,
        req.patient_id,
        &req.patient_name,
        req.patient_mrn.as_deref(),
        req.visit_id,
        req.place_of_supply.as_deref(),
        is_inter_state,
        req.notes.as_deref()
    )
    .fetch_one(&*state.database_pool)
    .await;

    match result {
        Ok(row) => {
            let id = row.id;
            (StatusCode::CREATED, Json(serde_json::json!({
                "id": id,
                "invoiceNumber": invoice_number,
                "success": true
            }))).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(InvoiceErrorResponse { error: e.to_string() }),
        ).into_response(),
    }
}

/// Add item to invoice
pub async fn add_invoice_item(
    State(state): State<Arc<AppState>>,
    Path(invoice_id): Path<Uuid>,
    Json(req): Json<AddInvoiceItemRequest>,
) -> impl IntoResponse {
    // Calculate amounts
    let unit = req.unit.unwrap_or_else(|| "each".to_string());
    let gross_amount = req.quantity * req.unit_price;
    let discount_percent = req.discount_percent.unwrap_or(0.0);
    let discount_amount = gross_amount * (discount_percent / 100.0);
    let net_amount = gross_amount - discount_amount;

    let cgst_rate = req.cgst_rate.unwrap_or(0.0);
    let sgst_rate = req.sgst_rate.unwrap_or(0.0);
    let igst_rate = req.igst_rate.unwrap_or(0.0);

    let cgst_amount = net_amount * (cgst_rate / 100.0);
    let sgst_amount = net_amount * (sgst_rate / 100.0);
    let igst_amount = net_amount * (igst_rate / 100.0);
    let total_tax = cgst_amount + sgst_amount + igst_amount;
    let total_amount = net_amount + total_tax;

    // Get next line number
    let line_result = sqlx::query_scalar!(
        "SELECT COALESCE(MAX(line_number), 0) + 1 as next_line FROM invoice_items WHERE invoice_id = $1",
        invoice_id
    )
    .fetch_one(&*state.database_pool)
    .await;

    let line_number: i32 = line_result.unwrap_or(Some(1)).unwrap_or(1);

    // Convert f64 to BigDecimal for PostgreSQL DECIMAL columns
    let result = sqlx::query!(
        r#"
        INSERT INTO invoice_items (
            invoice_id, service_id, service_code, service_name, description, tax_code,
            quantity, unit, unit_price, gross_amount, discount_percent, discount_amount,
            net_amount, is_taxable, cgst_rate, cgst_amount, sgst_rate, sgst_amount,
            igst_rate, igst_amount, total_tax, total_amount, line_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true,
                $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING id
        "#,
        invoice_id,
        req.service_id,
        &req.service_code,
        &req.service_name,
        req.description.as_deref(),
        req.tax_code.as_deref(),
        to_bd(req.quantity),
        &unit,
        to_bd(req.unit_price),
        to_bd(gross_amount),
        to_bd(discount_percent),
        to_bd(discount_amount),
        to_bd(net_amount),
        to_bd(cgst_rate),
        to_bd(cgst_amount),
        to_bd(sgst_rate),
        to_bd(sgst_amount),
        to_bd(igst_rate),
        to_bd(igst_amount),
        to_bd(total_tax),
        to_bd(total_amount),
        line_number
    )
    .fetch_one(&*state.database_pool)
    .await;

    match result {
        Ok(row) => {
            let id = row.id;

            // Update invoice totals
            let _ = update_invoice_totals(&state, invoice_id).await;

            (StatusCode::CREATED, Json(serde_json::json!({
                "id": id,
                "lineNumber": line_number,
                "success": true
            }))).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(InvoiceErrorResponse { error: e.to_string() }),
        ).into_response(),
    }
}

/// Update invoice totals from items
async fn update_invoice_totals(state: &Arc<AppState>, invoice_id: Uuid) -> Result<(), String> {
    let result = sqlx::query!(
        r#"
        UPDATE invoices SET
            subtotal = (SELECT COALESCE(SUM(gross_amount), 0) FROM invoice_items WHERE invoice_id = $1),
            taxable_amount = (SELECT COALESCE(SUM(net_amount), 0) FROM invoice_items WHERE invoice_id = $1),
            cgst_amount = (SELECT COALESCE(SUM(cgst_amount), 0) FROM invoice_items WHERE invoice_id = $1),
            sgst_amount = (SELECT COALESCE(SUM(sgst_amount), 0) FROM invoice_items WHERE invoice_id = $1),
            igst_amount = (SELECT COALESCE(SUM(igst_amount), 0) FROM invoice_items WHERE invoice_id = $1),
            total_tax = (SELECT COALESCE(SUM(total_tax), 0) FROM invoice_items WHERE invoice_id = $1),
            grand_total = (SELECT COALESCE(SUM(total_amount), 0) FROM invoice_items WHERE invoice_id = $1),
            balance_due = (SELECT COALESCE(SUM(total_amount), 0) FROM invoice_items WHERE invoice_id = $1) - amount_paid,
            updated_at = NOW()
        WHERE id = $1
        "#,
        invoice_id
    )
    .execute(&*state.database_pool)
    .await;

    result.map(|_| ()).map_err(|e| e.to_string())
}

/// Finalize invoice (make it immutable)
pub async fn finalize_invoice(
    State(state): State<Arc<AppState>>,
    Path(invoice_id): Path<Uuid>,
) -> impl IntoResponse {
    let result = sqlx::query!(
        r#"
        UPDATE invoices SET
            status = 'pending'::invoice_status,
            is_finalized = true,
            finalized_at = NOW(),
            updated_at = NOW()
        WHERE id = $1 AND is_finalized = false
        RETURNING id
        "#,
        invoice_id
    )
    .fetch_optional(&*state.database_pool)
    .await;

    match result {
        Ok(Some(_)) => (StatusCode::OK, Json(serde_json::json!({
            "success": true,
            "message": "Invoice finalized"
        }))).into_response(),
        Ok(None) => (
            StatusCode::BAD_REQUEST,
            Json(InvoiceErrorResponse { error: "Invoice not found or already finalized".to_string() }),
        ).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(InvoiceErrorResponse { error: e.to_string() }),
        ).into_response(),
    }
}

/// Cancel invoice
pub async fn cancel_invoice(
    State(state): State<Arc<AppState>>,
    Path(invoice_id): Path<Uuid>,
) -> impl IntoResponse {
    let result = sqlx::query!(
        r#"
        UPDATE invoices SET
            status = 'cancelled'::invoice_status,
            cancelled_at = NOW(),
            updated_at = NOW()
        WHERE id = $1 AND status NOT IN ('paid', 'cancelled')
        RETURNING id
        "#,
        invoice_id
    )
    .fetch_optional(&*state.database_pool)
    .await;

    match result {
        Ok(Some(_)) => (StatusCode::OK, Json(serde_json::json!({
            "success": true,
            "message": "Invoice cancelled"
        }))).into_response(),
        Ok(None) => (
            StatusCode::BAD_REQUEST,
            Json(InvoiceErrorResponse { error: "Invoice cannot be cancelled".to_string() }),
        ).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(InvoiceErrorResponse { error: e.to_string() }),
        ).into_response(),
    }
}
