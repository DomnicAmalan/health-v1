#!/bin/bash
# Script to cleanup test environment
# Usage: ./scripts/cleanup-test.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🧹 Cleaning Up Test Environment"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd "$PROJECT_ROOT"

# Stop and remove containers
echo -e "${YELLOW}Stopping test containers...${NC}"
docker-compose -f docker-compose.test.yml down -v

# Remove test volumes
echo -e "${YELLOW}Removing test volumes...${NC}"
docker volume rm vault-test-network_postgres_test_data 2>/dev/null || true
docker volume rm vault-test-network_rustyvault_test_data 2>/dev/null || true
docker volume rm vault-test-network_rustyvault_test_coverage 2>/dev/null || true
docker volume rm vault-test-network_rustyvault_ui_test_coverage 2>/dev/null || true

# Remove test network
echo -e "${YELLOW}Removing test network...${NC}"
docker network rm vault-test-network 2>/dev/null || true

# Clean up temporary test files (optional)
echo -e "${YELLOW}Cleaning temporary files...${NC}"
find "$PROJECT_ROOT" -type d -name "test-results" -exec rm -rf {} + 2>/dev/null || true

echo -e "${GREEN}✅ Cleanup completed!${NC}"
