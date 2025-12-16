.PHONY: help build up down restart logs ps

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all Docker images in dev mode
	docker-compose -f docker-compose.dev.yml build

up: ## Build and start all services in dev mode
	@./scripts/docker-compose-with-profiles.sh docker-compose.dev.yml up -d --build --force-recreate --remove-orphans

down: ## Stop all services
	docker-compose -f docker-compose.dev.yml down

restart: ## Restart all services in dev mode
	docker-compose -f docker-compose.dev.yml restart

logs: ## Show logs from all services
	docker-compose -f docker-compose.dev.yml logs -f

ps: ## Show running containers
	docker-compose -f docker-compose.dev.yml ps
