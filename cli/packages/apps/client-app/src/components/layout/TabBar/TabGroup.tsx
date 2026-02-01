import { Avatar, AvatarFallback, Button } from "@lazarus-life/ui-components";
import { cn } from "@lazarus-life/ui-components/utils";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { memo } from "react";
import { getPatientInitials } from "@/lib/colors/patientColors";

interface TabGroupProps {
  groupId: string;
  groupLabel: string;
  groupColor: string;
  groupType: "patient" | "module" | "other";
  patientAvatar?: string;
  isCollapsed: boolean;
  tabCount: number;
  onToggleCollapse: () => void;
  onCloseGroup: () => void;
  children?: React.ReactNode;
}

export const TabGroup = memo(function TabGroup({
  groupId,
  groupLabel,
  groupColor,
  groupType,
  patientAvatar,
  isCollapsed,
  tabCount,
  onToggleCollapse,
  onCloseGroup,
  children,
}: TabGroupProps) {
  return (
    <div
      className="inline-flex items-center gap-1"
      data-group-id={groupId}
    >
      {/* Subtle divider before group */}
      <div
        className="h-8 w-0.5 mx-1"
        style={{ backgroundColor: `${groupColor}40` }}
      />

      {/* Compact Group Header - inline with tabs */}
      <div
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-1 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group",
          isCollapsed && "bg-muted/30"
        )}
        onClick={onToggleCollapse}
        title={`${groupLabel} (${tabCount} tab${tabCount !== 1 ? 's' : ''})`}
      >
        {/* Collapse/Expand Icon */}
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3 shrink-0" style={{ color: groupColor }} />
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0" style={{ color: groupColor }} />
        )}

        {/* Patient Avatar - small */}
        {groupType === "patient" && (
          <Avatar className="h-5 w-5 shrink-0">
            {patientAvatar ? (
              <img src={patientAvatar} alt={groupLabel} className="h-full w-full object-cover" />
            ) : (
              <AvatarFallback
                className="text-[9px] font-semibold"
                style={{ backgroundColor: `${groupColor}20`, color: groupColor }}
              >
                {getPatientInitials(groupLabel)}
              </AvatarFallback>
            )}
          </Avatar>
        )}

        {/* Group Label - only show when collapsed */}
        {isCollapsed && (
          <span
            className="text-[10px] font-medium truncate max-w-[80px]"
            style={{ color: groupColor }}
          >
            {groupLabel} ({tabCount})
          </span>
        )}

        {/* Close Group Button - only show on hover */}
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onCloseGroup();
          }}
          title={`Close all ${groupLabel} tabs`}
        >
          <X className="h-2.5 w-2.5" />
        </Button>
      </div>

      {/* Group Tabs - inline */}
      {!isCollapsed && children}
    </div>
  );
});
