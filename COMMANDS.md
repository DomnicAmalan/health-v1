# Health V1 Command Reference

This document provides a comprehensive reference for all commands in the Health V1 monorepo.

## Table of Contents

- [Overview](#overview)
- [Command Naming Convention](#command-naming-convention)
- [Development Commands](#development-commands)
- [Testing Commands](#testing-commands)
- [Build Commands](#build-commands)
- [Docker Commands](#docker-commands)
- [Database Commands](#database-commands)
- [Linting & Quality Commands](#linting--quality-commands)
- [Check Commands](#check-commands)
- [Cleanup Commands](#cleanup-commands)
- [Migration Guide](#migration-guide)

## Overview

**Make is the universal interface** for all commands in this monorepo. All commands work from the project root - no need to change directories.

**Standard Usage:**
```bash
make <command>
```

**Architecture:**
- **Make** = Primary interface (orchestrates everything)
- **Bun** = Internal package manager (handles UI builds)
- **Cargo** = Rust build system (called by Make)

## Command Naming Convention

Commands follow the pattern: `<family>:<scope>:<modifier>`

### Command Families

| Family | Purpose | Examples |
|--------|---------|----------|
| `dev` | Development servers | `dev`, `dev:vault`, `dev:admin` |
| `test` | Testing operations | `test`, `test:unit`, `test:e2e` |
| `build` | Build operations | `build`, `build:backend`, `build:frontend` |
| `docker` | Docker operations | `docker:dev`, `docker:down`, `docker:logs` |
| `db` | Database operations | `db:migrate`, `db:reset`, `db:seed` |
| `lint` | Linting & formatting | `lint`, `lint:fix`, `lint:backend` |
| `check` | Quality checks | `check`, `check:strict`, `check:types` |
| `clean` | Cleanup operations | `clean`, `clean:all`, `clean:docker` |

### Common Modifiers

| Modifier | Meaning | Examples |
|----------|---------|----------|
| `:fix` | Auto-fix issues | `lint:fix` |
| `:watch` | Watch mode | `test:watch` |
| `:ui` | Interactive UI | `test:e2e:ui` |
| `:coverage` | With coverage | `test:coverage` |
| `:all` | All targets | `dev:all`, `clean:all` |

---

## Development Commands

Start development servers with hot-reload for rapid iteration.

### Interactive Selector

```bash
bun run dev
```

Launches an interactive prompt to select which app to develop. Choose from:
1. RustyVault UI (port 8215)
2. Admin Dashboard (port 4111)
3. Client Application (port 4115)
4. All Apps (parallel)
5. Shared Libraries Only

### Specific Apps

```bash
# Start RustyVault UI with shared libraries
bun run dev:vault

# Start Admin Dashboard with shared libraries
bun run dev:admin

# Start Client Application with shared libraries
bun run dev:client
```

**What it does:**
- Builds shared libraries first
- Starts the selected app in development mode
- Runs shared libraries in watch mode (parallel)
- Hot-reloads on file changes

### All Apps

```bash
bun run dev:all
```

Starts all frontend applications in parallel with shared libraries in watch mode.

**Use when:** Working on features that span multiple apps or testing cross-app integrations.

### Libraries Only

```bash
# Watch both shared and components libraries
bun run dev:libs

# Watch shared library only
bun run dev:shared

# Watch components library only
bun run dev:components
```

**Use when:** Developing shared utilities or UI components without running full apps.

---

## Testing Commands

### Run All Tests

```bash
# Unit tests + backend tests (default)
bun run test

# Full suite: unit + backend + E2E
bun run test:all
```

### Test by Type

```bash
# Frontend unit tests only (Vitest)
bun run test:unit

# Backend Rust tests only (cargo test)
bun run test:backend

# Playwright E2E tests
bun run test:e2e

# E2E with interactive UI
bun run test:e2e:ui
```

### Test Modes

```bash
# Watch mode - reruns on file changes
bun run test:watch

# With coverage report
bun run test:coverage
```

### Test Environment

E2E tests require a running test environment:

```bash
# Start test environment (from root)
make test-up

# Run E2E tests
cd cli && bun run test:e2e

# Stop test environment
make test-down
```

---

## Build Commands

### Build Everything

```bash
# Build shared libraries + all apps
bun run build
```

Builds in this order:
1. Shared library (`@lazarus-life/shared`)
2. Components library (`@lazarus-life/ui-components`)
3. All application packages

### Build by Target

```bash
# Rust backend (release mode)
bun run build:backend

# All frontend apps
bun run build:frontend

# Shared libraries only
bun run build:libs

# All apps (assumes libs already built)
bun run build:apps
```

### Build Specific Apps

```bash
# Build RustyVault UI
bun run build:vault

# Build Admin Dashboard
bun run build:admin

# Build Client Application
bun run build:client
```

### Special Builds

```bash
# Build Tauri desktop applications
bun run build:desktop

# Production release build (backend + frontend)
bun run build:release

# Rebuild libraries from scratch
bun run rebuild:libs
```

---

## Docker Commands

Manage Docker environments for development, production, and testing.

### Development Environment

```bash
# Start dev environment (Postgres, Redis, etc.)
bun run docker:dev

# Stop dev environment
bun run docker:dev:down

# View dev environment logs (follow mode)
bun run docker:dev:logs
```

### Production Environment

```bash
# Start production environment
bun run docker:prod

# Stop production environment
bun run docker:prod:down
```

### Test Environment

```bash
# Start test environment
bun run docker:test

# Stop test environment
bun run docker:test:down
```

### Cleanup

```bash
# Prune unused Docker resources
bun run docker:clean
```

**Note:** Docker compose files are located in the project root:
- `docker-compose.dev.yml` - Development
- `docker-compose.yml` - Production
- `docker-compose.test.yml` - Testing

---

## Database Commands

Manage database schema and data using SQLx migrations.

### Migrations

```bash
# Run all pending migrations (dev database)
bun run db:migrate

# Run migrations on test database
bun run db:migrate:test

# Reset dev database (drop + recreate + migrate)
bun run db:reset

# Reset test database (drop + recreate + migrate)
bun run db:reset:test
```

**Warning:** `db:reset` and `db:reset:test` are destructive and will delete all data.

**Database URLs:**
- Dev: Uses `DATABASE_URL` from `.env` or default
- Test: `postgresql://test_user:test_password@localhost:5433/vault_test_db`

### Seed Data

```bash
# Seed database with sample data
bun run db:seed
```

Runs the seed binary if available in the backend.

**Migrations Location:** `backend/migrations/*.sql`

---

## Linting & Quality Commands

### Run All Linters

```bash
# Run frontend + backend linters
bun run lint

# Auto-fix all issues
bun run lint:fix
```

### Lint by Target

```bash
# Frontend only (Biome)
bun run lint:frontend

# Frontend with auto-fix
bun run lint:frontend:fix

# Frontend with unsafe auto-fix
bun run lint:frontend:unsafe

# Backend only (Clippy)
bun run lint:backend

# Backend with auto-fix (cargo fmt)
bun run lint:backend:fix
```

### Additional Linters

```bash
# Oxlint (faster alternative linter)
bun run lint:oxlint

# All linters (Oxlint + Biome + Clippy)
bun run lint:all
```

### Formatting

```bash
# Format with Biome
bun run format

# Check formatting without changes
bun run format:check

# Format with Oxfmt
bun run format:oxfmt:fix

# Check Oxfmt without changes
bun run format:oxfmt
```

---

## Check Commands

Combined quality checks for CI/CD and pre-commit validation.

### Standard Checks

```bash
# Lint + typecheck + unit tests
bun run check

# TypeScript type checking only
bun run check:types

# Individual typecheck (legacy)
bun run typecheck
```

### Strict Checks

```bash
# Run all strict checks → strict-errors.txt
bun run check:strict
```

Generates `strict-errors.txt` in project root with:
- TypeScript strict checks
- Biome strict linting
- Oxlint checks
- Clippy strict checks
- Cargo-deny security checks

**Use when:** Preparing for production release or fixing technical debt.

---

## Cleanup Commands

Remove build artifacts, dependencies, and Docker resources.

### Standard Cleanup

```bash
# Clean build artifacts (Node + Cargo)
bun run clean
```

Removes:
- `node_modules/.cache`
- `packages/*/dist`
- `packages/*/.turbo`
- `backend/target` (via cargo clean)

### Deep Cleanup

```bash
# Clean everything including Docker
bun run clean:all
```

Additional cleanup:
- Docker system prune
- All Docker volumes

### Targeted Cleanup

```bash
# Node modules and build artifacts
bun run clean:node

# Rust build artifacts (cargo clean)
bun run clean:cargo
```

---

## Migration Guide

### Old Command → New Command

This table shows how to migrate from deprecated Makefile commands to the new unified commands.

| Old Command | New Command | Notes |
|-------------|-------------|-------|
| `make up` | `cd cli && bun run docker:dev` | Start dev environment |
| `make down` | `cd cli && bun run docker:dev:down` | Stop dev environment |
| `make logs` | `cd cli && bun run docker:dev:logs` | View dev logs |
| `make dev` | `cd cli && bun run docker:dev` | Same as `make up` |
| `make dev-up` | `cd cli && bun run docker:dev` | Same as `make up` |
| `make dev-down` | `cd cli && bun run docker:dev:down` | Same as `make down` |
| `make dev-logs` | `cd cli && bun run docker:dev:logs` | Same as `make logs` |
| `make test` | `cd cli && bun run test` | Unit + backend tests |
| `make test-backend` | `cd cli && bun run test:backend` | Backend only |
| `make test-frontend` | `cd cli && bun run test:unit` | Frontend only |
| `make test-unit` | `cd cli && bun run test:unit` | Frontend unit tests |
| `make test-e2e` | `cd cli && bun run test:e2e` | E2E tests |
| `make test-e2e-ui` | `cd cli && bun run test:e2e:ui` | E2E with UI |
| `make build-backend` | `cd cli && bun run build:backend` | Build Rust |
| `make build-frontend` | `cd cli && bun run build:frontend` | Build frontend |
| `make lint` | `cd cli && bun run lint` | Run all linters |
| `make lint-fix` | `cd cli && bun run lint:fix` | Auto-fix issues |
| `make lint-backend` | `cd cli && bun run lint:backend` | Lint Rust |
| `make lint-frontend` | `cd cli && bun run lint:frontend` | Lint TypeScript |
| `make db-migrate` | `cd cli && bun run db:migrate` | Run migrations |
| `make db-migrate-test` | `cd cli && bun run db:migrate:test` | Run test DB migrations |
| `make db-reset` | `cd cli && bun run db:reset` | Reset database |
| `make db-seed` | `cd cli && bun run db:seed` | Seed data |
| `make clean` | `cd cli && bun run clean` | Clean artifacts |
| `make clean-docker` | `cd cli && bun run docker:clean` | Clean Docker |
| `make clean-all` | `cd cli && bun run clean:all` | Clean everything |
| `make strict` | `cd cli && bun run check:strict` | Strict checks |

### Deprecation Timeline

**Current Phase (Week 1-2):** Additive Phase
- All old commands work with deprecation warnings
- New commands are available
- No breaking changes

**Upcoming (Week 3-4):** Migration Phase
- CI/CD updated to new commands
- Team encouraged to adopt new commands
- Deprecation warnings remain

**Future (Week 5-6):** Cleanup Phase
- Deprecated commands removed
- Only new unified commands available

### Why the Change?

The new command structure provides:

✅ **Consistency** - Same naming pattern across all commands
✅ **Discoverability** - Clear command families with tab completion
✅ **Hierarchy** - Related commands grouped together
✅ **Single Source** - Package.json as primary interface
✅ **Scalability** - Easy to add new commands in existing families

### Getting Help

```bash
# View all available commands
cd cli && bun run

# View this documentation
cat COMMANDS.md

# View quick reference
cat CLAUDE.md
```

---

## Examples

### Common Workflows

**Start developing on RustyVault UI:**
```bash
cd cli
bun run dev:vault
# Builds libs, starts vault app with hot-reload
```

**Run full test suite before PR:**
```bash
cd cli
bun run test:all
# Runs unit, backend, and E2E tests
```

**Fix all linting issues:**
```bash
cd cli
bun run lint:fix
# Auto-fixes Biome and Clippy issues
```

**Reset database and seed data:**
```bash
cd cli
bun run db:reset
bun run db:seed
```

**Build for production:**
```bash
cd cli
bun run build:release
# Builds backend + frontend for production
```

**Check code quality before commit:**
```bash
cd cli
bun run check
# Runs lint + typecheck + unit tests
```

---

## Troubleshooting

### Command Not Found

**Error:** `command not found: <command>`

**Solution:** Ensure you're in the `cli/` directory:
```bash
cd cli && bun run <command>
```

### Permission Denied

**Error:** `Permission denied: scripts/dev-interactive.js`

**Solution:** Make the script executable:
```bash
chmod +x cli/scripts/dev-interactive.js
```

### Docker Issues

**Error:** Docker commands fail

**Solution:** Check Docker is running:
```bash
docker ps
# If fails, start Docker Desktop
```

### Database Connection Issues

**Error:** Database connection refused

**Solution:** Ensure Docker dev environment is running:
```bash
cd cli && bun run docker:dev
# Wait for services to be healthy
```

### Build Failures

**Error:** Build fails with missing dependencies

**Solution:** Clean and rebuild:
```bash
cd cli
bun run clean:all
bun install
bun run build
```

---

## Contributing

When adding new commands:

1. Follow the hierarchical naming convention
2. Add to appropriate command family
3. Update this documentation
4. Add examples for common use cases
5. Consider backward compatibility

**Questions?** Open an issue or consult CLAUDE.md for AI assistance.
