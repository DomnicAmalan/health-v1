/**
 * Query Keys Tests
 * Tests for hierarchical query key factories
 */

import { describe, it, expect } from "vitest";
import {
  USERS_QUERY_KEYS,
  ORGANIZATIONS_QUERY_KEYS,
  PERMISSIONS_QUERY_KEYS,
  SERVICES_QUERY_KEYS,
} from "./queryKeys";

describe("Query Key Factories", () => {
  describe("USERS_QUERY_KEYS", () => {
    it("should generate all keys", () => {
      expect(USERS_QUERY_KEYS.all).toEqual(["users"]);
    });

    it("should generate lists keys", () => {
      expect(USERS_QUERY_KEYS.lists()).toEqual(["users", "list"]);
    });

    it("should generate list keys with filters", () => {
      const result = USERS_QUERY_KEYS.list({ searchTerm: "john" });
      expect(result).toEqual(["users", "list", { filters: { searchTerm: "john" } }]);
    });

    it("should generate list keys without filters", () => {
      const result = USERS_QUERY_KEYS.list();
      expect(result).toEqual(["users", "list", { filters: undefined }]);
    });

    it("should generate details keys", () => {
      expect(USERS_QUERY_KEYS.details()).toEqual(["users", "detail"]);
    });

    it("should generate detail keys with ID", () => {
      const result = USERS_QUERY_KEYS.detail("user-123");
      expect(result).toEqual(["users", "detail", "user-123"]);
    });

    it("should create hierarchical keys for cache invalidation", () => {
      // Verify hierarchical structure
      const all = USERS_QUERY_KEYS.all;
      const lists = USERS_QUERY_KEYS.lists();
      const list = USERS_QUERY_KEYS.list({ searchTerm: "test" });

      // Each level should start with parent keys
      expect(lists[0]).toBe(all[0]);
      expect(list[0]).toBe(all[0]);
      expect(list[1]).toBe(lists[1]);
    });
  });

  describe("ORGANIZATIONS_QUERY_KEYS", () => {
    it("should generate all keys", () => {
      expect(ORGANIZATIONS_QUERY_KEYS.all).toEqual(["organizations"]);
    });

    it("should generate list keys", () => {
      expect(ORGANIZATIONS_QUERY_KEYS.list()).toEqual(["organizations", "list"]);
    });

    it("should generate detail keys", () => {
      const result = ORGANIZATIONS_QUERY_KEYS.detail("org-456");
      expect(result).toEqual(["organizations", "detail", "org-456"]);
    });
  });

  describe("PERMISSIONS_QUERY_KEYS", () => {
    it("should generate user permission keys", () => {
      const result = PERMISSIONS_QUERY_KEYS.user("user-123");
      expect(result).toEqual(["permissions", "user", "user-123"]);
    });

    it("should generate user pages keys", () => {
      const result = PERMISSIONS_QUERY_KEYS.userPages("user-123");
      expect(result).toEqual(["permissions", "user", "user-123", "pages"]);
    });

    it("should generate user buttons keys", () => {
      const result = PERMISSIONS_QUERY_KEYS.userButtons("user-123", "dashboard");
      expect(result).toEqual(["permissions", "user", "user-123", "buttons", "dashboard"]);
    });

    it("should generate user fields keys", () => {
      const result = PERMISSIONS_QUERY_KEYS.userFields("user-123", "profile");
      expect(result).toEqual(["permissions", "user", "user-123", "fields", "profile"]);
    });

    it("should create hierarchical permission keys", () => {
      const user = PERMISSIONS_QUERY_KEYS.user("user-123");
      const pages = PERMISSIONS_QUERY_KEYS.userPages("user-123");
      const buttons = PERMISSIONS_QUERY_KEYS.userButtons("user-123", "dashboard");

      // Verify hierarchy
      expect(pages.slice(0, 3)).toEqual(user);
      expect(buttons.slice(0, 3)).toEqual(user);
    });
  });

  describe("SERVICES_QUERY_KEYS", () => {
    it("should generate all keys", () => {
      expect(SERVICES_QUERY_KEYS.all).toEqual(["services"]);
    });

    it("should generate status keys", () => {
      expect(SERVICES_QUERY_KEYS.status()).toEqual(["services", "status"]);
    });

    it("should generate list keys", () => {
      expect(SERVICES_QUERY_KEYS.list()).toEqual(["services", "list"]);
    });
  });

  describe("Query Key Uniqueness", () => {
    it("should generate unique keys for different filters", () => {
      const key1 = USERS_QUERY_KEYS.list({ searchTerm: "john" });
      const key2 = USERS_QUERY_KEYS.list({ searchTerm: "jane" });

      expect(key1).not.toEqual(key2);
    });

    it("should generate unique keys for different IDs", () => {
      const key1 = USERS_QUERY_KEYS.detail("user-1");
      const key2 = USERS_QUERY_KEYS.detail("user-2");

      expect(key1).not.toEqual(key2);
    });

    it("should generate same keys for same parameters", () => {
      const key1 = USERS_QUERY_KEYS.list({ searchTerm: "test" });
      const key2 = USERS_QUERY_KEYS.list({ searchTerm: "test" });

      expect(key1).toEqual(key2);
    });
  });

  describe("Cache Invalidation Patterns", () => {
    it("should allow invalidating all users queries", () => {
      const allKey = USERS_QUERY_KEYS.all;

      // Simulates queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.all })
      // This would invalidate all user-related queries
      expect(allKey).toEqual(["users"]);
    });

    it("should allow invalidating all list queries", () => {
      const listsKey = USERS_QUERY_KEYS.lists();

      // This would invalidate all list queries but not detail queries
      expect(listsKey).toEqual(["users", "list"]);
    });

    it("should allow invalidating specific detail query", () => {
      const detailKey = USERS_QUERY_KEYS.detail("user-123");

      // This would only invalidate the specific user detail
      expect(detailKey).toEqual(["users", "detail", "user-123"]);
    });
  });
});
