/**
 * Protected Page Component
 * Wraps page content to check access before rendering
 */

import { AccessDenied } from "@lazarus-life/ui-components";
import { auditLogger } from "../security/audit";
import { useCanAccess } from "./context";

interface ProtectedPageProps {
  children: React.ReactNode;
  pageName: string; // e.g., "users", "organizations"
  relation?: string; // Default: "can_view"
  fallback?: React.ReactNode; // What to show if no access
}

/**
 * Protected Page - checks page access before rendering content
 */
export function ProtectedPage({
  children,
  pageName,
  relation = "can_view",
  fallback,
}: ProtectedPageProps) {
  const object = `page:${pageName}`;
  const canAccess = useCanAccess(relation, object, false);

  if (!canAccess) {
    // Log access denial for audit trail
    auditLogger.logDenied(object, `Missing ${relation} relation`);

    // Return custom fallback or default AccessDenied
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <AccessDenied
        type="page"
        resource={pageName}
        reason={`Requires ${relation} permission`}
        variant="full-page"
      />
    );
  }

  return <>{children}</>;
}
