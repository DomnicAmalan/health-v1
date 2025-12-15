import { apiClient } from './client';
import { VAULT_ROUTES } from './routes';

export interface SecretData {
  [key: string]: unknown;
}

export interface SecretVersion {
  created_time: string;
  deletion_time?: string;
  destroyed: boolean;
  version: number;
}

export interface SecretMetadata {
  created_time: string;
  current_version: number;
  max_versions: number;
  oldest_version: number;
  updated_time: string;
  versions: { [version: string]: SecretVersion };
}

export interface SecretResponse {
  data: SecretData;
  metadata: SecretMetadata;
}

export interface SecretListResponse {
  keys: string[];
}

function createDefaultMetadata(): SecretMetadata {
  return {
    created_time: new Date().toISOString(),
    current_version: 1,
    max_versions: 0,
    oldest_version: 1,
    updated_time: new Date().toISOString(),
    versions: {},
  };
}

export const secretsApi = {
  // ============ Global Secrets ============

  read: async (path: string): Promise<SecretResponse> => {
    const response = await apiClient.get<{ data: SecretData }>(VAULT_ROUTES.SECRETS.READ(path));
    return {
      data: response.data || {},
      metadata: createDefaultMetadata(),
    };
  },

  write: async (path: string, data: SecretData): Promise<void> => {
    await apiClient.post(VAULT_ROUTES.SECRETS.WRITE(path), data);
  },

  list: async (path: string = ''): Promise<string[]> => {
    try {
      const response = await apiClient.get<SecretListResponse>(VAULT_ROUTES.SECRETS.LIST(path));
      return response.keys || [];
    } catch {
      // If list fails, return empty array
      return [];
    }
  },

  delete: async (path: string): Promise<void> => {
    await apiClient.delete(VAULT_ROUTES.SECRETS.DELETE(path));
  },

  // ============ Realm-Scoped Secrets ============

  /**
   * Read a secret from a realm
   */
  readForRealm: async (realmId: string, path: string): Promise<SecretResponse> => {
    const response = await apiClient.get<{ data: SecretData }>(
      VAULT_ROUTES.REALM_SECRETS.READ(realmId, path)
    );
    return {
      data: response.data || {},
      metadata: createDefaultMetadata(),
    };
  },

  /**
   * Write a secret to a realm
   */
  writeForRealm: async (realmId: string, path: string, data: SecretData): Promise<void> => {
    await apiClient.post(VAULT_ROUTES.REALM_SECRETS.WRITE(realmId, path), { data });
  },

  /**
   * List secrets in a realm
   */
  listForRealm: async (realmId: string, path: string = ''): Promise<string[]> => {
    try {
      const response = await apiClient.get<SecretListResponse>(
        VAULT_ROUTES.REALM_SECRETS.LIST(realmId, path)
      );
      return response.keys || [];
    } catch {
      // If list fails, return empty array
      return [];
    }
  },

  /**
   * Delete a secret from a realm
   */
  deleteForRealm: async (realmId: string, path: string): Promise<void> => {
    await apiClient.delete(VAULT_ROUTES.REALM_SECRETS.DELETE(realmId, path));
  },
};

