# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Health V1 is a monorepo with Rust backend services and TypeScript/React frontend apps (Tauri desktop applications). The system includes a secrets vault (RustyVault), admin panel, and client application for healthcare data management.

## Build & Development Commands

**Use `make` as the universal interface** - all commands work from the project root.

### Quick Reference

**Development:**
```bash
make dev              # Interactive app selector
make dev-vault        # RustyVault UI + libs (port 8215)
make dev-admin        # Admin dashboard + libs (port 5174)
make dev-client       # Client app + libs (port 5175)
make dev-all          # All apps in parallel
```

**Testing:**
```bash
make test             # Unit + backend tests
make test-all         # Full test suite (includes E2E)
make test-unit        # Frontend unit tests
make test-backend     # Rust tests
make test-e2e         # Playwright E2E tests
make test-e2e-ui      # E2E with Playwright UI
```

**Building:**
```bash
make build            # Build all (libs + apps)
make build-backend    # Rust backend only
make build-frontend   # All frontend apps
make build-release    # Production release build
```

**Docker:**
```bash
make docker-dev       # Start dev environment
make docker-dev-down  # Stop dev environment
make docker-dev-logs  # View dev logs
```

**Quality Checks:**
```bash
make lint             # Run all linters
make lint-fix         # Auto-fix all issues
make check            # Lint + typecheck + tests
make check-strict     # All strict checks → strict-errors.txt
```

**Database:**
```bash
make db-migrate       # Run migrations
make db-migrate-test  # Run migrations on test DB
make db-reset         # Drop, recreate, migrate
make db-seed          # Seed sample data
```

**Cleanup:**
```bash
make clean            # Clean build artifacts
make clean-all        # Clean everything including Docker
```

### Architecture

- **Make** = Universal interface (backend + frontend)
- **Bun** = Internal package manager (handles UI tasks)
- All commands run from project root
- No need to `cd cli` for any operation

For comprehensive command reference, see `COMMANDS.md`.

## Architecture

### Backend (Rust - `/backend`)
- **shared**: Common types, error handling (`AppError`), database utilities
- **authz-core**: Authorization engine with RBAC/ABAC policies
- **admin-service**: Admin API for user/role management
- **api-service**: Main API for client applications
- **rustyvault-service**: HashiCorp Vault-compatible secrets management

All services use:
- Axum 0.8 for HTTP
- SQLx with PostgreSQL
- `thiserror` for error types, `anyhow` for context
- `tracing` for structured logging

### Frontend (TypeScript/React - `/cli`)
- **packages/apps/rustyvault-ui**: Vault management UI (port 8215)
- **packages/apps/admin**: Admin dashboard
- **packages/apps/client-app**: Patient-facing application
- **packages/libs/shared**: Shared types, API client (`BaseApiClient`), routes
- **packages/libs/components**: Reusable UI components

All apps use:
- Bun as package manager
- TanStack Router (file-based routing in `src/routes/`)
- TanStack Query for data fetching
- Zustand for state management
- Tailwind CSS for styling
- Tauri for desktop builds

### API Client Pattern
Routes are defined in `cli/packages/libs/shared/src/api/routes.ts`. The `/api` prefix is added automatically - never include it in route definitions. Use `/v1/` prefix for versioned endpoints.

## Environment Configuration

Health V1 uses a **unified, hierarchical environment configuration** strategy:

### Configuration Files

- **Root `.env`**: Single source of truth for all shared configuration
  - Backend services (API, Vault, Database)
  - Service ports (8080, 4117, 5432)
  - Security secrets (JWT, MASTER_KEY, OIDC)
  - CORS configuration
  - Session settings

- **App `.env` files**: Vite-specific overrides ONLY
  - `cli/packages/apps/admin/.env` - Admin UI (port 5174)
  - `cli/packages/apps/client-app/.env` - Client app (port 5175)
  - `cli/packages/apps/rustyvault-ui/.env` - Vault UI (port 8215)

### Key Configuration Rules

