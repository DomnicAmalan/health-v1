# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Health V1 is a monorepo with Rust backend services and TypeScript/React frontend apps (Tauri desktop applications). The system includes a secrets vault (RustyVault), admin panel, and client application for healthcare data management.

## Build & Development Commands

**Use `make` as the universal interface** - all commands work from the project root.

### Quick Reference

**Development:**
```bash
make dev              # Interactive app selector
make dev-vault        # RustyVault UI + libs (port 8215)
make dev-admin        # Admin dashboard + libs (port 5174)
make dev-client       # Client app + libs (port 5175)
make dev-all          # All apps in parallel
```

**Testing:**
```bash
make test             # Unit + backend tests
make test-all         # Full test suite (includes E2E)
make test-unit        # Frontend unit tests
make test-backend     # Rust tests
make test-e2e         # Playwright E2E tests
make test-e2e-ui      # E2E with Playwright UI
```

**Building:**
```bash
make build            # Build all (libs + apps)
make build-backend    # Rust backend only
make build-frontend   # All frontend apps
make build-release    # Production release build
```

**Docker:**
```bash
make docker-dev       # Start dev environment
make docker-dev-down  # Stop dev environment
make docker-dev-logs  # View dev logs
```

**Quality Checks:**
```bash
make lint             # Run all linters
make lint-fix         # Auto-fix all issues
make check            # Lint + typecheck + tests
make check-strict     # All strict checks → strict-errors.txt
```

**Database:**
```bash
make db-migrate       # Run migrations
make db-migrate-test  # Run migrations on test DB
make db-reset         # Drop, recreate, migrate
make db-seed          # Seed sample data
```

**Cleanup:**
```bash
make clean            # Clean build artifacts
make clean-all        # Clean everything including Docker
```

### Architecture

- **Make** = Universal interface (backend + frontend)
- **Bun** = Internal package manager (handles UI tasks)
- All commands run from project root
- No need to `cd cli` for any operation

For comprehensive command reference, see `COMMANDS.md`.

## Architecture

### Backend (Rust - `/backend`)
- **shared**: Common types, error handling (`AppError`), database utilities
- **authz-core**: Authorization engine with RBAC/ABAC policies
- **admin-service**: Admin API for user/role management
- **api-service**: Main API for client applications
- **rustyvault-service**: HashiCorp Vault-compatible secrets management

All services use:
- Axum 0.8 for HTTP
- SQLx with PostgreSQL
- `thiserror` for error types, `anyhow` for context
- `tracing` for structured logging

### Frontend (TypeScript/React - `/cli`)
- **packages/apps/rustyvault-ui**: Vault management UI (port 8215)
- **packages/apps/admin**: Admin dashboard
- **packages/apps/client-app**: Patient-facing application
- **packages/libs/shared**: Shared types, API client (`BaseApiClient`), routes
- **packages/libs/components**: Reusable UI components

All apps use:
- Bun as package manager
- TanStack Router (file-based routing in `src/routes/`)
- TanStack Query for data fetching
- Zustand for state management
- Tailwind CSS for styling
- Tauri for desktop builds

### API Client Pattern
Routes are defined in `cli/packages/libs/shared/src/api/routes.ts`. The `/api` prefix is added automatically - never include it in route definitions. Use `/v1/` prefix for versioned endpoints.

## Environment Configuration

Health V1 uses a **unified, hierarchical environment configuration** strategy:

### Configuration Files

- **Root `.env`**: Single source of truth for all shared configuration
  - Backend services (API, Vault, Database)
  - Service ports (8080, 4117, 5432)
  - Security secrets (JWT, MASTER_KEY, OIDC)
  - CORS configuration
  - Session settings

- **App `.env` files**: Vite-specific overrides ONLY
  - `cli/packages/apps/admin/.env` - Admin UI (port 5174)
  - `cli/packages/apps/client-app/.env` - Client app (port 5175)
  - `cli/packages/apps/rustyvault-ui/.env` - Vault UI (port 8215)

### Key Configuration Rules

**Port Mapping:**
```bash
# Backend Services
API_SERVICE_PORT=8080          # Main API (used by admin & client-app)
VAULT_SERVICE_PORT=4117        # Vault service (used by rustyvault-ui)

# Frontend Dev Servers
ADMIN_UI_PORT=5174             # Admin dashboard Vite dev server
CLIENT_APP_PORT=5175           # Client app Vite dev server
VAULT_UI_PORT=8215             # Vault UI Vite dev server (NOTE: 8215!)
```

**API URLs (CRITICAL - common mistake):**
```bash
# Admin & Client apps → API Service (port 8080)
VITE_API_BASE_URL=http://localhost:8080

# Vault UI → Vault Service (port 4117, different service!)
VITE_API_BASE_URL=http://localhost:4117/v1    # Must include /v1 prefix!
```

**CORS Configuration:**
```bash
# MUST include ALL frontend dev server origins
CORS_ALLOWED_ORIGINS=http://localhost:5174,http://localhost:5175,http://localhost:8215
```

