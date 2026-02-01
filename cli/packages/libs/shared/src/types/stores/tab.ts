/**
 * Tab store types
 */

import type { ReactNode } from "react";
import type { Permission } from "../../constants/permissions";

export interface Tab {
  id: string;
  label: string;
  path: string;
  icon?: ReactNode;
  closable?: boolean;
  allowDuplicate?: boolean; // If true, allows multiple tabs with same path (for forms, etc.)
  requiredPermission?: Permission; // Permission required to open this tab
  accessDenied?: boolean; // True if access was denied

  // Patient grouping fields
  groupId?: string; // Group identifier (e.g., patient ID or module name)
  groupType?: "patient" | "module" | "other"; // Type of grouping
  groupLabel?: string; // Display name for the group (e.g., patient name)
  groupColor?: string; // Color for visual grouping
  patientId?: string; // Patient ID if this is a patient-related tab
  patientName?: string; // Patient name for display
  patientAvatar?: string; // Patient avatar URL or initials
}

export interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
  collapsedGroups: Set<string>; // Set of groupIds that are collapsed
  groupingStrategy: "patient" | "module" | "chronological"; // User preference for grouping
}

export interface TabActions {
  openTab: (tab: Omit<Tab, "id">, navigate?: (path: string) => void) => void;
  closeTab: (tabId: string, navigate?: (path: string) => void) => void;
  setActiveTab: (tabId: string, navigate?: (path: string) => void) => void;
  closeAllTabs: (navigate?: (path: string) => void) => void;
  reorderTabs: (draggedId: string, targetIndex: number) => void;
  getTabById: (id: string) => Tab | undefined;
  getTabByPath: (path: string) => Tab | undefined;

  // Group management
  toggleGroupCollapse: (groupId: string) => void;
  setGroupingStrategy: (strategy: "patient" | "module" | "chronological") => void;
  closeGroupTabs: (groupId: string, navigate?: (path: string) => void) => void;
}

export type TabStore = TabState & TabActions;
