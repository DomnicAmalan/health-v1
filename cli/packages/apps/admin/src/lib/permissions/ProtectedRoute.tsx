/**
 * Protected Route Component - Admin App
 * Relationship-based route protection using shared component
 */

import { ProtectedRoute as SharedProtectedRoute } from "@lazarus-life/shared";
import { useCanAccess } from "./context";

interface ProtectedRouteProps {
  children: React.ReactNode;
  pageName: string; // e.g., "users", "organizations"
  relation?: string; // Default: "can_view"
  fallbackPath?: string; // Default: "/"
}

/**
 * Admin App Protected Route
 * Wraps shared ProtectedRoute with relationship-based strategy (Zanzibar)
 */
export function ProtectedRoute({
  children,
  pageName,
  relation = "can_view",
  fallbackPath = "/",
}: ProtectedRouteProps) {
  const object = `page:${pageName}`;
  const canAccess = useCanAccess(relation, object, false);

  return (
    <SharedProtectedRoute
      strategy="relationship"
      relation={relation}
      object={object}
      canAccess={() => canAccess}
      redirectTo={fallbackPath}
    >
      {children}
    </SharedProtectedRoute>
  );
}

/**
 * Higher-order component to protect a route
 */
export function withProtectedRoute<T extends object>(
  Component: React.ComponentType<T>,
  pageName: string,
  relation?: string,
  fallbackPath?: string
) {
  return function ProtectedComponent(props: T) {
    return (
      <ProtectedRoute pageName={pageName} relation={relation} fallbackPath={fallbackPath}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
