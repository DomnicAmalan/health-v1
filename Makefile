.PHONY: help \
        dev dev-vault dev-admin dev-client dev-all dev-libs \
        test test-all test-unit test-backend test-e2e test-e2e-ui test-watch test-coverage \
        sonar sonar-up sonar-scan sonar-status \
        build build-all build-backend build-frontend build-libs build-release \
        docker-dev docker-dev-build docker-dev-down docker-dev-logs \
        docker-prod docker-prod-build docker-prod-down docker-prod-logs docker-clean \
        db-migrate db-migrate-test db-reset db-reset-test db-seed \
        lint lint-fix lint-backend lint-frontend lint-all \
        check check-types check-strict \
        clean clean-all clean-node clean-cargo \
        strict strict-all strict-frontend strict-backend \
        release-patch release-minor release-major release-dry-run version-check version-sync \
        docs-dev docs-build docs-serve docs-docker docs-docker-prod docs-clean

# ============================================================================
# Variables - DRY Configuration
# ============================================================================

CLI_DIR := cli
BACKEND_DIR := backend
BUN_RUN := cd $(CLI_DIR) && bun run

# ============================================================================
# Help
# ============================================================================

help: ## Show this help message
	@echo 'Health V1 Monorepo - Universal Command Interface'
	@echo ''
	@echo 'Usage: make <command>'
	@echo ''
	@echo 'Development Commands:'
	@echo '  make dev             - Interactive app selector'
	@echo '  make dev-vault       - RustyVault UI + libs (port 8215)'
	@echo '  make dev-admin       - Admin dashboard + libs (port 5174)'
	@echo '  make dev-client      - Client app + libs (port 5175)'
	@echo '  make dev-all         - All apps in parallel'
	@echo ''
	@echo 'Testing Commands:'
	@echo '  make test            - Unit + backend tests'
	@echo '  make test-all        - Full suite (unit + backend + E2E)'
	@echo '  make test-unit       - Frontend unit tests'
	@echo '  make test-backend    - Rust backend tests'
	@echo '  make test-e2e        - Playwright E2E tests'
	@echo '  make test-e2e-ui     - E2E with interactive UI'
	@echo ''
	@echo 'SonarQube Commands:'
	@echo '  make sonar           - Full analysis (tests + coverage + scan)'
	@echo '  make sonar-up        - Start SonarQube server'
	@echo '  make sonar-scan      - Run scan only (skip tests)'
	@echo '  make sonar-status    - Check server status'
	@echo ''
	@echo 'Build Commands:'
	@echo '  make build           - Build all (libs + apps)'
	@echo '  make build-backend   - Build Rust backend'
	@echo '  make build-frontend  - Build all frontend apps'
	@echo '  make build-release   - Production release build'
	@echo ''
	@echo 'Docker Commands:'
	@echo '  make docker-dev      - Start dev (Vite on native ports, hot reload)'
	@echo '  make docker-prod     - Start prod (Caddy on port 80)'
	@echo '  make docker-dev-down - Stop dev environment'
	@echo '  make docker-dev-logs - View dev logs'
	@echo ''
	@echo 'Database Commands:'
	@echo '  make db-migrate      - Run migrations'
	@echo '  make db-reset        - Reset database'
	@echo '  make db-seed         - Seed sample data'
	@echo ''
	@echo 'Quality Commands:'
	@echo '  make lint            - Run all linters'
	@echo '  make lint-fix        - Auto-fix issues'
	@echo '  make check           - Lint + typecheck + tests'
	@echo '  make check-strict    - All strict checks → strict-errors.txt'
	@echo ''
	@echo 'Cleanup Commands:'
	@echo '  make clean           - Clean build artifacts'
	@echo '  make clean-all       - Clean everything'
	@echo ''
	@echo 'Documentation Commands:'
	@echo '  make docs-dev        - Start docs dev server (port 3000)'
	@echo '  make docs-build      - Build static documentation site'
	@echo '  make docs-serve      - Serve built docs locally'
	@echo '  make docs-docker     - Start docs in Docker (port 3001)'
	@echo '  make docs-clean      - Clean docs build artifacts'
	@echo ''
	@echo 'Release Commands:'
	@echo '  make release-patch   - Release patch version (1.2.0 -> 1.2.1)'
	@echo '  make release-minor   - Release minor version (1.2.0 -> 1.3.0)'
	@echo '  make release-major   - Release major version (1.2.0 -> 2.0.0)'
	@echo '  make version-check   - Verify all versions match VERSION file'
	@echo '  make version-sync    - Sync versions from VERSION file'
	@echo ''
	@echo 'For detailed documentation, see: COMMANDS.md'

