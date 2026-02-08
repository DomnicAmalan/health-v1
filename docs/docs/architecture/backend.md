---
sidebar_position: 2
title: Backend Architecture
description: Rust backend services architecture and patterns
---

# Backend Architecture

The Health V1 backend is built in Rust, structured as a Cargo workspace with multiple service crates. It prioritizes compile-time safety, strict error handling, and the reliability principles required for healthcare systems.

## Service Structure

```
backend/
  api-service/          # Main REST API (port 8080)
    src/
      bin/              # setup.rs, setup-admin.rs
      presentation/
        api/
          handlers/     # Route handlers organized by domain
          routes.rs     # Route tree definition
      main.rs
  admin-service/        # Admin API
    src/
      handlers/         # Admin-specific handlers
  rustyvault-service/   # Vault-compatible secrets service (port 4117)
    src/
      modules/          # auth, policy, realm
      services/         # audit_logger
      storage/          # metadata_store
  shared/               # Common crate
    src/
      domain/
        entities/       # Data models
        repositories/   # Trait definitions
        state_machine/  # State machine types
      infrastructure/
        database/       # db_service.rs
        repositories/   # Trait implementations
      shared/
        error.rs        # AppError
  authz-core/           # Authorization engine (RBAC/ABAC)
  state-machine-macro/  # Proc macro for state machines
  migrations/           # SQL migration files
```

## Framework: Axum 0.8

All HTTP services use Axum 0.8 with Tower middleware for request processing. Routes are organized as nested routers grouped by domain.

```rust
use axum::{Router, routing::{get, post, put, delete}};

pub fn routes() -> Router<AppState> {
    Router::new()
        .nest("/v1/ehr", ehr_routes())
        .nest("/v1/billing", billing_routes())
        .nest("/v1/pharmacy", pharmacy_routes())
        .nest("/v1/workflows", workflow_routes())
        .layer(CorsLayer::new()
            .allow_origin(allowed_origins)
            .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
            .allow_headers(Any)
            .allow_credentials(true))
}

fn ehr_routes() -> Router<AppState> {
    Router::new()
        .route("/patients", get(list_patients).post(create_patient))
        .route("/patients/:id", get(get_patient).put(update_patient))
        .route("/encounters", get(list_encounters).post(create_encounter))
        .route("/vitals", get(list_vitals).post(create_vital_signs))
}
```

## Database: SQLx with Compile-Time Queries

SQLx compile-time query verification is **mandatory** across the entire codebase. Every SQL query must use the macro variants (`query!`, `query_as!`, `query_scalar!`) so that queries are checked against the live database schema at build time.

### Correct Usage

```rust
use sqlx::query_as;

// Compile-time verified: column names, types, and table existence
// are all checked against the actual database at build time.
let patients = sqlx::query_as!(
    Patient,
    r#"
    SELECT id, first_name, last_name, date_of_birth, mrn,
           created_at, updated_at
    FROM ehr_patients
    WHERE organization_id = $1
    ORDER BY last_name, first_name
    LIMIT $2
    "#,
    org_id,
    limit.min(MAX_PAGE_SIZE)
)
.fetch_all(&pool)
.await?;
```

### Incorrect Usage (Never Do This)

```rust
// WRONG: Runtime query - no compile-time verification
let patients = sqlx::query_as::<_, Patient>(
    "SELECT * FROM ehr_patients WHERE organization_id = $1"
)
.bind(org_id)
.fetch_all(&pool)
.await?;
```

### Nullability Override

When SQLx infers incorrect nullability (common with computed columns or LEFT JOINs), use the `"column_name!"` syntax:

```rust
let result = sqlx::query_as!(
    PatientWithCount,
    r#"
    SELECT
        p.id,
        p.first_name,
        p.last_name,
        COUNT(e.id) as "encounter_count!"
    FROM ehr_patients p
    LEFT JOIN encounters e ON e.patient_id = p.id
    WHERE p.id = $1
    GROUP BY p.id
    "#,
    patient_id
)
.fetch_one(&pool)
.await?;
```

