# Client Apps Duplication Analysis Report

> **Status: FIXED** - Package versions aligned and i18n consolidated on $(date +%Y-%m-%d)

This report documents duplications found across the three client applications:
- `admin` (cli/packages/apps/admin)
- `client-app` (cli/packages/apps/client-app)
- `rustyvault-ui` (cli/packages/apps/rustyvault-ui)

---

## Table of Contents
1. [Package.json Dependency Duplications](#1-packagejson-dependency-duplications)
2. [i18n System Duplications](#2-i18n-system-duplications)
3. [API Client Duplications](#3-api-client-duplications)
4. [Component Duplications](#4-component-duplications)
5. [Recommendations](#5-recommendations)
6. [Migration Paths](#6-migration-paths)

---

## 1. Package.json Dependency Duplications

### 1.1 Version Mismatches (High Priority)

| Package | admin | client-app | rustyvault-ui | Recommended |
|---------|-------|------------|---------------|-------------|
| zustand | ^4.5.0 | ^5.0.9 | ^4.5.0 | ^5.0.9 |
| lucide-react | ^0.400.0 | ^0.555.0 | ^0.400.0 | ^0.555.0 |
| tailwindcss | ^3.4.0 | ^4.1.17 | ^4.1.17 | ^4.1.17 |
| @biomejs/biome | ^1.8.0 | ^2.3.8 | ^1.8.0 | ^2.3.8 |
| typescript | ^5.5.0 | ^5.9.3 | ^5.5.0 | ^5.9.3 |
| vite | ^5.3.0 | ^7.2.4 | ^5.3.0 | ^7.2.4 |
| @vitejs/plugin-react | ^4.3.0 | ^5.1.1 | ^4.3.0 | ^5.1.1 |
| immer | ^10.0.0 | ^11.0.1 | N/A | ^11.0.1 |

### 1.2 Same Version Duplications (Can be Hoisted)

| Package | Version | Present In |
|---------|---------|------------|
| @tanstack/react-router | ^1.139.12 | all 3 apps |
| @tanstack/react-router-devtools | ^1.139.12 | all 3 apps |
| @tanstack/react-query | ^5.90.11 | all 3 apps |
| react | ^19.2.0 | all 3 apps |
| react-dom | ^19.2.0 | all 3 apps |
| @types/react | ^19.2.7 | all 3 apps |
| @types/react-dom | ^19.2.3 | all 3 apps |
| @types/node | ^20.0.0 | all 3 apps |
| autoprefixer | ^10.4.0 | admin, rustyvault-ui |
| postcss | ^8.4.0 | admin, rustyvault-ui |

### 1.3 App-Specific Dependencies

#### rustyvault-ui only:
- `axios` (^1.6.0) - HTTP client
- `@tailwindcss/postcss` (^4.1.17)

#### client-app only:
- `@radix-ui/*` components
- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- Testing libraries (@playwright/test, vitest, @testing-library/*)
- Accessibility tools (@axe-core/react)

#### admin only:
- `@tauri-apps/api` and `@tauri-apps/cli` (also in client-app)

---

## 2. i18n System Duplications

### 2.1 Files Analysis

| File | admin | client-app | rustyvault-ui | Status |
|------|-------|------------|---------------|--------|
| types.ts | ✓ | ✓ | ✓ | **IDENTICAL** (re-exports from @health-v1/shared) |
| useTranslation.ts | ✓ | ✓ | ✓ | **IDENTICAL** |
| i18n.ts | ✓ | ✓ | ✓ | **NEARLY IDENTICAL** (client-app missing setTranslations) |
| TranslationProvider.tsx | ✓ | ✓ | ✓ | **DIFFERENT** (admin/rustyvault-ui have locale imports) |

### 2.2 Detailed Comparison

#### types.ts (100% Identical)
All three apps re-export from `@health-v1/shared/i18n`:
```typescript
export type { TranslationKey, TranslationObject, Locale } from "@health-v1/shared/i18n/types";
export { SUPPORTED_LOCALES } from "@health-v1/shared/i18n/locales";
```

#### useTranslation.ts (100% Identical)
Same implementation across all apps - 31 lines each.

#### i18n.ts (95% Similar)
- **admin** and **rustyvault-ui**: Identical (101 lines each)
  - Include `setTranslations()` function
  - Include `getNestedValue()` helper
- **client-app**: Slightly different (85 lines)
  - Missing `setTranslations()` function
  - Missing `getNestedValue()` helper
  - Uses flat key lookup instead of nested

#### TranslationProvider.tsx
- **admin** and **rustyvault-ui**: Identical (160 lines each)
  - Import all 29 locale JSON files
  - Include `flattenTranslations()` helper
  - Initialize translations on module load
- **client-app**: Simpler (74 lines)
  - No locale imports (lazy loading assumed)
  - No `flattenTranslations()` helper

### 2.3 Duplication Impact
- **~450 lines** of duplicated i18n code across apps
- **29 locale JSON files** duplicated in admin and rustyvault-ui
- Types already properly shared via `@health-v1/shared`

---

## 3. API Client Duplications

### 3.1 Implementation Comparison

| Aspect | admin | client-app | rustyvault-ui |
|--------|-------|------------|---------------|
| HTTP Library | fetch | fetch | axios |
| Lines of Code | 63 | 160 | 114 |
| Auth Method | Cookie/Session | Token + Interceptors | Vault Token |
| Retry Logic | No | Yes | No |
| Timeout | Yes | Yes | No (axios default) |
| Error Handling | Basic | Advanced | Moderate |

### 3.2 Detailed Analysis

#### admin/src/lib/api/client.ts (63 lines)
- Uses native `fetch`
- Cookie-based authentication (`credentials: "include"`)
- Simple `apiRequest<T>()` wrapper
- Uses shared config from `@health-v1/shared/api`
- Basic error handling with timeout

#### client-app/src/lib/api/client.ts (160 lines)
- Uses native `fetch`
- Token-based authentication with interceptors
- Full `ApiClient` class with retry logic
- Methods: `get`, `post`, `put`, `patch`, `delete`
- Advanced error handling with `ApiError` class
- Configurable timeout and retry attempts

#### rustyvault-ui/src/lib/api/client.ts (114 lines)
- Uses `axios`
- Vault-specific token header (`X-RustyVault-Token`)
- Custom `ApiClient` class
- Methods: `get`, `post`, `put`, `delete`, `list`
- Response unwrapping for Vault API format
- Auto-logout on 401

### 3.3 Auth API Comparison

| Feature | admin | client-app | rustyvault-ui |
|---------|-------|------------|---------------|
| Login | Session-based | OIDC | Userpass/AppRole |
| Token Storage | Cookie | Memory/Store | Zustand Store |
| Token Refresh | Via cookie | Manual refresh | Manual renewal |
| Logout | POST to /logout | POST + clear tokens | Clear store |

**Verdict**: Auth APIs are intentionally different due to different authentication systems.

---

## 4. Component Duplications

### 4.1 Sidebar Components

| App | Location | Lines | Features |
|-----|----------|-------|----------|
| admin | components/navigation/Sidebar.tsx | 215 | Permission-aware, nested sub-items |
| client-app | components/layout/Sidebar/Sidebar.tsx | 57 | Collapsible, expandable items, modular |
| rustyvault-ui | components/navigation/Sidebar.tsx | 110 | Simple nav, logout button |

**Verdict**: Different requirements justify separate implementations:
- admin: Needs Zanzibar permission checks for each nav item
- client-app: Complex state management with collapsible/expandable features
- rustyvault-ui: Simple vault-specific navigation

### 4.2 PermissionGate Components

| App | Location | Lines | Permission System |
|-----|----------|-------|-------------------|
| client-app | components/security/PermissionGate.tsx | 118 | Zanzibar + optional Vault ACL |
| rustyvault-ui | components/auth/PermissionGate.tsx | 183 | Vault ACL only |

**Verdict**: Different permission systems require separate implementations:
- client-app: Zanzibar-based with optional vault integration
- rustyvault-ui: Vault ACL path-based permissions

### 4.3 Common Patterns That Could Be Extracted

1. **NavItem interface** - Similar structure in all Sidebar components
2. **Permission checking hooks** - Similar pattern but different implementations
3. **Access denied UI** - Similar fallback rendering

---

## 5. Recommendations

### 5.1 High Priority (Immediate Action)

#### A. Align Package Versions
Update `admin` and `rustyvault-ui` package.json files:

```json
{
  "dependencies": {
    "zustand": "^5.0.9",
    "lucide-react": "^0.555.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.3.8",
    "typescript": "^5.9.3",
    "vite": "^7.2.4",
    "@vitejs/plugin-react": "^5.1.1"
  }
}
```

#### B. Consolidate i18n System
Move i18n implementation to `@health-v1/shared`:
1. Move `i18n.ts` core utilities to shared
2. Move `TranslationProvider.tsx` to shared
3. Move `useTranslation.ts` to shared
4. Keep app-specific locale files in each app

#### C. Update admin tailwindcss
```json
{
  "dependencies": {
    "tailwindcss": "^4.1.17",
    "@tailwindcss/postcss": "^4.1.17"
  }
}
```

### 5.2 Medium Priority (Next Sprint)

#### D. Standardize API Client Base
Create a base API client in `@health-v1/shared`:
- Extract common patterns (timeout, error handling)
- Create app-specific adapters that extend base
- Keep auth-specific logic in apps

#### E. Hoist Common Dependencies
Add to root `cli/package.json`:
```json
{
  "dependencies": {
    "@tanstack/react-router": "^1.139.12",
    "@tanstack/react-query": "^5.90.11"
  }
}
```

### 5.3 Low Priority (Technical Debt)

#### F. Extract Common Component Patterns
- Create base `NavItem` type in shared
- Create `useActiveRoute` hook in shared
- Create common access denied component

---

## 6. Migration Paths

### 6.1 i18n Consolidation Migration

**Step 1**: Update `@health-v1/shared` package
```
cli/packages/libs/shared/src/i18n/
├── index.ts (re-export all)
├── types.ts (already exists)
├── locales.ts (already exists)
├── i18n.ts (NEW - move from apps)
├── useTranslation.ts (NEW - move from apps)
└── TranslationProvider.tsx (NEW - move from apps)
```

**Step 2**: Update exports in shared package.json

**Step 3**: Update imports in all apps
```typescript
// Before
import { useTranslation } from "@/lib/i18n";

// After
import { useTranslation } from "@health-v1/shared/i18n";
```

**Step 4**: Remove duplicated files from apps

### 6.2 Dependency Version Alignment

**Step 1**: Update admin/package.json
```bash
cd cli/packages/apps/admin
bun add zustand@^5.0.9 lucide-react@^0.555.0 tailwindcss@^4.1.17
bun add -d @biomejs/biome@^2.3.8 typescript@^5.9.3 vite@^7.2.4 @vitejs/plugin-react@^5.1.1
```

**Step 2**: Update rustyvault-ui/package.json
```bash
cd cli/packages/apps/rustyvault-ui
bun add zustand@^5.0.9 lucide-react@^0.555.0
bun add -d @biomejs/biome@^2.3.8 typescript@^5.9.3 vite@^7.2.4 @vitejs/plugin-react@^5.1.1
```

**Step 3**: Run tests and fix any breaking changes

### 6.3 API Client Standardization

**Step 1**: Create base client in shared
```typescript
// shared/src/api/baseClient.ts
export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export abstract class BaseApiClient {
  abstract get<T>(url: string): Promise<T>;
  abstract post<T>(url: string, data?: unknown): Promise<T>;
  // ...common methods
}
```

**Step 2**: Create app-specific implementations
- `admin`: SessionApiClient extends BaseApiClient
- `client-app`: TokenApiClient extends BaseApiClient  
- `rustyvault-ui`: VaultApiClient extends BaseApiClient

---

## Summary

| Category | Duplication Level | Status |
|----------|------------------|--------|
| Package versions | High | **FIXED** - Aligned across apps |
| i18n system | Very High (~450 lines) | **FIXED** - Consolidated to shared |
| API clients | Medium (different implementations) | Pending - Extract base patterns |
| Sidebar components | Low (different requirements) | Keep separate |
| PermissionGate | Low (different systems) | Keep separate |

## Changes Made

### 1. Package Versions Aligned
- Updated `admin` and `rustyvault-ui` to match `client-app` versions
- zustand: ^5.0.9
- lucide-react: ^0.555.0
- tailwindcss: ^4.1.17
- vite: ^7.2.4
- typescript: ^5.9.3
- @biomejs/biome: ^2.3.8

### 2. i18n Consolidated to Shared
New structure in `@health-v1/shared/i18n`:
- `context.ts` - I18nContext and core utilities
- `useTranslation.ts` - useTranslation and useT hooks
- `TranslationProvider.tsx` - Shared provider component
- `translations/` - Common translations and merge utilities
  - `common/en.json` - Shared common translations
  - `index.ts` - createAppTranslations() helper

Apps now use simplified TranslationProvider (~25 lines each instead of ~160):
```tsx
import { TranslationProvider, createAppTranslations } from "@health-v1/shared/i18n";
import en from "./locales/en.json";

const translations = createAppTranslations({ en });

export function TranslationProvider({ children }) {
  return <SharedTranslationProvider translations={translations}>{children}</SharedTranslationProvider>;
}
```

**Total Duplication Removed**: ~400+ lines of code
