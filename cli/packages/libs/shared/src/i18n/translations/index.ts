/**
 * Shared Translations
 * Pre-built translations for all apps
 */

// Import common translations
import commonEn from "./common/en.json";

// Import app-specific translations
import adminEn from "./admin/en.json";
import vaultEn from "./vault/en.json";
import clientEn from "./client/en.json";

/**
 * Deep merge two translation objects
 */
function mergeTranslations(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...base };
  
  for (const key of Object.keys(override)) {
    const baseValue = base[key];
    const overrideValue = override[key];
    
    if (
      typeof baseValue === "object" &&
      baseValue !== null &&
      typeof overrideValue === "object" &&
      overrideValue !== null &&
      !Array.isArray(baseValue) &&
      !Array.isArray(overrideValue)
    ) {
      result[key] = mergeTranslations(
        baseValue as Record<string, unknown>,
        overrideValue as Record<string, unknown>
      );
    } else {
      result[key] = overrideValue;
    }
  }
  
  return result;
}

// Build merged translations for each app
function buildAppTranslations(appLocales: Record<string, Record<string, unknown>>) {
  const result: Record<string, Record<string, unknown>> = {};
  const commonLocales = { en: commonEn };
  
  const locales = new Set([
    ...Object.keys(commonLocales),
    ...Object.keys(appLocales),
  ]);
  
  for (const locale of locales) {
    const common = commonLocales[locale as keyof typeof commonLocales] || commonEn;
    const app = appLocales[locale] || {};
    result[locale] = mergeTranslations(common, app);
  }
  
  return result;
}

/**
 * Pre-built translations for Admin app
 * Usage: <TranslationProvider translations={adminTranslations}>
 */
export const adminTranslations = buildAppTranslations({ en: adminEn });

/**
 * Pre-built translations for Lazarus Life Vault
 * Usage: <TranslationProvider translations={vaultTranslations}>
 */
export const vaultTranslations = buildAppTranslations({ en: vaultEn });

/**
 * Pre-built translations for Client app
 * Usage: <TranslationProvider translations={clientTranslations}>
 */
export const clientTranslations = buildAppTranslations({ en: clientEn });

/**
 * Common translations only (for custom app setups)
 */
export const commonTranslations = { en: commonEn };

/**
 * Export merge utility for custom translations
 */
export { mergeTranslations };
