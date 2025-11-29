/**
 * RequirePermission Component
 * Wrapper that checks permissions before rendering children
 */

import { usePermissions } from '@/hooks/security/usePermissions';
import { useAuditLog } from '@/hooks/security/useAuditLog';
import { AccessDenied } from './AccessDenied';
import type { Permission } from '@/lib/constants/permissions';
import { Box } from '@/components/ui/box';

interface RequirePermissionProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  resource?: string;
}

export function RequirePermission({
  permission,
  children,
  fallback,
  resource,
}: RequirePermissionProps) {
  const { hasPermission } = usePermissions();
  const { logDenied } = useAuditLog();
  const granted = hasPermission(permission);

  if (!granted) {
    // Log access denied
    if (resource) {
      logDenied(resource, permission);
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <AccessDenied
        type="component"
        resource={resource || 'resource'}
        requiredPermissions={[permission]}
      />
    );
  }

  return <Box>{children}</Box>;
}

