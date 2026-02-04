# Build Optimization Guide

## Quick Reference

Health V1 now uses optimized build configurations that save 20-30 minutes per build cycle.

---

## Docker Build System

### Unified Backend Dockerfile

All backend services (api-service, rustyvault-service, yottadb-api) now build from a single `backend/Dockerfile`:

```bash
# Build all backend services (compiles workspace once)
docker-compose build

# Build specific service (still compiles workspace once, reuses cache)
docker-compose build api-service

# Force rebuild without cache
docker-compose build --no-cache
```

**Key Benefits:**
- Workspace compiled **once** instead of 3 times
- Shared cargo cache across services
- BuildKit cache mounts for faster rebuilds

### Build Arguments

Configure build behavior via `.env`:

```bash
CARGO_BUILD_JOBS=4          # Parallel compilation jobs (default: 4)
SQLX_OFFLINE=true           # Use offline mode (default: true)
BUILD_MODE=release          # Build mode: dev or release
SKIP_CHECKS=false           # Skip type checks (default: false)
```

### Cache Volumes

Persistent volumes speed up rebuilds:

```bash
# Cargo cache volumes (automatically created)
cargo_registry    # Dependency registry cache
cargo_git         # Git repository cache
cargo_target      # Compilation artifacts

# View cache usage
docker volume ls | grep cargo

# Clear cache (forces full rebuild)
docker volume rm health-v1_cargo_registry health-v1_cargo_git health-v1_cargo_target
```

---

## Build Times

### Expected Build Times

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| **First build (cold cache)** | 40 min | 18-20 min | ~20 min |
| **Rebuild (cache hit)** | 40 min | 8-10 min | ~30 min |
| **Rebuild single service** | 15 min | 8-10 min | ~5 min |

### Measuring Build Time

```bash
# Time a full build
time docker-compose build

# Time specific service
time docker-compose build api-service
```

---

## BuildKit

Enable BuildKit for cache mounts (recommended):

```bash
# One-time setup
export DOCKER_BUILDKIT=1

# Or add to ~/.bashrc / ~/.zshrc
echo 'export DOCKER_BUILDKIT=1' >> ~/.bashrc

# Verify BuildKit is active
docker buildx version
```

**BuildKit Benefits:**
- Parallel stage execution
- Incremental rebuilds
- Better cache utilization

---

## Development Workflow

### Hot Reload (Dev Mode)

Development mode uses cargo directly for hot reload:

```bash
# Start dev environment
make docker-dev

# Services use target: *-dev
# Source code mounted as volumes
# Changes trigger rebuild via cargo run
```

### Production Build

Production mode compiles optimized binaries:

```bash
# Start production environment
docker-compose up

# Services use target: *-prod
# Stripped binaries for smaller images
# No source code mounted
```

---

## Troubleshooting

### Build is slow

**Check cache usage:**
```bash
# Verify volumes exist
docker volume ls | grep cargo

# Check BuildKit is enabled
echo $DOCKER_BUILDKIT
```

**Solutions:**
- Enable BuildKit: `export DOCKER_BUILDKIT=1`
- Increase parallelism: Set `CARGO_BUILD_JOBS=8` in `.env` (if you have 16+ cores)
- Clear stale cache: `docker system prune -af --volumes`

### Out of memory during build

**Reduce parallelism:**
```bash
# Edit .env
CARGO_BUILD_JOBS=2

# Or pass as build arg
docker-compose build --build-arg CARGO_BUILD_JOBS=2
```

### SQLx offline mode issues

**Regenerate query metadata:**
```bash
cd backend
cargo sqlx prepare --database-url $DATABASE_URL
```

**Disable offline mode temporarily:**
```bash
# Edit .env
SQLX_OFFLINE=false
```

### Cache not being used

**Verify cache mount syntax:**
```dockerfile
RUN --mount=type=cache,target=/root/.cargo/registry \
    cargo build --release
```

**Check Docker version:**
```bash
docker --version
# Requires Docker 18.09+ for BuildKit
```

