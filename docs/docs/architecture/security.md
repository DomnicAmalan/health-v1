---
sidebar_position: 6
title: Security Architecture
description: Authentication, authorization, and security patterns
---

# Security Architecture

Health V1 implements multiple layers of security appropriate for a healthcare platform handling Protected Health Information (PHI). The architecture covers authentication, authorization, encryption, secrets management, and audit logging.

## Authentication

Three distinct authentication mechanisms serve the three frontend applications, each chosen for its security properties and operational context.

### JWT Authentication (client-app)

The clinical application uses JSON Web Token (JWT) authentication with refresh token rotation.

**Flow:**

```
1. User submits credentials to POST /v1/auth/login
2. Server validates credentials, returns:
   - access_token (short-lived, e.g., 15 minutes)
   - refresh_token (longer-lived, e.g., 24 hours)
3. Client stores both in sessionStorage
4. Every request includes: Authorization: Bearer <access_token>
5. On 401, client sends refresh_token to POST /v1/auth/refresh
6. Server validates refresh token, issues new token pair
7. If refresh fails, user is redirected to login
```

**Token configuration:**

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Access token TTL | 15 minutes | Short-lived to limit exposure window |
| Refresh token TTL | 24 hours | Allows day-long clinical sessions |
| Algorithm | HS256 | HMAC-SHA256 signing |
| Secret | `JWT_SECRET` env var | Shared secret for signing/verification |

**Security properties:**
- Tokens are stored in `sessionStorage`, not `localStorage`, so they are scoped to the browser tab and cleared when the tab closes
- Short access token TTL limits the damage window if a token is compromised
- Refresh token rotation ensures old refresh tokens cannot be reused

### Session Cookie Authentication (admin)

The admin dashboard uses server-managed session cookies.

**Flow:**

```
1. Admin submits credentials to POST /v1/auth/login
2. Server creates a session record and sets an httpOnly cookie:
   Set-Cookie: session_id=<uuid>; HttpOnly; Secure; SameSite=Strict; Path=/
3. Browser automatically includes cookie on subsequent requests
4. Server validates session on each request
5. Session expires after configured TTL (8 hours for admin)
```

**Security properties:**
- `HttpOnly` flag prevents JavaScript access, mitigating XSS token theft
- `SameSite=Strict` prevents CSRF by not sending cookies on cross-origin requests
- `Secure` flag ensures cookies are only sent over HTTPS
- Server-side session storage allows immediate revocation

### Vault Token Authentication (rustyvault-ui)

The vault management interface uses custom token-based authentication compatible with the HashiCorp Vault API.

**Flow:**

```
1. User authenticates via AppRole, UserPass, or direct token
2. Server returns a vault token with associated policies
3. Client stores token in sessionStorage
4. Every request includes: X-Vault-Token: <token>
5. Server validates token and checks policies per-request
```

**Token properties:**

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Token TTL | 1 hour | Short-lived for security operations |
| Renewable | Yes | Can be renewed before expiration |
| Policies | Attached at creation | Define permitted operations |

## OIDC Discovery

The platform supports OpenID Connect (OIDC) for federated authentication. Configuration is provided through environment variables:

```bash
OIDC_DISCOVERY_URL=https://idp.example.com/.well-known/openid-configuration
OIDC_CLIENT_ID=health-v1-client
OIDC_CLIENT_SECRET=<secret>
OIDC_REDIRECT_URI=http://localhost:8080/v1/auth/oidc/callback
```

The OIDC flow allows organizations to integrate with their existing identity provider (Azure AD, Okta, Keycloak, etc.) for single sign-on.

## Authorization: authz-core

The `authz-core` crate provides a unified authorization engine supporting both Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC).

### Role-Based Access Control (RBAC)

Users are assigned roles, and roles grant permissions. The system supports hierarchical roles where parent roles inherit child permissions.

