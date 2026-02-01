/**
 * RibbonToolbar Component
 * Modern Office/Google Sheets style ribbon for tab actions
 * Renders tab actions in a sleek, compact toolbar
 */

import {
  Button,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lazarus-life/ui-components";
import { memo } from "react";
import type { TabActionGroup } from "@/lib/tab-actions/types";

interface RibbonToolbarProps {
  actionGroups: TabActionGroup[];
  className?: string;
}

interface ActionButtonProps {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string;
}

function ActionButton({ icon, label, onClick, disabled, shortcut }: ActionButtonProps) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className="flex flex-col items-center justify-center h-14 w-16 px-2 py-1 gap-0.5 hover:bg-accent/50 transition-colors disabled:opacity-50"
        >
          {icon && <span className="text-base">{icon}</span>}
          <span className="text-[10px] font-normal leading-tight text-center break-words">
            {label}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="flex flex-col items-center">
          <span>{label}</span>
          {shortcut && <span className="text-[10px] text-muted-foreground mt-0.5">{shortcut}</span>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export const RibbonToolbar = memo(function RibbonToolbar({
  actionGroups,
  className,
}: RibbonToolbarProps) {
  if (!actionGroups || actionGroups.length === 0) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-0.5 px-2 py-1 border-b bg-gradient-to-b from-background to-muted/20 ${className || ""}`}
      role="toolbar"
      aria-label="Page actions"
    >
      {actionGroups.map((group, groupIndex) => (
        <div key={groupIndex} className="flex items-center gap-0.5">
          {/* Render group actions */}
          {group.actions.map((action) => (
            <ActionButton
              key={action.id}
              icon={action.icon}
              label={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
              shortcut={action.shortcut}
            />
          ))}

          {/* Separator between groups (but not after last group) */}
          {groupIndex < actionGroups.length - 1 && (
            <Separator orientation="vertical" className="h-10 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
});
