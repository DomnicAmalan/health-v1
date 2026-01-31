/**
 * Auth Store Tests
 * Tests for authentication state management
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./authStore";
import type { UserInfo } from "@/lib/api/types";

describe("AuthStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      error: null,
    });
    sessionStorage.clear();
  });

  const createTestUser = (overrides?: Partial<UserInfo>): UserInfo => ({
    id: "user-123",
    email: "test@example.com",
    username: "testuser",
    role: "admin",
    name: "Test User",
    ...overrides,
  });

  describe("setUser", () => {
    it("should set user in store", () => {
      const testUser = createTestUser();

      useAuthStore.getState().setUser(testUser);

      expect(useAuthStore.getState().user).toEqual(testUser);
    });

    it("should clear error when setting user", () => {
      useAuthStore.setState({ error: "Previous error" });

      const testUser = createTestUser();

      useAuthStore.getState().setUser(testUser);

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe("logout", () => {
    it("should clear user from store", () => {
      const testUser = createTestUser();

      useAuthStore.setState({ user: testUser });
      useAuthStore.getState().logout();

      expect(useAuthStore.getState().user).toBeNull();
    });

    it("should clear session storage on logout", () => {
      sessionStorage.setItem("test-key", "test-value");

      useAuthStore.getState().logout();

      expect(sessionStorage.getItem("test-key")).toBeNull();
    });
  });

  describe("Authentication State", () => {
    it("should be unauthenticated by default", () => {
      const { user } = useAuthStore.getState();
      expect(user).toBeNull();
    });

    it("should be authenticated when user is set", () => {
      const testUser = createTestUser();

      useAuthStore.getState().setUser(testUser);

      const { user } = useAuthStore.getState();
      expect(user).not.toBeNull();
      expect(user?.id).toBe("user-123");
    });
  });

  describe("User Roles", () => {
    it("should handle admin role", () => {
      const adminUser = createTestUser({
        id: "admin-1",
        email: "admin@example.com",
        username: "admin",
        role: "admin",
        name: "Admin User",
      });

      useAuthStore.getState().setUser(adminUser);

      expect(useAuthStore.getState().user?.role).toBe("admin");
    });

    it("should handle user role", () => {
      const regularUser = createTestUser({
        id: "user-1",
        email: "user@example.com",
        username: "regularuser",
        role: "user",
        name: "Regular User",
      });

      useAuthStore.getState().setUser(regularUser);

      expect(useAuthStore.getState().user?.role).toBe("user");
    });
  });
});
