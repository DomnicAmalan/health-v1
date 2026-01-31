/**
 * Audit Logger Interface
 * Standard interface for audit logging across all apps
 * Enables HIPAA-compliant audit trails
 */

/**
 * Audit log entry metadata
 */
export interface AuditMetadata {
  /** User ID who performed the action */
  userId?: string;
  /** IP address of the request */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
  /** Session ID */
  sessionId?: string;
  /** Additional custom metadata */
  [key: string]: unknown;
}

/**
 * Audit Logger Interface
 * Implement this interface in apps that require audit logging
 */
export interface AuditLogger {
  /**
   * Log a permission check (granted or denied)
   * @param resource - Resource being accessed
   * @param granted - Whether access was granted
   * @param metadata - Additional context
   */
  logAccess(resource: string, granted: boolean, metadata?: AuditMetadata): void;

  /**
   * Log an access denial
   * @param resource - Resource that was denied
   * @param reason - Reason for denial
   * @param metadata - Additional context
   */
  logDenied(resource: string, reason: string, metadata?: AuditMetadata): void;

  /**
   * Log PHI access (for HIPAA compliance)
   * @param resource - PHI resource accessed
   * @param action - Action performed (read, write, delete)
   * @param metadata - Additional context
   */
  logPHIAccess?(resource: string, action: string, metadata?: AuditMetadata): void;
}

/**
 * No-op Audit Logger
 * Used in apps that don't require audit logging
 */
export class NoOpAuditLogger implements AuditLogger {
  logAccess(_resource: string, _granted: boolean, _metadata?: AuditMetadata): void {
    // No-op
  }

  logDenied(_resource: string, _reason: string, _metadata?: AuditMetadata): void {
    // No-op
  }

  logPHIAccess?(_resource: string, _action: string, _metadata?: AuditMetadata): void {
    // No-op
  }
}

/**
 * Console Audit Logger
 * Logs to console for development/debugging
 */
export class ConsoleAuditLogger implements AuditLogger {
  private readonly prefix: string;

  constructor(prefix = "[AUDIT]") {
    this.prefix = prefix;
  }

  logAccess(resource: string, granted: boolean, metadata?: AuditMetadata): void {
    console.log(this.prefix, "ACCESS", {
      resource,
      granted,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  logDenied(resource: string, reason: string, metadata?: AuditMetadata): void {
    console.warn(this.prefix, "DENIED", {
      resource,
      reason,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  logPHIAccess(resource: string, action: string, metadata?: AuditMetadata): void {
    console.log(this.prefix, "PHI_ACCESS", {
      resource,
      action,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }
}

/**
 * Create an audit logger based on environment
 * @param enableLogging - Whether to enable logging (default: true in dev, false in prod)
 * @returns Audit logger instance
 */
export function createAuditLogger(enableLogging?: boolean): AuditLogger {
  const shouldLog = enableLogging ?? false;

  if (shouldLog) {
    return new ConsoleAuditLogger();
  }

  return new NoOpAuditLogger();
}