### Build Requirement

Docker must be running with the database available before running `cargo check` or `cargo build`. The standard workflow is:

```bash
make docker-dev    # Start PostgreSQL
make db-migrate    # Apply all migrations
cargo check        # Now compile-time queries can verify
```

## Error Handling

Error handling follows a layered approach. The `shared` crate provides `AppError` as the base error type. Each service defines its own error enum that converts from `AppError`.

### AppError

```rust
use shared::shared::error::AppError;

// AppError provides common error variants:
// - NotFound(String)
// - BadRequest(String)
// - Unauthorized(String)
// - Forbidden(String)
// - Internal(String)
// - Database(sqlx::Error)
// - Timeout
// - Conflict(String)
```

### Service Error Enums

Each service wraps `AppError` with domain-specific context using `thiserror`:

```rust
use thiserror::Error;
use shared::shared::error::AppError;

#[derive(Error, Debug)]
pub enum EhrError {
    #[error("Patient not found: {0}")]
    PatientNotFound(Uuid),

    #[error("Duplicate MRN: {0}")]
    DuplicateMrn(String),

    #[error("Invalid state transition from {from:?} to {to:?}")]
    InvalidTransition { from: String, to: String },

    #[error(transparent)]
    App(#[from] AppError),
}

impl From<EhrError> for AppError {
    fn from(err: EhrError) -> Self {
        match err {
            EhrError::PatientNotFound(id) => AppError::NotFound(format!("Patient {id}")),
            EhrError::DuplicateMrn(mrn) => AppError::Conflict(format!("MRN {mrn} exists")),
            EhrError::InvalidTransition { from, to } => {
                AppError::BadRequest(format!("Cannot transition from {from} to {to}"))
            }
            EhrError::App(e) => e,
        }
    }
}
```

### Structured Error Logging

Errors are logged with structured context before propagation:

```rust
use shared::shared::error::LogExt;

pub async fn get_patient(
    State(state): State<AppState>,
    Path(patient_id): Path<Uuid>,
) -> Result<Json<Patient>, AppError> {
    let patient = state
        .patient_repo
        .find_by_id(patient_id)
        .await
        .map_err(|e| {
            e.log_with_context("patient_handlers::get_patient", &format!("id={patient_id}"))
        })?
        .ok_or_else(|| AppError::NotFound(format!("Patient {patient_id}")))?;

    Ok(Json(patient))
}
```

The `log_with_operation` variant provides a simpler interface when context is the operation name alone:

```rust
let result = repo.create(entity).await
    .map_err(|e| e.log_with_operation("create_encounter"))?;
```

## Structured Logging with tracing

All services use the `tracing` crate for structured, leveled logging:

```rust
use tracing::{info, warn, error, instrument};

#[instrument(skip(state), fields(patient_id = %patient_id))]
pub async fn get_patient(
    State(state): State<AppState>,
    Path(patient_id): Path<Uuid>,
) -> Result<Json<Patient>, AppError> {
    info!("Fetching patient record");

    let patient = state.patient_repo.find_by_id(patient_id).await?;

    match patient {
        Some(p) => {
            info!(mrn = %p.mrn, "Patient found");
            Ok(Json(p))
        }
        None => {
            warn!("Patient not found");
            Err(AppError::NotFound(format!("Patient {patient_id}")))
        }
    }
}
```

## Repository Pattern

The codebase uses the repository pattern to separate domain logic from data access. Traits are defined in the domain layer; implementations live in the infrastructure layer.

### Trait Definition

```rust
// shared/src/domain/repositories/mod.rs
use async_trait::async_trait;

#[async_trait]
pub trait PatientRepository: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Patient>, AppError>;
    async fn find_by_mrn(&self, mrn: &str) -> Result<Option<Patient>, AppError>;
    async fn list(&self, org_id: Uuid, limit: i64, offset: i64) -> Result<Vec<Patient>, AppError>;
    async fn create(&self, patient: CreatePatient) -> Result<Patient, AppError>;
    async fn update(&self, id: Uuid, patient: UpdatePatient) -> Result<Patient, AppError>;
    async fn delete(&self, id: Uuid) -> Result<(), AppError>;
}
```

