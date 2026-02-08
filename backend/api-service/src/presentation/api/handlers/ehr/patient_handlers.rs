// EHR Patient Handlers
// Manage patient demographics with dual-read from PostgreSQL and YottaDB

use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::sync::Arc;
use tracing::{error, info};
use uuid::Uuid;

use super::AppState;
use shared::shared::api_response::{ApiError, ApiResponse};
use shared::shared::error::AppError;

// ============================================================================
// Database Row Types (for sqlx::query_as!())
// ============================================================================

/// Database row structure matching the ehr_patients table exactly.
/// All nullable columns are Option<T> to avoid compile-time type mismatches.
#[derive(Debug, FromRow)]
pub struct PatientRow {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub ien: Option<i32>,
    pub mrn: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub middle_name: Option<String>,
    pub suffix: Option<String>,
    pub date_of_birth: Option<chrono::NaiveDate>,
    pub age: Option<i32>,
    pub sex: Option<String>,
    pub marital_status: Option<String>,
    pub race: Option<String>,
    pub ethnicity: Option<String>,
    pub preferred_language: Option<String>,
    pub veteran_status: Option<bool>,
    pub email: Option<String>,
    pub phone_home: Option<String>,
    pub phone_work: Option<String>,
    pub phone_mobile: Option<String>,
    pub phone_preferred: Option<String>,
    pub address_line1: Option<String>,
    pub address_line2: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub emergency_contact_relationship: Option<String>,
    pub primary_care_provider_id: Option<Uuid>,
    pub primary_care_provider_name: Option<String>,
    pub status: Option<String>,
    pub deceased_date: Option<chrono::NaiveDate>,
    pub confidentiality_code: Option<String>,
    pub vip_flag: Option<bool>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<PatientRow> for PatientResponse {
    fn from(row: PatientRow) -> Self {
        PatientResponse {
            id: row.id,
            organization_id: row.organization_id,
            ien: row.ien,
            mrn: row.mrn,
            first_name: row.first_name,
            last_name: row.last_name,
            middle_name: row.middle_name,
            suffix: row.suffix,
            date_of_birth: row.date_of_birth,
            age: row.age,
            sex: row.sex,
            marital_status: row.marital_status,
            race: row.race,
            ethnicity: row.ethnicity,
            preferred_language: row.preferred_language,
            veteran_status: row.veteran_status.unwrap_or(false),
            email: row.email,
            phone_home: row.phone_home,
            phone_work: row.phone_work,
            phone_mobile: row.phone_mobile,
            phone_preferred: row.phone_preferred,
            address_line1: row.address_line1,
            address_line2: row.address_line2,
            city: row.city,
            state: row.state,
            zip_code: row.zip_code,
            country: row.country,
            emergency_contact_name: row.emergency_contact_name,
            emergency_contact_phone: row.emergency_contact_phone,
            emergency_contact_relationship: row.emergency_contact_relationship,
            primary_care_provider_id: row.primary_care_provider_id,
            primary_care_provider_name: row.primary_care_provider_name,
            status: row.status.unwrap_or_else(|| "active".to_string()),
            deceased_date: row.deceased_date,
            confidentiality_code: row.confidentiality_code,
            vip_flag: row.vip_flag.unwrap_or(false),
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PatientResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub ien: Option<i32>,
    pub mrn: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub middle_name: Option<String>,
    pub suffix: Option<String>,
    pub date_of_birth: Option<chrono::NaiveDate>,
    pub age: Option<i32>,
    pub sex: Option<String>,
    pub marital_status: Option<String>,
    pub race: Option<String>,
    pub ethnicity: Option<String>,
    pub preferred_language: Option<String>,
    pub veteran_status: bool,
    pub email: Option<String>,
    pub phone_home: Option<String>,
    pub phone_work: Option<String>,
    pub phone_mobile: Option<String>,
    pub phone_preferred: Option<String>,
    pub address_line1: Option<String>,
    pub address_line2: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub emergency_contact_relationship: Option<String>,
    pub primary_care_provider_id: Option<Uuid>,
    pub primary_care_provider_name: Option<String>,
    pub status: String,
    pub deceased_date: Option<chrono::NaiveDate>,
    pub confidentiality_code: Option<String>,
    pub vip_flag: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PatientBannerResponse {
    pub id: Uuid,
    pub mrn: String,
    pub full_name: String,
    pub date_of_birth: Option<chrono::NaiveDate>,
    pub age: Option<i32>,
    pub sex: Option<String>,
    pub primary_care_provider_name: Option<String>,
    pub allergies_count: i64,
    pub active_problems_count: i64,
    pub active_medications_count: i64,
    pub last_visit_date: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListPatientsQuery {
    pub status: Option<String>,
    pub provider_id: Option<Uuid>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchPatientsQuery {
    pub q: String,  // Search term
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePatientRequest {
    pub mrn: Option<String>,  // Auto-generated if not provided
    pub first_name: String,
    pub last_name: String,
    pub middle_name: Option<String>,
    pub suffix: Option<String>,
    pub date_of_birth: chrono::NaiveDate,
    pub sex: String,
    pub marital_status: Option<String>,
    pub race: Option<String>,
    pub ethnicity: Option<String>,
    pub preferred_language: Option<String>,
    pub veteran_status: Option<bool>,
    pub email: Option<String>,
    pub phone_home: Option<String>,
    pub phone_work: Option<String>,
    pub phone_mobile: Option<String>,
    pub address_line1: Option<String>,
    pub address_line2: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub emergency_contact_relationship: Option<String>,
    pub primary_care_provider_id: Option<Uuid>,
}

/// Database row structure for patient banner query.
#[derive(Debug, FromRow)]
pub struct PatientBannerRow {
    pub id: Uuid,
    pub mrn: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub date_of_birth: Option<chrono::NaiveDate>,
    pub age: Option<i32>,
    pub sex: Option<String>,
    pub primary_care_provider_name: Option<String>,
}

/// Database row for existence check.
#[derive(Debug, FromRow)]
pub struct IdRow {
    pub id: Uuid,
}

/// Request for finding duplicate patients
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FindDuplicatesRequest {
    pub first_name: String,
    pub last_name: String,
    pub date_of_birth: chrono::NaiveDate,
    pub ssn_last_four: Option<String>,
}

/// Response for duplicate patient match
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateMatchResponse {
    pub patient_id: Uuid,
    pub mrn: String,
    pub full_name: String,
    pub date_of_birth: Option<chrono::NaiveDate>,
    pub match_score: i32,
    pub match_reasons: Vec<String>,
}

/// Request to merge two patient records
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergePatientsRequest {
    pub survivor_id: Uuid,
    pub duplicate_id: Uuid,
    pub merge_reason: Option<String>,
}

/// Response from merge operation
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeResultResponse {
    pub survivor_id: Uuid,
    pub merged_id: Uuid,
    pub records_moved: MergeRecordCounts,
}

#[derive(Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MergeRecordCounts {
    pub encounters: i64,
    pub appointments: i64,
    pub allergies: i64,
    pub problems: i64,
    pub prescriptions: i64,
    pub vital_signs: i64,
    pub clinical_notes: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePatientRequest {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub middle_name: Option<String>,
    pub suffix: Option<String>,
    pub date_of_birth: Option<chrono::NaiveDate>,
    pub sex: Option<String>,
    pub marital_status: Option<String>,
    pub race: Option<String>,
    pub ethnicity: Option<String>,
    pub preferred_language: Option<String>,
    pub email: Option<String>,
    pub phone_home: Option<String>,
    pub phone_work: Option<String>,
    pub phone_mobile: Option<String>,
    pub phone_preferred: Option<String>,
    pub address_line1: Option<String>,
    pub address_line2: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub emergency_contact_relationship: Option<String>,
    pub primary_care_provider_id: Option<Uuid>,
    pub status: Option<String>,
}

// ============================================================================
// Handlers
// ============================================================================

/// GET /v1/ehr/patients - List patients
#[tracing::instrument(skip(state))]
pub async fn list_patients(
    State(state): State<Arc<AppState>>,
    Query(query): Query<ListPatientsQuery>,
) -> Result<Json<ApiResponse<Vec<PatientResponse>>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    info!("Listing patients for organization {}", organization_id);

    let limit = query.limit.unwrap_or(100).min(1000);
    let offset = query.offset.unwrap_or(0);

    let rows = sqlx::query_as!(
        PatientRow,
        r#"
        SELECT
            id, organization_id, ien, mrn,
            first_name, last_name, middle_name, suffix,
            date_of_birth, age, sex, marital_status,
            race, ethnicity, preferred_language, veteran_status,
            email, phone_home, phone_work, phone_mobile, phone_preferred,
            address_line1, address_line2, city, state, zip_code, country,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
            primary_care_provider_id, primary_care_provider_name,
            status, deceased_date, confidentiality_code, vip_flag,
            created_at, updated_at
        FROM ehr_patients
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR primary_care_provider_id = $3)
        ORDER BY last_name, first_name
        LIMIT $4 OFFSET $5
        "#,
        organization_id,
        query.status.as_deref(),
        query.provider_id,
        limit,
        offset,
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch patients: {:?}", e);
        AppError::from(e)
    })?;

    let patients: Vec<PatientResponse> = rows.into_iter().map(PatientResponse::from).collect();
    Ok(Json(ApiResponse::success(patients)))
}

/// GET /v1/ehr/patients/search - Search patients
#[tracing::instrument(skip(state))]
pub async fn search_patients(
    State(state): State<Arc<AppState>>,
    Query(query): Query<SearchPatientsQuery>,
) -> Result<Json<ApiResponse<Vec<PatientResponse>>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    info!("Searching patients: {}", query.q);

    let limit = query.limit.unwrap_or(20).min(100);
    let search_term = format!("%{}%", query.q);

    let rows = sqlx::query_as!(
        PatientRow,
        r#"
        SELECT
            id, organization_id, ien, mrn,
            first_name, last_name, middle_name, suffix,
            date_of_birth, age, sex, marital_status,
            race, ethnicity, preferred_language, veteran_status,
            email, phone_home, phone_work, phone_mobile, phone_preferred,
            address_line1, address_line2, city, state, zip_code, country,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
            primary_care_provider_id, primary_care_provider_name,
            status, deceased_date, confidentiality_code, vip_flag,
            created_at, updated_at
        FROM ehr_patients
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND (
              first_name ILIKE $2 OR
              last_name ILIKE $2 OR
              mrn ILIKE $2 OR
              phone_mobile ILIKE $2 OR
              email ILIKE $2
          )
        ORDER BY
            CASE
                WHEN mrn ILIKE $2 THEN 1
                WHEN last_name ILIKE $2 THEN 2
                ELSE 3
            END,
            last_name, first_name
        LIMIT $3
        "#,
        organization_id,
        &search_term,
        limit,
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to search patients: {:?}", e);
        AppError::from(e)
    })?;

    let patients: Vec<PatientResponse> = rows.into_iter().map(PatientResponse::from).collect();
    Ok(Json(ApiResponse::success(patients)))
}

/// GET /v1/ehr/patients/:id - Get patient details
#[tracing::instrument(skip(state))]
pub async fn get_patient(
    State(state): State<Arc<AppState>>,
    Path(patient_id): Path<Uuid>,
) -> Result<Json<ApiResponse<PatientResponse>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    info!("Getting patient: {}", patient_id);

    let row = sqlx::query_as!(
        PatientRow,
        r#"
        SELECT
            id, organization_id, ien, mrn,
            first_name, last_name, middle_name, suffix,
            date_of_birth, age, sex, marital_status,
            race, ethnicity, preferred_language, veteran_status,
            email, phone_home, phone_work, phone_mobile, phone_preferred,
            address_line1, address_line2, city, state, zip_code, country,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
            primary_care_provider_id, primary_care_provider_name,
            status, deceased_date, confidentiality_code, vip_flag,
            created_at, updated_at
        FROM ehr_patients
        WHERE id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
        "#,
        patient_id,
        organization_id,
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch patient: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Patient not found".to_string())
        } else {
            AppError::from(e)
        }
    })?;

    Ok(Json(ApiResponse::success(PatientResponse::from(row))))
}

