import React from "react"
import ReactDOM from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "./lib/queryClient"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { validateEnv } from "./lib/env"
import Router from "./router.tsx"
import "./index.css"

// Validate environment variables
validateEnv()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
