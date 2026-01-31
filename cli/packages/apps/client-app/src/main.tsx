import { ClientTranslationProvider } from "@lazarus-life/shared/i18n";
import { createQueryClient } from "@lazarus-life/shared/query";
import { ErrorBoundary } from "@lazarus-life/ui-components";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { initializeAxe } from "./lib/accessibility/axe";
import { validateEnv } from "./lib/env";
import Router from "./router";
import "./index.css";

// Validate environment variables
validateEnv();

// Initialize axe accessibility testing in development
initializeAxe();

// Create a client
const queryClient = createQueryClient();

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
