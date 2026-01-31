/**
 * API Interceptors Tests
 */

import { API_CONFIG } from "@lazarus-life/shared/api/config";
import { beforeEach, describe, expect, it, vi } from "vitest";

const API_BASE_URL = API_CONFIG.BASE_URL;

import {
  getAccessToken,
  getRefreshToken,
  requestInterceptor,
  responseInterceptor,
  setTokens,
} from "./interceptors";

// Mock masking
vi.mock("./masking", () => ({
  maskObject: vi.fn((obj) => obj),
}));

describe("API Interceptors", () => {
  beforeEach(() => {
    setTokens(null, null);
  });

  describe("Token Management", () => {
    it("should set and get access token", () => {
      setTokens("access-token", "refresh-token");
      expect(getAccessToken()).toBe("access-token");
    });

    it("should set and get refresh token", () => {
      setTokens("access-token", "refresh-token");
      expect(getRefreshToken()).toBe("refresh-token");
    });

    it("should clear tokens when set to null", () => {
      setTokens("access-token", "refresh-token");
      setTokens(null, null);
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });
  });

  describe("Request Interceptor", () => {
    // Note: Authorization header is NOT added by requestInterceptor
    // It's added by the ClientApiClient via auth.getToken() config
    it("should not add authorization header (handled by client)", async () => {
      setTokens("test-token", null);

      const config = await requestInterceptor(`${API_BASE_URL}/test`, {
        method: "GET",
      });

      // requestInterceptor does not inject Authorization header
      expect(config.headers?.Authorization).toBeUndefined();
    });

    it("should add request ID header", async () => {
      const config = await requestInterceptor(`${API_BASE_URL}/test`, {
        method: "GET",
      });

      expect(config.headers?.["X-Request-ID"]).toBeDefined();
      expect(typeof config.headers?.["X-Request-ID"]).toBe("string");
    });

    it("should add request timestamp header", async () => {
      const config = await requestInterceptor(`${API_BASE_URL}/test`, {
        method: "GET",
      });

      expect(config.headers?.["X-Request-Timestamp"]).toBeDefined();
      expect(config.headers?.["X-Request-Timestamp"]).toMatch(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });

    it("should add app type and device headers", async () => {
      const config = await requestInterceptor(`${API_BASE_URL}/test`, {
        method: "GET",
      });

      expect(config.headers?.["X-App-Type"]).toBe("client-ui");
      expect(config.headers?.["X-App-Device"]).toBeDefined();
    });

    it("should preserve existing headers", async () => {
      const config = await requestInterceptor(`${API_BASE_URL}/test`, {
        method: "GET",
        headers: { "X-Custom-Header": "custom-value" },
      });

      expect(config.headers?.["X-Custom-Header"]).toBe("custom-value");
    });
  });

  describe("Response Interceptor", () => {
    it("should parse and return data from successful response", async () => {
      const mockData = { name: "test" };
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => mockData,
      };

      const result = await responseInterceptor(mockResponse as unknown as Response, "/test");
      expect(result.data).toEqual(mockData);
    });

    it("should handle 403 Forbidden by throwing", async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        json: async () => ({ error: "Forbidden" }),
      };

      await expect(
        responseInterceptor(mockResponse as unknown as Response, "/test")
      ).rejects.toThrow("Access denied");
    });

    it("should parse and return 500 Server Error response", async () => {
      const mockResponse = {
        ok: true, // responseInterceptor doesn't check ok, it just parses
        status: 500,
        json: async () => ({ error: "Internal Server Error" }),
      };

      // responseInterceptor parses response, error handling is in client
      const result = await responseInterceptor(mockResponse as unknown as Response, "/test");
      expect(result.data).toEqual({ error: "Internal Server Error" });
    });
  });
});
