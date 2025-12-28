.PHONY: help build up down restart logs ps \
        test test-backend test-frontend test-e2e test-unit test-coverage \
        test-up test-down test-logs test-clean \
        dev dev-up dev-down dev-logs \
        prod prod-up prod-down \
        db-migrate db-reset db-seed \
        lint lint-backend lint-frontend lint-fix \
        strict strict-all strict-typescript strict-biome strict-oxlint strict-clippy strict-deny strict-frontend strict-backend \
        clean clean-all

# ============================================================================
# Help
# ============================================================================

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@echo ''
	@echo 'Development:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST) | grep -E '(dev|up|down|build|restart|logs|ps)'
	@echo ''
	@echo 'Testing:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST) | grep -E 'test'
	@echo ''
	@echo 'Database:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST) | grep -E 'db-'
	@echo ''
	@echo 'Linting:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST) | grep -E 'lint'
	@echo ''
	@echo 'Cleanup:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST) | grep -E 'clean'

# ============================================================================
# Development (Default)
# ============================================================================

build: ## Build all Docker images in dev mode
	docker-compose -f docker-compose.dev.yml build

up: dev-up ## Alias for dev-up

down: dev-down ## Alias for dev-down

restart: ## Restart all services in dev mode
	docker-compose -f docker-compose.dev.yml restart

logs: dev-logs ## Alias for dev-logs

ps: ## Show running containers
	docker-compose -f docker-compose.dev.yml ps

dev: dev-up ## Start development environment

dev-up: ## Build and start all services in dev mode
	@./scripts/docker-compose-with-profiles.sh docker-compose.dev.yml up -d --build --force-recreate --remove-orphans

dev-down: ## Stop all dev services
	docker-compose -f docker-compose.dev.yml down

dev-logs: ## Show logs from dev services
	docker-compose -f docker-compose.dev.yml logs -f

dev-build: ## Build dev images without cache
	docker-compose -f docker-compose.dev.yml build --no-cache

# ============================================================================
# Production
# ============================================================================

prod: prod-up ## Start production environment

prod-up: ## Build and start all services in production mode
	docker-compose -f docker-compose.yml up -d --build

prod-down: ## Stop all production services
	docker-compose -f docker-compose.yml down

prod-logs: ## Show logs from production services
	docker-compose -f docker-compose.yml logs -f

# ============================================================================
# Testing
# ============================================================================

test: test-unit test-backend ## Run all tests (unit + backend)

test-all: test-unit test-backend test-e2e ## Run all tests including E2E

test-up: ## Start test environment (vault only)
	docker-compose -f docker-compose.test.yml up -d --build
	@echo "Waiting for services to be healthy..."
	@sleep 10
	@docker-compose -f docker-compose.test.yml ps

test-up-full: ## Start full test environment (with API service)
	docker-compose -f docker-compose.test.yml --profile full up -d --build
	@echo "Waiting for services to be healthy..."
	@sleep 15
	@docker-compose -f docker-compose.test.yml --profile full ps

test-down: ## Stop test environment
	docker-compose -f docker-compose.test.yml down -v

test-logs: ## Show logs from test services
	docker-compose -f docker-compose.test.yml logs -f

test-clean: ## Clean up test environment and volumes
	docker-compose -f docker-compose.test.yml --profile full down -v --remove-orphans
	@echo "Test environment cleaned up"

test-backend: ## Run backend Rust tests
	@echo "Running backend tests..."
	cd backend && cargo test --workspace

test-backend-coverage: ## Run backend tests with coverage
	@echo "Running backend tests with coverage..."
	cd backend && cargo tarpaulin --out Xml --out Html --output-dir coverage --exclude-files '*/tests/*'

test-frontend: test-unit ## Alias for test-unit

test-unit: ## Run frontend unit tests
	@echo "Running frontend unit tests..."
	cd cli && bun run test

test-unit-coverage: ## Run frontend unit tests with coverage
	@echo "Running frontend unit tests with coverage..."
	cd cli/packages/apps/rustyvault-ui && bun run test:coverage
	cd cli/packages/apps/admin && bun run test:coverage || true
	cd cli/packages/apps/client-app && bun run test:coverage || true

test-e2e: test-up ## Run E2E tests (starts test env if needed)
	@echo "Running E2E tests..."
	cd cli/packages/apps/rustyvault-ui && \
		PLAYWRIGHT_BASE_URL="http://localhost:8215" \
		PLAYWRIGHT_API_URL="http://localhost:8217" \
		bunx playwright test

