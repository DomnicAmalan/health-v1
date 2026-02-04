# Refactoring Guide

**Health V1 - DRY Utilities & Best Practices**

This guide provides examples and patterns for using the DRY utilities created during the codebase refactoring. All utilities eliminate duplicate code while maintaining type safety and improving developer experience.

---

## 📚 Table of Contents

1. [Frontend Utilities](#frontend-utilities)
   - [Query Key Factory](#query-key-factory)
   - [API Response Handler](#api-response-handler)
   - [URL Query Params Builder](#url-query-params-builder)
   - [Vite Configuration](#vite-configuration)
2. [Backend Utilities](#backend-utilities)
   - [String Validation](#string-validation)
   - [Vault Handler Macros](#vault-handler-macros)
   - [Repository Error Mapping](#repository-error-mapping)
3. [Migration Examples](#migration-examples)
4. [Best Practices](#best-practices)

---

## Frontend Utilities

### Query Key Factory

**Purpose:** Eliminates 8-10 lines of boilerplate query key definitions per hook.

**Location:** `cli/packages/libs/shared/src/hooks/factories/createQueryKeyFactory.ts`

#### Before
```typescript
export const EHR_PATIENT_QUERY_KEYS = {
  all: ["ehr", "patients"] as const,
  lists: () => [...EHR_PATIENT_QUERY_KEYS.all, "list"] as const,
  list: (params?: any) => [...EHR_PATIENT_QUERY_KEYS.lists(), params] as const,
  details: () => [...EHR_PATIENT_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...EHR_PATIENT_QUERY_KEYS.details(), id] as const,
};
```

#### After
```typescript
import { createQueryKeyFactory } from "@lazarus-life/shared";

export const EHR_PATIENT_QUERY_KEYS = createQueryKeyFactory("ehr", "patients");

// Can still add custom keys:
export const EHR_PATIENT_KEYS_EXTENDED = {
  ...createQueryKeyFactory("ehr", "patients"),
  byMrn: (mrn: string) => ["ehr", "patients", "mrn", mrn] as const,
};
```

#### Usage
```typescript
// All standard keys available:
queryKey: EHR_PATIENT_QUERY_KEYS.all          // ["ehr", "patients"]
queryKey: EHR_PATIENT_QUERY_KEYS.lists()      // ["ehr", "patients", "list"]
queryKey: EHR_PATIENT_QUERY_KEYS.list(params) // ["ehr", "patients", "list", {...}]
queryKey: EHR_PATIENT_QUERY_KEYS.detail(id)   // ["ehr", "patients", "detail", "123"]
queryKey: EHR_PATIENT_QUERY_KEYS.custom("search", {query}) // ["ehr", "patients", "search", {...}]
```

---

### API Response Handler

**Purpose:** Eliminates 3 lines of error handling per query/mutation function.

**Location:** `cli/packages/libs/shared/src/utils/apiResponseHandler.ts`

#### Before
```typescript
const response = await apiClient.get<Patient>(`/api/patients/${id}`);

if (response.error) throw new Error(response.error.message);
if (!response.data) throw new Error("No data returned");

return response.data;
```

#### After
```typescript
import { unwrapApiResponse } from "@lazarus-life/shared";

const response = await apiClient.get<Patient>(`/api/patients/${id}`);
return unwrapApiResponse(response);
```

#### Available Functions

```typescript
// Standard unwrap - throws if error or no data
unwrapApiResponse<T>(response: ApiResponse<T>): T

// Nullable unwrap - allows null/undefined data
unwrapApiResponseNullable<T>(response: ApiResponse<T>): T | null | undefined

// Type guard
isApiResponseSuccess<T>(response: ApiResponse<T>): boolean

// Extract error message
getApiErrorMessage<T>(response: ApiResponse<T>, defaultMsg?: string): string
```

---

### URL Query Params Builder

**Purpose:** Simplifies URLSearchParams construction (5-8 lines → 1 line).

**Location:** `cli/packages/libs/shared/src/utils/buildQueryParams.ts`

#### Before
```typescript
const queryParams = new URLSearchParams();
if (page !== undefined) queryParams.set("page", String(page));
if (limit !== undefined) queryParams.set("limit", String(limit));
if (search) queryParams.set("search", search);
const queryString = queryParams.toString() ? `?${queryParams}` : "";

const url = `${API_ROUTES.PATIENTS.LIST}${queryString}`;
```

#### After
```typescript
import { buildQueryParams } from "@lazarus-life/shared";

const queryString = buildQueryParams({ page, limit, search });
const url = `${API_ROUTES.PATIENTS.LIST}${queryString}`;

// Or use the combined helper:
const url = buildUrlWithParams(API_ROUTES.PATIENTS.LIST, { page, limit, search });
```

#### Available Functions

```typescript
// Build query string with automatic null/undefined filtering
buildQueryParams(params?: QueryParams): string

// Append params to URL
buildUrlWithParams(baseUrl: string, params?: QueryParams): string

// Parse query string to object
parseQueryParams(queryString: string): Record<string, string>

// Merge multiple param objects
mergeQueryParams(...paramObjects: QueryParams[]): QueryParams
```

---

### Vite Configuration

**Purpose:** Consolidates 70% duplication across Vite configs (54 lines → 11 lines).

**Location:** `cli/packages/config/vite-base.config.ts`

#### Before (54 lines)
```typescript
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: Number(process.env.VITE_PORT) || 5174,
    host: process.env.VITE_HOST || "localhost",
    strictPort: true,
    hmr: { overlay: false },
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "query-vendor": ["@tanstack/react-query"],
          shared: ["@lazarus-life/shared"],
        },
      },
    },
    treeshake: true,
  },
  optimizeDeps: {
    entries: ["src/main.tsx"],
    include: ["react", "react-dom"],
    exclude: ["@lazarus-life/shared"],
  },
  clearScreen: false,
  envPrefix: ["VITE_", "TAURI_"],
});
```

#### After (11 lines)
```typescript
import react from "@vitejs/plugin-react";
import { createViteConfig } from "../../config/vite-base.config";

export default createViteConfig({
  port: 5174,
  appName: "admin",
  plugins: [react()],
  manualChunks: {
    "ui-vendor": ["@lazarus-life/ui-components"],
  },
});
```

#### Options
```typescript
interface ViteConfigOptions {
  port: number;                    // Dev server port
  appName: string;                 // App name for debugging
  plugins?: Plugin[];              // Additional Vite plugins
  manualChunks?: Record<string, string[]>; // Custom chunks (merged with defaults)
  excludeOptimizeDeps?: string[];  // Additional deps to exclude
  includeOptimizeDeps?: string[];  // Additional deps to include
  sourcemap?: boolean;             // Enable sourcemaps (default: false)
  publicDir?: string;              // Custom public directory
  outDir?: string;                 // Build output directory
}
```

---

## Backend Utilities

### String Validation

**Purpose:** Consolidates 27+ identical `trim().is_empty()` checks (4-5 lines → 1 line).

**Location:** `backend/shared/src/infrastructure/validation/mod.rs`

#### Before
```rust
if name.trim().is_empty() {
    return Err(AppError::Validation(
        "Group name cannot be empty".to_string()
    ));
}
```

#### After
```rust
use shared::infrastructure::validation::validate_non_empty;

validate_non_empty(name, "Group name")?;
```

#### Function Signature
```rust
pub fn validate_non_empty(value: &str, field_name: &str) -> AppResult<()>
```

---

### Vault Handler Macros

**Purpose:** Eliminates 250+ lines of repeated validation boilerplate across vault handlers.

**Location:** `backend/rustyvault-service/src/http/macros.rs`

#### 1. Context Validation - `require_context!`

**Before (5 lines)**
```rust
let policy_store = state.policy_store.as_ref().ok_or_else(|| {
    (
        StatusCode::SERVICE_UNAVAILABLE,
        Json(json!({ "error": "policy store not initialized" })),
    )
})?;
```

**After (1 line)**
```rust
use crate::require_context;

let policy_store = require_context!(state, policy_store, "policy store not initialized");
```

#### 2. UUID Parsing - `parse_uuid!`

**Before (5 lines)**
```rust
let realm_uuid = Uuid::parse_str(&realm_id).map_err(|_| {
    (
        StatusCode::BAD_REQUEST,
        Json(json!({ "error": "invalid realm ID" })),
    )
})?;
```

**After (1 line)**
```rust
use crate::parse_uuid;

let realm_uuid = parse_uuid!(realm_id, "realm ID");
```

#### 3. Field Extraction - `require_field!`

**Before (6 lines)**
```rust
let policy_content = payload
    .get("policy")
    .and_then(|v| v.as_str())
    .ok_or_else(|| {
        (StatusCode::BAD_REQUEST, Json(json!({ "error": "policy content is required" })))
    })?;
```

**After (1 line)**
```rust
use crate::require_field;

let policy_content = require_field!(payload, "policy", as_str, "policy content is required");
```

#### 4. Error Response - `error_response!`

**Before**
```rust
return Err((
    StatusCode::NOT_FOUND,
    Json(json!({ "error": "policy not found" })),
));
```

**After**
```rust
use crate::error_response;

return error_response!(NOT_FOUND, "policy not found");
```

#### 5. Success Response - `success_response!`

**Before**
```rust
Ok(Json(json!({
    "name": policy.name,
    "policy": policy.raw,
})))
```

**After**
```rust
use crate::success_response;

success_response!({
    "name": policy.name,
    "policy": policy.raw,
})
```

---

### Repository Error Mapping

**Purpose:** Adds structured logging and context to all database operations.

**Location:** `backend/shared/src/infrastructure/database/repository_ext.rs`

#### Before
```rust
sqlx::query_as::<_, Group>(&query)
    .fetch_one(&pool)
    .await
    .map_err(|e| AppError::Database(e))?
```

#### After
```rust
use crate::infrastructure::database::RepositoryErrorExt;

sqlx::query_as::<_, Group>(&query)
    .fetch_one(&pool)
    .await
    .map_db_error("fetch", "group")?
```

#### Logging Output
```
ERROR: Database error during fetch group
  operation: "fetch"
  entity: "group"
  error: "no rows returned by a query that expected to return at least one row"
```

#### Available Methods
```rust
// Standard error mapping with context
.map_db_error(operation: &str, entity: &str) -> AppResult<T>

// Custom error message
.map_db_error_msg(message: &str) -> AppResult<T>
```

#### Common Operations
- `"create"` - INSERT operations
- `"fetch"` - SELECT operations
- `"update"` - UPDATE operations
- `"delete"` - DELETE operations
- `"list"` - SELECT multiple rows
- `"count"` - COUNT operations

---

## Migration Examples

### Complete Hook Migration

#### Before (useEhrMedications.ts)
```typescript
import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/yottadb-client";

export const EHR_MEDICATION_QUERY_KEYS = {
  all: ["ehr", "medications"] as const,
  lists: () => [...EHR_MEDICATION_QUERY_KEYS.all, "list"] as const,
  list: (params) => [...EHR_MEDICATION_QUERY_KEYS.lists(), params] as const,
  detail: (id: string) => [...EHR_MEDICATION_QUERY_KEYS.all, "detail", id] as const,
};

export function useEhrMedications(patientId: string) {
  return useQuery({
    queryKey: EHR_MEDICATION_QUERY_KEYS.list({ patientId }),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (patientId) queryParams.set("patientId", patientId);

      const url = `${API_ROUTES.EHR.MEDICATIONS.LIST}?${queryParams.toString()}`;
      const response = await apiClient.get(url);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      return response.data;
    },
  });
}
```

#### After
```typescript
import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/yottadb-client";
import {
  createQueryKeyFactory,
  unwrapApiResponse,
  buildQueryParams
} from "@lazarus-life/shared";

export const EHR_MEDICATION_QUERY_KEYS = createQueryKeyFactory("ehr", "medications");

export function useEhrMedications(patientId: string) {
  return useQuery({
    queryKey: EHR_MEDICATION_QUERY_KEYS.list({ patientId }),
    queryFn: async () => {
      const queryString = buildQueryParams({ patientId });
      const url = `${API_ROUTES.EHR.MEDICATIONS.LIST}${queryString}`;
      const response = await apiClient.get(url);

      return unwrapApiResponse(response);
    },
  });
}
```

**Lines saved:** 10 lines (20% reduction)

---

### Complete Repository Migration

#### Before (user_repository_impl.rs)
```rust
use crate::domain::entities::User;
use crate::shared::AppResult;
use sqlx::PgPool;

pub struct UserRepositoryImpl {
    pool: PgPool,
}

impl UserRepository for UserRepositoryImpl {
    async fn create(&self, user: User) -> AppResult<User> {
        sqlx::query_as::<_, User>("INSERT INTO users ... RETURNING *")
            .bind(&user.email)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| AppError::Database(e))
    }

    async fn find_by_id(&self, id: Uuid) -> AppResult<Option<User>> {
        sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| AppError::Database(e))
    }
}
```

#### After
```rust
use crate::domain::entities::User;
use crate::infrastructure::database::RepositoryErrorExt;
use crate::shared::AppResult;
use sqlx::PgPool;

pub struct UserRepositoryImpl {
    pool: PgPool,
}

impl UserRepository for UserRepositoryImpl {
    async fn create(&self, user: User) -> AppResult<User> {
        sqlx::query_as::<_, User>("INSERT INTO users ... RETURNING *")
            .bind(&user.email)
            .fetch_one(&self.pool)
            .await
            .map_db_error("create", "user")
    }

    async fn find_by_id(&self, id: Uuid) -> AppResult<Option<User>> {
        sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_db_error("fetch", "user")
    }
}
```

**Benefits:** Automatic structured logging, consistent error messages

---

## Best Practices

### When to Use Each Utility

#### Query Key Factory
✅ **Use when:** Creating query keys for any TanStack Query hook
✅ **Benefit:** Consistent structure, reduced boilerplate
❌ **Don't use:** For non-TanStack Query code

#### API Response Handler
✅ **Use when:** Any API call that returns `ApiResponse<T>`
✅ **Benefit:** Consistent error handling, reduced code
❌ **Don't use:** For non-API operations or when you need custom error handling

#### URL Query Params Builder
✅ **Use when:** Building URLs with query parameters
✅ **Benefit:** Automatic null/undefined filtering, cleaner code
❌ **Don't use:** For simple URLs with no params

#### Vault Macros
✅ **Use when:** Writing vault handler functions
✅ **Benefit:** Consistent validation, reduced boilerplate
❌ **Don't use:** Outside of vault handler context

#### Repository Error Mapping
✅ **Use when:** Any database query in repositories
✅ **Benefit:** Automatic logging, operation context
❌ **Don't use:** For non-database errors

---

### Code Review Checklist

When reviewing PRs that add new hooks/repositories:

- [ ] Uses `createQueryKeyFactory` for query keys
- [ ] Uses `unwrapApiResponse` for error handling
- [ ] Uses `buildQueryParams` for URL construction
- [ ] Uses vault macros in handler functions
- [ ] Uses `.map_db_error()` in repository methods
- [ ] No duplicate error handling patterns
- [ ] Proper operation names in error mapping

---

### Common Mistakes

#### ❌ Wrong: Manual query keys
```typescript
const KEYS = {
  all: ["domain", "resource"],
  list: () => [...KEYS.all, "list"],
};
```

#### ✅ Right: Factory pattern
```typescript
const KEYS = createQueryKeyFactory("domain", "resource");
```

---

#### ❌ Wrong: Inline error handling
```typescript
if (response.error) throw new Error(response.error.message);
if (!response.data) throw new Error("No data");
return response.data;
```

#### ✅ Right: Utility function
```typescript
return unwrapApiResponse(response);
```

---

#### ❌ Wrong: Manual URLSearchParams
```typescript
const params = new URLSearchParams();
if (page) params.set("page", String(page));
const query = params.toString() ? `?${params}` : "";
```

#### ✅ Right: Utility function
```typescript
const query = buildQueryParams({ page });
```

---

#### ❌ Wrong: Direct error mapping
```rust
.map_err(|e| AppError::Database(e))
```

#### ✅ Right: Context mapping
```rust
.map_db_error("create", "user")
```

---

## Additional Resources

- **Implementation Progress:** `DRY_IMPLEMENTATION_PROGRESS.md`
- **Completion Summary:** `DRY_ELIMINATION_COMPLETE.md`
- **Inline Documentation:** All utilities have comprehensive JSDoc/Rustdoc

---

## Questions?

For questions or issues with these utilities:
1. Check inline documentation (JSDoc/Rustdoc)
2. Review migration examples in this guide
3. Look at migrated files as reference implementations

**Remember:** These utilities are designed to make your life easier. If something feels cumbersome, there's likely a better pattern available!
