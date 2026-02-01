/**
 * Client App API Client
 * Token-based authentication with interceptors using the shared base client
 */

import { type ApiResponse, BaseApiClient, type RequestConfig } from "@lazarus-life/shared/api";
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
 * Client-specific API client with interceptor support
 */
class ClientApiClient extends BaseApiClient {
  constructor() {
    super({
      baseUrl: API_BASE_URL,
      timeout: API_TIMEOUT,
      credentials: "include",
      retryAttempts: Number(import.meta.env.VITE_API_RETRY_ATTEMPTS) || 3,
      retryDelay: Number(import.meta.env.VITE_API_RETRY_DELAY) || 1000,
      auth: {
        type: "bearer",
        getToken: () => getAccessToken(),
      },
      requestInterceptors: [
        async (url, config) => {
          // Apply the existing request interceptor
          const intercepted = await requestInterceptor(url, config);
          return { ...config, headers: intercepted.headers || config.headers };
        },
      ],
      debug: import.meta.env.DEV,
    });
  }

  /**
   * Override request to use existing interceptors for full compatibility
   */
  override async request<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    console.log(endpoint, config, 'api client request');
    const url = this.buildUrl(endpoint);
    const timeout = config.timeout || this.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Apply request interceptor
      const interceptedConfig = await requestInterceptor(url, {
        ...config,
        signal: config.signal || controller.signal,
      });

      const response = await fetch(url, {
        method: config.method || "GET",
        headers: interceptedConfig.headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: interceptedConfig.signal,
        credentials: "include",
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = errorInterceptor(response, url);
        return { error };
      }

      return await responseInterceptor<T>(response, url);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        return {
          error: {
            message: "Request timeout",
            code: "TIMEOUT",
          },
        };
      }

      const apiError = errorInterceptor(error, url);
      return { error: apiError };
    }
  }

  /**
   * Set authentication tokens
   */
  setAuthTokens(accessToken: string | null, refreshToken: string | null): void {
    setTokens(accessToken, refreshToken);
  }
}

// Legacy ApiClient class for backward compatibility
export class ApiClient extends ClientApiClient {
  constructor(
    _baseUrl: string = API_BASE_URL,
    _timeout: number = API_TIMEOUT,
    _retryAttempts: number = Number(import.meta.env.VITE_API_RETRY_ATTEMPTS) || 3,
    _retryDelay: number = Number(import.meta.env.VITE_API_RETRY_DELAY) || 1000
  ) {
    // Parameters are unused - kept for backward compatibility
    // The actual configuration is set in ClientApiClient parent
    super();
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
/**
 * Hook to access the API client
 * Returns the singleton apiClient instance
 */
export function useApiClient(): ApiClient {
  return apiClient;
}
