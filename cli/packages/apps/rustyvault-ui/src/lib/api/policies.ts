import { apiClient } from './client';
import { VAULT_ROUTES } from './routes';

export interface Policy {
  name: string;
  policy: string;
  type?: string;
  realm_id?: string;
}

export interface PolicyListResponse {
  keys: string[];
}

export interface CapabilitiesRequest {
  path: string;
  policies?: string[];
}

export interface CapabilitiesResponse {
  capabilities: string[];
  path: string;
}

export const policiesApi = {
  // ============ Global Policies ============

  /**
   * List all ACL policies (global)
   */
  list: async (): Promise<PolicyListResponse> => {
    return apiClient.get<PolicyListResponse>(VAULT_ROUTES.POLICIES.LIST);
  },

  /**
   * Read a specific policy (global)
   */
  read: async (name: string): Promise<Policy> => {
    return apiClient.get<Policy>(VAULT_ROUTES.POLICIES.GET(name));
  },

  /**
   * Create or update a policy (global)
   */
  write: async (name: string, policy: string): Promise<void> => {
    await apiClient.post(VAULT_ROUTES.POLICIES.CREATE(name), { policy });
  },

  /**
   * Delete a policy (global)
   */
  delete: async (name: string): Promise<void> => {
    await apiClient.delete(VAULT_ROUTES.POLICIES.DELETE(name));
  },

  /**
   * Check capabilities for a path (global)
   */
  checkCapabilities: async (path: string, policies?: string[]): Promise<CapabilitiesResponse> => {
    return apiClient.post<CapabilitiesResponse>(VAULT_ROUTES.POLICIES.CAPABILITIES, { path, policies });
  },

  // ============ Realm-Scoped Policies ============

  /**
   * List all ACL policies in a realm
   */
  listForRealm: async (realmId: string): Promise<PolicyListResponse> => {
    return apiClient.get<PolicyListResponse>(VAULT_ROUTES.REALM_POLICIES.LIST(realmId));
  },

  /**
   * Read a specific policy in a realm
   */
  readForRealm: async (realmId: string, name: string): Promise<Policy> => {
    return apiClient.get<Policy>(VAULT_ROUTES.REALM_POLICIES.GET(realmId, name));
  },

  /**
   * Create or update a policy in a realm
   */
  writeForRealm: async (realmId: string, name: string, policy: string): Promise<void> => {
    await apiClient.post(VAULT_ROUTES.REALM_POLICIES.CREATE(realmId, name), { policy });
  },

  /**
   * Delete a policy in a realm
   */
  deleteForRealm: async (realmId: string, name: string): Promise<void> => {
    await apiClient.delete(VAULT_ROUTES.REALM_POLICIES.DELETE(realmId, name));
  },

  /**
   * Check capabilities for a path in a realm
   */
  checkCapabilitiesForRealm: async (
    realmId: string,
    path: string,
    policies?: string[]
  ): Promise<CapabilitiesResponse> => {
    return apiClient.post<CapabilitiesResponse>(
      VAULT_ROUTES.REALM_POLICIES.CAPABILITIES(realmId),
      { path, policies }
    );
  },
};

