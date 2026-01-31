/**
 * useAuditLog Hook for Admin App
 * Hook for audit logging and immutable audit trail access
 * Tracks sensitive operations like user provisioning, DEK rotation, permission changes
 */

import { useCallback } from "react";
import type { AuditEntry } from "@lazarus-life/shared/types/audit";
import { useAuditStore } from "@/stores/auditStore";
import { useAuthStore } from "@/stores/authStore";
import { logAccessDenied, logPermissionCheck, logPHIAccess, logStateChange } from "@/lib/api/audit";

export function useAuditLog() {
  const user = useAuthStore((state) => state.user);
  const { addEntry, getEntriesByUser, getEntriesByResource, exportEntries } = useAuditStore();

  /**
   * Log PHI/PII access (email, SSN, user data)
   */
  const logPHI = useCallback(
    (resource: string, resourceId?: string, details?: Record<string, unknown>) => {
      if (!user) {
        return;
      }

      // Add to local store
      addEntry({
        userId: user.id,
        action: "PHI_ACCESS",
        resource,
        resourceId,
        details,
      });

      // Also log via API
      logPHIAccess(user.id, resource, resourceId, details);
    },
    [user, addEntry]
  );

  /**
   * Log state changes (user creation, DEK rotation, permission grants)
   */
  const logState = useCallback(
    (action: string, resource: string, resourceId?: string, details?: Record<string, unknown>) => {
      if (!user) {
        return;
      }

      addEntry({
        userId: user.id,
        action: `STATE_CHANGE:${action}`,
        resource,
        resourceId,
        details,
      });

      logStateChange(user.id, resource, action, resourceId, details);
    },
    [user, addEntry]
  );

  /**
   * Log permission checks
   */
  const logPermission = useCallback(
    (permission: string, granted: boolean, resource?: string) => {
      if (!user) {
        return;
      }

      addEntry({
        userId: user.id,
        action: "PERMISSION_CHECK",
        resource: resource || "system",
        details: {
          permission,
          granted,
        },
      });

      logPermissionCheck(user.id, permission, granted, resource);
    },
    [user, addEntry]
  );

  /**
   * Log access denied events
   */
  const logDenied = useCallback(
    (resource: string, requiredPermission: string) => {
      if (!user) {
        return;
      }

      addEntry({
        userId: user.id,
        action: "ACCESS_DENIED",
        resource,
        details: {
          requiredPermission,
          userRole: user.role,
        },
      });

      logAccessDenied(user.id, resource, requiredPermission, user.role);
    },
    [user, addEntry]
  );

  /**
   * Get audit entries for a specific user
   */
  const getUserEntries = useCallback(
    (userId: string): readonly AuditEntry[] => {
      return getEntriesByUser(userId);
    },
    [getEntriesByUser]
  );

  /**
   * Get audit entries for a specific resource
   */
  const getResourceEntries = useCallback(
    (resource: string): readonly AuditEntry[] => {
      return getEntriesByResource(resource);
    },
    [getEntriesByResource]
  );

  /**
   * Export audit log (masked by default for compliance)
   */
  const exportAuditLog = useCallback(
    (masked = true): AuditEntry[] => {
      return exportEntries(masked);
    },
    [exportEntries]
  );

  return {
    logPHI,
    logState,
    logPermission,
    logDenied,
    getUserEntries,
    getResourceEntries,
    exportAuditLog,
  };
}
