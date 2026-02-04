/**
 * Admin API Client
 * Session-based authentication using shared API client factory
 */

import { createApiClient, sanitizeErrorMessage, type ApiError } from "@lazarus-life/shared";
import { env } from "../env";

// Export API routes and utilities
export { API_ROUTES, getApiUrl } from "@lazarus-life/shared";

/**
 * Admin API Client - Session-based authentication
 */
console.log('🔍 Admin API Base URL:', env.VITE_API_BASE_URL);

export const apiClient = createApiClient({
  strategy: "session",
  baseUrl: env.VITE_API_BASE_URL,
  headers: {
    "X-App-Type": "admin-ui",
    "X-App-Device": "web",
  },
  errorInterceptor: (error: unknown, url: string): ApiError => {
    let message = "An error occurred";
    let code: string | undefined;
    let status: number | undefined;

    if (error instanceof Error) {
      message = sanitizeErrorMessage(error.message);
    }

    // Check for Response-like objects
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status: unknown }).status === "number"
    ) {
      const responseError = error as Response;
      status = responseError.status;
      code = responseError.status.toString();
      message = `HTTP ${responseError.status}: ${responseError.statusText || "Error"}`;
      message = sanitizeErrorMessage(message);
    }

    return {
      message,
      code,
      status,
      details: { url },
    };
  },
  options: {
    debug: import.meta.env.DEV,
  },
});

// Legacy function for backward compatibility
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET") as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  const result = await apiClient.request<T>(path, {
    method,
    body: options.body ? JSON.parse(options.body as string) : undefined,
    headers: options.headers as Record<string, string>,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as T;
}
