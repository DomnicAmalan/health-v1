#!/usr/bin/env bash
# Comprehensive Test Suite Runner
# Runs all tests: backend unit, backend integration, frontend unit, E2E, and optional performance tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RUN_PERF_TESTS="${RUN_PERF_TESTS:-false}"
SKIP_E2E="${SKIP_E2E:-false}"
GENERATE_COVERAGE="${GENERATE_COVERAGE:-true}"

# Track test results
FAILED_TESTS=()
PASSED_TESTS=()

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Health V1 - Comprehensive Test Suite Runner          ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo

# Function to print section header
print_section() {
    echo
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}  $1${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
}

# Function to run command and track result
run_test_step() {
    local step_name=$1
    shift
    local command=$@

    echo -e "${YELLOW}▶ Running: $step_name${NC}"
    echo -e "  Command: $command"
    echo

    if eval "$command"; then
        echo -e "${GREEN}✓ PASSED: $step_name${NC}"
        PASSED_TESTS+=("$step_name")
        return 0
    else
        echo -e "${RED}✗ FAILED: $step_name${NC}"
        FAILED_TESTS+=("$step_name")
        return 1
    fi
}

# ============================================================================
# 1. Environment Setup
# ============================================================================

print_section "📦 Environment Setup"

echo "Project root: $PROJECT_ROOT"
echo "Skip E2E: $SKIP_E2E"
echo "Run performance tests: $RUN_PERF_TESTS"
echo "Generate coverage: $GENERATE_COVERAGE"
echo

# Start test services
echo -e "${YELLOW}Starting test services...${NC}"
cd "$PROJECT_ROOT"

if ! docker compose -f docker-compose.test.yml ps | grep -q "Up"; then
    echo "Starting Docker test environment..."
    docker compose -f docker-compose.test.yml up -d
    echo "Waiting for services to be ready..."
    sleep 10
else
    echo "Test services already running"
fi

# Verify test database is accessible
if ! psql "${TEST_DATABASE_URL:-postgresql://test_user:test_password@localhost:5433/vault_test_db}" -c '\q' 2>/dev/null; then
    echo -e "${RED}❌ Error: Cannot connect to test database${NC}"
    echo "Make sure docker-compose.test.yml is running"
    exit 1
fi

echo -e "${GREEN}✓ Test environment ready${NC}"

# ============================================================================
# 2. Database Setup
# ============================================================================

print_section "🌱 Database Setup"

run_test_step "Seed test database" \
    "$SCRIPT_DIR/seed-test-db.sh"

# ============================================================================
# 3. Backend Unit Tests (Rust)
# ============================================================================

print_section "🦀 Backend Unit Tests"

cd "$PROJECT_ROOT/backend"

run_test_step "Rust unit tests (all workspaces)" \
    "cargo test --workspace --lib"

# ============================================================================
# 4. Backend Integration Tests
# ============================================================================

print_section "🔗 Backend Integration Tests"

# Run RustyVault integration tests
run_test_step "RustyVault integration tests" \
    "cd rustyvault-service && cargo test --test '*'"

# Run API service integration tests (if they exist)
if [ -d "$PROJECT_ROOT/backend/api-service/tests" ] && [ "$(ls -A $PROJECT_ROOT/backend/api-service/tests 2>/dev/null)" ]; then
    run_test_step "API service integration tests" \
        "cd api-service && cargo test --test '*'"
else
    echo -e "${YELLOW}⊗ API service integration tests not found (expected - will be created)${NC}"
fi

# Run Admin service integration tests (if they exist)
if [ -d "$PROJECT_ROOT/backend/admin-service/tests" ] && [ "$(ls -A $PROJECT_ROOT/backend/admin-service/tests 2>/dev/null)" ]; then
    run_test_step "Admin service integration tests" \
        "cd admin-service && cargo test --test '*'"
else
    echo -e "${YELLOW}⊗ Admin service integration tests not found${NC}"
fi

# ============================================================================
# 5. Frontend Unit Tests
# ============================================================================

print_section "⚛️  Frontend Unit Tests"

cd "$PROJECT_ROOT/cli"

run_test_step "Frontend unit tests" \
    "bun run test:unit"

# ============================================================================
# 6. E2E Tests (Playwright)
# ============================================================================

