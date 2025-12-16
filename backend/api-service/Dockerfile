# Multi-stage build for Rust api-service using cargo-chef
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
COPY backend/shared/Cargo.toml backend/shared/
COPY backend/authz-core/Cargo.toml backend/authz-core/
COPY backend/admin-service/Cargo.toml backend/admin-service/
COPY backend/api-service/Cargo.toml backend/api-service/
COPY backend/rustyvault-service/Cargo.toml backend/rustyvault-service/
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

# Copy source code for all crates
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
        RUSTFLAGS="-C link-arg=-s -A warnings" cargo build --release --bin api-service -j${CARGO_BUILD_JOBS}; \
        cp target/release/api-service /app/api-service; \
    else \
        echo "Running full build with checks and limited parallelism..."; \
        RUSTFLAGS="-C link-arg=-s" cargo build --release --bin api-service -j${CARGO_BUILD_JOBS}; \
        cp target/release/api-service /app/api-service; \
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

# Copy workspace Cargo.toml files (needed for cargo to work)
# Note: docker-compose.dev.yml mounts these as volumes for hot reload
# But we need them in the image as fallback if volumes aren't mounted
COPY backend/Cargo.toml ./
COPY backend/.cargo ./.cargo
COPY backend/shared/Cargo.toml ./shared/
COPY backend/authz-core/Cargo.toml ./authz-core/
COPY backend/admin-service/Cargo.toml ./admin-service/
COPY backend/api-service/Cargo.toml ./api-service/
COPY backend/rustyvault-service/Cargo.toml ./rustyvault-service/

# Copy source code for all workspace members (Cargo needs them to validate)
COPY backend/shared/src ./shared/src
COPY backend/authz-core/src ./authz-core/src
COPY backend/admin-service/src ./admin-service/src
COPY backend/api-service/src ./api-service/src
COPY backend/rustyvault-service/src ./rustyvault-service/src

# Copy migrations (always needed, even in dev mode)
COPY backend/migrations ./migrations

# Set environment variables for low-memory builds
ENV CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-2}
ENV CARGO_NET_GIT_FETCH_WITH_CLI=true

# Expose port
EXPOSE 8080

# In dev mode, use cargo run - it will build on first start
# Source code is mounted as volume in docker-compose for hot reload
# Note: First run will compile everything
# For true hot reload, install cargo-watch: cargo install cargo-watch
# Then use: cargo watch -x 'run --bin api-service'
CMD ["cargo", "run", "--bin", "api-service"]

# Production runtime stage
FROM debian:bookworm-slim AS runner-prod

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -r -s /bin/false appuser

# Set working directory
WORKDIR /app

# Copy binary from builder (only exists in production build)
COPY --from=builder /app/api-service /app/api-service
COPY --from=builder /app/backend/migrations /app/migrations

# Set ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run the application
CMD ["./api-service"]

