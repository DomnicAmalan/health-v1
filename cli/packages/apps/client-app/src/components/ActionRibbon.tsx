/**
 * ActionRibbon Component
 * Routes to page-specific ribbon components based on active tab
 */

import { memo, useMemo } from "react";
import { Button, Separator } from "@lazarus-life/ui-components";
import { useActiveTabId, useTabs } from "@/stores/tabStore";
import { PatientsRibbon } from "@/components/ribbons/PatientsRibbon";
import {
  ClipboardList,
  FlaskConical,
  PenLine,
  Plus,
  AlertTriangle,
  Calendar,
  LogIn,
  Clock,
  CheckCircle,
  Pill,
  Package,
  FileText,
  CreditCard,
  DollarSign,
} from "lucide-react";

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

  if (activeTab.path.startsWith("/orders")) {
    return (
      <SimpleRibbon
        label="Order actions"
        actions={[
          { id: "new-lab-order", label: "New Lab Order", icon: <FlaskConical className="h-4 w-4" />, action: () => handleAction("new-lab-order", activeTab.path) },
          { id: "new-radiology-order", label: "New Radiology Order", icon: <ClipboardList className="h-4 w-4" />, action: () => handleAction("new-radiology-order", activeTab.path) },
          { id: "view-unsigned", label: "View Unsigned", icon: <PenLine className="h-4 w-4" />, action: () => handleAction("view-unsigned", activeTab.path) },
          { id: "view-stat", label: "STAT Orders", icon: <AlertTriangle className="h-4 w-4" />, action: () => handleAction("view-stat", activeTab.path) },
        ]}
      />
    );
  }

  if (activeTab.path.startsWith("/scheduling")) {
    return (
      <SimpleRibbon
        label="Scheduling actions"
        actions={[
          { id: "new-appointment", label: "New Appointment", icon: <Plus className="h-4 w-4" />, action: () => handleAction("new-appointment", activeTab.path) },
          { id: "today-view", label: "Today", icon: <Calendar className="h-4 w-4" />, action: () => handleAction("today-view", activeTab.path) },
          { id: "check-in", label: "Check In", icon: <LogIn className="h-4 w-4" />, action: () => handleAction("check-in", activeTab.path) },
        ]}
      />
    );
  }

  if (activeTab.path.startsWith("/lab")) {
    return (
      <SimpleRibbon
        label="Lab actions"
        actions={[
          { id: "new-lab-order", label: "New Order", icon: <Plus className="h-4 w-4" />, action: () => handleAction("new-lab-order", activeTab.path) },
          { id: "collection-queue", label: "Collection Queue", icon: <Clock className="h-4 w-4" />, action: () => handleAction("collection-queue", activeTab.path) },
          { id: "verify-results", label: "Verify Results", icon: <CheckCircle className="h-4 w-4" />, action: () => handleAction("verify-results", activeTab.path) },
        ]}
      />
    );
  }

  if (activeTab.path.startsWith("/pharmacy")) {
    return (
      <SimpleRibbon
        label="Pharmacy actions"
        actions={[
          { id: "new-rx", label: "New Rx", icon: <Pill className="h-4 w-4" />, action: () => handleAction("new-rx", activeTab.path) },
          { id: "pending-queue", label: "Pending Queue", icon: <Clock className="h-4 w-4" />, action: () => handleAction("pending-queue", activeTab.path) },
          { id: "ready-pickup", label: "Ready for Pickup", icon: <Package className="h-4 w-4" />, action: () => handleAction("ready-pickup", activeTab.path) },
        ]}
      />
    );
  }

  if (activeTab.path.startsWith("/billing")) {
    return (
      <SimpleRibbon
        label="Billing actions"
        actions={[
          { id: "new-invoice", label: "New Invoice", icon: <FileText className="h-4 w-4" />, action: () => handleAction("new-invoice", activeTab.path) },
          { id: "record-payment", label: "Record Payment", icon: <CreditCard className="h-4 w-4" />, action: () => handleAction("record-payment", activeTab.path) },
          { id: "view-outstanding", label: "Outstanding", icon: <DollarSign className="h-4 w-4" />, action: () => handleAction("view-outstanding", activeTab.path) },
        ]}
      />
    );
  }

  // No ribbon for other pages
  return null;
});

interface RibbonAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
}

function SimpleRibbon({ label, actions }: { label: string; actions: RibbonAction[] }) {
  return (
    <div
      className="flex items-center gap-1 px-4 py-2 border-b bg-card overflow-x-auto"
      role="toolbar"
      aria-label={label}
    >
      {actions.map((ribbonAction, index) => (
        <span key={ribbonAction.id} className="flex items-center">
          {index > 0 && index % 3 === 0 && (
            <Separator orientation="vertical" className="h-6 mx-2" />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={ribbonAction.action}
            className="h-8 px-3 text-sm hover:bg-accent/50 transition-colors"
          >
            <span className="mr-2">{ribbonAction.icon}</span>
            <span>{ribbonAction.label}</span>
          </Button>
        </span>
      ))}
    </div>
  );
}
