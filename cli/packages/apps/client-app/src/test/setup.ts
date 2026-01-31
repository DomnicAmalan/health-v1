/**
 * Test Setup
 * Global test configuration and mocks
 */

import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Ensure document exists (jsdom should provide this, but ensure it's available)
if (typeof document === "undefined") {
}

// Mock window.location for tests
if (typeof window !== "undefined") {
  Object.defineProperty(window, "location", {
    value: {
      origin: "http://localhost:5173",
      href: "http://localhost:5173",
    },
    writable: true,
  });
}

// Mock crypto.randomUUID
if (typeof global !== "undefined" && global.crypto) {
  Object.defineProperty(global.crypto, "randomUUID", {
    value: () => `test-uuid-${Math.random().toString(36).substring(7)}`,
    writable: true,
    configurable: true,
  });
}

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
