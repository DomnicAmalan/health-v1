# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Health V1 is a monorepo with Rust backend services and TypeScript/React frontend apps (Tauri desktop applications). The system includes a secrets vault (RustyVault), admin panel, and client application for healthcare data management.

## Build & Development Commands

All commands use a hierarchical naming convention: `<family>:<scope>:<modifier>`

### Quick Reference

**Development:**
```bash
cd cli && bun run dev              # Interactive app selector
cd cli && bun run dev:vault        # RustyVault UI + libs (port 8215)
cd cli && bun run dev:admin        # Admin dashboard + libs (port 4111)
cd cli && bun run dev:client       # Client app + libs (port 4115)
cd cli && bun run dev:all          # All apps in parallel
cd cli && bun run dev:libs         # Shared libraries only
```

**Testing:**
```bash
cd cli && bun run test             # Unit + backend tests
cd cli && bun run test:all         # Full test suite (includes E2E)
cd cli && bun run test:unit        # Frontend unit tests
cd cli && bun run test:backend     # Rust tests
cd cli && bun run test:e2e         # Playwright E2E tests
cd cli && bun run test:e2e:ui      # E2E with Playwright UI
cd cli && bun run test:coverage    # With coverage report
```

**Building:**
```bash
cd cli && bun run build            # Build all (libs + apps)
cd cli && bun run build:backend    # Rust backend only
cd cli && bun run build:frontend   # All frontend apps
cd cli && bun run build:libs       # Shared libraries only
cd cli && bun run build:release    # Production release build
```

**Docker:**
```bash
cd cli && bun run docker:dev       # Start dev environment
cd cli && bun run docker:dev:down  # Stop dev environment
cd cli && bun run docker:dev:logs  # View dev logs
cd cli && bun run docker:prod      # Start prod environment
cd cli && bun run docker:test      # Start test environment
```

**Quality Checks:**
```bash
cd cli && bun run lint             # Run all linters
cd cli && bun run lint:fix         # Auto-fix all issues
cd cli && bun run lint:backend     # Lint Rust only
cd cli && bun run lint:frontend    # Lint TypeScript only
cd cli && bun run check            # Lint + typecheck + tests
cd cli && bun run check:types      # TypeScript type checking
cd cli && bun run check:strict     # All strict checks → strict-errors.txt
```

**Database:**
```bash
cd cli && bun run db:migrate       # Run migrations
cd cli && bun run db:migrate:test  # Run migrations on test DB
cd cli && bun run db:reset         # Drop, recreate, migrate
cd cli && bun run db:reset:test    # Reset test database
cd cli && bun run db:seed          # Seed sample data
```

**Cleanup:**
```bash
cd cli && bun run clean            # Clean build artifacts
cd cli && bun run clean:all        # Clean everything including Docker
```

### Command Families

Commands are organized into families with consistent naming:
- `dev:*` - Development servers and watch mode
- `test:*` - Testing operations
- `build:*` - Build operations
- `docker:*` - Docker environment management
- `lint:*` - Linting and formatting
- `db:*` - Database operations
- `check:*` - Quality and type checks
- `clean:*` - Cleanup operations

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
