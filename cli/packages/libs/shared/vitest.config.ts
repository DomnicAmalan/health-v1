import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    passWithNoTests: true,
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.config.*",
        "**/test/**",
        "**/*.d.ts",
        "src/**/*.test.{ts,tsx}",
        "**/coverage/**",
      ],
      reporter: ["text", "text-summary", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
    },
  },
});
