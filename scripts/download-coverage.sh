#!/bin/bash
# Script to download coverage reports from test containers
# Usage: ./scripts/download-coverage.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "📥 Downloading Coverage Reports"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

COVERAGE_DIR="$PROJECT_ROOT/coverage-reports"
mkdir -p "$COVERAGE_DIR"

# Download backend coverage
echo -e "${YELLOW}Downloading backend coverage...${NC}"
if docker ps | grep -q "rustyvault-service-test"; then
  docker cp health-rustyvault-service-test:/app/coverage "$COVERAGE_DIR/backend" 2>/dev/null || true
fi

# Copy local backend coverage if exists
if [ -d "$PROJECT_ROOT/backend/rustyvault-service/coverage" ]; then
  cp -r "$PROJECT_ROOT/backend/rustyvault-service/coverage" "$COVERAGE_DIR/backend-local" 2>/dev/null || true
fi

# Download frontend coverage
echo -e "${YELLOW}Downloading frontend coverage...${NC}"
if docker ps | grep -q "rustyvault-ui-test"; then
  docker cp health-rustyvault-ui-test:/app/coverage "$COVERAGE_DIR/frontend" 2>/dev/null || true
fi

# Copy local frontend coverage if exists
if [ -d "$PROJECT_ROOT/cli/packages/apps/rustyvault-ui/coverage" ]; then
  cp -r "$PROJECT_ROOT/cli/packages/apps/rustyvault-ui/coverage" "$COVERAGE_DIR/frontend-local" 2>/dev/null || true
fi

# Copy Playwright reports
echo -e "${YELLOW}Copying Playwright reports...${NC}"
if [ -d "$PROJECT_ROOT/cli/packages/apps/rustyvault-ui/playwright-report" ]; then
  cp -r "$PROJECT_ROOT/cli/packages/apps/rustyvault-ui/playwright-report" "$COVERAGE_DIR/e2e" 2>/dev/null || true
fi

# Generate summary
echo -e "${GREEN}✅ Coverage reports downloaded to: $COVERAGE_DIR${NC}"
echo ""
echo "Coverage Summary:"
echo "=================="
echo "Backend: $COVERAGE_DIR/backend/"
echo "Frontend: $COVERAGE_DIR/frontend-local/"
echo "E2E: $COVERAGE_DIR/e2e/"
echo ""

# Try to open HTML reports if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
  if [ -f "$COVERAGE_DIR/backend/cobertura.xml" ] || [ -f "$COVERAGE_DIR/backend/tarpaulin-report.html" ]; then
    echo -e "${YELLOW}Opening backend coverage report...${NC}"
    open "$COVERAGE_DIR/backend/tarpaulin-report.html" 2>/dev/null || true
  fi
  
  if [ -d "$COVERAGE_DIR/frontend-local" ]; then
    HTML_REPORT=$(find "$COVERAGE_DIR/frontend-local" -name "index.html" | head -1)
    if [ -n "$HTML_REPORT" ]; then
      echo -e "${YELLOW}Opening frontend coverage report...${NC}"
      open "$HTML_REPORT" 2>/dev/null || true
    fi
  fi
  
  if [ -d "$COVERAGE_DIR/e2e" ]; then
    HTML_REPORT=$(find "$COVERAGE_DIR/e2e" -name "index.html" | head -1)
    if [ -n "$HTML_REPORT" ]; then
      echo -e "${YELLOW}Opening E2E test report...${NC}"
      open "$HTML_REPORT" 2>/dev/null || true
    fi
  fi
fi
