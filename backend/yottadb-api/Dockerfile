# YottaDB REST API Service
# Multi-stage build using cargo-chef for proper dependency caching
# Aligned with api-service/rustyvault-service pattern

# ============================================
# Stage 1: Chef base image
# Use Debian 11 (bullseye) to match YottaDB runtime GLIBC 2.31
# ============================================
FROM lukemathwalker/cargo-chef:latest-rust-1.91-bullseye AS chef
WORKDIR /app

# Build arguments
ARG BUILD_MODE=release
ARG SKIP_CHECKS=false
ARG CARGO_BUILD_JOBS=2

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ============================================
# Stage 2: Planner - generate recipe.json
# ============================================
FROM chef AS planner
COPY backend/yottadb-api/Cargo.toml backend/yottadb-api/Cargo.lock* backend/yottadb-api/
COPY backend/yottadb-api/src backend/yottadb-api/src
WORKDIR /app/backend/yottadb-api
RUN cargo chef prepare --recipe-path recipe.json

# ============================================
# Stage 3: Builder - build dependencies then app
# ============================================
FROM chef AS builder

ARG BUILD_MODE=release
ARG SKIP_CHECKS=false
ARG CARGO_BUILD_JOBS=2

WORKDIR /app/backend/yottadb-api
COPY --from=planner /app/backend/yottadb-api/recipe.json recipe.json

ENV RUST_BACKTRACE=1
ENV CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS}

# Build dependencies (cached layer)
RUN cargo chef cook --release --recipe-path recipe.json

# Copy source files
COPY backend/yottadb-api/Cargo.toml backend/yottadb-api/Cargo.lock* ./
COPY backend/yottadb-api/src ./src

# Build the application
RUN if [ "$SKIP_CHECKS" = "true" ]; then \
        RUSTFLAGS="-C link-arg=-s -A warnings" cargo build --release; \
    else \
        RUSTFLAGS="-C link-arg=-s" cargo build --release; \
    fi && \
    cp target/release/yottadb-api /app/yottadb-api

# ============================================
# Stage 4: Dev runner - for development with hot reload
# Executes MUMPS commands in yottadb container via docker exec
# ============================================
FROM rust:1.91-slim AS runner-dev

# Install dependencies including Docker CLI
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    curl \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend/yottadb-api

# Copy source for development
COPY backend/yottadb-api/Cargo.toml backend/yottadb-api/Cargo.lock* ./
COPY backend/yottadb-api/src ./src

ENV CARGO_BUILD_JOBS=2
ENV PORT=8080
ENV RUST_BACKTRACE=1

EXPOSE 8080

CMD ["cargo", "run", "--release"]

# ============================================
# Stage 5: Production runner - using YottaDB base image
# ============================================
FROM download.yottadb.com/yottadb/yottadb-debian:r2.02 AS runner-prod

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (may already exist in base image)
RUN useradd -r -s /bin/false appuser 2>/dev/null || true

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/yottadb-api /app/yottadb-api

# Create startup script that sources YottaDB environment then runs our API
RUN printf '#!/bin/bash\nsource /opt/yottadb/current/ydb_env_set\nexport ydb_routines="/data/r $ydb_routines"\nexec /app/yottadb-api\n' > /app/start.sh && chmod +x /app/start.sh

ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Override entrypoint from base image
ENTRYPOINT []
CMD ["/app/start.sh"]
