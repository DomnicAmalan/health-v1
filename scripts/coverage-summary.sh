#!/bin/bash
# Coverage Summary Script
# Shows total source files vs test coverage for the entire codebase

set -o pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}                    CODEBASE COVERAGE SUMMARY                   ${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# ============================================================================
# FRONTEND (TypeScript/React)
# ============================================================================
echo -e "${BOLD}${CYAN}┌─────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BOLD}${CYAN}│                    FRONTEND (TypeScript)                    │${NC}"
echo -e "${BOLD}${CYAN}└─────────────────────────────────────────────────────────────┘${NC}"
echo ""

# Count source files
FRONTEND_SRC_FILES=$(find cli/packages -name "*.ts" -o -name "*.tsx" 2>/dev/null | \
    grep -v node_modules | grep -v dist | grep -v coverage | \
    grep -v "\.test\." | grep -v "\.spec\." | grep -v "__tests__" | \
    grep -v "\.d\.ts" | grep -v "\.config\." | grep -v "routeTree.gen" | \
    grep "/src/" | wc -l | tr -d ' ')

# Count test files
FRONTEND_TEST_FILES=$(find cli/packages -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" 2>/dev/null | \
    grep -v node_modules | grep -v dist | wc -l | tr -d ' ')

# Count E2E test files
FRONTEND_E2E_FILES=$(find cli/packages -path "*/e2e/*" -name "*.ts" 2>/dev/null | \
    grep -v node_modules | wc -l | tr -d ' ')

echo -e "${BOLD}Source Files:${NC}"
echo -e "  Total source files (.ts/.tsx):  ${BOLD}$FRONTEND_SRC_FILES${NC}"
echo ""
echo -e "${BOLD}Test Files:${NC}"
echo -e "  Unit/Integration tests:         ${BOLD}$FRONTEND_TEST_FILES${NC}"
echo -e "  E2E tests (Playwright):         ${BOLD}$FRONTEND_E2E_FILES${NC}"
echo ""

# Breakdown by package
echo -e "${BOLD}By Package:${NC}"
printf "  %-35s %8s %8s\n" "Package" "Source" "Tests"
printf "  %-35s %8s %8s\n" "───────────────────────────────────" "────────" "────────"

for pkg in cli/packages/apps/* cli/packages/libs/*; do
    if [ -d "$pkg/src" ]; then
        PKG_NAME=$(basename "$pkg")
        PKG_SRC=$(find "$pkg/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null | \
            grep -v "\.test\." | grep -v "\.spec\." | grep -v "__tests__" | \
            grep -v "\.d\.ts" | grep -v "\.config\." | grep -v "routeTree.gen" | wc -l | tr -d ' ')
        PKG_TESTS=$(find "$pkg" -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l | tr -d ' ')

        if [ "$PKG_TESTS" -eq 0 ]; then
            TEST_COLOR="${RED}"
        elif [ "$PKG_TESTS" -lt 5 ]; then
            TEST_COLOR="${YELLOW}"
        else
            TEST_COLOR="${GREEN}"
        fi

        printf "  %-35s %8s ${TEST_COLOR}%8s${NC}\n" "$PKG_NAME" "$PKG_SRC" "$PKG_TESTS"
    fi
done

echo ""

# ============================================================================
# BACKEND (Rust)
# ============================================================================
echo -e "${BOLD}${CYAN}┌─────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BOLD}${CYAN}│                      BACKEND (Rust)                         │${NC}"
echo -e "${BOLD}${CYAN}└─────────────────────────────────────────────────────────────┘${NC}"
echo ""

# Count Rust source files
RUST_SRC_FILES=$(find backend -name "*.rs" 2>/dev/null | \
    grep -v target | grep -v "/tests/" | grep -v "_test.rs" | \
    grep "/src/" | wc -l | tr -d ' ')

# Count Rust test files
RUST_TEST_FILES=$(find backend -name "*.rs" -path "*/tests/*" 2>/dev/null | \
    grep -v target | wc -l | tr -d ' ')

# Count inline tests (files with #[cfg(test)])
RUST_INLINE_TESTS=$(grep -rl "#\[cfg(test)\]" backend --include="*.rs" 2>/dev/null | \
    grep -v target | wc -l | tr -d ' ')

echo -e "${BOLD}Source Files:${NC}"
echo -e "  Total source files (.rs):       ${BOLD}$RUST_SRC_FILES${NC}"
echo ""
echo -e "${BOLD}Test Files:${NC}"
echo -e "  Dedicated test files:           ${BOLD}$RUST_TEST_FILES${NC}"
echo -e "  Files with inline tests:        ${BOLD}$RUST_INLINE_TESTS${NC}"
echo ""

# Breakdown by crate
echo -e "${BOLD}By Crate:${NC}"
printf "  %-35s %8s %8s\n" "Crate" "Source" "Tests"
printf "  %-35s %8s %8s\n" "───────────────────────────────────" "────────" "────────"

for crate in backend/*/; do
    if [ -d "$crate/src" ]; then
        CRATE_NAME=$(basename "$crate")
        CRATE_SRC=$(find "$crate/src" -name "*.rs" 2>/dev/null | grep -v target | wc -l | tr -d ' ')
        CRATE_TESTS=$(find "$crate" -path "*/tests/*" -name "*.rs" 2>/dev/null | grep -v target | wc -l | tr -d ' ')
        CRATE_INLINE=$(grep -rl "#\[cfg(test)\]" "$crate/src" --include="*.rs" 2>/dev/null | wc -l | tr -d ' ')
        TOTAL_TESTS=$((CRATE_TESTS + CRATE_INLINE))

        if [ "$TOTAL_TESTS" -eq 0 ]; then
            TEST_COLOR="${RED}"
        elif [ "$TOTAL_TESTS" -lt 3 ]; then
            TEST_COLOR="${YELLOW}"
        else
            TEST_COLOR="${GREEN}"
        fi

        printf "  %-35s %8s ${TEST_COLOR}%8s${NC}\n" "$CRATE_NAME" "$CRATE_SRC" "$TOTAL_TESTS"
    fi
done

echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo -e "${BOLD}${CYAN}┌─────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BOLD}${CYAN}│                         TOTALS                              │${NC}"
echo -e "${BOLD}${CYAN}└─────────────────────────────────────────────────────────────┘${NC}"
echo ""

TOTAL_SRC=$((FRONTEND_SRC_FILES + RUST_SRC_FILES))
TOTAL_TESTS=$((FRONTEND_TEST_FILES + RUST_TEST_FILES + RUST_INLINE_TESTS))

echo -e "  ${BOLD}Total Source Files:${NC}     $TOTAL_SRC"
echo -e "  ${BOLD}Total Test Files:${NC}       $TOTAL_TESTS"
echo -e "  ${BOLD}Test-to-Source Ratio:${NC}   $(echo "scale=2; $TOTAL_TESTS * 100 / $TOTAL_SRC" | bc 2>/dev/null || echo "N/A")%"
echo ""

# Check for coverage reports
echo -e "${BOLD}Coverage Reports:${NC}"
COVERAGE_FOUND=0

for lcov in cli/packages/*/coverage/lcov.info backend/coverage/lcov.info; do
    if [ -f "$lcov" ]; then
        SIZE=$(ls -lh "$lcov" 2>/dev/null | awk '{print $5}')
        echo -e "  ${GREEN}✓${NC} $lcov ($SIZE)"
        COVERAGE_FOUND=1
    fi
done

if [ $COVERAGE_FOUND -eq 0 ]; then
    echo -e "  ${YELLOW}No coverage reports found. Run:${NC}"
    echo -e "    make test-coverage-all"
fi

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"
