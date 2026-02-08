---
sidebar_position: 2
title: Authentication
description: Login, logout, refresh, and OIDC endpoints
---

# Authentication API

The Health V1 authentication system supports three strategies: token-based JWT authentication for the client application, session-based cookie authentication for the admin dashboard, and Vault token authentication for the RustyVault UI.

## Endpoints

| Method | Path | Auth Required | Description |
|--------|------|:------------:|-------------|
| POST | `/v1/auth/login` | No | Authenticate with email and password |
| POST | `/v1/auth/logout` | Yes | Invalidate the current session |
| POST | `/v1/auth/token` | Yes | Refresh an access token |
| GET | `/v1/auth/userinfo` | Yes | Get the current user's profile |
| GET | `/.well-known/openid-configuration` | No | OIDC discovery document |

---

## POST /v1/auth/login

Authenticate a user with email and password. Returns JWT tokens for the client application or sets a session cookie for the admin dashboard.

**Request Body:**

```json
{
  "email": "provider@clinic.com",
  "password": "secure-password"
}
```

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `email` | string | Yes | User's email address |
| `password` | string | Yes | User's password |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "provider@clinic.com",
      "name": "Dr. Smith",
      "roles": ["provider"]
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `accessToken` | string | JWT access token for API authorization |
| `refreshToken` | string | Long-lived token for obtaining new access tokens |
| `expiresIn` | number | Access token lifetime in seconds |
| `tokenType` | string | Always `"Bearer"` |
| `user` | object | Basic user profile information |

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing email or password |
| 401 | `UNAUTHORIZED` | Invalid credentials |
| 423 | `ACCOUNT_LOCKED` | Account locked after too many failed attempts |

**Frontend Usage:**

```typescript
import { login } from "@/lib/api/auth";

const response = await login({
  email: "provider@clinic.com",
  password: "secure-password",
});
// Tokens are automatically stored in sessionStorage by the API client
```

---

## POST /v1/auth/logout

Invalidate the current session. For token-based auth, the refresh token is revoked on the server. For session-based auth, the session cookie is cleared. The frontend always clears locally stored tokens regardless of whether the server call succeeds.

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Success Response (200):**

```json
{
  "success": true,
  "data": null
}
```

**Frontend Usage:**

```typescript
import { logout } from "@/lib/api/auth";

await logout();
// Tokens are cleared from sessionStorage even if the API call fails
```

---

## POST /v1/auth/token

Refresh an expired access token using a valid refresh token. The server issues a new access token and optionally rotates the refresh token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `refreshToken` | string | Yes | The refresh token from the original login |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "tokenType": "Bearer"
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing refresh token |
| 401 | `UNAUTHORIZED` | Refresh token expired or revoked |

**Frontend Usage:**

```typescript
import { refreshAccessToken } from "@/lib/api/auth";

const response = await refreshAccessToken(currentRefreshToken);
// Both tokens are automatically updated in sessionStorage
```

---

## GET /v1/auth/userinfo

Retrieve the profile of the currently authenticated user. This follows the OIDC UserInfo endpoint convention and returns claims about the authenticated end-user.

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "sub": "550e8400-e29b-41d4-a716-446655440000",
    "email": "provider@clinic.com",
    "name": "Dr. Smith",
    "givenName": "Jane",
    "familyName": "Smith",
    "roles": ["provider"],
    "organizationId": "660e8400-e29b-41d4-a716-446655440000",
    "permissions": ["ehr:read", "ehr:write", "patients:read"]
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid access token |

---

## GET /.well-known/openid-configuration

Returns the OIDC discovery document describing the authorization server's configuration, supported scopes, endpoints, and signing algorithms.

**Success Response (200):**

```json
{
  "issuer": "http://localhost:8080",
  "authorization_endpoint": "http://localhost:8080/v1/auth/authorize",
  "token_endpoint": "http://localhost:8080/v1/auth/token",
  "userinfo_endpoint": "http://localhost:8080/v1/auth/userinfo",
  "jwks_uri": "http://localhost:8080/.well-known/jwks.json",
  "scopes_supported": ["openid", "profile", "email"],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_methods_supported": ["client_secret_post"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["HS256"]
}
```

---

## Authentication Strategies in Detail

### Token Authentication (Client App)

Used by the patient-facing client application. The flow is:

1. User submits email/password to `POST /v1/auth/login`
2. Server returns `accessToken` and `refreshToken`
3. Frontend stores both tokens in `sessionStorage`
4. All subsequent requests include `Authorization: Bearer <accessToken>`
5. When the access token expires, the frontend calls `POST /v1/auth/token` with the refresh token
6. On logout, `POST /v1/auth/logout` revokes server-side tokens and the frontend clears `sessionStorage`

```typescript
const client = createApiClient({
  strategy: "token",
  baseUrl: "http://localhost:8080",
  getAccessToken: () => sessionStorage.getItem("access_token"),
  getRefreshToken: () => sessionStorage.getItem("refresh_token"),
  setTokens: (access, refresh) => {
    if (access) sessionStorage.setItem("access_token", access);
    else sessionStorage.removeItem("access_token");
    if (refresh) sessionStorage.setItem("refresh_token", refresh);
    else sessionStorage.removeItem("refresh_token");
  },
});
```

### Session Authentication (Admin Dashboard)

Used by the admin dashboard. The flow is:

1. User submits credentials to `POST /v1/auth/login`
2. Server sets an HTTP-only session cookie
3. All subsequent requests include `credentials: "include"` to send the cookie
4. The server validates the session cookie on each request
5. Session expires after 8 hours of inactivity

```typescript
const client = createApiClient({
  strategy: "session",
  baseUrl: "http://localhost:8080",
  headers: { "X-App-Type": "admin-ui" },
});
```

### Vault Authentication (RustyVault UI)

Used by the RustyVault secrets management UI. The flow is:

1. User authenticates via `POST /auth/userpass/login/:username` on the Vault service
2. Server returns a Vault token
3. All subsequent requests include the `X-Vault-Token` header
4. Tokens can be renewed via `POST /auth/token/renew-self`

```typescript
const client = createApiClient({
  strategy: "vault",
  baseUrl: "http://localhost:4117/v1",
  getToken: () => useAuthStore.getState().accessToken,
  onAuthError: () => useAuthStore.getState().logout(),
});
```

---

## Session TTLs

| Context | Token/Session TTL | Refresh Token TTL |
|---------|-------------------|-------------------|
| Admin dashboard | 8 hours | N/A (session-based) |
| Client application | 1 hour | 24 hours |
| API service tokens | 1 hour | N/A |
| Vault tokens | Configurable per policy | Renewable |

---

## Security Considerations

- **sessionStorage over localStorage**: Tokens are stored in `sessionStorage` rather than `localStorage` to limit exposure. Session storage is cleared when the browser tab closes, reducing the window of token theft via XSS.

- **PHI sanitization**: Error messages from authentication endpoints are sanitized to prevent leaking Protected Health Information in error responses.

- **Audit logging**: All authentication events (login, logout, token refresh, failed attempts) are recorded in the audit log with 7-year retention for HIPAA compliance.

- **CORS restrictions**: The API server only accepts requests from explicitly allowed frontend origins configured in `CORS_ALLOWED_ORIGINS`.
