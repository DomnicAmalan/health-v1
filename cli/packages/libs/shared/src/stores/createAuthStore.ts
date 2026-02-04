/**
 * Auth Store Factory - Shared Implementation
 * Creates auth stores with different authentication strategies
 *
 * Supports three auth patterns:
 * 1. Token-based (JWT with refresh tokens) - client-app
 * 2. Session-based (HTTP cookies) - admin
 * 3. Vault-token (Vault-specific policies) - rustyvault-ui
 */

import { create, type StoreApi, type UseBoundStore } from "zustand";
import { immer } from "zustand/middleware/immer";

// ============================================
// Common Types
// ============================================

export interface BaseAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface BaseAuthActions {
  clearError: () => void;
  logout: () => Promise<void> | void;
}

// ============================================
// Strategy 1: Token-Based Authentication
// ============================================

export interface TokenAuthState extends BaseAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: unknown | null;
  permissions: string[];
  role: string | null;
}

export interface TokenAuthActions extends BaseAuthActions {
  login: (email: string, password: string) => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  setUser: (user: unknown) => void;
  setTokens: (accessToken: string | null, refreshToken: string | null) => void;
  checkAuth: () => Promise<void>;
}

export type TokenAuthStore = TokenAuthState & TokenAuthActions;

export interface TokenAuthConfig<TUser = unknown> {
  strategy: "token";
  storageKeys?: {
    accessToken?: string;
    refreshToken?: string;
    user?: string;
  };
  api: {
    login: (email: string, password: string) => Promise<{
      accessToken: string;
      refreshToken: string;
      user: TUser;
    }>;
    logout: () => Promise<void>;
    getUserInfo: () => Promise<TUser>;
    refreshToken: (refreshToken: string) => Promise<{
      accessToken: string;
      refreshToken: string;
    }>;
  };
  apiClient?: {
    setAuthTokens: (accessToken: string | null, refreshToken: string | null) => void;
  };
}

// ============================================
// Strategy 2: Session-Based Authentication
// ============================================

export interface SessionAuthState extends BaseAuthState {
  user: unknown | null;
}

export interface SessionAuthActions extends BaseAuthActions {
  login: (email: string, password: string) => Promise<void>;
  setUser: (user: unknown) => void;
  checkAuth: () => Promise<void>;
}

export type SessionAuthStore = SessionAuthState & SessionAuthActions;

export interface SessionAuthConfig<TUser = unknown> {
  strategy: "session";
  storageKey?: string;
  api: {
    login: (email: string, password: string) => Promise<{ user: TUser }>;
    logout: () => Promise<void>;
    getUserInfo: () => Promise<TUser>;
  };
}

// ============================================
// Strategy 3: Vault Token Authentication
// ============================================

export interface VaultAuthState extends BaseAuthState {
  accessToken: string | null;
  policies: string[];
  capabilitiesCache: Record<string, string[]>;
}

export interface VaultAuthActions extends BaseAuthActions {
  login: (token: string) => Promise<void>;
  loginWithUserpass: (username: string, password: string) => Promise<void>;
  loginWithAppRole: (roleId: string, secretId: string) => Promise<void>;
  checkAuth: () => Promise<void>;
  hasPolicy: (policyName: string) => boolean;
  isRoot: () => boolean;
  getCapabilities: (path: string) => Promise<string[]>;
  hasCapability: (path: string, capability: string) => Promise<boolean>;
  canRead: (path: string) => Promise<boolean>;
  canWrite: (path: string) => Promise<boolean>;
  canDelete: (path: string) => Promise<boolean>;
  canList: (path: string) => Promise<boolean>;
}

export type VaultAuthStore = VaultAuthState & VaultAuthActions;

export interface VaultAuthConfig {
  strategy: "vault";
  storageKeys?: {
    token?: string;
    policies?: string;
  };
  api: {
    lookupToken: (token: string) => Promise<{ data?: { policies?: string[] } }>;
    loginUserpass: (username: string, password: string) => Promise<{
      auth?: { client_token?: string; policies?: string[] };
    }>;
    loginAppRole: (roleId: string, secretId: string) => Promise<{
      auth?: { client_token?: string; policies?: string[] };
    }>;
    checkCapabilities: (path: string, policies: string[]) => Promise<{ capabilities?: string[] }>;
  };
}

// ============================================
// Storage Utilities
// ============================================

export const storage = {
  get: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(key);
  },

  set: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(key, value);
  },

  remove: (key: string): void => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(key);
  },

  getJSON: <T>(key: string): T | null => {
    const value = storage.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  setJSON: <T>(key: string, value: T): void => {
    storage.set(key, JSON.stringify(value));
  },
};