/// GET /v1/ehr/patients/mrn/:mrn - Get patient by MRN
#[tracing::instrument(skip(state))]
pub async fn get_patient_by_mrn(
    State(state): State<Arc<AppState>>,
    Path(mrn): Path<String>,
) -> Result<Json<ApiResponse<PatientResponse>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    info!("Getting patient by MRN: {}", mrn);

    let row = sqlx::query_as!(
        PatientRow,
        r#"
        SELECT
            id, organization_id, ien, mrn,
            first_name, last_name, middle_name, suffix,
            date_of_birth, age, sex, marital_status,
            race, ethnicity, preferred_language, veteran_status,
            email, phone_home, phone_work, phone_mobile, phone_preferred,
            address_line1, address_line2, city, state, zip_code, country,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
            primary_care_provider_id, primary_care_provider_name,
            status, deceased_date, confidentiality_code, vip_flag,
            created_at, updated_at
        FROM ehr_patients
        WHERE mrn = $1
          AND organization_id = $2
          AND deleted_at IS NULL
        "#,
        mrn.as_str(),
        organization_id,
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch patient by MRN: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound(format!("Patient with MRN {} not found", mrn))
        } else {
            AppError::from(e)
        }
    })?;

    Ok(Json(ApiResponse::success(PatientResponse::from(row))))
}

