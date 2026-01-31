/**
 * Audit Middleware for Zustand
 * Logs state changes involving PHI/sensitive data for audit trail
 */

import type { StateCreator } from "zustand";

/**
 * Configuration for audit middleware
 */
export interface AuditMiddlewareConfig {
  /** Fields that contain PHI/sensitive data and should be audited */
  phiFields?: string[];
  /** Callback to log audit entry */
  onAuditLog: (entry: AuditLogEntry) => void;
  /** Function to get current user ID */
  getUserId?: () => string | null;
  /** Whether to enable audit logging (default: true) */
  enabled?: boolean;
  /** Store name for audit entries */
  storeName?: string;
}

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  /** User who made the change */
  userId?: string | null;
  /** Action performed (e.g., "access", "update", "delete") */
  action: string;
  /** Resource/store being modified */
  resource: string;
  /** Resource ID if applicable */
  resourceId?: string;
  /** Details of the changes */
  details: Record<string, unknown>;
  /** Timestamp of the change */
  timestamp: string;
}

// Default PHI fields
const DEFAULT_PHI_FIELDS = [
  "ssn",
  "email",
  "phone",
  "mrn",
  "patientId",
  "dateOfBirth",
  "dob",
  "address",
  "creditCard",
  "password",
  "token",
  "secret",
];

/**
 * Check if an object contains PHI fields
 */
function containsPHI(obj: unknown, phiFields: string[]): boolean {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const keys = Object.keys(obj);
  return keys.some((key) =>
    phiFields.some((phiField) => key.toLowerCase().includes(phiField.toLowerCase()))
  );
}

/**
 * Extract PHI-related changes from state update
 */
function extractPHIChanges(
  partial: unknown,
  phiFields: string[]
): Record<string, unknown> | null {
  if (!partial || typeof partial !== "object") {
    return null;
  }

  const changes: Record<string, unknown> = {};
  let hasPHI = false;

  for (const [key, value] of Object.entries(partial)) {
    if (phiFields.some((phiField) => key.toLowerCase().includes(phiField.toLowerCase()))) {
      changes[key] = value;
      hasPHI = true;
    } else if (typeof value === "object" && containsPHI(value, phiFields)) {
      changes[key] = value;
      hasPHI = true;
    }
  }

  return hasPHI ? changes : null;
}

/**
 * Create audit middleware for Zustand stores
 *
 * @example
 * ```typescript
 * import { create } from 'zustand';
 * import { createAuditMiddleware } from '@lazarus-life/shared/middleware';
 *
 * const auditMiddleware = createAuditMiddleware({
 *   onAuditLog: (entry) => auditStore.getState().addEntry(entry),
 *   getUserId: () => authStore.getState().user?.id ?? null,
 *   storeName: 'patients',
 * });
 *
 * const usePatientStore = create(
 *   auditMiddleware(
 *     (set) => ({
 *       patient: null,
 *       setPatient: (patient) => set({ patient }),
 *     })
 *   )
 * );
 * ```
 */
export function createAuditMiddleware(config: AuditMiddlewareConfig) {
  const {
    phiFields = DEFAULT_PHI_FIELDS,
    onAuditLog,
    getUserId,
    enabled = true,
    storeName = "store",
  } = config;

  return function auditMiddleware<T>(stateCreator: StateCreator<T>): StateCreator<T> {
    return (set, get, api) => {
      if (!enabled) {
        return stateCreator(set, get, api);
      }

      // Wrap set function to log changes
      const setWithAudit = (
        partial: T | Partial<T> | ((state: T) => T | Partial<T>),
        replace?: boolean
      ) => {
        // Determine what changed
        let changes: Record<string, unknown> | null = null;

        if (typeof partial === "function" && partial.prototype === undefined) {
          // For function updates, execute to get the changes
          const currentState = get();
          const newState = (partial as (state: T) => T | Partial<T>)(currentState);
          if (typeof newState === "object" && newState !== null) {
            changes = extractPHIChanges(newState, phiFields);
          }
        } else if (typeof partial === "object" && partial !== null) {
          changes = extractPHIChanges(partial, phiFields);
        }

        // Log PHI access if changes contain PHI
        if (changes) {
          const userId = getUserId?.();
          const auditEntry: AuditLogEntry = {
            userId,
            action: "access",
            resource: storeName,
            details: changes,
            timestamp: new Date().toISOString(),
          };

          try {
            onAuditLog(auditEntry);
          } catch (error) {
            console.error("[AuditMiddleware] Failed to log audit entry:", error);
          }
        }

        // Call original set
        if (replace === true) {
          if (typeof partial === "function" && partial.prototype === undefined) {
            const currentState = get();
            const fullState = (partial as (state: T) => T)(currentState);
            return set(fullState, true);
          }
          return set(partial as T, true);
        }
        return set(partial, false);
      };

      return stateCreator(setWithAudit, get, api);
    };
  };
}