# ============================================================================
# Development Commands
# ============================================================================

dev: ## Interactive app selector
	@cd $(CLI_DIR) && node scripts/dev-interactive.js

dev-vault: ## Start RustyVault UI + libs (port 8215)
	@$(BUN_RUN) dev:vault

dev-admin: ## Start Admin dashboard + libs (port 4111)
	@$(BUN_RUN) dev:admin

dev-client: ## Start Client app + libs (port 4115)
	@$(BUN_RUN) dev:client

dev-all: ## Start all apps in parallel
	@echo "Starting all apps (vault, admin, client)..."
	@echo "Note: Run each in separate terminals for better control:"
	@echo "  Terminal 1: make dev-vault"
	@echo "  Terminal 2: make dev-admin"
	@echo "  Terminal 3: make dev-client"
	@echo ""
	@echo "Or use the interactive selector: make dev"

dev-libs: ## Watch shared libraries only
	@$(BUN_RUN) dev:libs

# ============================================================================
# Docker Commands
# Two profiles:
#   dev  = docker-compose.dev.yml (Vite dev servers on native ports, hot reload)
#   prod = docker-compose.yml --profile prod (Caddy on port 80, production builds)
# ============================================================================

docker-dev: ## Start dev environment (Vite dev servers + hot reload)
	docker compose -f docker-compose.dev.yml up -d

docker-dev-build: ## Build and start dev environment
	docker compose -f docker-compose.dev.yml up -d --build

docker-dev-down: ## Stop dev environment
	docker compose -f docker-compose.dev.yml down

docker-dev-logs: ## View dev environment logs
	docker compose -f docker-compose.dev.yml logs -f

docker-prod: ## Start production environment (Caddy on port 80)
	docker compose --profile prod up -d

docker-prod-build: ## Build and start production environment
	docker compose --profile prod up -d --build

docker-prod-down: ## Stop production environment
	docker compose --profile prod down

docker-prod-logs: ## View production logs
	docker compose --profile prod logs -f

docker-clean: ## Clean Docker resources
	docker compose -f docker-compose.dev.yml down -v --remove-orphans
	docker compose --profile prod down -v --remove-orphans
	docker system prune -f

# ============================================================================
# Testing Commands
# ============================================================================

test: ## Run unit + backend tests
	@$(BUN_RUN) test

test-all: ## Run full test suite (unit + backend + E2E)
	@$(BUN_RUN) test:all

test-unit: ## Run frontend unit tests
	@$(BUN_RUN) test:unit

test-backend: ## Run backend Rust tests
	@cd $(BACKEND_DIR) && cargo test --workspace

test-e2e: ## Run Playwright E2E tests
	@$(BUN_RUN) test:e2e

test-e2e-ui: ## Run E2E tests with Playwright UI
	@$(BUN_RUN) test:e2e:ui

test-watch: ## Run tests in watch mode
	@$(BUN_RUN) test:watch

test-coverage: ## Run frontend tests with coverage
	@$(BUN_RUN) test:coverage

test-coverage-backend: ## Run backend Rust tests with coverage (requires cargo-tarpaulin)
	@cd $(BACKEND_DIR) && mkdir -p coverage && cargo tarpaulin --config .tarpaulin.toml

test-coverage-all: ## Run all tests with coverage (frontend + backend)
	@echo "Running frontend coverage..."
	@$(BUN_RUN) test:coverage || true
	@echo ""
	@echo "Running backend coverage..."
	@cd $(BACKEND_DIR) && mkdir -p coverage && cargo tarpaulin --workspace --out Lcov --output-dir coverage --timeout 300 || true
	@echo ""
	@./scripts/coverage-summary.sh

coverage-summary: ## Show codebase vs test coverage summary
	@./scripts/coverage-summary.sh

# ============================================================================
# SonarQube Commands
# ============================================================================

