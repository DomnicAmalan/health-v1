/**
 * Route Guards Tests
 */

import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/authStore";
import { checkRoutePermission, createRouteGuard } from "./routeGuards";

// Mock audit API
import * as auditApi from "@/lib/api/audit";
vi.mock("@/lib/api/audit", () => ({
  logAccessDenied: vi.fn(),
}));

describe("Route Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: "test-user-id",
        email: "test@example.com",
        role: "doctor",
        permissions: [PERMISSIONS.PATIENTS.VIEW],
      },
      permissions: [PERMISSIONS.PATIENTS.VIEW],
    });
  });

  describe("checkRoutePermission", () => {
    it("should allow access when user has permission", () => {
      const hasPermission = (perm: string) => useAuthStore.getState().permissions.includes(perm);

      const result = checkRoutePermission(hasPermission, {
        requiredPermission: PERMISSIONS.PATIENTS.VIEW,
        resource: "patients",
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should deny access when user lacks permission", () => {
      const hasPermission = (perm: string) => useAuthStore.getState().permissions.includes(perm);

      const result = checkRoutePermission(hasPermission, {
        requiredPermission: PERMISSIONS.PATIENTS.UPDATE,
        resource: "patients",
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Missing required permission");
    });

    it("should log access denied when resource is provided", () => {
      const hasPermission = (perm: string) => useAuthStore.getState().permissions.includes(perm);

      checkRoutePermission(hasPermission, {
        requiredPermission: PERMISSIONS.PATIENTS.UPDATE,
        resource: "patients",
      });

      expect(vi.mocked(auditApi.logAccessDenied)).toHaveBeenCalled();
    });
  });

  describe("createRouteGuard", () => {
    it("should create a route guard function", () => {
      const hasPermission = (perm: string) => useAuthStore.getState().permissions.includes(perm);

      const guard = createRouteGuard(hasPermission);

      const result = guard({
        requiredPermission: PERMISSIONS.PATIENTS.VIEW,
        resource: "patients",
      });

      expect(result.allowed).toBe(true);
    });

    it("should work with different permission checks", () => {
      const hasPermission = (perm: string) => useAuthStore.getState().permissions.includes(perm);

      const guard = createRouteGuard(hasPermission);

      const allowed = guard({
        requiredPermission: PERMISSIONS.PATIENTS.VIEW,
        resource: "patients",
      });

      const denied = guard({
        requiredPermission: PERMISSIONS.CLINICAL.VIEW,
        resource: "clinical",
      });

      expect(allowed.allowed).toBe(true);
      expect(denied.allowed).toBe(false);
    });
  });
});
