/**
 * i18n index
 */

export * from "./context";
export * from "./labels";
export * from "./locales";
// Pre-configured providers for each app
export {
  AdminTranslationProvider,
  type AppTranslationProviderProps,
  ClientTranslationProvider,
  VaultTranslationProvider,
} from "./providers";
export { flattenTranslations, setTranslations, TranslationProvider } from "./TranslationProvider";
// Pre-built translations for each app
export {
  adminTranslations,
  clientTranslations,
  commonTranslations,
  mergeTranslations,
  vaultTranslations,
} from "./translations";
export * from "./types";
export * from "./useTranslation";
