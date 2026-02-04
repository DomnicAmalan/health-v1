/**
 * Client App API Client
 * Token-based authentication using shared API client factory
 */

import { createApiClient, type ApiClient } from "@lazarus-life/shared";
import {
  errorInterceptor,
  getAccessToken,
  requestInterceptor,
  responseInterceptor,
  setTokens,
} from "./interceptors";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4117";
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

/**
 * Client API Client - Token-based authentication
 */
const clientApiClient = createApiClient({
  strategy: "token",
  baseUrl: API_BASE_URL,
  getAccessToken,
  setTokens,
  tokenPrefix: "Bearer",
  requestInterceptor,
  responseInterceptor,
  errorInterceptor,
  options: {
    timeout: API_TIMEOUT,
    credentials: "include",
    retryAttempts: Number(import.meta.env.VITE_API_RETRY_ATTEMPTS) || 3,
    retryDelay: Number(import.meta.env.VITE_API_RETRY_DELAY) || 1000,
    debug: import.meta.env.DEV,
  },
}) as ApiClient & { setAuthTokens: (accessToken: string | null, refreshToken: string | null) => void };

// Legacy ApiClient class for backward compatibility
export class ApiClient {
  constructor(
    _baseUrl: string = API_BASE_URL,
    _timeout: number = API_TIMEOUT,
    _retryAttempts: number = Number(import.meta.env.VITE_API_RETRY_ATTEMPTS) || 3,
    _retryDelay: number = Number(import.meta.env.VITE_API_RETRY_DELAY) || 1000
  ) {
    // Parameters are unused - kept for backward compatibility
    // The actual client is the singleton clientApiClient
  }

  // Delegate all methods to clientApiClient
  request = clientApiClient.request.bind(clientApiClient);
  get = clientApiClient.get.bind(clientApiClient);
  post = clientApiClient.post.bind(clientApiClient);
  put = clientApiClient.put.bind(clientApiClient);
  patch = clientApiClient.patch.bind(clientApiClient);
  delete = clientApiClient.delete.bind(clientApiClient);
  setAuthTokens = clientApiClient.setAuthTokens.bind(clientApiClient);
}

// Export singleton instance
export const apiClient = clientApiClient;

/**
 * Hook to access the API client
 * Returns the singleton apiClient instance
 */
export function useApiClient(): typeof clientApiClient {
  return clientApiClient;
}
