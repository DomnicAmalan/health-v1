#!/bin/bash
# Reset database - Drop all data and re-run migrations
# Usage: ./scripts/reset-db.sh [--seed]

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}╔═══════════════════════════════════════╗${NC}"
echo -e "${RED}║   Database Reset Script               ║${NC}"
echo -e "${RED}║   ⚠️  THIS WILL DELETE ALL DATA ⚠️    ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════╝${NC}"
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
echo -e "${YELLOW}This will:${NC}"
echo "  1. Drop ALL tables and data"
echo "  2. Re-run all migrations"
if [ "$1" == "--seed" ]; then
    echo "  3. Seed with sample data"
fi
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Reset cancelled${NC}"
    exit 0
fi

# Drop all tables
echo -e "${YELLOW}Dropping all tables...${NC}"
psql "$DATABASE_URL" <<SQL
DO \$\$
DECLARE
    r RECORD;
BEGIN
    -- Drop all tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;

    -- Drop all sequences
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;

    -- Drop all functions
    FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.routine_name) || ' CASCADE';
    END LOOP;
END \$\$;
SQL

echo -e "${GREEN}✓ All tables dropped${NC}"
echo ""

# Run migrations
echo -e "${YELLOW}Running migrations...${NC}"
cd backend
if sqlx migrate run; then
    echo -e "${GREEN}✓ Migrations completed${NC}"
else
    echo -e "${RED}✗ Migrations failed${NC}"
    exit 1
fi
cd ..
echo ""

# Seed if requested
if [ "$1" == "--seed" ]; then
    echo -e "${YELLOW}Seeding database...${NC}"
    ./scripts/seed-db.sh
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Database reset completed!           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""
