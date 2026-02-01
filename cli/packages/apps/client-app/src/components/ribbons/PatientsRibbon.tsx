/**
 * PatientsRibbon Component
 * Custom action ribbon for patient pages
 * Uses getPatientsTabActions but with custom layout/grouping
 */

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lazarus-life/ui-components";
import { ChevronDown, MoreVertical } from "lucide-react";
import { memo, useMemo } from "react";
import { getPatientsTabActions } from "@/lib/tab-actions/patients";

interface PatientsRibbonProps {
  path: string;
  label: string;
  onAction: (actionId: string, tabPath: string) => void;
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-8 px-3 text-sm hover:bg-accent/50 transition-colors"
    >
      {icon && <span className="mr-2">{icon}</span>}
      <span>{label}</span>
    </Button>
  );
}

export const PatientsRibbon = memo(function PatientsRibbon({
  path,
  label,
  onAction,
}: PatientsRibbonProps) {
  const actionGroups = useMemo(
    () => getPatientsTabActions(path, label, onAction),
    [path, label, onAction]
  );

  if (actionGroups.length === 0) return null;

  // Custom layout for patient pages:
  // Group 1: Primary actions (View, Edit)
  // Group 2: Clinical actions (Note, Schedule, Results, Meds) - some in dropdown
  // Group 3: Utility actions (Print, Export, etc.)
  const [primaryGroup, clinicalGroup, exportGroup, utilityGroup] = actionGroups;

  return (
    <div
      className="flex items-center gap-1 px-4 py-2 border-b bg-card overflow-x-auto"
      role="toolbar"
      aria-label="Patient actions"
    >
      {/* Primary Actions */}
      {primaryGroup?.actions.map((action) => (
        <ActionButton
          key={action.id}
          icon={action.icon}
          label={action.label}
          onClick={action.onClick}
          disabled={action.disabled}
        />
      ))}

      <Separator orientation="vertical" className="h-6 mx-2" />

      {/* Clinical Actions */}
      {clinicalGroup?.actions.map((action) => (
        <ActionButton
          key={action.id}
          icon={action.icon}
          label={action.label}
          onClick={action.onClick}
          disabled={action.disabled}
        />
      ))}

      <Separator orientation="vertical" className="h-6 mx-2" />

      {/* Export Actions */}
      {exportGroup?.actions.map((action) => (
        <ActionButton
          key={action.id}
          icon={action.icon}
          label={action.label}
          onClick={action.onClick}
          disabled={action.disabled}
        />
      ))}

      <Separator orientation="vertical" className="h-6 mx-2" />

      {/* Utility Actions */}
      {utilityGroup?.actions.map((action) => (
        <ActionButton
          key={action.id}
          icon={action.icon}
          label={action.label}
          onClick={action.onClick}
          disabled={action.disabled}
        />
      ))}
    </div>
  );
});
