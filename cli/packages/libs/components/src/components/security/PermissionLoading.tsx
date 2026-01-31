/**
 * PermissionLoading Component
 * Shared component for displaying loading state while checking permissions
 * Provides consistent UX across all apps
 */

import { Loader2 } from "lucide-react";

export interface PermissionLoadingProps {
  /** Visual variant */
  variant?: "skeleton" | "spinner" | "inline";
  /** Loading message (optional) */
  message?: string;
  /** Additional className */
  className?: string;
}

/**
 * PermissionLoading - Displays a loading state while permissions are being checked
 *
 * @example
 * ```tsx
 * <PermissionLoading variant="skeleton" />
 * <PermissionLoading variant="spinner" message="Checking permissions..." />
 * ```
 */
export function PermissionLoading({
  variant = "skeleton",
  message,
  className = "",
}: PermissionLoadingProps) {
  // Skeleton variant (default)
  if (variant === "skeleton") {
    return (
      <div className={`animate-pulse space-y-2 ${className}`}>
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    );
  }

  // Inline variant (small spinner)
  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {message && <span>{message}</span>}
      </div>
    );
  }

  // Spinner variant (centered)
  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
