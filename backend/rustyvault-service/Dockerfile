# Multi-stage build for Rust rustyvault-service using cargo-chef
FROM lukemathwalker/cargo-chef:latest-rust-1.91 AS chef
WORKDIR /app

# Build arguments
ARG BUILD_MODE=release
ARG SKIP_CHECKS=false

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Planner stage: compute the recipe
FROM chef AS planner
COPY backend/Cargo.toml backend/
COPY backend/Cargo.lock backend/
COPY backend/.cargo backend/.cargo
# Copy Cargo.toml and minimal source files for each workspace member
COPY backend/shared/Cargo.toml backend/shared/
COPY backend/shared/src/lib.rs backend/shared/src/
COPY backend/authz-core/Cargo.toml backend/authz-core/
COPY backend/authz-core/src/lib.rs backend/authz-core/src/
COPY backend/admin-service/Cargo.toml backend/admin-service/
COPY backend/admin-service/src/lib.rs backend/admin-service/src/
COPY backend/api-service/Cargo.toml backend/api-service/
COPY backend/api-service/src/lib.rs backend/api-service/src/
COPY backend/api-service/src/main.rs backend/api-service/src/
COPY backend/rustyvault-service/Cargo.toml backend/rustyvault-service/
COPY backend/rustyvault-service/src/main.rs backend/rustyvault-service/src/
WORKDIR /app/backend
RUN cargo chef prepare --recipe-path recipe.json

# Builder stage: cache dependencies and build application
FROM chef AS builder

# Set working directory
WORKDIR /app/backend

# Copy recipe from planner
COPY --from=planner /app/backend/recipe.json recipe.json

# Build dependencies - this layer will be cached unless dependencies change
ENV RUST_BACKTRACE=1
ENV SQLX_OFFLINE=false
ENV CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-2}
ENV CARGO_NET_GIT_FETCH_WITH_CLI=true
RUN cargo chef cook --release --recipe-path recipe.json

# Copy workspace files
COPY backend/Cargo.toml ./
COPY backend/Cargo.lock ./
COPY backend/.cargo ./.cargo

# Copy all crate Cargo.toml files
COPY backend/shared/Cargo.toml ./shared/
COPY backend/authz-core/Cargo.toml ./authz-core/
COPY backend/admin-service/Cargo.toml ./admin-service/
COPY backend/api-service/Cargo.toml ./api-service/
COPY backend/rustyvault-service/Cargo.toml ./rustyvault-service/

# Copy source code for all workspace members
COPY backend/shared/src ./shared/src
COPY backend/authz-core/src ./authz-core/src
COPY backend/admin-service/src ./admin-service/src
COPY backend/api-service/src ./api-service/src
COPY backend/rustyvault-service/src ./rustyvault-service/src
COPY backend/migrations ./migrations

# Build the application
RUN if [ "$BUILD_MODE" = "dev" ]; then \
        echo "Dev mode: Skipping build, will use cargo run directly"; \
    elif [ "$SKIP_CHECKS" = "true" ]; then \
        echo "Skipping type checks, building in release mode with limited parallelism..."; \
        RUSTFLAGS="-C link-arg=-s -A warnings" cargo build --release --bin rustyvault-service -j${CARGO_BUILD_JOBS}; \
        cp target/release/rustyvault-service /app/rustyvault-service; \
    else \
        echo "Running full build with checks and limited parallelism..."; \
        RUSTFLAGS="-C link-arg=-s" cargo build --release --bin rustyvault-service -j${CARGO_BUILD_JOBS}; \
        cp target/release/rustyvault-service /app/rustyvault-service; \
    fi

# Dev stage - runs cargo directly (when BUILD_MODE=dev)
FROM rust:1.91-slim AS runner-dev

# Install build and runtime dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app/backend

# Copy workspace Cargo.toml files
COPY backend/Cargo.toml ./
COPY backend/.cargo ./.cargo
COPY backend/shared/Cargo.toml ./shared/
COPY backend/authz-core/Cargo.toml ./authz-core/
COPY backend/admin-service/Cargo.toml ./admin-service/
COPY backend/api-service/Cargo.toml ./api-service/
COPY backend/rustyvault-service/Cargo.toml ./rustyvault-service/

# Copy source code for all workspace members (Cargo needs them)
COPY backend/shared/src ./shared/src
COPY backend/authz-core/src ./authz-core/src
COPY backend/admin-service/src ./admin-service/src
COPY backend/api-service/src ./api-service/src
COPY backend/rustyvault-service/src ./rustyvault-service/src

# Copy migrations
COPY backend/migrations ./migrations

# Set environment variables for low-memory builds
ENV CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-2}
ENV CARGO_NET_GIT_FETCH_WITH_CLI=true

# Expose port
EXPOSE 4117

# In dev mode, use cargo run - it will build on first start
CMD ["cargo", "run", "--bin", "rustyvault-service"]

# Production stage
FROM debian:bookworm-slim AS runner-prod

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libssl3 \
    libpq5 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/data /app/vault-data && \
    chown -R appuser:appuser /app

# Copy binary from builder
COPY --from=builder /app/rustyvault-service /app/rustyvault-service

# Copy migrations
COPY backend/migrations /app/migrations

# Set working directory
WORKDIR /app

# Switch to app user
USER appuser

# Expose port
EXPOSE 4117

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:4117/v1/sys/health || exit 1

# Run the service
CMD ["/app/rustyvault-service"]

