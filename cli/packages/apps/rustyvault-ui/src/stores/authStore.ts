/**
 * Auth Store - RustyVault UI
 * Vault-token authentication using shared auth factory
 */

import { createAuthStore, type VaultAuthConfig } from "@lazarus-life/shared";
import { authApi } from "@/lib/api/auth";
import { policiesApi } from "@/lib/api/policies";
import { useEffect, useState } from "react";

// Configure vault-specific auth
const config: VaultAuthConfig = {
  strategy: "vault",
  storageKeys: {
    token: "rustyvault_token",
    policies: "rustyvault_policies",
  },
  api: {
    lookupToken: authApi.lookupToken,
    loginUserpass: authApi.loginUserpass,
    loginAppRole: authApi.loginAppRole,
    checkCapabilities: policiesApi.checkCapabilities,
  },
};

// Create store with shared implementation
export const useAuthStore = createAuthStore(config);

// Re-export capabilities hook for backward compatibility
export function useCapabilities(path: string) {
  const { getCapabilities, isRoot } = useAuthStore();
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isRoot()) {
      setCapabilities(["root", "create", "read", "update", "delete", "list", "sudo"]);
      setLoading(false);
      return;
    }

    getCapabilities(path).then((caps) => {
      setCapabilities(caps);
      setLoading(false);
    });
  }, [path, getCapabilities, isRoot]);

  return {
    capabilities,
    loading,
    canRead: capabilities.includes("read") || capabilities.includes("root"),
    canWrite:
      capabilities.includes("create") ||
      capabilities.includes("update") ||
      capabilities.includes("root"),
    canDelete: capabilities.includes("delete") || capabilities.includes("root"),
    canList: capabilities.includes("list") || capabilities.includes("root"),
    isDenied: capabilities.includes("deny"),
  };
}
