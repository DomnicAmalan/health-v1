#!/bin/bash
# Script to run vault tests with coverage
# Usage: ./scripts/run-vault-tests.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 Starting Vault Test Suite"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Start docker-compose services
echo -e "${YELLOW}Starting test services...${NC}"
cd "$PROJECT_ROOT"
docker-compose -f docker-compose.test.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
timeout=120
elapsed=0
while [ $elapsed -lt $timeout ]; do
  if docker-compose -f docker-compose.test.yml ps | grep -q "healthy"; then
    echo -e "${GREEN}Services are healthy!${NC}"
    break
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done

if [ $elapsed -ge $timeout ]; then
  echo -e "${RED}Timeout waiting for services to be healthy${NC}"
  docker-compose -f docker-compose.test.yml logs
  exit 1
fi

# Migrations are handled by the migrations-test service in docker-compose.test.yml
# No manual migration step needed

# Run backend tests with coverage
echo -e "${YELLOW}Running backend tests with coverage...${NC}"
cd "$PROJECT_ROOT/backend/rustyvault-service"
export DATABASE_URL="postgresql://test_user:test_password@localhost:5433/vault_test_db"
export VAULT_TEST_URL="http://localhost:8217"

# Install cargo-tarpaulin if not present
if ! command -v cargo-tarpaulin &> /dev/null; then
  echo -e "${YELLOW}Installing cargo-tarpaulin...${NC}"
  cargo install cargo-tarpaulin --locked
fi

# Run tests with coverage
mkdir -p coverage
cargo tarpaulin --out Xml --out Html --output-dir coverage --exclude-files '*/tests/*' || true

# Run frontend unit tests with coverage
echo -e "${YELLOW}Running frontend unit tests with coverage...${NC}"
cd "$PROJECT_ROOT/cli/packages/apps/rustyvault-ui"
bun install
bun run test:coverage || true

# Run E2E tests
echo -e "${YELLOW}Running E2E tests...${NC}"
bunx playwright install --with-deps || true
PLAYWRIGHT_BASE_URL="http://localhost:8215" \
PLAYWRIGHT_API_URL="http://localhost:8217" \
bun run test:e2e || true

echo -e "${GREEN}✅ All tests completed!${NC}"
echo -e "${YELLOW}Coverage reports generated in:${NC}"
echo "  - Backend: backend/rustyvault-service/coverage/"
echo "  - Frontend: cli/packages/apps/rustyvault-ui/coverage/"
echo "  - E2E: cli/packages/apps/rustyvault-ui/playwright-report/"

# Don't stop services - let user decide or use cleanup script
echo -e "${YELLOW}Test services are still running. Use ./scripts/cleanup-test.sh to stop them.${NC}"
