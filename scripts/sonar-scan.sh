#!/bin/bash
# SonarQube Scanner Script
# Usage: ./scripts/sonar-scan.sh [backend|admin-ui|client-app|all]

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

SONAR_HOST_URL=${SONAR_HOST_URL:-http://localhost:9000}
SONAR_TOKEN=${SONAR_TOKEN:-}
SONAR_ORGANIZATION=${SONAR_ORGANIZATION:-}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_usage() {
    echo "Usage: $0 [backend|admin-ui|client-app|all]"
    echo ""
    echo "Options:"
    echo "  backend      - Scan backend (Rust) code"
    echo "  admin-ui     - Scan admin UI (TypeScript/React) code"
    echo "  client-app   - Scan client app (TypeScript/React) code"
    echo "  all          - Scan all projects"
    echo ""
    echo "Environment variables:"
    echo "  SONAR_HOST_URL      - SonarQube server URL (default: http://localhost:9000)"
    echo "  SONAR_TOKEN         - SonarQube authentication token"
    echo "  SONAR_ORGANIZATION  - SonarCloud organization (optional)"
}

scan_backend() {
    echo -e "${GREEN}Scanning backend (Rust)...${NC}"
    cd backend
    
    if [ ! -f sonar-project.properties ]; then
        echo -e "${RED}Error: sonar-project.properties not found in backend directory${NC}"
        return 1
    fi
    
    # Check if sonar-scanner is available
    if ! command -v sonar-scanner &> /dev/null; then
        echo -e "${YELLOW}Warning: sonar-scanner not found. Install it or use Docker:${NC}"
        echo "  docker run --rm -v \$(pwd):/usr/src sonarsource/sonar-scanner-cli"
        return 1
    fi
    
    export SONAR_HOST_URL
    export SONAR_TOKEN
    
    # Check if token is set
    if [ -z "$SONAR_TOKEN" ]; then
        echo -e "${RED}Error: SONAR_TOKEN environment variable is not set${NC}"
        echo "  Set it with: export SONAR_TOKEN=your-token"
        return 1
    fi
    
    # For self-hosted SonarQube, explicitly set host URL and token
    # Note: Rust support requires SonarQube 2025 Release 3+ and Clippy installed
    sonar-scanner \
        -Dsonar.projectKey=health-v1-backend \
        -Dsonar.sources=. \
        -Dsonar.host.url="${SONAR_HOST_URL:-http://localhost:9000}" \
        -Dsonar.token="$SONAR_TOKEN"
    
    cd ..
    echo -e "${GREEN}Backend scan completed${NC}"
}

scan_admin_ui() {
    echo -e "${GREEN}Scanning admin UI (TypeScript/React)...${NC}"
    cd cli/packages/apps/admin
    
    if [ ! -f sonar-project.properties ]; then
        echo -e "${RED}Error: sonar-project.properties not found in admin directory${NC}"
        return 1
    fi
    
    # Check if npm sonar scanner is available
    if ! command -v sonar &> /dev/null; then
        echo -e "${YELLOW}Warning: @sonar/scan not found. Installing...${NC}"
        echo "  Run: npm install -g @sonar/scan"
        echo "  Or use Docker: docker run --rm -v \$(pwd):/usr/src sonarsource/sonar-scanner-cli"
        return 1
    fi
    
    export SONAR_HOST_URL
    export SONAR_TOKEN
    [ -n "$SONAR_ORGANIZATION" ] && export SONAR_ORGANIZATION
    
    # Use npm sonar scanner for TypeScript/React projects
    sonar \
        -Dsonar.projectKey=health-v1-admin-ui \
        -Dsonar.host.url="$SONAR_HOST_URL" \
        ${SONAR_TOKEN:+-Dsonar.token="$SONAR_TOKEN"} \
        ${SONAR_ORGANIZATION:+-Dsonar.organization="$SONAR_ORGANIZATION"}
    
    cd ../../..
    echo -e "${GREEN}Admin UI scan completed${NC}"
}

scan_client_app() {
    echo -e "${GREEN}Scanning client app (TypeScript/React)...${NC}"
    cd cli/packages/apps/client-app
    
    if [ ! -f sonar-project.properties ]; then
        echo -e "${RED}Error: sonar-project.properties not found in client-app directory${NC}"
        return 1
    fi
    
    # Check if npm sonar scanner is available
    if ! command -v sonar &> /dev/null; then
        echo -e "${YELLOW}Warning: @sonar/scan not found. Installing...${NC}"
        echo "  Run: npm install -g @sonar/scan"
        echo "  Or use Docker: docker run --rm -v \$(pwd):/usr/src sonarsource/sonar-scanner-cli"
        return 1
    fi
    
    export SONAR_HOST_URL
    export SONAR_TOKEN
    [ -n "$SONAR_ORGANIZATION" ] && export SONAR_ORGANIZATION
    
    # Use npm sonar scanner for TypeScript/React projects
    sonar \
        -Dsonar.projectKey=health-v1-client-ui \
        -Dsonar.host.url="$SONAR_HOST_URL" \
        ${SONAR_TOKEN:+-Dsonar.token="$SONAR_TOKEN"} \
        ${SONAR_ORGANIZATION:+-Dsonar.organization="$SONAR_ORGANIZATION"}
    
    cd ../../..
    echo -e "${GREEN}Client app scan completed${NC}"
}

# Main script
if [ $# -eq 0 ]; then
    print_usage
    exit 1
fi

case "$1" in
    backend)
        scan_backend
        ;;
    admin-ui)
        scan_admin_ui
        ;;
    client-app)
        scan_client_app
        ;;
    all)
        scan_backend
        scan_admin_ui
        scan_client_app
        echo -e "${GREEN}All scans completed!${NC}"
        ;;
    *)
        echo -e "${RED}Error: Unknown option '$1'${NC}"
        print_usage
        exit 1
        ;;
esac

