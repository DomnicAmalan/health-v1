/**
 * Audit Store Tests
 * Tests for HIPAA-compliant audit logging
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useAuditStore } from "./auditStore";

describe("AuditStore", () => {
  beforeEach(() => {
    // Reset store before each test by setting empty entries array
    useAuditStore.setState({ entries: [] });
  });

  describe("addEntry", () => {
    it("should add audit entry with auto-generated ID and timestamp", () => {
      const { addEntry, entries } = useAuditStore.getState();

      addEntry({
        userId: "user-123",
        action: "USER_PROVISIONED",
        resource: "users",
        resourceId: "new-user-456",
        details: { email: "test@example.com" },
      });

      expect(entries).toHaveLength(1);
      const entry = entries[0];
      expect(entry).toBeDefined();
      expect(entry).toMatchObject({
        userId: "user-123",
        action: "USER_PROVISIONED",
        resource: "users",
        resourceId: "new-user-456",
      });
      expect(entry?.id).toBeDefined();
      expect(entry?.timestamp).toBeDefined();
    });

    it("should mask PHI in audit entry details", () => {
      const { addEntry, entries } = useAuditStore.getState();

      addEntry({
        userId: "user-123",
        action: "PHI_ACCESS",
        resource: "users",
        details: {
          email: "sensitive@example.com",
          ssn: "123-45-6789",
          phone: "555-123-4567",
        },
      });

      // PHI fields should be masked
      const entry = entries[0];
      expect(entry).toBeDefined();
      expect(entry?.details?.email).toBe("[REDACTED]");
      expect(entry?.details?.ssn).toBe("[REDACTED]");
      expect(entry?.details?.phone).toBe("[REDACTED]");
    });

    it("should preserve non-PHI fields in details", () => {
      const { addEntry, entries } = useAuditStore.getState();

      addEntry({
        userId: "user-123",
        action: "USER_PROVISIONED",
        resource: "users",
        details: {
          role: "admin",
          organizationId: "org-456",
          action: "create",
        },
      });

      const entry = entries[0];
      expect(entry).toBeDefined();
      expect(entry?.details?.role).toBe("admin");
      expect(entry?.details?.organizationId).toBe("org-456");
      expect(entry?.details?.action).toBe("create");
    });

    it("should limit entries to maxEntries (10000)", () => {
      const store = useAuditStore.getState();

      // Add more than maxEntries
      for (let i = 0; i < 10005; i++) {
        store.addEntry({
          userId: "user-123",
          action: "TEST_ACTION",
          resource: "test",
        });
      }

      // Should only keep most recent maxEntries
      expect(store.entries).toHaveLength(10000);
    });
  });

  describe("clearOldEntries", () => {
    it("should remove entries older than retention period", () => {
      const { addEntry, clearOldEntries, entries } = useAuditStore.getState();

      // Add an old entry (manually set timestamp to 8 years ago)
      addEntry({
        userId: "user-123",
        action: "OLD_ACTION",
        resource: "test",
      });
      const oldEntry = entries[0];
      const eightYearsAgo = new Date();
      eightYearsAgo.setFullYear(eightYearsAgo.getFullYear() - 8);
      
      if (oldEntry) {
        // Modifying timestamp for testing
        (oldEntry as { timestamp: string }).timestamp = eightYearsAgo.toISOString();
      }

      // Add a recent entry
      addEntry({
        userId: "user-456",
        action: "RECENT_ACTION",
        resource: "test",
      });

      // Clear old entries
      clearOldEntries();

      // Only recent entry should remain
      const updatedEntries = useAuditStore.getState().entries;
      expect(updatedEntries).toHaveLength(1);
      expect(updatedEntries[0]?.action).toBe("RECENT_ACTION");
    });

    it("should keep all entries within retention period (7 years)", () => {
      const { addEntry, clearOldEntries, entries } = useAuditStore.getState();

      // Add entries from the last 5 years
      for (let i = 0; i < 5; i++) {
        addEntry({
          userId: `user-${i}`,
          action: `ACTION_${i}`,
          resource: "test",
        });
      }

      clearOldEntries();

      // All entries should be retained
      expect(entries).toHaveLength(5);
    });
  });

  describe("exportEntries", () => {
    it("should return all entries when masked=true", () => {
      const { addEntry, exportEntries } = useAuditStore.getState();

      addEntry({
        userId: "user-123",
        action: "TEST_ACTION",
        resource: "test",
        details: { email: "test@example.com" },
      });

      const exported = exportEntries(true);

      expect(exported).toHaveLength(1);
      const entry = exported[0];
      expect(entry).toBeDefined();
      expect(entry?.masked).toBe(true);
      expect(entry?.details?.email).toBe("[REDACTED]");
    });

    it("should return entries with masked=false when unmasked export", () => {
      const { addEntry, exportEntries } = useAuditStore.getState();

      addEntry({
        userId: "user-123",
        action: "TEST_ACTION",
        resource: "test",
      });

      const exported = exportEntries(false);

      expect(exported).toHaveLength(1);
      const entry = exported[0];
      expect(entry).toBeDefined();
      expect(entry?.masked).toBe(false);
    });
  });

  describe("getEntriesByUser", () => {
    it("should filter entries by user ID", () => {
      const { addEntry, getEntriesByUser } = useAuditStore.getState();

      addEntry({ userId: "user-1", action: "ACTION_1", resource: "test" });
      addEntry({ userId: "user-2", action: "ACTION_2", resource: "test" });
      addEntry({ userId: "user-1", action: "ACTION_3", resource: "test" });

      const user1Entries = getEntriesByUser("user-1");

      expect(user1Entries).toHaveLength(2);
      expect(user1Entries.every((e) => e.userId === "user-1")).toBe(true);
    });
  });

  describe("getEntriesByResource", () => {
    it("should filter entries by resource", () => {
      const { addEntry, getEntriesByResource } = useAuditStore.getState();

      addEntry({ userId: "user-1", action: "ACTION_1", resource: "users" });
      addEntry({ userId: "user-1", action: "ACTION_2", resource: "groups" });
      addEntry({ userId: "user-1", action: "ACTION_3", resource: "users" });

      const userEntries = getEntriesByResource("users");

      expect(userEntries).toHaveLength(2);
      expect(userEntries.every((e) => e.resource === "users")).toBe(true);
    });
  });
});