**Port Mapping:**
```bash
# Backend Services
API_SERVICE_PORT=8080          # Main API (used by admin & client-app)
VAULT_SERVICE_PORT=4117        # Vault service (used by rustyvault-ui)

# Frontend Dev Servers
ADMIN_UI_PORT=5174             # Admin dashboard Vite dev server
CLIENT_APP_PORT=5175           # Client app Vite dev server
VAULT_UI_PORT=8215             # Vault UI Vite dev server (NOTE: 8215!)
```

**API URLs (CRITICAL - common mistake):**
```bash
# Admin & Client apps → API Service (port 8080)
VITE_API_BASE_URL=http://localhost:8080

# Vault UI → Vault Service (port 4117, different service!)
VITE_API_BASE_URL=http://localhost:4117/v1    # Must include /v1 prefix!
```

**CORS Configuration:**
```bash
# MUST include ALL frontend dev server origins
CORS_ALLOWED_ORIGINS=http://localhost:5174,http://localhost:5175,http://localhost:8215
```

**Docker Compose:**
- All required variables MUST be in `.env`
- No default values in docker-compose files
- Docker will fail with clear error if variables missing

### Setup for New Developers

```bash
# 1. Copy environment templates
cp .env.example .env
cp cli/packages/apps/admin/.env.example cli/packages/apps/admin/.env
cp cli/packages/apps/client-app/.env.example cli/packages/apps/client-app/.env
cp cli/packages/apps/rustyvault-ui/.env.example cli/packages/apps/rustyvault-ui/.env

# 2. Validate configuration
./scripts/validate-env.sh

# 3. Start services
make docker-dev      # Backend services
make dev-admin       # Admin UI
make dev-client      # Client app
make dev-vault       # Vault UI
```

**For comprehensive environment configuration guide, see `ENV.md`.**

## Critical Rules

### Rust Backend
- **Never use `unwrap()` or `expect()`** - use proper `Result<T, E>` error handling
- Use `AppError` from `shared::shared::error` for common errors
- Services define their own error enum converting from `AppError`
- Log errors with `error.log_with_context()` or `error.log_with_operation()`
- Run `cargo fmt` and `cargo clippy --workspace -- -D warnings` before committing

### TypeScript Frontend
- No `any` types - use `unknown` or proper types
- Use `type` imports: `import type { ... }`
- Use `useAuditLog` hook and `logPHI()` for any PHI access
- Run `bun run lint:fix` before committing

### General
- Use conventional commits
- Never commit `.env` files
- Do not create documentation files unless explicitly requested

## Testing

### E2E Tests (Playwright)
Located in `cli/packages/apps/*/e2e/`:
- Specs in `e2e/specs/*.spec.ts`
- Fixtures in `e2e/fixtures/`

Run with test environment:
```bash
make test-up               # Start test services
make test-e2e              # Run E2E tests
make test-e2e-ui           # Run with Playwright UI
```

### Unit Tests
- Backend: `cargo test --workspace`
- Frontend: `bun run test` or `bun run test:coverage`

## Medical/Healthcare Skills

This project includes specialized skills for healthcare development. Invoke with `/skill-name`:

| Skill | Description |
|-------|-------------|
| `/phi-audit` | Review PHI access logs and audit trail for HIPAA compliance |
| `/hipaa-check` | Run HIPAA compliance checks on code changes |
| `/patient-api` | Generate patient API endpoints, hooks, and types |
| `/phi-scan` | Scan code for potential PHI exposure or security issues |
| `/encryption-ops` | Manage DEK rotation and encryption key operations |
| `/clinical-feature` | Generate clinical features (orders, results, notes) with PHI handling |
| `/audit-report` | Generate audit reports for compliance reviews |
| `/de-identify` | De-identify PHI using HIPAA Safe Harbor method |

### PHI Fields (Always Track & Mask)
- SSN, Email, Phone, MRN (Medical Record Number)
- Date of Birth, Physical Address
- Insurance information, Credit card

### HIPAA Compliance
- 7-year audit retention (2555 days)
- All PHI access logged via `useAuditLog` hook
- Error messages sanitized to remove PHI patterns
- sessionStorage for tokens (not localStorage)
