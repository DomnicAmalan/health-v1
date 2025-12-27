/**
 * Vault Integration for Client App
 *
 * IMPORTANT: Client apps should NEVER talk directly to Vault.
 * All vault operations are proxied through the health-v1 backend for:
 * - Security: Never expose vault tokens/credentials to frontend
 * - Audit: All access is logged through health-v1
 * - Policy: Backend enforces role-based policies
 *
 * Use the VaultProxyClient for all vault operations.
 */

// Re-export vault proxy (recommended for client apps)
export {
  createVaultProxy,
  VaultProxyClient,
  VaultProxyError,
  type VaultProxyCapabilitiesResponse,
  type VaultProxyConfig,
  type VaultSecretResponse,
  type VaultTokenRequest,
  type VaultTokenResponse,
} from "@lazarus-life/shared/vault";

// Re-export permission utilities and components from shared vault module
export {
  CombinedPermissionGate,
  // Permission mappings
  DEFAULT_VAULT_PATH_MAPPINGS,
  generateVaultPoliciesForRoles,
  generateVaultPolicyRules,
  getVaultCapabilitiesForPermission,
  getVaultPathForPermission,
  getVaultPolicyForRole,
  permissionRequiresVault,
  ROLE_TO_VAULT_POLICY,
  type SecretsEngineMount,
  type SecretsEngineType,
  useCombinedPermissions,
  // Hooks (these use the vault store)
  useVaultCapabilities,
  // Store
  useVaultStore,
  type VaultActions,
  type VaultAuth,
  type VaultCapabilitiesResponse,
  // Types
  type VaultCapability,
  type VaultError,
  type VaultPathMapping,
  // Components
  VaultPermissionGate,
  type VaultPolicy,
  VaultProvider,
  type VaultSecret,
  type VaultState,
  VaultStatus,
  type VaultStore,
  type VaultTokenInfo,
  withVaultPermission,
} from "@lazarus-life/shared/vault";

import type { Permission } from "@lazarus-life/shared/constants/permissions";
import {
  getVaultPathForPermission,
  permissionRequiresVault,
  useVaultCapabilities,
} from "@lazarus-life/shared/vault";
import { useMemo } from "react";
import { usePermissions } from "@/hooks/security/usePermissions";

/**
 * Hook that combines health-v1 role permissions with vault ACLs
 *
 * Use this hook when you need to check both:
 * 1. User's role-based permission (from health-v1)
 * 2. User's vault ACL for secrets access
 *
 * @example
 * ```tsx
 * const { hasPermission, canAccessVault, loading } = useCombinedAccess('patients:view');
 *
 * if (hasPermission && canAccessVault) {
 *   // Show sensitive patient data from vault
 * }
 * ```
 */
export function useCombinedAccess(healthPermission: Permission) {
  const { hasPermission } = usePermissions();

  // Get the corresponding vault path for this permission
  const vaultPath = useMemo(() => getVaultPathForPermission(healthPermission), [healthPermission]);

  // Check vault capabilities if there's a mapped path
  const {
    capabilities,
    loading: vaultLoading,
    canRead,
    canWrite,
    canDelete,
    canList,
    isDenied,
  } = useVaultCapabilities(vaultPath || "");

  // Check health-v1 permission
  const hasHealthPermission = useMemo(
    () => hasPermission(healthPermission),
    [hasPermission, healthPermission]
  );

  // Check if this permission requires vault access
  const requiresVault = useMemo(
    () => permissionRequiresVault(healthPermission),
    [healthPermission]
  );

  return {
    // Health permission check
    hasPermission: hasHealthPermission,

    // Vault checks (only relevant if permission requires vault)
    vaultPath,
    requiresVault,
    canAccessVault: !requiresVault || !isDenied,
    canReadVault: !requiresVault || canRead,
    canWriteVault: !requiresVault || canWrite,
    canDeleteVault: !requiresVault || canDelete,
    canListVault: !requiresVault || canList,
    vaultCapabilities: capabilities,

    // Combined result
    allowed: hasHealthPermission && (!requiresVault || !isDenied),
    loading: vaultLoading,
  };
}

/**
 * Hook for checking multiple permissions with vault integration
 *
 * @example
 * ```tsx
 * const { allowed, loading } = useMultipleAccess([
 *   'patients:view',
 *   'clinical:view'
 * ], 'all');
 * ```
 */
export function useMultipleAccess(permissions: Permission[], mode: "all" | "any" = "all") {
  const { hasAllPermissions, hasAnyPermission } = usePermissions();

  // Check all vault paths
  const vaultResults = permissions.map((perm) => {
    const path = getVaultPathForPermission(perm);
    const requiresVault = permissionRequiresVault(perm);
    // Note: We can't call hooks conditionally, so we always check
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { isDenied, loading } = useVaultCapabilities(path || "");
    return { permission: perm, path, requiresVault, isDenied, loading };
  });

  const healthAllowed =
    mode === "all" ? hasAllPermissions(permissions) : hasAnyPermission(permissions);

  const vaultAllowed =
    mode === "all"
      ? vaultResults.every((r) => !r.requiresVault || !r.isDenied)
      : vaultResults.some((r) => !r.requiresVault || !r.isDenied);

  const loading = vaultResults.some((r) => r.loading);

  return {
    healthAllowed,
    vaultAllowed,
    allowed: healthAllowed && vaultAllowed,
    loading,
    details: vaultResults,
  };
}
