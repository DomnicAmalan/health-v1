## Testing Infrastructure Documentation

Comprehensive testing guide for Health V1 monorepo.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Utilities](#test-utilities)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)

---

## Overview

Health V1 uses a multi-layered testing approach:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test API endpoints and database interactions
- **E2E Tests**: Test complete user workflows with Playwright
- **Contract Tests**: Validate API response schemas
- **Performance Tests**: Load testing with k6

### Test Coverage Goals

- Frontend: > 80% line coverage
- Backend: > 75% line coverage
- E2E: All critical user workflows
- Integration: All API endpoints

---

## Quick Start

### 1. Install Dependencies

```bash
# Install frontend dependencies
cd cli && bun install

# Install Rust tooling
cargo install cargo-tarpaulin  # For coverage (optional)

# Install k6 for performance tests (optional)
# macOS: brew install k6
# Linux: https://k6.io/docs/get-started/installation/
```

### 2. Start Test Environment

```bash
# Start test database and services
docker compose -f docker-compose.test.yml up -d

# Seed test database
./scripts/seed-test-db.sh
```

### 3. Run All Tests

```bash
# Run comprehensive test suite
./scripts/run-all-tests.sh

# Run specific test types
make test              # Unit + backend tests
make test-e2e          # E2E tests only
make test-backend      # Rust tests only
make test-unit         # Frontend unit tests only
```

---

## Test Structure

```
health-v1/
├── cli/packages/
│   ├── libs/shared/src/test/          # Shared test utilities
│   │   ├── factories/                 # Test data factories
│   │   ├── fixtures/                  # Predefined test data
│   │   ├── helpers/                   # React/API test helpers
│   │   ├── e2e/                       # Page object models
│   │   └── contracts/                 # API contract schemas
│   └── apps/*/
│       ├── src/__tests__/             # Unit tests (co-located with code)
│       └── e2e/                       # E2E tests
│           ├── specs/                 # Test specifications
│           └── fixtures/              # E2E-specific fixtures
├── backend/
│   ├── shared/src/testing/            # Backend test utilities
│   │   ├── factories.rs               # Rust test factories
│   │   ├── fixtures.rs                # Test fixtures
│   │   └── helpers.rs                 # DB setup helpers
│   └── */tests/
│       ├── integration/               # Integration tests
│       └── unit tests (inline #[cfg(test)])
├── backend/migrations/seeds/          # SQL seed data
│   ├── test_users.sql
│   ├── test_patients.sql
│   └── test_appointments.sql
└── scripts/
    ├── seed-test-db.sh               # Seed script
    └── run-all-tests.sh              # Test orchestration
```

---

## Running Tests

### Frontend Tests

```bash
cd cli

# Unit tests (Vitest)
bun run test:unit              # Run once
bun run test:unit:watch        # Watch mode
bun run test:coverage          # With coverage

# E2E tests (Playwright)
bun run test:e2e               # Headless
bun run test:e2e:ui            # Interactive UI
bun run test:e2e:debug         # Debug mode
```

### Backend Tests

```bash
cd backend

# All workspace tests
cargo test --workspace

# Specific service
cd api-service
cargo test

# Integration tests only
cargo test --test '*'

# With coverage
cargo tarpaulin --workspace --out Html --output-dir coverage/
```

### Comprehensive Test Suite

```bash
# Run everything
./scripts/run-all-tests.sh

# Skip E2E (faster)
SKIP_E2E=true ./scripts/run-all-tests.sh

# Include performance tests
RUN_PERF_TESTS=true ./scripts/run-all-tests.sh

# Skip coverage generation
GENERATE_COVERAGE=false ./scripts/run-all-tests.sh
```

### Performance Tests

```bash
# Run specific k6 script
k6 run cli/packages/testing/performance/k6-scripts/patient-list-load.js

# With custom settings
k6 run --vus 50 --duration 2m patient-list-load.js

# With API URL override
API_URL=http://localhost:8080 k6 run patient-list-load.js
```

---

## Test Utilities

### Frontend Test Utilities

#### Test Data Factory

```typescript
import { TestDataFactory, TEST_USERS } from '@lazarus-life/shared/test';

// Create test entities
const user = TestDataFactory.createUser({ email: 'custom@test.com' });
const patient = TestDataFactory.createPatient({ firstName: 'Alice' });
const appointment = TestDataFactory.createAppointment(patient.id);

// Use predefined fixtures
const adminUser = TEST_USERS.admin;
const doctorUser = TEST_USERS.doctor;
```

#### React Testing

```typescript
import { renderWithProviders, screen } from '@lazarus-life/shared/test';

test('renders component', () => {
  const { getByText } = renderWithProviders(<MyComponent />);
  expect(getByText('Hello')).toBeInTheDocument();
});
```

#### API Mocking

```typescript
import {
  createMockApiClient,
  mockApiResponse,
  mockPaginatedResponse,
} from '@lazarus-life/shared/test';

const mockClient = createMockApiClient();
mockClient.get.mockResolvedValue(mockApiResponse({ users: [] }));
```

#### Contract Validation

```typescript
import {
  validateApiContract,
  PatientResponseSchema,
} from '@lazarus-life/shared/test/contracts';

const response = await fetch('/api/v1/patients/123');
const json = await response.json();
const patient = await validateApiContract(json, PatientResponseSchema);
```

### Backend Test Utilities

#### Test Data Factory

```rust
use shared::testing::{UserFactory, fixtures::TEST_ADMIN_UUID};

// Create test users
let user = UserFactory::build();
let admin = UserFactory::build_admin();
let custom_user = UserFactory::build_with(|u| {
    u.email = "custom@test.com".to_string();
});

// Use predefined fixtures
let admin_id = *TEST_ADMIN_UUID;
```

#### Database Setup

```rust
use shared::testing::{create_test_pool, cleanup_database, seed_test_data};

#[tokio::test]
async fn test_example() {
    let pool = create_test_pool().await;
    cleanup_database(&pool).await;
    seed_test_data(&pool).await;

    // ... test implementation
}
```

#### Transaction Isolation

```rust
use shared::testing::test_transaction;

#[tokio::test]
async fn test_with_isolation() {
    let pool = create_test_pool().await;
    let mut tx = test_transaction(&pool).await;

    // Perform operations on transaction
    sqlx::query!("INSERT INTO users (...) VALUES (...)")
        .execute(&mut *tx)
        .await
        .unwrap();

    // Transaction automatically rolls back when dropped
}
```

### E2E Test Utilities

#### Page Object Model

```typescript
import { LoginPage, PatientListPage } from '@lazarus-life/shared/test/e2e';

test('user can search patients', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('doctor@test.com', 'testpassword123');

  const patientList = new PatientListPage(page);
  await patientList.goto();
  await patientList.searchPatient('Alice');
  await patientList.expectPatientInList('MRN-001');
});
```

---

## Writing Tests

### Frontend Unit Test Example

```typescript
// src/components/Button/__tests__/Button.test.tsx
import { renderWithProviders, screen, userEvent } from '@lazarus-life/shared/test';
import { Button } from '../Button';

describe('Button', () => {
  test('renders with text', () => {
    renderWithProviders(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  test('calls onClick handler', async () => {
    const handleClick = vi.fn();
    renderWithProviders(<Button onClick={handleClick}>Click Me</Button>);

    await userEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Backend Integration Test Example

```rust
// backend/api-service/tests/integration/users_test.rs
mod common;

use axum::http::{Method, StatusCode};
use common::*;
use serde_json::json;

#[tokio::test]
#[ignore]
async fn test_create_user() {
    let app = setup_test_app().await;

    let payload = json!({
        "email": "newuser@test.com",
        "username": "newuser",
        "password": "password123"
    });

    let response = make_request(
        &app,
        Method::POST,
        "/api/v1/users",
        Some(payload),
    )
    .await;

    assert_status(&response, StatusCode::CREATED);

    let body: serde_json::Value = extract_json_body(response).await;
    assert_eq!(body["data"]["email"], "newuser@test.com");

    teardown_test_app(&app).await;
}
```

### E2E Test Example

```typescript
// cli/packages/apps/client-app/e2e/specs/patient-search.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage, PatientListPage } from '@lazarus-life/shared/test/e2e';
import { TEST_USERS, TEST_PATIENTS } from '@lazarus-life/shared/test';

test.describe('Patient Search', () => {
  test('doctor can search for patient', async ({ page }) => {
    // Login
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(TEST_USERS.doctor.email, 'testpassword123');

    // Search for patient
    const patientList = new PatientListPage(page);
    await patientList.goto();
    await patientList.searchPatient('Alice');

    // Verify results
    await patientList.expectPatientInList(TEST_PATIENTS.alice.mrn);
  });
});
```

---

## Test Credentials

**All test users have password:** `testpassword123`

| Email                     | Username            | Role          |
| ------------------------- | ------------------- | ------------- |
| admin@test.com            | admin               | Admin         |
| doctor@test.com           | dr_smith            | Provider      |
| nurse@test.com            | nurse_jones         | Nurse         |
| receptionist@test.com     | receptionist_brown  | Receptionist  |
| patient@test.com          | patient_john        | User          |

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: |
          cd cli && bun install

      - name: Run migrations
        run: make db-migrate-test

      - name: Seed database
        run: ./scripts/seed-test-db.sh

      - name: Run all tests
        run: ./scripts/run-all-tests.sh

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Troubleshooting

### Tests Failing to Connect to Database

```bash
# Ensure test database is running
docker compose -f docker-compose.test.yml ps

# Check logs
docker compose -f docker-compose.test.yml logs postgres

# Restart services
docker compose -f docker-compose.test.yml restart
```

### E2E Tests Timing Out

```bash
# Increase timeout in playwright.config.ts
export default defineConfig({
  timeout: 60000,  // 60 seconds
});

# Run with debug mode
bun run test:e2e:debug
```

### Coverage Not Generating

```bash
# Install cargo-tarpaulin
cargo install cargo-tarpaulin

# Ensure test database is accessible
./scripts/seed-test-db.sh
```

---

## Best Practices

### ✅ Do

- Use test factories for creating test data
- Use Page Object Model for E2E tests
- Validate API contracts in E2E tests
- Use transaction-based isolation for backend tests
- Clean up test data after each test
- Use meaningful test descriptions
- Test error cases, not just happy paths

### ❌ Don't

- Share state between tests
- Use real user data in tests
- Skip database cleanup
- Use hardcoded IDs (use factories)
- Test implementation details
- Write flaky tests with arbitrary timeouts

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [k6 Documentation](https://k6.io/docs/)
- [Rust Testing Guide](https://doc.rust-lang.org/book/ch11-00-testing.html)

---

For questions or issues, please file an issue on GitHub or contact the development team.
