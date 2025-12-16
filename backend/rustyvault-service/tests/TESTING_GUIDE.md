# How to Test Vault Flow

## Prerequisites

1. **Running PostgreSQL Database**
   - Set `DATABASE_URL` environment variable
   - Or use Docker: `docker-compose up postgres`

2. **Test Database Setup**
   - Run migrations before tests
   - Or use a test database that gets reset between tests

## Testing Options

### Option 1: Manual Testing with Running Service

1. **Start the vault service:**
   ```bash
   cd backend/rustyvault-service
   DATABASE_URL=postgresql://user:pass@localhost:5432/db \
   VAULT_STORAGE_PATH=./test-vault-data \
   cargo run
   ```

2. **Test with curl or HTTP client:**
   ```bash
   # Initialize vault
   curl -X POST http://localhost:8200/v1/sys/init \
     -H "Content-Type: application/json" \
     -d '{"secret_shares": 5, "secret_threshold": 3}'
   
   # Unseal with keys
   curl -X POST http://localhost:8200/v1/sys/unseal \
     -H "Content-Type: application/json" \
     -d '{"key": "base64_key_here"}'
   ```

### Option 2: Integration Tests (Recommended)

Create integration tests that:
1. Set up test database
2. Start test server
3. Make HTTP requests
4. Assert responses

See `vault_flow_integration_test.rs` for implementation.

### Option 3: Unit Tests with Mocks

Test individual components without full server:
- Test `VaultCore` directly
- Test `RealmStore` with test database
- Test policy evaluation logic

## Running Tests

### Run all tests:
```bash
cd backend/rustyvault-service
cargo test
```

### Run specific test:
```bash
cargo test test_vault_initialization
```

### Run with database (requires DATABASE_URL):
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/testdb \
cargo test --test vault_flow_integration_test -- --ignored
```

### Run with test output:
```bash
cargo test -- --nocapture
```

## Test Structure

```
tests/
├── vault_flow_test.rs              # Test case documentation/outline
├── vault_flow_integration_test.rs  # Actual HTTP integration tests
└── test_helpers.rs                 # Test utilities (server setup, etc.)
```

## Environment Variables for Testing

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/testdb

# Optional
VAULT_STORAGE_PATH=./test-vault-data
VAULT_SERVER_HOST=127.0.0.1
VAULT_SERVER_PORT=8200
LOG_LEVEL=debug
```

## Test Database Setup

### Option A: Use Docker Compose
```bash
docker-compose up -d postgres
# Run migrations
cd backend && sqlx migrate run
```

### Option B: Use Test Container (sqlx-test)
```rust
// In test setup
let pool = create_test_pool().await;
run_migrations(&pool).await;
```

### Option C: Use In-Memory Database (if supported)
```rust
// For unit tests only
let pool = create_in_memory_pool().await;
```

## Example Test Flow

1. **Setup**: Create test database, start server
2. **Initialize**: POST /v1/sys/init
3. **Unseal**: POST /v1/sys/unseal (3 times)
4. **Authenticate**: Use root_token in headers
5. **Create Realm**: POST /v1/sys/realm
6. **Register Apps**: POST /v1/realm/{id}/sys/apps/register-defaults
7. **Create User**: POST /v1/realm/{id}/auth/userpass/users/{username}
8. **Create Policy**: POST /v1/realm/{id}/sys/policies/{name}
9. **Verify**: Assert all operations succeeded

## Debugging Tests

1. **Enable logging:**
   ```rust
   tracing_subscriber::fmt::init();
   ```

2. **Print responses:**
   ```rust
   println!("Response: {:?}", response);
   ```

3. **Use test database inspector:**
   ```bash
   psql $DATABASE_URL -c "SELECT * FROM vault_realms;"
   ```

## CI/CD Testing

For CI/CD, use:
- Test containers (testcontainers-rs)
- Docker Compose for full stack
- Separate test database that gets reset
