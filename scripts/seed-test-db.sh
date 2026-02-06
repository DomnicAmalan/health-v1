#!/usr/bin/env bash
# Seed Test Database
# Loads test fixtures into the test database for E2E and integration testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database configuration
TEST_DB_URL="${TEST_DATABASE_URL:-postgresql://test_user:test_password@localhost:5433/vault_test_db}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SEEDS_DIR="$PROJECT_ROOT/backend/migrations/seeds"

echo -e "${YELLOW}🌱 Seeding test database...${NC}"
echo "Database: $TEST_DB_URL"
echo

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ Error: psql command not found${NC}"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

# Check if database is accessible
if ! psql "$TEST_DB_URL" -c '\q' 2>/dev/null; then
    echo -e "${RED}❌ Error: Cannot connect to test database${NC}"
    echo "Make sure the test database is running:"
    echo "  docker-compose -f docker-compose.test.yml up -d"
    exit 1
fi

# Function to run SQL file
run_sql_file() {
    local file=$1
    local description=$2

    if [ -f "$file" ]; then
        echo -e "  📄 Loading $description..."
        if psql "$TEST_DB_URL" -f "$file" > /dev/null 2>&1; then
            echo -e "${GREEN}    ✓ Success${NC}"
        else
            echo -e "${RED}    ✗ Failed${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}    ⊗ File not found: $file${NC}"
    fi
}

# Load seed files in order
echo "Loading test data..."

# 1. Test users and organizations
run_sql_file "$SEEDS_DIR/test_users.sql" "Test users and organizations"

# 2. Test patients (when EHR tables exist)
if [ -f "$SEEDS_DIR/test_patients.sql" ]; then
    run_sql_file "$SEEDS_DIR/test_patients.sql" "Test patients"
fi

# 3. Test appointments (when EHR tables exist)
if [ -f "$SEEDS_DIR/test_appointments.sql" ]; then
    run_sql_file "$SEEDS_DIR/test_appointments.sql" "Test appointments"
fi

# 4. Test organizations (additional data)
if [ -f "$SEEDS_DIR/test_organizations.sql" ]; then
    run_sql_file "$SEEDS_DIR/test_organizations.sql" "Additional organization data"
fi

# Verify data was loaded
echo
echo -e "${YELLOW}Verifying seed data...${NC}"

USER_COUNT=$(psql "$TEST_DB_URL" -t -c "SELECT COUNT(*) FROM users WHERE email LIKE '%@test.com';" 2>/dev/null | xargs)
ORG_COUNT=$(psql "$TEST_DB_URL" -t -c "SELECT COUNT(*) FROM organizations WHERE code = 'TMC';" 2>/dev/null | xargs)

echo "  Users loaded: $USER_COUNT"
echo "  Organizations loaded: $ORG_COUNT"

if [ "$USER_COUNT" -gt 0 ] && [ "$ORG_COUNT" -gt 0 ]; then
    echo
    echo -e "${GREEN}✅ Test database seeded successfully!${NC}"
    echo
    echo "Test credentials:"
    echo "  Admin:        admin@test.com / testpassword123"
    echo "  Doctor:       doctor@test.com / testpassword123"
    echo "  Nurse:        nurse@test.com / testpassword123"
    echo "  Receptionist: receptionist@test.com / testpassword123"
    echo "  Patient:      patient@test.com / testpassword123"
    exit 0
else
    echo
    echo -e "${RED}❌ Warning: Seed data may be incomplete${NC}"
    exit 1
fi
