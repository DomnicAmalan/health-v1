---
sidebar_position: 2
title: Testing
description: Unit, integration, and E2E testing strategies
---

# Testing

Health V1 uses a multi-layered testing strategy: backend unit/integration tests in Rust, frontend unit tests with Vitest, and end-to-end tests with Playwright. All testing is orchestrated through Make commands from the project root.

## Quick Reference

| Command | Description |
|---------|-------------|
| `make test` | Unit + backend tests |
| `make test-all` | Full test suite (includes E2E) |
| `make test-unit` | Frontend unit tests only |
| `make test-backend` | Rust tests only |
| `make test-e2e` | Playwright E2E tests |
| `make test-e2e-ui` | E2E with Playwright interactive UI |
| `make test-watch` | Run tests in watch mode |
| `make test-coverage` | Run tests with coverage reporting |

## Backend Tests (Rust)

Backend tests use `cargo test` and run against a test PostgreSQL database.

### Running

```bash
# Run all backend tests
make test-backend

# Run tests for a specific crate
cargo test -p shared

# Run a specific test
cargo test -p api-service test_create_appointment

# Run with output visible
cargo test -- --nocapture
```

### Test Database

Backend tests require a running PostgreSQL instance with migrations applied:

```bash
# Start test services and apply migrations
make test-up
make db-migrate-test

# Run backend tests
make test-backend

# Tear down test services
make test-down
```

### Coverage

```bash
# Generate backend coverage report with cargo-tarpaulin
cargo tarpaulin --workspace --out html
```

### Writing Backend Tests

Follow Tiger Style testing requirements. Every test must exercise both valid and invalid inputs at boundary values.

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_patient_create_valid() {
        let db = setup_test_db().await;

        let payload = CreatePatientRequest {
            first_name: "Jane".into(),
            last_name: "Doe".into(),
            date_of_birth: NaiveDate::from_ymd_opt(1990, 1, 15).unwrap(),
            // ...
        };

        let result = patient_create(&db, payload).await;
        assert!(result.is_ok());

        let patient = result.unwrap();
        assert_eq!(patient.first_name, "Jane");
        assert!(patient.id != Uuid::nil());
    }

    #[tokio::test]
    async fn test_patient_create_invalid_empty_name() {
        let db = setup_test_db().await;

        let payload = CreatePatientRequest {
            first_name: "".into(), // Invalid: empty
            last_name: "Doe".into(),
            date_of_birth: NaiveDate::from_ymd_opt(1990, 1, 15).unwrap(),
            // ...
        };

        let result = patient_create(&db, payload).await;
        assert!(result.is_err());
    }
}
```

## Frontend Unit Tests (Vitest)

Frontend tests use Vitest and are located alongside the source files or in `__tests__` directories.

### Running

```bash
# Run all frontend unit tests
make test-unit

# Run with coverage
bun run test:coverage

# Run in watch mode
make test-watch

# Run tests for a specific app
cd cli && bun run --filter @health/client-app test
```

### Writing Frontend Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PatientSearch } from './PatientSearch';

describe('PatientSearch', () => {
  it('renders search input', () => {
    render(<PatientSearch onSelect={vi.fn()} />);
    expect(screen.getByPlaceholderText('Search patients...')).toBeInTheDocument();
  });

  it('calls onSelect when a patient is clicked', async () => {
    const onSelect = vi.fn();
    render(<PatientSearch onSelect={onSelect} />);

    // ... interact and assert
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: expect.any(String),
    }));
  });

  it('displays error message on API failure', async () => {
    // Test the error boundary / error state
    // ...
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });
});
```

## E2E Tests (Playwright)

End-to-end tests verify complete user workflows through the browser. They are located in each app's `e2e/` directory.

### Directory Structure

```
cli/packages/apps/client-app/
  e2e/
    specs/
      login.spec.ts
      patient-search.spec.ts
      appointment-booking.spec.ts
    fixtures/
      test-patient.json
      test-provider.json
    playwright.config.ts
```

- **Specs**: Test files in `e2e/specs/*.spec.ts`
- **Fixtures**: Test data in `e2e/fixtures/`
- **Config**: Playwright configuration in `e2e/playwright.config.ts`

### Running

