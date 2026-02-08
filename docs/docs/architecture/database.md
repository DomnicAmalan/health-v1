---
sidebar_position: 5
title: Database
description: PostgreSQL database architecture and SQLx patterns
---

# Database Architecture

Health V1 uses PostgreSQL as its primary data store, accessed through SQLx with compile-time query verification. The database schema is managed through sequential SQL migrations.

## PostgreSQL

PostgreSQL was chosen for its reliability, ACID compliance, and rich feature set (JSONB, full-text search, row-level security). All production data -- patient records, encounters, billing, workflows, and audit logs -- resides in a single PostgreSQL instance.

Connection parameters are configured through environment variables:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/health_v1
DATABASE_MAX_CONNECTIONS=5
DATABASE_MIN_CONNECTIONS=1
```

## SQLx Compile-Time Query Verification

All SQL queries in the codebase use SQLx macros (`query!`, `query_as!`, `query_scalar!`) for compile-time verification. This is a **mandatory** requirement. The macros connect to the live database during `cargo check` and `cargo build` to verify that:

- Referenced tables and columns exist
- Column types match the Rust struct fields
- Query parameters have the correct types
- SQL syntax is valid

This catches an entire class of bugs at compile time that would otherwise surface as runtime errors in production.

### Prerequisites

The database must be running and migrations applied before any Rust compilation:

```bash
make docker-dev    # Start PostgreSQL in Docker
make db-migrate    # Apply all pending migrations
cargo check        # Now queries can be verified
```

### Query Examples

**Fetch a single record:**

```rust
let patient = sqlx::query_as!(
    Patient,
    r#"
    SELECT id, first_name, last_name, date_of_birth, mrn,
           organization_id, created_at, updated_at
    FROM ehr_patients
    WHERE id = $1
    "#,
    patient_id
)
.fetch_optional(&pool)
.await?;
```

**Insert with returning:**

```rust
let encounter = sqlx::query_as!(
    Encounter,
    r#"
    INSERT INTO encounters (patient_id, provider_id, encounter_type, status, notes)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, patient_id, provider_id, encounter_type, status, notes,
              created_at, updated_at
    "#,
    payload.patient_id,
    payload.provider_id,
    payload.encounter_type,
    "active",
    payload.notes
)
.fetch_one(&pool)
.await?;
```

**Paginated list with timeout:**

```rust
const MAX_PAGE_SIZE: i64 = 1000;
const QUERY_TIMEOUT: Duration = Duration::from_secs(5);

let appointments = tokio::time::timeout(
    QUERY_TIMEOUT,
    sqlx::query_as!(
        Appointment,
        r#"
        SELECT id, patient_id, provider_id, scheduled_datetime,
               scheduled_end_datetime, status, appointment_type,
               created_at, updated_at
        FROM appointments
        WHERE organization_id = $1
          AND scheduled_datetime >= $2
        ORDER BY scheduled_datetime ASC
        LIMIT $3 OFFSET $4
        "#,
        org_id,
        start_date,
        limit.min(MAX_PAGE_SIZE),
        offset
    )
    .fetch_all(&pool),
)
.await
.map_err(|_| AppError::Timeout)?
.map_err(AppError::from)?;
```

**Scalar query:**

```rust
let count = sqlx::query_scalar!(
    r#"
    SELECT COUNT(*) as "count!"
    FROM ehr_patients
    WHERE organization_id = $1
    "#,
    org_id
)
.fetch_one(&pool)
.await?;
```

### Nullability Override

SQLx sometimes infers incorrect nullability for computed columns, aggregates, or LEFT JOIN results. Use the `"column!"` syntax to override:

```rust
let result = sqlx::query_as!(
    PatientSummary,
    r#"
    SELECT
        p.id,
        p.last_name,
        COUNT(e.id) as "encounter_count!",
        MAX(e.created_at) as "last_encounter_at"
    FROM ehr_patients p
    LEFT JOIN encounters e ON e.patient_id = p.id
    WHERE p.organization_id = $1
    GROUP BY p.id
    "#,
    org_id
)
.fetch_all(&pool)
.await?;
```

The `!` suffix tells SQLx to treat the column as non-nullable even when it would normally infer `Option<T>`.

## Migrations

Database migrations are stored in `backend/migrations/` as numbered SQL files. Each migration consists of an `up` and `down` file:

```
backend/migrations/
  0001_initial_schema.up.sql
  0001_initial_schema.down.sql
  ...
  0086_create_workflow_config.up.sql
  0086_create_workflow_config.down.sql
  0087_create_visual_workflows.up.sql
  0087_create_visual_workflows.down.sql
```

### Running Migrations

```bash
make db-migrate       # Apply pending migrations to dev database
make db-migrate-test  # Apply pending migrations to test database
make db-reset         # Drop, recreate, and migrate from scratch
make db-seed          # Populate with sample data
```

### Writing Migrations

When creating a new table:

1. Create the migration files with the next sequential number
2. Apply the migration with `make db-migrate`
3. Write queries using SQLx macros (they will now verify against the new schema)

```sql
-- 0088_create_lab_results.up.sql
CREATE TABLE lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_test_id UUID NOT NULL REFERENCES lab_tests(id),
    patient_id UUID NOT NULL REFERENCES ehr_patients(id),
    result_value TEXT NOT NULL,
    result_unit TEXT,
    reference_range TEXT,
    abnormal_flag TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    resulted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lab_results_patient ON lab_results(patient_id);
