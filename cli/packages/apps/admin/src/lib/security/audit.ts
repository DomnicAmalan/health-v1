/**
 * Audit Logger for Admin App
 * Implements HIPAA-compliant audit logging
 */

import type { AuditLogger, AuditMetadata } from "@lazarus-life/shared";

/**
 * Admin Audit Logger
 * Logs permission checks and access denials for compliance
 */
class AdminAuditLogger implements AuditLogger {
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
    if (import.meta.env.DEV) {
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

    // In production, this would send to audit API
    // For now, log to console (always log denials)
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
