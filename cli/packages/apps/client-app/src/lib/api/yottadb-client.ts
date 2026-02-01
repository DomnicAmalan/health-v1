/**
 * YottaDB API Client
 * Direct client for accessing EHR data from YottaDB (VistA/MUMPS database)
 * Note: YottaDB API may not require authentication for development
 */

import { type ApiResponse, BaseApiClient, type RequestConfig } from "@lazarus-life/shared/api";

const YOTTADB_API_BASE_URL = import.meta.env.VITE_YOTTADB_API_BASE_URL || "http://localhost:9091";
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

/**
 * YottaDB-specific API client
 * Connects directly to the YottaDB REST API service (port 9091)
 */
class YottaDBApiClient extends BaseApiClient {
  constructor() {
    super({
      baseUrl: YOTTADB_API_BASE_URL,
      timeout: API_TIMEOUT,
      credentials: "omit", // YottaDB API doesn't use session cookies
      retryAttempts: Number(import.meta.env.VITE_API_RETRY_ATTEMPTS) || 3,
      retryDelay: Number(import.meta.env.VITE_API_RETRY_DELAY) || 1000,
      // No auth for now - YottaDB API may not require it in development
      // Can be added later if needed
      debug: import.meta.env.DEV,
    });
  }

  /**
   * Override request to handle YottaDB-specific responses
   */
  override async request<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const timeout = config.timeout || this.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: config.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...config.headers,
        },
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: config.signal || controller.signal,
        credentials: "omit",
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: response.statusText || "Unknown error",
        }));

        return {
          error: {
            message: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
            code: String(response.status),
            statusCode: response.status,
          },
        };
      }

      const data = await response.json();
      return { data: data as T };
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

      return {
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }
}

// Export singleton instance
export const yottadbApiClient = new YottaDBApiClient();

/**
 * Hook to access the YottaDB API client
 * Returns the singleton yottadbApiClient instance
 */
export function useYottaDBApiClient(): YottaDBApiClient {
  return yottadbApiClient;
}
