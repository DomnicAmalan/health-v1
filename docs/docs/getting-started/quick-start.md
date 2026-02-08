---
sidebar_position: 2
title: Quick Start
description: Get Health V1 running in 5 minutes
---

# Quick Start

This guide walks you through setting up Health V1 for local development. By the end, you will have the backend services running in Docker and a frontend application serving on your machine.

## Prerequisites

Before you begin, make sure the following tools are installed:

| Tool | Version | Purpose | Install |
|------|---------|---------|---------|
| **Rust toolchain** | Latest stable | Backend services compilation | [rustup.rs](https://rustup.rs/) |
| **Bun** | 1.0+ | Frontend package manager and script runner | [bun.sh](https://bun.sh/) |
| **Docker Desktop** | Latest | Containerized backend services and PostgreSQL | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Make** | Any | Universal command interface | Pre-installed on macOS/Linux |
| **PostgreSQL client** *(optional)* | Any | Direct database access for debugging | `brew install libpq` or `brew install postgresql` |

Verify your installations:

```bash
rustc --version
bun --version
docker --version
make --version
```

## Step 1: Clone the Repository

```bash
git clone <repository-url> health-v1
cd health-v1
```

## Step 2: Copy Environment Files

Health V1 uses a hierarchical environment configuration. You need to create four `.env` files from the provided templates:

```bash
# Root environment file (single source of truth for backend config)
cp .env.example .env

# Frontend app environment files (Vite-specific overrides)
cp cli/packages/apps/admin/.env.example cli/packages/apps/admin/.env
cp cli/packages/apps/client-app/.env.example cli/packages/apps/client-app/.env
cp cli/packages/apps/rustyvault-ui/.env.example cli/packages/apps/rustyvault-ui/.env
```

The root `.env` file contains database credentials, service ports, JWT secrets, CORS configuration, and other shared settings. The app-specific `.env` files contain only Vite build-time variables like `VITE_API_BASE_URL` and `VITE_PORT`.

:::tip
For a detailed explanation of every environment variable, see the [Environment Configuration](./environment.md) guide.
:::

## Step 3: Validate Configuration

Run the validation script to check that all required variables are present and correctly configured:

```bash
./scripts/validate-env.sh
```

This script checks for missing variables, port conflicts, and common misconfigurations such as incorrect API URLs or missing CORS origins.

## Step 4: Start Backend Services

Start the Docker development environment, which includes PostgreSQL, the API service, and the RustyVault service:

```bash
make docker-dev
```

Wait for all containers to reach a healthy state. You can monitor startup progress with:

```bash
make docker-dev-logs
```

## Step 5: Run Database Migrations

With the backend services running, apply all database migrations to set up the schema:

```bash
make db-migrate
```

This runs all SQL migration files from `backend/migrations/` against the development database. The migrations create tables for patients, encounters, clinical notes, billing, workflows, and all other domain entities.

A default admin user is created during migration:

```
Email:    admin@example.com
Password: admin123
```

:::warning
The default credentials are for development only. Change them immediately in any production or staging environment.
:::

## Step 6: Start a Frontend Application

Choose which frontend application to run. Each application connects to the appropriate backend service:

```bash
# Admin Dashboard (port 5174) -- user management, roles, system config
make dev-admin

# Client Application (port 5175) -- EHR, billing, pharmacy, clinical workflows
make dev-client

# RustyVault UI (port 8215) -- secrets management, policies, auth config
make dev-vault

# All applications in parallel
make dev-all

# Interactive selector
make dev
```

Each `make dev-*` command first builds the shared libraries, then starts the selected application with hot-reload enabled. Changes to source files are reflected immediately in the browser.

## Step 7: Log In

Open your browser and navigate to the appropriate URL:

| Application | URL |
|-------------|-----|
| Admin Dashboard | [http://localhost:5174](http://localhost:5174) |
| Client App | [http://localhost:5175](http://localhost:5175) |
| RustyVault UI | [http://localhost:8215](http://localhost:8215) |

Log in with the default development credentials:

- **Email:** `admin@example.com`
- **Password:** `admin123`

## Quick Reference: Make Targets

All commands run from the project root. No need to change directories.

### Development

| Command | Description |
|---------|-------------|
| `make dev` | Interactive app selector |
| `make dev-vault` | RustyVault UI + shared libs (port 8215) |
| `make dev-admin` | Admin dashboard + shared libs (port 5174) |
| `make dev-client` | Client app + shared libs (port 5175) |
| `make dev-all` | All frontend apps in parallel |

### Testing

| Command | Description |
|---------|-------------|
| `make test` | Unit tests + backend tests |
| `make test-all` | Full test suite including E2E |
| `make test-unit` | Frontend unit tests (Vitest) |
| `make test-backend` | Rust backend tests (cargo test) |
| `make test-e2e` | Playwright E2E tests |
| `make test-e2e-ui` | E2E tests with Playwright interactive UI |

### Building

| Command | Description |
|---------|-------------|
| `make build` | Build all (shared libs + apps) |
| `make build-backend` | Rust backend only (release mode) |
| `make build-frontend` | All frontend apps |
| `make build-release` | Production release build |

### Docker

| Command | Description |
|---------|-------------|
| `make docker-dev` | Start development environment |
| `make docker-dev-down` | Stop development environment |
| `make docker-dev-logs` | View development logs (follow mode) |

### Database

| Command | Description |
|---------|-------------|
| `make db-migrate` | Run all pending migrations |
| `make db-migrate-test` | Run migrations on test database |
| `make db-reset` | Drop, recreate, and migrate database |
| `make db-seed` | Seed database with sample data |

### Quality

| Command | Description |
|---------|-------------|
| `make lint` | Run all linters (Biome + Clippy) |
| `make lint-fix` | Auto-fix all linting issues |
| `make check` | Lint + typecheck + unit tests |
| `make check-strict` | All strict checks, output to `strict-errors.txt` |

### Cleanup

| Command | Description |
|---------|-------------|
| `make clean` | Clean build artifacts |
| `make clean-all` | Clean everything including Docker volumes |

## Verifying Your Setup

After completing all steps, verify that everything is working:

1. **Backend health check:** Open [http://localhost:8080/health](http://localhost:8080/health) in your browser. You should see a JSON response indicating the service is healthy.

2. **Database connectivity:** Run `make test-backend` to execute the Rust test suite, which verifies database connectivity and query correctness.

3. **Frontend build:** Run `make build` to confirm that all shared libraries and applications compile without errors.

4. **Full test suite:** Run `make test` to execute both frontend unit tests and backend tests.

## Troubleshooting

### Docker containers fail to start

Make sure Docker Desktop is running and that no other processes are using ports 8080, 4117, or 5432:

```bash
lsof -i :8080
lsof -i :4117
lsof -i :5432
```

### SQLx compile errors about missing tables

The database must be running and migrations must be applied before compiling Rust code. SQLx macros verify queries against the live database at compile time:

```bash
make docker-dev
make db-migrate
make build-backend
```

### CORS errors in the browser

Ensure the `CORS_ALLOWED_ORIGINS` variable in the root `.env` includes all frontend URLs:

```bash
CORS_ALLOWED_ORIGINS=http://localhost:5174,http://localhost:5175,http://localhost:8215
```

### Frontend shows "Network Error" or 404

Verify that `VITE_API_BASE_URL` is correct in each app's `.env` file:

- Admin and Client apps should point to `http://localhost:8080` (API service).
- RustyVault UI should point to `http://localhost:4117/v1` (Vault service, note the `/v1` prefix).

## Next Steps

- [Environment Configuration](./environment.md) -- Deep dive into all environment variables and the configuration hierarchy.
- [Command Reference](./commands.md) -- Complete reference for every `make` target available in the project.
