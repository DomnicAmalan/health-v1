# SonarQube Configuration

This project includes SonarQube configuration for code quality analysis across all components.

## Components

- **Backend** (Rust): `backend/sonar-project.properties`
- **Admin UI** (TypeScript/React): `cli/packages/apps/admin/sonar-project.properties`
- **Client App** (TypeScript/React): `cli/packages/apps/client-app/sonar-project.properties`

## Setup

### 1. Start SonarQube Server

```bash
# Using Docker Compose with sonarqube profile
docker-compose --profile sonarqube up -d sonarqube

# Or using dev compose
docker-compose -f docker-compose.dev.yml --profile sonarqube up -d sonarqube
```

SonarQube will be available at: http://localhost:9000

Default credentials:
- Username: `admin`
- Password: `admin` (change on first login)

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# SonarQube Configuration
SONARQUBE_PORT=9000
SONARQUBE_VERSION=community
SONARQUBE_DB=sonar
SONAR_HOST_URL=http://localhost:9000
SONAR_TOKEN=your-sonarqube-token-here
SONAR_ORGANIZATION=your-org  # Optional, for SonarCloud
```

### 3. Generate SonarQube Token

1. Log in to SonarQube (http://localhost:9000)
2. Go to: **My Account** → **Security** → **Generate Token**
3. Copy the token and add it to `.env` as `SONAR_TOKEN`

## Running Scans

### Using the Script

```bash
# Scan all projects
./scripts/sonar-scan.sh all

# Scan individual projects
./scripts/sonar-scan.sh backend
./scripts/sonar-scan.sh admin-ui
./scripts/sonar-scan.sh client-app
```

### Manual Scanning

#### Backend (Rust)

```bash
cd backend
sonar-scanner \
  -Dsonar.projectKey=health-v1-backend \
  -Dsonar.host.url=$SONAR_HOST_URL \
  -Dsonar.login=$SONAR_TOKEN
```

#### Admin UI (TypeScript/React)

```bash
cd cli/packages/apps/admin
sonar-scanner \
  -Dsonar.projectKey=health-v1-admin-ui \
  -Dsonar.host.url=$SONAR_HOST_URL \
  -Dsonar.login=$SONAR_TOKEN
```

#### Client App (TypeScript/React)

```bash
cd cli/packages/apps/client-app
sonar-scanner \
  -Dsonar.projectKey=health-v1-client-app \
  -Dsonar.host.url=$SONAR_HOST_URL \
  -Dsonar.login=$SONAR_TOKEN
```

### Using Docker (if sonar-scanner not installed)

```bash
# Backend
docker run --rm \
  -v $(pwd)/backend:/usr/src \
  -w /usr/src \
  -e SONAR_HOST_URL=$SONAR_HOST_URL \
  -e SONAR_TOKEN=$SONAR_TOKEN \
  sonarsource/sonar-scanner-cli

# Admin UI
docker run --rm \
  -v $(pwd)/cli/packages/apps/admin:/usr/src \
  -w /usr/src \
  -e SONAR_HOST_URL=$SONAR_HOST_URL \
  -e SONAR_TOKEN=$SONAR_TOKEN \
  sonarsource/sonar-scanner-cli

# Client App
docker run --rm \
  -v $(pwd)/cli/packages/apps/client-app:/usr/src \
  -w /usr/src \
  -e SONAR_HOST_URL=$SONAR_HOST_URL \
  -e SONAR_TOKEN=$SONAR_TOKEN \
  sonarsource/sonar-scanner-cli
```

## Environment-Based Configuration

All SonarQube settings are environment-based:

- `SONAR_HOST_URL`: SonarQube server URL (default: http://localhost:9000)
- `SONAR_TOKEN`: Authentication token (required for authenticated scans)
- `SONAR_ORGANIZATION`: Organization key (for SonarCloud)
- `SONARQUBE_PORT`: SonarQube web port (default: 9000)
- `SONARQUBE_VERSION`: SonarQube image version (default: community)
- `SONARQUBE_DB`: Database name for SonarQube (default: sonar)

## Memory Optimization

SonarQube is configured with memory limits suitable for 512MB RAM systems:

- `SONAR_CE_JAVAOPTS=-Xmx512m -Xms128m`
- `SONAR_WEB_JAVAOPTS=-Xmx512m -Xms128m`
- Container memory limit: 1GB (512MB reservation)

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: SonarQube Scan
  uses: sonarsource/sonarqube-scan-action@master
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
```

### GitLab CI Example

```yaml
sonar-scan:
  image: sonarsource/sonar-scanner-cli
  script:
    - sonar-scanner
      -Dsonar.host.url=$SONAR_HOST_URL
      -Dsonar.login=$SONAR_TOKEN
```

## Troubleshooting

### SonarQube not starting

- Check PostgreSQL is running and healthy
- Verify memory limits are sufficient
- Check logs: `docker logs health-sonarqube`

### Scan fails with authentication error

- Verify `SONAR_TOKEN` is set correctly
- Check token hasn't expired
- Ensure token has proper permissions

### Coverage reports not showing

- Ensure coverage reports are generated (e.g., `lcov.info`)
- Verify paths in `sonar-project.properties` are correct
- Check coverage format matches SonarQube expectations

## Resources

- [SonarQube Documentation](https://docs.sonarqube.org/)
- [SonarScanner Documentation](https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/)
- [SonarQube Docker Image](https://hub.docker.com/_/sonarqube)

