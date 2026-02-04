# Health V1 - System Connections (Simple Visual)

## 🎨 Simple Connection Diagram

```
WHO USES WHAT:

Administrators/IT Staff
        │
        └──> Admin Dashboard (http://localhost:5174)
                    │
                    │ Makes API calls to
                    ↓
            API Service (http://localhost:8080/api)
                    │
                    ├──> PostgreSQL Database
                    │
                    └──> (Behind scenes) RustyVault Service
                              for encryption keys


Doctors/Nurses/Healthcare Staff
        │
        └──> Client App (http://localhost:5175)
                    │
                    ├──> API Service (http://localhost:8080/api)
                    │         └──> PostgreSQL Database
                    │
                    └──> YottaDB API (http://localhost:9091/api)
                              └──> YottaDB Container (EHR data)


DevOps/Security Team
        │
        └──> RustyVault UI (http://localhost:8215)
                    │
                    │ Makes API calls to
                    ↓
            RustyVault Service (http://localhost:4117/v1)
                    │
                    └──> PostgreSQL Database
```

---

## 🔌 Port Connections (Who Talks to Who)

```
Frontend → Backend Connections:

Admin Dashboard (5174) ────────────> API Service (8080)
                                     Uses: /api/v1/*

Client App (5175) ─────────────────┬> API Service (8080)
                                   │ Uses: /api/v1/*
                                   │
                                   └> YottaDB API (9091)
                                     Uses: /api/v1/ehr/*

RustyVault UI (8215) ──────────────> RustyVault Service (4117)
                                     Uses: /v1/* (NO /api prefix!)


Backend → Database Connections:

API Service (8080) ────────────────> PostgreSQL (5432)
                                     Database: auth_db

RustyVault Service (4117) ─────────> PostgreSQL (5432)
                                     Database: auth_db (shared!)

YottaDB API (9091) ────────────────> YottaDB (9090)
                                     MUMPS globals
```

---

## 📝 API Endpoint Cheat Sheet

### For Admin Dashboard (port 5174):
```
Base URL: http://localhost:8080/api

Login:
  POST /v1/auth/login
  Body: { email, password }

Users:
  GET    /v1/admin/users
  POST   /v1/admin/users
  GET    /v1/admin/users/:id
  PUT    /v1/admin/users/:id
  DELETE /v1/admin/users/:id

Permissions:
  GET    /v1/admin/permissions
  POST   /v1/admin/permissions

Groups:
  GET    /v1/admin/groups
  POST   /v1/admin/groups
```

---

### For Client App (port 5175):
```
Base URL for Auth/Users: http://localhost:8080/api
Base URL for EHR: http://localhost:9091/api

Login:
  POST /v1/auth/login
  Body: { email, password }

Patients:
  GET  /v1/ehr/patients
  GET  /v1/ehr/patients/:ien
  POST /v1/ehr/patients

Clinical Data:
  GET /v1/ehr/patients/:ien/problems
  GET /v1/ehr/patients/:ien/allergies
  GET /v1/ehr/patients/:ien/vitals

Workflows:
  GET  /v1/workflows
  POST /v1/workflows
  POST /v1/workflows/:id/instances
  GET  /v1/tasks
```

---

### For RustyVault UI (port 8215):
```
Base URL: http://localhost:4117/v1  ← DIFFERENT! No /api prefix!

System:
  GET  /sys/health
  POST /sys/init
  POST /sys/unseal
  GET  /sys/seal-status

Auth:
  POST /auth/userpass/login/:username
  POST /auth/approle/login

Secrets:
  GET    /secret/:path
  POST   /secret/:path
  DELETE /secret/:path
  GET    /secret/:path/  (list)

Policies:
  GET    /sys/policies/acl/:name
  POST   /sys/policies/acl/:name
  DELETE /sys/policies/acl/:name
  GET    /sys/policies/acl  (list)

Realms:
  GET    /sys/realm
  POST   /sys/realm
  GET    /realm/:id/apps
```

---

## 🔐 Authentication Examples

### Example 1: Admin Logs In
```bash
# Step 1: Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!"
  }'

# Response:
{
  "token": "eyJhbGc...",      # JWT token (expires in 8 hours)
  "refresh_token": "abc123",  # Refresh token
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "roles": ["admin"]
  }
}

# Step 2: Use token for subsequent requests
curl -X GET http://localhost:8080/api/v1/admin/users \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### Example 2: Doctor Accesses Patient Data
```bash
# Step 1: Login (same as above)
TOKEN="eyJhbGc..."

# Step 2: Get patients
curl -X GET http://localhost:9091/api/v1/ehr/patients \
  -H "Authorization: Bearer $TOKEN"

# Step 3: Get patient allergies
curl -X GET http://localhost:9091/api/v1/ehr/patients/123/allergies \
  -H "Authorization: Bearer $TOKEN"

# Frontend automatically logs PHI access via useAuditLog() hook
```

---

### Example 3: DevOps Accesses Vault
```bash
# Step 1: Login to vault
curl -X POST http://localhost:4117/v1/auth/userpass/login/vaultadmin \
  -d '{"password": "vaultpass"}'

# Response:
{
  "client_token": "hvs.xxxxx",
  "accessor": "accessor.xxxxx",
  "policies": ["default", "admin"]
}

# Step 2: Read secret
curl -X GET http://localhost:4117/v1/secret/database/credentials \
  -H "X-Vault-Token: hvs.xxxxx"

