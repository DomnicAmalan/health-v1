import { apiClient } from "./client";
import { VAULT_ROUTES } from "./routes";

export interface AppRole {
  id: string;
  realm_id: string;
  role_name: string;
  role_id: string;
  bind_secret_id: boolean;
  secret_id_ttl?: number;
  secret_id_num_uses?: number;
  token_ttl?: number;
  token_max_ttl?: number;
  policies: string[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateAppRoleRequest {
  bind_secret_id?: boolean;
  secret_id_ttl?: number;
  secret_id_num_uses?: number;
  token_ttl?: number;
  token_max_ttl?: number;
  policies?: string[];
}

export interface UpdateAppRoleRequest {
  bind_secret_id?: boolean;
  secret_id_ttl?: number;
  secret_id_num_uses?: number;
  token_ttl?: number;
  token_max_ttl?: number;
  policies?: string[];
}

export interface AppRoleListResponse {
  keys?: string[];
  roles?: AppRole[];
}

export interface AppRoleResponse {
  role?: AppRole;
  data?: AppRole;
}

export interface RoleIdResponse {
  role_id?: string;
  data?: {
    role_id?: string;
  };
}

export interface SecretIdResponse {
  secret_id: string;
  secret_id_accessor?: string;
  secret_id_ttl?: number;
  secret_id_num_uses?: number;
}

export interface AppRoleLoginRequest {
  role_id: string;
  secret_id: string;
}

export interface AppRoleLoginResponse {
  auth?: {
    client_token: string;
    accessor: string;
    policies: string[];
    lease_duration: number;
    renewable: boolean;
    metadata?: Record<string, string>;
  };
}

export const approleApi = {
  /**
   * List all AppRoles in a realm
   */
  listRoles: async (realmId: string): Promise<string[]> => {
    const response = await apiClient.get<AppRoleListResponse>(
      VAULT_ROUTES.REALM_APPROLE.LIST_ROLES(realmId),
    );
    return response.keys || [];
  },

  /**
   * Get an AppRole by name
   */
  getRole: async (realmId: string, roleName: string): Promise<AppRole> => {
    const response = await apiClient.get<AppRoleResponse>(
      VAULT_ROUTES.REALM_APPROLE.GET_ROLE(realmId, roleName),
    );
    return response.role || response.data || (response as unknown as AppRole);
  },

  /**
   * Create or update an AppRole
   */
  createRole: async (
    realmId: string,
    roleName: string,
    request: CreateAppRoleRequest,
  ): Promise<void> => {
    await apiClient.post(VAULT_ROUTES.REALM_APPROLE.CREATE_ROLE(realmId, roleName), request);
  },

  /**
   * Delete an AppRole
   */
  deleteRole: async (realmId: string, roleName: string): Promise<void> => {
    await apiClient.delete(VAULT_ROUTES.REALM_APPROLE.DELETE_ROLE(realmId, roleName));
  },

  /**
   * Get the role_id for an AppRole
   */
  getRoleId: async (realmId: string, roleName: string): Promise<string> => {
    const response = await apiClient.get<RoleIdResponse>(
      VAULT_ROUTES.REALM_APPROLE.GET_ROLE_ID(realmId, roleName),
    );
    return response.role_id || response.data?.role_id || "";
  },

  /**
   * Generate a new secret_id for an AppRole
   * IMPORTANT: The secret_id is only returned once and cannot be retrieved again
   */
  generateSecretId: async (
    realmId: string,
    roleName: string,
    metadata?: Record<string, string>,
  ): Promise<SecretIdResponse> => {
    const response = await apiClient.post<SecretIdResponse>(
      VAULT_ROUTES.REALM_APPROLE.GENERATE_SECRET_ID(realmId, roleName),
      metadata ? { metadata } : {},
    );
    return response;
  },

  /**
   * Login with role_id and secret_id
   */
  login: async (
    realmId: string,
    roleId: string,
    secretId: string,
  ): Promise<AppRoleLoginResponse> => {
    return apiClient.post<AppRoleLoginResponse>(VAULT_ROUTES.REALM_APPROLE.LOGIN(realmId), {
      role_id: roleId,
      secret_id: secretId,
    });
  },
};

/**
 * Format TTL value for display
 */
export function formatTTL(seconds?: number): string {
  if (!seconds) return "Not set";

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/**
 * Parse TTL string to seconds
 */
export function parseTTL(value: string): number | undefined {
  if (!value) return undefined;

  const num = parseInt(value);
  if (isNaN(num)) return undefined;

  if (value.endsWith("d")) return num * 86400;
  if (value.endsWith("h")) return num * 3600;
  if (value.endsWith("m")) return num * 60;
  return num;
}
