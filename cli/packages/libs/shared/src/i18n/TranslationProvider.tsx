/**
 * Translation Provider
 * i18n provider component
 * 
 * Apps pass their translations via the `translations` prop.
 * The provider handles flattening, storage, and context management.
 */

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  I18nContext,
  formatCurrencyInLocale,
  formatDateInLocale,
  formatNumberInLocale,
  getLocaleInfo,
  getTranslation,
  isRTL,
  setTranslations,
} from "./context";
import { SUPPORTED_LOCALES } from "./locales";
import type { TranslationKey } from "./types";

// Flatten nested translation objects to dot-notation keys
export function flattenTranslations(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        Object.assign(result, flattenTranslations(value as Record<string, unknown>, newKey));
      } else if (typeof value === "string") {
        result[newKey] = value;
      }
    }
  }
  return result;
}

/**
 * Helper to create translations map from locale imports
 * Use this in your app to prepare translations for the provider
 * 
 * @example
 * const translations = createTranslations({
 *   en: enJson,
 *   es: esJson,
 *   fr: frJson,
 * });
 * 
 * <TranslationProvider translations={translations}>
 *   {children}
 * </TranslationProvider>
 */
export function createTranslations(
  locales: Record<string, Record<string, unknown>>
): Record<string, Record<string, unknown>> {
  return locales;
}

export interface TranslationProviderProps {
  children: ReactNode;
  /** Default locale code (e.g., "en") */
  defaultLocale?: string;
  /** 
   * App translations - keys are locale codes, values are translation objects.
   * Use createTranslations() helper to prepare this.
   */
  translations: Record<string, Record<string, unknown>>;
}

export function TranslationProvider({ 
  children, 
  defaultLocale = "en",
  translations: providedTranslations,
}: TranslationProviderProps) {
  // Only initialize translations once
  const initialized = useRef(false);
  if (!initialized.current && providedTranslations) {
    for (const [locale, translationData] of Object.entries(providedTranslations)) {
      setTranslations(locale, flattenTranslations(translationData));
    }
    initialized.current = true;
  }

  const [locale, setLocaleState] = useState<string>(() => {
    // Try to get from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("i18n-locale");
      if (saved && SUPPORTED_LOCALES.some((l) => l.code === saved)) {
        return saved;
      }
    }
    return defaultLocale;
  });

  const setLocale = (newLocale: string) => {
    if (SUPPORTED_LOCALES.some((l) => l.code === newLocale)) {
      setLocaleState(newLocale);
      if (typeof window !== "undefined") {
        localStorage.setItem("i18n-locale", newLocale);
        document.documentElement.setAttribute("lang", newLocale);
        document.documentElement.setAttribute("dir", isRTL(newLocale) ? "rtl" : "ltr");
      }
    }
  };

  useEffect(() => {
    // Set initial HTML attributes
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("lang", locale);
      document.documentElement.setAttribute("dir", isRTL(locale) ? "rtl" : "ltr");
    }
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: TranslationKey, params?: Record<string, string | number>) =>
        getTranslation(locale, key, params),
      formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) =>
        formatDateInLocale(locale, date, options),
      formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
        formatNumberInLocale(locale, value, options),
      formatCurrency: (value: number, currency?: string) =>
        formatCurrencyInLocale(locale, value, currency),
      isRTL: () => isRTL(locale),
      getLocale: () => getLocaleInfo(locale),
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// Re-export setTranslations for manual usage
export { setTranslations };
