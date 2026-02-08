---
sidebar_position: 3
title: Environment Configuration
description: Unified environment configuration strategy for Health V1
---

# Environment Configuration

This guide explains the unified environment configuration strategy for the Health V1 monorepo.

## Overview

Health V1 uses a **hierarchical environment configuration** with:

- **Root `.env`** -- Single source of truth for all shared configuration.
- **App-specific `.env` files** -- Vite-only overrides (frontend apps).
- **No docker-compose defaults** -- All required variables MUST be in `.env`. Docker will fail with a clear error if any are missing.

## Quick Start

### 1. Set up the root environment file

```bash
# Copy the example file (if you are a new developer)
cp .env.example .env

# Edit with your values
vim .env
```

### Default Development Credentials

After running migrations (`make db-migrate`), a default admin user is created:

```
Email:    admin@example.com
Password: admin123
```

:::warning
Change this password immediately in production. These credentials are for development only.
:::

### 2. Set up app-specific environment files

```bash
# Admin UI
cp cli/packages/apps/admin/.env.example cli/packages/apps/admin/.env

# Client App
cp cli/packages/apps/client-app/.env.example cli/packages/apps/client-app/.env

# RustyVault UI
cp cli/packages/apps/rustyvault-ui/.env.example cli/packages/apps/rustyvault-ui/.env
```

### 3. Validate configuration

```bash
# Run validation script to check for missing variables
./scripts/validate-env.sh
```

### 4. Start services

```bash
# Start backend services (Docker)
make docker-dev

# Start frontend dev servers (choose one or run in parallel terminals)
make dev-admin        # Admin UI on port 5174
make dev-client       # Client app on port 5175
make dev-vault        # Vault UI on port 8215
make dev-all          # All frontends in parallel
```

## File Structure

```
health-v1/
├── .env                    # Root config (SINGLE SOURCE OF TRUTH)
├── .env.example            # Template for new developers
├── docker-compose.dev.yml  # References .env (no defaults!)
├── docker-compose.yml      # References .env (no defaults!)
└── cli/packages/apps/
    ├── admin/
    │   ├── .env            # Vite-specific overrides only
    │   └── .env.example
    ├── client-app/
    │   ├── .env            # Vite-specific overrides only
    │   └── .env.example
    └── rustyvault-ui/
        ├── .env            # Vite-specific overrides only
        └── .env.example
```

## Port Mapping

| Service | Port | Variable | Used By | Notes |
|---------|------|----------|---------|-------|
| **API Service** | 8080 | `API_SERVICE_PORT` | admin, client-app | Main backend API |
| **RustyVault Service** | 4117 | `VAULT_SERVICE_PORT` | rustyvault-ui | Secrets management (different service!) |
| **PostgreSQL** | 5432 | `POSTGRES_PORT` | backend services | Database |
| **Admin UI** | 5174 | `ADMIN_UI_PORT` | Vite dev server | Admin dashboard |
| **Client App** | 5175 | `CLIENT_APP_PORT` | Vite dev server | Patient-facing app |
| **Vault UI** | 8215 | `VAULT_UI_PORT` | Vite dev server | Vault management (NOTE: 8215!) |

### Port Naming Convention

- **`<SERVICE>_PORT`** -- External/exposed port (what you access from the host machine).
- **`SERVER_PORT`** -- Internal port the backend listens on (inside Docker).
- **`VITE_PORT`** -- Vite dev server port (frontend apps).

Example:

```bash
API_SERVICE_PORT=8080      # External port (docker-compose ports mapping)
SERVER_PORT=8080           # Internal port (what backend binds to)
```

## Variable Categories

### Required Variables (MUST be in .env)

These variables have NO defaults in docker-compose. Docker will fail if they are missing.

#### 1. Database Configuration

```bash
POSTGRES_USER=auth_user
POSTGRES_PASSWORD=auth_password
POSTGRES_DB=auth_db
POSTGRES_PORT=5432
```

#### 2. Service Ports

```bash
# Backend services
API_SERVICE_PORT=8080
SERVER_PORT=8080
VAULT_SERVICE_PORT=4117
VAULT_SERVER_PORT=4117

# Frontend dev servers
ADMIN_UI_PORT=5174
CLIENT_APP_PORT=5175
VAULT_UI_PORT=8215
```

#### 3. Security and Authentication

```bash
# JWT Configuration (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars

# OIDC Configuration
OIDC_ISSUER=http://localhost:8080
OIDC_CLIENT_ID=default-client
OIDC_CLIENT_SECRET=default-secret

# Master encryption key (32 bytes hex, CHANGE IN PRODUCTION!)
MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

#### 4. KMS/Vault Configuration

```bash
KMS_PROVIDER=rustyvault
VAULT_TOKEN=dev-root-token
VAULT_MOUNT_PATH=secret
```

#### 5. Storage Configuration

```bash
STORAGE_PROVIDER=encrypted_local
```

#### 6. Session Configuration

```bash
SESSION_ADMIN_UI_TTL_HOURS=8
SESSION_CLIENT_UI_TTL_HOURS=24
SESSION_API_TTL_HOURS=1
```

#### 7. CORS Configuration

```bash
# CRITICAL: Must include ALL frontend dev server URLs
CORS_ALLOWED_ORIGINS=http://localhost:5174,http://localhost:5175,http://localhost:8215,http://localhost:5173

