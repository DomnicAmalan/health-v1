import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@health-v1/shared": path.resolve(__dirname, "../../libs/shared"),
    },
  },
  server: {
    port: Number(process.env.VITE_PORT) || 5174,
    host: process.env.VITE_HOST || "localhost",
    strictPort: process.env.VITE_STRICT_PORT !== "false",
    open: process.env.VITE_OPEN === "true",
    // Reduce memory usage in dev mode
    hmr: {
      overlay: false, // Disable error overlay to save memory
    },
  },
  // Optimize dependencies to reduce memory usage
  optimizeDeps: {
    entries: ["src/main.tsx"],
    include: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
    exclude: ["@tanstack/react-router-devtools"],
    esbuildOptions: {
      target: "es2020",
    },
  },
  build: {
    outDir: process.env.VITE_BUILD_OUT_DIR || "dist",
    sourcemap: process.env.VITE_SOURCEMAP === "true",
    minify: process.env.VITE_MINIFY !== "false" ? "esbuild" : false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor libraries
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "query-vendor": ["@tanstack/react-query"],
          "ui-vendor": ["@health-v1/ui-components"],
          // Shared libraries
          "shared": ["@health-v1/shared"],
        },
      },
    },
    // Enable tree shaking
    treeshake: true,
  },
  clearScreen: false,
  envPrefix: ["VITE_", "TAURI_"],
});
