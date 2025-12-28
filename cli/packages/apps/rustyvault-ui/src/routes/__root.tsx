import { createRootRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { Sidebar } from "@/components/navigation/Sidebar";
import { useAuthStore } from "@/stores/authStore";

// Track if we've validated the token this session
let tokenValidatedThisSession = false;

export const Route = createRootRoute({
  component: RootComponent,
  beforeLoad: async ({ location }) => {
    const publicRoutes = ["/login"];
    const isPublicRoute = publicRoutes.includes(location.pathname);

    if (isPublicRoute) {
      return;
    }

    // Check authentication
    const authStore = useAuthStore.getState();

    // Always validate token with backend on first load of the session
    // This ensures we don't trust stale tokens when backend is down or token expired
    if (authStore.accessToken && !tokenValidatedThisSession) {
      try {
        await authStore.checkAuth();
        tokenValidatedThisSession = true;
      } catch {
        // Token validation failed - checkAuth already handles logout
        tokenValidatedThisSession = false;
      }
    } else if (!authStore.accessToken) {
      // No token at all, try to restore from sessionStorage
      await authStore.checkAuth();
    }

    // If still not authenticated, redirect to login
    if (!authStore.isAuthenticated) {
      tokenValidatedThisSession = false;
      const redirectTo = location.pathname !== "/" ? location.pathname : undefined;
      // Use empty object instead of undefined for search to satisfy exactOptionalPropertyTypes
      throw redirect({
        to: "/login",
        ...(redirectTo ? { search: { redirect: redirectTo } } : {}),
      });
    }
  },
});

function RootComponent() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  return (
    <div className="min-h-screen bg-background flex">
      {!isLoginPage && <Sidebar />}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