sonar: ## Run full SonarQube analysis (tests + coverage + scan)
	@./scripts/sonar-scan.sh

sonar-up: ## Start SonarQube server only
	@docker compose up -d sonarqube
	@echo "SonarQube starting at http://localhost:9000"
	@echo "Wait ~2 minutes for initialization..."

sonar-scan: ## Run SonarQube scan only (skip tests)
	@echo "Running SonarQube scanner..."
	@rm -rf .scannerwork
	@if command -v sonar-scanner &> /dev/null; then \
		sonar-scanner -Dsonar.host.url=http://localhost:9000 -Dsonar.token=$$SONAR_TOKEN; \
	else \
		echo "sonar-scanner not found. Install: brew install sonar-scanner"; \
	fi

sonar-status: ## Check SonarQube server status
	@curl -s "http://localhost:9000/api/system/status" | jq . 2>/dev/null || echo "SonarQube not running"

# ============================================================================
# Build Commands
# ============================================================================

build: ## Build all (libs + apps)
	@$(BUN_RUN) build

build-all: build ## Alias for build

build-backend: ## Build Rust backend
	@cd $(BACKEND_DIR) && cargo build --release --workspace

build-frontend: ## Build all frontend apps
	@$(BUN_RUN) build:frontend

build-libs: ## Build shared libraries
	@$(BUN_RUN) build:libs

build-release: ## Production release build
	@$(BUN_RUN) build:release

# ============================================================================
# Database Commands
# ============================================================================

db-migrate: ## Run database migrations (restart api-service)
	@echo "🔄 Restarting api-service to run migrations..."
	@docker compose -f docker-compose.dev.yml restart api-service
	@echo "✅ Migrations completed. Check logs: make docker-dev-logs"

db-migrate-test: ## Run migrations on test database
	@echo "🔄 Running migrations on test database..."
	@cd $(BACKEND_DIR) && sqlx migrate run --database-url "$$TEST_DATABASE_URL"
	@echo "✅ Test migrations completed"

db-reset: ## Reset database (drop + recreate + migrate)
	@echo "⚠️  WARNING: This will DELETE all data in the database!"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read confirm
	@echo "🗑️  Dropping database..."
	@docker compose -f docker-compose.dev.yml exec -T postgres psql -U health_user -d postgres -c "DROP DATABASE IF EXISTS health_db;"
	@echo "🔨 Creating database..."
	@docker compose -f docker-compose.dev.yml exec -T postgres psql -U health_user -d postgres -c "CREATE DATABASE health_db;"
	@echo "🔄 Restarting api-service to run migrations..."
	@docker compose -f docker-compose.dev.yml restart api-service
	@sleep 3
	@echo "✅ Database reset complete. Migrations ran automatically."

db-reset-test: ## Reset test database
	@echo "🗑️  Dropping test database..."
	@docker compose -f docker-compose.dev.yml exec -T postgres-test psql -U test_user -d postgres -c "DROP DATABASE IF EXISTS health_test_db;"
	@echo "🔨 Creating test database..."
	@docker compose -f docker-compose.dev.yml exec -T postgres-test psql -U test_user -d postgres -c "CREATE DATABASE health_test_db;"
	@echo "✅ Test database reset complete"

db-seed: ## Seed database with sample data
	@echo "🌱 Seeding database with sample data..."
	@./scripts/seed-db.sh
	@echo "✅ Database seeding complete"

# ============================================================================
# Linting & Quality Commands
# ============================================================================

lint: ## Run all linters
	@$(BUN_RUN) lint

lint-fix: ## Auto-fix linting issues
	@$(BUN_RUN) lint:fix

lint-backend: ## Lint Rust code only
	@$(BUN_RUN) lint:backend

lint-frontend: ## Lint TypeScript code only
	@$(BUN_RUN) lint:frontend

lint-all: ## Run all linters including Oxlint
	@$(BUN_RUN) lint:all

# ============================================================================
# Check Commands
# ============================================================================

check: ## Lint + typecheck + unit tests
	@$(BUN_RUN) check

check-types: ## TypeScript type checking
	@$(BUN_RUN) check:types

