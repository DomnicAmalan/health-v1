/**
 * Vite Configuration for Admin Dashboard
 * ✨ DRY: Using createViteConfig factory (was 54 lines, now 11)
 */

import react from "@vitejs/plugin-react";
import { createViteConfig } from "../../config/vite-base.config";

export default createViteConfig({
  port: 5174,
  appName: "admin",
  plugins: [react()],
  manualChunks: {
    "ui-vendor": ["@lazarus-life/ui-components"],
  },
});
