/**
 * i18n index
 * Internationalization system for healthcare
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

// International configuration and formatters
export {
  DEFAULT_LOCALE,
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  SUPPORTED_CURRENCIES,
  COMMON_TIMEZONES,
  getCurrencyByCode,
  getTimezoneByIdentifier,
  isRtlLocale,
  getBrowserLocale,
  getBrowserTimezone,
} from "./config";

export {
  formatNumber,
  formatCurrency,
  formatDate,
  formatTime,
  formatRelativeTime,
  formatPercent,
  formatPhoneNumber,
  formatFileSize,
  parseLocalizedNumber,
  getCurrencySymbol,
  convertCurrency,
} from "./formatters";
