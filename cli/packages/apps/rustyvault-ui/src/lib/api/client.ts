/**
 * Lazarus Life Vault API Client
 * Vault token-based authentication using shared API client factory
 */

import { createApiClient, VaultApiError } from "@lazarus-life/shared";
import { useAuthStore } from "@/stores/authStore";
import { API_BASE_URL, isDebugEnabled } from "@/lib/env";

// Re-export VaultApiError for backward compatibility
export { VaultApiError as ApiError };

/**
 * Vault API Client - Custom header authentication with error throwing
 */
export const apiClient = createApiClient({
  strategy: "vault",
  baseUrl: API_BASE_URL,
  getToken: () => useAuthStore.getState().accessToken,
  onAuthError: () => useAuthStore.getState().logout(),
  unwrapData: true,
  dataKey: "data",
  throwErrors: true,
  options: {
    debug: isDebugEnabled,
  },
});
