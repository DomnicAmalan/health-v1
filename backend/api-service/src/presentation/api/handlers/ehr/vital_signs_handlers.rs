//! Vital Signs Recording Handlers
//!
//! Provides REST API handlers for vital signs capture including:
//! - Core vital signs (BP, HR, RR, Temp, SpO2)
//! - Weight, height, BMI (auto-calculated)
//! - Pain assessment
//! - Automatic abnormal/critical value flagging
//! - Trend analysis

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use super::AppState;
use std::sync::Arc;
use tracing::{error, info, warn};
use uuid::Uuid;

use shared::shared::error::AppError;
use shared::shared::api_response::{ApiError, ApiResponse};

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct ListVitalSignsRequest {
    pub patient_id: Option<Uuid>,
    pub encounter_id: Option<Uuid>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub is_critical: Option<bool>,
    pub limit: Option<i64>,
}

/// Database row structure for vital signs
#[derive(Debug, FromRow)]
pub struct VitalSignsRow {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub ien: Option<i32>,
    pub patient_id: Uuid,
    pub patient_ien: Option<i32>,
    pub encounter_id: Option<Uuid>,
    pub appointment_id: Option<Uuid>,
    pub recorded_by: Uuid,
    pub recorded_by_name: Option<String>,
    pub recorded_datetime: DateTime<Utc>,
    pub recorded_location: Option<String>,
    pub blood_pressure_systolic: Option<i32>,
    pub blood_pressure_diastolic: Option<i32>,
    pub heart_rate: Option<i32>,
    pub respiratory_rate: Option<i32>,
    pub temperature: Option<sqlx::types::BigDecimal>,
    pub temperature_unit: Option<String>,
    pub oxygen_saturation: Option<i32>,
    pub oxygen_delivery_method: Option<String>,
    pub weight: Option<sqlx::types::BigDecimal>,
    pub weight_unit: Option<String>,
    pub height: Option<sqlx::types::BigDecimal>,
    pub height_unit: Option<String>,
    pub bmi: Option<sqlx::types::BigDecimal>,
    pub pain_score: Option<i32>,
    pub pain_location: Option<String>,
    pub position: Option<String>,
    pub blood_pressure_site: Option<String>,
    pub is_abnormal: Option<bool>,
    pub is_critical: Option<bool>,
    pub abnormal_flags: Option<serde_json::Value>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
}

