import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { LayoutDashboard, Lock, Globe, Settings, LogOut, Shield, Key, Users } from 'lucide-react';
import { cn } from '@lazarus-life/ui-components';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@lazarus-life/ui-components';
import { useTranslation } from '@lazarus-life/shared/i18n';

interface NavItem {
  nameKey: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
}

const navItems: NavItem[] = [
  {
    nameKey: 'navigation.dashboard',
    path: '/',
    icon: LayoutDashboard,
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
    nameKey: 'navigation.realms',
    path: '/realms',
    icon: Globe,
    section: 'Multi-tenancy',
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

  const handleLogout = () => {
    logout();
    navigate({ to: '/login' });
  };

  return (
    <div className="w-64 border-r bg-background h-full flex flex-col">
      <div className="p-4 border-b flex items-center gap-2">
        <img src="/logo-main.png" alt={t("navigation.title")} className="h-8 w-8" />
        <h2 className="text-lg font-semibold">{t("navigation.title")}</h2>
      </div>
      <nav className="px-2 py-4 space-y-1 flex-1">
        {navItems.map((item) => {
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
              {t(item.nameKey)}
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

