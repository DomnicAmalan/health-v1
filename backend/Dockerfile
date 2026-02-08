# ===========================================================================================
# UNIFIED BACKEND DOCKERFILE - Builds ALL backend services in a single pass
# ===========================================================================================
# This Dockerfile compiles the entire backend workspace ONCE and produces multiple service
# runtime images using multi-stage targets. This eliminates duplicate compilation.
#
# Services built:
#   - api-service (main API)
#   - rustyvault-service (secrets management)
#   - yottadb-api (EHR REST API)
#
# Build time savings: ~20-25 minutes per full build vs. separate Dockerfiles
# ===========================================================================================

# ===========================
# Stage 1: Chef - Base image with cargo-chef
# ===========================
FROM lukemathwalker/cargo-chef:latest-rust-1.91 AS chef
WORKDIR /app

# Install build dependencies (needed for all services)
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ===========================
# Stage 2: Planner - Compute dependency recipe
# ===========================
FROM chef AS planner

# Copy workspace structure (entire backend)
COPY backend/Cargo.toml backend/Cargo.lock backend/
COPY backend/.cargo backend/.cargo

# Copy all crate manifests (required for workspace)
COPY backend/shared/Cargo.toml backend/shared/
COPY backend/authz-core/Cargo.toml backend/authz-core/
COPY backend/admin-service/Cargo.toml backend/admin-service/
COPY backend/api-service/Cargo.toml backend/api-service/
COPY backend/rustyvault-service/Cargo.toml backend/rustyvault-service/
COPY backend/yottadb-api/Cargo.toml backend/yottadb-api/
COPY backend/state-machine-macro/ backend/state-machine-macro/

WORKDIR /app/backend

# Prepare recipe for ENTIRE workspace (all services)
RUN cargo chef prepare --recipe-path recipe.json

# ===========================
# Stage 3: Builder - Compile all services with caching
# ===========================
FROM chef AS builder

# Build arguments
ARG BUILD_MODE=release
ARG SKIP_CHECKS=false
ARG CARGO_BUILD_JOBS=4
ARG SQLX_OFFLINE=true

WORKDIR /app/backend

# Copy dependency recipe from planner
COPY --from=planner /app/backend/recipe.json recipe.json

# Build ALL dependencies ONCE with BuildKit cache mount
# This layer is cached and only rebuilds when dependencies change
ENV RUST_BACKTRACE=1
ENV CARGO_NET_GIT_FETCH_WITH_CLI=true

RUN --mount=type=cache,target=/root/.cargo/registry \
    --mount=type=cache,target=/root/.cargo/git \
    SQLX_OFFLINE=${SQLX_OFFLINE} \
    CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS} \
    cargo chef cook --release --recipe-path recipe.json

# Copy workspace files
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/.cargo ./.cargo

# Copy all crate Cargo.toml files
COPY backend/shared/Cargo.toml ./shared/
COPY backend/authz-core/Cargo.toml ./authz-core/
COPY backend/admin-service/Cargo.toml ./admin-service/
COPY backend/api-service/Cargo.toml ./api-service/
COPY backend/rustyvault-service/Cargo.toml ./rustyvault-service/
COPY backend/yottadb-api/Cargo.toml ./yottadb-api/
COPY backend/state-machine-macro/ ./state-machine-macro/

# Copy ALL source code (entire workspace)
COPY backend/shared/src ./shared/src
COPY backend/authz-core/src ./authz-core/src
COPY backend/admin-service/src ./admin-service/src
COPY backend/api-service/src ./api-service/src
COPY backend/rustyvault-service/src ./rustyvault-service/src
COPY backend/yottadb-api/src ./yottadb-api/src
COPY backend/state-machine-macro/src ./state-machine-macro/src
COPY backend/migrations ./migrations

# Build ALL binaries in a single cargo invocation with cache mount
# This compiles the workspace once and produces all service binaries
RUN --mount=type=cache,target=/app/backend/target \
    --mount=type=cache,target=/root/.cargo/registry \
    --mount=type=cache,target=/root/.cargo/git \
    if [ "$BUILD_MODE" = "dev" ]; then \
        echo "Dev mode: Skipping build, will use cargo run directly"; \
    elif [ "$SKIP_CHECKS" = "true" ]; then \
        echo "Building all services (checks disabled)..."; \
        SQLX_OFFLINE=${SQLX_OFFLINE} \
        RUSTFLAGS="-C link-arg=-s -A warnings" \
        cargo build --release --bins -j${CARGO_BUILD_JOBS} && \
        cp target/release/api-service /app/api-service && \
        cp target/release/rustyvault-service /app/rustyvault-service && \
        cp target/release/yottadb-api /app/yottadb-api; \
    else \
        echo "Building all services (full checks)..."; \
        SQLX_OFFLINE=${SQLX_OFFLINE} \
        RUSTFLAGS="-C link-arg=-s" \
        cargo build --release --bins -j${CARGO_BUILD_JOBS} && \
        cp target/release/api-service /app/api-service && \
        cp target/release/rustyvault-service /app/rustyvault-service && \
        cp target/release/yottadb-api /app/yottadb-api; \
    fi

