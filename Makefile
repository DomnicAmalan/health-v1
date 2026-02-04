.PHONY: help \
        dev dev-vault dev-admin dev-client dev-all dev-libs \
        test test-all test-unit test-backend test-e2e test-e2e-ui test-watch test-coverage \
        build build-all build-backend build-frontend build-libs build-release \
        docker-dev docker-dev-down docker-dev-logs docker-prod docker-test docker-clean \
        db-migrate db-migrate-test db-reset db-reset-test db-seed \
        lint lint-fix lint-backend lint-frontend lint-all \
        check check-types check-strict \
        clean clean-all clean-node clean-cargo \
        strict strict-all strict-frontend strict-backend

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
	@echo '  make dev-admin       - Admin dashboard + libs (port 4111)'
	@echo '  make dev-client      - Client app + libs (port 4115)'
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
	@echo 'Build Commands:'
	@echo '  make build           - Build all (libs + apps)'
	@echo '  make build-backend   - Build Rust backend'
	@echo '  make build-frontend  - Build all frontend apps'
	@echo '  make build-release   - Production release build'
	@echo ''
	@echo 'Docker Commands:'
	@echo '  make docker-dev      - Start dev environment'
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
# ============================================================================

docker-dev: ## Start dev environment
	@./scripts/docker-compose-with-profiles.sh docker-compose.dev.yml up -d --build --force-recreate --remove-orphans

docker-dev-down: ## Stop dev environment
	docker-compose -f docker-compose.dev.yml down

docker-dev-logs: ## View dev environment logs
	docker-compose -f docker-compose.dev.yml logs -f

docker-prod: ## Start production environment
	docker-compose -f docker-compose.yml up -d --build

docker-prod-down: ## Stop production environment
	docker-compose -f docker-compose.yml down

docker-test: ## Start test environment
	docker-compose -f docker-compose.test.yml up -d --build

docker-test-down: ## Stop test environment
	docker-compose -f docker-compose.test.yml down

docker-clean: ## Clean Docker resources
	docker-compose -f docker-compose.dev.yml down -v --remove-orphans
	docker-compose -f docker-compose.test.yml down -v --remove-orphans
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

test-coverage: ## Run tests with coverage
	@$(BUN_RUN) test:coverage

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

db-migrate: ## Run database migrations
	@$(BUN_RUN) db:migrate

db-migrate-test: ## Run migrations on test database
	@$(BUN_RUN) db:migrate:test

db-reset: ## Reset database (drop + recreate + migrate)
	@$(BUN_RUN) db:reset

db-reset-test: ## Reset test database
	@$(BUN_RUN) db:reset:test

db-seed: ## Seed database with sample data
	@$(BUN_RUN) db:seed

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
# Utility Commands
# ============================================================================

install: ## Install all dependencies
	@echo "Installing dependencies..."
	@cd $(CLI_DIR) && bun install
	@cd $(BACKEND_DIR) && cargo fetch