```bash
# Start the test environment (database, API, frontend)
make test-up

# Run all E2E tests headlessly
make test-e2e

# Run with Playwright interactive UI (useful for debugging)
make test-e2e-ui

# Run a specific spec file
cd cli && bunx playwright test e2e/specs/login.spec.ts
```

### Writing E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Patient Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/patients/new');
  });

  test('should create a new patient with valid data', async ({ page }) => {
    await page.fill('[name="firstName"]', 'Jane');
    await page.fill('[name="lastName"]', 'Doe');
    await page.fill('[name="dateOfBirth"]', '1990-01-15');

    await page.click('button[type="submit"]');

    await expect(page.getByText('Patient created successfully')).toBeVisible();
  });

  test('should show validation errors for missing required fields', async ({ page }) => {
    await page.click('button[type="submit"]');

    await expect(page.getByText('First name is required')).toBeVisible();
    await expect(page.getByText('Last name is required')).toBeVisible();
  });
});
```

### Test Environment

The test environment uses `docker-compose.test.yml` which provides:

- A dedicated test PostgreSQL database (separate from development)
- API services configured for testing
- Seeded test data

```bash
# Full test lifecycle
make test-up           # Start test infrastructure
make db-migrate-test   # Apply migrations to test DB
make test-all          # Run unit + integration + E2E
make test-down         # Tear down test infrastructure
```

## Tiger Style Testing Requirements

All tests in Health V1 must follow Tiger Style principles:

### 1. Valid/Invalid Boundaries

Every test suite must cover:

- **Minimum valid value** -- the smallest input that should succeed
- **Maximum valid value** -- the largest input that should succeed
- **Below minimum** -- just under the minimum (should fail)
- **Above maximum** -- just over the maximum (should fail)
- **Extreme values** -- zero, negative, `MAX`, empty strings, nil UUIDs

```rust
#[test]
fn test_page_size_boundaries() {
    // Valid
    assert!(validate_page_size(1).is_ok());      // Min valid
    assert!(validate_page_size(1000).is_ok());   // Max valid (PAGE_SIZE_MAX)

    // Invalid
    assert!(validate_page_size(0).is_err());     // Below min
    assert!(validate_page_size(1001).is_err());  // Above max
    assert!(validate_page_size(-1).is_err());    // Negative
}
```

### 2. State Transitions

Test all valid transitions and verify that invalid transitions are rejected:

```rust
#[test]
fn test_order_status_machine() {
    // Valid forward transitions
    assert!(can_transition(OrderStatus::Draft, OrderStatus::Submitted));
    assert!(can_transition(OrderStatus::Submitted, OrderStatus::Completed));

    // Invalid backward transitions
    assert!(!can_transition(OrderStatus::Completed, OrderStatus::Draft));

    // Valid cancellation from any non-terminal state
    assert!(can_transition(OrderStatus::Draft, OrderStatus::Cancelled));
    assert!(can_transition(OrderStatus::Submitted, OrderStatus::Cancelled));

    // Invalid: cannot un-cancel
    assert!(!can_transition(OrderStatus::Cancelled, OrderStatus::Draft));
}
```

### 3. Paired Assertions

When testing write operations, always read back and verify:

```rust
#[tokio::test]
async fn test_update_patient_name() {
    let db = setup_test_db().await;
    let patient = create_test_patient(&db).await;

    // Write
    let result = patient_update_name(&db, patient.id, "Updated", "Name").await;
    assert!(result.is_ok());

    // Read back and verify
    let updated = patient_get(&db, patient.id).await.unwrap();
    assert_eq!(updated.first_name, "Updated");
    assert_eq!(updated.last_name, "Name");
}
```

## Coverage Targets

While 100% coverage is not the goal, all public functions must have:

- At least one test for the happy path
- At least one test for each error path
- Boundary value tests for any numeric or string-length parameters

Generate coverage reports with:

```bash
# Frontend coverage (Vitest with Istanbul)
bun run test:coverage

# Backend coverage (cargo-tarpaulin)
cargo tarpaulin --workspace --out html
```

## Continuous Integration

Tests are run automatically on every pull request. The CI pipeline executes:

1. `cargo fmt --check` -- formatting verification
2. `cargo clippy --workspace -- -D warnings` -- linting
3. `make test-backend` -- Rust tests
4. `make test-unit` -- Frontend unit tests
5. `make test-e2e` -- Playwright E2E tests

All checks must pass before a PR can be merged.
