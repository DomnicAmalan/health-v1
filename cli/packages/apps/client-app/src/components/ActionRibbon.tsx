/**
 * ActionRibbon Component
 * Routes to page-specific ribbon components based on active tab
 */

import { memo, useMemo } from "react";
import { useActiveTabId, useTabs } from "@/stores/tabStore";
import { PatientsRibbon } from "@/components/ribbons/PatientsRibbon";

interface ActionRibbonProps {
  onAction?: (actionId: string, tabPath: string) => void;
}

export const ActionRibbon = memo(function ActionRibbon({ onAction }: ActionRibbonProps) {
  const tabs = useTabs();
  const activeTabId = useActiveTabId();

  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId), [tabs, activeTabId]);

  // Don't show ribbon for dashboard
  if (!activeTab || activeTab.path === "/") {
    return null;
  }

  const handleAction = onAction || (() => {});

  // Route to page-specific ribbon based on path
  if (activeTab.path.startsWith("/patients/")) {
    return (
      <PatientsRibbon
        path={activeTab.path}
        label={activeTab.label}
        onAction={handleAction}
      />
    );
  }

  // TODO: Add more page-specific ribbons
  // if (activeTab.path.startsWith("/pharmacy")) {
  //   return <PharmacyRibbon path={activeTab.path} label={activeTab.label} onAction={handleAction} />;
  // }
  // if (activeTab.path.startsWith("/lab")) {
  //   return <LabRibbon path={activeTab.path} label={activeTab.label} onAction={handleAction} />;
  // }

  // No ribbon for other pages yet
  return null;
});