test-e2e-ui: test-up ## Run E2E tests with UI
	@echo "Running E2E tests with UI..."
	cd cli/packages/apps/rustyvault-ui && \
		PLAYWRIGHT_BASE_URL="http://localhost:8215" \
		PLAYWRIGHT_API_URL="http://localhost:8217" \
		bunx playwright test --ui

test-coverage: test-backend-coverage test-unit-coverage ## Run all tests with coverage

test-vault: ## Run vault-specific tests
	@./scripts/run-vault-tests.sh

# ============================================================================
# Database
# ============================================================================

db-migrate: ## Run database migrations
	@echo "Running database migrations..."
	cd backend && sqlx migrate run

db-migrate-test: ## Run migrations on test database
	@echo "Running migrations on test database..."
	DATABASE_URL="postgresql://test_user:test_password@localhost:5433/vault_test_db" \
		cd backend && sqlx migrate run

db-reset: ## Reset database (drop and recreate)
	@echo "Resetting database..."
	cd backend && sqlx database drop -y && sqlx database create && sqlx migrate run

db-seed: ## Seed database with sample data
	@echo "Seeding database..."
	cd backend && cargo run --bin seed || echo "No seed binary found"

# ============================================================================
# Linting & Formatting
# ============================================================================

lint: lint-backend lint-frontend ## Run all linters

lint-backend: ## Run Rust lints (clippy + fmt check)
	@echo "Running backend lints..."
	cd backend && cargo fmt --all -- --check
	cd backend && cargo clippy --workspace -- -D warnings

lint-frontend: ## Run frontend lints (biome)
	@echo "Running frontend lints..."
	cd cli && bun run lint

lint-fix: ## Fix linting issues automatically
	@echo "Fixing linting issues..."
	cd backend && cargo fmt --all
	cd cli && bun run lint:fix || bunx biome check --write .

typecheck: ## Run TypeScript type checking
	@echo "Running TypeScript type checks..."
	cd cli/packages/libs/shared && bun run typecheck
	cd cli/packages/libs/components && bun run typecheck
	cd cli/packages/apps/rustyvault-ui && bun run typecheck
	cd cli/packages/apps/admin && bun run typecheck

# ============================================================================
# Strict Checks - Like Physics Laws, No Leniency
# ============================================================================

STRICT_REPORT_FILE := strict-errors.txt

strict: strict-all ## Run all strict checks and export errors to txt file

strict-all: ## Run ALL strict checks (TypeScript, Biome, Oxlint, Clippy) and export to strict-errors.txt
	@echo "================================================================================" > $(STRICT_REPORT_FILE)
	@echo "STRICT CODE QUALITY REPORT - $(shell date)" >> $(STRICT_REPORT_FILE)
	@echo "Like Physics Laws - No Leniency" >> $(STRICT_REPORT_FILE)
	@echo "================================================================================" >> $(STRICT_REPORT_FILE)
	@echo "" >> $(STRICT_REPORT_FILE)
	@$(MAKE) strict-typescript 2>&1 || true
	@$(MAKE) strict-biome 2>&1 || true
	@$(MAKE) strict-oxlint 2>&1 || true
	@$(MAKE) strict-clippy 2>&1 || true
	@echo "" >> $(STRICT_REPORT_FILE)
	@echo "================================================================================" >> $(STRICT_REPORT_FILE)
	@echo "END OF REPORT" >> $(STRICT_REPORT_FILE)
	@echo "================================================================================" >> $(STRICT_REPORT_FILE)
	@echo ""
	@echo "Strict errors exported to: $(STRICT_REPORT_FILE)"
	@echo "Total errors: $$(grep -c 'error\|ERROR' $(STRICT_REPORT_FILE) 2>/dev/null || echo 0)"

