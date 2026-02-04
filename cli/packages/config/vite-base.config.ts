/**
 * Base Vite Configuration Factory
 *
 * Consolidates 70% duplication (100+ lines) across 3 app Vite configs.
 * Provides standardized configuration for React/TanStack apps with optimal
 * chunking, HMR, and build settings.
 *
 * @example
 * ```typescript
 * // Before: 54 lines of duplicated config
 * // After: 3 lines
 * import { createViteConfig } from "../../config/vite-base.config";
 * export default createViteConfig({ port: 8215, appName: "rustyvault-ui" });
 * ```
 */

import path from "node:path";
import type { Plugin, UserConfig } from "vite";
import { defineConfig } from "vite";

export interface ViteConfigOptions {
  /**
   * Development server port
   */
  port: number;

  /**
   * Application name for debugging
   */
  appName: string;

  /**
   * Additional Vite plugins (e.g., TanStackRouterVite, Tauri)
   */
  plugins?: Plugin[];

  /**
   * Custom manual chunks for code splitting
   * Merged with default chunks
   */
  manualChunks?: Record<string, string[]>;

  /**
   * Additional dependencies to exclude from optimization
   */
  excludeOptimizeDeps?: string[];

  /**
   * Additional dependencies to include in optimization
   */
  includeOptimizeDeps?: string[];

  /**
   * Enable source maps in production (default: false)
   */
  sourcemap?: boolean;

  /**
   * Custom public directory path (relative to app root)
   */
  publicDir?: string;

  /**
   * Custom build output directory (default: "dist")
   */
  outDir?: string;
}

/**
 * Creates a standardized Vite configuration for React/TanStack apps
 */
export function createViteConfig(options: ViteConfigOptions): UserConfig {
  const {
    port,
    appName,
    plugins = [],
    manualChunks = {},
    excludeOptimizeDeps = [],
    includeOptimizeDeps = [],
    sourcemap = false,
    publicDir,
    outDir = "dist",
  } = options;

  // Default manual chunks for vendor code splitting
  const defaultManualChunks = {
    "react-vendor": ["react", "react-dom", "@tanstack/react-router"],
    "query-vendor": ["@tanstack/react-query"],
    shared: ["@lazarus-life/shared"],
  };

  // Merge default and custom chunks
  const mergedManualChunks = {
    ...defaultManualChunks,
    ...manualChunks,
  };

  // Default dependencies to include in optimization
  const defaultInclude = [
    "react",
    "react-dom",
    "@tanstack/react-router",
    "@tanstack/react-query",
  ];

  // Default dependencies to exclude from optimization
  const defaultExclude = [
    "@tanstack/react-router-devtools",
    "@lazarus-life/shared",
    "@lazarus-life/ui-components",
  ];

  return defineConfig({
    plugins,

    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "./src"),
      },
      // Ensure consistent resolution of workspace dependencies
      dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/react-router"],
    },

    build: {
      outDir: process.env.VITE_BUILD_OUT_DIR || outDir,
      sourcemap: process.env.VITE_SOURCEMAP === "true" || sourcemap,
      minify: process.env.VITE_MINIFY !== "false" ? "esbuild" : false,
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks: mergedManualChunks,
        },
      },
      // Enable tree shaking
      treeshake: true,
    },

    server: {
      port: Number(process.env.VITE_PORT) || port,
      host: process.env.VITE_HOST || "localhost",
      strictPort: process.env.VITE_STRICT_PORT !== "false",
      open: process.env.VITE_OPEN === "true",
      // HMR configuration optimized for workspace packages
      hmr: {
        overlay: false, // Disable error overlay to save memory
      },
      // Watch workspace packages for changes
      watch: {
        ignored: ["!**/node_modules/@lazarus-life/**"],
      },
    },

    // Optimize dependencies - exclude workspace packages for live updates
    optimizeDeps: {
      entries: ["src/main.tsx"],
      include: [...defaultInclude, ...includeOptimizeDeps],
      exclude: [...defaultExclude, ...excludeOptimizeDeps],
      esbuildOptions: {
        target: "es2020",
      },
    },

    // Don't clear screen in dev mode (better for logs)
    clearScreen: false,

    // Support both VITE_ and TAURI_ environment variables
    envPrefix: ["VITE_", "TAURI_"],

    // Custom public directory if specified
    ...(publicDir && { publicDir }),
  });
}
