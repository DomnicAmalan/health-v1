/**
 * API Client Tests
 * Tests for error sanitization and session management
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "./client";

// Mock fetch globally
global.fetch = vi.fn();

describe("API Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Error Sanitization", () => {
    it("should sanitize email in error messages", async () => {
      const mockError = new Error("User test@example.com not found");
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(mockError);

      const result = await apiClient.get("/users/123");

      expect(result.error).toBeDefined();
      expect(result.error?.message).not.toContain("test@example.com");
      expect(result.error?.message).toContain("[EMAIL]");
    });

    it("should sanitize SSN in error messages", async () => {
      const mockError = new Error("Invalid SSN 123-45-6789");
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(mockError);

      const result = await apiClient.get("/users/123");

      expect(result.error).toBeDefined();
      expect(result.error?.message).not.toContain("123-45-6789");
      expect(result.error?.message).toContain("[SSN]");
    });

    it("should sanitize phone numbers in error messages", async () => {
      const mockError = new Error("Invalid phone 555-123-4567");
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(mockError);

      const result = await apiClient.get("/users/123");

      expect(result.error).toBeDefined();
      expect(result.error?.message).not.toContain("555-123-4567");
      expect(result.error?.message).toContain("[PHONE]");
    });

    it("should sanitize UUIDs in error messages", async () => {
      const mockError = new Error("User 550e8400-e29b-41d4-a716-446655440000 not found");
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(mockError);

      const result = await apiClient.get("/users/123");

      expect(result.error).toBeDefined();
      expect(result.error?.message).not.toContain("550e8400-e29b-41d4-a716-446655440000");
      expect(result.error?.message).toContain("[ID]");
    });

    it("should sanitize multiple PII patterns in one error", async () => {
      const mockError = new Error(
        "User test@example.com with SSN 123-45-6789 and phone 555-123-4567 not found"
      );
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(mockError);

      const result = await apiClient.get("/users/123");

      expect(result.error).toBeDefined();
      const message = result.error?.message || "";
      expect(message).not.toContain("test@example.com");
      expect(message).not.toContain("123-45-6789");
      expect(message).not.toContain("555-123-4567");
      expect(message).toContain("[EMAIL]");
      expect(message).toContain("[SSN]");
      expect(message).toContain("[PHONE]");
    });
  });

  describe("HTTP Error Responses", () => {
    it("should handle 401 errors", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: "Unauthorized" }),
      });

      const result = await apiClient.get("/protected");

      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(401);
      expect(result.error?.code).toBe("401");
    });

    it("should handle 403 errors", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({ error: "Access denied" }),
      });

      const result = await apiClient.get("/admin");

      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(403);
      expect(result.error?.code).toBe("403");
    });

    it("should handle 500 errors", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Server error with email test@example.com" }),
      });

      const result = await apiClient.get("/api/endpoint");

      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(500);
      // Error message should be sanitized
      expect(result.error?.message).not.toContain("test@example.com");
    });
  });

  describe("Successful Requests", () => {
    it("should return data on successful request", async () => {
      const mockData = { id: "user-123", name: "Test User" };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockData,
      });

      const result = await apiClient.get("/users/123");

      expect(result.data).toEqual(mockData);
      expect(result.error).toBeUndefined();
    });

    it("should include custom headers", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({}),
      });

      await apiClient.get("/test");

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall).toBeDefined();
      
      if (fetchCall) {
        const headers = fetchCall[1].headers;
        expect(headers["X-App-Type"]).toBe("admin-ui");
        expect(headers["X-App-Device"]).toBe("web");
      }
    });
  });

  describe("Session-based Authentication", () => {
    it("should use credentials: include for session auth", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({}),
      });

      await apiClient.get("/test");

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall).toBeDefined();
      
      if (fetchCall) {
        expect(fetchCall[1].credentials).toBe("include");
      }
    });
  });
});
