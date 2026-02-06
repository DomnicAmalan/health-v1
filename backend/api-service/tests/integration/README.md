# API Service Integration Tests

Comprehensive integration tests for all healthcare modules in the Health V1 system.

## Test Structure

```
tests/
├── integration/
│   ├── common/
│   │   └── mod.rs           # Shared test utilities
│   ├── appointments_test.rs  # Appointment scheduling tests
│   ├── lab_orders_test.rs    # Lab workflow tests
│   ├── imaging_orders_test.rs # Radiology tests
│   ├── clinical_notes_test.rs # Documentation tests
│   ├── vital_signs_test.rs   # Vitals recording tests
│   ├── problem_list_test.rs  # Problem list tests
│   ├── encounters_test.rs    # Encounter management tests
│   └── auth_test.rs          # Authentication tests
```

## Running Tests

### Prerequisites

1. **Test Database**: Set up a PostgreSQL test database
   ```bash
   createdb health_v1_test
   ```

2. **Environment Variables**: Create `.env.test` file
   ```bash
   DATABASE_URL=postgresql://user:password@localhost:5432/health_v1_test
   TEST_DATABASE_URL=postgresql://user:password@localhost:5432/health_v1_test
   ```

3. **Run Migrations**:
   ```bash
   sqlx migrate run --database-url $TEST_DATABASE_URL
   ```

### Run All Tests

```bash
# Run all integration tests
cargo test --test '*' -- --test-threads=1

# Run specific test module
cargo test --test appointments_test -- --ignored

# Run with output
cargo test --test lab_orders_test -- --ignored --nocapture
```

### Run Individual Tests

```bash
# Run single test
cargo test --test appointments_test test_create_appointment_success -- --ignored

# Run tests matching pattern
cargo test --test lab_orders_test critical -- --ignored
```

## Test Coverage

### Appointments Module
- ✅ Create appointment with valid data
- ✅ Reject appointment with missing patient
- ✅ Check-in workflow
- ✅ Cancellation workflow
- ✅ List with filters
- ✅ Invalid appointment type validation
- ✅ Duration boundary testing

### Lab Orders Module
- ✅ Create routine lab order
- ✅ Create STAT order
- ✅ Specimen collection workflow
- ✅ Result entry (preliminary)
- ✅ Result verification (final)
- ✅ Critical value flagging
- ✅ Order cancellation
- ✅ List with filters
- ✅ Duplicate order prevention

### Imaging Orders Module
- ✅ Create imaging order
- ✅ Schedule study
- ✅ Perform study (technologist)
- ✅ Enter preliminary report
- ✅ Enter final report
- ✅ Critical findings workflow
- ✅ PACS integration fields
- ✅ Order cancellation

### Clinical Notes Module
- ✅ Create SOAP note
- ✅ Update draft note
- ✅ Sign note (electronic signature)
- ✅ Prevent editing signed notes
- ✅ ICD-10/CPT coding
- ✅ Note templates
- ✅ Amendment workflow

### Vital Signs Module
- ✅ Record vitals
- ✅ Auto-calculate BMI
- ✅ Flag abnormal values
- ✅ Flag critical values
- ✅ Trend analysis
- ✅ Boundary testing (BP, HR, temp ranges)

### Problem List Module
- ✅ Add problem
- ✅ Update problem
- ✅ Resolve problem
- ✅ ICD-10 coding
- ✅ SNOMED coding
- ✅ Chronic condition tracking
- ✅ Problem comments
- ✅ History audit trail

### Encounters Module
- ✅ Create encounter
- ✅ Start encounter
- ✅ Complete encounter
- ✅ Add diagnosis
- ✅ Add procedure
- ✅ Auto-calculate duration
- ✅ Auto-calculate wait time
- ✅ Status transitions

## Test Utilities

### Common Module (`common/mod.rs`)

```rust
// Setup test application
let app = setup_test_app().await;

// Make authenticated request
let response = make_authenticated_request(
    &app,
    Method::POST,
    "/v1/ehr/appointments",
    "test_token",
    Some(payload)
).await;

// Assert response
assert_status(&response, StatusCode::CREATED);

// Extract JSON body
let result: MyType = extract_json_body(response).await;

// Cleanup
teardown_test_app(&app).await;
```

## Writing New Tests

### Test Template

```rust
#[tokio::test]
#[ignore] // Requires test database
async fn test_feature_name() {
    let app = common::setup_test_app().await;

    // Arrange: Setup test data
    let payload = json!({ ... });

    // Act: Execute request
    let response = common::make_authenticated_request(
        &app,
        Method::POST,
        "/v1/ehr/endpoint",
        "test_token",
        Some(payload),
    )
    .await;

    // Assert: Verify results
    common::assert_status(&response, StatusCode::CREATED);
    let result: serde_json::Value = common::extract_json_body(response).await;
    assert_eq!(result["field"], "expected_value");

    common::teardown_test_app(&app).await;
}
```

### Tiger Style Test Principles

1. **Boundary Testing**: Test min/max values, edge cases
   ```rust
   test_appointment_duration_boundaries()
   ```

2. **Error Cases**: Test all failure modes
   ```rust
   test_create_appointment_missing_patient()
   test_invalid_appointment_type()
   ```

3. **State Transitions**: Test valid and invalid transitions
   ```rust
   test_cannot_collect_cancelled_order()
   test_cannot_edit_signed_note()
   ```

4. **Critical Values**: Test safety mechanisms
   ```rust
   test_critical_value_flagging()
   test_abnormal_vital_signs_detection()
   ```

5. **Audit Trail**: Verify all changes tracked
   ```rust
   test_problem_status_history()
   test_encounter_status_changes()
   ```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: health_v1_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v2
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Run migrations
        run: sqlx migrate run
      - name: Run tests
        run: cargo test --test '*' -- --ignored --test-threads=1
```

## Troubleshooting

### Tests Timing Out
- Check database connection
- Verify migrations ran successfully
- Ensure test data seeding completed

### Tests Failing Due to Missing Data
- Check `shared::testing::seed_test_data()` implementation
- Verify test fixtures in `tests/fixtures/`

### Flaky Tests
- Use `--test-threads=1` to run serially
- Check for shared state between tests
- Ensure proper cleanup in teardown

## Performance Benchmarks

Target performance metrics:
- API response time: < 500ms (p95)
- Database query time: < 5s (Tiger Style timeout)
- Test execution: < 1s per test

## Security Testing

Tests include:
- SQL injection prevention
- Input validation
- Authorization checks
- PHI data masking
- Audit trail verification

## Next Steps

1. Add E2E tests using Playwright
2. Add load testing with k6
3. Add security scanning with OWASP ZAP
4. Add mutation testing
5. Add contract testing for API versioning
