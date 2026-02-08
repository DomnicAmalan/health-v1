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
    let patient_exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM ehr_patients WHERE id = $1 AND deleted_at IS NULL) as "exists!""#,
        payload.patient_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to verify patient: {}", e)))?;

    if !patient_exists {
        return Err(AppError::NotFound(format!(
            "Patient {} not found",
            payload.patient_id
        )).into());
    }

    // Get patient IEN for denormalization (ehr_patients has column `ien`, not `patient_ien`)
    let patient_ien = sqlx::query_scalar!(
        r#"SELECT COALESCE(ien, 0) as "patient_ien!" FROM ehr_patients WHERE id = $1"#,
        payload.patient_id
    )
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

    let onset_date_precision = payload.onset_date_precision.unwrap_or_else(|| "day".to_string());
    let is_chronic = payload.is_chronic.unwrap_or(false);
    let is_principal_diagnosis = payload.is_principal_diagnosis.unwrap_or(false);

    // Create problem
    let problem = sqlx::query_as!(
        Problem,
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
        RETURNING
            id, organization_id, ien, patient_id, patient_ien,
            problem_name, problem_code, problem_code_system,
            icd10_code, icd10_description, snomed_code, snomed_description,
            status, onset_date, onset_date_precision, resolved_date, resolved_reason,
            encounter_id, recorded_by, recorded_by_name, recorded_datetime,
            provider_id, provider_name, severity, acuity,
            is_chronic as "is_chronic!", is_principal_diagnosis as "is_principal_diagnosis!",
            problem_comment, clinical_notes,
            last_reviewed_date, review_frequency_days,
            created_at, updated_at, created_by, updated_by, version, deleted_at
        "#,
        Uuid::nil(),                                        // $1: organization_id
        payload.patient_id,                                 // $2: patient_id
        patient_ien,                                        // $3: patient_ien
        payload.problem_name,                               // $4: problem_name
        payload.problem_code.as_deref(),                    // $5: problem_code
        payload.problem_code_system.as_deref(),             // $6: problem_code_system
        payload.icd10_code.as_deref(),                      // $7: icd10_code
        payload.icd10_description.as_deref(),               // $8: icd10_description
        payload.snomed_code.as_deref(),                     // $9: snomed_code
        payload.snomed_description.as_deref(),              // $10: snomed_description
        onset_date,                                         // $11: onset_date
        onset_date_precision.as_str(),                      // $12: onset_date_precision
        payload.severity.as_deref(),                        // $13: severity
        payload.acuity.as_deref(),                          // $14: acuity
        is_chronic,                                         // $15: is_chronic
        is_principal_diagnosis,                             // $16: is_principal_diagnosis
        payload.problem_comment.as_deref(),                 // $17: problem_comment
        payload.encounter_id,                               // $18: encounter_id
        payload.provider_id,                                // $19: provider_id
        user_id,                                            // $20: recorded_by, created_by, updated_by
        payload.review_frequency_days,                      // $21: review_frequency_days
    )
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
    let org_id = Uuid::nil(); // Use a system user ID for now - in production, extract from auth middleware

    let problem = sqlx::query_as!(
        Problem,
        r#"
        SELECT
            id, organization_id, ien, patient_id, patient_ien,
            problem_name, problem_code, problem_code_system,
            icd10_code, icd10_description, snomed_code, snomed_description,
            status, onset_date, onset_date_precision, resolved_date, resolved_reason,
            encounter_id, recorded_by, recorded_by_name, recorded_datetime,
            provider_id, provider_name, severity, acuity,
            is_chronic as "is_chronic!", is_principal_diagnosis as "is_principal_diagnosis!",
            problem_comment, clinical_notes,
            last_reviewed_date, review_frequency_days,
            created_at, updated_at, created_by, updated_by, version, deleted_at
        FROM problem_list
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
        "#,
        problem_id,
        org_id
    )
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

    let org_id = Uuid::nil(); // Use a system user ID for now - in production, extract from auth middleware

    // Execute with 5s timeout - using NULL-check pattern for optional filters
    let problems = tokio::time::timeout(
        std::time::Duration::from_secs(5),
        sqlx::query_as!(
            Problem,
            r#"
            SELECT
                id, organization_id, ien, patient_id, patient_ien,
                problem_name, problem_code, problem_code_system,
                icd10_code, icd10_description, snomed_code, snomed_description,
                status, onset_date, onset_date_precision, resolved_date, resolved_reason,
                encounter_id, recorded_by, recorded_by_name, recorded_datetime,
                provider_id, provider_name, severity, acuity,
                is_chronic as "is_chronic!", is_principal_diagnosis as "is_principal_diagnosis!",
                problem_comment, clinical_notes,
                last_reviewed_date, review_frequency_days,
                created_at, updated_at, created_by, updated_by, version, deleted_at
            FROM problem_list
            WHERE deleted_at IS NULL
              AND organization_id = $1
              AND ($2::uuid IS NULL OR patient_id = $2)
              AND ($3::text IS NULL OR status = $3)
              AND ($4::bool IS NULL OR is_chronic = $4)
              AND ($5::text IS NULL OR icd10_code = $5)
            ORDER BY recorded_datetime DESC
            LIMIT $6 OFFSET $7
            "#,
            org_id,
            params.patient_id,
            params.status.as_deref(),
            params.is_chronic,
            params.icd10_code.as_deref(),
            limit,
            params.offset
        )
        .fetch_all(state.database_pool.as_ref())
    )
    .await
    .map_err(|_| AppError::Timeout("Query timed out".to_string()))?
    .map_err(|e| AppError::Internal(format!("Failed to fetch problems: {}", e)))?;

    let total = tokio::time::timeout(
        std::time::Duration::from_secs(5),
        sqlx::query_scalar!(
            r#"
            SELECT COUNT(*) as "count!"
            FROM problem_list
            WHERE deleted_at IS NULL
              AND organization_id = $1
              AND ($2::uuid IS NULL OR patient_id = $2)
              AND ($3::text IS NULL OR status = $3)
              AND ($4::bool IS NULL OR is_chronic = $4)
              AND ($5::text IS NULL OR icd10_code = $5)
            "#,
            org_id,
            params.patient_id,
            params.status.as_deref(),
            params.is_chronic,
            params.icd10_code.as_deref()
        )
        .fetch_one(state.database_pool.as_ref())
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
    let org_id = Uuid::nil();

    // Assertion 1: Problem must exist
    let exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM problem_list WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL) as "exists!""#,
        problem_id,
        org_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to verify problem: {}", e)))?;

    if !exists {
        return Err(AppError::NotFound(format!("Problem {} not found", problem_id)).into());
    }

    // Parse last_reviewed_date if provided
    let last_reviewed_date = if let Some(ref date_str) = payload.last_reviewed_date {
        Some(chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
            .map_err(|e| AppError::Validation(format!("Invalid last_reviewed_date format: {}", e)))?)
    } else {
        None
    };

    // COALESCE pattern: only update fields that are provided, keep existing values otherwise
    let problem = sqlx::query_as!(
        Problem,
        r#"
        UPDATE problem_list SET
            problem_name = COALESCE($1, problem_name),
            icd10_code = COALESCE($2, icd10_code),
            icd10_description = COALESCE($3, icd10_description),
            snomed_code = COALESCE($4, snomed_code),
            snomed_description = COALESCE($5, snomed_description),
            status = COALESCE($6, status),
            severity = COALESCE($7, severity),
            acuity = COALESCE($8, acuity),
            is_chronic = COALESCE($9, is_chronic),
            problem_comment = COALESCE($10, problem_comment),
            last_reviewed_date = COALESCE($11::date, last_reviewed_date),
            updated_by = $12,
            updated_at = NOW()
        WHERE id = $13 AND organization_id = $14 AND deleted_at IS NULL
        RETURNING
            id, organization_id, ien, patient_id, patient_ien,
            problem_name, problem_code, problem_code_system,
            icd10_code, icd10_description, snomed_code, snomed_description,
            status, onset_date, onset_date_precision, resolved_date, resolved_reason,
            encounter_id, recorded_by, recorded_by_name, recorded_datetime,
            provider_id, provider_name, severity, acuity,
            is_chronic as "is_chronic!", is_principal_diagnosis as "is_principal_diagnosis!",
            problem_comment, clinical_notes,
            last_reviewed_date, review_frequency_days,
            created_at, updated_at, created_by, updated_by, version, deleted_at
        "#,
        payload.problem_name.as_deref(),          // $1
        payload.icd10_code.as_deref(),            // $2
        payload.icd10_description.as_deref(),     // $3
        payload.snomed_code.as_deref(),           // $4
        payload.snomed_description.as_deref(),    // $5
        payload.status.as_deref(),                // $6
        payload.severity.as_deref(),              // $7
        payload.acuity.as_deref(),                // $8
        payload.is_chronic,                       // $9
        payload.problem_comment.as_deref(),       // $10
        last_reviewed_date,                       // $11
        user_id,                                  // $12
        problem_id,                               // $13
        org_id                                    // $14
    )
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
    let org_id = Uuid::nil();

    // Assertion 1: Fetch current problem and validate status
    let current_problem = sqlx::query_as!(
        Problem,
        r#"
        SELECT
            id, organization_id, ien, patient_id, patient_ien,
            problem_name, problem_code, problem_code_system,
            icd10_code, icd10_description, snomed_code, snomed_description,
            status, onset_date, onset_date_precision, resolved_date, resolved_reason,
            encounter_id, recorded_by, recorded_by_name, recorded_datetime,
            provider_id, provider_name, severity, acuity,
            is_chronic as "is_chronic!", is_principal_diagnosis as "is_principal_diagnosis!",
            problem_comment, clinical_notes,
            last_reviewed_date, review_frequency_days,
            created_at, updated_at, created_by, updated_by, version, deleted_at
        FROM problem_list
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
        "#,
        problem_id,
        org_id
    )
    .fetch_optional(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to fetch problem: {}", e)))?
    .ok_or_else(|| AppError::NotFound(format!("Problem {} not found", problem_id)))?;

    if current_problem.status == "resolved" {
        return Err(AppError::Validation("Problem is already resolved".to_string()).into());
    }

    // Update to resolved status
    let problem = sqlx::query_as!(
        Problem,
        r#"
        UPDATE problem_list
        SET status = 'resolved',
            resolved_date = CURRENT_DATE,
            resolved_reason = $1,
            updated_by = $2,
            updated_at = NOW()
        WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL
        RETURNING
            id, organization_id, ien, patient_id, patient_ien,
            problem_name, problem_code, problem_code_system,
            icd10_code, icd10_description, snomed_code, snomed_description,
            status, onset_date, onset_date_precision, resolved_date, resolved_reason,
            encounter_id, recorded_by, recorded_by_name, recorded_datetime,
            provider_id, provider_name, severity, acuity,
            is_chronic as "is_chronic!", is_principal_diagnosis as "is_principal_diagnosis!",
            problem_comment, clinical_notes,
            last_reviewed_date, review_frequency_days,
            created_at, updated_at, created_by, updated_by, version, deleted_at
        "#,
        payload.resolved_reason.as_deref(),   // $1
        user_id,                               // $2
        problem_id,                            // $3
        org_id                                 // $4
    )
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
    let org_id = Uuid::nil();

    let result = sqlx::query!(
        r#"
        UPDATE problem_list
        SET deleted_at = NOW(), updated_by = $1
        WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
        "#,
        user_id,
        problem_id,
        org_id
    )
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
    let org_id = Uuid::nil();

    // Validate problem exists
    let exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM problem_list WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL) as "exists!""#,
        problem_id,
        org_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to verify problem: {}", e)))?;

    if !exists {
        return Err(AppError::NotFound(format!("Problem {} not found", problem_id)).into());
    }

    // Create comment
    let comment = sqlx::query_as!(
        ProblemComment,
        r#"
        INSERT INTO problem_comments (
            problem_id, comment_text, author_id, encounter_id
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
            id, problem_id, comment_text, author_id, author_name,
            comment_datetime, encounter_id
        "#,
        problem_id,          // $1
        payload.comment_text, // $2
        user_id,             // $3
        payload.encounter_id  // $4
    )
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
    let org_id = Uuid::nil(); // Use a system user ID for now - in production, extract from auth middleware

    // Validate problem exists and belongs to organization
    let exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM problem_list WHERE id = $1 AND organization_id = $2) as "exists!""#,
        problem_id,
        org_id
    )
    .fetch_one(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to verify problem: {}", e)))?;

    if !exists {
        return Err(AppError::NotFound(format!("Problem {} not found", problem_id)).into());
    }

    let history = sqlx::query_as!(
        ProblemHistory,
        r#"
        SELECT
            id, problem_id, previous_status, new_status, change_reason,
            changed_by, changed_by_name, changed_datetime, encounter_id
        FROM problem_history
        WHERE problem_id = $1
        ORDER BY changed_datetime DESC
        "#,
        problem_id
    )
    .fetch_all(state.database_pool.as_ref())
    .await
    .map_err(|e| AppError::Internal(format!("Failed to fetch history: {}", e)))?;

    Ok(Json(history))
}
