import { Box, Button, Flex, TooltipProvider } from "@lazarus-life/ui-components";
import { useNavigate } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { memo, useEffect, useMemo, useRef } from "react";
import { useTabBarDrag } from "@/hooks/ui/useTabBarDrag";
import {
  useActiveTabId,
  useCloseGroupTabs,
  useCloseTab,
  useCollapsedGroups,
  useGroupingStrategy,
  useSetActiveTab,
  useTabs,
  useToggleGroupCollapse,
} from "@/stores/tabStore";
import { useTabWidth } from "@/hooks/ui/useTabWidth";
import { keyboardShortcutManager } from "@/lib/keyboard/shortcuts";
import { groupTabs } from "@/lib/tabs/groupTabs";
import { TabDragPreview } from "./TabDragPreview";
import { TabGroup } from "./TabGroup";
import { TabItem } from "./TabItem";

interface TabBarProps {
  onMobileMenuClick?: () => void;
}

const DASHBOARD_ID = "dashboard";

export const TabBar = memo(function TabBar({ onMobileMenuClick }: TabBarProps) {
  const navigate = useNavigate();
  const tabs = useTabs();
  const activeTabId = useActiveTabId();
  const setActiveTab = useSetActiveTab();
  const closeTab = useCloseTab();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);

  // Grouping state
  const groupingStrategy = useGroupingStrategy();
  const collapsedGroups = useCollapsedGroups();
  const toggleGroupCollapse = useToggleGroupCollapse();
  const closeGroupTabs = useCloseGroupTabs();

  // Optimized tab sorting: Dashboard always first, all others in reverse order (newest first)
  // Uses efficient single-pass algorithm
  const sortedTabs = useMemo(() => {
    if (tabs.length === 0) {
      return [];
    }

    // Single pass to separate dashboard and other tabs
    let dashboard: (typeof tabs)[0] | undefined;
    const otherTabs: typeof tabs = [];

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      if (!tab) {
        continue;
      }
      if (tab.path === "/" || tab.id === DASHBOARD_ID) {
        dashboard = tab;
      } else {
        otherTabs.push(tab);
      }
    }

    // Reverse other tabs in-place for efficiency (newest first)
    for (let i = 0, j = otherTabs.length - 1; i < j; i++, j--) {
      const temp = otherTabs[i];
      const swapTarget = otherTabs[j];
      if (temp && swapTarget) {
        otherTabs[i] = swapTarget;
        otherTabs[j] = temp;
      }
    }

    return dashboard ? [dashboard, ...otherTabs] : otherTabs;
  }, [tabs]);

  // Group tabs based on strategy
  const tabGroups = useMemo(() => {
    // Dashboard is always shown separately, not in groups
    const dashboard = sortedTabs.find((t) => t && (t.path === "/" || t.id === DASHBOARD_ID));
    const nonDashboardTabs = sortedTabs.filter(
      (t) => t && t.path !== "/" && t.id !== DASHBOARD_ID
    );

    const groups = groupTabs(nonDashboardTabs, groupingStrategy);

    return { dashboard, groups };
  }, [sortedTabs, groupingStrategy]);

  const {
    draggedTabId,
    dragOverIndex: _dragOverIndex,
    dragPosition,
    isDraggingOutside,
    dragOffsetRef,
    handleDragStart,
  } = useTabBarDrag({
    sortedTabs,
    scrollContainerRef,
    tabBarRef,
  });

  // Dynamic tab width calculation
  const { tabWidth, hasOverflow, scrollLeft, showRightFade } = useTabWidth(
    sortedTabs.length,
    scrollContainerRef
  );

  // Auto-scroll active tab into view
  useEffect(() => {
    if (!activeTabId || !scrollContainerRef.current) return;
    const activeTab = scrollContainerRef.current.querySelector(
      `[data-tab-id="${activeTabId}"]`
    );
    activeTab?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeTabId]);

  // Register Ctrl+W keyboard shortcut to close active tab
  useEffect(() => {
    const handleCloseTab = () => {
      if (!activeTabId) return;
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (activeTab?.closable && tabs.length > 1) {
        closeTab(activeTabId, (path) => navigate({ to: path as "/" | (string & {}) }));
      }
    };

    keyboardShortcutManager.register({
      id: "close-tab",
      keys: ["Ctrl", "w"],
      description: "Close active tab",
      global: true,
      action: handleCloseTab,
    });

    return () => keyboardShortcutManager.unregister("close-tab");
  }, [activeTabId, tabs, closeTab, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <Flex
        ref={tabBarRef}
        className="border-t border-[#E1E4E8] bg-[#F4F6F8] items-center min-h-[48px]"
        role="tablist"
        aria-label="Application tabs"
        aria-orientation="horizontal"
      >
        {/* Mobile Menu Button */}
        {onMobileMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 lg:hidden"
            onClick={onMobileMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Scrollable tabs area - dashboard + grouped tabs */}
        <Flex
          ref={scrollContainerRef}
          className="items-center gap-0.5 px-2 py-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent flex-1 min-w-0 relative"
        >
          {/* Dashboard Tab - Always first, never grouped */}
          {tabGroups.dashboard && (
            <TabItem
              tab={tabGroups.dashboard}
              isActive={tabGroups.dashboard.id === activeTabId}
              isDragging={false}
              isDragOver={false}
              tabWidth={tabWidth}
              onSelect={() =>
                setActiveTab(tabGroups.dashboard!.id, (path) =>
                  navigate({ to: path as "/" | (string & {}) })
                )
              }
              onClose={() =>
                closeTab(tabGroups.dashboard!.id, (path) =>
                  navigate({ to: path as "/" | (string & {}) })
                )
              }
              onDragStart={(e) => handleDragStart(e, tabGroups.dashboard!.id)}
            />
          )}

          {/* Grouped Tabs */}
          {tabGroups.groups.map((group) => {
            const isCollapsed = collapsedGroups.has(group.id);

            // For chronological grouping (no visual groups), render tabs directly
            if (groupingStrategy === "chronological") {
              return group.tabs.map((tab) => (
                <TabItem
                  key={tab.id}
                  tab={tab}
                  isActive={tab.id === activeTabId}
                  isDragging={draggedTabId === tab.id}
                  isDragOver={false}
                  tabWidth={tabWidth}
                  onSelect={() =>
                    setActiveTab(tab.id, (path) => navigate({ to: path as "/" | (string & {}) }))
                  }
                  onClose={() =>
                    closeTab(tab.id, (path) => navigate({ to: path as "/" | (string & {}) }))
                  }
                  onDragStart={(e) => handleDragStart(e, tab.id)}
                />
              ));
            }

            // For patient/module grouping, render TabGroup component
            return (
              <TabGroup
                key={group.id}
                groupId={group.id}
                groupLabel={group.label}
                groupColor={group.color}
                groupType={group.type}
                patientAvatar={group.avatar}
                isCollapsed={isCollapsed}
                tabCount={group.tabs.length}
                onToggleCollapse={() => toggleGroupCollapse(group.id)}
                onCloseGroup={() =>
                  closeGroupTabs(group.id, (path) => navigate({ to: path as "/" | (string & {}) }))
                }
              >
                {!isCollapsed &&
                  group.tabs.map((tab) => (
                    <TabItem
                      key={tab.id}
                      tab={tab}
                      isActive={tab.id === activeTabId}
                      isDragging={draggedTabId === tab.id}
                      isDragOver={false}
                      tabWidth={tabWidth}
                      onSelect={() =>
                        setActiveTab(tab.id, (path) =>
                          navigate({ to: path as "/" | (string & {}) })
                        )
                      }
                      onClose={() =>
                        closeTab(tab.id, (path) => navigate({ to: path as "/" | (string & {}) }))
                      }
                      onDragStart={(e) => handleDragStart(e, tab.id)}
                    />
                  ))}
              </TabGroup>
            );
          })}
        </Flex>

        {/* Overflow fade indicators */}
        {hasOverflow && scrollLeft > 0 && (
          <Box className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#F4F6F8] to-transparent pointer-events-none z-10" />
        )}
        {hasOverflow && showRightFade && (
          <Box className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#F4F6F8] to-transparent pointer-events-none z-10" />
        )}

        {/* Drag Preview - Floating tab name */}
        {draggedTabId &&
          dragPosition &&
          (() => {
            const draggedTab = sortedTabs.find((t) => t && t.id === draggedTabId);
            if (!draggedTab) {
              return null;
            }

            return (
              <TabDragPreview
                draggedTab={draggedTab}
                dragPosition={dragPosition}
                dragOffset={dragOffsetRef.current}
                isDraggingOutside={isDraggingOutside}
              />
            );
          })()}
      </Flex>
    </TooltipProvider>
  );
});