```
Organization Admin
  |-- Can manage users, roles, departments, settings
  |-- Can view all patient records
  |
Physician
  |-- Can create/edit encounters, orders, notes
  |-- Can prescribe medications
  |-- Can view assigned patient records
  |
Nurse
  |-- Can record vital signs
  |-- Can view assigned patient records
  |-- Can update encounter status
  |
Front Desk
  |-- Can register patients
  |-- Can manage appointments
  |-- Can manage OPD queue
  |
Billing Staff
  |-- Can create/edit invoices
  |-- Can process payments
  |-- Can view service catalog
```

### Attribute-Based Access Control (ABAC)

For fine-grained access decisions, ABAC policies evaluate attributes of the user, resource, action, and environment:

```rust
// Example ABAC policy evaluation
struct AccessRequest {
    subject: SubjectAttributes,   // user role, department, clearance
    resource: ResourceAttributes, // resource type, owner, sensitivity
    action: ActionType,           // read, write, delete
    environment: EnvAttributes,   // time, IP, location
}

// Policy: Physicians can only access patients in their department
fn evaluate(request: &AccessRequest) -> Decision {
    if request.subject.role == "physician"
        && request.action == ActionType::Read
        && request.resource.resource_type == "patient"
        && request.resource.department == request.subject.department
    {
        Decision::Allow
    } else {
        Decision::Deny
    }
}
```

Policies are stored in the database and evaluated at request time. The engine supports combining algorithms (deny-override, permit-override) for composing multiple policies.

## RustyVault: Secrets Management

RustyVault is a HashiCorp Vault-compatible service providing centralized secrets management. It runs as an independent service on port 4117.

### Capabilities

| Feature | Description |
|---------|-------------|
| Secret Storage | Key-value secret storage with versioning |
| Encryption Keys | Generate, rotate, and manage data encryption keys |
| AppRole Auth | Machine-to-machine authentication with role IDs and secret IDs |
| UserPass Auth | Username/password authentication for human operators |
| Token Auth | Direct token-based authentication |
| Policy Management | Fine-grained access policies for secrets and operations |
| Audit Logging | Every secret access and operation is logged |

### Authentication Methods

**AppRole** (service-to-service):

```
1. Admin creates a role with specific policies
2. Role receives a role_id (public) and secret_id (private)
3. Service authenticates: POST /v1/auth/approle/login
   { "role_id": "...", "secret_id": "..." }
4. Vault returns a token with the role's policies
```

**UserPass** (human operators):

```
1. Admin creates a user with username and password
2. User authenticates: POST /v1/auth/userpass/login/<username>
   { "password": "..." }
3. Vault returns a token with the user's policies
```

### Policy Example

```hcl
# Allow read access to all secrets under the "database/" path
path "secret/data/database/*" {
  capabilities = ["read", "list"]
}

# Allow full access to encryption key operations
path "transit/keys/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Deny access to master key configuration
path "sys/master-key" {
  capabilities = ["deny"]
}
```

## Encryption

### At-Rest Encryption

Data encryption at rest uses a two-tier key architecture:

1. **MASTER_KEY**: A root encryption key provided via environment variable. Used to encrypt/decrypt Data Encryption Keys (DEKs). Never stored in the database.

2. **Data Encryption Keys (DEKs)**: Generated and managed by RustyVault. Used to encrypt sensitive data fields. Stored encrypted (wrapped by the MASTER_KEY) in the vault.

```
MASTER_KEY (env var, never stored in DB)
  |
  +-- encrypts --> DEK_1 (stored encrypted in vault)
  |                  |
  |                  +-- encrypts --> Patient SSN, DOB, etc.
  |
  +-- encrypts --> DEK_2 (stored encrypted in vault)
                     |
                     +-- encrypts --> Insurance data, billing info
```

### DEK Rotation

Data Encryption Keys are rotated periodically. The rotation process:

1. Generate a new DEK version
2. New writes use the latest DEK version
3. Reads decrypt using the DEK version recorded with the ciphertext
4. Background process re-encrypts old data with the new DEK (lazy rotation)

The `/encryption-ops` skill provides tooling for key rotation operations.

## Session Management

Session TTLs are configured per application based on their security requirements:

