import { apiClient } from './client';

export interface SecretData {
  [key: string]: any;
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

export const secretsApi = {
  read: async (path: string): Promise<SecretResponse> => {
    // Backend uses /v1/secret/{path} for KV v1
    const url = `/secret/${path}`;
    const response = await apiClient.get<{ data: SecretData }>(url);
    return {
      data: response.data || {},
      metadata: {
        created_time: new Date().toISOString(),
        current_version: 1,
        max_versions: 0,
        oldest_version: 1,
        updated_time: new Date().toISOString(),
        versions: {},
      },
    };
  },

  write: async (path: string, data: SecretData): Promise<void> => {
    // Backend uses /v1/secret/{path} for KV v1
    const url = `/secret/${path}`;
    await apiClient.post(url, data);
  },

  list: async (path: string = ''): Promise<string[]> => {
    // Backend uses /v1/secret/{path}/ for listing (trailing slash)
    const url = path ? `/secret/${path}/` : '/secret/';
    try {
      const response = await apiClient.get<SecretListResponse>(url);
      return response.keys || [];
    } catch (error) {
      // If list fails, return empty array
      return [];
    }
  },

  delete: async (path: string): Promise<void> => {
    // Backend uses /v1/secret/{path} for deletion
    const url = `/secret/${path}`;
    await apiClient.delete(url);
  },
};

