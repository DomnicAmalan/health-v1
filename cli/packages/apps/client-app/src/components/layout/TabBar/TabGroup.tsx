import { Avatar, AvatarFallback, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Tooltip, TooltipContent, TooltipTrigger } from "@lazarus-life/ui-components";
import { cn } from "@lazarus-life/ui-components/utils";
import { ChevronDown, ChevronRight, X, Maximize2, Minimize2 } from "lucide-react";
import { memo, useState } from "react";
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
  tabs?: Array<{
    id: string;
    label: string;
    isActive: boolean;
    onSelect: () => void;
    onClose: () => void;
  }>;
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
  tabs = [],
}: TabGroupProps) {
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [tabsMenuOpen, setTabsMenuOpen] = useState(false);

  // Find active tab in this group
  const activeTab = tabs?.find((t) => t.isActive);

  // Extract patient name from active tab label (format: "NAME | Patient (MRN)")
  const getActiveTabDisplay = () => {
    if (!activeTab) return null;

    // Extract name and MRN from label like "JOHN, DOE | Patient (MRN001)"
    const match = activeTab.label.match(/^(.+?)\s*\|\s*Patient\s*\((.+?)\)/);
    if (match) {
      const [, name, mrn] = match;
      return `${name.trim()} (${mrn})`;
    }
    return activeTab.label;
  };

  const activeDisplay = getActiveTabDisplay();

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuOpen(true);
  };

  return (
    <div
      className="inline-flex items-center gap-1"
      data-group-id={groupId}
      onContextMenu={handleContextMenu}
    >
      {/* Subtle divider before group */}
      <div
        className="h-8 w-0.5 mx-1"
        style={{ backgroundColor: `${groupColor}40` }}
      />

      {/* Compact Group Header - shows tab count */}
      <div className="inline-flex items-center gap-1 group">
        <DropdownMenu open={tabsMenuOpen} onOpenChange={setTabsMenuOpen}>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors cursor-pointer border-0 bg-transparent",
                    tabsMenuOpen && "bg-muted/50"
                  )}
                  onContextMenu={handleContextMenu}
                >
              {/* Expand Icon */}
              <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", tabsMenuOpen && "rotate-180")} style={{ color: groupColor }} />

              {/* Group Label - show active tab and count */}
              <span
                className="text-[10px] font-medium truncate max-w-[200px]"
                style={{ color: groupColor }}
              >
                {activeDisplay ? `${activeDisplay} | ${groupLabel}` : groupLabel} ({tabCount})
              </span>
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <div className="flex flex-col gap-1">
                <span className="font-semibold">{groupLabel}</span>
                {activeDisplay && (
                  <span className="text-primary">
                    Active: {activeDisplay}
                  </span>
                )}
                <span className="text-muted-foreground">
                  {tabCount} tab{tabCount !== 1 ? 's' : ''} • Click to view all
                </span>
              </div>
            </TooltipContent>
          </Tooltip>

        <DropdownMenuContent align="start" className="w-56 max-h-96 overflow-y-auto">
          {tabs.length > 0 ? (
            tabs.map((tab) => (
              <DropdownMenuItem
                key={tab.id}
                onClick={(e) => {
                  e.stopPropagation();
                  tab.onSelect();
                  setTabsMenuOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between gap-2",
                  tab.isActive && "bg-accent"
                )}
              >
                <span className="truncate flex-1">{tab.label}</span>
                <button
                  type="button"
                  className="h-5 w-5 shrink-0 rounded hover:bg-destructive/20 flex items-center justify-center"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    tab.onClose();
                    setTabsMenuOpen(false);
                  }}
                  title="Close tab"
                >
                  <X className="h-3 w-3" />
                </button>
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled>
              <span className="text-muted-foreground">No tabs</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onCloseGroup();
              setTabsMenuOpen(false);
            }}
            className="text-destructive focus:text-destructive"
          >
            <X className="mr-2 h-4 w-4" />
            Close All
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>

        {/* Close Group Button */}
        <button
          type="button"
          className="h-4 w-4 shrink-0 inline-flex items-center justify-center hover:bg-destructive/20 rounded opacity-60 hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onCloseGroup();
          }}
          title={`Close all ${groupLabel} tabs`}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>

      {/* Context Menu for right-click */}
      <DropdownMenu open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
        <DropdownMenuTrigger asChild>
          <div className="hidden" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onCloseGroup();
              setContextMenuOpen(false);
            }}
            className="text-destructive focus:text-destructive"
          >
            <X className="mr-2 h-4 w-4" />
            Close All {groupLabel} Tabs
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
