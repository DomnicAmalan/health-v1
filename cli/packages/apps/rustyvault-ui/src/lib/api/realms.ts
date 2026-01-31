import { apiClient } from "./client";
import { API_ROUTES } from "@lazarus-life/shared/api";

// Alias for convenience
const VAULT_ROUTES = API_ROUTES.VAULT_DIRECT;

export interface Realm {
  id: string;
  name: string;
  description?: string;
  display_name?: string;
  organization_id?: string;
  organization_name?: string;
  default_lease_ttl?: number;
  max_lease_ttl?: number;
  is_active?: boolean;
  config?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateRealmRequest {
  name: string;
  description?: string;
  display_name?: string;
  organization_id?: string;
  default_lease_ttl?: number;
  max_lease_ttl?: number;
}

export interface UpdateRealmRequest {
  name?: string;
  description?: string;
  display_name?: string;
  is_active?: boolean;
  default_lease_ttl?: number;
  max_lease_ttl?: number;
}

export interface RealmListResponse {
  keys?: string[];
  realms?: Realm[];
}

export interface RealmResponse {
  realm?: Realm;
  id?: string;
  name?: string;
  description?: string;
  organization_id?: string;
}

export const realmsApi = {
  /**
   * List all realms
   */
  list: async (): Promise<RealmListResponse> => {
    const response = await apiClient.get<RealmListResponse>(VAULT_ROUTES.REALMS.LIST);
    return response;
  },

  /**
   * Get a realm by ID
   */
  get: async (realmId: string): Promise<Realm> => {
    const response = await apiClient.get<RealmResponse>(VAULT_ROUTES.REALMS.GET(realmId));
    // Handle both formats: { realm: {...} } or direct realm object
    return response.realm || (response as unknown as Realm);
  },

  /**
   * Create a new realm
   */
  create: async (request: CreateRealmRequest): Promise<Realm> => {
    const response = await apiClient.post<RealmResponse>(VAULT_ROUTES.REALMS.CREATE, request);
    return response.realm || (response as unknown as Realm);
  },

  /**
   * Update an existing realm
   */
  update: async (realmId: string, request: UpdateRealmRequest): Promise<Realm> => {
    const response = await apiClient.post<RealmResponse>(
      VAULT_ROUTES.REALMS.UPDATE(realmId),
      request,
    );
    return response.realm || (response as unknown as Realm);
  },

  /**
   * Delete a realm
   */
  delete: async (realmId: string): Promise<void> => {
    await apiClient.delete(VAULT_ROUTES.REALMS.DELETE(realmId));
  },

  /**
   * Get realms by organization ID
   */
  getByOrg: async (orgId: string): Promise<Realm[]> => {
    const response = await apiClient.get<RealmListResponse>(VAULT_ROUTES.REALMS.BY_ORG(orgId));
    return response.realms || [];
  },
};
