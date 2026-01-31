import { PERMISSIONS, type Permission } from "@lazarus-life/shared/constants/permissions";
import { createRootRoute, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import {
  Activity,
  BarChart3,
  Bed,
  Building,
  Calendar,
  ClipboardList,
  CreditCard,
  FileEdit,
  FileText,
  FlaskConical,
  Grid3X3,
  Pill,
  Receipt,
  Scan,
  Scissors,
  Settings,
  Stethoscope,
  Users,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { VoiceCommandChatbox } from "@/components/accessibility/VoiceCommandChatbox";
import { VoiceCommandFAB } from "@/components/accessibility/VoiceCommandFAB";
import { VoiceCommandFeedback } from "@/components/accessibility/VoiceCommandFeedback";
import { VoiceCommandIndicator } from "@/components/accessibility/VoiceCommandIndicator";
import {
  CenteredLayout,
  CleanLayout,
  FullLayout,
  MinimalLayout,
} from "@/components/layout/Layouts";
import { useDisclosure } from "@/hooks/ui/useDisclosure";
import { initializeAccessibility } from "@/lib/accessibility";
import { checkSetupStatus } from "@/lib/api/setup";
import { getLayoutForRoute } from "@/lib/layouts/routeLayouts";
import { useAuthStore } from "@/stores/authStore";
import { useActiveTabId, useOpenTab, useSetActiveTab, useTabs } from "@/stores/tabStore";
import { useSetSidebarCollapsed, useSidebarCollapsed } from "@/stores/uiStore";

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    // Public routes that don't require authentication or setup
    const publicRoutes = ["/login", "/access-denied", "/setup"];
    const isPublicRoute = publicRoutes.includes(location.pathname);

    // Check setup status first (before authentication check)
    try {
      const setupStatus = await checkSetupStatus();
      if (!setupStatus.setup_completed && location.pathname !== "/setup") {
        // Setup not completed, redirect to setup page
        throw redirect({ to: "/setup" });
      }
      if (setupStatus.setup_completed && location.pathname === "/setup") {
        // Setup already completed, redirect to login
        throw redirect({ to: "/login" });
      }
    } catch (err) {
      // If it's a redirect, re-throw it
      if (err && typeof err === "object" && "to" in err) {
        throw err;
      }
    }

    if (isPublicRoute) {
      return;
    }

    // Check authentication
    const authStore = useAuthStore.getState();

    // If no token in store, try to restore from sessionStorage
    if (!authStore.accessToken) {
      await authStore.checkAuth();
    }

    // If still not authenticated, redirect to login
    if (!authStore.isAuthenticated) {
      const redirectTo = location.pathname !== "/" ? location.pathname : undefined;
      throw redirect({
        to: "/login",
        search: redirectTo ? { redirect: redirectTo } : undefined,
      });
    }
  },
  component: RootComponent,
});

// Helper function to get icon for a path
function getIconForPath(path: string): React.ReactNode {
  const iconMap: Record<string, React.ReactNode> = {
    "/": <Stethoscope className="h-4 w-4" />,
    "/patients": <Users className="h-4 w-4" />,
    "/clinical": <FileText className="h-4 w-4" />,
    "/orders": <ClipboardList className="h-4 w-4" />,
    "/results": <Activity className="h-4 w-4" />,
    "/scheduling": <Calendar className="h-4 w-4" />,
    "/pharmacy": <Pill className="h-4 w-4" />,
    "/lab": <FlaskConical className="h-4 w-4" />,
    "/radiology": <Scan className="h-4 w-4" />,
    "/billing": <Receipt className="h-4 w-4" />,
    "/revenue": <CreditCard className="h-4 w-4" />,
    "/opd": <UserPlus className="h-4 w-4" />,
    "/ipd": <Bed className="h-4 w-4" />,
    "/beds": <Grid3X3 className="h-4 w-4" />,
    "/wards": <Building className="h-4 w-4" />,
    "/ot": <Scissors className="h-4 w-4" />,
    "/analytics": <BarChart3 className="h-4 w-4" />,
    "/form-builder": <FileEdit className="h-4 w-4" />,
    "/settings": <Settings className="h-4 w-4" />,
  };

  // Find matching icon by path prefix
  for (const [key, icon] of Object.entries(iconMap)) {
    if (path.startsWith(key)) {
      return icon;
    }
  }

  return <FileText className="h-4 w-4" />; // Default icon
}

function RootComponentInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = useTabs();
  const activeTabId = useActiveTabId();
  const openTab = useOpenTab();
  const setActiveTab = useSetActiveTab();
  const isSidebarCollapsed = useSidebarCollapsed();
  const setIsSidebarCollapsed = useSetSidebarCollapsed();
  const {
    isOpen: isMobileSidebarOpen,
    onClose: onMobileSidebarClose,
    onToggle: onMobileSidebarToggle,
  } = useDisclosure("mobile-sidebar");

  // Initialize accessibility features on mount
  useEffect(() => {
    initializeAccessibility();
  }, []);

  // Initialize auth on app startup - check for existing tokens
  useEffect(() => {
    const authStore = useAuthStore.getState();
    // Only check if we don't already have auth state
    if (!(authStore.isAuthenticated || authStore.isLoading)) {
      authStore.checkAuth().catch((_error) => {});
    }
  }, []);

  // Check for standalone tab on mount (when window is opened from drag-out)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabToken = urlParams.get("_tab");

    if (tabToken) {
      try {
        // Retrieve tab data from sessionStorage using token (single-use, secure)
        const tabDataKey = `_tab_${tabToken}`;
        const expiresKey = `_tab_${tabToken}_expires`;

        const tabDataStr = sessionStorage.getItem(tabDataKey);
        const expiresStr = sessionStorage.getItem(expiresKey);

        if (!tabDataStr) {
          // Token not found or already used - clean up and exit
          if (expiresStr) {
            sessionStorage.removeItem(expiresKey);
          }
          // Clean up URL param
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("_tab");
          window.history.replaceState({}, "", newUrl.toString());
          return;
        }

        // Check expiration
        if (expiresStr && Date.now() > Number.parseInt(expiresStr, 10)) {
          // Token expired - clean up
          sessionStorage.removeItem(tabDataKey);
          sessionStorage.removeItem(expiresKey);
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("_tab");
          window.history.replaceState({}, "", newUrl.toString());
          return;
        }

        const tabData = JSON.parse(tabDataStr);

        // Open the tab automatically with the correct icon
        openTab(
          {
            label: tabData.label,
            path: tabData.path || location.pathname,
            icon: getIconForPath(tabData.path || location.pathname),
            closable: tabData.closable !== false && (tabData.path || location.pathname) !== "/",
            allowDuplicate: tabData.allowDuplicate,
          },
          (path) => navigate({ to: path as "/" | (string & {}) })
        );

        // Immediately delete the token (single-use security measure)
        // This prevents token reuse if URL is shared or bookmarked
        sessionStorage.removeItem(tabDataKey);
        sessionStorage.removeItem(expiresKey);

        // Clean up URL param without reload (for cleaner URL and security)
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("_tab");
        window.history.replaceState({}, "", newUrl.toString());
      } catch (_err) {
        // On error, try to clean up
        try {
          sessionStorage.removeItem(`_tab_${tabToken}`);
          sessionStorage.removeItem(`_tab_${tabToken}_expires`);
        } catch (_cleanupErr) {
          // Ignore cleanup errors
        }
      }
    }
  }, [location.search, location.pathname, openTab, navigate]); // Run when location changes or on mount

  // Sync active tab with router location when navigating via browser back/forward
  useEffect(() => {
    const currentTab = tabs.find((t) => t.path === location.pathname);
    if (currentTab && currentTab.id !== activeTabId) {
      setActiveTab(currentTab.id, (path) => navigate({ to: path as "/" | (string & {}) }));
    }
  }, [location.pathname, tabs, activeTabId, setActiveTab, navigate]);

  // Update browser tab title when active tab changes
  useEffect(() => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (activeTab) {
      document.title = `${activeTab.label} - Lazarus Life HIMS`;
    } else {
      document.title = "Lazarus Life HIMS";
    }
  }, [tabs, activeTabId]);

  const handleNavClick = useCallback(
    (path: string, label: string, icon: React.ReactNode) => {
      // Get required permission for this route - use static map to avoid circular dependency
      const routePermissionMap: Record<string, Permission | undefined> = {
        "/": undefined,
        "/patients": PERMISSIONS.PATIENTS.VIEW,
        "/clinical": PERMISSIONS.CLINICAL.VIEW,
        "/orders": PERMISSIONS.ORDERS.VIEW,
        "/results": PERMISSIONS.RESULTS.VIEW,
        "/scheduling": PERMISSIONS.SCHEDULING.VIEW,
        "/pharmacy": PERMISSIONS.PHARMACY.VIEW,
        "/lab": PERMISSIONS.LAB.VIEW,
        "/radiology": PERMISSIONS.RADIOLOGY.VIEW,
        "/billing": PERMISSIONS.BILLING.VIEW,
        "/revenue": PERMISSIONS.REVENUE.VIEW,
        "/opd": PERMISSIONS.DEPARTMENTS.OPD_VIEW,
        "/ipd": PERMISSIONS.DEPARTMENTS.IPD_VIEW,
        "/beds": PERMISSIONS.DEPARTMENTS.BEDS_VIEW,
        "/wards": PERMISSIONS.DEPARTMENTS.WARDS_VIEW,
        "/ot": PERMISSIONS.DEPARTMENTS.OT_VIEW,
        "/analytics": PERMISSIONS.ANALYTICS.VIEW,
        "/form-builder": undefined,
        "/settings": PERMISSIONS.SETTINGS.VIEW,
      };
      const requiredPermission = routePermissionMap[path];

      openTab(
        {
          label,
          path,
          icon,
          closable: path !== "/",
          requiredPermission,
        },
        (path) => navigate({ to: path as "/" | (string & {}) })
      );
      // Close mobile sidebar after navigation
      onMobileSidebarClose();
    },
    [openTab, navigate, onMobileSidebarClose]
  );

  const handleTabAction = (actionId: string, tabPath: string) => {
    // Handle different actions
    switch (actionId) {
      case "refresh":
        // Reload the current tab
        window.location.reload();
        break;
      case "duplicate": {
        // Open the same path in a new tab
        const tabToDuplicate = tabs.find((t) => t.path === tabPath);
        if (tabToDuplicate) {
          openTab(
            {
              label: `${tabToDuplicate.label} (Copy)`,
              path: tabPath,
              icon: tabToDuplicate.icon,
              closable: true,
            },
            (path) => navigate({ to: path as "/" | (string & {}) })
          );
        }
        break;
      }
      case "view-details":
      case "edit-patient":
      case "new-note":
      case "schedule":
      case "view-results":
      case "view-medications":
      case "new-patient":
      case "new-order":
      case "view-pending":
      case "export":
      case "print":
      case "link-actions":
      case "view-templates":
        // Example: You could dispatch an event or call a callback here
        break;
      default:
    }
  };

  // Define navigation items with permissions
  const allNavigationItems = useMemo<
    Array<{
      path: string;
      label: string;
      icon: React.ReactNode;
      onClick: () => void;
      isActive: boolean;
      permission?: Permission;
    }>
  >(
    () => [
      {
        path: "/",
        label: "Dashboard",
        icon: <Stethoscope className="h-5 w-5" />,
        onClick: () => handleNavClick("/", "Dashboard", <Stethoscope className="h-4 w-4" />),
        isActive: location.pathname === "/",
        permission: undefined, // Dashboard is always accessible
      },
      {
        path: "/patients",
        label: "Patients",
        icon: <Users className="h-5 w-5" />,
        onClick: () => handleNavClick("/patients", "Patients", <Users className="h-4 w-4" />),
        isActive: location.pathname.startsWith("/patients"),
        permission: PERMISSIONS.PATIENTS.VIEW,
      },
      {
        path: "/clinical",
        label: "Clinical",
        icon: <FileText className="h-5 w-5" />,
        onClick: () => handleNavClick("/clinical", "Clinical", <FileText className="h-4 w-4" />),
        isActive: location.pathname.startsWith("/clinical"),
        permission: PERMISSIONS.CLINICAL.VIEW,
      },
      {
        path: "/orders",
        label: "Orders",
        icon: <ClipboardList className="h-5 w-5" />,
        onClick: () => handleNavClick("/orders", "Orders", <ClipboardList className="h-4 w-4" />),
        isActive: location.pathname.startsWith("/orders"),
        permission: PERMISSIONS.ORDERS.VIEW,
      },
      {
        path: "/results",
        label: "Results",
        icon: <Activity className="h-5 w-5" />,
        onClick: () => handleNavClick("/results", "Results", <Activity className="h-4 w-4" />),
        isActive: location.pathname.startsWith("/results"),
        permission: PERMISSIONS.RESULTS.VIEW,
      },
      {
        path: "/scheduling",
        label: "Scheduling",
        icon: <Calendar className="h-5 w-5" />,
        onClick: () =>
          handleNavClick("/scheduling", "Scheduling", <Calendar className="h-4 w-4" />),
        isActive: location.pathname.startsWith("/scheduling"),
        permission: PERMISSIONS.SCHEDULING.VIEW,
      },
      {
        path: "/pharmacy",
        label: "Pharmacy",
        icon: <Pill className="h-5 w-5" />,
        onClick: () => handleNavClick("/pharmacy", "Pharmacy", <Pill className="h-4 w-4" />),
        isActive: location.pathname.startsWith("/pharmacy"),
        permission: PERMISSIONS.PHARMACY.VIEW,
      },
      {
        path: "/lab",
        label: "Lab",
        icon: <FlaskConical className="h-5 w-5" />,
        onClick: () => handleNavClick("/lab", "Lab", <FlaskConical className="h-4 w-4" />),
        isActive: location.pathname.startsWith("/lab"),
        permission: PERMISSIONS.LAB.VIEW,
      },
      {
        path: "/radiology",
        label: "Radiology",
        icon: <Scan className="h-5 w-5" />,
        onClick: () => handleNavClick("/radiology", "Radiology", <Scan className="h-4 w-4" />),
        isActive: location.pathname.startsWith("/radiology"),
        permission: PERMISSIONS.RADIOLOGY.VIEW,
      },
      {
        path: "/opd",
        label: "OPD",
        icon: <UserPlus className="h-5 w-5" />,
        onClick: () => handleNavClick("/opd", "OPD", <UserPlus className="h-4 w-4" />),
        isActive: location.pathname.startsWith("/opd"),
        permission: PERMISSIONS.DEPARTMENTS.OPD_VIEW,
      },
      {
        path: "/ipd",
        label: "IPD",
        icon: <Bed className="h-5 w-5" />,
        onClick: () => handleNavClick("/ipd", "IPD", <Bed className="h-4 w-4" />),
        isActive: location.pathname.startsWith("/ipd"),
        permission: PERMISSIONS.DEPARTMENTS.IPD_VIEW,
      },
      {
        path: "/beds",
        label: "Beds",
        icon: <Grid3X3 className="h-5 w-5" />,
        onClick: () => handleNavClick("/beds", "Beds", <Grid3X3 className="h-4 w-4" />),
        isActive: location.pathname.startsWith("/beds"),
        permission: PERMISSIONS.DEPARTMENTS.BEDS_VIEW,
      },
      {
        path: "/wards",
        label: "Wards",
        icon: <Building className="h-5 w-5" />,
        onClick: () => handleNavClick("/wards", "Wards", <Building className="h-4 w-4" />),
        isActive: location.pathname.startsWith("/wards"),
        permission: PERMISSIONS.DEPARTMENTS.WARDS_VIEW,
      },
      {
        path: "/ot",
        label: "OT",
        icon: <Scissors className="h-5 w-5" />,
        onClick: () => handleNavClick("/ot", "OT", <Scissors className="h-4 w-4" />),
        isActive: location.pathname.startsWith("/ot"),
        permission: PERMISSIONS.DEPARTMENTS.OT_VIEW,
      },
      {
        path: "/billing",
        label: "Billing",
        icon: <Receipt className="h-5 w-5" />,
        onClick: () => handleNavClick("/billing", "Billing", <Receipt className="h-4 w-4" />),
        isActive: location.pathname.startsWith("/billing"),
        permission: PERMISSIONS.BILLING.VIEW,
      },
      {
        path: "/revenue",
        label: "Revenue",
        icon: <CreditCard className="h-5 w-5" />,
        onClick: () => handleNavClick("/revenue", "Revenue", <CreditCard className="h-4 w-4" />),
        isActive: location.pathname.startsWith("/revenue"),
        permission: PERMISSIONS.REVENUE.VIEW,
      },
      {
        path: "/analytics",
        label: "Analytics",
        icon: <BarChart3 className="h-5 w-5" />,
        onClick: () => handleNavClick("/analytics", "Analytics", <BarChart3 className="h-4 w-4" />),
        isActive: location.pathname.startsWith("/analytics"),
        permission: PERMISSIONS.ANALYTICS.VIEW,
      },
      {
        path: "/form-builder",
        label: "Form Builder",
        icon: <FileEdit className="h-5 w-5" />,
        onClick: () =>
          handleNavClick("/form-builder", "Form Builder", <FileEdit className="h-4 w-4" />),
        isActive: location.pathname.startsWith("/form-builder"),
        permission: undefined, // Form builder might not need specific permission
      },
      {
        path: "/settings",
        label: "Settings",
        icon: <Settings className="h-5 w-5" />,
        onClick: () => handleNavClick("/settings", "Settings", <Settings className="h-4 w-4" />),
        isActive: location.pathname.startsWith("/settings"),
        permission: PERMISSIONS.SETTINGS.VIEW,
      },
    ],
    [location.pathname, handleNavClick]
  );

  // Filter navigation items based on permissions
  // Use direct store access to avoid hook re-render issues
  const navigationItems = useMemo(() => {
    const state = useAuthStore.getState();
    return allNavigationItems.filter((item) => {
      if (!item.permission) {
        return true; // No permission required
      }
      return state.permissions.includes(item.permission);
    });
  }, [allNavigationItems]); // Filter based on navigation items and permissions

  // Determine layout based on route
  const layoutType = getLayoutForRoute(location.pathname);

  // Voice command components should only show on authenticated layouts
  const showVoiceCommands = layoutType === "full" || layoutType === "minimal";

  // Render appropriate layout
  switch (layoutType) {
    case "centered":
      return (
        <>
          <CenteredLayout />
          <TanStackRouterDevtools />
        </>
      );

    case "clean":
      return (
        <>
          <CleanLayout />
          <TanStackRouterDevtools />
        </>
      );

    case "minimal":
      return (
        <>
          <MinimalLayout onTabAction={handleTabAction} />
          {showVoiceCommands && <VoiceCommandComponents />}
          <TanStackRouterDevtools />
        </>
      );
    default:
      return (
        <>
          <FullLayout
            sidebarItems={navigationItems}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isMobileSidebarOpen={isMobileSidebarOpen}
            onCloseMobileSidebar={onMobileSidebarClose}
            onToggleMobileSidebar={onMobileSidebarToggle}
            onTabAction={handleTabAction}
          />
          {showVoiceCommands && <VoiceCommandComponents />}
          <TanStackRouterDevtools />
        </>
      );
  }
}

// Voice command components wrapper
function VoiceCommandComponents() {
  return (
    <>
      <VoiceCommandIndicator />
      <VoiceCommandFeedback />
      <VoiceCommandFAB />
      <VoiceCommandChatbox />
    </>
  );
}

// Root component - no longer needs TabProvider
function RootComponent() {
  return <RootComponentInner />;
}
