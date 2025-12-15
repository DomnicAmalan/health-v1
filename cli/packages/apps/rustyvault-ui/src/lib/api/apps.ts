import { apiClient } from './client';
import { VAULT_ROUTES } from './routes';

export type AppType = 'admin-ui' | 'client-app' | 'mobile' | 'api';
export type AuthMethod = 'token' | 'userpass' | 'approle' | 'jwt';

export interface RealmApplication {
  id: string;
  realm_id: string;
  app_name: string;
  app_type: AppType;
  display_name?: string;
  description?: string;
  allowed_auth_methods: AuthMethod[];
  config?: Record<string, unknown>;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAppRequest {
  app_name: string;
  app_type: AppType;
  display_name?: string;
  description?: string;
  allowed_auth_methods?: AuthMethod[];
  config?: Record<string, unknown>;
}

export interface UpdateAppRequest {
  display_name?: string;
  description?: string;
  allowed_auth_methods?: AuthMethod[];
  config?: Record<string, unknown>;
  is_active?: boolean;
}

export interface AppListResponse {
  keys?: string[];
  apps?: RealmApplication[];
}

export interface AppResponse {
  app?: RealmApplication;
}

export interface RegisterDefaultsResponse {
  registered?: string[];
  count?: number;
}

export const appsApi = {
  /**
   * List all applications in a realm
   */
  list: async (realmId: string): Promise<RealmApplication[]> => {
    const response = await apiClient.get<AppListResponse>(
      VAULT_ROUTES.REALM_APPS.LIST(realmId)
    );
    return response.apps || [];
  },

  /**
   * Get an application by name
   */
  get: async (realmId: string, appName: string): Promise<RealmApplication> => {
    const response = await apiClient.get<AppResponse>(
      VAULT_ROUTES.REALM_APPS.GET(realmId, appName)
    );
    return response.app || (response as unknown as RealmApplication);
  },

  /**
   * Create a new application
   */
  create: async (realmId: string, request: CreateAppRequest): Promise<RealmApplication> => {
    const response = await apiClient.post<AppResponse>(
      VAULT_ROUTES.REALM_APPS.CREATE(realmId),
      request
    );
    return response.app || (response as unknown as RealmApplication);
  },

  /**
   * Update an application
   */
  update: async (
    realmId: string,
    appName: string,
    request: UpdateAppRequest
  ): Promise<RealmApplication> => {
    const response = await apiClient.post<AppResponse>(
      VAULT_ROUTES.REALM_APPS.UPDATE(realmId, appName),
      request
    );
    return response.app || (response as unknown as RealmApplication);
  },

  /**
   * Delete an application
   */
  delete: async (realmId: string, appName: string): Promise<void> => {
    await apiClient.delete(VAULT_ROUTES.REALM_APPS.DELETE(realmId, appName));
  },

  /**
   * Register default applications for a realm
   * Creates: admin-ui, client-app, mobile with appropriate auth methods
   */
  registerDefaults: async (realmId: string): Promise<RegisterDefaultsResponse> => {
    const response = await apiClient.post<RegisterDefaultsResponse>(
      VAULT_ROUTES.REALM_APPS.REGISTER_DEFAULTS(realmId)
    );
    return response;
  },
};

/**
 * Helper to get icon for app type
 */
export function getAppTypeIcon(appType: AppType): string {
  switch (appType) {
    case 'admin-ui':
      return '💻';
    case 'client-app':
      return '🌐';
    case 'mobile':
      return '📱';
    case 'api':
      return '🔌';
    default:
      return '📦';
  }
}

/**
 * Helper to get display label for app type
 */
export function getAppTypeLabel(appType: AppType): string {
  switch (appType) {
    case 'admin-ui':
      return 'Admin UI';
    case 'client-app':
      return 'Client App';
    case 'mobile':
      return 'Mobile App';
    case 'api':
      return 'API / Product';
    default:
      return appType;
  }
}

/**
 * Default auth methods for each app type
 */
export const defaultAuthMethods: Record<AppType, AuthMethod[]> = {
  'admin-ui': ['token', 'userpass'],
  'client-app': ['token', 'userpass'],
  'mobile': ['jwt', 'approle'],
  'api': ['approle'],
};

