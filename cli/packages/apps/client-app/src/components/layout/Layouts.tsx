/**
 * Layout Components
 * Different layout configurations for different route types
 */

import { Container, Flex } from "@lazarus-life/ui-components";
import { Outlet } from "@tanstack/react-router";
import { ActionRibbon } from "@/components/ActionRibbon";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import type { SidebarGroup } from "@/components/layout/Sidebar/SidebarGroup";
import type { SidebarItem } from "@/components/layout/Sidebar/SidebarItem";
import { TabBar } from "@/components/layout/TabBar";
import { SkipToMainContent } from "@/lib/accessibility";

interface FullLayoutProps {
  sidebarItems?: SidebarItem[];
  sidebarGroups?: SidebarGroup[];
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isMobileSidebarOpen: boolean;
  onCloseMobileSidebar: () => void;
  onToggleMobileSidebar: () => void;
  onTabAction: (actionId: string, tabPath: string) => void;
}

/**
 * Full Layout - Sidebar + Header + Action Ribbon + Bottom Tab Bar
 * Used for main application pages
 */
export function FullLayout({
  sidebarItems,
  sidebarGroups,
  isSidebarCollapsed,
  onToggleSidebar,
  isMobileSidebarOpen,
  onCloseMobileSidebar,
  onToggleMobileSidebar,
  onTabAction,
}: FullLayoutProps) {
  return (
    <Flex className="h-screen overflow-hidden bg-background">
      <SkipToMainContent />
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block" aria-label="Main navigation">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={onToggleSidebar}
          items={sidebarItems}
          groups={sidebarGroups}
        />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/50 z-40 lg:hidden border-0 p-0 m-0"
            onClick={onCloseMobileSidebar}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
                e.preventDefault();
                onCloseMobileSidebar();
              }
            }}
            aria-label="Close sidebar"
          />
          <aside className="fixed left-0 top-0 h-screen z-50 lg:hidden">
            <Sidebar
              isCollapsed={false}
              onToggle={onCloseMobileSidebar}
              items={sidebarItems}
              groups={sidebarGroups}
            />
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <Flex direction="column" className="flex-1 overflow-hidden">
        {/* Header - Top bar with user menu */}
        <Header />

        {/* Action Ribbon - shows actions for active tab */}
        <ActionRibbon onAction={onTabAction} />

        {/* Main Content */}
        <main id="main-content" className="flex-1 overflow-y-auto" aria-label="Main content">
          <Container size="full" className="py-2 px-4">
            <Outlet />
          </Container>
        </main>

        {/* Tab Bar - Bottom (like Google Sheets) */}
        <TabBar onMobileMenuClick={onToggleMobileSidebar} />
      </Flex>
    </Flex>
  );
}

export interface MinimalLayoutProps {
  onTabAction?: (actionId: string, tabPath: string) => void;
}

const defaultMinimalLayoutProps: MinimalLayoutProps = {
  onTabAction: undefined,
};

/**
 * Minimal Layout - Header + Bottom Tab Bar, no sidebar
 * Used for focused work pages
 */
export function MinimalLayout({
  onTabAction = defaultMinimalLayoutProps.onTabAction,
}: MinimalLayoutProps = defaultMinimalLayoutProps) {
  return (
    <Flex className="h-screen overflow-hidden bg-background" direction="column">
      <SkipToMainContent />

      {/* Header - Top bar with user menu */}
      <Header />

      {/* Action Ribbon - optional */}
      {onTabAction && <ActionRibbon onAction={onTabAction} />}

      {/* Main Content */}
      <main id="main-content" className="flex-1 overflow-y-auto" aria-label="Main content">
        <Container size="full" className="py-2 px-4">
          <Outlet />
        </Container>
      </main>

      {/* Tab Bar - Bottom (like Google Sheets) */}
      <TabBar />
    </Flex>
  );
}

/**
 * Clean Layout - No navigation, just content
 * Used for login, error pages, modals, etc.
 */
export function CleanLayout() {
  return (
    <div className="h-screen overflow-hidden bg-background">
      <SkipToMainContent />
      <main id="main-content" className="h-full" aria-label="Main content">
        <Outlet />
      </main>
    </div>
  );
}

/**
 * Centered Layout - Centered content, no navigation
 * Used for login, registration, etc.
 */
export function CenteredLayout() {
  return (
    <div className="h-screen overflow-hidden bg-background">
      <SkipToMainContent />
      <main
        id="main-content"
        className="h-full flex items-center justify-center"
        aria-label="Main content"
      >
        <Outlet />
      </main>
    </div>
  );
}
