#!/bin/bash
# Setup Script: 3D Anatomy with Real-Time Physics
# Installs all dependencies and verifies installation

set -e  # Exit on error

echo "=================================================="
echo "3D Anatomy Physics System - Setup Script"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"

if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: Bun is not installed${NC}"
    echo "Install from: https://bun.sh"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: PostgreSQL client (psql) is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites met${NC}"
echo ""

# Step 2: Install frontend dependencies
echo -e "${YELLOW}[2/6] Installing frontend dependencies...${NC}"
cd cli/packages/apps/client-app

echo "Installing Three.js dependencies..."
bun add three @react-three/fiber @react-three/drei @types/three

echo "Installing Physics engine..."
bun add @react-three/rapier

echo "Installing Form dependencies..."
bun add react-hook-form @hookform/resolvers zod

echo "Installing UI dependencies..."
bun add lucide-react

echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

# Step 3: Run database migrations
echo -e "${YELLOW}[3/6] Running database migrations...${NC}"
cd ../../../../  # Back to project root

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable not set${NC}"
    echo "Set it in your .env file"
    exit 1
fi

make db-migrate

echo -e "${GREEN}✓ Migrations completed${NC}"
echo ""

# Step 4: Seed body systems
echo -e "${YELLOW}[4/6] Seeding body systems and lab mappings...${NC}"

psql $DATABASE_URL -f backend/migrations/seeds/seed_body_systems.sql
psql $DATABASE_URL -f backend/migrations/seeds/seed_body_system_lab_mappings.sql

# Verify seed data
BODY_SYSTEMS_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM body_systems;")
LAB_MAPPINGS_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM body_system_lab_tests;")

echo "Body systems seeded: $BODY_SYSTEMS_COUNT"
echo "Lab mappings seeded: $LAB_MAPPINGS_COUNT"

echo -e "${GREEN}✓ Database seeded${NC}"
echo ""

# Step 5: Build backend
echo -e "${YELLOW}[5/6] Building Rust backend...${NC}"

make build-backend

echo -e "${GREEN}✓ Backend built${NC}"
echo ""

# Step 6: Verify installation
echo -e "${YELLOW}[6/6] Verifying installation...${NC}"

echo "Checking node modules..."
if [ -d "cli/packages/apps/client-app/node_modules/@react-three/rapier" ]; then
    echo -e "${GREEN}✓ Rapier physics installed${NC}"
else
    echo -e "${RED}✗ Rapier physics NOT installed${NC}"
    exit 1
fi

echo "Checking database tables..."
ENCOUNTERS_EXISTS=$(psql $DATABASE_URL -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'encounters');")
if [[ $ENCOUNTERS_EXISTS == *"t"* ]]; then
    echo -e "${GREEN}✓ Encounters table exists${NC}"
else
    echo -e "${RED}✗ Encounters table missing${NC}"
    exit 1
fi

ANATOMY_FINDINGS_EXISTS=$(psql $DATABASE_URL -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'anatomy_findings');")
if [[ $ANATOMY_FINDINGS_EXISTS == *"t"* ]]; then
    echo -e "${GREEN}✓ Anatomy findings table exists${NC}"
else
    echo -e "${RED}✗ Anatomy findings table missing${NC}"
    exit 1
fi

echo ""
echo "=================================================="
echo -e "${GREEN}Installation Complete! 🎉${NC}"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Start backend:  make docker-dev"
echo "2. Start frontend: make dev-client"
echo "3. Open browser:   http://localhost:5175"
echo ""
echo "Documentation:"
echo "- Implementation: ANATOMY_3D_IMPLEMENTATION.md"
echo "- Physics Guide:  PHYSICS_IMPLEMENTATION_GUIDE.md"
echo ""
echo "Features enabled:"
echo "✅ Real-time soft-body physics"
echo "✅ Breathing simulation (16 breaths/min)"
echo "✅ Heartbeat animation (60-180 BPM)"
echo "✅ Patient-specific morphing (BMI-based)"
echo "✅ Interactive palpation (click organs)"
echo "✅ Gravity simulation (4 positions)"
echo ""
echo "Happy coding! 🚀"
