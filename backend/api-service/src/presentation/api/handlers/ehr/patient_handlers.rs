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
// Database Row Types (for sqlx::query_as::<_, T>())
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

    let rows = sqlx::query_as::<_, PatientRow>(
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
    )
    .bind(organization_id)
    .bind(&query.status)
    .bind(query.provider_id)
    .bind(limit)
    .bind(offset)
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

    let rows = sqlx::query_as::<_, PatientRow>(
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
    )
    .bind(organization_id)
    .bind(&search_term)
    .bind(limit)
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

    let row = sqlx::query_as::<_, PatientRow>(
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
    )
    .bind(patient_id)
    .bind(organization_id)
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

    let row = sqlx::query_as::<_, PatientRow>(
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
    )
    .bind(&mrn)
    .bind(organization_id)
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

    let row = sqlx::query_as::<_, PatientRow>(
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
    )
    .bind(ien)
    .bind(organization_id)
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

    let patient = sqlx::query_as::<_, PatientBannerRow>(
        r#"
        SELECT
            id, mrn, first_name, last_name,
            date_of_birth, age, sex, primary_care_provider_name
        FROM ehr_patients
        WHERE id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
        "#,
    )
    .bind(patient_id)
    .bind(organization_id)
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

    // Get counts from other tables (simplified for now)
    let allergies_count = 0i64; // TODO: Query drug_allergies table
    let active_problems_count = 0i64; // TODO: Query problem_list table
    let active_medications_count = 0i64; // TODO: Query prescriptions table
    let last_visit_date: Option<chrono::DateTime<chrono::Utc>> = None; // TODO: Query encounters table

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

    let row = sqlx::query_as::<_, PatientRow>(
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
    )
    .bind(organization_id)
    .bind(&payload.mrn)
    .bind(&payload.first_name)
    .bind(&payload.last_name)
    .bind(&payload.middle_name)
    .bind(&payload.suffix)
    .bind(payload.date_of_birth)
    .bind(&payload.sex)
    .bind(&payload.marital_status)
    .bind(&payload.race)
    .bind(&payload.ethnicity)
    .bind(&payload.preferred_language)
    .bind(payload.veteran_status.unwrap_or(false))
    .bind(&payload.email)
    .bind(&payload.phone_home)
    .bind(&payload.phone_work)
    .bind(&payload.phone_mobile)
    .bind(&payload.address_line1)
    .bind(&payload.address_line2)
    .bind(&payload.city)
    .bind(&payload.state)
    .bind(&payload.zip_code)
    .bind(&payload.country)
    .bind(&payload.emergency_contact_name)
    .bind(&payload.emergency_contact_phone)
    .bind(&payload.emergency_contact_relationship)
    .bind(payload.primary_care_provider_id)
    .bind(user_id)
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
    let _ = sqlx::query_as::<_, IdRow>(
        "SELECT id FROM ehr_patients WHERE id = $1 AND organization_id = $2",
    )
    .bind(patient_id)
    .bind(organization_id)
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Patient not found: {:?}", e);
        AppError::NotFound("Patient not found".to_string())
    })?;

    // Build dynamic update query (only update provided fields)
    let row = sqlx::query_as::<_, PatientRow>(
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
    )
    .bind(&payload.first_name)
    .bind(&payload.last_name)
    .bind(&payload.middle_name)
    .bind(&payload.suffix)
    .bind(payload.date_of_birth)
    .bind(&payload.sex)
    .bind(&payload.marital_status)
    .bind(&payload.race)
    .bind(&payload.ethnicity)
    .bind(&payload.preferred_language)
    .bind(&payload.email)
    .bind(&payload.phone_home)
    .bind(&payload.phone_work)
    .bind(&payload.phone_mobile)
    .bind(&payload.phone_preferred)
    .bind(&payload.address_line1)
    .bind(&payload.address_line2)
    .bind(&payload.city)
    .bind(&payload.state)
    .bind(&payload.zip_code)
    .bind(&payload.country)
    .bind(&payload.emergency_contact_name)
    .bind(&payload.emergency_contact_phone)
    .bind(&payload.emergency_contact_relationship)
    .bind(payload.primary_care_provider_id)
    .bind(&payload.status)
    .bind(user_id)
    .bind(patient_id)
    .bind(organization_id)
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

    let result = sqlx::query(
        r#"
        UPDATE ehr_patients
        SET deleted_at = NOW(), updated_by = $1
        WHERE id = $2
          AND organization_id = $3
          AND deleted_at IS NULL
        "#,
    )
    .bind(user_id)
    .bind(patient_id)
    .bind(organization_id)
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
