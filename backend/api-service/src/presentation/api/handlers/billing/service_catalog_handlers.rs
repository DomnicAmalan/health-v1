//! Service Catalog API Handlers
//!
//! Manages hospital services, procedures, and pricing

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::sync::Arc;
use uuid::Uuid;

use crate::presentation::api::AppState;

/// Helper to parse decimal string to f64
fn parse_decimal(s: Option<String>) -> f64 {
    s.and_then(|v| v.parse().ok()).unwrap_or(0.0)
}

// === DTOs ===

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceCategoryResponse {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<Uuid>,
    pub display_order: i32,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceResponse {
    pub id: Uuid,
    pub category_id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub service_type: String,
    pub department_code: Option<String>,
    pub base_price: f64,
    pub unit: String,
    pub tax_code_id: Option<Uuid>,
    pub tax_code: Option<String>,
    pub is_taxable: bool,
    pub tax_inclusive: bool,
    pub duration_minutes: Option<i32>,
    pub requires_appointment: bool,
    pub requires_authorization: bool,
    pub allow_discount: bool,
    pub max_discount_percent: Option<f64>,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaxCodeResponse {
    pub id: Uuid,
    pub code: String,
    pub code_type: String,
    pub description: String,
    pub default_rate: f64,
    pub effective_from: String,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServicePackageResponse {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub package_price: f64,
    pub discount_percent: Option<f64>,
    pub is_taxable: bool,
    pub is_active: bool,
    pub items: Vec<PackageItemResponse>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageItemResponse {
    pub service_id: Uuid,
    pub service_code: String,
    pub service_name: String,
    pub quantity: i32,
    pub individual_price: Option<f64>,
    pub is_optional: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateServiceCategoryRequest {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<Uuid>,
    pub display_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateServiceRequest {
    pub category_id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub service_type: String,
    pub department_code: Option<String>,
    pub base_price: f64,
    pub unit: Option<String>,
    pub tax_code_id: Option<Uuid>,
    pub is_taxable: Option<bool>,
    pub tax_inclusive: Option<bool>,
    pub duration_minutes: Option<i32>,
    pub requires_appointment: Option<bool>,
    pub requires_authorization: Option<bool>,
    pub allow_discount: Option<bool>,
    pub max_discount_percent: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct ServiceSearchQuery {
    pub q: Option<String>,
    pub category_id: Option<Uuid>,
    pub service_type: Option<String>,
    pub is_active: Option<bool>,
    pub page: Option<i32>,
    pub page_size: Option<i32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceListResponse {
    pub data: Vec<ServiceResponse>,
    pub total: i64,
    pub page: i32,
    pub page_size: i32,
    pub total_pages: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BillingErrorResponse {
    pub error: String,
}

// === Handlers ===

/// List all service categories
pub async fn list_service_categories(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let result = sqlx::query(
        r#"
        SELECT id, code, name, description, parent_id, display_order, is_active
        FROM service_categories
        ORDER BY display_order, name
        "#
    )
    .fetch_all(&*state.database_pool)
    .await;

    match result {
        Ok(rows) => {
            let categories: Vec<ServiceCategoryResponse> = rows
                .iter()
                .map(|row| ServiceCategoryResponse {
                    id: row.get("id"),
                    code: row.get("code"),
                    name: row.get("name"),
                    description: row.get("description"),
                    parent_id: row.get("parent_id"),
                    display_order: row.get("display_order"),
                    is_active: row.get("is_active"),
                })
                .collect();
            (StatusCode::OK, Json(categories)).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(BillingErrorResponse { error: e.to_string() }),
        ).into_response(),
    }
}

/// Create a service category
pub async fn create_service_category(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateServiceCategoryRequest>,
) -> impl IntoResponse {
    let org_id = Uuid::nil();
    let display_order = req.display_order.unwrap_or(0);

    let result = sqlx::query(
        r#"
        INSERT INTO service_categories (organization_id, code, name, description, parent_id, display_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        "#
    )
    .bind(org_id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.parent_id)
    .bind(display_order)
    .fetch_one(&*state.database_pool)
    .await;

    match result {
        Ok(row) => {
            let id: Uuid = row.get("id");
            (StatusCode::CREATED, Json(serde_json::json!({"id": id, "success": true}))).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(BillingErrorResponse { error: e.to_string() }),
        ).into_response(),
    }
}

/// List all tax codes
pub async fn list_tax_codes(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let result = sqlx::query(
        r#"
        SELECT id, code, code_type, description,
               default_rate::text as default_rate,
               effective_from, is_active
        FROM tax_codes
        WHERE is_active = true
        ORDER BY code_type, code
        "#
    )
    .fetch_all(&*state.database_pool)
    .await;

    match result {
        Ok(rows) => {
            let codes: Vec<TaxCodeResponse> = rows
                .iter()
                .map(|row| {
                    let effective_from: chrono::NaiveDate = row.get("effective_from");
                    TaxCodeResponse {
                        id: row.get("id"),
                        code: row.get("code"),
                        code_type: row.get("code_type"),
                        description: row.get("description"),
                        default_rate: parse_decimal(row.get("default_rate")),
                        effective_from: effective_from.to_string(),
                        is_active: row.get("is_active"),
                    }
                })
                .collect();
            (StatusCode::OK, Json(codes)).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(BillingErrorResponse { error: e.to_string() }),
        ).into_response(),
    }
}

/// Search services
pub async fn search_services(
    State(state): State<Arc<AppState>>,
    Query(query): Query<ServiceSearchQuery>,
) -> impl IntoResponse {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let is_active = query.is_active.unwrap_or(true);

    let result = sqlx::query(
        r#"
        SELECT s.id, s.category_id, s.code, s.name, s.description, s.service_type,
               s.department_code, s.base_price::text as base_price, s.unit,
               s.tax_code_id, t.code as tax_code,
               s.is_taxable, s.tax_inclusive, s.duration_minutes, s.requires_appointment,
               s.requires_authorization, s.allow_discount,
               s.max_discount_percent::text as max_discount_percent, s.is_active
        FROM services s
        LEFT JOIN tax_codes t ON s.tax_code_id = t.id
        WHERE s.is_active = $1
        ORDER BY s.name
        LIMIT $2 OFFSET $3
        "#
    )
    .bind(is_active)
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&*state.database_pool)
    .await;

    match result {
        Ok(rows) => {
            let services: Vec<ServiceResponse> = rows
                .iter()
                .map(|row| ServiceResponse {
                    id: row.get("id"),
                    category_id: row.get("category_id"),
                    code: row.get("code"),
                    name: row.get("name"),
                    description: row.get("description"),
                    service_type: row.get("service_type"),
                    department_code: row.get("department_code"),
                    base_price: parse_decimal(row.get("base_price")),
                    unit: row.get("unit"),
                    tax_code_id: row.get("tax_code_id"),
                    tax_code: row.get("tax_code"),
                    is_taxable: row.get("is_taxable"),
                    tax_inclusive: row.get("tax_inclusive"),
                    duration_minutes: row.get("duration_minutes"),
                    requires_appointment: row.get("requires_appointment"),
                    requires_authorization: row.get("requires_authorization"),
                    allow_discount: row.get("allow_discount"),
                    max_discount_percent: row.get::<Option<String>, _>("max_discount_percent").map(|s| parse_decimal(Some(s))),
                    is_active: row.get("is_active"),
                })
                .collect();

            let total = services.len() as i64;
            let total_pages = ((total as f64) / (page_size as f64)).ceil() as i32;

            (StatusCode::OK, Json(ServiceListResponse {
                data: services,
                total,
                page,
                page_size,
                total_pages,
            })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(BillingErrorResponse { error: e.to_string() }),
        ).into_response(),
    }
}

/// Get a single service by ID
pub async fn get_service(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let result = sqlx::query(
        r#"
        SELECT s.id, s.category_id, s.code, s.name, s.description, s.service_type,
               s.department_code, s.base_price::text as base_price, s.unit,
               s.tax_code_id, t.code as tax_code,
               s.is_taxable, s.tax_inclusive, s.duration_minutes, s.requires_appointment,
               s.requires_authorization, s.allow_discount,
               s.max_discount_percent::text as max_discount_percent, s.is_active
        FROM services s
        LEFT JOIN tax_codes t ON s.tax_code_id = t.id
        WHERE s.id = $1
        "#
    )
    .bind(id)
    .fetch_optional(&*state.database_pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let service = ServiceResponse {
                id: row.get("id"),
                category_id: row.get("category_id"),
                code: row.get("code"),
                name: row.get("name"),
                description: row.get("description"),
                service_type: row.get("service_type"),
                department_code: row.get("department_code"),
                base_price: parse_decimal(row.get("base_price")),
                unit: row.get("unit"),
                tax_code_id: row.get("tax_code_id"),
                tax_code: row.get("tax_code"),
                is_taxable: row.get("is_taxable"),
                tax_inclusive: row.get("tax_inclusive"),
                duration_minutes: row.get("duration_minutes"),
                requires_appointment: row.get("requires_appointment"),
                requires_authorization: row.get("requires_authorization"),
                allow_discount: row.get("allow_discount"),
                max_discount_percent: row.get::<Option<String>, _>("max_discount_percent").map(|s| parse_decimal(Some(s))),
                is_active: row.get("is_active"),
            };
            (StatusCode::OK, Json(service)).into_response()
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(BillingErrorResponse { error: "Service not found".to_string() }),
        ).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(BillingErrorResponse { error: e.to_string() }),
        ).into_response(),
    }
}

/// Create a new service
pub async fn create_service(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateServiceRequest>,
) -> impl IntoResponse {
    let org_id = Uuid::nil();
    let unit = req.unit.unwrap_or_else(|| "each".to_string());
    let is_taxable = req.is_taxable.unwrap_or(true);
    let tax_inclusive = req.tax_inclusive.unwrap_or(false);
    let requires_appointment = req.requires_appointment.unwrap_or(false);
    let requires_authorization = req.requires_authorization.unwrap_or(false);
    let allow_discount = req.allow_discount.unwrap_or(true);
    let max_discount_percent = req.max_discount_percent.unwrap_or(100.0);

    let result = sqlx::query(
        r#"
        INSERT INTO services (
            organization_id, category_id, code, name, description, service_type,
            department_code, base_price, unit, tax_code_id, is_taxable, tax_inclusive,
            duration_minutes, requires_appointment, requires_authorization,
            allow_discount, max_discount_percent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id
        "#
    )
    .bind(org_id)
    .bind(req.category_id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.service_type)
    .bind(&req.department_code)
    .bind(req.base_price)
    .bind(&unit)
    .bind(req.tax_code_id)
    .bind(is_taxable)
    .bind(tax_inclusive)
    .bind(req.duration_minutes)
    .bind(requires_appointment)
    .bind(requires_authorization)
    .bind(allow_discount)
    .bind(max_discount_percent)
    .fetch_one(&*state.database_pool)
    .await;

    match result {
        Ok(row) => {
            let id: Uuid = row.get("id");
            (StatusCode::CREATED, Json(serde_json::json!({"id": id, "success": true}))).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(BillingErrorResponse { error: e.to_string() }),
        ).into_response(),
    }
}

/// Get service packages
pub async fn list_service_packages(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let result = sqlx::query(
        r#"
        SELECT id, code, name, description,
               package_price::text as package_price,
               discount_percent::text as discount_percent,
               is_taxable, is_active
        FROM service_packages
        WHERE is_active = true
        ORDER BY name
        "#
    )
    .fetch_all(&*state.database_pool)
    .await;

    match result {
        Ok(rows) => {
            let mut packages: Vec<ServicePackageResponse> = Vec::new();
            for row in rows {
                let package_id: Uuid = row.get("id");

                // Get package items
                let items_result = sqlx::query(
                    r#"
                    SELECT pi.service_id, s.code as service_code, s.name as service_name,
                           pi.quantity, pi.individual_price::text as individual_price, pi.is_optional
                    FROM service_package_items pi
                    JOIN services s ON pi.service_id = s.id
                    WHERE pi.package_id = $1
                    "#
                )
                .bind(package_id)
                .fetch_all(&*state.database_pool)
                .await;

                let items = items_result.map(|item_rows| {
                    item_rows.iter().map(|item| {
                        PackageItemResponse {
                            service_id: item.get("service_id"),
                            service_code: item.get("service_code"),
                            service_name: item.get("service_name"),
                            quantity: item.get("quantity"),
                            individual_price: item.get::<Option<String>, _>("individual_price").map(|s| parse_decimal(Some(s))),
                            is_optional: item.get("is_optional"),
                        }
                    }).collect()
                }).unwrap_or_default();

                packages.push(ServicePackageResponse {
                    id: package_id,
                    code: row.get("code"),
                    name: row.get("name"),
                    description: row.get("description"),
                    package_price: parse_decimal(row.get("package_price")),
                    discount_percent: row.get::<Option<String>, _>("discount_percent").map(|s| parse_decimal(Some(s))),
                    is_taxable: row.get("is_taxable"),
                    is_active: row.get("is_active"),
                    items,
                });
            }
            (StatusCode::OK, Json(packages)).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(BillingErrorResponse { error: e.to_string() }),
        ).into_response(),
    }
}