### Implementation

```rust
// shared/src/infrastructure/repositories/ehr/patient_repository_impl.rs
use crate::domain::repositories::PatientRepository;

pub struct PatientRepositoryImpl {
    pool: PgPool,
}

impl PatientRepositoryImpl {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl PatientRepository for PatientRepositoryImpl {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Patient>, AppError> {
        let patient = sqlx::query_as!(
            Patient,
            r#"
            SELECT id, first_name, last_name, date_of_birth, mrn,
                   organization_id, created_at, updated_at
            FROM ehr_patients
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(AppError::from)?;

        Ok(patient)
    }

    // ... other methods
}
```

## Authentication

The backend supports three authentication mechanisms, each tailored to a specific frontend application:

| Mechanism | Frontend App | Header/Cookie |
|-----------|-------------|---------------|
| JWT Bearer | client-app | `Authorization: Bearer <token>` |
| Session Cookie | admin | `cookie: session_id=<id>` |
| Vault Token | rustyvault-ui | `X-Vault-Token: <token>` |

JWT tokens are validated by extracting claims, checking expiration, and verifying the signature against the configured secret. Refresh tokens allow silent renewal without requiring re-authentication.

## CORS Configuration

CORS is configured at the service level and must include all frontend origins:

```rust
let cors = CorsLayer::new()
    .allow_origin([
        "http://localhost:5174".parse::<HeaderValue>().unwrap(),  // admin
        "http://localhost:5175".parse::<HeaderValue>().unwrap(),  // client-app
        "http://localhost:8215".parse::<HeaderValue>().unwrap(),  // rustyvault-ui
    ])
    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::PATCH])
    .allow_headers(Any)
    .allow_credentials(true);
```

The `CORS_ALLOWED_ORIGINS` environment variable controls this in production. Missing origins will cause silent request failures in the browser.

## Typical Handler Pattern

A complete handler following all project conventions:

```rust
use axum::{extract::{State, Path, Query}, Json};
use shared::shared::error::{AppError, LogExt};
use tracing::{info, instrument};
use uuid::Uuid;

const MAX_PAGE_SIZE: i64 = 1000;
const QUERY_TIMEOUT_SECS: u64 = 5;

#[derive(Deserialize)]
pub struct ListParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[instrument(skip(state), fields(org_id = %org_id))]
pub async fn list_patients(
    State(state): State<AppState>,
    Path(org_id): Path<Uuid>,
    Query(params): Query<ListParams>,
) -> Result<Json<Vec<Patient>>, AppError> {
    let limit = params.limit.unwrap_or(50).min(MAX_PAGE_SIZE);
    let offset = params.offset.unwrap_or(0);

    // Assertion: parameters are within valid bounds
    assert!(limit > 0 && limit <= MAX_PAGE_SIZE, "Limit out of range");
    assert!(offset >= 0, "Offset must be non-negative");

    info!(limit, offset, "Listing patients");

    let patients = tokio::time::timeout(
        std::time::Duration::from_secs(QUERY_TIMEOUT_SECS),
        state.patient_repo.list(org_id, limit, offset),
    )
    .await
    .map_err(|_| AppError::Timeout)?
    .map_err(|e| e.log_with_operation("list_patients"))?;

    // Assertion: result set does not exceed requested limit
    assert!(
        patients.len() as i64 <= limit,
        "Result set {} exceeds limit {}",
        patients.len(),
        limit
    );

    Ok(Json(patients))
}
```

## Build Commands

All backend commands are available through the project Makefile:

```bash
make build-backend    # cargo build --workspace
make test-backend     # cargo test --workspace
make lint             # cargo fmt + cargo clippy --workspace -- -D warnings
make db-migrate       # Apply pending migrations
make db-reset         # Drop, recreate, and migrate the database
```
