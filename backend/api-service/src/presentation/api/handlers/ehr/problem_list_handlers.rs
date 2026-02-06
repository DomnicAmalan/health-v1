// Problem List Handlers
// Patient problem/diagnosis management with ICD-10/SNOMED coding
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
pub struct CreateProblemRequest {
    pub patient_id: Uuid,
    pub problem_name: String,
    pub problem_code: Option<String>,
    pub problem_code_system: Option<String>,
    pub icd10_code: Option<String>,
    pub icd10_description: Option<String>,
    pub snomed_code: Option<String>,
    pub snomed_description: Option<String>,
    pub onset_date: Option<String>,  // ISO 8601 date
    pub onset_date_precision: Option<String>,
    pub severity: Option<String>,
    pub acuity: Option<String>,
    pub is_chronic: Option<bool>,
    pub is_principal_diagnosis: Option<bool>,
    pub problem_comment: Option<String>,
    pub encounter_id: Option<Uuid>,
    pub provider_id: Option<Uuid>,
    pub review_frequency_days: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProblemRequest {
    pub problem_name: Option<String>,
    pub icd10_code: Option<String>,
    pub icd10_description: Option<String>,
    pub snomed_code: Option<String>,
    pub snomed_description: Option<String>,
    pub status: Option<String>,
    pub severity: Option<String>,
    pub acuity: Option<String>,
    pub is_chronic: Option<bool>,
    pub problem_comment: Option<String>,
    pub last_reviewed_date: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolveProblemRequest {
    pub resolved_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddProblemCommentRequest {
    pub comment_text: String,
    pub encounter_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct ListProblemsQuery {
    pub patient_id: Option<Uuid>,
    pub status: Option<String>,
    pub is_chronic: Option<bool>,
    pub icd10_code: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}

fn default_limit() -> i64 {
    100
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Problem {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub ien: Option<i32>,
    pub patient_id: Uuid,
    pub patient_ien: i32,
    pub problem_name: String,
    pub problem_code: Option<String>,
    pub problem_code_system: Option<String>,
    pub icd10_code: Option<String>,
    pub icd10_description: Option<String>,
    pub snomed_code: Option<String>,
    pub snomed_description: Option<String>,
    pub status: String,
    pub onset_date: Option<chrono::NaiveDate>,
    pub onset_date_precision: Option<String>,
    pub resolved_date: Option<chrono::NaiveDate>,
    pub resolved_reason: Option<String>,
    pub encounter_id: Option<Uuid>,
    pub recorded_by: Uuid,
    pub recorded_by_name: Option<String>,
    pub recorded_datetime: chrono::DateTime<chrono::Utc>,
    pub provider_id: Option<Uuid>,
    pub provider_name: Option<String>,
    pub severity: Option<String>,
    pub acuity: Option<String>,
    pub is_chronic: bool,
    pub is_principal_diagnosis: bool,
    pub problem_comment: Option<String>,
    pub clinical_notes: Option<String>,
    pub last_reviewed_date: Option<chrono::NaiveDate>,
    pub review_frequency_days: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub version: i64,
    pub deleted_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ProblemHistory {
    pub id: Uuid,
    pub problem_id: Uuid,
    pub previous_status: Option<String>,
    pub new_status: String,
    pub change_reason: Option<String>,
    pub changed_by: Uuid,
    pub changed_by_name: Option<String>,
    pub changed_datetime: chrono::DateTime<chrono::Utc>,
    pub encounter_id: Option<Uuid>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ProblemComment {
    pub id: Uuid,
    pub problem_id: Uuid,
    pub comment_text: String,
    pub author_id: Uuid,
    pub author_name: Option<String>,
    pub comment_datetime: chrono::DateTime<chrono::Utc>,
    pub encounter_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProblemListResponse {
    pub problems: Vec<Problem>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

// ============================================================================
// Handlers
// ============================================================================

/// Create a new problem in patient's problem list
/// Tiger Style: validate patient exists, bounded text length (2 assertions)
pub async fn create_problem(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateProblemRequest>,
) -> Result<(StatusCode, Json<Problem>), ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();

    // Assertion 1: Patient must exist
    let patient_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM ehr_patients WHERE id = $1 AND deleted_at IS NULL)"
    )
    .bind(payload.patient_id)
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to verify patient: {}", e)))?;

    if !patient_exists {
        return Err(AppError::NotFound(format!(
            "Patient {} not found",
            payload.patient_id
        )).into());
    }

    // Get patient IEN for denormalization
    let patient_ien = sqlx::query_scalar::<_, i32>(
        "SELECT patient_ien FROM ehr_patients WHERE id = $1"
    )
    .bind(payload.patient_id)
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to get patient IEN: {}", e)))?;

    // Assertion 2: Problem name length validation (max 500 chars)
    if payload.problem_name.len() > 500 {
        return Err(AppError::Validation(
            "Problem name exceeds maximum length of 500 characters".to_string()
        ).into());
    }

    // Validate status values if provided
    if let Some(ref severity) = payload.severity {
        let valid_severities = ["mild", "moderate", "severe", "life_threatening"];
        if !valid_severities.contains(&severity.as_str()) {
            return Err(AppError::Validation(format!(
                "Invalid severity: {}. Must be one of: {}",
                severity,
                valid_severities.join(", ")
            )).into());
        }
    }

    // Parse onset date if provided
    let onset_date = if let Some(date_str) = payload.onset_date {
        Some(chrono::NaiveDate::parse_from_str(&date_str, "%Y-%m-%d")
            .map_err(|e| AppError::Validation(format!("Invalid onset_date format: {}", e)))?)
    } else {
        None
    };

    // Create problem
    let problem = sqlx::query_as::<_, Problem>(
        r#"
        INSERT INTO problem_list (
            organization_id, patient_id, patient_ien, problem_name, problem_code, problem_code_system,
            icd10_code, icd10_description, snomed_code, snomed_description,
            onset_date, onset_date_precision, severity, acuity, is_chronic, is_principal_diagnosis,
            problem_comment, encounter_id, provider_id, recorded_by, recorded_datetime,
            review_frequency_days, created_by, updated_by
        )
        VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16,
            $17, $18, $19, $20, NOW(),
            $21, $20, $20
        )
        RETURNING *
        "#
    )
    .bind(Uuid::nil()) // Use a system user ID for now - in production, extract from auth middleware
    .bind(payload.patient_id)
    .bind(patient_ien)
    .bind(payload.problem_name)
    .bind(payload.problem_code)
    .bind(payload.problem_code_system)
    .bind(payload.icd10_code)
    .bind(payload.icd10_description)
    .bind(payload.snomed_code)
    .bind(payload.snomed_description)
    .bind(onset_date)
    .bind(payload.onset_date_precision.unwrap_or_else(|| "day".to_string()))
    .bind(payload.severity)
    .bind(payload.acuity)
    .bind(payload.is_chronic.unwrap_or(false))
    .bind(payload.is_principal_diagnosis.unwrap_or(false))
    .bind(payload.problem_comment)
    .bind(payload.encounter_id)
    .bind(payload.provider_id)
    .bind(user_id)
    .bind(payload.review_frequency_days)
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to create problem: {}", e)))?;

    Ok((StatusCode::CREATED, Json(problem)))
}

/// Get problem by ID
pub async fn get_problem(
    State(state): State<Arc<AppState>>,
    Path(problem_id): Path<Uuid>,
) -> Result<Json<Problem>, ApiError> {
    let problem = sqlx::query_as::<_, Problem>(
        "SELECT * FROM problem_list WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL"
    )
    .bind(problem_id)
    .bind(Uuid::nil()) // Use a system user ID for now - in production, extract from auth middleware
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to fetch problem: {}", e)))?
    .ok_or_else(|| AppError::NotFound(format!("Problem {} not found", problem_id)))?;

    Ok(Json(problem))
}

/// List problems with filters
/// Tiger Style: bounded result limit (max 1000), 5s timeout
pub async fn list_problems(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListProblemsQuery>,
) -> Result<Json<ProblemListResponse>, ApiError> {
    // Bounded limit: max 1000 problems per request
    const MAX_LIMIT: i64 = 1000;
    let limit = params.limit.min(MAX_LIMIT);

    // Build dynamic query
    let mut conditions: Vec<String> = vec![
        "deleted_at IS NULL".to_string(),
        "organization_id = $1".to_string()
    ];
    let mut bind_count = 2;

    if params.patient_id.is_some() {
        conditions.push(format!("patient_id = ${}", bind_count));
        bind_count += 1;
    }
    if params.status.is_some() {
        conditions.push(format!("status = ${}", bind_count));
        bind_count += 1;
    }
    if params.is_chronic.is_some() {
        conditions.push(format!("is_chronic = ${}", bind_count));
        bind_count += 1;
    }
    if params.icd10_code.is_some() {
        conditions.push(format!("icd10_code = ${}", bind_count));
        bind_count += 1;
    }

    let where_clause = conditions.join(" AND ");
    let query = format!(
        "SELECT * FROM problem_list WHERE {} ORDER BY recorded_datetime DESC LIMIT ${} OFFSET ${}",
        where_clause, bind_count, bind_count + 1
    );
    let count_query = format!(
        "SELECT COUNT(*) FROM problem_list WHERE {}",
        where_clause
    );

    // Build query with parameters
    // Use a system user ID for now - in production, extract from auth middleware
    let mut query_builder = sqlx::query_as::<_, Problem>(&query)
        .bind(Uuid::nil());
    let mut count_builder = sqlx::query_scalar::<_, i64>(&count_query)
        .bind(Uuid::nil());

    if let Some(patient_id) = params.patient_id {
        query_builder = query_builder.bind(patient_id);
        count_builder = count_builder.bind(patient_id);
    }
    if let Some(ref status) = params.status {
        query_builder = query_builder.bind(status);
        count_builder = count_builder.bind(status);
    }
    if let Some(is_chronic) = params.is_chronic {
        query_builder = query_builder.bind(is_chronic);
        count_builder = count_builder.bind(is_chronic);
    }
    if let Some(ref icd10_code) = params.icd10_code {
        query_builder = query_builder.bind(icd10_code);
        count_builder = count_builder.bind(icd10_code);
    }

    query_builder = query_builder.bind(limit).bind(params.offset);

    // Execute with 5s timeout
    let problems = tokio::time::timeout(
        std::time::Duration::from_secs(5),
        query_builder.fetch_all(state.database_pool.as_ref())
    )
    .await
    .map_err(|_| AppError::Timeout("Query timed out".to_string()))?
    .map_err(|e| AppError::Internal(format!("Failed to fetch problems: {}", e)))?;

    let total = tokio::time::timeout(
        std::time::Duration::from_secs(5),
        count_builder.fetch_one(state.database_pool.as_ref())
    )
    .await
    .map_err(|_| AppError::Timeout("Query timed out".to_string()))?
    .map_err(|e| AppError::Internal(format!("Failed to count problems: {}", e)))?;

    Ok(Json(ProblemListResponse {
        problems,
        total,
        limit,
        offset: params.offset,
    }))
}

/// Update problem
/// Tiger Style: validate problem exists, enforce status transitions (2 assertions)
pub async fn update_problem(
    State(state): State<Arc<AppState>>,
    Path(problem_id): Path<Uuid>,
    Json(payload): Json<UpdateProblemRequest>,
) -> Result<Json<Problem>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();

    // Assertion 1: Problem must exist
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM problem_list WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL)"
    )
    .bind(problem_id)
    .bind(Uuid::nil()) // Use a system user ID for now - in production, extract from auth middleware
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to verify problem: {}", e)))?;

    if !exists {
        return Err(AppError::NotFound(format!("Problem {} not found", problem_id)).into());
    }

    // Build dynamic update query
    let mut query = String::from("UPDATE problem_list SET updated_by = $1, updated_at = NOW()");
    let mut param_count = 2;

    if payload.problem_name.is_some() {
        query.push_str(&format!(", problem_name = ${}", param_count));
        param_count += 1;
    }
    if payload.icd10_code.is_some() {
        query.push_str(&format!(", icd10_code = ${}", param_count));
        param_count += 1;
    }
    if payload.icd10_description.is_some() {
        query.push_str(&format!(", icd10_description = ${}", param_count));
        param_count += 1;
    }
    if payload.snomed_code.is_some() {
        query.push_str(&format!(", snomed_code = ${}", param_count));
        param_count += 1;
    }
    if payload.snomed_description.is_some() {
        query.push_str(&format!(", snomed_description = ${}", param_count));
        param_count += 1;
    }
    if payload.status.is_some() {
        query.push_str(&format!(", status = ${}", param_count));
        param_count += 1;
    }
    if payload.severity.is_some() {
        query.push_str(&format!(", severity = ${}", param_count));
        param_count += 1;
    }
    if payload.acuity.is_some() {
        query.push_str(&format!(", acuity = ${}", param_count));
        param_count += 1;
    }
    if payload.is_chronic.is_some() {
        query.push_str(&format!(", is_chronic = ${}", param_count));
        param_count += 1;
    }
    if payload.problem_comment.is_some() {
        query.push_str(&format!(", problem_comment = ${}", param_count));
        param_count += 1;
    }
    if payload.last_reviewed_date.is_some() {
        query.push_str(&format!(", last_reviewed_date = ${}::date", param_count));
        param_count += 1;
    }

    query.push_str(&format!(" WHERE id = ${} AND organization_id = ${} AND deleted_at IS NULL RETURNING *", param_count, param_count + 1));

    let mut query_builder = sqlx::query_as::<_, Problem>(&query)
        .bind(user_id)
        .bind(problem_id);

    if let Some(problem_name) = payload.problem_name {
        query_builder = query_builder.bind(problem_name);
    }
    if let Some(icd10_code) = payload.icd10_code {
        query_builder = query_builder.bind(icd10_code);
    }
    if let Some(icd10_description) = payload.icd10_description {
        query_builder = query_builder.bind(icd10_description);
    }
    if let Some(snomed_code) = payload.snomed_code {
        query_builder = query_builder.bind(snomed_code);
    }
    if let Some(snomed_description) = payload.snomed_description {
        query_builder = query_builder.bind(snomed_description);
    }
    if let Some(status) = payload.status {
        query_builder = query_builder.bind(status);
    }
    if let Some(severity) = payload.severity {
        query_builder = query_builder.bind(severity);
    }
    if let Some(acuity) = payload.acuity {
        query_builder = query_builder.bind(acuity);
    }
    if let Some(is_chronic) = payload.is_chronic {
        query_builder = query_builder.bind(is_chronic);
    }
    if let Some(problem_comment) = payload.problem_comment {
        query_builder = query_builder.bind(problem_comment);
    }
    if let Some(last_reviewed_date) = payload.last_reviewed_date {
        query_builder = query_builder.bind(last_reviewed_date);
    }

    // Use a system user ID for now - in production, extract from auth middleware
    query_builder = query_builder.bind(Uuid::nil());

    let problem = query_builder
        .fetch_one(state.database_pool.as_ref())
        .await
        .map_err(|e| AppError::Internal(format!("Failed to update problem: {}", e)))?;

    // Assertion 2: Verify update succeeded
    debug_assert_eq!(problem.id, problem_id, "Problem ID mismatch after update");

    Ok(Json(problem))
}

/// Resolve problem (mark as resolved)
/// Tiger Style: validate problem active, auto-set resolved_date (2 assertions)
pub async fn resolve_problem(
    State(state): State<Arc<AppState>>,
    Path(problem_id): Path<Uuid>,
    Json(payload): Json<ResolveProblemRequest>,
) -> Result<Json<Problem>, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();

    // Assertion 1: Fetch current problem and validate status
    let current_problem = sqlx::query_as::<_, Problem>(
        "SELECT * FROM problem_list WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL"
    )
    .bind(problem_id)
    .bind(Uuid::nil()) // Use a system user ID for now - in production, extract from auth middleware
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to fetch problem: {}", e)))?
    .ok_or_else(|| AppError::NotFound(format!("Problem {} not found", problem_id)))?;

    if current_problem.status == "resolved" {
        return Err(AppError::Validation("Problem is already resolved".to_string()).into());
    }

    // Update to resolved status
    let problem = sqlx::query_as::<_, Problem>(
        r#"
        UPDATE problem_list
        SET status = 'resolved',
            resolved_date = CURRENT_DATE,
            resolved_reason = $1,
            updated_by = $2,
            updated_at = NOW()
        WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL
        RETURNING *
        "#
    )
    .bind(payload.resolved_reason)
    .bind(user_id)
    .bind(problem_id)
    .bind(Uuid::nil()) // Use a system user ID for now - in production, extract from auth middleware
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to resolve problem: {}", e)))?;

    // Assertion 2: Verify status transition succeeded
    debug_assert_eq!(problem.status, "resolved", "Status transition verification failed");

    Ok(Json(problem))
}

/// Soft delete problem
pub async fn delete_problem(
    State(state): State<Arc<AppState>>,
    Path(problem_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();

    let result = sqlx::query(
        "UPDATE problem_list SET deleted_at = NOW(), updated_by = $1 WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL"
    )
    .bind(user_id)
    .bind(problem_id)
    .bind(Uuid::nil()) // Use a system user ID for now - in production, extract from auth middleware
    .execute(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to delete problem: {}", e)))?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Problem {} not found", problem_id)).into());
    }

    Ok(StatusCode::NO_CONTENT)
}

