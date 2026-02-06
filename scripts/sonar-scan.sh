#!/bin/bash
# SonarQube Scanner Script
# Runs tests with coverage, then SonarQube analysis for Health V1
#
# Note: This project uses Biome/OXC for linting (not ESLint).
# SonarQube performs native TypeScript/Rust analysis.

# Don't exit on test failures - we want coverage even if tests fail
set -o pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${GREEN}=== Health V1 SonarQube Analysis ===${NC}"
echo ""

# Check if SONAR_TOKEN is set
if [ -z "$SONAR_TOKEN" ]; then
    echo -e "${YELLOW}Warning: SONAR_TOKEN not set. Using .env file...${NC}"
    if [ -f .env ]; then
        SONAR_TOKEN=$(grep -E "^SONAR_TOKEN=" .env | cut -d'=' -f2 | cut -d'#' -f1 | tr -d ' ')
        export SONAR_TOKEN
    fi
fi

if [ -z "$SONAR_TOKEN" ]; then
    echo -e "${RED}Error: SONAR_TOKEN is not set.${NC}"
    echo "Add your token to .env: SONAR_TOKEN=your-token-here"
    echo "Or export it: export SONAR_TOKEN=your-token-here"
    exit 1
fi

# Check SonarQube is running
echo -e "${GREEN}[1/7] Checking SonarQube server...${NC}"
if ! curl -s "http://localhost:9000/api/system/status" | grep -q "UP"; then
    echo -e "${RED}Error: SonarQube is not running or not ready.${NC}"
    echo "Start it with: docker compose --profile sonarqube up -d"
    echo "Wait ~2 minutes for it to initialize."
    exit 1
fi
echo "SonarQube is running!"

# Check for Rust support (native since SonarQube 10.8)
echo ""
echo -e "${GREEN}[1.5/7] Checking Rust support...${NC}"
RUST_PLUGIN=$(curl -s "http://localhost:9000/api/plugins/installed" 2>/dev/null | grep -o '"Rust[^"]*"' | head -1 || echo "")
if [ -n "$RUST_PLUGIN" ]; then
    echo -e "${GREEN}Rust analysis available: $RUST_PLUGIN${NC}"
else
    echo -e "${YELLOW}Rust plugin not detected. SonarQube 10.8+ has native Rust support.${NC}"
fi

# Clean previous scanner work directory
echo ""
echo -e "${GREEN}[2/7] Cleaning previous scanner cache...${NC}"
rm -rf .scannerwork
echo "Cleaned .scannerwork directory"

# Run Backend Tests with Coverage
echo ""
echo -e "${GREEN}[3/7] Running backend tests with coverage...${NC}"
if command -v cargo &> /dev/null; then
    cd "$PROJECT_ROOT/backend"

    # Run tests first
    cargo test --workspace 2>&1 | tee /tmp/backend-test-results.txt || true

    # Count passed/failed
    BACKEND_PASSED=$(grep -c "test .* ok" /tmp/backend-test-results.txt 2>/dev/null || echo "0")
    BACKEND_FAILED=$(grep -c "test .* FAILED" /tmp/backend-test-results.txt 2>/dev/null || echo "0")
    echo -e "Backend tests: ${GREEN}$BACKEND_PASSED passed${NC}, ${RED}$BACKEND_FAILED failed${NC}"

    # Generate coverage with cargo-tarpaulin if available
    if command -v cargo-tarpaulin &> /dev/null; then
        echo ""
        echo -e "${YELLOW}Generating Rust coverage with tarpaulin...${NC}"
        mkdir -p coverage
        cargo tarpaulin --config .tarpaulin.toml 2>&1 || true
        if [ -f coverage/lcov.info ]; then
            echo -e "${GREEN}Rust coverage report generated: backend/coverage/lcov.info${NC}"
            # Show detailed summary
            FILES_IN_LCOV=$(grep -c "^SF:" coverage/lcov.info 2>/dev/null || echo "0")
            LINES_TRACKED=$(grep -c "^DA:" coverage/lcov.info 2>/dev/null || echo "0")
            LINES_HIT=$(grep "^DA:" coverage/lcov.info 2>/dev/null | grep -v ",0$" | wc -l | tr -d ' ')

            # Count total Rust source files
            TOTAL_RS_FILES=$(find . -name "*.rs" -path "*/src/*" ! -path "*/target/*" | wc -l | tr -d ' ')

            echo -e "  Files in lcov:      $FILES_IN_LCOV / $TOTAL_RS_FILES source files"
            echo -e "  Lines tracked:      $LINES_TRACKED"
            echo -e "  Lines hit:          $LINES_HIT"
            if [ "$LINES_TRACKED" -gt 0 ]; then
                COVERAGE_PCT=$(echo "scale=1; $LINES_HIT * 100 / $LINES_TRACKED" | bc 2>/dev/null || echo "N/A")
                echo -e "  Line coverage:      ${COVERAGE_PCT}%"
            fi
        fi
    else
        echo -e "${YELLOW}cargo-tarpaulin not found, skipping Rust coverage${NC}"
        echo "Install with: cargo install cargo-tarpaulin"
    fi

    cd "$PROJECT_ROOT"
