# Testing Infrastructure - Quick Start Guide

**5-Minute Setup | Ready to Test**

## TL;DR - Get Testing Now

```bash
# 1. Verify setup
./scripts/verify-test-setup.sh

# 2. Start test environment
docker compose -f docker-compose.test.yml up -d

# 3. Seed database
./scripts/seed-test-db.sh

# 4. Run tests
make test              # Quick unit tests
./scripts/run-all-tests.sh  # Full suite
```

---

## What's Available

### ✅ Frontend Testing

```typescript
// Import everything you need
import {
  TestDataFactory,
  TEST_USERS,
  renderWithProviders,
  mockApiResponse,
  LoginPage,
  validateApiContract,
} from '@lazarus-life/shared/test';

// Create test data
const patient = TestDataFactory.createPatient();

// Render components
renderWithProviders(<MyComponent />);

// Mock API calls
const mockClient = createMockApiClient();
mockClient.get.mockResolvedValue(mockApiResponse({ data: [] }));

// Use page objects for E2E
const loginPage = new LoginPage(page);
await loginPage.login('admin@test.com', 'testpassword123');
```

### ✅ Backend Testing

```rust
// Import test utilities
use shared::testing::{UserFactory, create_test_pool, fixtures::TEST_ADMIN_UUID};

// Create test data
let user = UserFactory::build();
let admin = UserFactory::build_admin();

// Setup test database
let pool = create_test_pool().await;
cleanup_database(&pool).await;

// Use fixtures
let admin_id = *TEST_ADMIN_UUID;
```

---

## Common Test Patterns

### Frontend Unit Test

```typescript
// src/components/Button/__tests__/Button.test.tsx
import { renderWithProviders, screen } from '@lazarus-life/shared/test';

test('button clicks work', async () => {
  const onClick = vi.fn();
  renderWithProviders(<Button onClick={onClick}>Click</Button>);

  await userEvent.click(screen.getByText('Click'));
  expect(onClick).toHaveBeenCalled();
});
```

### Backend Integration Test

```rust
// backend/api-service/tests/integration/users_test.rs
#[tokio::test]
#[ignore]
async fn test_create_user() {
    let app = setup_test_app().await;

    let response = make_request(
        &app,
        Method::POST,
        "/api/v1/users",
        Some(json!({"email": "test@example.com"})),
    ).await;

    assert_status(&response, StatusCode::CREATED);
    teardown_test_app(&app).await;
}
```

### E2E Test

```typescript
// e2e/specs/login.spec.ts
import { LoginPage, DashboardPage } from '@lazarus-life/shared/test/e2e';
import { TEST_USERS } from '@lazarus-life/shared/test';

test('user can login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(TEST_USERS.admin.email, 'testpassword123');

  const dashboard = new DashboardPage(page);
  expect(await dashboard.isLoggedIn()).toBe(true);
});
```

---

## Test Data

### Predefined Users (All passwords: `testpassword123`)

| Email                 | Username           | Role          |
| --------------------- | ------------------ | ------------- |
| admin@test.com        | admin              | Admin         |
| doctor@test.com       | dr_smith           | Provider      |
| nurse@test.com        | nurse_jones        | Nurse         |
| receptionist@test.com | receptionist_brown | Receptionist  |
| patient@test.com      | patient_john       | User          |

### Predefined Patients

| Name           | MRN     | DOB        |
| -------------- | ------- | ---------- |
| Alice Smith    | MRN-001 | 1985-03-15 |
| Bob Johnson    | MRN-002 | 1972-11-20 |
| Carol Williams | MRN-003 | 1950-07-08 |
| David Martinez | MRN-004 | 2010-05-12 |
| Emily Davis    | MRN-005 | 1995-09-30 |

---

## Running Tests

### Make Commands

```bash
make test              # Unit + backend tests
make test-unit         # Frontend unit tests
make test-backend      # Backend tests
make test-e2e          # E2E tests
make test-all          # Everything + coverage
```

### Individual Test Types

```bash
# Frontend unit tests
cd cli && bun run test:unit

# Backend unit tests
cd backend && cargo test --workspace --lib

# Integration tests
cd backend/api-service && cargo test --test '*'

# E2E tests
cd cli/packages/apps/client-app && bun run test:e2e

# Performance tests
k6 run cli/packages/testing/performance/k6-scripts/patient-list-load.js
```

### With Options

```bash
# Skip E2E (faster)
SKIP_E2E=true ./scripts/run-all-tests.sh

# Include performance tests
RUN_PERF_TESTS=true ./scripts/run-all-tests.sh

# Skip coverage
GENERATE_COVERAGE=false ./scripts/run-all-tests.sh
```

---

## Troubleshooting

### Database Connection Failed

```bash
# Check if services are running
docker compose -f docker-compose.test.yml ps

# Restart if needed
docker compose -f docker-compose.test.yml restart

# Check logs
docker compose -f docker-compose.test.yml logs postgres
```

### Tests Failing After Changes

```bash
# Clean and reseed database
./scripts/seed-test-db.sh

# Clear Rust build cache
cd backend && cargo clean

# Clear frontend cache
cd cli && rm -rf node_modules/.cache
```

### E2E Tests Timing Out

```bash
# Run with UI to debug
cd cli/packages/apps/admin && bun run test:e2e:ui

# Increase timeout in playwright.config.ts
timeout: 60000  // 60 seconds
```

---

## Best Practices

### ✅ DO

- Use test factories for creating data
- Use page objects for E2E tests
- Clean up after each test
- Use meaningful test descriptions
- Test error cases

### ❌ DON'T

- Share state between tests
- Use real user data
- Skip cleanup
- Use arbitrary timeouts
- Test implementation details

---

## File Locations

```
Test Utilities:        cli/packages/libs/shared/src/test/
Backend Utilities:     backend/shared/src/testing/
Sample E2E Tests:      cli/packages/apps/admin/e2e/specs/
Sample Integration:    backend/api-service/tests/integration/
Scripts:               scripts/
Documentation:         TESTING.md
```

---

## Next Steps

1. **Read Full Guide**: See `TESTING.md` for comprehensive documentation
2. **Write Tests**: Follow patterns in sample tests
3. **Run CI/CD**: See `TESTING.md` for GitHub Actions setup
4. **Contribute**: Add more test utilities and page objects as needed

---

## Need Help?

- 📖 **Full Documentation**: `TESTING.md`
- 📋 **Implementation Details**: `TESTING_IMPLEMENTATION_SUMMARY.md`
- 🔧 **Verify Setup**: `./scripts/verify-test-setup.sh`
- 🤖 **Run All Tests**: `./scripts/run-all-tests.sh`

---

**Happy Testing! 🧪**