impl From<VitalSignsRow> for VitalSignsResponse {
    fn from(row: VitalSignsRow) -> Self {
        use std::str::FromStr;
        VitalSignsResponse {
            id: row.id,
            organization_id: row.organization_id,
            ien: row.ien,
            patient_id: row.patient_id,
            patient_ien: row.patient_ien.unwrap_or(0),
            encounter_id: row.encounter_id,
            appointment_id: row.appointment_id,
            recorded_by: row.recorded_by,
            recorded_by_name: row.recorded_by_name,
            recorded_datetime: row.recorded_datetime,
            recorded_location: row.recorded_location,
            blood_pressure_systolic: row.blood_pressure_systolic,
            blood_pressure_diastolic: row.blood_pressure_diastolic,
            heart_rate: row.heart_rate,
            respiratory_rate: row.respiratory_rate,
            temperature: row.temperature.and_then(|v| f64::from_str(&v.to_string()).ok()),
            temperature_unit: row.temperature_unit.unwrap_or_else(|| "fahrenheit".to_string()),
            oxygen_saturation: row.oxygen_saturation,
            oxygen_delivery_method: row.oxygen_delivery_method,
            weight: row.weight.and_then(|v| f64::from_str(&v.to_string()).ok()),
            weight_unit: row.weight_unit.unwrap_or_else(|| "kg".to_string()),
            height: row.height.and_then(|v| f64::from_str(&v.to_string()).ok()),
            height_unit: row.height_unit.unwrap_or_else(|| "cm".to_string()),
            bmi: row.bmi.and_then(|v| f64::from_str(&v.to_string()).ok()),
            pain_score: row.pain_score,
            pain_location: row.pain_location,
            position: row.position,
            blood_pressure_site: row.blood_pressure_site,
            is_abnormal: row.is_abnormal.unwrap_or(false),
            is_critical: row.is_critical.unwrap_or(false),
            abnormal_flags: row.abnormal_flags,
            notes: row.notes,
            created_at: row.created_at,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct VitalSignsResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub ien: Option<i32>,
    pub patient_id: Uuid,
    pub patient_ien: i32,
    pub encounter_id: Option<Uuid>,
    pub appointment_id: Option<Uuid>,
    pub recorded_by: Uuid,
    pub recorded_by_name: Option<String>,
    pub recorded_datetime: DateTime<Utc>,
    pub recorded_location: Option<String>,
    pub blood_pressure_systolic: Option<i32>,
    pub blood_pressure_diastolic: Option<i32>,
    pub heart_rate: Option<i32>,
    pub respiratory_rate: Option<i32>,
    pub temperature: Option<f64>,
    pub temperature_unit: String,
    pub oxygen_saturation: Option<i32>,
    pub oxygen_delivery_method: Option<String>,
    pub weight: Option<f64>,
    pub weight_unit: String,
    pub height: Option<f64>,
    pub height_unit: String,
    pub bmi: Option<f64>,
    pub pain_score: Option<i32>,
    pub pain_location: Option<String>,
    pub position: Option<String>,
    pub blood_pressure_site: Option<String>,
    pub is_abnormal: bool,
    pub is_critical: bool,
    pub abnormal_flags: Option<serde_json::Value>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVitalSignsRequest {
    pub patient_id: Uuid,
    pub encounter_id: Option<Uuid>,
    pub appointment_id: Option<Uuid>,
    pub recorded_datetime: Option<String>,
    pub blood_pressure_systolic: Option<i32>,
    pub blood_pressure_diastolic: Option<i32>,
    pub heart_rate: Option<i32>,
    pub respiratory_rate: Option<i32>,
    pub temperature: Option<f64>,
    pub temperature_unit: Option<String>,
    pub oxygen_saturation: Option<i32>,
    pub oxygen_delivery_method: Option<String>,
    pub weight: Option<f64>,
    pub weight_unit: Option<String>,
    pub height: Option<f64>,
    pub height_unit: Option<String>,
    pub pain_score: Option<i32>,
    pub pain_location: Option<String>,
    pub pain_quality: Option<String>,
    pub position: Option<String>,
    pub blood_pressure_site: Option<String>,
    pub blood_pressure_method: Option<String>,
    pub consciousness_level: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateVitalSignsRequest {
    pub blood_pressure_systolic: Option<i32>,
    pub blood_pressure_diastolic: Option<i32>,
    pub heart_rate: Option<i32>,
    pub respiratory_rate: Option<i32>,
    pub temperature: Option<f64>,
    pub oxygen_saturation: Option<i32>,
    pub weight: Option<f64>,
    pub height: Option<f64>,
    pub pain_score: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct VitalSignsTrendResponse {
    pub vital_type: String,
    pub readings: Vec<TrendReading>,
}

#[derive(Debug, Serialize)]
pub struct TrendReading {
    pub recorded_datetime: DateTime<Utc>,
    pub value: f64,
    pub is_abnormal: bool,
    pub is_critical: bool,
}

// ============================================================================
// Handlers
// ============================================================================

/// GET /v1/ehr/vital-signs - List vital signs with filters
#[tracing::instrument(skip(state))]
pub async fn list_vital_signs(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListVitalSignsRequest>,
) -> Result<Json<ApiResponse<Vec<VitalSignsResponse>>>, ApiError> {
    info!("Listing vital signs");

    // Use a system user ID for now
    let organization_id = Uuid::nil();

    let limit = params.limit.unwrap_or(100).min(1000);

    let mut query_builder = sqlx::QueryBuilder::new(
        "SELECT id, organization_id, ien, patient_id, patient_ien, encounter_id, appointment_id,
                recorded_by, recorded_by_name, recorded_datetime, recorded_location,
                blood_pressure_systolic, blood_pressure_diastolic, heart_rate, respiratory_rate,
                temperature, temperature_unit, oxygen_saturation, oxygen_delivery_method,
                weight, weight_unit, height, height_unit, bmi, pain_score, pain_location,
                position, blood_pressure_site, is_abnormal, is_critical, abnormal_flags,
                notes, created_at
         FROM vital_signs
         WHERE organization_id = "
    );
    query_builder.push_bind(organization_id);
    query_builder.push(" AND deleted_at IS NULL");

    if let Some(patient_id) = params.patient_id {
        query_builder.push(" AND patient_id = ");
        query_builder.push_bind(patient_id);
    }

    if let Some(encounter_id) = params.encounter_id {
        query_builder.push(" AND encounter_id = ");
        query_builder.push_bind(encounter_id);
    }

    if let Some(date_from) = params.date_from {
        query_builder.push(" AND DATE(recorded_datetime) >= ");
        query_builder.push_bind(date_from);
    }

    if let Some(date_to) = params.date_to {
        query_builder.push(" AND DATE(recorded_datetime) <= ");
        query_builder.push_bind(date_to);
    }

    if let Some(is_critical) = params.is_critical {
        query_builder.push(" AND is_critical = ");
        query_builder.push_bind(is_critical);
    }

    query_builder.push(" ORDER BY recorded_datetime DESC LIMIT ");
    query_builder.push_bind(limit);

    let rows: Vec<VitalSignsRow> = query_builder
        .build_query_as::<VitalSignsRow>()
        .fetch_all(state.database_pool.as_ref())
        .await
        .map_err(|e| {
            error!("Failed to fetch vital signs: {:?}", e);
            AppError::from(e)
        })?;

    let vitals: Vec<VitalSignsResponse> = rows.into_iter().map(VitalSignsResponse::from).collect();
    info!("Retrieved {} vital signs", vitals.len());
    Ok(Json(ApiResponse::success(vitals)))
}

/// POST /v1/ehr/vital-signs - Create new vital signs record
#[tracing::instrument(skip(state))]
pub async fn create_vital_signs(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateVitalSignsRequest>,
) -> Result<Json<ApiResponse<VitalSignsResponse>>, ApiError> {
    info!("Creating vital signs for patient: {}", payload.patient_id);

    // Use a system user ID for now
    let user_id = Uuid::nil();
    let organization_id = Uuid::nil();

    // Assertion 1: Validate patient exists
    let patient = sqlx::query!(
        r#"SELECT id, ien FROM ehr_patients
           WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL"#,
        payload.patient_id,
        organization_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch patient: {:?}", e);
        AppError::from(e)
    })?
    .ok_or_else(|| {
        warn!("Patient not found: {}", payload.patient_id);
        AppError::NotFound("Patient not found".to_string())
    })?;

    // Assertion 2: Validate blood pressure if both values provided
    if let (Some(systolic), Some(diastolic)) = (payload.blood_pressure_systolic, payload.blood_pressure_diastolic) {
        debug_assert!(
            systolic > diastolic && systolic > 0,
            "Systolic BP must be greater than diastolic BP"
        );
    }

    // Parse recorded_datetime if provided
    let recorded_datetime = if let Some(dt_str) = payload.recorded_datetime {
        DateTime::parse_from_rfc3339(&dt_str)
            .map_err(|e| {
                error!("Invalid recorded_datetime format: {:?}", e);
                AppError::Validation("Invalid datetime format, expected ISO 8601".to_string())
            })?
            .with_timezone(&Utc)
    } else {
        Utc::now()
    };

    let temperature_unit = payload.temperature_unit.unwrap_or_else(|| "fahrenheit".to_string());
    let weight_unit = payload.weight_unit.unwrap_or_else(|| "kg".to_string());
    let height_unit = payload.height_unit.unwrap_or_else(|| "cm".to_string());

    // Convert f64 to BigDecimal for database
    let temperature = payload.temperature.map(|v| sqlx::types::BigDecimal::try_from(v).ok()).flatten();
    let weight = payload.weight.map(|v| sqlx::types::BigDecimal::try_from(v).ok()).flatten();
    let height = payload.height.map(|v| sqlx::types::BigDecimal::try_from(v).ok()).flatten();

    let row = sqlx::query_as::<_, VitalSignsRow>(
        r#"
        INSERT INTO vital_signs (
            organization_id, patient_id, patient_ien, encounter_id, appointment_id,
            recorded_by, recorded_datetime,
            blood_pressure_systolic, blood_pressure_diastolic, heart_rate, respiratory_rate,
            temperature, temperature_unit, oxygen_saturation, oxygen_delivery_method,
            weight, weight_unit, height, height_unit,
            pain_score, pain_location, pain_quality,
            position, blood_pressure_site, blood_pressure_method, consciousness_level,
            notes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
        RETURNING
            id, organization_id, ien, patient_id, patient_ien, encounter_id, appointment_id,
            recorded_by, recorded_by_name, recorded_datetime, recorded_location,
            blood_pressure_systolic, blood_pressure_diastolic, heart_rate, respiratory_rate,
            temperature, temperature_unit, oxygen_saturation, oxygen_delivery_method,
            weight, weight_unit, height, height_unit, bmi, pain_score, pain_location,
            position, blood_pressure_site, is_abnormal, is_critical, abnormal_flags,
            notes, created_at
        "#,
    )
    .bind(organization_id)
    .bind(payload.patient_id)
    .bind(patient.ien)
    .bind(payload.encounter_id)
    .bind(payload.appointment_id)
    .bind(user_id)
    .bind(recorded_datetime)
    .bind(payload.blood_pressure_systolic)
    .bind(payload.blood_pressure_diastolic)
    .bind(payload.heart_rate)
    .bind(payload.respiratory_rate)
    .bind(temperature)
    .bind(&temperature_unit)
    .bind(payload.oxygen_saturation)
    .bind(&payload.oxygen_delivery_method)
    .bind(weight)
    .bind(&weight_unit)
    .bind(height)
    .bind(&height_unit)
    .bind(payload.pain_score)
    .bind(&payload.pain_location)
    .bind(&payload.pain_quality)
    .bind(&payload.position)
    .bind(&payload.blood_pressure_site)
    .bind(&payload.blood_pressure_method)
    .bind(&payload.consciousness_level)
    .bind(&payload.notes)
    .bind(user_id)
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to create vital signs: {:?}", e);
        AppError::from(e)
    })?;

    let vitals = VitalSignsResponse::from(row);
    info!("Created vital signs: {} (critical: {})", vitals.id, vitals.is_critical);

    // If critical, could trigger alert notification here
    if vitals.is_critical {
        warn!("Critical vital signs recorded for patient {}", payload.patient_id);
    }

    Ok(Json(ApiResponse::success(vitals)))
}

/// GET /v1/ehr/vital-signs/:id - Get vital signs details
#[tracing::instrument(skip(state))]
pub async fn get_vital_signs(
    State(state): State<Arc<AppState>>,
    Path(vitals_id): Path<Uuid>,
) -> Result<Json<ApiResponse<VitalSignsResponse>>, ApiError> {
    info!("Getting vital signs: {}", vitals_id);

    // Use a system user ID for now
    let organization_id = Uuid::nil();

    let row = sqlx::query_as::<_, VitalSignsRow>(
        r#"SELECT id, organization_id, ien, patient_id, patient_ien, encounter_id, appointment_id,
                  recorded_by, recorded_by_name, recorded_datetime, recorded_location,
                  blood_pressure_systolic, blood_pressure_diastolic, heart_rate, respiratory_rate,
                  temperature, temperature_unit, oxygen_saturation, oxygen_delivery_method,
                  weight, weight_unit, height, height_unit, bmi, pain_score, pain_location,
                  position, blood_pressure_site, is_abnormal, is_critical, abnormal_flags,
                  notes, created_at
           FROM vital_signs
           WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL"#,
    )
    .bind(vitals_id)
    .bind(organization_id)
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch vital signs: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Vital signs not found".to_string())
        } else {
            AppError::from(e)
        }
    })?;

