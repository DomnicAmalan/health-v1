#!/usr/bin/env bash
# Verify Testing Infrastructure Setup
# Checks that all test utilities are in place and accessible

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Testing Infrastructure Verification Script              ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Track verification results
PASSED=0
FAILED=0

# Function to check file exists
check_file() {
    local file=$1
    local description=$2

    if [ -f "$PROJECT_ROOT/$file" ]; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $description - File not found: $file"
        ((FAILED++))
        return 1
    fi
}

# Function to check directory exists
check_dir() {
    local dir=$1
    local description=$2

    if [ -d "$PROJECT_ROOT/$dir" ]; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $description - Directory not found: $dir"
        ((FAILED++))
        return 1
    fi
}

echo -e "${YELLOW}Checking Frontend Test Utilities...${NC}"
check_file "cli/packages/libs/shared/src/test/index.ts" "Main test index"
check_file "cli/packages/libs/shared/src/test/factories/index.ts" "Test data factories"
check_file "cli/packages/libs/shared/src/test/fixtures/seedData.ts" "Test fixtures"
check_file "cli/packages/libs/shared/src/test/helpers/renderWithProviders.tsx" "React testing helpers"
check_file "cli/packages/libs/shared/src/test/helpers/mockApiClient.ts" "API mocking utilities"
check_file "cli/packages/libs/shared/src/test/helpers/setupTests.ts" "Test setup utilities"
check_file "cli/packages/libs/shared/src/test/e2e/PageObjectModel.ts" "Page object model"
check_file "cli/packages/libs/shared/src/test/contracts/api-contracts.ts" "Contract testing"

echo
echo -e "${YELLOW}Checking Backend Test Utilities...${NC}"
check_file "backend/shared/src/testing/mod.rs" "Testing module"
check_file "backend/shared/src/testing/factories.rs" "Rust factories"
check_file "backend/shared/src/testing/fixtures.rs" "Rust fixtures"
check_file "backend/shared/src/testing/helpers.rs" "Database helpers"

echo
echo -e "${YELLOW}Checking Database Seed Files...${NC}"
check_file "backend/migrations/seeds/test_users.sql" "SQL seed data"
check_file "scripts/seed-test-db.sh" "Seed script"
check_file "scripts/run-all-tests.sh" "Test orchestration script"

echo
echo -e "${YELLOW}Checking Sample Tests...${NC}"
check_file "cli/packages/apps/admin/e2e/specs/user-management.spec.ts" "Admin E2E test"
check_file "backend/api-service/tests/integration/common/mod.rs" "Integration test setup"
check_file "backend/api-service/tests/integration/auth_test.rs" "Auth integration test"

echo
echo -e "${YELLOW}Checking Performance Tests...${NC}"
check_file "cli/packages/testing/performance/k6-scripts/patient-list-load.js" "k6 load test"

echo
echo -e "${YELLOW}Checking Documentation...${NC}"
check_file "TESTING.md" "Testing documentation"
check_file "TESTING_IMPLEMENTATION_SUMMARY.md" "Implementation summary"

echo
echo -e "${YELLOW}Checking Script Permissions...${NC}"
if [ -x "$PROJECT_ROOT/scripts/seed-test-db.sh" ]; then
    echo -e "${GREEN}✓${NC} seed-test-db.sh is executable"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} seed-test-db.sh is not executable"
    ((FAILED++))
fi

if [ -x "$PROJECT_ROOT/scripts/run-all-tests.sh" ]; then
    echo -e "${GREEN}✓${NC} run-all-tests.sh is executable"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} run-all-tests.sh is not executable"
    ((FAILED++))
fi

echo
echo -e "${YELLOW}Checking Test Database Accessibility...${NC}"
TEST_DB_URL="${TEST_DATABASE_URL:-postgresql://test_user:test_password@localhost:5433/vault_test_db}"

if command -v psql &> /dev/null; then
    if psql "$TEST_DB_URL" -c '\q' 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Test database is accessible"
        ((PASSED++))
    else
        echo -e "${YELLOW}⊗${NC} Test database not accessible (may need to start docker-compose.test.yml)"
    fi
else
    echo -e "${YELLOW}⊗${NC} psql not installed (optional for verification)"
fi

echo
echo -e "${YELLOW}Checking Required Dependencies...${NC}"

# Check Rust
if command -v cargo &> /dev/null; then
    echo -e "${GREEN}✓${NC} Rust/Cargo installed"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Rust/Cargo not installed"
    ((FAILED++))
fi

# Check Bun
if command -v bun &> /dev/null; then
    echo -e "${GREEN}✓${NC} Bun installed"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Bun not installed"
    ((FAILED++))
fi

# Check Docker
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker installed"
    ((PASSED++))
else
    echo -e "${YELLOW}⊗${NC} Docker not installed (optional but recommended)"
fi

# Check k6 (optional)
if command -v k6 &> /dev/null; then
    echo -e "${GREEN}✓${NC} k6 installed (for performance tests)"
else
    echo -e "${YELLOW}⊗${NC} k6 not installed (optional - for performance tests)"
fi

# Check cargo-tarpaulin (optional)
if cargo install --list | grep -q "cargo-tarpaulin"; then
    echo -e "${GREEN}✓${NC} cargo-tarpaulin installed (for coverage)"
else
    echo -e "${YELLOW}⊗${NC} cargo-tarpaulin not installed (optional - for coverage)"
fi

# Summary
echo
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                        Summary                                ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo
echo -e "  ${GREEN}Passed:${NC} $PASSED"
echo -e "  ${RED}Failed:${NC} $FAILED"
echo

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          ✓ All Verifications Passed! ✓                       ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo "Testing infrastructure is properly set up!"
    echo
    echo "Next steps:"
    echo "  1. Start test environment:  docker compose -f docker-compose.test.yml up -d"
    echo "  2. Seed test database:      ./scripts/seed-test-db.sh"
    echo "  3. Run tests:               ./scripts/run-all-tests.sh"
    echo
    exit 0
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║          ✗ Some Verifications Failed ✗                       ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo "Please review the failed checks above."
    exit 1
fi