**Docker Compose:**
- All required variables MUST be in `.env`
- No default values in docker-compose files
- Docker will fail with clear error if variables missing

### Setup for New Developers

```bash
# 1. Copy environment templates
cp .env.example .env
cp cli/packages/apps/admin/.env.example cli/packages/apps/admin/.env
cp cli/packages/apps/client-app/.env.example cli/packages/apps/client-app/.env
cp cli/packages/apps/rustyvault-ui/.env.example cli/packages/apps/rustyvault-ui/.env

# 2. Validate configuration
./scripts/validate-env.sh

# 3. Start services
make docker-dev      # Backend services
make dev-admin       # Admin UI
make dev-client      # Client app
make dev-vault       # Vault UI
```

**For comprehensive environment configuration guide, see `ENV.md`.**

## Critical Rules

### Rust Backend
- **Never use `unwrap()` or `expect()`** - use proper `Result<T, E>` error handling
- Use `AppError` from `shared::shared::error` for common errors
- Services define their own error enum converting from `AppError`
- Log errors with `error.log_with_context()` or `error.log_with_operation()`
- Run `cargo fmt` and `cargo clippy --workspace -- -D warnings` before committing

### TypeScript Frontend
- No `any` types - use `unknown` or proper types
- Use `type` imports: `import type { ... }`
- Use `useAuditLog` hook and `logPHI()` for any PHI access
- Run `bun run lint:fix` before committing

## Mission-Critical Engineering Principles (Tiger Style)

