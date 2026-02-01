#!/bin/bash
# Environment Configuration Validation Script
# Validates that all required environment variables are set correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "Environment Configuration Validation"
echo "============================================"
echo ""

# Load .env file
if [ ! -f ".env" ]; then
  echo -e "${RED}❌ ERROR: Root .env file not found!${NC}"
  echo "   Please copy .env.example to .env and configure it."
  exit 1
fi

# Export variables from .env
set -a
source .env
set +a

echo "✅ Root .env file found"
echo ""

# Track overall status
missing=0
warnings=0

# ============================================
# Required Variables
# ============================================

echo "Checking required variables..."
echo "--------------------------------------------"

REQUIRED_VARS=(
  # Service Ports
  "API_SERVICE_PORT"
  "SERVER_PORT"
  "VAULT_SERVICE_PORT"
  "VAULT_SERVER_PORT"
  "POSTGRES_PORT"
  "ADMIN_UI_PORT"
  "CLIENT_APP_PORT"
  "VAULT_UI_PORT"

  # Database
  "POSTGRES_USER"
  "POSTGRES_PASSWORD"
  "POSTGRES_DB"

  # Security
  "JWT_SECRET"
  "MASTER_KEY"
  "OIDC_ISSUER"
  "OIDC_CLIENT_ID"
  "OIDC_CLIENT_SECRET"

  # KMS/Vault
  "KMS_PROVIDER"
  "VAULT_TOKEN"
  "VAULT_MOUNT_PATH"

  # Storage
  "STORAGE_PROVIDER"

  # Session
  "SESSION_ADMIN_UI_TTL_HOURS"
  "SESSION_CLIENT_UI_TTL_HOURS"
  "SESSION_API_TTL_HOURS"

  # CORS
  "CORS_ALLOWED_ORIGINS"
  "CORS_ADMIN_UI_ORIGINS"
  "CORS_CLIENT_UI_ORIGINS"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}❌ Missing required variable: $var${NC}"
    missing=1
  else
    echo -e "${GREEN}✅ $var${NC} = ${!var}"
  fi
done

echo ""

# ============================================
# CORS Validation
# ============================================

echo "Checking CORS configuration..."
echo "--------------------------------------------"

# Check if CORS includes all frontend origins
REQUIRED_ORIGINS=(
  "http://localhost:5174"    # Admin UI
  "http://localhost:5175"    # Client App
  "http://localhost:8215"    # Vault UI
)

for origin in "${REQUIRED_ORIGINS[@]}"; do
  if [[ "$CORS_ALLOWED_ORIGINS" == *"$origin"* ]]; then
    echo -e "${GREEN}✅ CORS includes $origin${NC}"
  else
    echo -e "${YELLOW}⚠️  WARNING: CORS_ALLOWED_ORIGINS missing $origin${NC}"
    warnings=1
  fi
done

echo ""

# ============================================
# Port Consistency
# ============================================

echo "Checking port consistency..."
echo "--------------------------------------------"

# Check that API_SERVICE_PORT and SERVER_PORT match (they should)
if [ "$API_SERVICE_PORT" == "$SERVER_PORT" ]; then
  echo -e "${GREEN}✅ API_SERVICE_PORT matches SERVER_PORT${NC}"
else
  echo -e "${YELLOW}⚠️  WARNING: API_SERVICE_PORT ($API_SERVICE_PORT) != SERVER_PORT ($SERVER_PORT)${NC}"
  warnings=1
fi

# Check that VAULT_SERVICE_PORT and VAULT_SERVER_PORT match
if [ "$VAULT_SERVICE_PORT" == "$VAULT_SERVER_PORT" ]; then
  echo -e "${GREEN}✅ VAULT_SERVICE_PORT matches VAULT_SERVER_PORT${NC}"
else
  echo -e "${YELLOW}⚠️  WARNING: VAULT_SERVICE_PORT ($VAULT_SERVICE_PORT) != VAULT_SERVER_PORT ($VAULT_SERVER_PORT)${NC}"
  warnings=1
fi

# Check Vault UI port is 8215 (common mistake: 5176)
if [ "$VAULT_UI_PORT" == "8215" ]; then
  echo -e "${GREEN}✅ VAULT_UI_PORT is 8215 (correct)${NC}"
else
  echo -e "${YELLOW}⚠️  WARNING: VAULT_UI_PORT is $VAULT_UI_PORT (should be 8215)${NC}"
  warnings=1
fi

echo ""

# ============================================
# Security Validation
# ============================================

echo "Checking security configuration..."
echo "--------------------------------------------"

# Check JWT_SECRET is not default
if [ "$JWT_SECRET" == "your-super-secret-jwt-key-change-in-production-min-32-chars" ]; then
  echo -e "${YELLOW}⚠️  WARNING: JWT_SECRET is using default value (OK for dev, CHANGE IN PRODUCTION!)${NC}"
  warnings=1