# App-specific CORS (legacy - prefer CORS_ALLOWED_ORIGINS)
CORS_ADMIN_UI_ORIGINS=http://localhost:5174
CORS_CLIENT_UI_ORIGINS=http://localhost:5175
VAULT_CORS_ORIGINS=*
```

### Optional Variables (have defaults in code or docker-compose)

#### Build and Deployment

```bash
LOG_LEVEL=info                     # Default: info
RUST_LOG=info                      # Default: info
DEPLOYMENT_ENV=development         # Default: development
CLOUD_PROVIDER=none                # Default: none
```

#### Resource Limits (512MB RAM optimization)

```bash
DATABASE_MAX_CONNECTIONS=5         # Default: 5
DATABASE_MIN_CONNECTIONS=1         # Default: 1
TOKIO_WORKER_THREADS=2             # Default: 2
CARGO_BUILD_JOBS=2                 # Default: 2
GRAPH_CACHE_ENABLED=true           # Default: true
GRAPH_CACHE_TTL_SECONDS=60         # Default: 60
SESSION_CACHE_MAX_ENTRIES=1000     # Default: 1000
```

#### Service Enable Flags

```bash
ENABLE_POSTGRES=true               # Default: true
ENABLE_RUSTYVAULT=true             # Default: true
ENABLE_NATS=false                  # Default: false
ENABLE_KAFKA=false                 # Default: false
ENABLE_SONARQUBE=false             # Default: false
```

### Frontend-Specific Variables (Vite)

All frontend variables use the `VITE_` prefix for build-time injection by Vite.

#### Admin UI

Location: `cli/packages/apps/admin/.env`

```bash
VITE_PORT=5174
VITE_API_BASE_URL=http://localhost:8080          # -> API Service (8080)
VITE_OIDC_ISSUER=http://localhost:8080
VITE_OIDC_CLIENT_ID=admin-client
VITE_OIDC_REDIRECT_URI=http://localhost:5174     # Must match VITE_PORT!
```

#### Client App

Location: `cli/packages/apps/client-app/.env`

```bash
VITE_PORT=5175
VITE_API_BASE_URL=http://localhost:8080          # -> API Service (8080)
VITE_OIDC_ISSUER=http://localhost:8080
VITE_OIDC_CLIENT_ID=client-app
VITE_OIDC_REDIRECT_URI=http://localhost:5175     # Must match VITE_PORT!
```

#### RustyVault UI

Location: `cli/packages/apps/rustyvault-ui/.env`

```bash
VITE_PORT=8215
VITE_API_BASE_URL=http://localhost:4117/v1       # -> Vault Service (4117, NOT 8080!)
# Note: Vault UI does not use OIDC
```

## Critical Configuration Rules

### 1. API URL Correctness

**Admin and Client apps** connect to the **API Service** (port 8080):

```bash
VITE_API_BASE_URL=http://localhost:8080
```

**Vault UI** connects to the **Vault Service** (port 4117):

```bash
VITE_API_BASE_URL=http://localhost:4117/v1      # Note the /v1 prefix!
```

:::danger
This is the most common configuration mistake. The Vault UI talks to a completely different backend service than the Admin and Client apps. Using port 8080 for the Vault UI will result in 404 errors.
:::

### 2. CORS Configuration

CORS must include **ALL** frontend dev server URLs:

```bash
# Include admin (5174), client (5175), vault (8215), and any extras
CORS_ALLOWED_ORIGINS=http://localhost:5174,http://localhost:5175,http://localhost:8215,http://localhost:5173
```

Missing a URL? You will get CORS errors in the browser console.

### 3. OIDC Redirect URIs

Each app's redirect URI **MUST match** its Vite dev server port:

```bash
# Admin UI
VITE_OIDC_REDIRECT_URI=http://localhost:5174

