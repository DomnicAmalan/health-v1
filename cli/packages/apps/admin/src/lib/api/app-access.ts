import { apiClient } from "./client";

export interface AppAccessEntry {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  app_name: string;
  access_level: "read" | "write" | "admin";
  organization_id?: string;
  organization_name?: string;
  granted_at: string;
  granted_by?: string;
}

export interface AppAccessMatrix {
  users: Array<{
    id: string;
    email: string;
    display_name: string;
    organization_id?: string;
    organization_name?: string;
  }>;
  apps: string[];
  access: Record<string, Record<string, "read" | "write" | "admin">>;
}

export interface AppAccessListResponse {
  entries: AppAccessEntry[];
  total: number;
}

export interface AppAccessMatrixResponse {
  matrix: AppAccessMatrix;
}

export interface BulkGrantRequest {
  user_ids: string[];
  app_name: string;
  access_level: "read" | "write" | "admin";
}

export interface BulkRevokeRequest {
  user_ids: string[];
  app_name: string;
}

export const appAccessApi = {
  /**
   * List all app access entries
   */
  list: async (filters?: {
    app_name?: string;
    organization_id?: string;
    access_level?: string;
  }): Promise<AppAccessListResponse> => {
    const params = new URLSearchParams();
    if (filters?.app_name) params.append("app_name", filters.app_name);
    if (filters?.organization_id) params.append("organization_id", filters.organization_id);
    if (filters?.access_level) params.append("access_level", filters.access_level);

    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await apiClient.get<AppAccessListResponse>(`/app-access${query}`);
    return response.data || { entries: [], total: 0 };
  },

  /**
   * Get app access matrix view
   */
  getMatrix: async (organizationId?: string): Promise<AppAccessMatrix> => {
    const query = organizationId ? `?organization_id=${organizationId}` : "";
    const response = await apiClient.get<AppAccessMatrixResponse>(`/app-access/matrix${query}`);
    return response.data?.matrix || { users: [], apps: [], access: {} };
  },

  /**
   * Grant app access to a user
   */
  grant: async (
    userId: string,
    appName: string,
    accessLevel: "read" | "write" | "admin"
  ): Promise<void> => {
    await apiClient.post(`/app-access/grant`, {
      user_id: userId,
      app_name: appName,
      access_level: accessLevel,
    });
  },

  /**
   * Revoke app access from a user
   */
  revoke: async (userId: string, appName: string): Promise<void> => {
    await apiClient.post(`/app-access/revoke`, {
      user_id: userId,
      app_name: appName,
    });
  },

  /**
   * Bulk grant app access
   */
  bulkGrant: async (request: BulkGrantRequest): Promise<{ granted: number }> => {
    const response = await apiClient.post<{ granted: number }>(`/app-access/bulk-grant`, request);
    return response.data || { granted: 0 };
  },

  /**
   * Bulk revoke app access
   */
  bulkRevoke: async (request: BulkRevokeRequest): Promise<{ revoked: number }> => {
    const response = await apiClient.post<{ revoked: number }>(`/app-access/bulk-revoke`, request);
    return response.data || { revoked: 0 };
  },

  /**
   * Get access for a specific user
   */
  getForUser: async (userId: string): Promise<AppAccessEntry[]> => {
    const response = await apiClient.get<{ entries: AppAccessEntry[] }>(
      `/users/${userId}/app-access`
    );
    return response.data?.entries || [];
  },

  /**
   * Get users with access to a specific app
   */
  getForApp: async (appName: string): Promise<AppAccessEntry[]> => {
    const response = await apiClient.get<{ entries: AppAccessEntry[] }>(`/apps/${appName}/access`);
    return response.data?.entries || [];
  },
};
