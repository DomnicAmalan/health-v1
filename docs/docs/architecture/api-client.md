---
sidebar_position: 4
title: API Client
description: Frontend API client architecture with auth strategies
---

# API Client

The Health V1 frontend uses a centralized API client factory that produces authenticated HTTP clients tailored to each application's authentication mechanism. The factory and route definitions live in the `@lazarus-life/shared` package.

## createApiClient Factory

The `createApiClient` function in `cli/packages/libs/shared/src/api/createApiClient.ts` accepts a configuration object and returns a typed API client. Three authentication strategies are supported, one for each frontend application.

```tsx
import { createApiClient } from "@lazarus-life/shared";

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  strategy: "token",  // "token" | "session" | "vault"
});
```

## Authentication Strategies

### 1. TokenAuthClient (client-app)

Used by the clinical application. Implements JWT-based authentication with automatic token refresh.

**How it works:**
- Stores access and refresh tokens in `sessionStorage`
- Attaches `Authorization: Bearer <access_token>` to every request
- Monitors responses for `401 Unauthorized`
- On 401, attempts a silent refresh using the refresh token
- If refresh succeeds, retries the original request with the new access token
- If refresh fails, redirects the user to the login page

```tsx
// cli/packages/apps/client-app/src/lib/api/auth.ts
import { createApiClient } from "@lazarus-life/shared";

export const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,  // http://localhost:8080
  strategy: "token",
  onAuthFailure: () => {
    // Clear tokens and redirect to login
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    window.location.href = "/login";
  },
});
```

**Token lifecycle:**

```
Login -> receive access_token + refresh_token
  |
  v
Store in sessionStorage
  |
  v
Attach Bearer token to requests
  |
  v
401 received? -> attempt refresh with refresh_token
  |                    |
  |                    +-> success: update tokens, retry request
  |                    |
  |                    +-> failure: clear tokens, redirect to login
  v
Tab closed -> sessionStorage cleared automatically
```

### 2. SessionAuthClient (admin)

Used by the admin dashboard. Implements cookie-based session authentication.

**How it works:**
- Relies on `httpOnly` session cookies set by the server
- Sends `credentials: "include"` on every request so cookies are attached
- No client-side token management required
- Server manages session lifecycle and expiration
- On 401, redirects to the admin login page

```tsx
// cli/packages/apps/admin/src/lib/api/index.ts
import { createApiClient } from "@lazarus-life/shared";

export const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,  // http://localhost:8080
  strategy: "session",
  onAuthFailure: () => {
    window.location.href = "/login";
  },
});
```

Session cookies provide CSRF protection when combined with `SameSite` attributes and are not accessible to JavaScript, reducing XSS attack surface.

### 3. VaultAuthClient (rustyvault-ui)

Used by the vault management interface. Implements custom header-based authentication compatible with the HashiCorp Vault API.

**How it works:**
- Stores the vault token in `sessionStorage`
- Attaches `X-Vault-Token: <token>` header to every request
- Automatically unwraps Vault-style `{ data: T }` response envelopes
- Points to the vault service (port 4117), not the main API service

```tsx
// cli/packages/apps/rustyvault-ui/src/lib/api.ts
import { createApiClient } from "@lazarus-life/shared";

export const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,  // http://localhost:4117/v1
  strategy: "vault",
  onAuthFailure: () => {
    sessionStorage.removeItem("vault_token");
    window.location.href = "/login";
  },
});
```

**Response unwrapping:**

The Vault API wraps responses in a `{ data: T }` envelope. The `VaultAuthClient` automatically unwraps this so consumers receive the inner data directly:

```tsx
// Raw Vault API response:
// { "data": { "keys": ["my-secret", "db-password"] } }

// After VaultAuthClient unwrapping:
const secrets = await apiClient.get<SecretList>("/secrets");
// secrets = { keys: ["my-secret", "db-password"] }
```

## Strategy Comparison

| Feature | TokenAuthClient | SessionAuthClient | VaultAuthClient |
|---------|----------------|-------------------|-----------------|
| App | client-app | admin | rustyvault-ui |
| Auth Header | `Authorization: Bearer` | Cookie (automatic) | `X-Vault-Token` |
| Token Storage | sessionStorage | httpOnly cookie (server) | sessionStorage |
| Auto-Refresh | Yes (refresh token) | No (server-managed) | No |
| Response Unwrap | No | No | Yes (`{ data: T }`) |
| API Target | api-service (8080) | api-service (8080) | rustyvault-service (4117) |

## Route Definitions

All API routes are centrally defined in `cli/packages/libs/shared/src/api/routes.ts`. Routes are organized by domain and exported as constants.

### Route Convention

The `/api` prefix is added automatically by the `getApiUrl()` utility. Route definitions must never include `/api`. Versioned endpoints use the `/v1/` prefix.

```tsx
// CORRECT
export const ROUTES = {
  AUTH: {
    LOGIN: "/v1/auth/login",
    LOGOUT: "/v1/auth/logout",
    REFRESH: "/v1/auth/refresh",
    ME: "/v1/auth/me",
  },
  // ...
};

// INCORRECT - never include /api
export const ROUTES = {
  AUTH: {
    LOGIN: "/api/v1/auth/login",  // Wrong: /api is added automatically
  },
};
```

### Route Groups

The route definitions cover the following domains:

