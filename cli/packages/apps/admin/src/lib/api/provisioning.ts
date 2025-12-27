import { apiClient } from "./client";

export interface ProvisionUserRequest {
  email: string;
  password: string;
  display_name: string;
  organization_id: string;
  role_name?: string;
  group_names?: string[];
  app_access?: AppAccessRequest[];
  vault_access?: VaultAccessRequest;
}

export interface AppAccessRequest {
  app_name: string;
  access_level: "read" | "write" | "admin";
}

export interface VaultAccessRequest {
  realm_id?: string;
  create_user?: boolean;
  policies?: string[];
  create_token?: boolean;
}

export interface ProvisionUserResponse {
  user: {
    id: string;
    email: string;
    display_name: string;
  };
  vault_user_created?: boolean;
  vault_token?: string;
  app_access_granted?: string[];
}

export interface GrantAppAccessRequest {
  apps: AppAccessRequest[];
}

export interface GrantAppAccessResponse {
  granted: string[];
}

export interface GrantVaultAccessRequest {
  realm_id: string;
  create_user?: boolean;
  username?: string;
  password?: string;
  policies?: string[];
  create_token?: boolean;
}

export interface GrantVaultAccessResponse {
  user_created?: boolean;
  token?: string;
  policies?: string[];
}

export interface UserAppAccess {
  user_id: string;
  app_name: string;
  access_level: string;
  granted_at: string;
}

export const provisioningApi = {
  /**
   * Provision a new user with full setup
   * Creates user, assigns role, grants app access, creates vault access
   */
  provisionUser: async (request: ProvisionUserRequest): Promise<ProvisionUserResponse> => {
    const response = await apiClient.post<ProvisionUserResponse>("/users/provision", request);
    if (!response.data) throw new Error(response.error?.message || "Failed to provision user");
    return response.data;
  },

  /**
   * Grant app access to an existing user
   */
  grantAppAccess: async (
    userId: string,
    request: GrantAppAccessRequest
  ): Promise<GrantAppAccessResponse> => {
    const response = await apiClient.post<GrantAppAccessResponse>(`/users/${userId}/apps`, request);
    return response.data || { granted: [] };
  },

  /**
   * Revoke app access from a user
   */
  revokeAppAccess: async (userId: string, appName: string): Promise<void> => {
    await apiClient.delete(`/users/${userId}/apps/${appName}`);
  },

  /**
   * Grant vault access to a user
   */
  grantVaultAccess: async (
    userId: string,
    request: GrantVaultAccessRequest
  ): Promise<GrantVaultAccessResponse> => {
    const response = await apiClient.post<GrantVaultAccessResponse>(`/users/${userId}/vault-access`, request);
    return response.data || {};
  },

  /**
   * Revoke vault access from a user
   */
  revokeVaultAccess: async (userId: string, realmId: string): Promise<void> => {
    await apiClient.delete(`/users/${userId}/vault-access/${realmId}`);
  },

  /**
   * Get user's app access
   */
  getUserAppAccess: async (userId: string): Promise<UserAppAccess[]> => {
    const response = await apiClient.get<{ access: UserAppAccess[] }>(`/users/${userId}/apps`);
    return response.data?.access || [];
  },

  /**
   * Get user's vault access across realms
   */
  getUserVaultAccess: async (
    userId: string
  ): Promise<Array<{ realm_id: string; has_user: boolean; has_token: boolean }>> => {
    const response = await apiClient.get<{
      access: Array<{ realm_id: string; has_user: boolean; has_token: boolean }>;
    }>(`/users/${userId}/vault-access`);
    return response.data?.access || [];
  },
};
