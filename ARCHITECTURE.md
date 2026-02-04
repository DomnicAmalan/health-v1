# Health V1 - System Architecture Guide
**Complete System Overview - Who Does What and How They Connect**

---

## 🎯 Quick Overview

Health V1 is a **healthcare management system** with three main parts:

1. **Backend Services** (Rust) - Handle data, security, and business logic
2. **Frontend Apps** (React/TypeScript) - User interfaces
3. **Databases** - Store data (PostgreSQL for app data, YottaDB for EHR)

---

## 📱 Frontend Applications (What Users See)

### 1. Admin Dashboard (Port 5174)
**Who uses it:** Administrators, IT staff
**What it does:** Manage the system
**Connects to:** API Service (port 8080)

**Features:**
- Create/edit users
- Assign roles and permissions
- Manage groups
- View system statistics
- Configure settings

**Technology:** React + TanStack Router + Tauri (desktop app)

---

### 2. Client Application (Port 5175)
**Who uses it:** Doctors, Nurses, Healthcare Staff
**What it does:** Access patient data and clinical workflows
**Connects to:**
- API Service (port 8080) - for auth/users
- YottaDB API (port 9091) - for EHR data

**Features:**
- View patient records
- Access clinical workflows
- Manage prescriptions
- View allergies, problems, vitals
- Execute healthcare workflows

**Technology:** React + TanStack Router + Tauri (desktop app)

---

### 3. RustyVault UI (Port 8215)
**Who uses it:** DevOps, Security Team
**What it does:** Manage secrets and encryption keys
**Connects to:** RustyVault Service (port 4117) - **DIFFERENT SERVICE!**

**Features:**
- Initialize vault
- Unseal vault (Shamir secret sharing)
- Store/retrieve secrets
- Manage policies
- Configure realms (multi-tenancy)

**Technology:** React + TanStack Router + Tauri (desktop app)

**⚠️ IMPORTANT:** This is the ONLY app that connects to RustyVault directly!

---

## 🔧 Backend Services (The Brains)

### 1. API Service (Port 8080) - **MAIN BACKEND**
**Location:** `backend/api-service/`
**Database:** PostgreSQL
**Purpose:** Core application backend

**Responsibilities:**
```
Authentication & Authorization:
├─ Login/Logout (JWT tokens)
├─ Refresh tokens
├─ User info
├─ Session management (8h admin, 24h client, 1h API)
└─ Zanzibar-based permissions

Admin Functions:
├─ User/Role/Permission management
├─ Group management
├─ Dashboard statistics
└─ UI entity registry (pages, buttons, fields)

Vault Proxy:
├─ Request vault tokens (proxies to RustyVault)
├─ Manage DEKs (Data Encryption Keys)
├─ Secret operations
└─ Capabilities check

Workflows:
├─ n8n-style orchestration
├─ Human task queue
├─ Event system
└─ Module connectors (OPD, Pharmacy, Billing)
```

**Key Endpoints:**
```
POST   /api/v1/auth/login          - User login
POST   /api/v1/auth/logout         - User logout
POST   /api/v1/auth/token          - Refresh token
GET    /api/v1/users/me            - Current user info
GET    /api/v1/admin/users         - List users (admin)
POST   /api/v1/admin/users         - Create user (admin)
POST   /api/v1/vault/token         - Request vault token (proxy)
GET    /api/v1/workflows           - List workflows
POST   /api/v1/workflows           - Create workflow
```

---

### 2. RustyVault Service (Port 4117) - **SECRETS VAULT**
**Location:** `backend/rustyvault-service/`
**Database:** PostgreSQL (metadata) + File storage (encrypted secrets)
**Purpose:** Secrets management and encryption

**Responsibilities:**
```
Secrets Management:
├─ KV v1 secrets engine
├─ Barrier encryption (AES-256-GCM)
├─ Shamir secret sharing (5 shares, 3 threshold)
└─ Master key storage

Authentication Backends:
├─ UserPass (username/password)
├─ AppRole (machine-to-machine)
└─ Token-based auth

Authorization:
├─ Policy-based ACL (read/write/delete/list)
├─ Deny-first evaluation
└─ Wildcard path matching (*, +)

Multi-Tenancy:
├─ Realms (organization isolation)
├─ Realm-scoped secrets
├─ Realm-scoped policies
└─ Realm apps

Security:
├─ Audit logging (HIPAA 7-year retention)
├─ Rate limiting (5 attempts/min, 15min lockout)
├─ Constant-time authentication
└─ Atomic token usage limits
```

