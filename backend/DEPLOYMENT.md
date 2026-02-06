# Health V1 Deployment Guide

Complete guide for deploying the Health V1 healthcare system to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [Monitoring & Observability](#monitoring--observability)
6. [Backup & Recovery](#backup--recovery)
7. [Security Hardening](#security-hardening)
8. [Scaling](#scaling)

---

## Prerequisites

### System Requirements

**Minimum Production Specifications**:
- CPU: 4 cores
- RAM: 8GB
- Disk: 100GB SSD
- OS: Ubuntu 22.04 LTS or RHEL 8+

**Recommended Production Specifications**:
- CPU: 8+ cores
- RAM: 16GB+
- Disk: 500GB SSD (NVMe preferred)
- OS: Ubuntu 22.04 LTS

### Software Dependencies

- PostgreSQL 14+
- Redis 6+ (for sessions/cache)
- Nginx or Traefik (reverse proxy)
- Docker & Docker Compose (optional)
- systemd (for service management)

---

## Environment Setup

### 1. Create Deployment User

```bash
sudo useradd -r -m -d /opt/health-v1 -s /bin/bash health-v1
sudo mkdir -p /opt/health-v1/{bin,logs,data}
sudo chown -R health-v1:health-v1 /opt/health-v1
```

### 2. Environment Variables

Create `/opt/health-v1/.env`:

```bash
# Server Configuration
API_SERVICE_PORT=8080
RUST_LOG=info
ENVIRONMENT=production

# Database
DATABASE_URL=postgresql://health_user:${DB_PASSWORD}@localhost:5432/health_v1_prod
DATABASE_MAX_CONNECTIONS=100
DATABASE_MIN_CONNECTIONS=10

# Authentication
JWT_SECRET=${JWT_SECRET}  # Generate with: openssl rand -base64 64
JWT_EXPIRATION_HOURS=24
REFRESH_TOKEN_EXPIRATION_DAYS=30

# CORS
CORS_ALLOWED_ORIGINS=https://app.yourhealth.com,https://admin.yourhealth.com

# Session Management
SESSION_SECRET=${SESSION_SECRET}  # Generate with: openssl rand -base64 64
SESSION_TIMEOUT_MINUTES=30

# Encryption (PHI Data Encryption Keys)
MASTER_KEY=${MASTER_KEY}  # Generate with: openssl rand -base64 32
DEK_ROTATION_DAYS=90

# External Services
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=${SMTP_USERNAME}
SMTP_PASSWORD=${SMTP_PASSWORD}
SMTP_FROM=noreply@yourhealth.com

# Monitoring
SENTRY_DSN=${SENTRY_DSN}  # Optional: error tracking
PROMETHEUS_METRICS_PORT=9090

# Feature Flags
ENABLE_PACS_INTEGRATION=true
ENABLE_HL7_INTEGRATION=false
ENABLE_FHIR_API=false
```

### 3. Generate Secrets

```bash
# JWT Secret
echo "JWT_SECRET=$(openssl rand -base64 64)" >> .env

# Session Secret
echo "SESSION_SECRET=$(openssl rand -base64 64)" >> .env

# Master Encryption Key (CRITICAL - Store in vault!)
echo "MASTER_KEY=$(openssl rand -base64 32)" >> .env

# Database Password
echo "DB_PASSWORD=$(openssl rand -base64 32)" >> .env
```

**⚠️ CRITICAL**: Store `MASTER_KEY` in a secure vault (HashiCorp Vault, AWS Secrets Manager). If lost, encrypted PHI data cannot be recovered.

---

## Database Setup

### 1. Create Production Database

```bash
# As postgres user
sudo -u postgres psql

CREATE DATABASE health_v1_prod;
CREATE USER health_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE health_v1_prod TO health_user;

# Performance tuning
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;  # For SSD
ALTER SYSTEM SET effective_io_concurrency = 200;  # For SSD
ALTER SYSTEM SET work_mem = '10MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';

# Reload configuration
SELECT pg_reload_conf();
```

### 2. Run Migrations

```bash
cd /opt/health-v1/backend
export DATABASE_URL="postgresql://health_user:password@localhost:5432/health_v1_prod"

# Verify migrations
sqlx migrate info

# Run all migrations
sqlx migrate run

# Verify migration status
sqlx migrate info
```

### 3. Seed Initial Data

```bash
# Create organizations, default roles, etc.
psql -U health_user -d health_v1_prod -f scripts/seed-production.sql
```

---

## Application Deployment

### Option 1: Systemd Service (Recommended)

#### 1. Build Release Binary

```bash
cd /opt/health-v1/backend
cargo build --release --bin api-service

# Copy binary
sudo cp target/release/api-service /opt/health-v1/bin/
sudo chown health-v1:health-v1 /opt/health-v1/bin/api-service
sudo chmod +x /opt/health-v1/bin/api-service
```

#### 2. Create Systemd Service

Create `/etc/systemd/system/health-v1-api.service`:

```ini
[Unit]
Description=Health V1 API Service
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=health-v1
Group=health-v1
WorkingDirectory=/opt/health-v1
EnvironmentFile=/opt/health-v1/.env
ExecStart=/opt/health-v1/bin/api-service
Restart=always
RestartSec=10
StandardOutput=append:/opt/health-v1/logs/api-service.log
StandardError=append:/opt/health-v1/logs/api-service-error.log

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/health-v1/logs /opt/health-v1/data

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
```

#### 3. Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable health-v1-api
sudo systemctl start health-v1-api

# Check status
sudo systemctl status health-v1-api

# View logs
sudo journalctl -u health-v1-api -f
```

### Option 2: Docker Deployment

#### 1. Build Docker Image

```bash
cd /opt/health-v1/backend
docker build -t health-v1-api:latest -f Dockerfile .
```

#### 2. Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  api-service:
    image: health-v1-api:latest
    restart: always
    ports:
      - "8080:8080"
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  postgres:
    image: postgres:14-alpine
    restart: always
    environment:
      POSTGRES_DB: health_v1_prod
      POSTGRES_USER: health_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U health_user -d health_v1_prod"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api-service

volumes:
  postgres_data:
  redis_data:
```

#### 3. Start Services

```bash
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f api-service
```

---

## Reverse Proxy Setup

### Nginx Configuration

Create `/etc/nginx/sites-available/health-v1`:

```nginx
# Upstream API servers
upstream health_api {
    least_conn;
    server localhost:8080 max_fails=3 fail_timeout=30s;
    # Add more servers for load balancing:
    # server localhost:8081 max_fails=3 fail_timeout=30s;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name api.yourhealth.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name api.yourhealth.com;

    # SSL certificates
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # CORS (if needed)
    add_header Access-Control-Allow-Origin "https://app.yourhealth.com" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;

    # Rate limiting
    location /v1/auth/ {
        limit_req zone=auth_limit burst=10 nodelay;
        proxy_pass http://health_api;
        include proxy_params;
    }

    location /v1/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://health_api;
        include proxy_params;
    }

    # Health check (no rate limiting)
    location /health {
        proxy_pass http://health_api;
        access_log off;
    }

    # Request size limits (for file uploads)
    client_max_body_size 10M;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Access logs
    access_log /var/log/nginx/health-v1-access.log;
    error_log /var/log/nginx/health-v1-error.log;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/health-v1 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Monitoring & Observability

### 1. Prometheus Metrics

Add to `api-service`:

```rust
// Already included in Health V1
// Metrics endpoint: GET /metrics
```

Prometheus config (`/etc/prometheus/prometheus.yml`):

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'health-v1-api'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: '/metrics'
```

### 2. Grafana Dashboards

Import pre-built dashboards:
- API Request Rate & Latency
- Database Connection Pool
- Error Rates by Endpoint
- Queue Depths (Lab orders, imaging orders, worklist)

### 3. Log Aggregation

Use ELK Stack or Loki:

```bash
# Install Loki
wget https://github.com/grafana/loki/releases/download/v2.8.0/loki-linux-amd64.zip
unzip loki-linux-amd64.zip
sudo mv loki-linux-amd64 /usr/local/bin/loki
sudo chmod +x /usr/local/bin/loki

# Start Loki
loki --config.file=/etc/loki/config.yml
```

### 4. Health Checks

```bash
# API health
curl https://api.yourhealth.com/health

# Database health
pg_isready -h localhost -p 5432 -U health_user

# Service status
systemctl status health-v1-api
```

---

## Backup & Recovery

### 1. Database Backups

**Daily Automated Backups**:

Create `/opt/health-v1/scripts/backup-database.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/opt/health-v1/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/health_v1_prod_$TIMESTAMP.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump database (encrypted)
pg_dump -U health_user -d health_v1_prod | gzip > $BACKUP_FILE

# Encrypt backup
openssl enc -aes-256-cbc -salt -in $BACKUP_FILE \
    -out $BACKUP_FILE.enc -pass file:/opt/health-v1/.backup-key

# Remove unencrypted backup
rm $BACKUP_FILE

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz.enc" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_FILE.enc s3://your-backup-bucket/health-v1/

echo "Backup completed: $BACKUP_FILE.enc"
```

**Cron Job** (`/etc/cron.d/health-v1-backup`):

```
0 2 * * * health-v1 /opt/health-v1/scripts/backup-database.sh >> /opt/health-v1/logs/backup.log 2>&1
```

### 2. Restore from Backup

```bash
# Decrypt backup
openssl enc -aes-256-cbc -d -in backup_file.sql.gz.enc \
    -out backup_file.sql.gz -pass file:/opt/health-v1/.backup-key

# Restore
gunzip < backup_file.sql.gz | psql -U health_user -d health_v1_prod
```

---

## Security Hardening

### 1. Firewall Rules

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# Block direct database access from outside
sudo ufw deny 5432/tcp
```

### 2. Fail2Ban

```bash
sudo apt install fail2ban

# Configure for SSH and Nginx
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourhealth.com
```

Auto-renewal:
```bash
sudo certbot renew --dry-run
```

### 4. Audit Logging

Enable PostgreSQL audit logging:

```sql
ALTER SYSTEM SET log_statement = 'mod';  # Log all modifications
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';
ALTER SYSTEM SET log_duration = 'on';
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';
SELECT pg_reload_conf();
```

---

## Scaling

### Horizontal Scaling

1. **Multiple API Instances**:
   ```bash
   # Start multiple instances on different ports
   systemctl start health-v1-api@8080
   systemctl start health-v1-api@8081
   systemctl start health-v1-api@8082
   ```

2. **Load Balancer** (Nginx upstream):
   ```nginx
   upstream health_api {
       least_conn;
       server localhost:8080;
       server localhost:8081;
       server localhost:8082;
   }
   ```

### Database Scaling

1. **Read Replicas**:
   - Configure PostgreSQL streaming replication
   - Route read-only queries to replicas

2. **Connection Pooling** (PgBouncer):
   ```bash
   sudo apt install pgbouncer
   ```

   Configure `/etc/pgbouncer/pgbouncer.ini`:
   ```ini
   [databases]
   health_v1_prod = host=localhost port=5432 dbname=health_v1_prod

   [pgbouncer]
   listen_addr = 127.0.0.1
   listen_port = 6432
   auth_type = md5
   auth_file = /etc/pgbouncer/userlist.txt
   pool_mode = transaction
   max_client_conn = 1000
   default_pool_size = 25
   ```

---

## Rollback Procedure

If deployment fails:

1. **Stop new service**:
   ```bash
   sudo systemctl stop health-v1-api
   ```

2. **Restore previous binary**:
   ```bash
   sudo cp /opt/health-v1/bin/api-service.backup /opt/health-v1/bin/api-service
   ```

3. **Rollback migrations** (if needed):
   ```bash
   sqlx migrate revert
   ```

4. **Restart service**:
   ```bash
   sudo systemctl start health-v1-api
   ```

---

## Post-Deployment Checklist

- [ ] All migrations applied successfully
- [ ] Service health check passing
- [ ] Logs show no errors
- [ ] Database connections working
- [ ] SSL certificate valid
- [ ] Monitoring dashboards showing data
- [ ] Backup script tested
- [ ] Load testing completed
- [ ] Security scan passed
- [ ] Documentation updated
- [ ] Team notified of deployment

---

## Support

For deployment issues:
- Check logs: `sudo journalctl -u health-v1-api -n 100`
- Check service status: `sudo systemctl status health-v1-api`
- Database connectivity: `psql -U health_user -d health_v1_prod -c "SELECT version();"`
- Review deployment logs

## References

- [API Reference](./API_REFERENCE.md)
- [Architecture Documentation](./ARCHITECTURE.md)
- [Security & Compliance](./SECURITY.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
