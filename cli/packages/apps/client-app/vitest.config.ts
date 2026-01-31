import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["**/node_modules/**", "**/e2e/**", "**/dist/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env": JSON.stringify({
      VITE_OIDC_ISSUER: "http://localhost:4117",
      VITE_OIDC_CLIENT_ID: "test-client",
      VITE_OIDC_REDIRECT_URI: "http://localhost:4115",
    }),
  },
});
