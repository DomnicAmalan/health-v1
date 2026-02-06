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
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "**/node_modules/**",
        "src/test/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/dist/**",
        "**/coverage/**",
        "**/e2e/**",
        "src/**/*.test.{ts,tsx}",
      ],
      reporter: ["text", "text-summary", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
    },
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env": JSON.stringify({
      VITE_API_BASE_URL: "http://localhost:8217/v1",
      VITE_OIDC_ISSUER: "http://localhost:8217",
      VITE_OIDC_CLIENT_ID: "test-client",
    }),
  },
});
