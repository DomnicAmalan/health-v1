//! EHR Patient API handlers
//!
//! Provides REST API endpoints for patient management in the EHR system.

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

/// Patient list query parameters
#[derive(Debug, Deserialize)]
pub struct PatientListQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Patient search query parameters
#[derive(Debug, Deserialize)]
pub struct PatientSearchQuery {
    pub query: String,
    pub limit: Option<i64>,
}

/// Paginated response wrapper
#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

/// Patient response DTO
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PatientResponse {
    pub id: String,
    pub ien: i64,
    pub organization_id: String,
    pub mrn: String,
    pub ssn: Option<String>,
    pub first_name: String,
    pub last_name: String,
    pub middle_name: Option<String>,
    pub date_of_birth: String,
    pub sex: String,
    pub marital_status: Option<String>,
    pub race: Option<String>,
    pub ethnicity: Option<String>,
    pub language: Option<String>,
    pub religion: Option<String>,
    pub veteran_status: bool,
    pub street_address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub phone_home: Option<String>,
    pub phone_work: Option<String>,
    pub phone_mobile: Option<String>,
    pub email: Option<String>,
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub emergency_contact_relationship: Option<String>,
    pub primary_provider_id: Option<String>,
    pub primary_provider_name: Option<String>,
    pub primary_location_id: Option<String>,
    pub primary_location_name: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Create patient request DTO
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePatientRequest {
    pub mrn: String,
    pub ssn: Option<String>,
    pub first_name: String,
    pub last_name: String,
    pub middle_name: Option<String>,
    pub date_of_birth: String,
    pub sex: String,
    pub marital_status: Option<String>,
    pub race: Option<String>,
    pub ethnicity: Option<String>,
    pub language: Option<String>,
    pub religion: Option<String>,
    pub veteran_status: Option<bool>,
    pub street_address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub phone_home: Option<String>,
    pub phone_work: Option<String>,
    pub phone_mobile: Option<String>,
    pub email: Option<String>,
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub emergency_contact_relationship: Option<String>,
    pub primary_provider_id: Option<String>,
    pub primary_location_id: Option<String>,
}

/// Update patient request DTO
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePatientRequest {
    pub ssn: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub middle_name: Option<String>,
    pub date_of_birth: Option<String>,
    pub sex: Option<String>,
    pub marital_status: Option<String>,
    pub race: Option<String>,
    pub ethnicity: Option<String>,
    pub language: Option<String>,
    pub religion: Option<String>,
    pub veteran_status: Option<bool>,
    pub street_address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub phone_home: Option<String>,
    pub phone_work: Option<String>,
    pub phone_mobile: Option<String>,
    pub email: Option<String>,
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub emergency_contact_relationship: Option<String>,
    pub primary_provider_id: Option<String>,
    pub primary_location_id: Option<String>,
    pub status: Option<String>,
}

/// Error response
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
}

/// List patients
///
/// GET /v1/ehr/patients
pub async fn list_patients(
    State(_state): State<Arc<AppState>>,
    Query(query): Query<PatientListQuery>,
) -> impl IntoResponse {
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = query.offset.unwrap_or(0);

    // TODO: Implement actual database query using EhrPatientRepository
    // For now, return empty list
    let response = PaginatedResponse::<PatientResponse> {
        items: vec![],
        total: 0,
        limit,
        offset,
    };

    (StatusCode::OK, Json(response)).into_response()
}

/// Search patients
///
/// GET /v1/ehr/patients/search?query=...
pub async fn search_patients(
    State(_state): State<Arc<AppState>>,
    Query(query): Query<PatientSearchQuery>,
) -> impl IntoResponse {
    let limit = query.limit.unwrap_or(20).min(100);

    // TODO: Implement actual database search using EhrPatientRepository
    // For now, return empty list
    let response = PaginatedResponse::<PatientResponse> {
        items: vec![],
        total: 0,
        limit,
        offset: 0,
    };

    (StatusCode::OK, Json(response)).into_response()
}

/// Get patient by ID
///
/// GET /v1/ehr/patients/:id
pub async fn get_patient(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    // TODO: Implement actual database query using EhrPatientRepository
    // For now, return not found
    (
        StatusCode::NOT_FOUND,
        Json(ErrorResponse {
            error: "not_found".to_string(),
            message: format!("Patient with ID {} not found", id),
        }),
    )
        .into_response()
}

/// Get patient by MRN
///
/// GET /v1/ehr/patients/mrn/:mrn
pub async fn get_patient_by_mrn(
    State(_state): State<Arc<AppState>>,
    Path(mrn): Path<String>,
) -> impl IntoResponse {
    // TODO: Implement actual database query using EhrPatientRepository
    (
        StatusCode::NOT_FOUND,
        Json(ErrorResponse {
            error: "not_found".to_string(),
            message: format!("Patient with MRN {} not found", mrn),
        }),
    )
        .into_response()
}

/// Get patient by IEN (VistA Internal Entry Number)
///
/// GET /v1/ehr/patients/ien/:ien
pub async fn get_patient_by_ien(
    State(_state): State<Arc<AppState>>,
    Path(ien): Path<i64>,
) -> impl IntoResponse {
    // TODO: Implement actual database query using EhrPatientRepository
    (
        StatusCode::NOT_FOUND,
        Json(ErrorResponse {
            error: "not_found".to_string(),
            message: format!("Patient with IEN {} not found", ien),
        }),
    )
        .into_response()
}

/// Get patient banner info (summary for header)
///
/// GET /v1/ehr/patients/:id/banner
pub async fn get_patient_banner(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    // TODO: Implement actual database query
    (
        StatusCode::NOT_FOUND,
        Json(ErrorResponse {
            error: "not_found".to_string(),
            message: format!("Patient with ID {} not found", id),
        }),
    )
        .into_response()
}

/// Create patient
///
/// POST /v1/ehr/patients
pub async fn create_patient(
    State(_state): State<Arc<AppState>>,
    Json(request): Json<CreatePatientRequest>,
) -> impl IntoResponse {
    // TODO: Implement actual database insert using EhrPatientRepository
    // For now, return created response with placeholder
    (
        StatusCode::CREATED,
        Json(ErrorResponse {
            error: "not_implemented".to_string(),
            message: "Patient creation not yet implemented".to_string(),
        }),
    )
        .into_response()
}

/// Update patient
///
/// PUT /v1/ehr/patients/:id
pub async fn update_patient(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdatePatientRequest>,
) -> impl IntoResponse {
    // TODO: Implement actual database update using EhrPatientRepository
    (
        StatusCode::NOT_FOUND,
        Json(ErrorResponse {
            error: "not_found".to_string(),
            message: format!("Patient with ID {} not found", id),
        }),
    )
        .into_response()
}

/// Delete patient (soft delete)
///
/// DELETE /v1/ehr/patients/:id
pub async fn delete_patient(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    // TODO: Implement actual soft delete using EhrPatientRepository
    (
        StatusCode::NOT_FOUND,
        Json(ErrorResponse {
            error: "not_found".to_string(),
            message: format!("Patient with ID {} not found", id),
        }),
    )
        .into_response()
}
