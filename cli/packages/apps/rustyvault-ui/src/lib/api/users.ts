import { apiClient } from "./client";
import { VAULT_ROUTES } from "./routes";

export interface User {
  username: string;
  policies: string[];
  ttl: number;
  max_ttl: number;
  realm_id?: string;
  display_name?: string;
  email?: string;
}

export interface UserListResponse {
  keys: string[];
}

export interface CreateUserRequest {
  password: string;
  policies?: string[];
  ttl?: number;
  max_ttl?: number;
  display_name?: string;
  email?: string;
}

export interface LoginResponse {
  auth: {
    client_token: string;
    accessor: string;
    policies: string[];
    token_ttl: number;
    renewable: boolean;
  };
}

export const usersApi = {
  // ============ Global Users ============

  /**
   * List all userpass users (global)
   */
  list: async (): Promise<UserListResponse> => {
    return apiClient.get<UserListResponse>(VAULT_ROUTES.AUTH.USERPASS_USERS);
  },

  /**
   * Read a specific user (global)
   */
  read: async (username: string): Promise<{ data: User }> => {
    return apiClient.get<{ data: User }>(VAULT_ROUTES.AUTH.USERPASS_USER(username));
  },

  /**
   * Create or update a user (global)
   */
  write: async (username: string, request: CreateUserRequest): Promise<void> => {
    await apiClient.post(VAULT_ROUTES.AUTH.USERPASS_USER(username), request);
  },

  /**
   * Delete a user (global)
   */
  delete: async (username: string): Promise<void> => {
    await apiClient.delete(VAULT_ROUTES.AUTH.USERPASS_USER(username));
  },

  /**
   * Login with username and password (global)
   */
  login: async (username: string, password: string): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>(VAULT_ROUTES.AUTH.USERPASS_LOGIN(username), { password });
  },

  // ============ Realm-Scoped Users ============

  /**
   * List all userpass users in a realm
   */
  listForRealm: async (realmId: string): Promise<UserListResponse> => {
    return apiClient.get<UserListResponse>(VAULT_ROUTES.REALM_USERS.LIST(realmId));
  },

  /**
   * Read a specific user in a realm
   */
  readForRealm: async (realmId: string, username: string): Promise<{ data: User }> => {
    return apiClient.get<{ data: User }>(VAULT_ROUTES.REALM_USERS.GET(realmId, username));
  },

  /**
   * Create or update a user in a realm
   */
  writeForRealm: async (
    realmId: string,
    username: string,
    request: CreateUserRequest,
  ): Promise<void> => {
    await apiClient.post(VAULT_ROUTES.REALM_USERS.CREATE(realmId, username), request);
  },

  /**
   * Delete a user from a realm
   */
  deleteForRealm: async (realmId: string, username: string): Promise<void> => {
    await apiClient.delete(VAULT_ROUTES.REALM_USERS.DELETE(realmId, username));
  },

  /**
   * Login with username and password in a realm
   */
  loginForRealm: async (
    realmId: string,
    username: string,
    password: string,
  ): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>(VAULT_ROUTES.REALM_USERS.LOGIN(realmId, username), {
      password,
    });
  },
};