/// GET /v1/ehr/patients/ien/:ien - Get patient by VistA IEN
#[tracing::instrument(skip(state))]
pub async fn get_patient_by_ien(
    State(state): State<Arc<AppState>>,
    Path(ien): Path<i32>,
) -> Result<Json<ApiResponse<PatientResponse>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    info!("Getting patient by IEN: {}", ien);

    let row = sqlx::query_as!(
        PatientRow,
        r#"
        SELECT
            id, organization_id, ien, mrn,
            first_name, last_name, middle_name, suffix,
            date_of_birth, age, sex, marital_status,
            race, ethnicity, preferred_language, veteran_status,
            email, phone_home, phone_work, phone_mobile, phone_preferred,
            address_line1, address_line2, city, state, zip_code, country,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
            primary_care_provider_id, primary_care_provider_name,
            status, deceased_date, confidentiality_code, vip_flag,
            created_at, updated_at
        FROM ehr_patients
        WHERE ien = $1
          AND organization_id = $2
          AND deleted_at IS NULL
        "#,
        ien,
        organization_id,
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch patient by IEN: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound(format!("Patient with IEN {} not found", ien))
        } else {
            AppError::from(e)
        }
    })?;

    Ok(Json(ApiResponse::success(PatientResponse::from(row))))
}

