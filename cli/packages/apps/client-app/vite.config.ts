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
          "ui-vendor": ["@radix-ui/react-avatar", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
          // Shared libraries
          "shared": ["@health-v1/shared"],
        },
      },
    },
    // Enable tree shaking
    treeshake: true,
  },
  server: {
    port: Number(process.env.VITE_PORT) || 5173,
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
  clearScreen: false,
  envPrefix: ["VITE_", "TAURI_"],
});
