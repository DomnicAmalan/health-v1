/**
 * Protected Button Component
 * Wraps buttons to check permission before rendering or enabling
 */

import { Button, type ButtonProps } from "@lazarus-life/ui-components";
import { auditLogger } from "../security/audit";
import { useCanAccess } from "./context";

interface ProtectedButtonProps extends ButtonProps {
  buttonId: string; // e.g., "create-user", "delete-user"
  relation?: string; // Default: "can_click"
  hideIfDenied?: boolean; // If true, hide button instead of disabling (default: false)
  tooltipDenied?: string; // Tooltip text when permission denied
}

/**
 * Protected Button - checks permission before rendering/enabling
 */
export function ProtectedButton({
  buttonId,
  relation = "can_click",
  hideIfDenied = false,
  tooltipDenied = "You don't have permission to perform this action",
  disabled,
  onClick,
  ...buttonProps
}: ProtectedButtonProps) {
  const object = `button:${buttonId}`;
  const canAccess = useCanAccess(relation, object, false);

  if (hideIfDenied && !canAccess) {
    // Log that button was hidden due to permissions
    auditLogger.logDenied(object, `Missing ${relation} relation (button hidden)`);
    return null;
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!canAccess) {
      // Log denied click attempt
      auditLogger.logDenied(object, `Missing ${relation} relation (click denied)`);
      return;
    }
    onClick?.(e);
  };

  return (
    <Button
      {...buttonProps}
      disabled={disabled || !canAccess}
      title={canAccess ? buttonProps.title : tooltipDenied}
      onClick={handleClick}
    />
  );
}