**Healthcare systems require the highest reliability standards. These principles from TigerBeetle (https://tigerstyle.dev) are MANDATORY for all production code.**

### 1. Error Handling is Non-Negotiable
> "92% of catastrophic system failures result from incorrect handling of non-fatal errors."

- **NEVER use `unwrap()` or `expect()` in production code**
- Every `Result<T, E>` must be handled with `?` or explicit matching
- All errors must be logged with context before propagation
- Functions should return `Result` types, not panic

```rust
// GOOD
pub async fn create_appointment(payload: CreateAppointmentRequest) -> Result<Appointment, AppError> {
    let patient = db.get_patient(payload.patient_id).await?
        .ok_or(AppError::NotFound("Patient not found".into()))?;
    // ... continue
}

// BAD
pub async fn create_appointment(payload: CreateAppointmentRequest) -> Appointment {
    let patient = db.get_patient(payload.patient_id).await.unwrap();  // ❌ NEVER
}
```

### 2. Assertion Density: Minimum 2 Per Function
- Every function MUST have at least 2 assertions checking invariants
- Use **paired assertions**: assert before write AND after read
- Assertions catch bugs early and multiply fuzzing effectiveness

```rust
pub async fn update_status(id: Uuid, new_status: Status) -> Result<()> {
    // Assertion 1: Valid state transition
    let current = get_appointment(id).await?;
    assert!(is_valid_transition(current.status, new_status),
        "Invalid transition from {:?} to {:?}", current.status, new_status);

    // Update
    db.update_status(id, new_status).await?;

    // Assertion 2: Verify write succeeded
    let updated = get_appointment(id).await?;
    assert_eq!(updated.status, new_status, "Status verification failed");

    Ok(())
}
```

### 3. Function Complexity Limits
- **Hard limit: 70 lines maximum per function** (must fit on one screen)
- **Push ifs up**: Keep branching logic in parent functions
- **Push fors down**: Move non-branching loops to helper functions
- **State mutations in parent**: Helpers compute, parents apply changes

```rust
// Parent: orchestrates with branching
pub async fn create_order(payload: CreateOrderRequest) -> Result<Order> {
    if payload.priority == Priority::Stat {
        validate_stat_authorization(&payload).await?;
    }

    let order_number = generate_order_number(&payload);  // Helper: no branching
    let order = insert_order(payload, order_number).await?;
    Ok(order)
}
```

### 4. Explicit Resource Limits
- All queues must have bounded capacity (catch infinite loops)
- All queries must have timeouts (5s default, 30s max)
- All pagination must have max page size (1000 records max)
- Use `u32` instead of `usize` for counts (fixed size, portable)

```rust
// Bounded query
const MAX_PAGE_SIZE: i64 = 1000;
const QUERY_TIMEOUT: Duration = Duration::from_secs(5);

pub async fn list_appointments(limit: i64) -> Result<Vec<Appointment>> {
    let query = sqlx::query_as!(
        Appointment,
        "SELECT * FROM appointments LIMIT $1",
        limit.min(MAX_PAGE_SIZE)  // Enforce limit
    );

    tokio::time::timeout(QUERY_TIMEOUT, query.fetch_all(&db))
        .await
        .map_err(|_| AppError::Timeout)?
        .map_err(AppError::from)
}
```

### 5. Testing: Valid/Invalid Boundaries
- Tests MUST cover both positive (valid) and negative (invalid) cases
- Focus on **boundaries** where data transitions between valid/invalid
- Test state transitions, value ranges, and edge cases

```rust
#[tokio::test]
async fn test_appointment_duration_boundaries() {
    // Valid boundaries
    assert!(validate_duration(1).is_ok());      // Min valid
    assert!(validate_duration(480).is_ok());    // Max valid (8 hours)

    // Invalid boundaries
    assert!(validate_duration(0).is_err());     // Zero invalid
    assert!(validate_duration(481).is_err());   // Over max
}
```

### 6. Batching Over Direct Event Response
- Don't respond to events immediately—process in bounded batches
- Run on your own schedule, not external event timing
- Improves performance and maintains control flow

```rust
// GOOD: Batch processing
pub async fn process_notifications_batch() {
    loop {
        tokio::time::sleep(Duration::from_secs(5)).await;  // Fixed interval
        let batch = fetch_pending_notifications(100).await?;  // Bounded batch

        for notif in batch {
            send_notification(notif).await.ok();  // Continue on error
        }
    }
}

// BAD: Direct response
pub async fn on_result_ready(result: LabResult) {
    send_notification(result).await;  // Unpredictable timing
}
```

### 7. Financial System Requirements
Healthcare billing is a financial system. Apply financial transaction safety:
- **No lost transactions**: Every charge must be tracked
- **Audit trail**: All state changes logged permanently
- **Reconciliation**: Periodic verification of balances
- **Idempotency**: Operations can be retried safely with idempotency keys

```rust
pub async fn create_charge(
    patient_id: Uuid,
    amount: Decimal,
    idempotency_key: String,
) -> Result<Charge> {
    // Check idempotency
    if let Some(existing) = get_by_idempotency_key(&idempotency_key).await? {
        return Ok(existing);
    }

    let mut tx = db.begin().await?;

    // Create charge
    let charge = insert_charge(&mut tx, patient_id, amount, idempotency_key).await?;

    // Audit trail (MUST succeed)
    insert_audit_log(&mut tx, "charge", charge.id, "created").await?;

    // Verify
    assert_eq!(count_charges(&mut tx, charge.id).await?, 1);

    tx.commit().await?;
    Ok(charge)
}
```

### 8. Naming Conventions (Big-Endian)
Most significant qualifier first for visual scanning:

```rust
// Database columns
scheduled_datetime
scheduled_end_datetime
ordering_datetime
ordering_provider_id

// Constants
const APPOINTMENT_DURATION_DEFAULT_MINUTES: i32 = 30;
const LAB_ORDER_TIMEOUT_SECONDS: u64 = 5;
const TASK_QUEUE_CAPACITY_MAX: usize = 10000;

// Functions
pub async fn appointment_create(...) -> Result<Appointment>
pub async fn appointment_check_in(...) -> Result<()>
pub async fn lab_order_create(...) -> Result<LabOrder>
```

### Implementation Checklist
Before committing any code, verify:
- [ ] All error cases handled (no unwrap/expect)
- [ ] Minimum 2 assertions per function
- [ ] Function < 70 lines
- [ ] All queries have timeouts
- [ ] All queues/lists have bounded capacity
- [ ] Tests cover valid/invalid boundaries
- [ ] Idempotency for financial operations
- [ ] Audit trail for state changes
- [ ] Big-endian naming convention used

### General
- Use conventional commits
- Never commit `.env` files
- Do not create documentation files unless explicitly requested

## Testing

### E2E Tests (Playwright)
Located in `cli/packages/apps/*/e2e/`:
- Specs in `e2e/specs/*.spec.ts`
- Fixtures in `e2e/fixtures/`

Run with test environment:
```bash
make test-up               # Start test services
make test-e2e              # Run E2E tests
make test-e2e-ui           # Run with Playwright UI
```

### Unit Tests
- Backend: `cargo test --workspace`
- Frontend: `bun run test` or `bun run test:coverage`

## Medical/Healthcare Skills

This project includes specialized skills for healthcare development. Invoke with `/skill-name`:

| Skill | Description |
|-------|-------------|
| `/phi-audit` | Review PHI access logs and audit trail for HIPAA compliance |
| `/hipaa-check` | Run HIPAA compliance checks on code changes |
| `/patient-api` | Generate patient API endpoints, hooks, and types |
| `/phi-scan` | Scan code for potential PHI exposure or security issues |
| `/encryption-ops` | Manage DEK rotation and encryption key operations |
| `/clinical-feature` | Generate clinical features (orders, results, notes) with PHI handling |
| `/audit-report` | Generate audit reports for compliance reviews |
| `/de-identify` | De-identify PHI using HIPAA Safe Harbor method |

### PHI Fields (Always Track & Mask)
- SSN, Email, Phone, MRN (Medical Record Number)
- Date of Birth, Physical Address
- Insurance information, Credit card

### HIPAA Compliance
- 7-year audit retention (2555 days)
- All PHI access logged via `useAuditLog` hook
- Error messages sanitized to remove PHI patterns
- sessionStorage for tokens (not localStorage)
