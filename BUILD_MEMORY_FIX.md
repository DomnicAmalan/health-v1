# Fixing Rust Compilation Memory Issues

If you encounter `SIGKILL` errors during Rust compilation (process killed due to memory), use these solutions:

## Quick Fix: Increase Docker Build Memory

### Option 1: Docker Desktop Settings
1. Open Docker Desktop
2. Go to **Settings** → **Resources** → **Advanced**
3. Increase **Memory** to at least **4GB** (8GB recommended for builds)
4. Click **Apply & Restart**

### Option 2: Docker Build with More Memory
```bash
# Build with increased memory limit
docker buildx build --memory=4g --memory-swap=4g -f backend/api-service/Dockerfile .
```

### Option 3: Use BuildKit with Memory Limits
```bash
export DOCKER_BUILDKIT=1
export BUILDKIT_STEP_LOG_MAX_SIZE=50000000
docker build --memory=4g -f backend/api-service/Dockerfile .
```

## Configuration Changes Made

### 1. Limited Parallel Compilation
- Added `CARGO_BUILD_JOBS=2` (defaults to 2 parallel jobs)
- Configured in `backend/.cargo/config.toml`
- Can be overridden via environment variable

### 2. Dev Profile Optimizations
- Added `codegen-units = 4` for dev builds (reduces memory per unit)
- Enabled incremental compilation

### 3. Environment Variables
Add to your `.env`:
```bash
CARGO_BUILD_JOBS=2  # Reduce to 1 if still having issues
```

## Troubleshooting

### If build still fails with 2 jobs:
```bash
# Set to 1 job (slowest but uses least memory)
export CARGO_BUILD_JOBS=1
docker-compose build api-service
```

### If building locally (not in Docker):
```bash
# Set in your shell
export CARGO_BUILD_JOBS=2

# Or create/edit ~/.cargo/config.toml
[build]
jobs = 2
```

### Check available memory:
```bash
# In Docker container
docker exec health-api-service free -h

# On host
free -h
```

## Alternative: Build Outside Docker

If Docker build continues to fail, build locally and copy binary:

```bash
# Build locally
cd backend
CARGO_BUILD_JOBS=2 cargo build --release --bin api-service

# Copy to Docker
docker cp target/release/api-service health-api-service:/app/api-service
```

## Recommended Settings for 512MB RAM Systems

For systems with only 512MB RAM total:
- `CARGO_BUILD_JOBS=1` (single-threaded compilation)
- Build outside Docker if possible
- Use `--release` builds (they use less memory than debug)
- Consider using pre-built binaries or CI/CD for builds

