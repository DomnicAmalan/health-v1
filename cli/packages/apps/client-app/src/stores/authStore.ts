/**
 * Auth Store - Client App
 * Token-based authentication using shared auth factory
 */

import { createAuthStore, type TokenAuthConfig, type User } from "@lazarus-life/shared";
import {
  login as apiLogin,
  logout as apiLogout,
  getUserInfo,
  refreshAccessToken as apiRefreshAccessToken,
} from "@/lib/api/auth";
import { apiClient } from "@/lib/api/client";

// Configure token-based auth
const config: TokenAuthConfig<User> = {
  strategy: "token",
  storageKeys: {
    accessToken: "auth_access_token",
    refreshToken: "auth_refresh_token",
    user: "auth_user",
  },
  api: {
    login: async (email: string, password: string) => {
      const response = await apiLogin({ email, password });
      return {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user,
      };
    },
    logout: apiLogout,
    getUserInfo: async () => {
      const userInfo = await getUserInfo();
      return {
        id: userInfo.sub,
        email: userInfo.email,
        username: userInfo.name,
        role: userInfo.role || "user",
        permissions: userInfo.permissions || [],
      };
    },
    refreshToken: apiRefreshAccessToken,
  },
  apiClient,
};

// Create store with shared implementation
export const useAuthStore = createAuthStore(config);

// Re-export selectors for backward compatibility
export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const permissions = useAuthStore((state) => state.permissions);
  const role = useAuthStore((state) => state.role);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    permissions,
    role,
  };
};

export const useAuthActions = () =>
  useAuthStore((state) => ({
    login: state.login,
    logout: state.logout,
    refreshAccessToken: state.refreshAccessToken,
    setUser: state.setUser,
    setTokens: state.setTokens,
    clearError: state.clearError,
    checkAuth: state.checkAuth,
  }));

export const useHasPermission = (permission: string): boolean => {
  const permissions = useAuthStore((state) => state.permissions);
  return permissions.includes(permission);
};

export const useHasRole = (role: string): boolean => {
  const userRole = useAuthStore((state) => state.role);
  return userRole === role;
};
