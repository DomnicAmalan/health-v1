import { VaultTranslationProvider } from "@lazarus-life/shared/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import Router from "./router";
import "./index.css";

// Create a query client
const queryClient = createQueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <VaultTranslationProvider>
      <QueryClientProvider client={queryClient}>
        <Router />
      </QueryClientProvider>
    </VaultTranslationProvider>
  </StrictMode>,
);
