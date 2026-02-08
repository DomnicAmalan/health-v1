---
sidebar_position: 1
title: API Overview
description: Health V1 API architecture and conventions
---

# API Overview

Health V1 exposes two primary backend services. All API communication uses JSON over HTTP.

## Base URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **API Service** | `http://localhost:8080` | Main application API (EHR, billing, workflows, admin) |
| **Vault Service** | `http://localhost:4117/v1` | Secrets management (HashiCorp Vault-compatible) |

The API service handles all clinical, billing, and administrative operations. The Vault service is a standalone secrets management engine with its own authentication model.

## Route Conventions

### Versioning

All routes use a `/v1/` prefix for versioning. The only exception is the health check endpoint at `/health`.

```
GET  /v1/ehr/patients
POST /v1/auth/login
GET  /health
```

### The /api Prefix

The frontend `BaseApiClient` automatically prepends `/api` to most routes when building the request URL. **Never include `/api` in route definitions** -- it is added by the client infrastructure. Auth routes (`/v1/auth/*`) and health check (`/health`) are excluded from the automatic prefix.

```typescript
// In routes.ts -- define WITHOUT /api
PATIENTS: {
  LIST: "/v1/ehr/patients",
  GET: (id: string) => `/v1/ehr/patients/${id}`,
}

// The client builds the final URL:
// http://localhost:8080/api/v1/ehr/patients
```

### Path Parameters

Path parameters use the `:param` syntax in documentation and the Axum router. UUIDs are the standard identifier format for all resources.

```
GET /v1/ehr/patients/:id          -- id is a UUID
GET /v1/ehr/patients/mrn/:mrn     -- mrn is a string
GET /v1/ehr/patients/ien/:ien     -- ien is an integer
```

## Authentication

Health V1 supports three authentication strategies, each used by a different frontend application.

### Token Authentication (Client App)

The client application uses JWT bearer tokens. After login, the server returns an `accessToken` and a `refreshToken`. The access token is sent in the `Authorization` header on subsequent requests.

```
Authorization: Bearer <access_token>
```

Tokens are stored in `sessionStorage` (not `localStorage`) as a security measure against XSS attacks. The access token is short-lived and can be refreshed using the refresh token endpoint.

### Session Authentication (Admin Dashboard)

The admin dashboard uses HTTP-only session cookies. Credentials are sent with `credentials: "include"` on every fetch request, and the server manages session state via cookies.

```
Cookie: session=<session_id>
```

### Vault Authentication (RustyVault UI)

The RustyVault UI authenticates using a custom `X-Vault-Token` header, following the HashiCorp Vault API convention.

```
X-Vault-Token: <vault_token>
```

### Session TTLs

| Context | TTL |
|---------|-----|
| Admin sessions | 8 hours |
| Client sessions | 24 hours |
| API tokens | 1 hour |

## Request Format

All request bodies must be JSON with the `Content-Type: application/json` header. The API client sets this automatically.

```http
POST /v1/ehr/patients HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
  "firstName": "Jane",
  "lastName": "Doe",
  "dateOfBirth": "1990-05-15",
  "sex": "F"
}
```

Field names in JSON payloads use **camelCase** (the Rust backend uses `#[serde(rename_all = "camelCase")]` for serialization).

## Response Format

