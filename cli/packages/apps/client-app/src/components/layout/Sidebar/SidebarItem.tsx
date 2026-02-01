import { cn } from "@lazarus-life/ui-components/utils";
import { memo } from "react";

export interface SidebarItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
}

interface SidebarItemProps {
  item: SidebarItem;
  isCollapsed: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNavAction?: (actionId: string, navPath: string) => void;
}

export const SidebarItemComponent = memo(function SidebarItemComponent({
  item,
  isCollapsed,
}: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left",
        "hover:bg-accent hover:text-accent-foreground",
        item.isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground"
      )}
      title={isCollapsed ? item.label : undefined}
    >
      <span className="h-5 w-5 shrink-0 flex items-center justify-center">{item.icon}</span>
      {!isCollapsed && <span className="text-sm font-medium truncate flex-1">{item.label}</span>}
    </button>
  );
});
