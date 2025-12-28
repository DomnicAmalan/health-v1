/**
 * PermissionGate Component
 * Fine-grained permission checking with AND/OR logic
 * Now supports optional vault ACL checking for secrets access
 */

import type { Permission } from "@lazarus-life/shared/constants/permissions";
import {
  getVaultPathForPermission,
  permissionRequiresVault,
  useVaultCapabilities,
} from "@lazarus-life/shared/vault";
import { Box } from "@lazarus-life/ui-components";
import { useMemo } from "react";
import { useAuditLog } from "@/hooks/security/useAuditLog";
import { usePermissions } from "@/hooks/security/usePermissions";
import { AccessDenied } from "./AccessDenied";

interface PermissionGateProps {
  children: React.ReactNode;
  permissions: Permission[];
  mode?: "all" | "any"; // 'all' = AND logic, 'any' = OR logic
  fallback?: React.ReactNode;
  resource?: string;
  /** Also check vault ACL for permissions that require secrets access */
  checkVault?: boolean;
  /** Custom vault path to check (overrides automatic mapping) */
  vaultPath?: string;
  /** Required vault capability */
  vaultCapability?: "read" | "write" | "delete" | "list";
}

export function PermissionGate({
  children,
  permissions,
  mode = "all",
  fallback,
  resource,
  checkVault = false,
  vaultPath,
  vaultCapability = "read",
}: PermissionGateProps) {
  const { hasAllPermissions, hasAnyPermission } = usePermissions();
  const { logDenied } = useAuditLog();

  // Determine vault path to check
  const effectiveVaultPath = useMemo(() => {
    if (vaultPath) {
      return vaultPath;
    }
    if (!checkVault) {
      return null;
    }

    // Find the first permission that requires vault access
    for (const perm of permissions) {
      if (permissionRequiresVault(perm)) {
        return getVaultPathForPermission(perm);
      }
    }
    return null;
  }, [vaultPath, checkVault, permissions]);

  // Check vault capabilities if needed
  const {
    canRead,
    canWrite,
    canDelete,
    canList,
    isDenied: vaultDenied,
    loading: vaultLoading,
  } = useVaultCapabilities(effectiveVaultPath || "");

  // Check health-v1 permissions
  const healthGranted =
    mode === "all" ? hasAllPermissions(permissions) : hasAnyPermission(permissions);

  // Check vault permissions if applicable
  const vaultGranted = useMemo(() => {
    if (!effectiveVaultPath) {
      return true;
    }
    if (vaultDenied) {
      return false;
    }

    switch (vaultCapability) {
      case "read":
        return canRead;
      case "write":
        return canWrite;
      case "delete":
        return canDelete;
      case "list":
        return canList;
      default:
        return canRead;
    }
  }, [effectiveVaultPath, vaultDenied, vaultCapability, canRead, canWrite, canDelete, canList]);

  // Show loading state while checking vault
  if (vaultLoading && effectiveVaultPath) {
    return null;
  }

  const granted = healthGranted && vaultGranted;

  if (!granted) {
    // Log access denied
    if (resource) {
      const reason = healthGranted
        ? `vault:${effectiveVaultPath}:${vaultCapability}`
        : permissions.join(mode === "all" ? " AND " : " OR ");
      logDenied(resource, reason);
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <AccessDenied
        type="component"
        resource={resource || "resource"}
        requiredPermissions={permissions}
        vaultPath={vaultGranted ? undefined : effectiveVaultPath || undefined}
      />
    );
  }

  return <Box>{children}</Box>;
}
