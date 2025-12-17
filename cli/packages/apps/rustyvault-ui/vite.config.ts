import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: Number(process.env.VITE_PORT) || 4115,
    host: process.env.VITE_HOST || "localhost",
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "query-vendor": ["@tanstack/react-query"],
          "ui-vendor": ["@lazarus-life/ui-components"],
          "shared": ["@lazarus-life/shared"],
        },
      },
    },
  },
  // Optimize dependencies to ensure CSS is processed
  optimizeDeps: {
    entries: ["src/main.tsx"],
    include: ["react", "react-dom", "@tanstack/react-query"],
  },
  envPrefix: ["VITE_"],
});