if [ "$SKIP_E2E" != "true" ]; then
    print_section "🎭 End-to-End Tests"

    # Run Client App E2E tests
    if [ -d "$PROJECT_ROOT/cli/packages/apps/client-app/e2e" ]; then
        run_test_step "Client App E2E tests" \
            "cd packages/apps/client-app && bun run test:e2e"
    else
        echo -e "${YELLOW}⊗ Client App E2E tests not found${NC}"
    fi

    # Run RustyVault UI E2E tests
    if [ -d "$PROJECT_ROOT/cli/packages/apps/rustyvault-ui/e2e" ]; then
        run_test_step "RustyVault UI E2E tests" \
            "cd packages/apps/rustyvault-ui && bun run test:e2e"
    else
        echo -e "${YELLOW}⊗ RustyVault UI E2E tests not found${NC}"
    fi

    # Run Admin App E2E tests (will be created in Phase 2)
    if [ -d "$PROJECT_ROOT/cli/packages/apps/admin/e2e" ]; then
        run_test_step "Admin App E2E tests" \
            "cd packages/apps/admin && bun run test:e2e"
    else
        echo -e "${YELLOW}⊗ Admin App E2E tests not found (expected - will be created in Phase 2)${NC}"
    fi
else
    echo -e "${YELLOW}⊗ Skipping E2E tests (SKIP_E2E=true)${NC}"
fi

# ============================================================================
# 7. Coverage Reports
# ============================================================================

if [ "$GENERATE_COVERAGE" == "true" ]; then
    print_section "📊 Coverage Reports"

    cd "$PROJECT_ROOT"

    # Backend coverage (if cargo-tarpaulin is installed)
    if command -v cargo-tarpaulin &> /dev/null; then
        run_test_step "Generate Rust coverage" \
            "cd backend && cargo tarpaulin --workspace --out Html --output-dir ../coverage/backend/"
    else
        echo -e "${YELLOW}⊗ cargo-tarpaulin not installed, skipping Rust coverage${NC}"
        echo "  Install with: cargo install cargo-tarpaulin"
    fi

    # Frontend coverage
    run_test_step "Generate frontend coverage" \
        "cd cli && bun run test:coverage"

    echo
    echo -e "${GREEN}Coverage reports generated:${NC}"
    echo "  Backend:  coverage/backend/index.html"
    echo "  Frontend: cli/coverage/index.html"
else
    echo -e "${YELLOW}⊗ Skipping coverage generation (GENERATE_COVERAGE=false)${NC}"
fi

# ============================================================================
# 8. Performance Tests (Optional)
# ============================================================================

if [ "$RUN_PERF_TESTS" == "true" ]; then
    print_section "⚡ Performance Tests"

    if command -v k6 &> /dev/null; then
        # Run k6 load tests
        if [ -d "$PROJECT_ROOT/cli/packages/testing/performance/k6-scripts" ]; then
            for script in "$PROJECT_ROOT/cli/packages/testing/performance/k6-scripts"/*.js; do
                if [ -f "$script" ]; then
                    script_name=$(basename "$script")
                    run_test_step "Performance test: $script_name" \
                        "k6 run $script"
                fi
            done
        else
            echo -e "${YELLOW}⊗ No k6 performance tests found${NC}"
        fi
    else
        echo -e "${YELLOW}⊗ k6 not installed, skipping performance tests${NC}"
        echo "  Install from: https://k6.io/docs/get-started/installation/"
    fi
else
    echo -e "${YELLOW}⊗ Skipping performance tests (RUN_PERF_TESTS=false)${NC}"
    echo "  To run performance tests, set: RUN_PERF_TESTS=true"
fi

# ============================================================================
# 9. Cleanup
# ============================================================================

print_section "🧹 Cleanup"

echo -e "${YELLOW}Stopping test services...${NC}"
# Keep services running for debugging, or stop with:
# docker compose -f docker-compose.test.yml down

echo -e "${GREEN}✓ Test services kept running for debugging${NC}"
echo "  To stop: docker compose -f docker-compose.test.yml down"

# ============================================================================
# 10. Summary
# ============================================================================

print_section "📋 Test Summary"

echo -e "${GREEN}✓ Passed Tests (${#PASSED_TESTS[@]}):${NC}"
for test in "${PASSED_TESTS[@]}"; do
    echo "  • $test"
done

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    echo
    echo -e "${RED}✗ Failed Tests (${#FAILED_TESTS[@]}):${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo "  • $test"
    done
    echo
    echo -e "${RED}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                      ✗ TESTS FAILED ✗                        ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════════╝${NC}"
    exit 1
else
    echo
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                   ✓ ALL TESTS PASSED! ✓                      ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    exit 0
fi
