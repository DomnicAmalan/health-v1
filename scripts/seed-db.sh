#!/bin/bash
# Seed database with test data
# Usage: ./scripts/seed-db.sh

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Database Seeding Script             ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    if [ -f .env ]; then
        echo -e "${YELLOW}Loading DATABASE_URL from .env file...${NC}"
        export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
    else
        echo -e "${RED}Error: DATABASE_URL not set and .env file not found${NC}"
        echo "Please set DATABASE_URL environment variable or create .env file"
        exit 1
    fi
fi

echo -e "${GREEN}✓ DATABASE_URL found${NC}"
echo ""

# Get seed files directory
SEED_DIR="backend/migrations/seeds"

if [ ! -d "$SEED_DIR" ]; then
    echo -e "${RED}Error: Seed directory not found at $SEED_DIR${NC}"
    exit 1
fi

# Count seed files
SEED_COUNT=$(ls -1 "$SEED_DIR"/*.sql 2>/dev/null | wc -l)

if [ $SEED_COUNT -eq 0 ]; then
    echo -e "${RED}Error: No seed files found in $SEED_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}Found $SEED_COUNT seed files${NC}"
echo ""

# Run each seed file
for seed_file in "$SEED_DIR"/*.sql; do
    filename=$(basename "$seed_file")
    echo -e "${YELLOW}Running: $filename${NC}"

    if psql "$DATABASE_URL" -f "$seed_file" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $filename completed${NC}"
    else
        echo -e "${RED}✗ $filename failed${NC}"
        exit 1
    fi
    echo ""
done

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Database seeding completed!         ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""
echo "Sample data created:"
echo "  • Lab tests and panels with reference ranges"
echo "  • 5 sample patients"
echo "  • 5 sample appointments"
echo "  • 5 sample lab orders with items"
echo "  • 5 sample imaging orders"
echo ""
echo -e "${GREEN}Ready for testing!${NC}"