else
  echo -e "${GREEN}✅ JWT_SECRET is not default${NC}"
fi

# Check JWT_SECRET length (should be at least 32 chars)
if [ ${#JWT_SECRET} -lt 32 ]; then
  echo -e "${RED}❌ ERROR: JWT_SECRET too short (${#JWT_SECRET} chars, need 32+)${NC}"
  missing=1
else
  echo -e "${GREEN}✅ JWT_SECRET length OK (${#JWT_SECRET} chars)${NC}"
fi

# Check MASTER_KEY is not default
if [ "$MASTER_KEY" == "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" ]; then
  echo -e "${YELLOW}⚠️  WARNING: MASTER_KEY is using default value (OK for dev, CHANGE IN PRODUCTION!)${NC}"
  warnings=1
else
  echo -e "${GREEN}✅ MASTER_KEY is not default${NC}"
fi

# Check MASTER_KEY length (should be 64 hex chars = 32 bytes)
if [ ${#MASTER_KEY} -ne 64 ]; then
  echo -e "${RED}❌ ERROR: MASTER_KEY wrong length (${#MASTER_KEY} chars, need 64 hex chars)${NC}"
  missing=1
else
  echo -e "${GREEN}✅ MASTER_KEY length OK (64 hex chars = 32 bytes)${NC}"
fi

echo ""

# ============================================
# App .env Files
# ============================================

echo "Checking app .env files..."
echo "--------------------------------------------"

APP_ENV_FILES=(
  "cli/packages/apps/admin/.env"
  "cli/packages/apps/client-app/.env"
  "cli/packages/apps/rustyvault-ui/.env"
)

for env_file in "${APP_ENV_FILES[@]}"; do
  if [ -f "$env_file" ]; then
    echo -e "${GREEN}✅ $env_file exists${NC}"

    # Load app .env and check VITE_API_BASE_URL
    set -a
    source "$env_file"
    set +a

    # Check API URL based on app
    if [[ "$env_file" == *"admin"* ]] || [[ "$env_file" == *"client-app"* ]]; then
      # Admin & Client should use API Service (port 8080)
      if [ "$VITE_API_BASE_URL" == "http://localhost:8080" ]; then
        echo -e "   ${GREEN}✅ VITE_API_BASE_URL points to API Service (8080)${NC}"
      else
        echo -e "   ${RED}❌ VITE_API_BASE_URL is $VITE_API_BASE_URL (should be http://localhost:8080)${NC}"
        missing=1
      fi
    elif [[ "$env_file" == *"rustyvault-ui"* ]]; then
      # Vault UI should use Vault Service (port 4117)
      if [ "$VITE_API_BASE_URL" == "http://localhost:4117/v1" ]; then
        echo -e "   ${GREEN}✅ VITE_API_BASE_URL points to Vault Service (4117/v1)${NC}"
      else
        echo -e "   ${RED}❌ VITE_API_BASE_URL is $VITE_API_BASE_URL (should be http://localhost:4117/v1)${NC}"
        missing=1
      fi
    fi

    # Check VITE_PORT matches expected port
    if [[ "$env_file" == *"admin"* ]] && [ "$VITE_PORT" != "5174" ]; then
      echo -e "   ${YELLOW}⚠️  WARNING: VITE_PORT is $VITE_PORT (expected 5174)${NC}"
      warnings=1
    elif [[ "$env_file" == *"client-app"* ]] && [ "$VITE_PORT" != "5175" ]; then
      echo -e "   ${YELLOW}⚠️  WARNING: VITE_PORT is $VITE_PORT (expected 5175)${NC}"
      warnings=1
    elif [[ "$env_file" == *"rustyvault-ui"* ]] && [ "$VITE_PORT" != "8215" ]; then
      echo -e "   ${YELLOW}⚠️  WARNING: VITE_PORT is $VITE_PORT (expected 8215)${NC}"
      warnings=1
    fi

  else
    echo -e "${RED}❌ Missing $env_file${NC}"
    missing=1
  fi
done

echo ""

# ============================================
# Final Summary
# ============================================

echo "============================================"
echo "Validation Summary"
echo "============================================"

if [ $missing -eq 1 ]; then
  echo -e "${RED}❌ VALIDATION FAILED${NC}"
  echo "   Please fix the errors above before starting services."
  echo ""
  echo "   See ENV.md for configuration guide."
  exit 1
elif [ $warnings -gt 0 ]; then
  echo -e "${YELLOW}⚠️  VALIDATION PASSED WITH WARNINGS${NC}"
  echo "   Some non-critical issues were found (see above)."
  echo "   Services should start, but review warnings."
  echo ""
  exit 0
else
  echo -e "${GREEN}✅ VALIDATION PASSED${NC}"
  echo "   All required variables are set correctly!"
  echo "   You're ready to start development."
  echo ""
  exit 0
fi