/// GET /v1/ehr/patients/:id/banner - Get patient banner (summary)
#[tracing::instrument(skip(state))]
pub async fn get_patient_banner(
    State(state): State<Arc<AppState>>,
    Path(patient_id): Path<Uuid>,
) -> Result<Json<ApiResponse<PatientBannerResponse>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    info!("Getting patient banner: {}", patient_id);

    let patient = sqlx::query_as!(
        PatientBannerRow,
        r#"
        SELECT
            id, mrn, first_name, last_name,
            date_of_birth, age, sex, primary_care_provider_name
        FROM ehr_patients
        WHERE id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
        "#,
        patient_id,
        organization_id,
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch patient: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Patient not found".to_string())
        } else {
            AppError::from(e)
        }
    })?;

    let full_name = format!("{} {}",
        patient.first_name.clone().unwrap_or_default(),
        patient.last_name.clone().unwrap_or_default()
    );

    // Query actual counts from related tables
    let allergies_count: i64 = sqlx::query_scalar!(
        r#"SELECT COUNT(*) as "count!" FROM drug_allergies WHERE patient_id = $1 AND status = 'active'"#,
        patient_id,
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to count allergies: {:?}", e);
        AppError::from(e)
    })?;

    let active_problems_count: i64 = sqlx::query_scalar!(
        r#"SELECT COUNT(*) as "count!" FROM problem_list WHERE patient_id = $1 AND status = 'active'"#,
        patient_id,
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to count problems: {:?}", e);
        AppError::from(e)
    })?;

    let active_medications_count: i64 = sqlx::query_scalar!(
        r#"SELECT COUNT(*) as "count!" FROM prescriptions WHERE patient_id = $1 AND status = 'active'"#,
        patient_id,
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to count prescriptions: {:?}", e);
        AppError::from(e)
    })?;

    let last_visit_date: Option<chrono::DateTime<chrono::Utc>> = sqlx::query_scalar!(
        "SELECT MAX(encounter_datetime) FROM encounters WHERE patient_id = $1 AND status = 'completed'",
        patient_id,
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .ok()
    .flatten();

    let banner = PatientBannerResponse {
        id: patient.id,
        mrn: patient.mrn,
        full_name,
        date_of_birth: patient.date_of_birth,
        age: patient.age,
        sex: patient.sex,
        primary_care_provider_name: patient.primary_care_provider_name,
        allergies_count,
        active_problems_count,
        active_medications_count,
        last_visit_date,
    };

    Ok(Json(ApiResponse::success(banner)))
}

