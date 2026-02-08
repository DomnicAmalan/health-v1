---
sidebar_position: 3
title: Docker
description: Docker Compose configurations for development, testing, and production
---

# Docker

Health V1 uses Docker Compose for orchestrating services across development, testing, and production environments. Three separate compose files define each environment, and all are controlled through Make commands from the project root.

## Compose Files Overview

| File | Environment | Purpose |
|------|-------------|---------|
| `docker-compose.dev.yml` | Development | Vite dev servers with hot reload |
| `docker-compose.yml` | Production | Caddy reverse proxy, production builds |
| `docker-compose.test.yml` | Testing | Isolated test database and services |

## Quick Reference

| Command | Description |
|---------|-------------|
| `make docker-dev` | Start dev environment |
| `make docker-dev-build` | Build and start dev environment |
| `make docker-dev-down` | Stop dev environment |
| `make docker-dev-logs` | View dev container logs |
| `make docker-prod` | Start production environment |
| `make docker-prod-down` | Stop production environment |
| `make docker-clean` | Remove all containers, volumes, and images |

## Development Environment

The development compose file (`docker-compose.dev.yml`) runs backend services in containers while frontend apps use Vite dev servers with hot module replacement.

### Services

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Database with persistent volume |
| API Service | 8080 | Main REST API (used by admin and client-app) |
| RustyVault | 4117 | Secrets management service |
| Admin UI | 5174 | Admin dashboard (Vite dev server) |
| Client App | 5175 | Client application (Vite dev server) |
| RustyVault UI | 8215 | Vault management UI (Vite dev server) |

### Starting Development

```bash
# Start all dev services
make docker-dev

# Build images and start (after Dockerfile changes)
make docker-dev-build

# View logs
make docker-dev-logs

# View logs for a specific service
docker compose -f docker-compose.dev.yml logs -f api-service

# Stop all services
make docker-dev-down
```

### Hot Reload

Frontend apps run with Vite dev servers on their native ports. Source code is mounted as volumes, so changes are reflected immediately through HMR:

- Admin UI: `http://localhost:5174`
- Client App: `http://localhost:5175`
- RustyVault UI: `http://localhost:8215`

## Production Environment

The production compose file (`docker-compose.yml`) uses Caddy as a reverse proxy on port 80, serving production-built frontend apps and routing API requests to backend services.

### Starting Production

```bash
# Start production services
make docker-prod

# Stop production services
make docker-prod-down
```

Production builds are optimized and minified. Caddy handles TLS termination, compression, and static file serving.

### Production Architecture

```
Port 80 (Caddy)
  /admin/*     -> Admin UI (static build)
  /app/*       -> Client App (static build)
  /vault/*     -> RustyVault UI (static build)
  /api/*       -> API Service (8080)
  /vault-api/* -> RustyVault Service (4117)
```

## Test Environment

The test compose file (`docker-compose.test.yml`) provides an isolated environment for running automated tests.

```bash
# Start test infrastructure
make test-up

# Apply migrations to the test database
make db-migrate-test

# Run tests
make test-all

# Tear down
make test-down
```

The test database is separate from development, ensuring tests do not affect development data.

## Environment Variables

**All required environment variables MUST be defined in the root `.env` file.** Docker Compose files do not specify default values. If a required variable is missing, Docker will fail with a clear error message.

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/health_v1
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=health_v1

# Service Ports
API_SERVICE_PORT=8080
VAULT_SERVICE_PORT=4117

# Frontend Ports
ADMIN_UI_PORT=5174
CLIENT_APP_PORT=5175
VAULT_UI_PORT=8215

# Security
JWT_SECRET=<your-secret>
MASTER_KEY=<32-bytes-hex>

# CORS (must include ALL frontend origins)
CORS_ALLOWED_ORIGINS=http://localhost:5174,http://localhost:5175,http://localhost:8215
```

### CORS Configuration

The `CORS_ALLOWED_ORIGINS` variable must include every frontend dev server origin. Missing an origin will cause browser CORS errors:

```bash
# All three frontend apps must be listed
CORS_ALLOWED_ORIGINS=http://localhost:5174,http://localhost:5175,http://localhost:8215
```

### API URL Configuration

This is a common source of confusion. Different frontend apps connect to different backend services:

```bash
# Admin and Client apps connect to the API Service (port 8080)
# In cli/packages/apps/admin/.env and cli/packages/apps/client-app/.env:
VITE_API_BASE_URL=http://localhost:8080

# Vault UI connects to the Vault Service (port 4117) - note the /v1 prefix
# In cli/packages/apps/rustyvault-ui/.env:
VITE_API_BASE_URL=http://localhost:4117/v1
```

## Resource Limits

For environments with limited RAM (512MB or less), the following resource limits are configured:

```bash
# In .env
DATABASE_MAX_CONNECTIONS=5
TOKIO_WORKER_THREADS=2
```

These settings reduce PostgreSQL's connection pool and Tokio's thread count to fit within memory constraints. Adjust upward for production servers with more available memory.

## Docker Images

### Backend Dockerfiles

Backend services use multi-stage Rust builds:

```
backend/Dockerfile          # API Service
```

The build stage compiles with `--release` and the runtime stage uses a minimal base image.

### Frontend Dockerfiles

Frontend apps build with Bun and serve with Caddy or Vite:

```
cli/packages/apps/admin/Dockerfile
cli/packages/apps/client-app/Dockerfile
cli/packages/apps/rustyvault-ui/Dockerfile
```

### Infrastructure

Additional infrastructure services are defined in `infra/docker-compose.yml` for supporting services like monitoring and logging.

## Cleanup

```bash
# Stop all services and remove containers
make docker-dev-down

# Remove everything: containers, volumes, networks, images
make docker-clean
```

**Warning**: `make docker-clean` removes all Docker volumes, including database data. This is a destructive operation.

## Troubleshooting

### Database connection refused

The API service starts before PostgreSQL is ready. Docker health checks handle this, but if you see connection errors on first startup, wait a few seconds and check logs:

```bash
make docker-dev-logs
```

### SQLx compile-time query errors

SQLx macros verify queries against the live database at compile time. Docker must be running with migrations applied before running `cargo check` or `cargo build`:

```bash
make docker-dev
make db-migrate
cargo check --workspace
```

### Port conflicts

If a port is already in use, check for other services or previous Docker containers:

```bash
# Check what's using a port
lsof -i :8080

# Force stop all Health V1 containers
make docker-dev-down
```