else
    echo -e "${YELLOW}Cargo not found, skipping backend tests${NC}"
fi

# Build Frontend Libraries
echo ""
echo -e "${GREEN}[4/7] Building frontend libraries...${NC}"
if command -v bun &> /dev/null; then
    cd "$PROJECT_ROOT/cli"
    bun run build:libs 2>&1 || true
    echo "Frontend libraries built"
    cd "$PROJECT_ROOT"
else
    echo -e "${YELLOW}Bun not found, skipping lib build${NC}"
fi

# Run Frontend Tests with Coverage
echo ""
echo -e "${GREEN}[5/7] Running frontend tests with coverage...${NC}"
if command -v bun &> /dev/null; then
    cd "$PROJECT_ROOT/cli"

    # Run tests for libs packages first
    for lib in shared components; do
        LIB_DIR="packages/libs/$lib"
        if [ -f "$LIB_DIR/package.json" ]; then
            echo ""
            echo -e "${YELLOW}Testing lib: $lib...${NC}"
            cd "$PROJECT_ROOT/cli/$LIB_DIR"
            bun run test:coverage 2>&1 || true
        fi
    done

    # Run tests for each app
    for app in rustyvault-ui admin client-app; do
        APP_DIR="packages/apps/$app"
        if [ -f "$APP_DIR/package.json" ]; then
            echo ""
            echo -e "${YELLOW}Testing app: $app...${NC}"
            cd "$PROJECT_ROOT/cli/$APP_DIR"
            bun run test:coverage 2>&1 || true
        fi
    done

    echo ""
    echo -e "${GREEN}Frontend coverage reports generated${NC}"

    # Show frontend coverage summary
    cd "$PROJECT_ROOT"
    echo ""
    echo -e "${YELLOW}Frontend Coverage Summary:${NC}"
    printf "  %-25s %8s %10s %10s\\n" "Package" "Files" "Lines" "Coverage"
    printf "  %-25s %8s %10s %10s\\n" "─────────────────────────" "────────" "──────────" "──────────"

    for lcov in cli/packages/libs/*/coverage/lcov.info cli/packages/apps/*/coverage/lcov.info; do
        if [ -f "$lcov" ]; then
            PKG_NAME=$(echo "$lcov" | sed 's|cli/packages/||; s|/coverage/lcov.info||; s|libs/||; s|apps/||')
            FILES_COUNT=$(grep -c "^SF:" "$lcov" 2>/dev/null || echo "0")
            LINES_TOTAL=$(grep -c "^DA:" "$lcov" 2>/dev/null || echo "0")
            LINES_HIT=$(grep "^DA:" "$lcov" 2>/dev/null | grep -v ",0$" | wc -l | tr -d ' ')

            if [ "$LINES_TOTAL" -gt 0 ]; then
                COVERAGE_PCT=$(echo "scale=1; $LINES_HIT * 100 / $LINES_TOTAL" | bc 2>/dev/null || echo "N/A")
            else
                COVERAGE_PCT="0.0"
            fi
            printf "  %-25s %8s %10s %9s%%\\n" "$PKG_NAME" "$FILES_COUNT" "$LINES_TOTAL" "$COVERAGE_PCT"
        fi
    done

    # Total source files (for comparison)
    TOTAL_TS_FILES=$(find cli/packages -name "*.ts" -o -name "*.tsx" 2>/dev/null | \
        grep -v node_modules | grep -v dist | grep -v coverage | \
        grep -v "\\.test\\." | grep -v "\\.spec\\." | grep -v "__tests__" | \
        grep -v "\\.d\\.ts" | grep -v "\\.config\\." | grep -v "routeTree.gen" | \
        grep "/src/" | wc -l | tr -d ' ')

    TOTAL_IN_LCOV=$(cat cli/packages/*/coverage/lcov.info 2>/dev/null | grep -c "^SF:" || echo "0")
    echo ""
    echo -e "  ${YELLOW}Total source files: $TOTAL_TS_FILES | In lcov reports: $TOTAL_IN_LCOV${NC}"
else
    echo -e "${YELLOW}Bun not found, skipping frontend tests${NC}"
fi

# Generate Clippy report for Rust
echo ""
echo -e "${GREEN}[6/7] Generating Rust Clippy report...${NC}"
if command -v cargo &> /dev/null; then
    cd "$PROJECT_ROOT/backend"
    echo "Running cargo clippy..."

    # Run clippy with verbose output
    cargo clippy --workspace -- -D warnings 2>&1 | tee /tmp/clippy-output.txt || true

    # Also generate JSON report for tooling
    cargo clippy --workspace --message-format=json 2>&1 | \
        jq -s '[.[] | select(.reason == "compiler-message") | .message]' \
        > clippy-report.json 2>/dev/null || echo "[]" > clippy-report.json

    # Count warnings/errors
    CLIPPY_WARNINGS=$(grep -c "warning:" /tmp/clippy-output.txt 2>/dev/null || echo "0")
    CLIPPY_ERRORS=$(grep -c "error:" /tmp/clippy-output.txt 2>/dev/null || echo "0")
    echo -e "Clippy: ${YELLOW}$CLIPPY_WARNINGS warnings${NC}, ${RED}$CLIPPY_ERRORS errors${NC}"

    cd "$PROJECT_ROOT"
else
    echo -e "${YELLOW}Cargo not found, skipping Clippy report${NC}"
fi

# Run SonarQube scanner
echo ""
echo -e "${GREEN}[7/7] Running SonarQube scanner...${NC}"

run_scanner() {
    if command -v sonar-scanner &> /dev/null; then
        sonar-scanner \
            -Dsonar.host.url=http://localhost:9000 \
            ${SONAR_TOKEN:+-Dsonar.token=$SONAR_TOKEN}
    else
        echo -e "${YELLOW}sonar-scanner not found. Using Docker...${NC}"
        docker run --rm \
            -v "$(pwd):/usr/src" \
            -w /usr/src \
            --network health-network \
            sonarsource/sonar-scanner-cli \
            -Dsonar.host.url=http://health-sonarqube:9000 \
            ${SONAR_TOKEN:+-Dsonar.token=$SONAR_TOKEN}
    fi
}

# Retry logic - up to 2 attempts
MAX_RETRIES=2
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if run_scanner; then
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo ""
            echo -e "${YELLOW}Scanner failed, cleaning cache and retrying (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)...${NC}"
            rm -rf .scannerwork
            sleep 2
        else
            echo -e "${RED}Scanner failed after $MAX_RETRIES attempts.${NC}"
            echo ""
            echo "Troubleshooting:"
            echo "  1. Install sonar-scanner: brew install sonar-scanner"
            echo "  2. Check SonarQube is accessible: curl http://localhost:9000/api/system/status"
            echo "  3. Verify token is valid in SonarQube UI"
            exit 1
        fi
    fi
done

echo ""
echo -e "${GREEN}=== SonarQube Analysis Complete ===${NC}"
echo "View results at: http://localhost:9000/dashboard?id=health-v1"

# Update SonarQube project description with coverage summary
echo ""
echo -e "${GREEN}[8/8] Updating SonarQube project description...${NC}"

# Generate coverage summary data
cd "$PROJECT_ROOT"

# Frontend stats
FE_SRC_FILES=$(find cli/packages -name "*.ts" -o -name "*.tsx" 2>/dev/null | \
    grep -v node_modules | grep -v dist | grep -v coverage | \
    grep -v "\.test\." | grep -v "\.spec\." | grep -v "__tests__" | \
    grep -v "\.d\.ts" | grep -v "\.config\." | grep -v "routeTree.gen" | \
    grep "/src/" | wc -l | tr -d ' ')

FE_TEST_FILES=$(find cli/packages -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | \
    grep -v node_modules | grep -v dist | wc -l | tr -d ' ')

FE_E2E_FILES=$(find cli/packages -path "*/e2e/*" -name "*.ts" 2>/dev/null | \
    grep -v node_modules | wc -l | tr -d ' ')

# Backend stats
BE_SRC_FILES=$(find backend -name "*.rs" 2>/dev/null | \
    grep -v target | grep -v "/tests/" | grep -v "_test.rs" | \
    grep "/src/" | wc -l | tr -d ' ')

BE_TEST_FILES=$(find backend -name "*.rs" -path "*/tests/*" 2>/dev/null | \
    grep -v target | wc -l | tr -d ' ')

BE_INLINE_TESTS=$(grep -rl "#\[cfg(test)\]" backend --include="*.rs" 2>/dev/null | \
    grep -v target | wc -l | tr -d ' ')

TOTAL_SRC=$((FE_SRC_FILES + BE_SRC_FILES))
TOTAL_TESTS=$((FE_TEST_FILES + BE_TEST_FILES + BE_INLINE_TESTS))
TEST_RATIO=$(echo "scale=1; $TOTAL_TESTS * 100 / $TOTAL_SRC" | bc 2>/dev/null || echo "N/A")

# Build description markdown
DESCRIPTION="## Codebase Summary ($(date '+%Y-%m-%d %H:%M'))

### Frontend (TypeScript)
| Metric | Count |
|--------|-------|
| Source Files | **${FE_SRC_FILES}** |
| Unit Tests | **${FE_TEST_FILES}** |
| E2E Tests | **${FE_E2E_FILES}** |

### Backend (Rust)
| Metric | Count |
|--------|-------|
| Source Files | **${BE_SRC_FILES}** |
| Test Files | **${BE_TEST_FILES}** |
| Inline Tests | **${BE_INLINE_TESTS}** |

### Totals
- **Total Source Files:** ${TOTAL_SRC}
- **Total Test Files:** ${TOTAL_TESTS}
- **Test-to-Source Ratio:** ${TEST_RATIO}%

---
*Updated by sonar-scan.sh*"

# URL-encode the description for API call
ENCODED_DESC=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$DESCRIPTION'''))" 2>/dev/null || echo "")

if [ -n "$ENCODED_DESC" ] && [ -n "$SONAR_TOKEN" ]; then
    # Update project description via SonarQube API
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "http://localhost:9000/api/projects/update_key" \
        -H "Authorization: Bearer $SONAR_TOKEN" 2>/dev/null || echo "000")

    # Use settings API to update description
    curl -s -X POST "http://localhost:9000/api/project_tags/set?project=health-v1&tags=typescript,rust,healthcare" \
        -H "Authorization: Bearer $SONAR_TOKEN" > /dev/null 2>&1 || true

    # Update project via web API
    curl -s -X POST "http://localhost:9000/api/projects/update_visibility?project=health-v1&visibility=public" \
        -H "Authorization: Bearer $SONAR_TOKEN" > /dev/null 2>&1 || true

    echo -e "${GREEN}Project tags updated${NC}"
    echo ""
    echo -e "${YELLOW}Coverage Summary:${NC}"
    echo "  Frontend: $FE_SRC_FILES source files, $FE_TEST_FILES unit tests, $FE_E2E_FILES E2E tests"
    echo "  Backend:  $BE_SRC_FILES source files, $BE_TEST_FILES test files, $BE_INLINE_TESTS inline tests"
    echo "  Total:    $TOTAL_SRC source files, $TOTAL_TESTS tests ($TEST_RATIO% ratio)"
else
    echo -e "${YELLOW}Skipping project description update (missing token or python3)${NC}"
fi

# Also save summary to file for reference
echo "$DESCRIPTION" > "$PROJECT_ROOT/coverage-summary.md"
echo -e "${GREEN}Coverage summary saved to: coverage-summary.md${NC}"
