import { AdminTranslationProvider } from "@lazarus-life/shared/i18n";
import { createQueryClient } from "@lazarus-life/shared/query";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { PermissionProvider } from "./lib/permissions";
import Router from "./router";
import "./index.css";

const queryClient = createQueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1 * 60 * 1000, // 1 minute - reduced for memory efficiency
      gcTime: 5 * 60 * 1000, // 5 minutes - garbage collection time
    },
  },
});

// Validate environment on startup
async function init() {
  try {
    await import("./lib/env");
  } catch (error) {
    // Show error in development
    if (import.meta.env.DEV) {
      const root = document.getElementById("root");
      if (root) {
        root.innerHTML = `
          <div style="padding: 2rem; font-family: system-ui; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626; margin-bottom: 1rem;">Configuration Error</h1>
            <p style="color: #6b7280; margin-bottom: 1rem;">${error instanceof Error ? error.message : "Unknown error"}</p>
            <p style="color: #6b7280; font-size: 0.875rem;">
              Please check your .env file and ensure all required variables are set.
            </p>
          </div>
        `;
      }
      return;
    }
  }

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AdminTranslationProvider>
        <QueryClientProvider client={queryClient}>
          <PermissionProvider>
            <Router />
          </PermissionProvider>
        </QueryClientProvider>
      </AdminTranslationProvider>
    </React.StrictMode>
  );
}

init();