// ============================================
// Auth Store Factory
// ============================================

export type AuthConfig<TUser = unknown> =
  | TokenAuthConfig<TUser>
  | SessionAuthConfig<TUser>
  | VaultAuthConfig;

export function createAuthStore<TConfig extends AuthConfig>(
  config: TConfig
): TConfig extends TokenAuthConfig
  ? UseBoundStore<StoreApi<TokenAuthStore>>
  : TConfig extends SessionAuthConfig
  ? UseBoundStore<StoreApi<SessionAuthStore>>
  : TConfig extends VaultAuthConfig
  ? UseBoundStore<StoreApi<VaultAuthStore>>
  : never {
  if (config.strategy === "token") {
    return createTokenAuthStore(config as TokenAuthConfig) as never;
  }

  if (config.strategy === "session") {
    return createSessionAuthStore(config as SessionAuthConfig) as never;
  }

  if (config.strategy === "vault") {
    return createVaultAuthStore(config as VaultAuthConfig) as never;
  }

  throw new Error(`Unknown auth strategy: ${(config as { strategy: string }).strategy}`);
}

// ============================================
// Token Auth Store Implementation
// ============================================

function createTokenAuthStore<TUser>(
  config: TokenAuthConfig<TUser>
): UseBoundStore<StoreApi<TokenAuthStore>> {
  const keys = {
    accessToken: config.storageKeys?.accessToken || "auth_access_token",
    refreshToken: config.storageKeys?.refreshToken || "auth_refresh_token",
    user: config.storageKeys?.user || "auth_user",
  };

  const storedAccessToken = storage.get(keys.accessToken);
  const storedRefreshToken = storage.get(keys.refreshToken);
  const storedUser = storage.getJSON<TUser>(keys.user);

  const initialState: TokenAuthState = {
    accessToken: storedAccessToken,
    refreshToken: storedRefreshToken,
    user: storedUser,
    isAuthenticated: !!storedAccessToken,
    isLoading: false,
    error: null,
    permissions: (storedUser as { permissions?: string[] })?.permissions || [],
    role: (storedUser as { role?: string })?.role || null,
  };

  return create<TokenAuthStore>()(
    immer((set, get) => ({
      ...initialState,

      login: async (email: string, password: string) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const response = await config.api.login(email, password);

          set((state) => {
            state.accessToken = response.accessToken;
            state.refreshToken = response.refreshToken;
            state.user = response.user;
            state.isAuthenticated = true;
            state.permissions =
              (response.user as { permissions?: string[] })?.permissions || [];
            state.role = (response.user as { role?: string })?.role || null;
            state.isLoading = false;
          });

          storage.set(keys.accessToken, response.accessToken);
          storage.set(keys.refreshToken, response.refreshToken);
          storage.setJSON(keys.user, response.user);

          config.apiClient?.setAuthTokens(response.accessToken, response.refreshToken);
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : "Login failed";
            state.isLoading = false;
            state.isAuthenticated = false;
          });
          throw error;
        }
      },

      logout: async () => {
        set((state) => {
          state.isLoading = true;
        });

        try {
          await config.api.logout();
        } catch {
          // Ignore logout errors
        } finally {
          set((state) => {
            state.user = null;
            state.accessToken = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
            state.permissions = [];
            state.role = null;
            state.isLoading = false;
            state.error = null;
          });

          storage.remove(keys.accessToken);
          storage.remove(keys.refreshToken);
          storage.remove(keys.user);

          config.apiClient?.setAuthTokens(null, null);
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        try {
          const response = await config.api.refreshToken(refreshToken);

          set((state) => {
            state.accessToken = response.accessToken;
            state.refreshToken = response.refreshToken;
          });

          storage.set(keys.accessToken, response.accessToken);
          storage.set(keys.refreshToken, response.refreshToken);

          config.apiClient?.setAuthTokens(response.accessToken, response.refreshToken);
        } catch (error) {
          // Refresh failed, clear auth
          set((state) => {
            state.user = null;
            state.accessToken = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
            state.permissions = [];
            state.role = null;
          });

          storage.remove(keys.accessToken);
          storage.remove(keys.refreshToken);
          storage.remove(keys.user);

          config.apiClient?.setAuthTokens(null, null);
          throw error;
        }
      },

      setUser: (user: unknown) => {
        set((state) => {
          state.user = user;
          state.permissions = (user as { permissions?: string[] })?.permissions || [];
          state.role = (user as { role?: string })?.role || null;
          state.isAuthenticated = true;
        });
        storage.setJSON(keys.user, user);
      },

      setTokens: (accessToken: string | null, refreshToken: string | null) => {
        set((state) => {
          state.accessToken = accessToken;
          state.refreshToken = refreshToken;
          state.isAuthenticated = !!accessToken;
        });

        if (accessToken) storage.set(keys.accessToken, accessToken);
        else storage.remove(keys.accessToken);

        if (refreshToken) storage.set(keys.refreshToken, refreshToken);
        else storage.remove(keys.refreshToken);

        config.apiClient?.setAuthTokens(accessToken, refreshToken);
      },

      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      checkAuth: async () => {
        const { accessToken } = get();

        if (!accessToken) {
          return;
        }

        set((state) => {
          state.isLoading = true;
        });

        try {
          const userInfo = await config.api.getUserInfo();

          set((state) => {
            state.user = userInfo;
            state.permissions = (userInfo as { permissions?: string[] })?.permissions || [];
            state.role = (userInfo as { role?: string })?.role || null;
            state.isLoading = false;
          });

          storage.setJSON(keys.user, userInfo);
        } catch {
          // Try to refresh token
          try {
            await get().refreshAccessToken();
            const userInfo = await config.api.getUserInfo();

            set((state) => {
              state.user = userInfo;
              state.permissions = (userInfo as { permissions?: string[] })?.permissions || [];
              state.role = (userInfo as { role?: string })?.role || null;
              state.isLoading = false;
            });

            storage.setJSON(keys.user, userInfo);
          } catch {
            // Both failed, clear auth
            set((state) => {
              state.user = null;
              state.accessToken = null;
              state.refreshToken = null;
              state.isAuthenticated = false;
              state.permissions = [];
              state.role = null;
              state.isLoading = false;
            });

            storage.remove(keys.accessToken);
            storage.remove(keys.refreshToken);
            storage.remove(keys.user);

            config.apiClient?.setAuthTokens(null, null);
          }
        }
      },
    }))
  );
}