check-strict: ## All strict checks → strict-errors.txt
	@$(MAKE) strict

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
	-@cd $(CLI_DIR)/packages/libs/shared && bun run typecheck >> ../../$(STRICT_REPORT_FILE) 2>&1
	@echo "[2/4] Checking components library..." >> $(STRICT_REPORT_FILE)
	-@cd $(CLI_DIR)/packages/libs/components && bun run typecheck >> ../../$(STRICT_REPORT_FILE) 2>&1
	@echo "[3/4] Checking rustyvault-ui..." >> $(STRICT_REPORT_FILE)
	-@cd $(CLI_DIR)/packages/apps/rustyvault-ui && bun run typecheck >> ../../../$(STRICT_REPORT_FILE) 2>&1
	@echo "[4/4] Checking admin app..." >> $(STRICT_REPORT_FILE)
	-@cd $(CLI_DIR)/packages/apps/admin && bun run typecheck >> ../../../$(STRICT_REPORT_FILE) 2>&1

strict-biome: ## Run strict Biome linting
	@echo "" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	@echo "BIOME STRICT LINTING" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	-@cd $(CLI_DIR) && bunx biome check . >> ../$(STRICT_REPORT_FILE) 2>&1

strict-oxlint: ## Run strict Oxlint checks
	@echo "" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	@echo "OXLINT STRICT CHECKS" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	-@cd $(CLI_DIR) && bunx oxlint . >> ../$(STRICT_REPORT_FILE) 2>&1

strict-oxfmt: ## Run strict Oxfmt format check
	@echo "" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	@echo "OXFMT FORMAT CHECK" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	-@cd $(CLI_DIR) && bunx oxfmt --check . >> ../$(STRICT_REPORT_FILE) 2>&1

strict-clippy: ## Run strict Rust Clippy checks
	@echo "" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	@echo "RUST CLIPPY STRICT CHECKS" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	-@cd $(BACKEND_DIR) && cargo clippy --workspace -- -D warnings >> ../$(STRICT_REPORT_FILE) 2>&1

strict-deny: ## Run cargo-deny security checks
	@echo "" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	@echo "CARGO-DENY SECURITY CHECKS" >> $(STRICT_REPORT_FILE)
	@echo "--------------------------------------------------------------------------------" >> $(STRICT_REPORT_FILE)
	-@cd $(BACKEND_DIR) && cargo deny check >> ../$(STRICT_REPORT_FILE) 2>&1

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
# Cleanup Commands
# ============================================================================

clean: ## Clean build artifacts
	@$(BUN_RUN) clean

clean-all: ## Clean everything including Docker
	@$(BUN_RUN) clean:all

clean-node: ## Clean Node build artifacts
	@$(BUN_RUN) clean:node

clean-cargo: ## Clean Rust build artifacts
	@$(BUN_RUN) clean:cargo

# ============================================================================
# Documentation Commands
# ============================================================================

docs-dev: ## Start docs dev server (port 3000)
	@cd docs && bun run start

docs-build: ## Build static documentation site
	@cd docs && bun run build

docs-serve: ## Serve built docs locally
	@cd docs && bun run serve

docs-docker: ## Start docs in Docker (port 3001)
	docker compose -f docker-compose.dev.yml up -d docs

docs-docker-prod: ## Build and start docs production container (port 3001)
	docker compose --profile prod up -d docs

docs-clean: ## Clean docs build artifacts
	@rm -rf docs/build docs/.docusaurus

# ============================================================================
# Utility Commands
# ============================================================================

install: ## Install all dependencies
	@echo "Installing dependencies..."
	@cd $(CLI_DIR) && bun install
	@cd $(BACKEND_DIR) && cargo fetch

# ============================================================================
# Release Commands
# ============================================================================

release-patch: ## Release patch version (1.2.0 -> 1.2.1)
	@./scripts/release.sh patch

release-minor: ## Release minor version (1.2.0 -> 1.3.0)
	@./scripts/release.sh minor

release-major: ## Release major version (1.2.0 -> 2.0.0)
	@./scripts/release.sh major

release-dry-run: ## Preview release changes (requires: make release-dry-run TYPE=patch)
	@./scripts/release.sh --dry-run $(TYPE)

version-check: ## Verify all package versions match VERSION file
	@./scripts/bump-version.sh --check

version-sync: ## Sync all package versions from VERSION file
	@./scripts/bump-version.sh