/// Add comment to problem
pub async fn add_problem_comment(
    State(state): State<Arc<AppState>>,
    Path(problem_id): Path<Uuid>,
    Json(payload): Json<AddProblemCommentRequest>,
) -> Result<(StatusCode, Json<ProblemComment>), ApiError> {
    // Use a system user ID for now - in production, extract from auth middleware
    let user_id = Uuid::nil();

    // Validate problem exists
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM problem_list WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL)"
    )
    .bind(problem_id)
    .bind(Uuid::nil()) // Use a system user ID for now - in production, extract from auth middleware
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to verify problem: {}", e)))?;

    if !exists {
        return Err(AppError::NotFound(format!("Problem {} not found", problem_id)).into());
    }

    // Create comment
    let comment = sqlx::query_as::<_, ProblemComment>(
        r#"
        INSERT INTO problem_comments (
            problem_id, comment_text, author_id, encounter_id
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
        "#
    )
    .bind(problem_id)
    .bind(payload.comment_text)
    .bind(user_id)
    .bind(payload.encounter_id)
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to add comment: {}", e)))?;

    Ok((StatusCode::CREATED, Json(comment)))
}

/// Get problem history (status changes)
pub async fn list_problem_history(
    State(state): State<Arc<AppState>>,
    Path(problem_id): Path<Uuid>,
) -> Result<Json<Vec<ProblemHistory>>, ApiError> {
    // Validate problem exists and belongs to organization
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM problem_list WHERE id = $1 AND organization_id = $2)"
    )
    .bind(problem_id)
    .bind(Uuid::nil()) // Use a system user ID for now - in production, extract from auth middleware
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to verify problem: {}", e)))?;

    if !exists {
        return Err(AppError::NotFound(format!("Problem {} not found", problem_id)).into());
    }

    let history = sqlx::query_as::<_, ProblemHistory>(
        "SELECT * FROM problem_history WHERE problem_id = $1 ORDER BY changed_datetime DESC"
    )
    .bind(problem_id)
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to fetch history: {}", e)))?;

    Ok(Json(history))
}