CREATE INDEX idx_lab_results_test ON lab_results(lab_test_id);
CREATE INDEX idx_lab_results_status ON lab_results(status);
```

```sql
-- 0088_create_lab_results.down.sql
DROP TABLE IF EXISTS lab_results;
```

## Key Tables

The database schema is organized around the following core domains:

### Electronic Health Records

| Table | Purpose |
|-------|---------|
| `ehr_patients` | Patient demographics, MRN, contact information |
| `encounters` | Clinical encounters (visits) with provider, type, and status |
| `vital_signs` | Patient vital sign measurements (BP, HR, temp, etc.) |
| `problem_list` | Active and resolved patient problems/diagnoses |
| `clinical_notes` | Free-text and structured clinical documentation |
| `lab_tests` | Laboratory test orders and specifications |
| `imaging_orders` | Radiology and imaging order requests |
| `anatomy_findings` | Findings mapped to anatomical body systems |
| `body_systems` | Anatomical body system reference data |

### Pharmacy

| Table | Purpose |
|-------|---------|
| `prescriptions` | Medication prescriptions with dosage, frequency, duration |
| `drug_allergies` | Patient drug allergy records |

### Scheduling & Operations

| Table | Purpose |
|-------|---------|
| `appointments` | Scheduled patient appointments |
| `opd_queue` | Outpatient department real-time queue management |
| `departments` | Organizational departments and their configuration |

### Billing

| Table | Purpose |
|-------|---------|
| `invoices` | Patient billing invoices |
| `payments` | Payment records linked to invoices |
| `service_catalog` | Billable services with pricing |

### Workflows

| Table | Purpose |
|-------|---------|
| `workflow_definitions` | Workflow templates with state machine configuration |
| `workflow_instances` | Running instances of workflow definitions |
| `workflow_tasks` | Individual tasks within workflow instances |
| `workflow_config` | Global workflow configuration settings |
| `visual_workflows` | Visual workflow designer data (nodes, edges, layout) |

### Identity & Authorization

| Table | Purpose |
|-------|---------|
| `users` | User accounts with hashed credentials |
| `roles` | Role definitions for RBAC |
| `user_roles` | User-to-role assignments |
| `organizations` | Multi-tenant organization records |

## Repository Pattern

Data access follows the repository pattern. Traits are defined in the domain layer and implementations are in the infrastructure layer.

### Trait Definition

```rust
// shared/src/domain/repositories/mod.rs
#[async_trait]
pub trait PatientRepository: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Patient>, AppError>;
    async fn find_by_mrn(&self, mrn: &str) -> Result<Option<Patient>, AppError>;
    async fn list(
        &self,
        org_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Patient>, AppError>;
    async fn create(&self, patient: CreatePatient) -> Result<Patient, AppError>;
    async fn update(&self, id: Uuid, patient: UpdatePatient) -> Result<Patient, AppError>;
    async fn delete(&self, id: Uuid) -> Result<(), AppError>;
}
```

### Implementation

```rust
// shared/src/infrastructure/repositories/ehr/patient_repository_impl.rs
pub struct PatientRepositoryImpl {
    pool: PgPool,
}

#[async_trait]
impl PatientRepository for PatientRepositoryImpl {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Patient>, AppError> {
        let result = sqlx::query_as!(
            Patient,
            "SELECT * FROM ehr_patients WHERE id = $1",
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(AppError::from)?;

        Ok(result)
    }

    async fn list(
        &self,
        org_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Patient>, AppError> {
        let patients = sqlx::query_as!(
            Patient,
            r#"
            SELECT * FROM ehr_patients
            WHERE organization_id = $1
            ORDER BY last_name, first_name
            LIMIT $2 OFFSET $3
            "#,
            org_id,
            limit.min(1000),
            offset
        )
        .fetch_all(&self.pool)
        .await
        .map_err(AppError::from)?;

        Ok(patients)
    }

    // ... other methods
}
```

## Connection Pool Configuration

The database connection pool is configured through environment variables and bounded to prevent resource exhaustion:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_MAX_CONNECTIONS` | 5 | Maximum number of connections in the pool |
| `DATABASE_MIN_CONNECTIONS` | 1 | Minimum idle connections maintained |
| `DATABASE_URL` | (required) | Full PostgreSQL connection string |

```rust
let pool = PgPoolOptions::new()
    .max_connections(config.database_max_connections)
    .min_connections(config.database_min_connections)
    .acquire_timeout(Duration::from_secs(5))
    .idle_timeout(Duration::from_secs(600))
    .connect(&config.database_url)
    .await?;
```

## Query Safety

All database queries follow strict safety rules:

### Timeouts

Every query is wrapped in a timeout to prevent long-running queries from blocking the connection pool:

```rust
const QUERY_TIMEOUT: Duration = Duration::from_secs(5);     // Default
const QUERY_TIMEOUT_LONG: Duration = Duration::from_secs(30); // Reports/analytics

let result = tokio::time::timeout(QUERY_TIMEOUT, query.fetch_all(&pool))
    .await
    .map_err(|_| AppError::Timeout)?
    .map_err(AppError::from)?;
```

### Pagination Limits

All list queries enforce a maximum page size to prevent unbounded result sets:

```rust
const MAX_PAGE_SIZE: i64 = 1000;

let effective_limit = requested_limit.min(MAX_PAGE_SIZE);
```

### Transaction Safety

Operations that span multiple tables use explicit transactions with proper rollback on failure:

```rust
let mut tx = pool.begin().await?;

let invoice = sqlx::query_as!(
    Invoice,
    "INSERT INTO invoices (...) VALUES (...) RETURNING *",
    // ...
)
.fetch_one(&mut *tx)
.await?;

sqlx::query!(
    "INSERT INTO audit_log (entity_type, entity_id, action) VALUES ($1, $2, $3)",
    "invoice",
    invoice.id,
    "created"
)
.execute(&mut *tx)
.await?;

tx.commit().await?;
```
