/**
 * AccessDenied Component
 * Shared component for displaying access denied messages across all apps
 * Provides consistent UX for permission failures
 */

import { useTranslation } from "@lazarus-life/shared/i18n";
import { Lock, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "../card";
import { Button } from "../button";

export interface AccessDeniedProps {
  /** Type of resource being protected */
  type: "page" | "component" | "button" | "field" | "route";
  /** Name of the resource */
  resource: string;
  /** Reason for denial (optional) */
  reason?: string;
  /** List of required permissions (optional) */
  requiredPermissions?: string[];
  /** Show retry button */
  showRetry?: boolean;
  /** Callback when retry is clicked */
  onRetry?: () => void;
  /** Variant of the display */
  variant?: "card" | "inline" | "full-page";
  /** Additional className */
  className?: string;
}

/**
 * AccessDenied - Displays a consistent access denied message
 *
 * @example
 * ```tsx
 * <AccessDenied
 *   type="page"
 *   resource="users"
 *   reason="Requires can_view permission"
 *   requiredPermissions={["users:view"]}
 * />
 * ```
 */
export function AccessDenied({
  type,
  resource: _resource,
  reason,
  requiredPermissions,
  showRetry = false,
  onRetry,
  variant = "card",
  className = "",
}: AccessDeniedProps) {
  const { t } = useTranslation();

  // Select icon based on type
  const Icon = type === "page" || type === "route" ? ShieldAlert : Lock;

  // Format type for display
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  // Full-page variant
  if (variant === "full-page") {
    return (
      <div className={`flex items-center justify-center min-h-screen p-8 ${className}`}>
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <Icon className="h-12 w-12 text-destructive" aria-hidden="true" />
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold">{t("security.accessDenied")}</h1>
              <p className="text-muted-foreground">
                {t("security.noPermissionToAccess", { resource: typeLabel.toLowerCase() })}
              </p>
              {reason && (
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>{t("security.reason")}:</strong> {reason}
                </p>
              )}
              {requiredPermissions && requiredPermissions.length > 0 && (
                <div className="mt-4 p-3 bg-muted rounded-md text-left">
                  <p className="text-xs font-medium mb-2">{t("security.requiredPermissions")}:</p>
                  <ul className="text-xs space-y-1">
                    {requiredPermissions.map((perm, idx) => (
                      <li key={idx} className="font-mono">
                        • {perm}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {showRetry && onRetry && (
              <Button onClick={onRetry} variant="outline" className="mt-2">
                {t("common.retry")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Inline variant (minimal)
  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 text-sm text-destructive ${className}`}>
        <Lock className="h-4 w-4" aria-hidden="true" />
        <span>{t("security.accessDenied")}</span>
        {reason && <span className="text-muted-foreground">- {reason}</span>}
      </div>
    );
  }

  // Card variant (default)
  return (
    <Card className={`border-destructive/50 bg-destructive/10 ${className}`}>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 text-destructive mt-0.5" aria-hidden="true" />
          <div className="flex-1 space-y-2">
            <div>
              <p className="font-medium text-destructive">{t("security.accessDenied")}</p>
              <p className="text-sm text-muted-foreground">
                {t("security.noPermissionToAccess", { resource: typeLabel.toLowerCase() })}
              </p>
            </div>

            {reason && (
              <p className="text-sm text-muted-foreground">
                <strong>{t("security.reason")}:</strong> {reason}
              </p>
            )}

            {requiredPermissions && requiredPermissions.length > 0 && (
              <div className="mt-2 p-2 bg-muted rounded text-xs">
                <p className="font-medium mb-1">{t("security.requiredPermissions")}:</p>
                <ul className="space-y-0.5">
                  {requiredPermissions.map((perm, idx) => (
                    <li key={idx} className="font-mono">
                      • {perm}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showRetry && onRetry && (
              <Button onClick={onRetry} variant="outline" size="sm" className="mt-2">
                {t("common.retry")}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
