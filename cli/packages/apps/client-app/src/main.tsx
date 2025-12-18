import { ClientTranslationProvider } from "@lazarus-life/shared/i18n";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initializeAxe } from "./lib/accessibility/axe";
import { validateEnv } from "./lib/env";
import { queryClient } from "./lib/queryClient";
import Router from "./router.tsx";
import "./index.css";

// Validate environment variables
validateEnv();

// Initialize axe accessibility testing in development
initializeAxe();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ClientTranslationProvider>
          <Router />
        </ClientTranslationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
