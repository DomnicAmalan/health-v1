# Multi-stage build for Docusaurus Documentation Site
# Build context should be ./docs directory

# Dev stage - runs Docusaurus dev server with hot reload
FROM node:22-alpine AS runner-dev

# Install Bun
RUN apk add --no-cache curl bash unzip \
    && curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

# Copy package files for dependency installation
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile || bun install

# Source code will be mounted as volume in docker-compose.dev.yml
EXPOSE 3000

# Start Docusaurus dev server
CMD ["bun", "run", "start", "--host", "0.0.0.0"]

# Dependencies stage (for production builds)
FROM node:22-alpine AS deps

RUN apk add --no-cache curl bash unzip \
    && curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Build stage (production)
FROM node:22-alpine AS builder

RUN apk add --no-cache curl bash unzip \
    && curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Build static site
RUN bun run build

# Production stage - serve with Caddy
FROM caddy:2-alpine AS runner-prod

# Copy built static files
COPY --from=builder /app/build /usr/share/caddy

# Caddyfile for SPA routing
RUN echo ':80 {\n\
    root * /usr/share/caddy\n\
    file_server\n\
    try_files {path} /index.html\n\
    header /health {\n\
        Content-Type text/plain\n\
    }\n\
    respond /health 200 {\n\
        body "OK"\n\
    }\n\
}' > /etc/caddy/Caddyfile

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
