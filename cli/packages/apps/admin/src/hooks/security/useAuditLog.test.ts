/**
 * useAuditLog Hook Tests
 * Tests for audit logging hook integration
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useAuditLog } from "./useAuditLog";
import { useAuditStore } from "@/stores/auditStore";
import { useAuthStore } from "@/stores/authStore";
import type { UserInfo } from "@/lib/api/types";

describe("useAuditLog", () => {
  beforeEach(() => {
    // Reset audit store by setting empty entries array
    useAuditStore.setState({ entries: [] });

    // Set up mock user
    const testUser: UserInfo = {
      id: "test-user-123",
      email: "test@example.com",
      username: "testuser",
      role: "admin",
      name: "Test User",
    };
    
    useAuthStore.setState({
      user: testUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  });

  describe("logPHI", () => {
    it("should log PHI access to audit store", () => {
      const { result } = renderHook(() => useAuditLog());
      const auditStore = useAuditStore.getState();

      act(() => {
        result.current.logPHI("users", "user-456", { action: "view", email: "user@example.com" });
      });

      expect(auditStore.entries).toHaveLength(1);
      const entry = auditStore.entries[0];
      expect(entry).toBeDefined();
      expect(entry).toMatchObject({
        userId: "test-user-123",
        action: "PHI_ACCESS",
        resource: "users",
        resourceId: "user-456",
      });
    });

    it("should not log if user is not authenticated", () => {
      useAuthStore.setState({ user: null });
      const { result } = renderHook(() => useAuditLog());
      const auditStore = useAuditStore.getState();

      act(() => {
        result.current.logPHI("users", "user-456");
      });

      expect(auditStore.entries).toHaveLength(0);
    });
  });

  describe("logState", () => {
    it("should log state change to audit store", () => {
      const { result } = renderHook(() => useAuditLog());
      const auditStore = useAuditStore.getState();

      act(() => {
        result.current.logState("USER_PROVISIONED", "users", "user-456", {
          email: "new@example.com",
          role: "admin",
        });
      });

      expect(auditStore.entries).toHaveLength(1);
      const entry = auditStore.entries[0];
      expect(entry).toBeDefined();
      expect(entry).toMatchObject({
        userId: "test-user-123",
        action: "STATE_CHANGE:USER_PROVISIONED",
        resource: "users",
        resourceId: "user-456",
      });
    });
  });

  describe("logPermission", () => {
    it("should log permission check to audit store", () => {
      const { result } = renderHook(() => useAuditLog());
      const auditStore = useAuditStore.getState();

      act(() => {
        result.current.logPermission("users:create", true, "users");
      });

      expect(auditStore.entries).toHaveLength(1);
      const entry = auditStore.entries[0];
      expect(entry).toBeDefined();
      expect(entry).toMatchObject({
        userId: "test-user-123",
        action: "PERMISSION_CHECK",
        resource: "users",
      });
      expect(entry?.details).toMatchObject({
        permission: "users:create",
        granted: true,
      });
    });

    it("should log denied permissions", () => {
      const { result } = renderHook(() => useAuditLog());
      const auditStore = useAuditStore.getState();

      act(() => {
        result.current.logPermission("users:delete", false, "users");
      });

      const entry = auditStore.entries[0];
      expect(entry).toBeDefined();
      expect(entry?.details?.granted).toBe(false);
    });
  });

  describe("logDenied", () => {
    it("should log access denied to audit store", () => {
      const { result } = renderHook(() => useAuditLog());
      const auditStore = useAuditStore.getState();

      act(() => {
        result.current.logDenied("admin/settings", "admin:settings:view");
      });

      expect(auditStore.entries).toHaveLength(1);
      const entry = auditStore.entries[0];
      expect(entry).toBeDefined();
      expect(entry).toMatchObject({
        userId: "test-user-123",
        action: "ACCESS_DENIED",
        resource: "admin/settings",
      });
      expect(entry?.details).toMatchObject({
        requiredPermission: "admin:settings:view",
        userRole: "admin",
      });
    });
  });

  describe("getUserEntries", () => {
    it("should return entries for specific user", () => {
      const { result } = renderHook(() => useAuditLog());

      act(() => {
        result.current.logPHI("users", "user-1");
        result.current.logState("TEST", "users", "user-2");
      });

      const entries = result.current.getUserEntries("test-user-123");

      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.userId === "test-user-123")).toBe(true);
    });
  });

  describe("getResourceEntries", () => {
    it("should return entries for specific resource", () => {
      const { result } = renderHook(() => useAuditLog());

      act(() => {
        result.current.logPHI("users", "user-1");
        result.current.logState("TEST", "groups", "group-1");
        result.current.logPHI("users", "user-2");
      });

      const entries = result.current.getResourceEntries("users");

      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.resource === "users")).toBe(true);
    });
  });

  describe("exportAuditLog", () => {
    it("should export masked entries by default", () => {
      const { result } = renderHook(() => useAuditLog());

      act(() => {
        result.current.logPHI("users", "user-1", { email: "test@example.com" });
      });

      const exported = result.current.exportAuditLog();

      expect(exported).toHaveLength(1);
      const entry = exported[0];
      expect(entry).toBeDefined();
      expect(entry?.masked).toBe(true);
    });

    it("should export unmasked entries when requested", () => {
      const { result } = renderHook(() => useAuditLog());

      act(() => {
        result.current.logPHI("users", "user-1");
      });

      const exported = result.current.exportAuditLog(false);

      expect(exported).toHaveLength(1);
      const entry = exported[0];
      expect(entry).toBeDefined();
      expect(entry?.masked).toBe(false);
    });
  });
});
