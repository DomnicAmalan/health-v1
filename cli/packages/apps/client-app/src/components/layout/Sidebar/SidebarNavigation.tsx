import { Stack } from "@lazarus-life/ui-components";
import { type SidebarGroup, SidebarGroupComponent } from "./SidebarGroup";
import { type SidebarItem, SidebarItemComponent } from "./SidebarItem";

export type { SidebarItem, SidebarGroup };

interface SidebarNavigationProps {
  items?: SidebarItem[];
  groups?: SidebarGroup[];
  isCollapsed: boolean;
  onNavAction?: (actionId: string, navPath: string) => void;
}

export function SidebarNavigation({
  items,
  groups,
  isCollapsed,
  onNavAction,
}: SidebarNavigationProps) {
  return (
    <nav
      className="flex-1 overflow-y-auto p-2"
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      <Stack spacing="xs">
        {/* Render groups if provided */}
        {groups &&
          groups.map((group) => (
            <SidebarGroupComponent
              key={group.id}
              group={group}
              isCollapsed={isCollapsed}
              onNavAction={onNavAction}
            />
          ))}

        {/* Render flat items if provided (backward compatibility) */}
        {items &&
          items.map((item) => (
            <SidebarItemComponent
              key={item.path}
              item={item}
              isCollapsed={isCollapsed}
              isExpanded={false}
              onToggleExpand={() => {}}
              onNavAction={onNavAction}
            />
          ))}
      </Stack>
    </nav>
  );
}
