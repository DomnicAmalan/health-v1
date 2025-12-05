#!/bin/bash
# Script to create SonarQube database in PostgreSQL
# This can be run manually if the database wasn't created during init
# Usage: ./scripts/create-sonar-db.sh

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

POSTGRES_USER=${POSTGRES_USER:-auth_user}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-auth_password}
SONARQUBE_DB=${SONARQUBE_DB:-sonar}

# Check if running in Docker or locally
if [ -n "${DOCKER_CONTAINER:-}" ] || docker ps | grep -q health-postgres; then
    POSTGRES_HOST=postgres
    POSTGRES_PORT=5432
    echo "Detected Docker environment, using postgres:5432"
else
    POSTGRES_HOST=${POSTGRES_HOST:-localhost}
    POSTGRES_PORT=${POSTGRES_PORT:-5432}
    echo "Using local PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}"
fi

echo "Creating SonarQube database '${SONARQUBE_DB}'..."

# Check if psql is available
if ! command -v psql >/dev/null 2>&1; then
    echo "Error: psql is not installed. Please install PostgreSQL client tools."
    echo "On macOS: brew install postgresql"
    echo "On Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

# Check if database already exists
if PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '${SONARQUBE_DB}'" | grep -q 1; then
    echo "Database '${SONARQUBE_DB}' already exists. Skipping creation."
else
    # Create database
    echo "Creating database..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres -c "CREATE DATABASE ${SONARQUBE_DB}"
    echo "Database '${SONARQUBE_DB}' created successfully!"
fi

# Grant privileges
echo "Granting privileges..."
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${SONARQUBE_DB} TO ${POSTGRES_USER}"

echo "Done! SonarQube database is ready."