/// POST /v1/ehr/patients - Create patient
#[tracing::instrument(skip(state, payload))]
pub async fn create_patient(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreatePatientRequest>,
) -> Result<Json<ApiResponse<PatientResponse>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    let user_id = Uuid::nil(); // Use system user for now
    info!("Creating patient: {} {}", payload.first_name, payload.last_name);

    // Assertion 1: Validate sex
    if !matches!(payload.sex.as_str(), "M" | "F" | "O" | "U") {
        return Err(AppError::Validation("Sex must be M, F, O, or U".to_string()).into());
    }

    // Assertion 2: Validate date of birth is not in future
    if payload.date_of_birth > chrono::Utc::now().date_naive() {
        return Err(AppError::Validation("Date of birth cannot be in the future".to_string()).into());
    }

    let row = sqlx::query_as!(
        PatientRow,
        r#"
        INSERT INTO ehr_patients (
            organization_id, mrn, first_name, last_name, middle_name, suffix,
            date_of_birth, sex, marital_status, race, ethnicity,
            preferred_language, veteran_status, email, phone_home, phone_work,
            phone_mobile, address_line1, address_line2, city, state, zip_code,
            country, emergency_contact_name, emergency_contact_phone,
            emergency_contact_relationship, primary_care_provider_id,
            status, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, 'active', $28, $28)
        RETURNING
            id, organization_id, ien, mrn,
            first_name, last_name, middle_name, suffix,
            date_of_birth, age, sex, marital_status,
            race, ethnicity, preferred_language, veteran_status,
            email, phone_home, phone_work, phone_mobile, phone_preferred,
            address_line1, address_line2, city, state, zip_code, country,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
            primary_care_provider_id, primary_care_provider_name,
            status, deceased_date, confidentiality_code, vip_flag,
            created_at, updated_at
        "#,
        organization_id,
        payload.mrn.as_deref(),
        &payload.first_name,
        &payload.last_name,
        payload.middle_name.as_deref(),
        payload.suffix.as_deref(),
        payload.date_of_birth,
        &payload.sex,
        payload.marital_status.as_deref(),
        payload.race.as_deref(),
        payload.ethnicity.as_deref(),
        payload.preferred_language.as_deref(),
        payload.veteran_status.unwrap_or(false),
        payload.email.as_deref(),
        payload.phone_home.as_deref(),
        payload.phone_work.as_deref(),
        payload.phone_mobile.as_deref(),
        payload.address_line1.as_deref(),
        payload.address_line2.as_deref(),
        payload.city.as_deref(),
        payload.state.as_deref(),
        payload.zip_code.as_deref(),
        payload.country.as_deref(),
        payload.emergency_contact_name.as_deref(),
        payload.emergency_contact_phone.as_deref(),
        payload.emergency_contact_relationship.as_deref(),
        payload.primary_care_provider_id,
        user_id,
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to create patient: {:?}", e);
        AppError::from(e)
    })?;

    let patient = PatientResponse::from(row);
    info!("Patient created: {} ({})", patient.id, patient.mrn);
    Ok(Json(ApiResponse::success(patient)))
}