**Key Endpoints:**
```
GET    /v1/sys/health             - Health check
POST   /v1/sys/init               - Initialize vault
POST   /v1/sys/unseal             - Unseal vault
GET    /v1/sys/seal-status        - Seal status
POST   /v1/auth/userpass/login/:user - UserPass login
POST   /v1/auth/approle/login     - AppRole login
GET    /v1/secret/:path           - Read secret
POST   /v1/secret/:path           - Write secret
DELETE /v1/secret/:path           - Delete secret
GET    /v1/sys/policies/acl/:name - Get policy
```

**⚠️ CRITICAL:** Only RustyVault UI connects here directly. API Service proxies vault requests.

---

### 3. YottaDB API Service (Port 9091) - **EHR BRIDGE**
**Location:** `backend/yottadb-api/`
**Database:** YottaDB (MUMPS globals)
**Purpose:** Bridge between REST API and VistA-style EHR database

**Responsibilities:**
```
Patient Data:
├─ Demographics (name, DOB, SSN, MRN)
├─ Search by MRN/IEN
└─ CRUD operations

Clinical Data:
├─ Problems
├─ Allergies
├─ Vitals
├─ Medications
└─ (Future: Orders, Results, Notes)
```

**Key Endpoints:**
```
GET    /api/v1/ehr/patients       - List patients
GET    /api/v1/ehr/patients/:ien  - Get patient by IEN
POST   /api/v1/ehr/patients       - Create patient
GET    /api/v1/ehr/patients/:ien/problems   - Patient problems
GET    /api/v1/ehr/patients/:ien/allergies  - Patient allergies
```

**How it works:**
1. Receives REST API request
2. Executes shell command to YottaDB container
3. Runs MUMPS code to read/write globals (^DPT, ^AUPNPROB, ^GMRAL)
4. Returns JSON response

---

## 🗄️ Databases

### 1. PostgreSQL (Port 5432)
**Shared by:** API Service + RustyVault Service
**Database Name:** `auth_db`

**Key Tables:**
```
User Management:
├─ users                - User accounts (email, password_hash)
├─ roles                - Role definitions
├─ permissions          - Permission definitions
├─ relationships        - Zanzibar tuples (user:X parent group:Y)
└─ groups               - User groups

Authentication:
├─ refresh_tokens       - OAuth refresh tokens
└─ sessions             - Active sessions (app_type, TTL)

Vault Tables:
├─ vault_policies       - ACL policy documents
├─ vault_tokens         - Vault authentication tokens
├─ vault_users          - UserPass backend users
├─ vault_approles       - AppRole configurations
├─ vault_approle_secret_ids - AppRole secret IDs
├─ vault_realms         - Multi-tenant realms
├─ vault_audit_logs     - Audit trail (7-year retention)

Workflows:
├─ workflows            - Workflow definitions
├─ workflow_instances   - Execution instances
├─ workflow_tasks       - Human task queue
└─ workflow_events      - Event log

Audit & Security:
├─ audit_logs           - System audit trail
└─ request_logs         - HTTP request logs
```

---

### 2. YottaDB (MUMPS Database)
**Used by:** YottaDB API Service
**Container Ports:** 9090 (web), 1338 (M web server)

**MUMPS Globals:**
```
^DPT(IEN)         - Patient demographics
^AUPNPROB(IEN)    - Problem list
^GMRAL(IEN)       - Allergies
```

**VistA-compatible** EHR data storage

---

## 🔐 Authentication Flow

### How Users Log In:

```
1. User enters credentials in UI (Admin/Client)
   │
   ↓
2. UI sends POST /api/v1/auth/login → API Service (port 8080)
   │
   ↓
3. API Service validates against PostgreSQL `users` table
   │
   ↓
4. If valid:
   - Creates JWT token (expires 8h for admin, 24h for client)
   - Creates refresh token (stored in `refresh_tokens` table)
   - Creates session (stored in `sessions` table with app_type)
   │
   ↓
5. Returns tokens to UI
   │
   ↓
6. UI stores in sessionStorage (NOT localStorage for security)
   │
   ↓
7. Subsequent requests include: Authorization: Bearer {token}
   │
   ↓
8. Token refresh via POST /api/v1/auth/token (using refresh token)
```

