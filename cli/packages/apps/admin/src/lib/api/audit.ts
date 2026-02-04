/**
 * Audit API - Admin App
 * Re-exports shared audit functions for backward compatibility
 */

// Re-export all audit functions from shared library
export {
  logAuditEntry,
  logPHIAccess,
  logStateChange,
  logPermissionCheck,
  logAccessDenied,
} from "@lazarus-life/shared";
