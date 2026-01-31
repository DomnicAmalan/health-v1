/**
 * Test Setup for Admin App
 * Global test configuration and mocks
 */

import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock window.location for tests
if (typeof window !== "undefined") {
  Object.defineProperty(window, "location", {
    value: {
      origin: "http://localhost:4111",
      href: "http://localhost:4111",
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

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  sessionStorageMock.clear();
});