**Token Expiration:**
- **Admin UI:** 8 hours
- **Client App:** 24 hours
- **API:** 1 hour

---

## 🔒 Vault Integration Flow

### How Secrets are Managed:

```
Initialization (One-time):
1. Admin initializes vault via RustyVault UI
   │
   ↓
2. POST /v1/sys/init → RustyVault Service
   │
   ↓
3. Generates 256-bit master key
   │
   ↓
4. Splits into 5 Shamir shares (need 3 to unseal)
   │
   ↓
5. Returns shares + root token to admin
   │
   ↓
6. Admin stores shares securely (offline)

Daily Unseal:
1. Admin provides 3 shares via RustyVault UI
   │
   ↓
2. POST /v1/sys/unseal → RustyVault Service
   │
   ↓
3. Reconstructs master key from shares
   │
   ↓
4. Unseals vault (enables encryption/decryption)

API Service Usage:
1. API Service fetches master key from RustyVault on startup
   │
   ↓
2. Creates DekManager (Data Encryption Key Manager)
   │
   ↓
3. API Service can now encrypt/decrypt user data
   │
   ↓
4. DEKs stored in RustyVault, wrapped with master key
```

---

## 🏥 EHR Data Flow

### How Clinical Data is Accessed:

```
1. Doctor opens Client App → views patient list
   │
   ↓
2. Client App sends GET /api/v1/ehr/patients → YottaDB API (port 9091)
   │
   ↓
3. YottaDB API executes shell command:
   docker exec yottadb /path/to/yottadb -run LISTPAT^YOTTADBAPI
   │
   ↓
4. MUMPS code runs in YottaDB container:
   - Iterates ^DPT global
   - Formats as JSON
   │
   ↓
5. Returns patient list to Client App
   │
   ↓
6. Client App displays in UI
   │
   ↓
7. PHI access logged via useAuditLog() hook
```

---

## 🔄 Complete Request Flow Examples

### Example 1: Admin Creates a User

```
Admin Dashboard (5174)
    │
    │ POST /api/v1/admin/users
    │ Authorization: Bearer {admin_jwt}
    │ Body: {email, password, role_ids}
    ↓
API Service (8080)
    │
    ├─ Auth middleware: Validate JWT
    ├─ ACL middleware: Check admin:users:create permission
    │
    ├─ Hash password with bcrypt (cost 14)
    ├─ Insert into `users` table
    ├─ Create relationships in `relationships` table
    │
    ↓
PostgreSQL (5432)
    │
    └─ Returns new user ID
    │
    ↓
API Service returns user object to Admin Dashboard
```

---

### Example 2: Doctor Views Patient Allergies

```
Client App (5175)
    │
    │ GET /api/v1/ehr/patients/123/allergies
    │ Authorization: Bearer {doctor_jwt}
    ↓
YottaDB API (9091)
    │
    ├─ Execute shell command to YottaDB
    │
    ↓
YottaDB Container (9090)
    │
    ├─ Run MUMPS: GETALLERGIES^YOTTADBAPI(123)
    ├─ Read ^GMRAL(123)
    ├─ Format as JSON
    │
    ↓
YottaDB API returns JSON to Client App
    │
    ↓
Client App:
    ├─ Displays allergies in UI
    └─ Calls useAuditLog() to log PHI access
```

---

### Example 3: RustyVault UI Stores a Secret

```
RustyVault UI (8215)
    │
    │ POST /v1/secret/database/credentials
    │ X-Vault-Token: hvs.xxxxx
    │ Body: {username: "db_admin", password: "secret123"}
    ↓
RustyVault Service (4117)
    │
    ├─ Auth middleware: Validate token hash
    ├─ ACL middleware: Check policy allows write to path
    │
    ├─ Encrypt with AES-256-GCM (barrier)
    ├─ Generate nonce (OS-level RNG)
    ├─ Store encrypted data in file storage
    ├─ Store metadata in PostgreSQL
    │
    ├─ Audit logger: Log operation
    │   └─ Insert into vault_audit_logs table
    │
    ↓
PostgreSQL (5432)
    │
    └─ Returns success
    │
    ↓
RustyVault Service returns 204 No Content
```

---

## 🌐 Port Reference Card