All successful responses are wrapped in an `ApiResponse` envelope:

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "mrn": "MRN-000001",
    "firstName": "Jane",
    "lastName": "Doe"
  }
}
```

List endpoints return arrays in the `data` field:

```json
{
  "success": true,
  "data": [
    { "id": "...", "mrn": "MRN-000001", "firstName": "Jane" },
    { "id": "...", "mrn": "MRN-000002", "firstName": "John" }
  ]
}
```

### Error Responses

Error responses follow a consistent structure:

```json
{
  "success": false,
  "error": {
    "message": "Patient not found",
    "code": "NOT_FOUND"
  }
}
```

Common error codes:

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request body or query parameters |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Resource conflict (e.g., duplicate MRN) |
| 422 | `UNPROCESSABLE_ENTITY` | Business rule violation |
| 500 | `INTERNAL_ERROR` | Server error |

Error messages are sanitized to remove any PHI (Protected Health Information) patterns before being returned to the client.

## Pagination

List endpoints accept `limit` and `offset` query parameters for pagination.

```
GET /v1/ehr/patients?limit=50&offset=100
```

| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| `limit` | integer | 100 | 1000 |
| `offset` | integer | 0 | -- |

The server enforces a maximum page size of **1000 records** (`MAX_PAGE_SIZE`). Any `limit` value exceeding 1000 is clamped to 1000.

## Timeouts

All database queries are bounded by timeouts to prevent runaway operations:

| Context | Timeout |
|---------|---------|
| Default query | 5 seconds |
| Maximum query | 30 seconds |

Queries that exceed these timeouts return a `504 Gateway Timeout` response.

## Backend Technology

The API service is built with:

- **Rust** with **Axum 0.8** for HTTP routing and middleware
- **SQLx** with **PostgreSQL** for data persistence
- **Compile-time checked SQL queries** -- all queries are verified against the live database schema at build time using `sqlx::query!` and `sqlx::query_as!` macros
- **tracing** for structured logging
- **thiserror** for typed error handling

## Route Groups

The API is organized into the following route groups:

| Group | Prefix | Description |
|-------|--------|-------------|
| [Auth](/api-reference/auth) | `/v1/auth/*` | Login, logout, token refresh, OIDC |
| [Patients](/api-reference/patients) | `/v1/ehr/patients/*` | Patient demographics, search, merge |
| [Encounters](/api-reference/encounters) | `/v1/ehr/encounters/*` | Clinical encounters and diagnoses |
| [Orders](/api-reference/orders) | `/v1/ehr/lab-tests/*`, `/v1/ehr/imaging-orders/*` | Lab orders, imaging orders, results |
| [Scheduling](/api-reference/scheduling) | `/v1/ehr/appointments/*` | Appointment scheduling and check-in |
| [Billing](/api-reference/billing) | `/v1/billing/*` | Invoices, payments, service catalog |
| [Pharmacy](/api-reference/pharmacy) | `/v1/pharmacy/*` | Drug catalog, prescriptions, interactions |
| [Workflows](/api-reference/workflows) | `/v1/workflows/*` | Workflow definitions, instances, tasks |
| [Admin](/api-reference/admin) | `/v1/admin/*`, `/v1/users/*` | Users, roles, permissions, groups |
| Vault | `/v1/vault/*` | Backend-mediated vault secret access |
| Vault Direct | `/sys/*`, `/auth/*`, `/secret/*` | Direct Vault API (RustyVault UI only) |
| EHR Clinical | `/v1/ehr/vital-signs/*`, `/v1/ehr/clinical-notes/*`, `/v1/ehr/problems/*` | Vitals, notes, problem list |
| OPD | `/v1/opd/*` | Outpatient department queue management |
| CDS | `/v1/cds/*` | Clinical decision support alerts |
| Worklist | `/v1/worklist/*` | Universal task queue |
| Communications | `/v1/messages/*`, `/v1/notifications/*` | Internal messaging and notifications |
| Analytics | `/v1/analytics/*` | Clinical, financial, operational dashboards |
| Diagnostics | `/v1/diagnostics/*` | Laboratory (LIS) and radiology (RIS) |
| Departments | `/v1/departments/*` | Wards, beds, OPD queue, IPD admissions, OT |
| Rules | `/v1/rules/*` | Decision rules, tax, clinical CDS, compliance |

## CORS Configuration

The API service is configured to accept requests from the following origins in development:

```
http://localhost:5174   (Admin dashboard)
http://localhost:5175   (Client app)
http://localhost:8215   (RustyVault UI)
```

All three origins must be listed in the `CORS_ALLOWED_ORIGINS` environment variable for cross-origin requests to succeed.

## Frontend API Client

The frontend uses a factory function `createApiClient()` that returns a configured client based on the authentication strategy:

```typescript
import { createApiClient } from "@lazarus-life/shared/api/createApiClient";

// Token-based (Client App)
const client = createApiClient({
  strategy: "token",
  baseUrl: "http://localhost:8080",
  getAccessToken: () => sessionStorage.getItem("access_token"),
});

// Session-based (Admin Dashboard)
const client = createApiClient({
  strategy: "session",
  baseUrl: "http://localhost:8080",
});

// Vault (RustyVault UI)
const client = createApiClient({
  strategy: "vault",
  baseUrl: "http://localhost:4117/v1",
  getToken: () => useAuthStore.getState().accessToken,
});
```

All frontend data fetching uses **TanStack Query** hooks that wrap these API client calls, providing automatic caching, refetching, and optimistic updates.