---

## Frontend Code (Masking Utilities)

### ⚠️ IMPORTANT: No Duplicates

Masking functions are **consolidated in shared library**:

```typescript
// ✅ CORRECT - Use shared library
import { maskSSN, maskEmail, maskPhone } from '@lazarus-life/shared';

// ❌ WRONG - Don't create local masking files
import { maskSSN } from './masking';  // This file should not exist!
```

### Available Masking Functions

From `@lazarus-life/shared`:

```typescript
import {
  maskField,
  maskSSN,
  maskEmail,
  maskPhone,
  maskMRN,
  maskCreditCard,
  contextualMask,
  maskObject,
  sanitizeErrorMessage,
  type MaskingLevel,
} from '@lazarus-life/shared';
```

### Testing Masking

```bash
# Run shared masking tests
cd cli/packages/libs/shared
bun run test src/utils/masking.test.ts

# App tests reference shared implementation
cd cli/packages/apps/client-app
bun run test src/lib/api/masking.test.ts
```

---

## Configuration Files

### Docker Compose

**Production:** `docker-compose.yml`
- Uses unified `backend/Dockerfile`
- Targets: `*-prod` stages
- No source mounts

**Development:** `docker-compose.dev.yml`
- Uses unified `backend/Dockerfile`
- Targets: `*-dev` stages
- Source code mounted as volumes

### Environment

**Root:** `.env`
- Single source of truth
- Backend + Docker configuration
- Build parallelism settings

**Apps:** `cli/packages/apps/*/.env`
- Vite-specific overrides only
- API URLs and feature flags

---

## Best Practices

### 1. Let Docker Cache Work

```bash
# ✅ Good - Use cache
docker-compose build

# ⚠️ Use sparingly - Clears all cache
docker-compose build --no-cache
```

### 2. Build All Services Together

```bash
# ✅ Good - Shares workspace compilation
docker-compose build

# ⚠️ Less efficient - Still shares cache, but less optimal
docker-compose build api-service
docker-compose build rustyvault-service
```

### 3. Monitor Resource Usage

```bash
# Check Docker resource usage
docker stats

# Check disk usage
docker system df

# Clean up unused resources periodically
docker system prune -af --volumes
```

### 4. Use Development Mode for Development

```bash
# ✅ Good for development - Hot reload
make docker-dev

# ⚠️ Slower for development - Full rebuild on changes
docker-compose up
```

---

## Performance Tuning

### For 8-core machines:
```bash
CARGO_BUILD_JOBS=4  # Use half of cores
```

### For 16-core machines:
```bash
CARGO_BUILD_JOBS=8  # Use half of cores
```

### For 32+ core machines:
```bash
CARGO_BUILD_JOBS=12  # Use ~1/3 of cores
```

### Low memory (< 8GB RAM):
```bash
CARGO_BUILD_JOBS=2  # Reduce memory usage
```

---

## Verification

### Verify Unified Build

```bash
# Check all services use backend/Dockerfile
grep "dockerfile: backend/Dockerfile" docker-compose.yml

# Should show 3 services:
# - api-service
# - rustyvault-service
# - yottadb-api
```

### Verify Cache Volumes

```bash
# Check volumes are mounted
docker-compose config | grep -A 5 "cargo_registry"

# Should show mounts for all 3 backend services
```

### Verify No Duplicate Code

```bash
# Check no duplicate masking files exist
find cli/packages/apps -name "masking.ts" | grep -v node_modules

# Should only return:
# cli/packages/libs/shared/src/utils/masking.ts
```

---

## Getting Help

If builds are still slow:

1. Check BuildKit is enabled: `echo $DOCKER_BUILDKIT`
2. Check cache volumes exist: `docker volume ls | grep cargo`
3. Check disk space: `df -h`
4. Check Docker memory limit: `docker info | grep Memory`
5. Review logs: `docker-compose build 2>&1 | tee build.log`

For more details, see `TECH_DEBT_ELIMINATION_SUMMARY.md`