/// PUT /v1/ehr/patients/:id - Update patient
#[tracing::instrument(skip(state, payload))]
pub async fn update_patient(
    State(state): State<Arc<AppState>>,
    Path(patient_id): Path<Uuid>,
    Json(payload): Json<UpdatePatientRequest>,
) -> Result<Json<ApiResponse<PatientResponse>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    let user_id = Uuid::nil(); // Use system user for now
    info!("Updating patient: {}", patient_id);

    // Verify patient exists
    let _ = sqlx::query_as!(
        IdRow,
        "SELECT id FROM ehr_patients WHERE id = $1 AND organization_id = $2",
        patient_id,
        organization_id,
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Patient not found: {:?}", e);
        AppError::NotFound("Patient not found".to_string())
    })?;

    // Build dynamic update query (only update provided fields)
    let row = sqlx::query_as!(
        PatientRow,
        r#"
        UPDATE ehr_patients
        SET
            first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            middle_name = COALESCE($3, middle_name),
            suffix = COALESCE($4, suffix),
            date_of_birth = COALESCE($5, date_of_birth),
            sex = COALESCE($6, sex),
            marital_status = COALESCE($7, marital_status),
            race = COALESCE($8, race),
            ethnicity = COALESCE($9, ethnicity),
            preferred_language = COALESCE($10, preferred_language),
            email = COALESCE($11, email),
            phone_home = COALESCE($12, phone_home),
            phone_work = COALESCE($13, phone_work),
            phone_mobile = COALESCE($14, phone_mobile),
            phone_preferred = COALESCE($15, phone_preferred),
            address_line1 = COALESCE($16, address_line1),
            address_line2 = COALESCE($17, address_line2),
            city = COALESCE($18, city),
            state = COALESCE($19, state),
            zip_code = COALESCE($20, zip_code),
            country = COALESCE($21, country),
            emergency_contact_name = COALESCE($22, emergency_contact_name),
            emergency_contact_phone = COALESCE($23, emergency_contact_phone),
            emergency_contact_relationship = COALESCE($24, emergency_contact_relationship),
            primary_care_provider_id = COALESCE($25, primary_care_provider_id),
            status = COALESCE($26, status),
            updated_by = $27
        WHERE id = $28
          AND organization_id = $29
        RETURNING
            id, organization_id, ien, mrn,
            first_name, last_name, middle_name, suffix,
            date_of_birth, age, sex, marital_status,
            race, ethnicity, preferred_language, veteran_status,
            email, phone_home, phone_work, phone_mobile, phone_preferred,
            address_line1, address_line2, city, state, zip_code, country,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
            primary_care_provider_id, primary_care_provider_name,
            status, deceased_date, confidentiality_code, vip_flag,
            created_at, updated_at
        "#,
        payload.first_name.as_deref(),
        payload.last_name.as_deref(),
        payload.middle_name.as_deref(),
        payload.suffix.as_deref(),
        payload.date_of_birth,
        payload.sex.as_deref(),
        payload.marital_status.as_deref(),
        payload.race.as_deref(),
        payload.ethnicity.as_deref(),
        payload.preferred_language.as_deref(),
        payload.email.as_deref(),
        payload.phone_home.as_deref(),
        payload.phone_work.as_deref(),
        payload.phone_mobile.as_deref(),
        payload.phone_preferred.as_deref(),
        payload.address_line1.as_deref(),
        payload.address_line2.as_deref(),
        payload.city.as_deref(),
        payload.state.as_deref(),
        payload.zip_code.as_deref(),
        payload.country.as_deref(),
        payload.emergency_contact_name.as_deref(),
        payload.emergency_contact_phone.as_deref(),
        payload.emergency_contact_relationship.as_deref(),
        payload.primary_care_provider_id,
        payload.status.as_deref(),
        user_id,
        patient_id,
        organization_id,
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to update patient: {:?}", e);
        AppError::from(e)
    })?;

    let patient = PatientResponse::from(row);
    info!("Patient updated: {}", patient.id);
    Ok(Json(ApiResponse::success(patient)))
}

/// DELETE /v1/ehr/patients/:id - Soft delete patient
#[tracing::instrument(skip(state))]
pub async fn delete_patient(
    State(state): State<Arc<AppState>>,
    Path(patient_id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, ApiError> {
    let organization_id = Uuid::nil(); // Use system org for now
    let user_id = Uuid::nil(); // Use system user for now
    info!("Deleting patient: {}", patient_id);

    let result = sqlx::query!(
        r#"
        UPDATE ehr_patients
        SET deleted_at = NOW(), updated_by = $1
        WHERE id = $2
          AND organization_id = $3
          AND deleted_at IS NULL
        "#,
        user_id,
        patient_id,
        organization_id,
    )
    .execute(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to delete patient: {:?}", e);
        AppError::from(e)
    })?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Patient not found".to_string()).into());
    }

    info!("Patient deleted: {}", patient_id);
    Ok(Json(ApiResponse::success(serde_json::json!({
        "id": patient_id,
        "deleted": true
    }))))
}

