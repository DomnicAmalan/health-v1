import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@health-v1/shared": path.resolve(__dirname, "../../libs/shared"),
    },
  },
  server: {
    port: Number(process.env.VITE_PORT) || 3000,
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
          "ui-vendor": ["@health-v1/ui-components"],
        },
      },
    },
  },
  envPrefix: ["VITE_"],
});

