/**
 * Vite Configuration for RustyVault UI
 * ✨ DRY: Using createViteConfig factory (was 38 lines, now 9)
 */

import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { createViteConfig } from "../../config/vite-base.config";

export default createViteConfig({
  port: 8215,
  appName: "rustyvault-ui",
  plugins: [TanStackRouterVite(), react()],
  manualChunks: {
    "ui-vendor": ["@lazarus-life/ui-components"],
  },
});
