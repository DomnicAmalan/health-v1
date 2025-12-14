/**
 * i18n index
 */

export * from "./types";
export * from "./locales";
export * from "./labels";
export * from "./context";
export * from "./useTranslation";
export { TranslationProvider, flattenTranslations, setTranslations } from "./TranslationProvider";

// Pre-built translations for each app
export { 
  adminTranslations,
  vaultTranslations,
  clientTranslations,
  commonTranslations,
  mergeTranslations,
} from "./translations";

// Pre-configured providers for each app
export {
  AdminTranslationProvider,
  VaultTranslationProvider,
  ClientTranslationProvider,
  type AppTranslationProviderProps,
} from "./providers";
