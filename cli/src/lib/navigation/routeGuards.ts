/**
 * Route Guards
 * Utilities for protecting routes based on permissions
 */

import type { Permission } from '@/lib/constants/permissions';
import { logAccessDenied } from '@/lib/api/audit';

export interface RouteGuardConfig {
  requiredPermission: Permission;
  resource?: string;
  redirectTo?: string;
}

/**
 * Check if user has permission to access a route
 */
export function checkRoutePermission(
  hasPermission: (perm: Permission) => boolean,
  config: RouteGuardConfig
): { allowed: boolean; reason?: string } {
  const { requiredPermission, resource } = config;

  if (!hasPermission(requiredPermission)) {
    // Log access denied
    if (resource) {
      logAccessDenied('system', resource, requiredPermission);
    }

    return {
      allowed: false,
      reason: `Missing required permission: ${requiredPermission}`,
    };
  }

  return { allowed: true };
}

/**
 * Create a route guard function
 */
export function createRouteGuard(hasPermission: (perm: Permission) => boolean) {
  return (config: RouteGuardConfig) => checkRoutePermission(hasPermission, config);
}

