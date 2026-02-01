#!/usr/bin/env bash

#
# Comprehensive UI Testing Script
# Runs automated Playwright tests and generates a report
#

set -e

echo "======================================"
echo "Health V1 - Comprehensive UI Testing"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend services are running
echo -e "${YELLOW}Checking backend services...${NC}"
if ! docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
    echo -e "${RED}Error: Backend services not running${NC}"
    echo "Start services with: make docker-dev"
    exit 1
fi
echo -e "${GREEN}✓ Backend services running${NC}"
echo ""

# Check if client app is running
echo -e "${YELLOW}Checking client app...${NC}"
if ! lsof -ti:5175 > /dev/null; then
    echo -e "${RED}Error: Client app not running on port 5175${NC}"
    echo "Start client app with: make dev-client"
    exit 1
fi
echo -e "${GREEN}✓ Client app running on port 5175${NC}"
echo ""

# Navigate to client app directory
cd cli/packages/apps/client-app

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    bun install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
fi

# Run Playwright tests
echo -e "${YELLOW}Running Playwright tests...${NC}"
echo ""

# Run tests with HTML reporter
bun run test:e2e || {
    echo ""
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "To view the detailed report, run:"
    echo "  bun playwright show-report"
    exit 1
}

echo ""
echo -e "${GREEN}✓ All automated tests passed!${NC}"
echo ""

# Generate summary
echo "======================================"
echo "Test Summary"
echo "======================================"
echo ""
echo "Automated tests have verified:"
echo "  • All 28 routes load without errors"
echo "  • Tab navigation works across modules"
echo "  • No console errors on page load"
echo ""
echo "Manual Testing Required:"
echo "  • Modal dialog interactions"
echo "  • Form field validation"
echo "  • Button click behaviors"
echo "  • Data submission flows"
echo ""
echo "See TESTING_EXECUTION_GUIDE.md for detailed manual testing procedures"
echo ""

# Open test report (optional)
read -p "Open test report in browser? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    bun playwright show-report
fi
