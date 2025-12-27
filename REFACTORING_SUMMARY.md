# Duplicate Code Removal Summary

## Backend - Completed ✅

### High Priority
- ✅ Deleted 4 duplicate use case implementations in admin-service (user/ and setup/ directories)
  - Created duplicate CreateUserUseCase (38 lines vs 87 lines)
  - Created duplicate DeleteUserUseCase (27 lines)
  - Created duplicate CreateSuperAdminUseCase (93 lines, only error path diff)
  - Created duplicate SetupOrganizationUseCase (65 lines vs 77 lines, missing force param)

- ✅ Consolidated RelationshipTuple to shared/infrastructure/zanzibar
  - Deleted authz-core/src/zanzibar/tuple.rs (42 lines)
  - Deleted shared/zanzibar/tuple.rs (42 lines) - deprecated directory
  - Kept shared/src/infrastructure/zanzibar/tuple.rs as single source of truth

- ✅ Consolidated Jwks types to shared/oidc
  - Deleted shared/oidc directory (deprecated top-level directory)
  - Deleted authz-core/src/oidc/jwks.rs (44 lines)
  - Deleted authz-core/src/oidc/provider.rs (45 lines)
  - Updated authz-core to re-export from shared/src/infrastructure/oidc

- ✅ Redesigned VaultError to wrap AppError instead of duplicating error variants
  - Reduced VaultError from 14 variants to 7 variants
  - Added `Shared` variant that wraps shared::AppError
  - Added direct `From<sqlx::Error>` implementation for convenience
  - Updated physical_file.rs to use VaultError::Shared wrapper

- ✅ Created error handling macro for handlers
  - Created `handle_result!` macro for common error response pattern
  - Created `here!()` macro for location logging
  - Placed in shared/src/infrastructure/http/response_macros.rs

- ✅ Consolidated PermissionChecker implementations
  - Deleted authz-core/src/zanzibar/checker.rs (48 lines)
  - Kept advanced implementation in shared/src/infrastructure/zanzibar/checker.rs (255 lines)
  - Updated authz-core to re-export from shared

### Medium Priority
- ✅ Created shared authentication middleware trait in shared module
  - Created `AuthMiddleware` trait in shared/src/infrastructure/auth/middleware_trait.rs
  - Includes `extract_token()` utility method for token extraction from headers

- ✅ Created validation utilities module
  - Created shared/src/infrastructure/validation/mod.rs
  - Implemented `validate_email()` with comprehensive validation
  - Implemented `validate_username()` with length and character checks
  - Implemented `validate_password()` with minimum length check

## Impact

### Backend Improvements
- **Lines Removed**: ~700+ lines of duplicate code
- **Files Deleted**: 8 duplicate files
- **Directories Deleted**: 2 deprecated directories (shared/zanzibar, shared/oidc)
- **Error Types Consolidated**: Single source of truth for AppError variants
- **Types Consolidated**: RelationshipTuple, Jwks, PermissionChecker all in shared
- **Build Status**: ✅ All backend packages compile successfully

### Code Quality Improvements
- Single source of truth for core types
- Better error handling patterns through macros
- Cleaner error hierarchy with VaultError wrapping AppError
- Validation logic centralized and reusable

## Frontend - Remaining Tasks

### High Priority (Estimated: 2000+ lines can be consolidated)

1. **Create shared auth store base** in @lazarus-life/shared/auth
   - 3 similar implementations (~900 lines total)
   - Create factory function accepting auth type (token/cookie, storage type)
   - Export typed store with hooks for apps to extend

2. **Consolidate API clients** to use BaseApiClient factory functions
   - 3 app-specific clients (~288 lines total)
   - Use existing BaseApiClient factory functions
   - Create shared headers utility (X-App-Type, X-App-Device)

3. **Move auth API functions** to shared
   - Login, logout, getUserInfo duplicated across 3 apps (~210 lines)
   - Create @lazarus-life/shared/api/auth.ts
   - Apps import and wrap with their specific client

4. **Create shared Sidebar component**
   - 3 similar implementations (~522 lines total)
   - Create @lazarus-life/ui-components/navigation/Sidebar
   - Generic NavItem interface (allow app to extend)
   - Props: items, logoSrc, title, collapsed, onToggle, permissionChecker

5. **Create shared LoginForm component**
   - 3 similar implementations (~535 lines total)
   - Create @lazarus-life/ui-components/auth/LoginForm
   - Configurable fields (email vs username, show password)
   - Auth callback prop, redirect URL prop
   - Error/loading handling built-in

6. **Consolidate permission checking logic** to shared module
   - Multiple files with overlapping functionality (~180 lines)
   - Create @lazarus-life/shared/permissions
   - Single source for permission checking logic
   - Apps configure their permission maps

### Medium Priority (Estimated: 900+ lines can be consolidated)

7. **Create shared ProtectedRoute/PermissionGate component**
   - 3 similar implementations (~428 lines total)
   - Merge into @lazarus-life/ui-components/security/ProtectedRoute
   - Accept permission checker function as prop
   - AND/OR logic for multiple permissions

8. **Create shared env validation utility**
   - 2 separate env.ts files (~186 lines)
   - Create @lazarus-life/shared/config/env.ts
   - Unified `getEnvVar()` and `createEnvValidator()` factory

9. **Create shared auth guard utility** for root routes
   - Similar patterns in __root.tsx (~577 lines total)
   - Create `createAuthGuard()` factory returning beforeLoad function
   - Configurable: public routes, setup check, auth check

### Low Priority (Estimated: 100+ lines)

10. **Create shared QueryClient factory** in @lazarus-life/shared/query
    - 3 similar configurations (~77 lines total)
    - Export `createQueryClient()` with optional overrides
    - Include security-conscious defaults

11. **Remove duplicate cn() function** from client-app
    - Already exported from @lazarus-life/ui-components
    - Simple import replacement (~7 lines)

## Frontend Implementation Priority

### Phase 1: Core Infrastructure (Week 1)
1. Create shared auth store base
2. Create shared env validation utility
3. Create shared QueryClient factory
4. Remove duplicate cn() function

### Phase 2: Authentication & Permissions (Week 2)
5. Move auth API functions to shared
6. Consolidate permission checking logic
7. Create shared ProtectedRoute component
8. Create shared auth guard utility

### Phase 3: UI Components (Week 3-4)
9. Create shared LoginForm component
10. Create shared Sidebar component
11. Consolidate API clients
12. Test and migrate apps

## Frontend Estimated Impact
- **Lines Saved**: ~2900+ lines of duplicate code
- **Maintainability**: Changes in shared automatically benefit all apps
- **Consistency**: Same UI/UX patterns across admin, client-app, rustyvault-ui
- **Security**: Auth/permission logic in shared, tested code

## Next Steps
1. ✅ Backend refactoring complete and building successfully
2. Create shared packages structure for frontend
3. Implement Phase 1 tasks (infrastructure)
4. Implement Phase 2 tasks (auth/permissions)
5. Implement Phase 3 tasks (UI components)
6. Comprehensive testing across all apps

## Git Status
```bash
git status --short
# Summary of changes made
```