```
┌─────────────────────────────────────────────────────────┐
│                    QUICK PORT GUIDE                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  FRONTEND (Vite Dev Servers):                           │
│  ├─ 5174  Admin Dashboard                               │
│  ├─ 5175  Client App                                    │
│  └─ 8215  RustyVault UI (⚠️ connects to 4117!)         │
│                                                          │
│  BACKEND (Rust Services):                               │
│  ├─ 8080  API Service (main backend)                    │
│  ├─ 4117  RustyVault Service (secrets)                  │
│  └─ 9091  YottaDB API (EHR bridge)                      │
│                                                          │
│  DATABASES:                                              │
│  ├─ 5432  PostgreSQL (shared)                           │
│  └─ 9090  YottaDB (MUMPS)                               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔗 Connection Matrix

| Frontend App | Connects To | Port | API Prefix |
|--------------|-------------|------|------------|
| Admin Dashboard | API Service | 8080 | /api/v1/* |
| Client App | API Service | 8080 | /api/v1/* |
| Client App | YottaDB API | 9091 | /api/v1/ehr/* |
| RustyVault UI | **RustyVault Service** | **4117** | **/v1/** (⚠️ no /api!) |

---

## 📦 Shared Libraries

### Frontend Shared Library (`cli/packages/libs/shared`)

**Key Files:**
- `api/routes.ts` - All API endpoint definitions (1000+ lines)
- `api/baseClient.ts` - HTTP client with auth strategies
- `types/` - TypeScript types for all entities
- State management (Zustand stores)
- Audit logging hooks (`useAuditLog`, `logPHI`)

**Usage:**
```typescript
import { apiClient } from '@health-v1/shared/api/baseClient';
import { routes } from '@health-v1/shared/api/routes';
import { useAuditLog } from '@health-v1/shared/hooks/useAuditLog';

// Make API call
const users = await apiClient.get(routes.admin.users.list());

// Log PHI access
const { logPHI } = useAuditLog();
logPHI('patient_view', { patientId: '123', fields: ['ssn', 'dob'] });
```

---

### Backend Shared Library (`backend/shared`)

**Key Modules:**
- `domain/` - Core entities (User, Role, Permission, etc.)
- `infrastructure/` - Database, Zanzibar auth, encryption
- `config/` - Settings, environment configuration

**Usage:**
```rust
use shared::domain::entities::User;
use shared::infrastructure::database::DatabaseService;
use shared::infrastructure::encryption::MasterKey;

let db = DatabaseService::new(&pool);
let user = db.get_user_by_email("admin@example.com").await?;
```

---

## 🔧 Environment Configuration

### Critical .env Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/auth_db
DATABASE_MAX_CONNECTIONS=5
DATABASE_MIN_CONNECTIONS=1

# API Service
API_SERVICE_PORT=8080
CORS_ALLOWED_ORIGINS=http://localhost:5174,http://localhost:5175,http://localhost:8215

# RustyVault Service
VAULT_SERVICE_PORT=4117
VAULT_CORS_ORIGINS=http://localhost:8215
VAULT_BCRYPT_COST=14
VAULT_SECRET_SHARES=5
VAULT_SECRET_THRESHOLD=3

# YottaDB API
YOTTADB_API_PORT=9091
YOTTADB_HOST=localhost
YOTTADB_PORT=9090

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRATION=28800  # 8 hours for admin

# Session Management
SESSION_TTL_ADMIN=28800    # 8 hours
SESSION_TTL_CLIENT=86400   # 24 hours
SESSION_TTL_API=3600       # 1 hour
SESSION_CACHE_MAX_SIZE=1000

# Master Key (Fallback)
MASTER_KEY=your-256-bit-hex-key

# Frontend (Vite)
VITE_API_BASE_URL=http://localhost:8080
VITE_YOTTADB_API_BASE_URL=http://localhost:9091
# For RustyVault UI only:
VITE_API_BASE_URL=http://localhost:4117/v1  # Different!
```

---

## 🚀 Starting the System

### Development Mode (All Services)

```bash
# Start backend services (Docker)
make docker-dev

# Start Admin Dashboard
make dev-admin

# Start Client App
make dev-client

# Start RustyVault UI
make dev-vault

# Or start all frontends at once
make dev-all
```

### Individual Services

```bash
# API Service only
cd backend/api-service
cargo run

# RustyVault Service only
cd backend/rustyvault-service
cargo run

# YottaDB API only
cd backend/yottadb-api
cargo run
```

---

