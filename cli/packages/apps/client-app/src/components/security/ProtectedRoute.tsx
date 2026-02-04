/**
 * ProtectedRoute Component - Client App
 * Permission-based route protection using shared component
 */

import type { Permission } from "@lazarus-life/shared/constants/permissions";
import { ProtectedRoute as SharedProtectedRoute } from "@lazarus-life/shared";
import { useAuditLog } from "@/hooks/security/useAuditLog";
import { usePermissions } from "@/hooks/security/usePermissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission: Permission;
  redirectTo?: string;
  resource?: string;
}

/**
 * Client App Protected Route
 * Wraps shared ProtectedRoute with permission-based strategy
 */
export function ProtectedRoute({
  children,
  requiredPermission,
  redirectTo = "/access-denied",
  resource,
}: ProtectedRouteProps) {
  const { hasPermission } = usePermissions();
  const { logDenied } = useAuditLog();

  return (
    <SharedProtectedRoute
      strategy="permission"
      permission={requiredPermission}
      hasPermission={(perm) => hasPermission(perm as Permission)}
      onAccessDenied={(permission, res) => {
        if (res || resource) {
          logDenied(res || resource || permission, permission);
        }
      }}
      resource={resource}
      redirectTo={redirectTo}
    >
      {children}
    </SharedProtectedRoute>
  );
}
