import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { LayoutDashboard, Lock, Globe, Settings, LogOut, Shield, Key, Users, AppWindow, KeyRound, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, Button, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@lazarus-life/ui-components';
import { useAuthStore } from '@/stores/authStore';
import { useRealmStore } from '@/stores/realmStore';
import { useUIStore } from '@/stores/uiStore';
import { useTranslation } from '@lazarus-life/shared/i18n';
import { RealmSelector } from '@/components/RealmSelector';

interface NavItem {
  nameKey: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
  requiresRealm?: boolean; // Only show when realm is selected
}

const navItems: NavItem[] = [
  {
    nameKey: 'navigation.dashboard',
    path: '/',
    icon: LayoutDashboard,
  },
  {
    nameKey: 'navigation.realms',
    path: '/realms',
    icon: Globe,
    section: 'Multi-tenancy',
  },
  {
    nameKey: 'navigation.applications',
    path: '/applications',
    icon: AppWindow,
    section: 'Realm',
    requiresRealm: true,
  },
  {
    nameKey: 'navigation.secrets',
    path: '/secrets',
    icon: Lock,
    section: 'Secrets',
  },
  {
    nameKey: 'navigation.policies',
    path: '/policies',
    icon: Shield,
    section: 'Access Control',
  },
  {
    nameKey: 'navigation.tokens',
    path: '/tokens',
    icon: Key,
    section: 'Authentication',
  },
  {
    nameKey: 'navigation.users',
    path: '/users',
    icon: Users,
    section: 'Authentication',
  },
  {
    nameKey: 'navigation.approles',
    path: '/approles',
    icon: KeyRound,
    section: 'Authentication',
    requiresRealm: true,
  },
  {
    nameKey: 'navigation.system',
    path: '/system',
    icon: Settings,
    section: 'Administration',
  },
];

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { currentRealm, isGlobalMode } = useRealmStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const handleLogout = () => {
    logout();
    navigate({ to: '/login' });
  };

  // Filter nav items based on realm context
  const filteredNavItems = navItems.filter((item) => {
    // Always show items that don't require realm
    if (!item.requiresRealm) return true;
    // Only show realm-specific items when realm is selected
    return currentRealm && !isGlobalMode;
  });

  return (
    <div className={cn(
      "border-r bg-background h-full flex flex-col transition-all duration-300 ease-in-out",
      sidebarCollapsed ? "w-16" : "w-64"
    )}>
      <div className={cn(
        "border-b flex items-center gap-2 transition-all relative",
        sidebarCollapsed ? "p-2 justify-center" : "p-4"
      )}>
        <img src="/logo-main.png" alt={t("navigation.title")} className="h-8 w-8 shrink-0" />
        {!sidebarCollapsed && (
          <h2 className="text-lg font-semibold truncate flex-1 min-w-0">{t("navigation.title")}</h2>
        )}
        <Button
          // variant="ghost"
          size="icon"
          className={cn(
            "shrink-0 h-6 w-6 absolute top-1/2 -translate-y-1/2",
            sidebarCollapsed ? "left-3" : "left-7"
          )}
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </div>
      
      {/* Realm Selector */}
      {!sidebarCollapsed && (
        <div className="p-3 border-b">
          <RealmSelector />
        </div>
      )}

      <TooltipProvider>
        <nav className={cn(
          "py-4 space-y-1 flex-1 overflow-y-auto flex flex-col",
          sidebarCollapsed ? "px-2" : "px-2"
        )}>
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.path}
                    className={cn(
                      'flex items-center rounded-md text-sm font-medium transition-colors w-full block',
                      sidebarCollapsed 
                        ? 'justify-center px-2 py-2' 
                        : 'gap-3 px-3 py-2',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="truncate">{t(item.nameKey)}</span>
                    )}
                  </Link>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right">
                    <p>{t(item.nameKey)}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>
      </TooltipProvider>
      <TooltipProvider>
        <div className={cn(
          "border-t",
          sidebarCollapsed ? "p-2" : "p-4"
        )}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full transition-colors",
                  sidebarCollapsed ? "justify-center px-2" : "justify-start"
                )}
                onClick={handleLogout}
              >
                <LogOut className={cn("h-4 w-4 shrink-0", !sidebarCollapsed && "mr-2")} />
                {!sidebarCollapsed && t("common.logout")}
              </Button>
            </TooltipTrigger>
            {sidebarCollapsed && (
              <TooltipContent side="right">
                <p>{t("common.logout")}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}

