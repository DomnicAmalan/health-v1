/**
 * API Client Mocking Utilities
 *
 * Provides helpers for mocking API calls in tests.
 * Works with our BaseApiClient architecture.
 *
 * Usage:
 *   const mockClient = createMockApiClient();
 *   mockClient.get.mockResolvedValue(mockApiResponse({ id: '123' }));
 */

import { vi, type Mock } from 'vitest';

/**
 * API response structure
 */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status?: number;
}

/**
 * Paginated API response structure
 */
export interface PaginatedApiResponse<T> {
  data: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  } | null;
  error: string | null;
  status?: number;
}

/**
 * Mock API client interface
 */
export interface MockApiClient {
  get: Mock<(url: string, options?: RequestInit) => Promise<ApiResponse<unknown>>>;
  post: Mock<(url: string, data?: unknown, options?: RequestInit) => Promise<ApiResponse<unknown>>>;
  put: Mock<(url: string, data?: unknown, options?: RequestInit) => Promise<ApiResponse<unknown>>>;
  patch: Mock<(url: string, data?: unknown, options?: RequestInit) => Promise<ApiResponse<unknown>>>;
  delete: Mock<(url: string, options?: RequestInit) => Promise<ApiResponse<unknown>>>;
}

/**
 * Create a mock API client with vi.fn() mocks
 *
 * @returns Mock API client with all HTTP methods mocked
 *
 * @example
 * ```ts
 * const mockClient = createMockApiClient();
 * mockClient.get.mockResolvedValue(mockApiResponse({ users: [] }));
 * ```
 */
export function createMockApiClient(): MockApiClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
}

/**
 * Create a successful API response
 *
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @returns Mocked API response
 *
 * @example
 * ```ts
 * const response = mockApiResponse({ id: '123', name: 'Test' });
 * mockClient.get.mockResolvedValue(response);
 * ```
 */
export function mockApiResponse<T>(data: T, status = 200): ApiResponse<T> {
  return {
    data,
    error: null,
    status,
  };
}

/**
 * Create an error API response
 *
 * @param error - Error message
 * @param status - HTTP status code (default: 500)
 * @returns Mocked error response
 *
 * @example
 * ```ts
 * const response = mockApiError('Not found', 404);
 * mockClient.get.mockResolvedValue(response);
 * ```
 */
export function mockApiError(error: string, status = 500): ApiResponse<null> {
  return {
    data: null,
    error,
    status,
  };
}

/**
 * Create a paginated API response
 *
 * @param items - Array of items
 * @param total - Total count
 * @param page - Current page (default: 1)
 * @param pageSize - Page size (default: 20)
 * @returns Mocked paginated response
 *
 * @example
 * ```ts
 * const patients = [patient1, patient2];
 * const response = mockPaginatedResponse(patients, 100);
 * mockClient.get.mockResolvedValue(response);
 * ```
 */
export function mockPaginatedResponse<T>(
  items: T[],
  total: number,
  page = 1,
  pageSize = 20
): PaginatedApiResponse<T> {
  return {
    data: {
      items,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    },
    error: null,
    status: 200,
  };
}

/**
 * Create a delay for simulating network latency
 *
 * @param ms - Delay in milliseconds
 * @returns Promise that resolves after delay
 *
 * @example
 * ```ts
 * mockClient.get.mockImplementation(async () => {
 *   await delay(100);
 *   return mockApiResponse({ data: 'slow response' });
 * });
 * ```
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock fetch globally for tests
 *
 * @param mockFn - Mock implementation
 *
 * @example
 * ```ts
 * mockFetch(() => Promise.resolve({
 *   ok: true,
 *   json: () => Promise.resolve({ data: 'test' }),
 * }));
 * ```
 */
export function mockFetch(mockFn: typeof fetch) {
  global.fetch = vi.fn(mockFn);
}

/**
 * Reset all API client mocks
 *
 * @param client - Mock API client
 *
 * @example
 * ```ts
 * afterEach(() => {
 *   resetMockApiClient(mockClient);
 * });
 * ```
 */
export function resetMockApiClient(client: MockApiClient) {
  Object.values(client).forEach((mock) => {
    if (mock && typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
}

/**
 * Utility to verify API calls
 *
 * @param mock - Mock function to verify
 * @param url - Expected URL
 * @param data - Expected request data (optional)
 *
 * @example
 * ```ts
 * expectApiCall(mockClient.post, '/api/v1/patients', { name: 'Test' });
 * ```
 */
export function expectApiCall(
  mock: Mock,
  url: string,
  data?: unknown
) {
  if (data !== undefined) {
    expect(mock).toHaveBeenCalledWith(url, data, expect.anything());
  } else {
    expect(mock).toHaveBeenCalledWith(url, expect.anything());
  }
}

/**
 * Utility to verify API call count
 *
 * @param mock - Mock function to verify
 * @param count - Expected call count
 *
 * @example
 * ```ts
 * expectApiCallCount(mockClient.get, 2);
 * ```
 */
export function expectApiCallCount(mock: Mock, count: number) {
  expect(mock).toHaveBeenCalledTimes(count);
}

/**
 * Create a successful response with delay (for loading state tests)
 *
 * @param data - Response data
 * @param delayMs - Delay in milliseconds
 * @returns Promise that resolves after delay
 *
 * @example
 * ```ts
 * mockClient.get.mockImplementation(() =>
 *   mockDelayedResponse({ users: [] }, 500)
 * );
 * ```
 */
export async function mockDelayedResponse<T>(
  data: T,
  delayMs: number
): Promise<ApiResponse<T>> {
  await delay(delayMs);
  return mockApiResponse(data);
}