## 🔍 Debugging Tips

### Check Service Health

```bash
# API Service
curl http://localhost:8080/health

# RustyVault Service
curl http://localhost:4117/v1/sys/health

# YottaDB API
curl http://localhost:9091/health
```

### View Logs

```bash
# Docker services
docker logs health_v1_api_service
docker logs health_v1_rustyvault_service
docker logs health_v1_yottadb

# Frontend apps
# Check browser console and terminal where dev server is running
```

### Common Issues

**Issue:** Frontend can't connect to backend
- **Check:** CORS configuration includes all frontend ports
- **Check:** Backend service is actually running
- **Check:** Correct API_BASE_URL in .env

**Issue:** RustyVault UI can't connect
- **Fix:** Ensure VITE_API_BASE_URL=http://localhost:4117/v1 (includes /v1!)
- **Fix:** Ensure VAULT_SERVICE_PORT=4117 in backend .env

**Issue:** Authentication fails
- **Check:** JWT_SECRET matches between services
- **Check:** Session not expired
- **Check:** Token stored in sessionStorage

---

## 📊 Data Flow Diagram

```
┌──────────────┐
│    USER      │
└──────┬───────┘
       │
       │ Interacts with
       ↓
┌─────────────────────────────────────────────────┐
│           FRONTEND LAYER (Tauri Apps)          │
├─────────────────────────────────────────────────┤
│                                                 │
│  Admin (5174) ──────┐                          │
│  Client (5175) ─────┼──> Auth, Users, Data     │
│  Vault UI (8215) ───┘                          │
│                                                 │
└──────┬──────────────────────────────────┬──────┘
       │                                   │
       │ HTTP/REST                         │
       ↓                                   ↓
┌─────────────────────────────┐  ┌───────────────────┐
│   API Service (8080)        │  │ RustyVault (4117) │
│   - Authentication          │  │ - Secrets         │
│   - Authorization           │  │ - Encryption      │
│   - User Management         │  │ - Policies        │
│   - Workflow Engine         │  │ - Audit Logs      │
│   - Vault Proxy             │  └────────┬──────────┘
└──────┬──────────────────────┘           │
       │                                   │
       │ Shares DB                         │
       ↓                                   ↓
┌──────────────────────────────────────────────────┐
│           PostgreSQL (5432)                      │
│  - users, roles, permissions, relationships      │
│  - sessions, refresh_tokens, audit_logs          │
│  - vault_policies, vault_tokens, vault_realms    │
│  - workflows, workflow_tasks, workflow_events    │
└──────────────────────────────────────────────────┘

       ↓
┌─────────────────────────────┐
│   YottaDB API (9091)        │
│   - Patient data            │
│   - Clinical records        │
│   - EHR bridge              │
└──────┬──────────────────────┘
       │
       │ Shell commands
       ↓
┌─────────────────────────────┐
│   YottaDB (9090)            │
│   - MUMPS globals           │
│   - ^DPT, ^AUPNPROB, etc.   │
└─────────────────────────────┘
```

---

## 🎓 Summary: Key Takeaways

1. **Three UIs, Three Purposes:**
   - Admin UI → User management (connects to API Service)
   - Client App → Patient care (connects to API Service + YottaDB API)
   - Vault UI → Secrets management (connects to RustyVault Service)

2. **One Main Backend (API Service):**
   - Handles auth, users, permissions, workflows
   - Proxies vault requests
   - Manages encryption keys (DEKs)

3. **Vault is Separate:**
   - Only Vault UI connects directly
   - API Service uses it behind the scenes
   - Stores master key and DEKs

4. **EHR Data is Separate:**
   - YottaDB API bridges REST to MUMPS
   - Only Client App accesses EHR data
   - VistA-compatible clinical data

5. **PostgreSQL is Shared:**
   - All backend services use same database
   - Different tables for different purposes

6. **Security First:**
   - JWT tokens with refresh
   - Session management per app type
   - HIPAA audit logging (7 years)
   - Rate limiting on auth endpoints
   - PHI access logging

---

**For more details, see:**
- `CLAUDE.md` - Project instructions and medical skills
- `ENV.md` - Environment configuration guide
- `COMMANDS.md` - Make commands reference
- `RUSTYVAULT_SECURITY_AUDIT.md` - Security audit
- `SECURITY_IMPLEMENTATION_COMPLETE.md` - Security fixes