# ===========================
# Stage 4a: API Service Dev Runtime
# ===========================
FROM rust:1.91-slim AS api-service-dev

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Copy workspace structure for cargo
COPY backend/Cargo.toml backend/.cargo ./
COPY backend/shared/Cargo.toml ./shared/
COPY backend/authz-core/Cargo.toml ./authz-core/
COPY backend/admin-service/Cargo.toml ./admin-service/
COPY backend/api-service/Cargo.toml ./api-service/
COPY backend/rustyvault-service/Cargo.toml ./rustyvault-service/
COPY backend/yottadb-api/Cargo.toml ./yottadb-api/
COPY backend/state-machine-macro/ ./state-machine-macro/

# Copy source code (volumes will override in docker-compose)
COPY backend/shared/src ./shared/src
COPY backend/authz-core/src ./authz-core/src
COPY backend/admin-service/src ./admin-service/src
COPY backend/api-service/src ./api-service/src
COPY backend/rustyvault-service/src ./rustyvault-service/src
COPY backend/yottadb-api/src ./yottadb-api/src
COPY backend/state-machine-macro/src ./state-machine-macro/src
COPY backend/migrations ./migrations

ENV CARGO_BUILD_JOBS=4
ENV CARGO_NET_GIT_FETCH_WITH_CLI=true

EXPOSE 8080

CMD ["cargo", "run", "--bin", "api-service"]

# ===========================
# Stage 4b: API Service Production Runtime
# ===========================
FROM debian:bookworm-slim AS api-service-prod

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -r -s /bin/false appuser

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/api-service /app/api-service
COPY --from=builder /app/backend/migrations /app/migrations

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["./api-service"]

# ===========================
# Stage 5a: RustyVault Service Dev Runtime
# ===========================
FROM rust:1.91-slim AS rustyvault-service-dev

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Copy workspace structure for cargo
COPY backend/Cargo.toml backend/.cargo ./
COPY backend/shared/Cargo.toml ./shared/
COPY backend/authz-core/Cargo.toml ./authz-core/
COPY backend/admin-service/Cargo.toml ./admin-service/
COPY backend/api-service/Cargo.toml ./api-service/
COPY backend/rustyvault-service/Cargo.toml ./rustyvault-service/
COPY backend/yottadb-api/Cargo.toml ./yottadb-api/
COPY backend/state-machine-macro/ ./state-machine-macro/

# Copy source code (volumes will override in docker-compose)
COPY backend/shared/src ./shared/src
COPY backend/authz-core/src ./authz-core/src
COPY backend/admin-service/src ./admin-service/src
COPY backend/api-service/src ./api-service/src
COPY backend/rustyvault-service/src ./rustyvault-service/src
COPY backend/yottadb-api/src ./yottadb-api/src
COPY backend/state-machine-macro/src ./state-machine-macro/src
COPY backend/migrations ./migrations

ENV CARGO_BUILD_JOBS=4
ENV CARGO_NET_GIT_FETCH_WITH_CLI=true

EXPOSE 4117

CMD ["cargo", "run", "--bin", "rustyvault-service"]

# ===========================
# Stage 5b: RustyVault Service Production Runtime
# ===========================
FROM debian:bookworm-slim AS rustyvault-service-prod

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -r -s /bin/false appuser

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/rustyvault-service /app/rustyvault-service
COPY --from=builder /app/backend/migrations /app/migrations

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 4117

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4117/v1/sys/health || exit 1

CMD ["./rustyvault-service"]

# ===========================
# Stage 6a: YottaDB API Dev Runtime
# ===========================
FROM rust:1.91-slim AS yottadb-api-dev

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    ca-certificates \
    curl \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Copy workspace structure for cargo
COPY backend/Cargo.toml backend/.cargo ./
COPY backend/shared/Cargo.toml ./shared/
COPY backend/authz-core/Cargo.toml ./authz-core/
COPY backend/admin-service/Cargo.toml ./admin-service/
COPY backend/api-service/Cargo.toml ./api-service/
COPY backend/rustyvault-service/Cargo.toml ./rustyvault-service/
COPY backend/yottadb-api/Cargo.toml ./yottadb-api/
COPY backend/state-machine-macro/ ./state-machine-macro/

# Copy source code (volumes will override in docker-compose)
COPY backend/shared/src ./shared/src
COPY backend/authz-core/src ./authz-core/src
COPY backend/admin-service/src ./admin-service/src
COPY backend/api-service/src ./api-service/src
COPY backend/rustyvault-service/src ./rustyvault-service/src
COPY backend/yottadb-api/src ./yottadb-api/src
COPY backend/state-machine-macro/src ./state-machine-macro/src

ENV CARGO_BUILD_JOBS=4
ENV CARGO_NET_GIT_FETCH_WITH_CLI=true

EXPOSE 8080

CMD ["cargo", "run", "--bin", "yottadb-api"]

# ===========================
# Stage 6b: YottaDB API Production Runtime
# ===========================
FROM debian:bookworm-slim AS yottadb-api-prod

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -r -s /bin/false appuser

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/yottadb-api /app/yottadb-api

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["./yottadb-api"]
