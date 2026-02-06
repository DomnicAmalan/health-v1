import { defineConfig } from "tsup";

export default defineConfig({
  // Use glob patterns for scalable entry points
  entry: {
    // Main entry
    index: "src/index.ts",
    // API
    "api/index": "src/api/index.ts",
    "api/routes": "src/api/routes.ts",
    "api/config": "src/api/config.ts",
    "api/types": "src/api/types.ts",
    "api/baseClient": "src/api/baseClient.ts",
    // Constants
    "constants/index": "src/constants/index.ts",
    "constants/permissions": "src/constants/permissions.ts",
    "constants/security": "src/constants/security.ts",
    "constants/fields": "src/constants/fields.ts",
    "constants/oidc": "src/constants/oidc.ts",
    // Environment
    "env/index": "src/env/index.ts",
    "env/validator": "src/env/validator.ts",
    // Middleware
    "middleware/index": "src/middleware/index.ts",
    "middleware/auditMiddleware": "src/middleware/auditMiddleware.ts",
    "middleware/validationMiddleware": "src/middleware/validationMiddleware.ts",
    "middleware/persistenceMiddleware": "src/middleware/persistenceMiddleware.ts",
    // Types - main index
    "types/index": "src/types/index.ts",
    "types/common": "src/types/common.ts",
    "types/compliance": "src/types/compliance.ts",
    "types/i18n": "src/types/i18n.ts",
    "types/assert": "src/types/assert.ts",
    // Types - stores
    "types/stores/index": "src/types/stores/index.ts",
    "types/stores/accessibility": "src/types/stores/accessibility.ts",
    "types/stores/audit": "src/types/stores/audit.ts",
    "types/stores/auth": "src/types/stores/auth.ts",
    "types/stores/tab": "src/types/stores/tab.ts",
    "types/stores/ui": "src/types/stores/ui.ts",
    "types/stores/voice": "src/types/stores/voice.ts",
    // Types - components
    "types/components/index": "src/types/components/index.ts",
    "types/components/registry": "src/types/components/registry.ts",
    // Types - EHR
    "types/ehr/index": "src/types/ehr/index.ts",
    // Types - Billing
    "types/billing/index": "src/types/billing/index.ts",
    // Types - Rules
    "types/rules/index": "src/types/rules/index.ts",
    // Types - Departments
    "types/departments/index": "src/types/departments/index.ts",
    // Types - Diagnostics
    "types/diagnostics/index": "src/types/diagnostics/index.ts",
    // Types - Dashboard
    "types/dashboard/index": "src/types/dashboard/index.ts",
    // Types - Workflow
    "types/workflow/index": "src/types/workflow/index.ts",
    // Schemas
    "schemas/index": "src/schemas/index.ts",
    "schemas/audit": "src/schemas/audit.ts",
    "schemas/user": "src/schemas/user.ts",
    "schemas/common": "src/schemas/common.ts",
    "schemas/env": "src/schemas/env.ts",
    "schemas/guards": "src/schemas/guards.ts",
    "schemas/api/index": "src/schemas/api/index.ts",
    "schemas/ehr/index": "src/schemas/ehr/index.ts",
    "schemas/ehr/appointment": "src/schemas/ehr/appointment.ts",
    "schemas/ehr/patient": "src/schemas/ehr/patient.ts",
    "schemas/ehr/vital": "src/schemas/ehr/vital.ts",
    "schemas/ehr/allergy": "src/schemas/ehr/allergy.ts",
    "schemas/ehr/problem": "src/schemas/ehr/problem.ts",
    "schemas/ehr/medication": "src/schemas/ehr/medication.ts",
    "schemas/ehr/lab-result": "src/schemas/ehr/lab-result.ts",
    "schemas/ehr/order": "src/schemas/ehr/order.ts",
    "schemas/ehr/visit": "src/schemas/ehr/visit.ts",
    "schemas/billing/index": "src/schemas/billing/index.ts",
    // i18n
    "i18n/index": "src/i18n/index.ts",
    "i18n/types": "src/i18n/types.ts",
    "i18n/locales": "src/i18n/locales.ts",
    "i18n/context": "src/i18n/context.ts",
    "i18n/config": "src/i18n/config.ts",
    "i18n/formatters": "src/i18n/formatters.ts",
    "i18n/useTranslation": "src/i18n/useTranslation.ts",
    "i18n/TranslationProvider": "src/i18n/TranslationProvider.tsx",
    "i18n/providers": "src/i18n/providers.tsx",
    "i18n/translations/index": "src/i18n/translations/index.ts",
    // Query
    "query/index": "src/query/index.ts",
    "query/client": "src/query/client.ts",
    // Security
    "security/index": "src/security/index.ts",
    "security/auditLogger": "src/security/auditLogger.ts",
    // Vault
    "vault/index": "src/vault/index.ts",
    "vault/types": "src/vault/types.ts",
    "vault/client": "src/vault/client.ts",
    "vault/store": "src/vault/store.ts",
    "vault/hooks": "src/vault/hooks.ts",
    "vault/sync": "src/vault/sync.ts",
    "vault/proxy": "src/vault/proxy.ts",
    "vault/permissions": "src/vault/permissions.ts",
    "vault/components": "src/vault/components.tsx",
    // Styles (config only, CSS handled separately)
    "styles/tailwind.config": "src/styles/tailwind.config.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  external: ["react", "react-dom", "@lazarus-life/ui-components"],
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
  outExtension() {
    return {
      js: ".js",
    };
  },
});
