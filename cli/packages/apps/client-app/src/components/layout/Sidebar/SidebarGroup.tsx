import { Box, Stack } from "@lazarus-life/ui-components";
import { cn } from "@lazarus-life/ui-components/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { type SidebarItem, SidebarItemComponent } from "./SidebarItem";

export interface SidebarGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: SidebarItem[];
  defaultExpanded?: boolean;
}

interface SidebarGroupProps {
  group: SidebarGroup;
  isCollapsed: boolean;
  onNavAction?: (actionId: string, navPath: string) => void;
}

export function SidebarGroupComponent({ group, isCollapsed, onNavAction }: SidebarGroupProps) {
  const [isGroupExpanded, setIsGroupExpanded] = useState(group.defaultExpanded ?? true);

  if (isCollapsed) {
    // When sidebar is collapsed, show items directly without groups
    return (
      <>
        {group.items.map((item) => (
          <SidebarItemComponent
            key={item.path}
            item={item}
            isCollapsed={isCollapsed}
            isExpanded={false}
            onToggleExpand={() => {}}
            onNavAction={onNavAction}
          />
        ))}
      </>
    );
  }

  return (
    <Box className="mb-2">
      {/* Group Header */}
      <button
        type="button"
        onClick={() => setIsGroupExpanded(!isGroupExpanded)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-left",
          "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
        )}
      >
        <span className="h-4 w-4 shrink-0">
          {isGroupExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
        <span className="h-4 w-4 shrink-0">{group.icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider truncate flex-1">
          {group.label}
        </span>
      </button>

      {/* Group Items */}
      {isGroupExpanded && (
        <Box className="ml-2 mt-1">
          <Stack spacing="xs">
            {group.items.map((item) => (
              <SidebarItemComponent
                key={item.path}
                item={item}
                isCollapsed={false}
                isExpanded={false}
                onToggleExpand={() => {}}
                onNavAction={onNavAction}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
