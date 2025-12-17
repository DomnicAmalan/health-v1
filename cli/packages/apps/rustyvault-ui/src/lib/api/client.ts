/**
 * Lazarus Life Vault API Client
 * Vault token-based authentication using the shared base client
 */

import { BaseApiClient, ApiClientError, type ApiResponse } from "@lazarus-life/shared/api";
import { useAuthStore } from "@/stores/authStore";

// Vault API base URL - should NOT include /api prefix
// Vault routes are directly under /v1/ (e.g., /v1/sys/realm, /v1/sys/policies/acl)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4117/v1";

/**
 * Custom error class for Vault API errors (legacy compatibility)
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public errors?: string[]
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Vault API Client
 * Uses X-RustyVault-Token header and unwraps { data: T } responses
 */
class VaultApiClient extends BaseApiClient {
  constructor() {
    super({
      baseUrl: API_BASE_URL,
      auth: {
        type: "custom",
        getHeaders: () => {
          const token = useAuthStore.getState().accessToken;
          return token ? { "X-RustyVault-Token": token } : {};
        },
        onAuthError: async () => {
          useAuthStore.getState().logout();
          return false;
        },
      },
      unwrapData: true,
      dataKey: "data",
      debug: import.meta.env.DEV,
    });
  }

  /**
   * Override buildUrl to ensure Vault routes never get /api prefix
   * Vault API doesn't use /api prefix - routes are directly under /v1/
   * This override bypasses the parent class logic that might add /api
   */
  protected buildUrl(endpoint: string): string {
    // Handle absolute URLs
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      return endpoint;
    }
    
    // For Vault API, always use direct concatenation (no /api prefix)
    // Vault routes are: /v1/sys/*, /v1/realm/*, /v1/secret/*, etc.
    // Never use getApiUrl() which would add /api prefix
    const base = this.baseUrl.replace(/\/$/, "");
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${base}${path}`;
    
    // Debug logging
    if (this.debug) {
      console.log(`[VaultApiClient] buildUrl: endpoint="${endpoint}", baseUrl="${this.baseUrl}" -> "${url}"`);
    }
    
    return url;
  }

  /**
   * Vault LIST operation (special HTTP method)
   */
  async list<T>(endpoint: string): Promise<T> {
    const result = await this.request<T>(endpoint, { method: "LIST" });
    if (result.error) {
      throw new ApiError(result.error.message, result.error.status, [result.error.message]);
    }
    return result.data as T;
  }

  // Override methods to throw errors instead of returning ApiResponse
  // This maintains backward compatibility with existing code
  async get<T>(endpoint: string): Promise<T> {
    const result = await super.get<T>(endpoint);
    if (result.error) {
      throw new ApiError(result.error.message, result.error.status, [result.error.message]);
    }
    return result.data as T;
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const result = await super.post<T>(endpoint, body);
    if (result.error) {
      throw new ApiError(result.error.message, result.error.status, [result.error.message]);
    }
    return result.data as T;
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    const result = await super.put<T>(endpoint, body);
    if (result.error) {
      throw new ApiError(result.error.message, result.error.status, [result.error.message]);
    }
    return result.data as T;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const result = await super.delete<T>(endpoint);
    if (result.error) {
      throw new ApiError(result.error.message, result.error.status, [result.error.message]);
    }
    return result.data as T;
  }
}

// Export singleton instance
export const apiClient = new VaultApiClient();
