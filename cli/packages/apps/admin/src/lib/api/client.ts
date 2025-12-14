/**
 * Admin API Client
 * Session-based authentication using the shared base client
 */

import { BaseApiClient, API_ROUTES, getApiUrl } from "@health-v1/shared/api";
import { env } from "../env";

// Create admin client with session-based auth and custom headers
export const apiClient = new BaseApiClient({
  baseUrl: env.VITE_API_BASE_URL,
  auth: { type: "cookie" },
  credentials: "include",
  headers: {
    "X-App-Type": "admin-ui",
    "X-App-Device": "web",
  },
  debug: import.meta.env.DEV,
});

// Re-export routes and utilities
export { API_ROUTES, getApiUrl };

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