# Client App
VITE_OIDC_REDIRECT_URI=http://localhost:5175
```

### 4. Vault UI Port (Common Mistake!)

The Vault UI runs on port **8215**, NOT 5176:

```bash
VAULT_UI_PORT=8215             # Correct
VAULT_UI_PORT=5176             # Wrong (old value)
```

## Troubleshooting

### Docker fails to start with "missing variable" error

**Symptom:**

```
ERROR: The Kubernetes variable is not set. Defaulting to a blank string.
```

**Solution:** Add the missing variable to the root `.env` file. This is intentional -- required variables must be explicitly set, with no hidden defaults in docker-compose files.

### CORS errors in browser console

**Symptom:**

```
Access to XMLHttpRequest at 'http://localhost:8080/api/v1/users' from origin
'http://localhost:5174' has been blocked by CORS policy
```

**Solution:** Check that `CORS_ALLOWED_ORIGINS` in the root `.env` includes the frontend URL:

```bash
CORS_ALLOWED_ORIGINS=http://localhost:5174,http://localhost:5175,http://localhost:8215
```

### Frontend cannot connect to backend (404 errors)

**Symptom:**

```
GET http://localhost:4117/api/v1/users 404 (Not Found)
```

**Solution:** Verify `VITE_API_BASE_URL` in the app's `.env` file:

- **Admin and Client apps** should use `http://localhost:8080` (API Service).
- **Vault UI** should use `http://localhost:4117/v1` (Vault Service).

### Port already in use

**Symptom:**

```
Error: listen EADDRINUSE: address already in use :::5174
```

**Solution:** Find and stop the process using the port:

```bash
lsof -i :5174          # Find process using port 5174
kill -9 <PID>          # Kill the process
```

Or change the port in the app's `.env` file (and update CORS and redirect URIs accordingly).

### Authentication redirect fails

**Symptom:** After login, the redirect goes to the wrong URL or fails entirely.

**Solution:** Ensure `VITE_OIDC_REDIRECT_URI` matches the Vite dev server URL:

```bash
# Admin UI
VITE_OIDC_REDIRECT_URI=http://localhost:5174    # Must match VITE_PORT

# Client App
VITE_OIDC_REDIRECT_URI=http://localhost:5175    # Must match VITE_PORT
```

### Vault UI shows "Network Error"

**Symptom:** Vault UI cannot connect to the backend.

**Solution:** Verify that the Vault UI is using the correct API URL:

```bash
# In cli/packages/apps/rustyvault-ui/.env
VITE_API_BASE_URL=http://localhost:4117/v1    # Must include /v1 prefix!
```

Also ensure the RustyVault service is running:

```bash
docker ps | grep rustyvault-service
```

### Error: "Executable not found in $PATH: xdg-open" (Docker)

**Symptom:**

```
Error: Executable not found in $PATH: "xdg-open"
    at spawn (node:child_process:669:35)
```

**Cause:** Vite is trying to auto-open a browser inside a Docker container, which has no display.

**Solution:** Set `VITE_OPEN=false` in the app's `.env` file:

```bash
# In cli/packages/apps/*/.env
VITE_OPEN=false    # Do not auto-open browser
```

When running Vite dev servers locally (outside Docker) with `make dev-*`, you can set `VITE_OPEN=true` to auto-open your browser.

## Validation Checklist

Before starting development, verify:

- [ ] Root `.env` exists and contains all required variables
- [ ] All three app `.env` files exist
- [ ] `CORS_ALLOWED_ORIGINS` includes all frontend URLs (5174, 5175, 8215)
- [ ] Admin and Client use `VITE_API_BASE_URL=http://localhost:8080`
- [ ] Vault UI uses `VITE_API_BASE_URL=http://localhost:4117/v1`
- [ ] `VITE_OIDC_REDIRECT_URI` matches each app's `VITE_PORT`
- [ ] All security secrets changed from defaults (production only)

Run the validation script:

```bash
./scripts/validate-env.sh
```

## Environment File Templates

### Root .env Template

See `.env.example` in the project root for a complete template with all required variables and safe defaults.

### App .env Templates

See `.env.example` files in each app directory:

- `cli/packages/apps/admin/.env.example`
- `cli/packages/apps/client-app/.env.example`
- `cli/packages/apps/rustyvault-ui/.env.example`

## Advanced Configuration

### Using Different Ports

If you need to change ports (for example, if 5174 is already in use):

1. Update the root `.env`:

   ```bash
   ADMIN_UI_PORT=5180    # Change to new port
   ```

2. Update the app `.env`:

   ```bash
   VITE_PORT=5180
   VITE_OIDC_REDIRECT_URI=http://localhost:5180
   ```

3. Update CORS in the root `.env`:

   ```bash
   CORS_ALLOWED_ORIGINS=http://localhost:5180,http://localhost:5175,http://localhost:8215
   ```

### Production Deployment

For production, ensure you:

1. **Change all security secrets:**

   ```bash
   JWT_SECRET=$(openssl rand -base64 32)
   MASTER_KEY=$(openssl rand -hex 32)
   VAULT_TOKEN=$(openssl rand -base64 32)
   ```

2. **Update CORS to production URLs:**

   ```bash
   CORS_ALLOWED_ORIGINS=https://admin.example.com,https://app.example.com,https://vault.example.com
   ```

3. **Update API URLs:**

   ```bash
   VITE_API_BASE_URL=https://api.example.com
   VITE_VAULT_API_BASE_URL=https://vault.example.com/v1
   ```

4. **Set deployment environment:**

   ```bash
   DEPLOYMENT_ENV=production
   LOG_LEVEL=warn
   ```
