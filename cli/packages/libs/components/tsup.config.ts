import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    // Main entry
    index: "src/index.ts",
    // Components
    "components/alert": "src/components/alert.tsx",
    "components/avatar": "src/components/avatar.tsx",
    "components/badge": "src/components/badge.tsx",
    "components/box": "src/components/box.tsx",
    "components/button": "src/components/button.tsx",
    "components/card": "src/components/card.tsx",
    "components/checkbox": "src/components/checkbox.tsx",
    "components/container": "src/components/container.tsx",
    "components/context-menu": "src/components/context-menu.tsx",
    "components/dialog": "src/components/dialog.tsx",
    "components/dropdown-menu": "src/components/dropdown-menu.tsx",
    "components/flex": "src/components/flex.tsx",
    "components/form-builder": "src/components/form-builder.tsx",
    "components/form-field": "src/components/form-field.tsx",
    "components/help-button": "src/components/help-button.tsx",
    "components/hover-help": "src/components/hover-help.tsx",
    "components/input": "src/components/input.tsx",
    "components/label": "src/components/label.tsx",
    "components/login-form": "src/components/login-form.tsx",
    "components/progress": "src/components/progress.tsx",
    "components/scroll-area": "src/components/scroll-area.tsx",
    "components/select": "src/components/select.tsx",
    "components/separator": "src/components/separator.tsx",
    "components/skeleton": "src/components/skeleton.tsx",
    "components/stack": "src/components/stack.tsx",
    "components/switch": "src/components/switch.tsx",
    "components/table": "src/components/table.tsx",
    "components/tabs": "src/components/tabs.tsx",
    "components/textarea": "src/components/textarea.tsx",
    "components/tooltip": "src/components/tooltip.tsx",
    "components/component-registry": "src/components/component-registry.tsx",
    "components/form-playground": "src/components/form-playground.tsx",
    "components/form-canvas-preview": "src/components/form-canvas-preview.tsx",
    // Lib utilities
    "lib/utils": "src/lib/utils.ts",
    "lib/slot": "src/lib/slot.tsx",
  },
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  external: ["react", "react-dom"],
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
  outExtension() {
    return {
      js: ".js",
    };
  },
});
