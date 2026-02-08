---
sidebar_position: 4
title: Database Migrations
description: How to create and apply database migrations
---

# Database Migrations

Health V1 uses SQLx migrations to manage the PostgreSQL database schema. Migrations are sequential SQL files that are applied in order on service startup.

## Migration Location

All migration files are located in:

```
backend/migrations/
```

## Naming Convention

Migrations use sequential numbering with descriptive names. Each migration consists of an **up** file (apply) and a **down** file (rollback):

```
backend/migrations/
  0086_create_workflow_config.up.sql
  0086_create_workflow_config.down.sql
  0087_create_visual_workflows.up.sql
  0087_create_visual_workflows.down.sql
```

The naming pattern is:

```
{number}_{description}.up.sql    # Apply migration
{number}_{description}.down.sql  # Rollback migration
```

- **Number**: Zero-padded sequential integer (e.g., `0086`, `0087`). Check the latest migration number and increment by 1.
- **Description**: Snake_case description of what the migration does (e.g., `create_workflow_config`, `add_patient_mrn_index`).

## Creating a New Migration

### Step 1: Determine the next number

Check the highest existing migration number:

```bash
ls backend/migrations/ | sort -r | head -5
```

### Step 2: Create the SQL files

Create both the up and down migration files. For example, to add an `allergies` table as migration 0088:

**`backend/migrations/0088_create_allergies.up.sql`**:

```sql
CREATE TABLE IF NOT EXISTS allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    allergen VARCHAR(255) NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe', 'life-threatening')),
    reaction TEXT,
    onset_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_allergies_patient_id ON allergies(patient_id);
```

**`backend/migrations/0088_create_allergies.down.sql`**:

```sql
DROP TABLE IF EXISTS allergies;
```

### Step 3: Apply the migration

```bash
make db-migrate
```

This command restarts the API service, which runs all pending migrations on startup.

### Step 4: Write your queries

After the migration is applied and the table exists in the database, you can write SQLx compile-time checked queries:

```rust
let allergy = sqlx::query_as!(
    Allergy,
    "SELECT * FROM allergies WHERE patient_id = $1",
    patient_id
)
.fetch_all(db)
.await?;
```

## Applying Migrations

### Development Database

```bash
# Apply all pending migrations
make db-migrate
```

The API service runs migrations automatically on startup. The `make db-migrate` command restarts the service to trigger this process.

### Test Database

```bash
# Apply migrations to the test database
make db-migrate-test
```

### Full Reset

```bash
# WARNING: Destructive - drops the database, recreates it, and applies all migrations
make db-reset
```

This command:
1. Drops the existing database
2. Creates a new empty database
3. Applies all migrations from scratch

Use this when migrations are in a broken state or you need a clean slate.

### Seeding Data

After a reset or fresh setup, seed the database with sample data:

```bash
make db-seed
```

## SQLx Compile-Time Queries (Critical)

Health V1 uses SQLx's compile-time query checking. This means the database **must be running** when you run `cargo check` or `cargo build`. The SQLx macros (`sqlx::query!`, `sqlx::query_as!`, `sqlx::query_scalar!`) verify your SQL against the live database schema at compile time.

### Required Setup Order

For new tables, you **must** follow this exact order:

1. **Create the migration files** (up and down SQL)
2. **Start Docker** if not already running: `make docker-dev`
3. **Apply the migration**: `make db-migrate`
4. **Write the Rust code** with `sqlx::query!` macros
5. **Build/check**: `cargo check --workspace`

If you skip step 3 and try to compile code that references a table that does not exist yet, you will get errors like:

```
error: relation "allergies" does not exist
```

### Compile-Time Query Rules

Always use the compile-time checked macros:

```rust
// GOOD: Compile-time checked
let patients = sqlx::query_as!(
    Patient,
    "SELECT * FROM patients WHERE id = $1",
    patient_id
)
.fetch_optional(db)
.await?;
```

```rust
// BAD: Runtime query (not checked at compile time)
let patients = sqlx::query_as::<_, Patient>(
    "SELECT * FROM patients WHERE id = $1"
)
.bind(patient_id)
.fetch_optional(db)
.await?;
```

### Nullability Overrides

When SQLx incorrectly infers a column as nullable (common with computed columns, JOINs, or aggregates), use the `!` suffix to override:

```rust
let result = sqlx::query_as!(
    PatientSummary,
    r#"
    SELECT
        p.id,
        p.first_name,
        COUNT(a.id) as "appointment_count!"
    FROM patients p
    LEFT JOIN appointments a ON a.patient_id = p.id
    GROUP BY p.id, p.first_name
    "#
)
.fetch_all(db)
.await?;
```

The `"appointment_count!"` syntax tells SQLx that this column will never be NULL, even though the `LEFT JOIN` makes SQLx think it could be.

## Best Practices

### Migration Content

- Each migration should be **atomic**: one logical change per migration.
- Always create both up and down files.
- Use `IF NOT EXISTS` and `IF EXISTS` to make migrations idempotent where possible.
- Include indexes in the same migration as the table they reference.
- Add `CHECK` constraints for enum-like columns.

### Testing Migrations

Before submitting a PR with new migrations:

```bash
# Apply the migration
make db-migrate

# Verify the schema is correct
# (compile-time queries will catch most issues)
cargo check --workspace

# Reset and re-apply all migrations from scratch to verify ordering
make db-reset
make db-migrate
```

### Rollbacks

Down migrations should cleanly reverse the up migration. Test rollbacks by:

1. Applying the migration
2. Verifying the schema
3. Rolling back (if tooling supports it) or doing a `make db-reset`
4. Re-applying to confirm the migration is repeatable
