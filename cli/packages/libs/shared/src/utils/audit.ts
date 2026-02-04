/**
 * Audit Utilities - Shared Implementation
 * HIPAA-compliant audit logging for tracking sensitive operations
 *
 * This is the SINGLE SOURCE OF TRUTH for audit functions.
 * Do NOT duplicate these functions in apps.
 */

import { SECURITY_CONFIG } from '../constants/security';
import { maskObject } from './masking';
import type { AuditEntry } from '../schemas/audit';
import type { AuditMetadata, AuditLogger as IAuditLogger } from '../security/auditLogger';

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
    const fieldsToMask = ["ssn", "email", "phone", "mrn", "creditCard", "patientId", "userId"];
    auditEntry.details = maskObject(auditEntry.details, fieldsToMask);
  }

  // Log to console in development
  if (import.meta.env?.DEV) {
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

/**
 * Admin Audit Logger (Class-based implementation)
 * Implements HIPAA-compliant audit logging
 */
export class AdminAuditLogger implements IAuditLogger {
  logAccess(resource: string, granted: boolean, metadata?: AuditMetadata): void {
    const entry = {
      timestamp: new Date().toISOString(),
      event: "PERMISSION_CHECK",
      resource,
      granted,
      ...metadata,
    };

    // In production, this would send to audit API
    // For now, log to console in development
    if (import.meta.env?.DEV) {
      console.log("[AUDIT]", entry);
    }

    // TODO: Send to backend audit API
    // await apiClient.post('/api/audit', entry);
  }

  logDenied(resource: string, reason: string, metadata?: AuditMetadata): void {
    const entry = {
      timestamp: new Date().toISOString(),
      event: "ACCESS_DENIED",
      resource,
      reason,
      ...metadata,
    };

    // PHI access always logged (HIPAA requirement)
    console.warn("[AUDIT] ACCESS DENIED", entry);

    // TODO: Send to backend audit API
    // await apiClient.post('/api/audit', entry);
  }

  logPHIAccess(resource: string, action: string, metadata?: AuditMetadata): void {
    const entry = {
      timestamp: new Date().toISOString(),
      event: "PHI_ACCESS",
      resource,
      action,
      ...metadata,
    };

    // PHI access always logged (HIPAA requirement)
    console.log("[AUDIT] PHI ACCESS", entry);

    // TODO: Send to backend audit API
    // await apiClient.post('/api/audit', entry);
  }
}

/**
 * Singleton audit logger instance
 */
export const auditLogger = new AdminAuditLogger();
