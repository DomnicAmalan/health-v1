/**
 * Vite Configuration for Client App
 * ✨ DRY: Using createViteConfig factory (was 72 lines, now 15)
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { createViteConfig } from "../../config/vite-base.config";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default createViteConfig({
  port: 5175,
  appName: "client-app",
  plugins: [tanstackRouter(), react()],
  publicDir: resolve(__dirname, "public"),
  manualChunks: {
    "ui-vendor": ["@base-ui/react"],
    components: ["@lazarus-life/ui-components"],
  },
});