```tsx
export const ROUTES = {
  // Authentication & Identity
  AUTH: {
    LOGIN: "/v1/auth/login",
    LOGOUT: "/v1/auth/logout",
    REFRESH: "/v1/auth/refresh",
    ME: "/v1/auth/me",
  },

  // User Management
  USERS: {
    LIST: "/v1/users",
    BY_ID: (id: string) => `/v1/users/${id}`,
    CREATE: "/v1/users",
    UPDATE: (id: string) => `/v1/users/${id}`,
  },

  // Organization
  ORGANIZATIONS: {
    LIST: "/v1/organizations",
    BY_ID: (id: string) => `/v1/organizations/${id}`,
    SETTINGS: (id: string) => `/v1/organizations/${id}/settings`,
  },

  // Patient Management
  PATIENTS: {
    LIST: "/v1/ehr/patients",
    BY_ID: (id: string) => `/v1/ehr/patients/${id}`,
    CREATE: "/v1/ehr/patients",
    SEARCH: "/v1/ehr/patients/search",
  },

  // Electronic Health Records
  EHR: {
    ENCOUNTERS: {
      LIST: "/v1/ehr/encounters",
      BY_ID: (id: string) => `/v1/ehr/encounters/${id}`,
      CREATE: "/v1/ehr/encounters",
    },
    VITALS: {
      LIST: "/v1/ehr/vitals",
      CREATE: "/v1/ehr/vitals",
    },
    PROBLEMS: {
      LIST: "/v1/ehr/problems",
      CREATE: "/v1/ehr/problems",
    },
    LABS: {
      LIST: "/v1/ehr/labs",
      CREATE: "/v1/ehr/labs",
      RESULTS: (id: string) => `/v1/ehr/labs/${id}/results`,
    },
    ORDERS: {
      LIST: "/v1/ehr/orders",
      CREATE: "/v1/ehr/orders",
    },
    CLINICAL_NOTES: {
      LIST: "/v1/ehr/clinical-notes",
      CREATE: "/v1/ehr/clinical-notes",
    },
    IMAGING: {
      LIST: "/v1/ehr/imaging-orders",
      CREATE: "/v1/ehr/imaging-orders",
    },
  },

  // Pharmacy
  PHARMACY: {
    PRESCRIPTIONS: "/v1/pharmacy/prescriptions",
    DRUG_ALLERGIES: "/v1/pharmacy/drug-allergies",
  },

  // Billing
  BILLING: {
    INVOICES: "/v1/billing/invoices",
    PAYMENTS: "/v1/billing/payments",
    SERVICE_CATALOG: "/v1/billing/service-catalog",
  },

  // Departments
  DEPARTMENTS: {
    LIST: "/v1/departments",
  },

  // Workflows
  WORKFLOWS: {
    DEFINITIONS: "/v1/workflows/definitions",
    INSTANCES: "/v1/workflows/instances",
    TASKS: "/v1/workflows/tasks",
  },

  // Rules Engine
  RULES: {
    LIST: "/v1/rules",
  },

  // Analytics
  ANALYTICS: {
    DASHBOARD: "/v1/analytics/dashboard",
  },

  // Vault (proxied through api-service)
  VAULT: {
    SECRETS: "/v1/vault/secrets",
    KEYS: "/v1/vault/keys",
  },

  // Vault Direct (used by rustyvault-ui against port 4117)
  VAULT_DIRECT: {
    SECRETS: "/secret",
    AUTH_TOKEN: "/auth/token",
    AUTH_APPROLE: "/auth/approle",
    AUTH_USERPASS: "/auth/userpass",
    POLICIES: "/sys/policies",
  },
};
```

## Usage Examples

### Making API Calls

```tsx
import { apiClient } from "@/lib/api/auth";
import { ROUTES } from "@lazarus-life/shared";
import type { Patient } from "@lazarus-life/shared";

// GET request
const patients = await apiClient.get<Patient[]>(ROUTES.PATIENTS.LIST, {
  params: { limit: 50, offset: 0 },
});

// POST request
const newPatient = await apiClient.post<Patient>(ROUTES.PATIENTS.CREATE, {
  firstName: "Jane",
  lastName: "Doe",
  dateOfBirth: "1990-01-15",
});

// PUT request
await apiClient.put(ROUTES.PATIENTS.BY_ID(patientId), {
  firstName: "Jane",
  lastName: "Smith",
});

// DELETE request
await apiClient.delete(ROUTES.PATIENTS.BY_ID(patientId));
```

### Using with TanStack Query

```tsx
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/auth";
import { ROUTES } from "@lazarus-life/shared";
import type { Patient } from "@lazarus-life/shared";

export function usePatient(id: string) {
  return useQuery({
    queryKey: ["patients", "detail", id],
    queryFn: () => apiClient.get<Patient>(ROUTES.PATIENTS.BY_ID(id)),
    enabled: Boolean(id),
  });
}
```

## Error Handling

All API client strategies handle HTTP errors uniformly. Non-2xx responses are converted to typed errors:

```tsx
try {
  const patient = await apiClient.get<Patient>(ROUTES.PATIENTS.BY_ID(id));
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 404:
        console.warn("Patient not found");
        break;
      case 403:
        console.warn("Insufficient permissions");
        break;
      default:
        console.error("API error:", error.message);
    }
  }
}
```
