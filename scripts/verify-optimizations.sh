#!/bin/bash
# Verification script for build optimizations and code consolidation
# Run this after implementing the technical debt elimination changes

set -e

echo "================================"
echo "Build Optimization Verification"
echo "================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

function pass() {
  echo -e "${GREEN}✓${NC} $1"
  PASSED=$((PASSED + 1))
}

function fail() {
  echo -e "${RED}✗${NC} $1"
  FAILED=$((FAILED + 1))
}

function warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

echo "1. Checking unified backend Dockerfile..."
if [ -f "backend/Dockerfile" ]; then
  pass "backend/Dockerfile exists"
else
  fail "backend/Dockerfile not found"
fi

echo ""
echo "2. Checking docker-compose configuration..."

# Check api-service uses unified Dockerfile
if grep -q "dockerfile: backend/Dockerfile" docker-compose.yml; then
  pass "docker-compose.yml uses unified Dockerfile"
else
  fail "docker-compose.yml not using unified Dockerfile"
fi

# Check targets are set
if grep -q "target: api-service-prod" docker-compose.yml; then
  pass "api-service target set correctly"
else
  fail "api-service target not set"
fi

if grep -q "target: rustyvault-service-prod" docker-compose.yml; then
  pass "rustyvault-service target set correctly"
else
  fail "rustyvault-service target not set"
fi

if grep -q "target: yottadb-api-prod" docker-compose.yml; then
  pass "yottadb-api target set correctly"
else
  fail "yottadb-api target not set"
fi

echo ""
echo "3. Checking cargo cache volumes..."

# Check volumes defined
if grep -q "cargo_registry:" docker-compose.yml; then
  pass "cargo_registry volume defined"
else
  fail "cargo_registry volume not defined"
fi

if grep -q "cargo_git:" docker-compose.yml; then
  pass "cargo_git volume defined"
else
  fail "cargo_git volume not defined"
fi

if grep -q "cargo_target:" docker-compose.yml; then
  pass "cargo_target volume defined"
else
  fail "cargo_target volume not defined"
fi

echo ""
echo "4. Checking build parallelism..."

# Check CARGO_BUILD_JOBS in .env
if grep -q "CARGO_BUILD_JOBS=4" .env; then
  pass "CARGO_BUILD_JOBS=4 in .env"
elif grep -q "CARGO_BUILD_JOBS=2" .env; then
  warn "CARGO_BUILD_JOBS=2 (consider increasing to 4)"
  PASSED=$((PASSED + 1))
else
  fail "CARGO_BUILD_JOBS not set in .env"
fi

# Check SQLX_OFFLINE
if grep -q "SQLX_OFFLINE=true" .env; then
  pass "SQLX_OFFLINE=true in .env"
else
  warn "SQLX_OFFLINE not set (builds will be slower)"
fi

echo ""
echo "5. Checking shared masking library..."

# Check shared masking file exists
if [ -f "cli/packages/libs/shared/src/utils/masking.ts" ]; then
  pass "Shared masking library exists"
else
  fail "Shared masking library not found"
fi

# Check exports
if grep -q "export \* from \"./utils/masking\"" cli/packages/libs/shared/src/index.ts; then
  pass "Masking utilities exported from shared"
else
  fail "Masking utilities not exported"
fi

echo ""
echo "6. Checking for duplicate masking files..."

# Check no duplicates in apps
DUPLICATES=$(find cli/packages/apps -name "masking.ts" -not -path "*/node_modules/*" | grep -v "masking.test.ts" || true)

if [ -z "$DUPLICATES" ]; then
  pass "No duplicate masking files in apps"
else
  fail "Found duplicate masking files:"
  echo "$DUPLICATES"
fi

echo ""
echo "7. Checking imports..."

# Check imports use shared library
BAD_IMPORTS=$(grep -r "from.*['\"].*\/masking['\"]" cli/packages/apps/*/src --exclude="*.test.ts" | grep -v "@lazarus-life/shared" || true)

if [ -z "$BAD_IMPORTS" ]; then
  pass "All imports use shared library"
else
  fail "Found imports not using shared library:"
  echo "$BAD_IMPORTS"
fi

echo ""
echo "8. Checking BuildKit support..."

if [ -n "$DOCKER_BUILDKIT" ] && [ "$DOCKER_BUILDKIT" = "1" ]; then
  pass "DOCKER_BUILDKIT enabled"
else
  warn "DOCKER_BUILDKIT not enabled (run: export DOCKER_BUILDKIT=1)"
fi

echo ""
echo "9. Checking Docker version..."

DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
MAJOR_VERSION=$(echo "$DOCKER_VERSION" | cut -d. -f1)
MINOR_VERSION=$(echo "$DOCKER_VERSION" | cut -d. -f2)

if [ "$MAJOR_VERSION" -gt 18 ] || ([ "$MAJOR_VERSION" -eq 18 ] && [ "$MINOR_VERSION" -ge 9 ]); then
  pass "Docker version $DOCKER_VERSION supports BuildKit"
else
  warn "Docker version $DOCKER_VERSION may not support BuildKit (requires 18.09+)"
fi

echo ""
echo "10. Testing TypeScript compilation..."

cd cli/packages/libs/shared

if bun run tsc --noEmit > /dev/null 2>&1; then
  pass "Shared library TypeScript compiles"
else
  fail "Shared library TypeScript compilation failed"
fi

cd - > /dev/null

echo ""
echo "================================"
echo "Verification Summary"
echo "================================"
echo ""
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Run: export DOCKER_BUILDKIT=1"
  echo "  2. Run: docker-compose build"
  echo "  3. Run: cd cli && bun run test"
  echo ""
  exit 0
else
  echo -e "${RED}✗ Some checks failed${NC}"
  echo ""
  echo "Please review the failures above and fix them."
  echo ""
  exit 1
fi
