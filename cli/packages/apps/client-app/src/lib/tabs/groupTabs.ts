import type { Tab } from "@lazarus-life/shared/types/stores/tab";

export interface TabGroup {
  id: string;
  label: string;
  color: string;
  type: "patient" | "module" | "other";
  tabs: Tab[];
  avatar?: string;
}

/**
 * Group tabs based on grouping strategy
 */
export function groupTabs(
  tabs: Tab[],
  strategy: "patient" | "module" | "chronological"
): TabGroup[] {
  if (strategy === "chronological") {
    // No grouping - return all tabs in a single "ungrouped" group
    return [
      {
        id: "ungrouped",
        label: "All Tabs",
        color: "#6B7280",
        type: "other",
        tabs,
      },
    ];
  }

  const groups = new Map<string, TabGroup>();

  for (const tab of tabs) {
    // Skip dashboard tab from grouping
    if (tab.path === "/" || tab.id === "dashboard") {
      continue;
    }

    let groupId: string;
    let groupLabel: string;
    let groupColor: string;
    let groupType: "patient" | "module" | "other";
    let avatar: string | undefined;

    if (strategy === "patient" && tab.groupId && tab.groupType === "patient") {
      // Patient grouping
      groupId = tab.groupId;
      groupLabel = tab.groupLabel || "Unknown Patient";
      groupColor = tab.groupColor || "#6B7280";
      groupType = "patient";
      avatar = tab.patientAvatar;
    } else if (strategy === "module" && tab.groupId && tab.groupType === "module") {
      // Module grouping
      groupId = tab.groupId;
      groupLabel = tab.groupLabel || "Unknown Module";
      groupColor = tab.groupColor || "#6B7280";
      groupType = "module";
    } else {
      // Ungrouped tabs
      groupId = "ungrouped";
      groupLabel = "Other";
      groupColor = "#6B7280";
      groupType = "other";
    }

    const existingGroup = groups.get(groupId);
    if (existingGroup) {
      existingGroup.tabs.push(tab);
    } else {
      groups.set(groupId, {
        id: groupId,
        label: groupLabel,
        color: groupColor,
        type: groupType,
        tabs: [tab],
        avatar,
      });
    }
  }

  return Array.from(groups.values());
}