// ============================================
// Session Auth Store Implementation
// ============================================

function createSessionAuthStore<TUser>(
  config: SessionAuthConfig<TUser>
): UseBoundStore<StoreApi<SessionAuthStore>> {
  const userKey = config.storageKey || "auth_user";
  const storedUser = storage.getJSON<TUser>(userKey);

  const initialState: SessionAuthState = {
    user: storedUser,
    isAuthenticated: !!storedUser,
    isLoading: false,
    error: null,
  };

  return create<SessionAuthStore>()(
    immer((set) => ({
      ...initialState,

      login: async (email: string, password: string) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const response = await config.api.login(email, password);

          set((state) => {
            state.user = response.user;
            state.isAuthenticated = true;
            state.isLoading = false;
            state.error = null;
          });

          storage.setJSON(userKey, response.user);
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : "Login failed";
            state.isLoading = false;
            state.isAuthenticated = false;
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await config.api.logout();
        } catch {
          // Ignore logout errors
        } finally {
          set((state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.error = null;
          });

          storage.remove(userKey);
          if (typeof window !== "undefined") {
            sessionStorage.clear();
          }
        }
      },

      setUser: (user: unknown) => {
        set((state) => {
          state.user = user;
          state.isAuthenticated = true;
          state.error = null;
        });
        storage.setJSON(userKey, user);
      },

      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      checkAuth: async () => {
        set((state) => {
          state.isLoading = true;
        });

        try {
          const userInfo = await config.api.getUserInfo();

          set((state) => {
            state.user = userInfo;
            state.isAuthenticated = true;
            state.isLoading = false;
          });

          storage.setJSON(userKey, userInfo);
        } catch {
          set((state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.isLoading = false;
          });

          storage.remove(userKey);
        }
      },
    }))
  );
}

// ============================================
// Vault Auth Store Implementation
// ============================================

