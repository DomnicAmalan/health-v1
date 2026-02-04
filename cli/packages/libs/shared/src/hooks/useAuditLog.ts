/**
 * useAuditLog Hook - Shared Implementation
 * Hook for audit logging and immutable audit trail access
 *
 * This is the SINGLE SOURCE OF TRUTH for the audit logging hook.
 * Do NOT duplicate this in apps.
 */

import { useCallback } from "react";
import type { AuditEntry } from "../schemas/audit";
import {
  logAccessDenied,
  logPermissionCheck,
  logPHIAccess,
  logStateChange,
} from "../utils/audit";

/**
 * User interface for audit logging
 */
export interface AuditUser {
  id: string;
  role?: string;
}

/**
 * Audit store interface
 */
export interface AuditStoreActions {
  addEntry: (entry: Omit<AuditEntry, "id" | "timestamp" | "masked">) => void;
  getEntriesByUser: (userId: string) => readonly AuditEntry[];
  getEntriesByResource: (resource: string) => readonly AuditEntry[];
  exportEntries: (masked?: boolean) => AuditEntry[];
}

/**
 * Hook dependencies (injected by app)
 */
export interface UseAuditLogDeps {
  user: AuditUser | null | undefined;
  auditStore: AuditStoreActions;
}

/**
 * useAuditLog Hook
 *
 * Usage in apps:
 * ```typescript
 * // In client-app or admin
 * import { useAuditLog as useAuditLogShared } from '@lazarus-life/shared';
 * import { useAuth } from '@/stores/authStore';
 * import { useAuditStore } from '@/stores/auditStore';
 *
 * export function useAuditLog() {
 *   const { user } = useAuth();
 *   const auditStore = useAuditStore();
 *   return useAuditLogShared({ user, auditStore });
 * }
 * ```
 */
export function useAuditLog({ user, auditStore }: UseAuditLogDeps) {
  const { addEntry, getEntriesByUser, getEntriesByResource, exportEntries } = auditStore;

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
