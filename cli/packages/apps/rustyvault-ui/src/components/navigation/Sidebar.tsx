import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { LayoutDashboard, Lock, Globe, Settings, LogOut, Shield, Key, Users, AppWindow, KeyRound } from 'lucide-react';
import { cn } from '@lazarus-life/ui-components';
import { useAuthStore } from '@/stores/authStore';
import { useRealmStore } from '@/stores/realmStore';
import { Button } from '@lazarus-life/ui-components';
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
    <div className="w-64 border-r bg-background h-full flex flex-col">
      <div className="p-4 border-b flex items-center gap-2">
        <img src="/logo-main.png" alt={t("navigation.title")} className="h-8 w-8" />
        <h2 className="text-lg font-semibold">{t("navigation.title")}</h2>
      </div>
      
      {/* Realm Selector */}
      <div className="p-3 border-b">
        <RealmSelector />
      </div>

      <nav className="px-2 py-4 space-y-1 flex-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {t(item.nameKey, item.nameKey.split('.').pop())}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t("common.logout")}
        </Button>
      </div>
    </div>
  );
}

