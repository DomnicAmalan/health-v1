import { AccessDenied, PermissionLoading } from "@lazarus-life/ui-components";
import type { ReactNode } from "react";
import { useAuthStore, useCapabilities } from "@/stores/authStore";

interface PermissionGateProps {
  /** The vault path to check permissions for */
  path: string;
  /** Required capability (read, write, delete, list) */
  capability?: "read" | "write" | "delete" | "list";
  /** Children to render if permission is granted */
  children: ReactNode;
  /** What to render if permission is denied (optional) */
  fallback?: ReactNode;
  /** Show loading state while checking */
  showLoading?: boolean;
  /** Show access denied message (default: false) */
  showDenied?: boolean;
}

/**
 * Component to conditionally render children based on ACL permissions
 *
 * @example
 * ```tsx
 * <PermissionGate path="secret/data/myapp" capability="write">
 *   <Button>Create Secret</Button>
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  path,
  capability = "read",
  children,
  fallback,
  showLoading = false,
  showDenied = false,
}: PermissionGateProps) {
  const { capabilities, loading, isDenied } = useCapabilities(path);
  const { isRoot } = useAuthStore();

  // Root users have all permissions
  if (isRoot()) {
    return <>{children}</>;
  }

  // Show loading state
  if (loading && showLoading) {
    return <PermissionLoading variant="skeleton" />;
  }

  // Check specific capability
  const hasPermission = (() => {
    if (isDenied) return false;
    if (capabilities.includes("root")) return true;

    switch (capability) {
      case "read":
        return capabilities.includes("read");
      case "write":
        return capabilities.includes("create") || capabilities.includes("update");
      case "delete":
        return capabilities.includes("delete");
      case "list":
        return capabilities.includes("list");
      default:
        return false;
    }
  })();

  if (hasPermission) {
    return <>{children}</>;
  }

  // Return fallback or denied message
  if (fallback) {
    return <>{fallback}</>;
  }

  if (showDenied) {
    return (
      <AccessDenied
        type="component"
        resource={path}
        reason={`Requires ${capability} capability on ${path}`}
      />
    );
  }

  return null;
}

/**
 * Hook-based permission check for more complex scenarios
 */
export function useHasPermission(path: string, capability: "read" | "write" | "delete" | "list") {
  const { capabilities, loading, isDenied } = useCapabilities(path);
  const { isRoot } = useAuthStore();

  if (isRoot()) {
    return { hasPermission: true, loading: false };
  }

  if (loading) {
    return { hasPermission: false, loading: true };
  }

  if (isDenied) {
    return { hasPermission: false, loading: false };
  }

  const hasPermission = (() => {
    if (capabilities.includes("root")) return true;

    switch (capability) {
      case "read":
        return capabilities.includes("read");
      case "write":
        return capabilities.includes("create") || capabilities.includes("update");
      case "delete":
        return capabilities.includes("delete");
      case "list":
        return capabilities.includes("list");
      default:
        return false;
    }
  })();

  return { hasPermission, loading: false };
}

/**
 * Higher-order component for permission-protected pages
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  path: string,
  capability: "read" | "write" | "delete" | "list" = "read",
) {
  return function PermissionProtectedComponent(props: P) {
    const { hasPermission, loading } = useHasPermission(path, capability);

    if (loading) {
      return <PermissionLoading variant="spinner" message="Checking permissions..." />;
    }

    if (!hasPermission) {
      return (
        <AccessDenied
          type="page"
          resource={path}
          reason={`Required: ${capability} capability`}
          variant="full-page"
        />
      );
    }

    return <WrappedComponent {...props} />;
  };
}
