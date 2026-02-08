---
sidebar_position: 5
title: Contributing
description: How to contribute to Health V1
---

# Contributing

This guide covers the workflow and standards for contributing to Health V1. All contributors must follow these guidelines to maintain the reliability and safety required of a healthcare system.

## Development Setup

Before contributing, ensure your environment is configured:

```bash
# 1. Clone the repository
git clone <repository-url>
cd health-v1

# 2. Copy environment templates
cp .env.example .env
cp cli/packages/apps/admin/.env.example cli/packages/apps/admin/.env
cp cli/packages/apps/client-app/.env.example cli/packages/apps/client-app/.env
cp cli/packages/apps/rustyvault-ui/.env.example cli/packages/apps/rustyvault-ui/.env

# 3. Validate configuration
./scripts/validate-env.sh

# 4. Start services
make docker-dev
make db-migrate

# 5. Install frontend dependencies
cd cli && bun install && cd ..

# 6. Verify everything works
make check
```

## Workflow

### 1. Create a Branch

Create a branch from `master` with a descriptive name:

```bash
git checkout master
git pull origin master
git checkout -b feat/add-allergy-tracking
```

Use branch name prefixes that match your commit type:

| Prefix | Purpose |
|--------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `refactor/` | Code restructuring |
| `chore/` | Maintenance, dependencies |
| `docs/` | Documentation changes |
| `test/` | Test additions or fixes |

### 2. Make Changes

Write your code following the [Coding Standards](./coding-standards.md). Key requirements:

- No `unwrap()` or `expect()` in Rust production code
- Minimum 2 assertions per function
- Functions under 70 lines
- No `any` types in TypeScript
- Use `type` imports in TypeScript
- Use `useAuditLog` for any PHI access

### 3. Run Quality Checks

Before committing, run the full quality check suite:

```bash
# Run all checks (lint + typecheck + tests)
make check
```

Or run individual checks:

```bash
# Rust formatting
cargo fmt --check

# Rust linting (must pass with zero warnings)
cargo clippy --workspace -- -D warnings

# Frontend linting (auto-fix)
cd cli && bun run lint:fix

# Backend tests
make test-backend

# Frontend tests
make test-unit

# E2E tests (requires test environment)
make test-up
make test-e2e
```

For a strict check that captures all output:

```bash
make check-strict    # All strict checks, output to strict-errors.txt
```

### 4. Commit with Conventional Commits

All commits must use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

#### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(ehr): add allergy tracking module` |
| `fix` | Bug fix | `fix(billing): correct decimal rounding in charges` |
| `refactor` | Code restructuring (no behavior change) | `refactor(api): consolidate error handling` |
| `chore` | Maintenance | `chore(deps): update sqlx to 0.8` |
| `docs` | Documentation | `docs(api): add OpenAPI annotations` |
| `test` | Test additions/fixes | `test(auth): add boundary tests for token expiry` |
| `perf` | Performance improvement | `perf(db): add index for patient search` |
| `ci` | CI/CD changes | `ci: add E2E test stage to pipeline` |

#### Scope

The scope is optional but recommended. Use the module or area name:

- `ehr` -- Electronic Health Records
- `billing` -- Billing and payments
- `auth` -- Authentication and authorization
- `api` -- API service
- `vault` -- RustyVault service
- `admin` -- Admin dashboard
- `client` -- Client application
- `db` -- Database and migrations
- `deps` -- Dependencies

#### Examples

```bash
# Feature with scope
git commit -m "feat(ehr): add allergy severity tracking with SNOMED codes"

# Bug fix
git commit -m "fix(billing): handle zero-amount charges without creating payment records"

# Refactor
git commit -m "refactor(api): extract appointment validation into shared module"

# Breaking change (note the !)
git commit -m "feat(api)!: change patient ID format from integer to UUID"
```

### 5. Submit a Pull Request

Push your branch and create a pull request against `master`:

```bash
git push origin feat/add-allergy-tracking
```

In the PR description, include:

- **Summary**: What changed and why
- **Test plan**: How the changes were tested
- **Breaking changes**: Any API or schema changes that affect other components

### 6. Code Review

All PRs require at least one review before merging. Reviewers will check:

- **Tiger Style compliance**: Error handling, assertions, function size, resource limits
- **Test coverage**: Valid/invalid boundaries tested, state transitions covered
- **Security**: PHI handled correctly, audit logging in place, no secrets in code
- **Naming**: Big-endian convention followed
- **Documentation**: Public APIs documented, complex logic explained in comments

## What NOT to Commit

The following files and patterns must never be committed:

- `.env` files (use `.env.example` templates instead)
- `credentials.json`, API keys, or any secrets
- `node_modules/`, `target/`, build artifacts
- `.DS_Store`, editor-specific files
- Large binary files

The `.gitignore` file is configured to exclude these, but always verify with `git status` before committing.

## Database Changes

If your contribution includes database schema changes:

1. Create migration files (see [Database Migrations](./migrations.md))
2. Apply them locally: `make db-migrate`
3. Verify compile-time queries pass: `cargo check --workspace`
4. Test a clean reset: `make db-reset && make db-migrate`
5. Include both up and down migration files in the PR

## Tiger Style Checklist

Before every PR, verify:

- [ ] All error cases handled (no `unwrap()` or `expect()`)
- [ ] Minimum 2 assertions per function
- [ ] Every function is under 70 lines
- [ ] All queries have timeouts
- [ ] All queues and lists have bounded capacity
- [ ] Tests cover valid/invalid boundaries
- [ ] Idempotency for financial operations
- [ ] Audit trail for state changes
- [ ] Big-endian naming convention used
- [ ] `cargo fmt` and `cargo clippy --workspace -- -D warnings` pass
- [ ] `bun run lint:fix` passes (for frontend changes)
- [ ] No `.env` files or secrets in the commit
- [ ] Conventional commit message format used

## Getting Help

- Check existing code for patterns and conventions
- Review the [Architecture](../architecture/overview) documentation for system design context
- Use Make commands -- run `make help` to see all available commands
- Read the [Coding Standards](./coding-standards.md) for detailed Tiger Style guidance