# Response:
{
  "data": {
    "username": "db_admin",
    "password": "secret123"
  }
}
```

---

## 🛠️ Common Development Workflows

### Workflow 1: Add a New User (Admin Dashboard)
```
1. Admin opens Admin Dashboard (http://localhost:5174)
2. Navigate to Users page
3. Click "Create User" button
4. Fill in form:
   - Email: newuser@example.com
   - Password: SecurePass123!
   - Roles: [doctor]
5. Click Submit

Behind the scenes:
├─ Frontend: POST http://localhost:8080/api/v1/admin/users
├─ Backend: Validates, hashes password (bcrypt cost 14)
├─ Database: Inserts into users table, creates relationships
└─ Response: Returns new user object
```

---

### Workflow 2: View Patient Record (Client App)
```
1. Doctor opens Client App (http://localhost:5175)
2. Navigate to Patients page
3. Search for patient by MRN: "12345"
4. Click on patient name
5. View demographics, problems, allergies

Behind the scenes:
├─ Frontend: GET http://localhost:9091/api/v1/ehr/patients?mrn=12345
├─ YottaDB API: Executes MUMPS: GETPAT^YOTTADBAPI("12345")
├─ YottaDB: Reads ^DPT global, finds IEN for MRN 12345
├─ Response: Returns patient data as JSON
└─ Frontend: Calls useAuditLog() to log PHI access
```

---

### Workflow 3: Store Database Password (Vault UI)
```
1. DevOps opens RustyVault UI (http://localhost:8215)
2. Unseal vault (if sealed)
3. Navigate to Secrets
4. Click "Create Secret"
5. Path: database/prod/credentials
6. Data:
   - username: prod_db_admin
   - password: SuperSecretPass123!
7. Click Save

Behind the scenes:
├─ Frontend: POST http://localhost:4117/v1/secret/database/prod/credentials
├─ RustyVault: Validates token, checks ACL policies
├─ Encryption: AES-256-GCM with OS-generated nonce
├─ Storage: Saves encrypted blob to file, metadata to PostgreSQL
├─ Audit: Logs operation to vault_audit_logs (7-year retention)
└─ Response: 204 No Content (success)
```

---

## 🐛 Troubleshooting Guide

### Problem: Admin Dashboard shows "Network Error"

**Check:**
```bash
# Is API Service running?
curl http://localhost:8080/health

# Check CORS settings
curl -H "Origin: http://localhost:5174" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:8080/api/v1/users

# Check frontend .env
cat cli/packages/apps/admin/.env
# Should have: VITE_API_BASE_URL=http://localhost:8080
```

**Solution:**
- Ensure API Service is running: `make docker-dev`
- Verify CORS_ALLOWED_ORIGINS includes http://localhost:5174
- Clear browser cache and sessionStorage

---

### Problem: RustyVault UI can't connect

**Check:**
```bash
# Is RustyVault Service running?
curl http://localhost:4117/v1/sys/health

# Check frontend .env
cat cli/packages/apps/rustyvault-ui/.env
# Should have: VITE_API_BASE_URL=http://localhost:4117/v1
#             (NOTE: includes /v1 prefix!)
```

**Solution:**
- Ensure RustyVault Service is running
- Verify VITE_API_BASE_URL includes /v1 prefix
- Check VAULT_SERVICE_PORT=4117 in backend .env

---

### Problem: "Authentication failed" in Client App

**Check:**
```bash
# Test login directly
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password"
  }'

# Check user exists
psql $DATABASE_URL -c "SELECT email FROM users WHERE email='test@example.com';"
```

**Solution:**
- Create user via Admin Dashboard first
- Check password is correct (case-sensitive)
- Verify JWT_SECRET is set in backend .env
- Check session hasn't expired (8h admin, 24h client)

---

### Problem: YottaDB API returns empty patient list

**Check:**
```bash
# Is YottaDB container running?
docker ps | grep yottadb

# Test YottaDB directly
docker exec yottadb yottadb -run %XCMD 'w $zv'

# Check if globals exist
docker exec yottadb yottadb -run %XCMD 'd ^DPT'
```

**Solution:**
- Seed sample data: `make db-seed` (if available)
- Create test patient via YottaDB API
- Check YOTTADB_HOST and YOTTADB_PORT in .env

---

## 📚 Quick Reference

### Make Commands
```bash
make dev              # Interactive app selector
make dev-admin        # Start Admin Dashboard
make dev-client       # Start Client App
make dev-vault        # Start RustyVault UI
make dev-all          # Start all frontends

make docker-dev       # Start all backend services
make docker-dev-logs  # View backend logs

make test             # Run tests
make lint             # Run linters
```

### Docker Commands
```bash
# View logs
docker logs health_v1_api_service
docker logs health_v1_rustyvault_service
docker logs health_v1_yottadb

# Restart service
docker restart health_v1_api_service

# Check database
docker exec -it health_v1_postgres psql -U postgres -d auth_db
```

### Database Queries
```sql
-- Check users
SELECT email, created_at FROM users;

-- Check sessions
SELECT user_id, app_type, expires_at FROM sessions WHERE active = true;

-- Check audit logs
SELECT timestamp, operation, path FROM vault_audit_logs ORDER BY timestamp DESC LIMIT 10;

-- Check workflows
SELECT name, status FROM workflows;
```

---

## 🎯 Key Takeaways

1. **Admin Dashboard** (5174) → **API Service** (8080) for user management
2. **Client App** (5175) → **API Service** (8080) + **YottaDB API** (9091) for patient care
3. **Vault UI** (8215) → **RustyVault Service** (4117) for secrets
4. All backend services share **PostgreSQL** (5432)
5. EHR data lives in **YottaDB** (9090) accessed via YottaDB API

**Remember:** RustyVault UI is the ONLY app with a different API URL pattern (/v1/ instead of /api/v1/)!