strict-typescript: ## Run strict TypeScript checks
	@echo "" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	@echo "TYPESCRIPT STRICT CHECKS" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	@echo "[1/4] Checking shared library..." >> $(STRICT_REPORT_FILE)
	-@cd cli/packages/libs/shared && bun run typecheck >> ../../$(STRICT_REPORT_FILE) 2>&1
	@echo "[2/4] Checking components library..." >> $(STRICT_REPORT_FILE)
	-@cd cli/packages/libs/components && bun run typecheck >> ../../$(STRICT_REPORT_FILE) 2>&1
	@echo "[3/4] Checking rustyvault-ui..." >> $(STRICT_REPORT_FILE)
	-@cd cli/packages/apps/rustyvault-ui && bun run typecheck >> ../../../$(STRICT_REPORT_FILE) 2>&1
	@echo "[4/4] Checking admin app..." >> $(STRICT_REPORT_FILE)
	-@cd cli/packages/apps/admin && bun run typecheck >> ../../../$(STRICT_REPORT_FILE) 2>&1

strict-biome: ## Run strict Biome linting
	@echo "" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	@echo "BIOME STRICT LINTING" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	-@cd cli && bunx biome check . >> ../$(STRICT_REPORT_FILE) 2>&1

strict-oxlint: ## Run strict Oxlint checks
	@echo "" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	@echo "OXLINT STRICT CHECKS" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	-@cd cli && bunx oxlint . >> ../$(STRICT_REPORT_FILE) 2>&1

strict-oxfmt: ## Run strict Oxfmt format check
	@echo "" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	@echo "OXFMT FORMAT CHECK" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	-@cd cli && bunx oxfmt --check . >> ../$(STRICT_REPORT_FILE) 2>&1

strict-clippy: ## Run strict Rust Clippy checks
	@echo "" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	@echo "RUST CLIPPY STRICT CHECKS" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	-@cd backend && cargo clippy --workspace -- -D warnings >> ../$(STRICT_REPORT_FILE) 2>&1

strict-deny: ## Run cargo-deny security checks
	@echo "" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	@echo "CARGO-DENY SECURITY CHECKS" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	-@cd backend && cargo deny check >> ../$(STRICT_REPORT_FILE) 2>&1

strict-frontend: ## Run all frontend strict checks only
	@echo "================================================================================" > $(STRICT_REPORT_FILE)
	@echo "FRONTEND STRICT REPORT - $(shell date)" >> $(STRICT_REPORT_FILE)
	@echo "================================================================================" >> $(STRICT_REPORT_FILE)
	@$(MAKE) strict-typescript 2>&1 || true
	@$(MAKE) strict-biome 2>&1 || true
	@$(MAKE) strict-oxlint 2>&1 || true
	@echo ""
	@echo "Frontend errors exported to: $(STRICT_REPORT_FILE)"

strict-backend: ## Run all backend strict checks only
	@echo "================================================================================" > $(STRICT_REPORT_FILE)
	@echo "BACKEND STRICT REPORT - $(shell date)" >> $(STRICT_REPORT_FILE)
	@echo "================================================================================" >> $(STRICT_REPORT_FILE)
	@$(MAKE) strict-clippy 2>&1 || true
	@$(MAKE) strict-deny 2>&1 || true
	@echo ""
	@echo "Backend errors exported to: $(STRICT_REPORT_FILE)"

# ============================================================================
# Build
# ============================================================================

build-backend: ## Build backend in release mode
	@echo "Building backend..."
	cd backend && cargo build --release --workspace

build-frontend: ## Build all frontend apps
	@echo "Building frontend..."
	cd cli && bun run build

build-shared: ## Build shared libraries
	@echo "Building shared libraries..."
	cd cli/packages/libs/shared && bun run build
	cd cli/packages/libs/components && bun run build

# ============================================================================
# Cleanup
# ============================================================================

clean: ## Clean build artifacts
	@echo "Cleaning build artifacts..."
	cd backend && cargo clean
	cd cli && rm -rf node_modules/.cache
	rm -rf cli/packages/*/dist
	rm -rf cli/packages/*/.turbo

clean-docker: ## Clean Docker resources
	@echo "Cleaning Docker resources..."
	docker-compose -f docker-compose.dev.yml down -v --remove-orphans
	docker-compose -f docker-compose.test.yml down -v --remove-orphans
	docker system prune -f

clean-all: clean clean-docker ## Clean everything
	@echo "Deep cleaning..."
	rm -rf backend/target
	rm -rf cli/node_modules
	rm -rf cli/packages/*/node_modules
	docker volume prune -f

# ============================================================================
# Utility
# ============================================================================

install: ## Install all dependencies
	@echo "Installing dependencies..."
	cd cli && bun install
	cd backend && cargo fetch

check: lint typecheck test-unit ## Run all checks (lint + typecheck + unit tests)

ci: check test-backend ## Run CI checks
