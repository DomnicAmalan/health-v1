import { Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Sidebar } from "../components/navigation/Sidebar";

export function RootComponent() {
  // Check if we're on the login page
  const isLoginPage = window.location.pathname === "/login";

  return (
    <>
      <div className="min-h-screen bg-background flex">
        {!isLoginPage && <Sidebar />}
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
      <TanStackRouterDevtools />
    </>
  );
}
