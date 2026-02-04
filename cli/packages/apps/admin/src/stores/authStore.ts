/**
 * Auth Store - Admin App
 * Session-based authentication using shared auth factory
 */

import { createAuthStore, type SessionAuthConfig } from "@lazarus-life/shared";
import type { UserInfoWithOrg } from "@/lib/api/types";
import { login as apiLogin, logout as apiLogout, getUserInfo } from "@/lib/api/auth";

// Configure session-based auth
const config: SessionAuthConfig<UserInfoWithOrg> = {
  strategy: "session",
  storageKey: "admin_auth_user",
  api: {
    login: async (email: string, password: string) => {
      const response = await apiLogin({ email, password });

      // Session is automatically set via cookie, we just store user info
      const userInfo: UserInfoWithOrg = {
        id: response.user.id,
        email: response.user.email,
        username: response.user.username || response.user.email,
        name: response.user.username || response.user.email,
        role: response.user.role,
        permissions: response.user.permissions || [],
      };

      return { user: userInfo };
    },
    logout: apiLogout,
    getUserInfo,
  },
};

// Create store with shared implementation
export const useAuthStore = createAuthStore(config);
