/**
 * Test Setup Utilities
 *
 * Global test setup helpers and configuration.
 * Import in vitest.setup.ts or at the top of test files.
 *
 * Usage:
 *   import { setupTestEnvironment } from '@lazarus-life/shared/test/helpers';
 *   setupTestEnvironment();
 */

import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Setup test environment with best practices
 *
 * - Configures automatic cleanup after each test
 * - Sets up global test utilities
 * - Configures matchers and assertions
 *
 * @example
 * ```ts
 * // In vitest.setup.ts
 * import { setupTestEnvironment } from '@lazarus-life/shared/test/helpers';
 * setupTestEnvironment();
 * ```
 */
export function setupTestEnvironment() {
  // Cleanup DOM after each test
  afterEach(() => {
    cleanup();
  });

  // Suppress console errors in tests (optional)
  const originalError = console.error;
  beforeEach(() => {
    console.error = (...args: unknown[]) => {
      // Filter out React Testing Library warnings
      if (
        typeof args[0] === 'string' &&
        args[0].includes('Warning: ReactDOM.render')
      ) {
        return;
      }
      originalError.call(console, ...args);
    };
  });

  afterEach(() => {
    console.error = originalError;
  });
}

/**
 * Mock window.matchMedia for components using media queries
 *
 * @example
 * ```ts
 * beforeAll(() => {
 *   mockMatchMedia();
 * });
 * ```
 */
export function mockMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

/**
 * Mock IntersectionObserver for components using it
 *
 * @example
 * ```ts
 * beforeAll(() => {
 *   mockIntersectionObserver();
 * });
 * ```
 */
export function mockIntersectionObserver() {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as unknown as typeof IntersectionObserver;
}

/**
 * Mock ResizeObserver for components using it
 *
 * @example
 * ```ts
 * beforeAll(() => {
 *   mockResizeObserver();
 * });
 * ```
 */
export function mockResizeObserver() {
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as unknown as typeof ResizeObserver;
}

/**
 * Mock localStorage for tests
 *
 * @example
 * ```ts
 * beforeEach(() => {
 *   mockLocalStorage();
 * });
 * ```
 */
export function mockLocalStorage() {
  const storage: Record<string, string> = {};

  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach((key) => delete storage[key]);
      },
      get length() {
        return Object.keys(storage).length;
      },
      key: (index: number) => Object.keys(storage)[index] || null,
    },
    writable: true,
  });
}

/**
 * Mock sessionStorage for tests
 *
 * @example
 * ```ts
 * beforeEach(() => {
 *   mockSessionStorage();
 * });
 * ```
 */
export function mockSessionStorage() {
  const storage: Record<string, string> = {};

  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach((key) => delete storage[key]);
      },
      get length() {
        return Object.keys(storage).length;
      },
      key: (index: number) => Object.keys(storage)[index] || null,
    },
    writable: true,
  });
}

/**
 * Wait for async updates to complete
 *
 * @param ms - Milliseconds to wait (default: 0)
 * @returns Promise that resolves after delay
 *
 * @example
 * ```ts
 * await waitForAsync();
 * expect(element).toBeInTheDocument();
 * ```
 */
export function waitForAsync(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Setup all common browser mocks at once
 *
 * @example
 * ```ts
 * beforeAll(() => {
 *   setupBrowserMocks();
 * });
 * ```
 */
export function setupBrowserMocks() {
  mockMatchMedia();
  mockIntersectionObserver();
  mockResizeObserver();
  mockLocalStorage();
  mockSessionStorage();
}