/// POST /v1/ehr/patients/find-duplicates - Find potential duplicate patients
#[tracing::instrument(skip(state, payload))]
pub async fn find_duplicate_patients(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<FindDuplicatesRequest>,
) -> Result<Json<ApiResponse<Vec<DuplicateMatchResponse>>>, ApiError> {
    let organization_id = Uuid::nil();
    info!(
        "Finding duplicates for: {} {} (DOB: {})",
        payload.first_name, payload.last_name, payload.date_of_birth
    );

    // Assertion 1: Names must not be empty
    if payload.first_name.trim().is_empty() || payload.last_name.trim().is_empty() {
        return Err(AppError::Validation("First and last name are required".to_string()).into());
    }

    // Assertion 2: DOB must be in the past
    if payload.date_of_birth > chrono::Utc::now().date_naive() {
        return Err(AppError::Validation("Date of birth cannot be in the future".to_string()).into());
    }

    // Query potential matches with scoring
    // Note: SSN lookup would require joining patient_identifiers table
    let rows = sqlx::query_as!(
        DuplicateMatchRow,
        r#"
        SELECT
            p.id as patient_id,
            p.mrn,
            CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) as "full_name!",
            p.date_of_birth,
            (
                CASE WHEN LOWER(p.first_name) = LOWER($1) THEN 30 ELSE 0 END +
                CASE WHEN LOWER(p.last_name) = LOWER($2) THEN 30 ELSE 0 END +
                CASE WHEN p.date_of_birth = $3 THEN 40 ELSE 0 END
            )::INTEGER as "match_score!",
            ARRAY_REMOVE(ARRAY[
                CASE WHEN LOWER(p.first_name) = LOWER($1) THEN 'first_name' END,
                CASE WHEN LOWER(p.last_name) = LOWER($2) THEN 'last_name' END,
                CASE WHEN p.date_of_birth = $3 THEN 'date_of_birth' END
            ], NULL) as match_reasons
        FROM ehr_patients p
        WHERE p.organization_id = $4
          AND p.status != 'merged'
          AND p.deleted_at IS NULL
          AND (
              (LOWER(p.first_name) = LOWER($1) AND LOWER(p.last_name) = LOWER($2))
              OR p.date_of_birth = $3
          )
        ORDER BY 5 DESC
        LIMIT 10
        "#,
        &payload.first_name,
        &payload.last_name,
        payload.date_of_birth,
        organization_id,
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to find duplicates: {:?}", e);
        AppError::from(e)
    })?;

    let matches: Vec<DuplicateMatchResponse> = rows
        .into_iter()
        .filter(|r| r.match_score > 0)
        .map(|r| DuplicateMatchResponse {
            patient_id: r.patient_id,
            mrn: r.mrn,
            full_name: r.full_name,
            date_of_birth: r.date_of_birth,
            match_score: r.match_score,
            match_reasons: r.match_reasons.unwrap_or_default(),
        })
        .collect();

    info!("Found {} potential duplicates", matches.len());
    Ok(Json(ApiResponse::success(matches)))
}

/// Database row for duplicate match query
#[derive(Debug, FromRow)]
struct DuplicateMatchRow {
    patient_id: Uuid,
    mrn: String,
    full_name: String,
    date_of_birth: Option<chrono::NaiveDate>,
    match_score: i32,
    match_reasons: Option<Vec<String>>,
}

