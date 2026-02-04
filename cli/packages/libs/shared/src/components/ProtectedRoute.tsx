/**
 * Protected Route Component - Shared
 * Supports multiple authorization strategies:
 * 1. Permission-based (RBAC) - Client App
 * 2. Relationship-based (Zanzibar) - Admin App
 */

import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

// ============================================================================
// Strategy 1: Permission-based (RBAC)
// ============================================================================

export interface PermissionBasedProps {
  children: ReactNode;
  strategy: "permission";
  /** Permission string (e.g., "patients:view") */
  permission: string;
  /** Function to check if user has permission */
  hasPermission: (permission: string) => boolean;
  /** Optional: Log access denial */
  onAccessDenied?: (permission: string, resource?: string) => void;
  /** Optional: Resource name for audit logging */
  resource?: string;
  /** Where to redirect if access denied */
  redirectTo?: string;
}

// ============================================================================
// Strategy 2: Relationship-based (Zanzibar)
// ============================================================================

export interface RelationshipBasedProps {
  children: ReactNode;
  strategy: "relationship";
  /** Relation to check (e.g., "can_view") */
  relation: string;
  /** Object to check relation against (e.g., "page:users") */
  object: string;
  /** Function to check if user has relation to object */
  canAccess: (relation: string, object: string) => boolean;
  /** Where to redirect if access denied */
  redirectTo?: string;
}

// ============================================================================
// Strategy 3: Custom (Flexible)
// ============================================================================

export interface CustomAccessProps {
  children: ReactNode;
  strategy: "custom";
  /** Custom access check function */
  hasAccess: () => boolean;
  /** Optional: Callback when access is denied */
  onAccessDenied?: () => void;
  /** Where to redirect if access denied */
  redirectTo?: string;
}

export type ProtectedRouteProps =
  | PermissionBasedProps
  | RelationshipBasedProps
  | CustomAccessProps;

/**
 * Protected Route - Unified component supporting multiple authorization strategies
 *
 * @example Permission-based (Client App)
 * ```tsx
 * <ProtectedRoute
 *   strategy="permission"
 *   permission="patients:view"
 *   hasPermission={hasPermission}
 *   onAccessDenied={logDenied}
 *   resource="patients"
 * >
 *   <PatientsPage />
 * </ProtectedRoute>
 * ```
 *
 * @example Relationship-based (Admin App)
 * ```tsx
 * <ProtectedRoute
 *   strategy="relationship"
 *   relation="can_view"
 *   object="page:users"
 *   canAccess={useCanAccess}
 * >
 *   <UsersPage />
 * </ProtectedRoute>
 * ```
 *
 * @example Custom access check
 * ```tsx
 * <ProtectedRoute
 *   strategy="custom"
 *   hasAccess={() => user?.role === 'admin'}
 * >
 *   <AdminPanel />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute(props: ProtectedRouteProps) {
  const { children, strategy, redirectTo = "/" } = props;

  let hasAccess = false;

  // Determine access based on strategy
  if (strategy === "permission") {
    const { permission, hasPermission, onAccessDenied, resource } = props;
    hasAccess = hasPermission(permission);

    if (!hasAccess && onAccessDenied) {
      onAccessDenied(permission, resource);
    }
  } else if (strategy === "relationship") {
    const { relation, object, canAccess: checkAccess } = props;
    hasAccess = checkAccess(relation, object);
  } else if (strategy === "custom") {
    const { hasAccess: customCheck, onAccessDenied } = props;
    hasAccess = customCheck();

    if (!hasAccess && onAccessDenied) {
      onAccessDenied();
    }
  }

  // Redirect if access denied
  if (!hasAccess) {
    return <Navigate to={redirectTo as "/"} />;
  }

  // Render children if access granted
  return <>{children}</>;
}

// ============================================================================
// Higher-Order Component Helpers
// ============================================================================

/**
 * HOC to wrap a component with permission-based protection
 */
export function withPermissionProtection<T extends object>(
  Component: React.ComponentType<T>,
  permission: string,
  hasPermission: (permission: string) => boolean,
  options?: {
    redirectTo?: string;
    resource?: string;
    onAccessDenied?: (permission: string, resource?: string) => void;
  }
) {
  return function ProtectedComponent(props: T) {
    return (
      <ProtectedRoute
        strategy="permission"
        permission={permission}
        hasPermission={hasPermission}
        redirectTo={options?.redirectTo}
        resource={options?.resource}
        onAccessDenied={options?.onAccessDenied}
      >
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * HOC to wrap a component with relationship-based protection
 */
export function withRelationshipProtection<T extends object>(
  Component: React.ComponentType<T>,
  relation: string,
  object: string,
  canAccess: (relation: string, object: string) => boolean,
  options?: {
    redirectTo?: string;
  }
) {
  return function ProtectedComponent(props: T) {
    return (
      <ProtectedRoute
        strategy="relationship"
        relation={relation}
        object={object}
        canAccess={canAccess}
        redirectTo={options?.redirectTo}
      >
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