function createVaultAuthStore(config: VaultAuthConfig): UseBoundStore<StoreApi<VaultAuthStore>> {
  const keys = {
    token: config.storageKeys?.token || "rustyvault_token",
    policies: config.storageKeys?.policies || "rustyvault_policies",
  };

  const storedToken = storage.get(keys.token);
  const storedPolicies = storage.getJSON<string[]>(keys.policies) || [];

  const initialState: VaultAuthState = {
    accessToken: storedToken,
    policies: storedPolicies,
    isAuthenticated: !!storedToken,
    isLoading: false,
    error: null,
    capabilitiesCache: {},
  };

  return create<VaultAuthStore>((set, get) => ({
    ...initialState,

    login: async (token: string) => {
      set({ isLoading: true, error: null });

      try {
        const response = await config.api.lookupToken(token);
        const policies = response.data?.policies || [];

        storage.set(keys.token, token);
        storage.setJSON(keys.policies, policies);

        set({
          accessToken: token,
          policies,
          isAuthenticated: true,
          isLoading: false,
          capabilitiesCache: {},
          error: null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid token";

        set({
          error: message,
          isLoading: false,
          isAuthenticated: false,
          accessToken: null,
          policies: [],
        });

        storage.remove(keys.token);
        storage.setJSON(keys.policies, []);
        throw error;
      }
    },

    loginWithUserpass: async (username: string, password: string) => {
      set({ isLoading: true, error: null });

      try {
        const response = await config.api.loginUserpass(username, password);
        const token = response.auth?.client_token;
        const policies = response.auth?.policies || [];

        if (!token) {
          throw new Error("No token received from server");
        }

        set({
          accessToken: token,
          policies,
          isAuthenticated: true,
          isLoading: false,
          capabilitiesCache: {},
        });

        storage.set(keys.token, token);
        storage.setJSON(keys.policies, policies);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Authentication failed";
        set({ error: message, isLoading: false, isAuthenticated: false });
        throw error;
      }
    },

    loginWithAppRole: async (roleId: string, secretId: string) => {
      set({ isLoading: true, error: null });

      try {
        const response = await config.api.loginAppRole(roleId, secretId);
        const token = response.auth?.client_token;
        const policies = response.auth?.policies || [];

        if (!token) {
          throw new Error("No token received from server");
        }

        set({
          accessToken: token,
          policies,
          isAuthenticated: true,
          isLoading: false,
          capabilitiesCache: {},
        });

        storage.set(keys.token, token);
        storage.setJSON(keys.policies, policies);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Authentication failed";
        set({ error: message, isLoading: false, isAuthenticated: false });
        throw error;
      }
    },

    logout: () => {
      set({
        accessToken: null,
        policies: [],
        isAuthenticated: false,
        error: null,
        capabilitiesCache: {},
      });

      storage.remove(keys.token);
      storage.setJSON(keys.policies, []);
    },

    clearError: () => {
      set({ error: null });
    },

    checkAuth: async () => {
      const token = get().accessToken;

      if (!token) {
        set({ isAuthenticated: false, policies: [] });
        return;
      }

      set({ isLoading: true, error: null });

      try {
        const response = await config.api.lookupToken(token);
        const policies = response.data?.policies || [];

        set({
          isAuthenticated: true,
          policies,
          isLoading: false,
          error: null,
        });

        storage.setJSON(keys.policies, policies);
      } catch (error) {
        const isNetworkError =
          error instanceof Error &&
          (error.message.includes("fetch") ||
            error.message.includes("network") ||
            error.message.includes("Failed to fetch") ||
            error.message.includes("NetworkError"));

        const errorMessage = isNetworkError
          ? "Unable to connect to vault server. Please check if the server is running."
          : "Session expired or invalid. Please login again.";

        set({
          accessToken: null,
          policies: [],
          isAuthenticated: false,
          isLoading: false,
          capabilitiesCache: {},
          error: errorMessage,
        });

        storage.remove(keys.token);
        storage.setJSON(keys.policies, []);
      }
    },

    hasPolicy: (policyName: string) => {
      const { policies } = get();
      return policies.includes(policyName) || policies.includes("root");
    },

    isRoot: () => {
      const { policies } = get();
      return policies.includes("root");
    },

    getCapabilities: async (path: string) => {
      const { capabilitiesCache, policies, isRoot } = get();

      if (isRoot()) {
        return ["root", "create", "read", "update", "delete", "list", "sudo"];
      }

      if (capabilitiesCache[path]) {
        return capabilitiesCache[path];
      }

      try {
        const response = await config.api.checkCapabilities(path, policies);
        const capabilities = response.capabilities || ["deny"];

        set((state) => ({
          capabilitiesCache: {
            ...state.capabilitiesCache,
            [path]: capabilities,
          },
        }));

        return capabilities;
      } catch (error) {
        console.error("Failed to check capabilities:", error);
        return ["deny"];
      }
    },

    hasCapability: async (path: string, capability: string) => {
      const capabilities = await get().getCapabilities(path);
      if (capabilities.includes("deny")) return false;
      if (capabilities.includes("root")) return true;
      return capabilities.includes(capability);
    },

    canRead: async (path: string) => {
      return get().hasCapability(path, "read");
    },

    canWrite: async (path: string) => {
      const caps = await get().getCapabilities(path);
      return caps.includes("create") || caps.includes("update") || caps.includes("root");
    },

    canDelete: async (path: string) => {
      return get().hasCapability(path, "delete");
    },

    canList: async (path: string) => {
      return get().hasCapability(path, "list");
    },
  }));
}