| Application | Session TTL | Rationale |
|-------------|-------------|-----------|
| admin | 8 hours | Standard workday for admin tasks |
| client-app | 24 hours | Clinical shifts may span long hours |
| api-service | 1 hour | Service-to-service calls are short-lived |
| rustyvault-ui | 1 hour | Security operations should be brief |

All session configuration is centralized in the root `.env` file:

```bash
ADMIN_SESSION_TTL_HOURS=8
CLIENT_SESSION_TTL_HOURS=24
API_SESSION_TTL_HOURS=1
VAULT_SESSION_TTL_HOURS=1
```

## Token Storage: sessionStorage

All frontend applications store authentication tokens in `sessionStorage` rather than `localStorage`. This is a deliberate security decision:

| Property | sessionStorage | localStorage |
|----------|---------------|-------------|
| Scope | Single tab | All tabs |
| Lifetime | Until tab closes | Until explicit deletion |
| XSS exposure | Limited to current tab | All tabs can read |
| Shared devices | Cleared on tab close | Persists after logout if forgotten |

```tsx
// Correct: sessionStorage
sessionStorage.setItem("access_token", token);
const token = sessionStorage.getItem("access_token");

// Never use localStorage for tokens
// localStorage.setItem("access_token", token);  // Security risk
```

## CORS Configuration

Cross-Origin Resource Sharing (CORS) is configured on the backend to allow requests from the three frontend development servers. Missing or incorrect CORS configuration causes silent request failures in the browser.

### Required Configuration

```bash
# Root .env - must include ALL frontend origins
CORS_ALLOWED_ORIGINS=http://localhost:5174,http://localhost:5175,http://localhost:8215
```

### Backend Implementation

```rust
let origins: Vec<HeaderValue> = std::env::var("CORS_ALLOWED_ORIGINS")
    .unwrap_or_default()
    .split(',')
    .filter_map(|o| o.trim().parse().ok())
    .collect();

let cors = CorsLayer::new()
    .allow_origin(origins)
    .allow_methods([
        Method::GET,
        Method::POST,
        Method::PUT,
        Method::DELETE,
        Method::PATCH,
    ])
    .allow_headers(Any)
    .allow_credentials(true);
```

Key points:
- `allow_credentials(true)` is required for session cookie authentication
- All three frontend ports must be listed
- Production deployments replace localhost origins with actual domain names

## PHI Protection

Protected Health Information requires additional safeguards per HIPAA requirements.

### PHI Fields (Always Track and Mask)

The following fields are classified as PHI and must be logged, masked, and encrypted:

- Social Security Number (SSN)
- Email address
- Phone number
- Medical Record Number (MRN)
- Date of birth
- Physical address
- Insurance information
- Credit card numbers

### Frontend PHI Logging

Every access to PHI must be recorded using the `useAuditLog` hook:

```tsx
import { useAuditLog, logPHI } from "@/hooks/useAuditLog";

function PatientSSN({ patientId }: { patientId: string }) {
  const { logAccess } = useAuditLog();
  const [visible, setVisible] = useState(false);

  const handleReveal = () => {
    logAccess({
      action: "VIEW_PHI",
      resourceType: "PATIENT_SSN",
      resourceId: patientId,
    });
    logPHI("ssn_revealed", { patientId });
    setVisible(true);
  };

  return (
    <span>
      {visible ? patient.ssn : "***-**-****"}
      <button onClick={handleReveal}>Reveal</button>
    </span>
  );
}
```

### Error Message Sanitization

Error messages returned to clients are sanitized to remove any PHI that may have been included in the error context:

```rust
impl AppError {
    pub fn sanitized_message(&self) -> String {
        let msg = self.to_string();
        // Strip patterns that look like PHI
        let sanitized = PHI_PATTERNS.iter().fold(msg, |acc, pattern| {
            pattern.replace_all(&acc, "[REDACTED]").to_string()
        });
        sanitized
    }
}
```

### Audit Retention

HIPAA requires a 7-year (2,555 day) retention period for audit logs. All PHI access logs, authentication events, and data modification records are retained for this duration and protected against tampering.