    Ok(Json(ApiResponse::success(VitalSignsResponse::from(row))))
}

/// PUT /v1/ehr/vital-signs/:id - Update vital signs
#[tracing::instrument(skip(state))]
pub async fn update_vital_signs(
    State(state): State<Arc<AppState>>,
    Path(vitals_id): Path<Uuid>,
    Json(payload): Json<UpdateVitalSignsRequest>,
) -> Result<Json<ApiResponse<VitalSignsResponse>>, ApiError> {
    info!("Updating vital signs: {}", vitals_id);

    // Use a system user ID for now
    let user_id = Uuid::nil();
    let organization_id = Uuid::nil();

    let temperature = payload.temperature.map(|v| sqlx::types::BigDecimal::try_from(v).ok()).flatten();
    let weight = payload.weight.map(|v| sqlx::types::BigDecimal::try_from(v).ok()).flatten();
    let height = payload.height.map(|v| sqlx::types::BigDecimal::try_from(v).ok()).flatten();

    let row = sqlx::query_as::<_, VitalSignsRow>(
        r#"
        UPDATE vital_signs
        SET blood_pressure_systolic = COALESCE($1, blood_pressure_systolic),
            blood_pressure_diastolic = COALESCE($2, blood_pressure_diastolic),
            heart_rate = COALESCE($3, heart_rate),
            respiratory_rate = COALESCE($4, respiratory_rate),
            temperature = COALESCE($5, temperature),
            oxygen_saturation = COALESCE($6, oxygen_saturation),
            weight = COALESCE($7, weight),
            height = COALESCE($8, height),
            pain_score = COALESCE($9, pain_score),
            notes = COALESCE($10, notes),
            updated_by = $11
        WHERE id = $12 AND organization_id = $13 AND deleted_at IS NULL
        RETURNING
            id, organization_id, ien, patient_id, patient_ien, encounter_id, appointment_id,
            recorded_by, recorded_by_name, recorded_datetime, recorded_location,
            blood_pressure_systolic, blood_pressure_diastolic, heart_rate, respiratory_rate,
            temperature, temperature_unit, oxygen_saturation, oxygen_delivery_method,
            weight, weight_unit, height, height_unit, bmi, pain_score, pain_location,
            position, blood_pressure_site, is_abnormal, is_critical, abnormal_flags,
            notes, created_at
        "#,
    )
    .bind(payload.blood_pressure_systolic)
    .bind(payload.blood_pressure_diastolic)
    .bind(payload.heart_rate)
    .bind(payload.respiratory_rate)
    .bind(temperature)
    .bind(payload.oxygen_saturation)
    .bind(weight)
    .bind(height)
    .bind(payload.pain_score)
    .bind(&payload.notes)
    .bind(user_id)
    .bind(vitals_id)
    .bind(organization_id)
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to update vital signs: {:?}", e);
        if matches!(e, sqlx::Error::RowNotFound) {
            AppError::NotFound("Vital signs not found".to_string())
        } else {
            AppError::from(e)
        }
    })?;

    let vitals = VitalSignsResponse::from(row);
    info!("Updated vital signs: {}", vitals.id);
    Ok(Json(ApiResponse::success(vitals)))
}

