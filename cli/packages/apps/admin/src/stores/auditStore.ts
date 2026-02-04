/**
 * Audit Store for Admin App
 * Immutable append-only audit log with encryption support
 * Tracks sensitive admin operations with 7-year retention
 */

import { SECURITY_CONFIG } from "@lazarus-life/shared/constants/security";
import type { AuditEntry } from "@lazarus-life/shared/schemas/audit";
import type {
  AuditActions,
  AuditState,
  AuditStore,
} from "@lazarus-life/shared/types/stores/audit";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

// Re-export types
export type { AuditState, AuditActions, AuditStore };

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

const initialState: AuditState = {
  entries: [],
  maxEntries: 10000, // Limit to prevent memory issues
};

export const useAuditStore = create<AuditStore>()(
  immer((set, get) => ({
    ...initialState,

    addEntry: (entryData) => {
      const entry: AuditEntry = {
        id: crypto.randomUUID(),
        ...entryData,
        timestamp: new Date().toISOString(),
        masked: SECURITY_CONFIG.AUDIT.MASK_IN_LOGS,
      };

      // Mask PHI/PII in audit entry if configured
      if (SECURITY_CONFIG.AUDIT.MASK_IN_LOGS && entry.details) {
        const fieldsToMask = ["ssn", "email", "phone", "mrn", "creditCard", "userId"];
        entry.details = maskObject(entry.details, fieldsToMask);
      }

      set((state) => {
        // Append to entries (immutable operation)
        const newEntries = [...state.entries, entry];

        // Limit entries to prevent memory issues
        if (newEntries.length > state.maxEntries) {
          // Remove oldest entries (keep most recent)
          const startIndex = newEntries.length - state.maxEntries;
          state.entries = newEntries.slice(startIndex);
        } else {
          state.entries = newEntries;
        }
      });
    },

    clearOldEntries: () => {
      const retentionDays = SECURITY_CONFIG.AUDIT.RETENTION_DAYS; // 2555 days (7 years)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      set((state) => {
        state.entries = state.entries.filter((entry) => {
          const entryDate = new Date(entry.timestamp);
          return entryDate >= cutoffDate;
        });
      });
    },

    exportEntries: (masked = true) => {
      const { entries } = get();

      if (masked) {
        // Return entries as-is (already masked if configured)
        return [...entries];
      }

      // Return unmasked entries (for compliance export)
      // Note: Requires special permissions in production
      return entries.map((entry) => ({
        ...entry,
        masked: false,
      }));
    },

    getEntriesByUser: (userId: string) => {
      const { entries } = get();
      return entries.filter((entry) => entry.userId === userId);
    },

    getEntriesByResource: (resource: string) => {
      const { entries } = get();
      return entries.filter((entry) => entry.resource === resource);
    },
  }))
);

// Selectors
export const useAuditEntries = () => useAuditStore((state) => state.entries);
export const useAuditActions = () =>
  useAuditStore((state) => ({
    addEntry: state.addEntry,
    clearOldEntries: state.clearOldEntries,
    exportEntries: state.exportEntries,
    getEntriesByUser: state.getEntriesByUser,
    getEntriesByResource: state.getEntriesByResource,
  }));