/// POST /v1/ehr/patients/merge - Merge two patient records
#[tracing::instrument(skip(state, payload))]
pub async fn merge_patients(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<MergePatientsRequest>,
) -> Result<Json<ApiResponse<MergeResultResponse>>, ApiError> {
    let organization_id = Uuid::nil();
    let user_id = Uuid::nil();
    info!(
        "Merging patient {} into {}",
        payload.duplicate_id, payload.survivor_id
    );

    // Assertion 1: Cannot merge patient into itself
    if payload.survivor_id == payload.duplicate_id {
        return Err(AppError::Validation("Cannot merge patient into itself".to_string()).into());
    }

    // Start transaction for atomic merge
    let mut tx = state
        .database_pool
        .begin()
        .await
        .map_err(|e| AppError::from(e))?;

    // Verify both patients exist and are not already merged
    let survivor = sqlx::query_as!(
        PatientRow,
        r#"
        SELECT
            id, organization_id, ien, mrn,
            first_name, last_name, middle_name, suffix,
            date_of_birth, age, sex, marital_status,
            race, ethnicity, preferred_language, veteran_status,
            email, phone_home, phone_work, phone_mobile, phone_preferred,
            address_line1, address_line2, city, state, zip_code, country,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
            primary_care_provider_id, primary_care_provider_name,
            status, deceased_date, confidentiality_code, vip_flag,
            created_at, updated_at
        FROM ehr_patients
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL AND status != 'merged'
        "#,
        payload.survivor_id,
        organization_id,
    )
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| AppError::from(e))?
    .ok_or_else(|| AppError::NotFound("Survivor patient not found or already merged".to_string()))?;

    let duplicate = sqlx::query_as!(
        PatientRow,
        r#"
        SELECT
            id, organization_id, ien, mrn,
            first_name, last_name, middle_name, suffix,
            date_of_birth, age, sex, marital_status,
            race, ethnicity, preferred_language, veteran_status,
            email, phone_home, phone_work, phone_mobile, phone_preferred,
            address_line1, address_line2, city, state, zip_code, country,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
            primary_care_provider_id, primary_care_provider_name,
            status, deceased_date, confidentiality_code, vip_flag,
            created_at, updated_at
        FROM ehr_patients
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL AND status != 'merged'
        "#,
        payload.duplicate_id,
        organization_id,
    )
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| AppError::from(e))?
    .ok_or_else(|| AppError::NotFound("Duplicate patient not found or already merged".to_string()))?;

    // Assertion 2: Both patients must be active or inactive
    if survivor.status.as_deref() == Some("merged") || duplicate.status.as_deref() == Some("merged") {
        return Err(AppError::Validation("Cannot merge already merged patients".to_string()).into());
    }

    let mut counts = MergeRecordCounts::default();

    // Move encounters
    let result = sqlx::query!(
        "UPDATE encounters SET patient_id = $1 WHERE patient_id = $2",
        payload.survivor_id,
        payload.duplicate_id,
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| AppError::from(e))?;
    counts.encounters = result.rows_affected() as i64;

    // Move appointments
    let result = sqlx::query!(
        "UPDATE appointments SET patient_id = $1 WHERE patient_id = $2",
        payload.survivor_id,
        payload.duplicate_id,
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| AppError::from(e))?;
    counts.appointments = result.rows_affected() as i64;

    // Move drug allergies
    let result = sqlx::query!(
        "UPDATE drug_allergies SET patient_id = $1 WHERE patient_id = $2",
        payload.survivor_id,
        payload.duplicate_id,
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| AppError::from(e))?;
    counts.allergies = result.rows_affected() as i64;

    // Move problem list
    let result = sqlx::query!(
        "UPDATE problem_list SET patient_id = $1 WHERE patient_id = $2",
        payload.survivor_id,
        payload.duplicate_id,
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| AppError::from(e))?;
    counts.problems = result.rows_affected() as i64;

    // Move prescriptions
    let result = sqlx::query!(
        "UPDATE prescriptions SET patient_id = $1 WHERE patient_id = $2",
        payload.survivor_id,
        payload.duplicate_id,
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| AppError::from(e))?;
    counts.prescriptions = result.rows_affected() as i64;

    // Move vital signs
    let result = sqlx::query!(
        "UPDATE vital_signs SET patient_id = $1 WHERE patient_id = $2",
        payload.survivor_id,
        payload.duplicate_id,
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| AppError::from(e))?;
    counts.vital_signs = result.rows_affected() as i64;

    // Move clinical notes
    let result = sqlx::query!(
        "UPDATE clinical_notes SET patient_id = $1 WHERE patient_id = $2",
        payload.survivor_id,
        payload.duplicate_id,
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| AppError::from(e))?;
    counts.clinical_notes = result.rows_affected() as i64;

    // Record merge history
    sqlx::query!(
        r#"
        INSERT INTO patient_merge_history (
            organization_id, source_patient_id, source_mrn,
            target_patient_id, target_mrn, merged_by, merge_reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
        organization_id,
        payload.duplicate_id,
        &duplicate.mrn,
        payload.survivor_id,
        &survivor.mrn,
        user_id,
        payload.merge_reason.as_deref(),
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| AppError::from(e))?;

    // Mark duplicate as merged
    sqlx::query!(
        r#"
        UPDATE ehr_patients
        SET status = 'merged', updated_by = $1, updated_at = NOW()
        WHERE id = $2
        "#,
        user_id,
        payload.duplicate_id,
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| AppError::from(e))?;

    // Commit transaction
    tx.commit().await.map_err(|e| AppError::from(e))?;

    info!(
        "Merge complete: {} -> {} (moved {} total records)",
        payload.duplicate_id,
        payload.survivor_id,
        counts.encounters + counts.appointments + counts.allergies
            + counts.problems + counts.prescriptions + counts.vital_signs + counts.clinical_notes
    );

    Ok(Json(ApiResponse::success(MergeResultResponse {
        survivor_id: payload.survivor_id,
        merged_id: payload.duplicate_id,
        records_moved: counts,
    })))
}