/// DELETE /v1/ehr/vital-signs/:id - Delete vital signs (soft delete)
#[tracing::instrument(skip(state))]
pub async fn delete_vital_signs(
    State(state): State<Arc<AppState>>,
    Path(vitals_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    info!("Deleting vital signs: {}", vitals_id);

    // Use a system user ID for now
    let user_id = Uuid::nil();
    let organization_id = Uuid::nil();

    let result = sqlx::query(
        r#"UPDATE vital_signs SET deleted_at = NOW(), updated_by = $1
           WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL"#,
    )
    .bind(user_id)
    .bind(vitals_id)
    .bind(organization_id)
    .execute(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to delete vital signs: {:?}", e);
        AppError::from(e)
    })?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Vital signs not found".to_string()).into());
    }

    info!("Deleted vital signs: {}", vitals_id);
    Ok(StatusCode::NO_CONTENT)
}

/// Row type for trend queries
#[derive(Debug, FromRow)]
struct TrendRow {
    recorded_datetime: DateTime<Utc>,
    blood_pressure_systolic: Option<i32>,
    heart_rate: Option<i32>,
    is_abnormal: Option<bool>,
    is_critical: Option<bool>,
}

/// GET /v1/ehr/vital-signs/patient/:patient_id/trends - Get vital signs trends for patient
#[tracing::instrument(skip(state))]
pub async fn get_patient_vital_trends(
    State(state): State<Arc<AppState>>,
    Path(patient_id): Path<Uuid>,
    Query(params): Query<serde_json::Value>,
) -> Result<Json<ApiResponse<Vec<VitalSignsTrendResponse>>>, ApiError> {
    info!("Getting vital signs trends for patient: {}", patient_id);

    // Use a system user ID for now
    let organization_id = Uuid::nil();

    let days = params.get("days")
        .and_then(|v| v.as_i64())
        .unwrap_or(30)
        .min(365);
    let days_str = format!("{} days", days);

    // Get blood pressure trend
    let bp_readings = sqlx::query_as::<_, TrendRow>(
        r#"SELECT recorded_datetime, blood_pressure_systolic, NULL::int as heart_rate, is_abnormal, is_critical
           FROM vital_signs
           WHERE patient_id = $1 AND organization_id = $2
             AND blood_pressure_systolic IS NOT NULL
             AND recorded_datetime >= NOW() - $3::INTERVAL
             AND deleted_at IS NULL
           ORDER BY recorded_datetime ASC"#,
    )
    .bind(patient_id)
    .bind(organization_id)
    .bind(&days_str)
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch BP trends: {:?}", e);
        AppError::from(e)
    })?;

    let mut trends = Vec::new();

    if !bp_readings.is_empty() {
        trends.push(VitalSignsTrendResponse {
            vital_type: "blood_pressure_systolic".to_string(),
            readings: bp_readings.iter().map(|r| TrendReading {
                recorded_datetime: r.recorded_datetime,
                value: r.blood_pressure_systolic.unwrap_or(0) as f64,
                is_abnormal: r.is_abnormal.unwrap_or(false),
                is_critical: r.is_critical.unwrap_or(false),
            }).collect(),
        });
    }

    // Get heart rate trend
    let hr_readings = sqlx::query_as::<_, TrendRow>(
        r#"SELECT recorded_datetime, NULL::int as blood_pressure_systolic, heart_rate, is_abnormal, is_critical
           FROM vital_signs
           WHERE patient_id = $1 AND organization_id = $2
             AND heart_rate IS NOT NULL
             AND recorded_datetime >= NOW() - $3::INTERVAL
             AND deleted_at IS NULL
           ORDER BY recorded_datetime ASC"#,
    )
    .bind(patient_id)
    .bind(organization_id)
    .bind(&days_str)
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| {
        error!("Failed to fetch HR trends: {:?}", e);
        AppError::from(e)
    })?;

    if !hr_readings.is_empty() {
        trends.push(VitalSignsTrendResponse {
            vital_type: "heart_rate".to_string(),
            readings: hr_readings.iter().map(|r| TrendReading {
                recorded_datetime: r.recorded_datetime,
                value: r.heart_rate.unwrap_or(0) as f64,
                is_abnormal: r.is_abnormal.unwrap_or(false),
                is_critical: r.is_critical.unwrap_or(false),
            }).collect(),
        });
    }

    Ok(Json(ApiResponse::success(trends)))
}
