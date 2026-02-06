#!/bin/bash
# Clean database - Remove all sample/seed data but keep schema
# Usage: ./scripts/clean-db.sh

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}╔═══════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   Database Clean Script               ║${NC}"
echo -e "${YELLOW}║   Removes sample data, keeps schema   ║${NC}"
echo -e "${YELLOW}╚═══════════════════════════════════════╝${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    if [ -f .env ]; then
        echo -e "${YELLOW}Loading DATABASE_URL from .env file...${NC}"
        export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
    else
        echo -e "${RED}Error: DATABASE_URL not set and .env file not found${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ DATABASE_URL found${NC}"
echo ""

# Confirm action
echo -e "${YELLOW}This will delete all data from:${NC}"
echo "  • Lab orders and results"
echo "  • Imaging orders and reports"
echo "  • Appointments"
echo "  • Sample patients"
echo "  • Problem lists"
echo ""
echo -e "${GREEN}Schema (tables/columns) will be preserved${NC}"
echo ""
read -p "Continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Clean cancelled${NC}"
    exit 0
fi

# Clean tables in reverse dependency order
echo -e "${YELLOW}Cleaning data...${NC}"
psql "$DATABASE_URL" <<SQL
-- Start transaction
BEGIN;

-- Delete in order of dependencies (child tables first)
DELETE FROM lab_order_items;
DELETE FROM lab_orders;
DELETE FROM lab_panel_tests;
DELETE FROM lab_reference_ranges;
DELETE FROM lab_panels;
DELETE FROM lab_tests;

DELETE FROM imaging_report_addenda;
DELETE FROM imaging_order_history;
DELETE FROM imaging_orders;

DELETE FROM problem_comments;
DELETE FROM problem_history;
DELETE FROM problem_list;

DELETE FROM vital_signs;
DELETE FROM clinical_notes;
DELETE FROM encounters;
DELETE FROM appointments;

DELETE FROM ehr_patients WHERE mrn LIKE 'MRN%';

-- Reset sequences
ALTER SEQUENCE IF EXISTS imaging_accession_seq RESTART WITH 1;

-- Commit transaction
COMMIT;
SQL

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Data cleaned successfully${NC}"
else
    echo -e "${RED}✗ Clean failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Database cleaned!                   ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""
echo "All sample data removed. Schema intact."
echo ""
echo "To re-populate with sample data, run:"
echo "  ./scripts/seed-db.sh"
echo ""
