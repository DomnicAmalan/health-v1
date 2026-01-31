/**
 * Audit API for Admin App
 * Audit logging utilities for tracking sensitive admin operations
 */

import { SECURITY_CONFIG } from "@lazarus-life/shared/constants/security";
import type { AuditEntry } from "@lazarus-life/shared/types/audit";

/**
 * Mask PHI/PII in audit entry details
 */
function maskObject(obj: Record<string, unknown>, fieldsToMask: string[]): Record<string, unknown> {
  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (fieldsToMask.includes(key)) {
      masked[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      masked[key] = maskObject(value as Record<string, unknown>, fieldsToMask);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Log an audit entry
 */
export async function logAuditEntry(
  entry: Omit<AuditEntry, "id" | "timestamp" | "masked">
): Promise<void> {
  if (!SECURITY_CONFIG.AUDIT.LOG_PHI_ACCESS) {
    return; // Audit logging disabled
  }

  const auditEntry: AuditEntry = {
    id: crypto.randomUUID(),
    ...entry,
    timestamp: new Date().toISOString(),
    masked: SECURITY_CONFIG.AUDIT.MASK_IN_LOGS,
  };

  // Mask PHI/PII in audit entry if configured
  if (SECURITY_CONFIG.AUDIT.MASK_IN_LOGS && auditEntry.details) {
    const fieldsToMask = ["ssn", "email", "phone", "mrn", "creditCard", "userId"];
    auditEntry.details = maskObject(auditEntry.details, fieldsToMask);
  }

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log("[AUDIT]", auditEntry);
  }

  // TODO: Send to audit API endpoint when available
  // await apiClient.post('/v1/audit', auditEntry);
}

/**
 * Log PHI/PII access (user data)
 */
export function logPHIAccess(
  userId: string,
  resource: string,
  resourceId?: string,
  details?: Record<string, unknown>
): void {
  logAuditEntry({
    userId,
    action: "PHI_ACCESS",
    resource,
    resourceId,
    details,
  });
}

/**
 * Log state change (user provisioning, DEK rotation, permission changes)
 */
export function logStateChange(
  userId: string,
  resource: string,
  action: string,
  resourceId?: string,
  details?: Record<string, unknown>
): void {
  if (!SECURITY_CONFIG.AUDIT.LOG_STATE_CHANGES) {
    return;
  }

  logAuditEntry({
    userId,
    action: `STATE_CHANGE:${action}`,
    resource,
    resourceId,
    details,
  });
}

/**
 * Log permission check
 */
export function logPermissionCheck(
  userId: string,
  permission: string,
  granted: boolean,
  resource?: string
): void {
  logAuditEntry({
    userId,
    action: "PERMISSION_CHECK",
    resource: resource || "system",
    details: {
      permission,
      granted,
    },
  });
}

/**
 * Log access denied
 */
export function logAccessDenied(
  userId: string,
  resource: string,
  requiredPermission: string,
  userRole?: string
): void {
  logAuditEntry({
    userId,
    action: "ACCESS_DENIED",
    resource,
    details: {
      requiredPermission,
      userRole,
    },
  });
}
