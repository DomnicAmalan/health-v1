---
sidebar_position: 1
title: Coding Standards
description: Tiger Style engineering principles for mission-critical healthcare code
---

# Coding Standards

Healthcare systems require the highest reliability standards. Health V1 adopts **Tiger Style** engineering principles derived from [TigerBeetle](https://tigerstyle.dev). These principles are **MANDATORY** for all production code.

> "92% of catastrophic system failures result from incorrect handling of non-fatal errors."

## General Rules

Before diving into Tiger Style, these baseline rules apply to all code in the repository:

- **Conventional commits**: Use `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:` prefixes.
- **Never commit `.env` files** or any file containing secrets.
- **Rust**: Run `cargo fmt` and `cargo clippy --workspace -- -D warnings` before every commit.
- **TypeScript**: No `any` types (use `unknown` or proper types). Use `type` imports (`import type { ... }`). Use `useAuditLog` hook and `logPHI()` for any PHI access. Run `bun run lint:fix` before committing.

---

## Principle 1: Error Handling is Non-Negotiable

Every error path must be handled explicitly. Unhandled errors in a healthcare system can lead to data loss, incorrect diagnoses, or billing failures.

**Rules:**
- **NEVER** use `unwrap()` or `expect()` in production code.
- Every `Result<T, E>` must be handled with `?` or explicit matching.
- All errors must be logged with context before propagation.
- Functions should return `Result` types, not panic.

```rust
// GOOD: Proper error handling with context
pub async fn create_appointment(
    db: &PgPool,
    payload: CreateAppointmentRequest,
) -> Result<Appointment, AppError> {
    let patient = db
        .get_patient(payload.patient_id)
        .await?
        .ok_or(AppError::NotFound("Patient not found".into()))?;

    let provider = db
        .get_provider(payload.provider_id)
        .await?
        .ok_or(AppError::NotFound("Provider not found".into()))?;

    let appointment = db.insert_appointment(&patient, &provider, &payload).await?;
    Ok(appointment)
}
```

```rust
// BAD: Panics on missing data - will crash in production
pub async fn create_appointment(
    db: &PgPool,
    payload: CreateAppointmentRequest,
) -> Appointment {
    let patient = db.get_patient(payload.patient_id).await.unwrap(); // NEVER
    let provider = db.get_provider(payload.provider_id).await.expect("provider exists"); // NEVER
    db.insert_appointment(&patient, &provider, &payload).await.unwrap()
}
```

Use `AppError` from `shared::shared::error` for common errors. Services define their own error enum that converts from `AppError`. Log errors with `error.log_with_context()` or `error.log_with_operation()`.

---

## Principle 2: Assertion Density: Minimum 2 Per Function

Every function **MUST** have at least 2 assertions checking invariants. Use **paired assertions**: assert before a write AND after a read. Assertions catch bugs early and multiply the effectiveness of fuzzing.

```rust
pub async fn update_status(
    db: &PgPool,
    id: Uuid,
    new_status: AppointmentStatus,
) -> Result<Appointment, AppError> {
    // Assertion 1: Valid state transition (before write)
    let current = get_appointment(db, id).await?;
    assert!(
        is_valid_transition(current.status, new_status),
        "Invalid transition from {:?} to {:?}",
        current.status,
        new_status
    );

    // Perform the update
    sqlx::query!(
        "UPDATE appointments SET status = $1 WHERE id = $2",
        new_status as _,
        id
    )
    .execute(db)
    .await?;

    // Assertion 2: Verify write succeeded (after read)
    let updated = get_appointment(db, id).await?;
    assert_eq!(
        updated.status, new_status,
        "Status verification failed after update"
    );

    Ok(updated)
}
```

Assertions are not just for tests. Production code benefits from assertions that verify invariants at runtime, catching corruption and logic errors before they propagate.

---

## Principle 3: Function Complexity Limits

**Hard limit: 70 lines maximum per function.** Every function must fit on one screen.

**Structural rules:**
- **Push ifs up**: Keep branching logic in parent functions.
- **Push fors down**: Move non-branching loops to helper functions.
- **State mutations in parent**: Helpers compute values, parents apply changes.

```rust
// Parent: orchestrates with branching
pub async fn create_order(
    db: &PgPool,
    payload: CreateOrderRequest,
) -> Result<Order, AppError> {
    // Branching logic stays in the parent
    if payload.priority == Priority::Stat {
        validate_stat_authorization(db, &payload).await?;
    }

    // Helpers compute values (no branching inside)
    let order_number = generate_order_number(&payload);
    let validated_items = validate_order_items(&payload.items)?;

    // Parent applies state mutation
    let order = insert_order(db, payload, order_number, validated_items).await?;

    assert!(order.id != Uuid::nil(), "Order ID must not be nil");
    assert!(!order.order_number.is_empty(), "Order number must not be empty");

    Ok(order)
}

// Helper: purely computational, no branching
fn generate_order_number(payload: &CreateOrderRequest) -> String {
    let prefix = match payload.order_type {
        OrderType::Lab => "LAB",
        OrderType::Imaging => "IMG",
        OrderType::Pharmacy => "RX",
    };
    format!("{}-{}", prefix, Utc::now().format("%Y%m%d%H%M%S"))
}
```

When a function grows beyond 70 lines, extract helper functions. This is not optional -- long functions hide bugs.

---

## Principle 4: Explicit Resource Limits

All resources must have explicit, bounded limits. Unbounded resources lead to memory exhaustion and denial of service.

**Rules:**
- All queues must have bounded capacity (catches infinite loops).
- All queries must have timeouts: **5 seconds default**, **30 seconds maximum**.
- All pagination must have a max page size: **1000 records maximum**.
- Use `u32` instead of `usize` for counts (fixed size, portable across architectures).

```rust
const PAGE_SIZE_MAX: i64 = 1000;
const QUERY_TIMEOUT_DEFAULT: Duration = Duration::from_secs(5);
const QUERY_TIMEOUT_MAX: Duration = Duration::from_secs(30);
const TASK_QUEUE_CAPACITY_MAX: usize = 10_000;

pub async fn list_appointments(
    db: &PgPool,
    limit: i64,
    offset: i64,
) -> Result<Vec<Appointment>, AppError> {
    // Enforce bounded pagination
    let bounded_limit = limit.min(PAGE_SIZE_MAX);

    let query = sqlx::query_as!(
        Appointment,
        "SELECT * FROM appointments ORDER BY scheduled_datetime LIMIT $1 OFFSET $2",
        bounded_limit,
        offset
    );

    // Enforce query timeout
    tokio::time::timeout(QUERY_TIMEOUT_DEFAULT, query.fetch_all(db))
        .await
        .map_err(|_| AppError::Timeout("Query exceeded 5 second timeout".into()))?
        .map_err(AppError::from)
}
```

For task queues and channels, always specify capacity:

```rust
// GOOD: Bounded channel
let (tx, rx) = tokio::sync::mpsc::channel::<Task>(TASK_QUEUE_CAPACITY_MAX);

// BAD: Unbounded channel (can exhaust memory)
let (tx, rx) = tokio::sync::mpsc::unbounded_channel::<Task>();
```

---

## Principle 5: Testing: Valid/Invalid Boundaries

Tests **MUST** cover both positive (valid) and negative (invalid) cases. Focus on **boundaries** where data transitions between valid and invalid states.

```rust
#[tokio::test]
async fn test_appointment_duration_boundaries() {
    // Valid boundaries
    assert!(validate_duration(1).is_ok());     // Minimum valid
    assert!(validate_duration(30).is_ok());    // Default value
    assert!(validate_duration(480).is_ok());   // Maximum valid (8 hours)

    // Invalid boundaries
    assert!(validate_duration(0).is_err());    // Zero is invalid
    assert!(validate_duration(-1).is_err());   // Negative is invalid
    assert!(validate_duration(481).is_err());  // Over maximum
    assert!(validate_duration(i32::MAX).is_err()); // Extreme value
}

#[tokio::test]
async fn test_appointment_status_transitions() {
    // Valid transitions
    assert!(is_valid_transition(Status::Scheduled, Status::CheckedIn));
    assert!(is_valid_transition(Status::CheckedIn, Status::InProgress));
    assert!(is_valid_transition(Status::InProgress, Status::Completed));

    // Invalid transitions (cannot skip states)
    assert!(!is_valid_transition(Status::Scheduled, Status::Completed));
    assert!(!is_valid_transition(Status::Completed, Status::Scheduled));
    assert!(!is_valid_transition(Status::Cancelled, Status::InProgress));
}
```

Test value ranges, state transitions, and edge cases. Every public function should have tests that exercise both the happy path and the error path.

---

## Principle 6: Batching Over Direct Event Response

Do not respond to events immediately. Process work in bounded batches on a fixed interval. This gives you control over timing, improves throughput, and prevents cascading failures.

```rust
// GOOD: Batch processing on a fixed interval
pub async fn process_notifications_batch(db: &PgPool) -> Result<(), AppError> {
    loop {
        tokio::time::sleep(Duration::from_secs(5)).await; // Fixed interval

        let batch = fetch_pending_notifications(db, 100).await?; // Bounded batch

        if batch.is_empty() {
            continue;
        }

        for notification in &batch {
            // Continue on individual errors - don't let one failure block the batch
            if let Err(e) = send_notification(notification).await {
                tracing::warn!(
                    notification_id = %notification.id,
                    "Failed to send notification: {e}"
                );
            }
        }

        mark_processed(db, &batch).await?;
    }
}
```

```rust
// BAD: Direct event response (unpredictable timing, no backpressure)
pub async fn on_lab_result_ready(result: LabResult) {
    send_notification(result).await; // Fires immediately, no rate control
}
```

Batching applies to notification delivery, report generation, data synchronization, and any background processing.

---

## Principle 7: Financial System Requirements

Healthcare billing is a financial system. Apply financial transaction safety to all billing and payment code.

**Requirements:**
- **No lost transactions**: Every charge must be tracked from creation to resolution.
- **Audit trail**: All state changes logged permanently.
- **Reconciliation**: Periodic verification of balances and totals.
- **Idempotency**: Operations can be retried safely with idempotency keys.

```rust
pub async fn create_charge(
    db: &PgPool,
    patient_id: Uuid,
    amount: Decimal,
    idempotency_key: String,
) -> Result<Charge, AppError> {
    // Idempotency check: return existing charge if already processed
    if let Some(existing) = get_by_idempotency_key(db, &idempotency_key).await? {
        return Ok(existing);
    }

    let mut tx = db.begin().await?;

    // Create the charge within a transaction
    let charge = insert_charge(&mut tx, patient_id, amount, &idempotency_key).await?;

    // Audit trail (MUST succeed - part of the same transaction)
    insert_audit_log(&mut tx, "charge", charge.id, "created").await?;

    // Assertion: verify the charge exists before committing
    let count = count_charges_by_id(&mut tx, charge.id).await?;
    assert_eq!(count, 1, "Charge must exist before commit");

    tx.commit().await?;

    Ok(charge)
}
```

All financial operations (charges, payments, refunds, adjustments) must follow this pattern.

---

## Principle 8: Naming Conventions (Big-Endian)

Use **big-endian naming**: the most significant qualifier comes first. This enables visual scanning and alphabetical grouping of related items.

### Database Columns

```sql
scheduled_datetime
scheduled_end_datetime
ordering_datetime
ordering_provider_id
billing_code
billing_amount
patient_first_name
patient_last_name
```

### Constants

```rust
const APPOINTMENT_DURATION_DEFAULT_MINUTES: i32 = 30;
const APPOINTMENT_DURATION_MAX_MINUTES: i32 = 480;
const LAB_ORDER_TIMEOUT_SECONDS: u64 = 5;
const TASK_QUEUE_CAPACITY_MAX: usize = 10_000;
const PAGE_SIZE_MAX: i64 = 1000;
const DATABASE_MAX_CONNECTIONS: u32 = 5;
```

### Functions

```rust
pub async fn appointment_create(db: &PgPool, payload: CreateAppointmentRequest) -> Result<Appointment, AppError>
pub async fn appointment_check_in(db: &PgPool, id: Uuid) -> Result<(), AppError>
pub async fn appointment_cancel(db: &PgPool, id: Uuid, reason: &str) -> Result<(), AppError>
pub async fn lab_order_create(db: &PgPool, payload: CreateLabOrderRequest) -> Result<LabOrder, AppError>
pub async fn lab_order_cancel(db: &PgPool, id: Uuid) -> Result<(), AppError>
```

Notice how alphabetical sorting naturally groups related functions together.

---

## Implementation Checklist

Before committing any code, verify every item:

- [ ] All error cases handled (no `unwrap()` or `expect()`)
- [ ] Minimum 2 assertions per function
- [ ] Function is under 70 lines
- [ ] All queries have timeouts
- [ ] All queues and lists have bounded capacity
- [ ] Tests cover valid/invalid boundaries
- [ ] Idempotency for financial operations
- [ ] Audit trail for state changes
- [ ] Big-endian naming convention used
- [ ] `cargo fmt` and `cargo clippy --workspace -- -D warnings` pass
- [ ] `bun run lint:fix` passes (frontend changes)
- [ ] No `.env` files or secrets in the commit
- [ ] Conventional commit message format used
