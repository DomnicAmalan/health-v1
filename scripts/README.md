# Database Management Scripts

Comprehensive scripts for managing database setup, seeding, and cleanup.

## Prerequisites

- PostgreSQL running (via Docker or local install)
- `DATABASE_URL` environment variable set or `.env` file with `DATABASE_URL`
- `psql` command-line tool installed
- `sqlx-cli` installed for migrations

## Scripts Overview

### 1. Reset Database (`reset-db.sh`)

**⚠️ DESTRUCTIVE - Drops all tables and data**

Completely resets the database by:
1. Dropping all tables, sequences, and functions
2. Re-running all migrations
3. Optionally seeding with sample data

**Usage:**
```bash
# Reset without seed data
./scripts/reset-db.sh

# Reset and seed with sample data
./scripts/reset-db.sh --seed
```

**When to use:**
- Starting fresh development
- After major schema changes
- Before running full test suite

---

### 2. Seed Database (`seed-db.sh`)

**Populates database with realistic test data**

Adds sample data for:
- Lab tests (20+ tests) and panels (CBC, BMP, LFT, Lipid)
- Reference ranges for common tests
- 5 sample patients
- 5 sample appointments
- 5 sample lab orders with results
- 5 sample imaging orders with reports

**Usage:**
```bash
./scripts/seed-db.sh
```

**When to use:**
- After running migrations on empty database
- After cleaning database
- Setting up development environment

---

### 3. Clean Database (`clean-db.sh`)

**Removes all sample data, preserves schema**

Deletes all data from:
- Lab orders and results
- Imaging orders and reports
- Appointments
- Sample patients (MRN* pattern)
- Problem lists
- Clinical notes
- Vital signs

**Schema (tables/columns) is preserved.**

**Usage:**
```bash
./scripts/clean-db.sh
```

**When to use:**
- Before importing real data
- Testing with fresh data without re-running migrations
- Cleaning up after development/testing

---

## Common Workflows

### Initial Setup
```bash
# 1. Start database
docker-compose up -d postgres

# 2. Run migrations
cd backend && sqlx migrate run && cd ..

# 3. Seed with sample data
./scripts/seed-db.sh
```

### Development Reset
```bash
# Quick reset with fresh data
./scripts/reset-db.sh --seed
```

### Clean Slate (Keep Schema)
```bash
# Remove data, keep tables
./scripts/clean-db.sh

# Re-populate
./scripts/seed-db.sh
```

### Before Production Import
```bash
# Remove all sample data
./scripts/clean-db.sh

# Import real data
psql $DATABASE_URL < production_export.sql
```

---

## Seed Data Details

### Lab Tests (20+ tests)

**Hematology:**
- CBC (Complete Blood Count)
- Hemoglobin, Hematocrit
- WBC, Platelet Count
- ESR

**Biochemistry:**
- Glucose, BUN, Creatinine
- Electrolytes (Na, K, Cl)
- Liver enzymes (ALT, AST, Bilirubin, ALP)
- Lipid panel (Cholesterol, Triglycerides, HDL, LDL)

**Reference Ranges:**
- Gender-specific ranges (Hemoglobin, Creatinine)
- Age-specific ranges
- Critical value flags (Potassium, Glucose, Sodium)

### Sample Patients (5)
- John Smith (Male, 44 years) - Hypertension follow-up
- Emily Johnson (Female, 34 years) - New patient
- Michael Williams (Male, 51 years) - Cardiac workup
- Sarah Brown (Female, 38 years) - Pre-operative
- Robert Davis (Male, 61 years) - Diabetes management

### Sample Lab Orders (5 scenarios)
1. **Pending** - BMP just ordered
2. **Collected** - CBC + Lipid panel, specimen collected
3. **In Lab** - Cardiac enzymes being processed
4. **Completed** - LFT with normal results
5. **STAT** - Critical potassium check

### Sample Imaging Orders (5 scenarios)
1. **Pending** - Chest X-Ray for pneumonia evaluation
2. **Scheduled** - CT Head for headaches
3. **In Progress** - MRI Lumbar Spine
4. **Completed** - Abdominal Ultrasound with full report
5. **STAT** - CT Head for acute headache

---

## Troubleshooting

### DATABASE_URL not found
```bash
# Create .env file with:
echo "DATABASE_URL=postgresql://user:password@localhost:5432/dbname" > .env
```

### Permission denied
```bash
chmod +x scripts/*.sh
```

### PostgreSQL not running
```bash
docker-compose up -d postgres
```

### Migration errors
```bash
# Check migration status
cd backend && sqlx migrate info

# Revert last migration
sqlx migrate revert

# Force re-run
./scripts/reset-db.sh --seed
```

---

## Safety Notes

- **Always backup** before running `reset-db.sh` on any non-local database
- Scripts have confirmation prompts for destructive operations
- `clean-db.sh` only removes sample data (MRN* pattern patients)
- Production data should never use MRN* pattern for patient IDs

---

## Integration with Make

You can add these to your `Makefile`:

```makefile
.PHONY: db-seed db-clean db-reset

db-seed:
    @./scripts/seed-db.sh

db-clean:
    @./scripts/clean-db.sh

db-reset:
    @./scripts/reset-db.sh --seed
```

Then use:
```bash
make db-seed
make db-clean
make db-reset
```
