import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: __dirname,
  publicDir: resolve(__dirname, "public"),
  plugins: [tanstackRouter(), react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
    // Ensure consistent resolution of workspace dependencies
    dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/react-router"],
  },
  build: {
    outDir: process.env.VITE_BUILD_OUT_DIR || resolve(__dirname, "dist"),
    sourcemap: process.env.VITE_SOURCEMAP === "true",
    minify: process.env.VITE_MINIFY !== "false" ? "esbuild" : false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor libraries
          "react-vendor": ["react", "react-dom", "@tanstack/react-router"],
          "query-vendor": ["@tanstack/react-query"],
          "ui-vendor": ["@base-ui/react"],
          // Shared libraries
          shared: ["@lazarus-life/shared"],
          components: ["@lazarus-life/ui-components"],
        },
      },
    },
    // Enable tree shaking
    treeshake: true,
  },
  server: {
    port: Number(process.env.VITE_PORT) || 4115,
    host: process.env.VITE_HOST || "localhost",
    strictPort: process.env.VITE_STRICT_PORT !== "false",
    open: process.env.VITE_OPEN === "true",
    // HMR configuration for workspace packages
    hmr: {
      overlay: false, // Disable error overlay to save memory
    },
    // Watch workspace packages for changes
    watch: {
      // Watch the dist folders of workspace packages
      ignored: ["!**/node_modules/@lazarus-life/**"],
    },
  },
  // Optimize dependencies - exclude workspace packages so they always get fresh builds
  optimizeDeps: {
    entries: ["src/main.tsx"],
    include: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
    // Exclude workspace packages from pre-bundling to get live updates
    exclude: [
      "@tanstack/react-router-devtools",
      "@lazarus-life/shared",
      "@lazarus-life/ui-components",
    ],
    esbuildOptions: {
      target: "es2020",
    },
  },
  clearScreen: false,
  envPrefix: ["VITE_", "TAURI_"],
});
