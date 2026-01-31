/**
 * i18n Configuration
 * Internationalization setup for the healthcare system
 */

import type { SupportedLocale, Currency, Timezone } from "../types/i18n";

/** Default locale */
export const DEFAULT_LOCALE = "en-US";

/** Default currency */
export const DEFAULT_CURRENCY = "USD";

/** Default timezone */
export const DEFAULT_TIMEZONE = "UTC";

/** Supported locales with metadata */
export const SUPPORTED_LOCALES: SupportedLocale[] = [
  {
    code: "en-US",
    languageCode: "en",
    countryCode: "US",
    displayName: "English (United States)",
    nativeName: "English (United States)",
    direction: "ltr",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "h:mm A",
    numberFormat: "#,##0.00",
    isActive: true,
    isDefault: true,
  },
  {
    code: "en-GB",
    languageCode: "en",
    countryCode: "GB",
    displayName: "English (United Kingdom)",
    nativeName: "English (United Kingdom)",
    direction: "ltr",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm",
    numberFormat: "#,##0.00",
    isActive: true,
    isDefault: false,
  },
  {
    code: "es-ES",
    languageCode: "es",
    countryCode: "ES",
    displayName: "Spanish (Spain)",
    nativeName: "Espanol (Espana)",
    direction: "ltr",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm",
    numberFormat: "#.##0,00",
    isActive: true,
    isDefault: false,
  },
  {
    code: "es-MX",
    languageCode: "es",
    countryCode: "MX",
    displayName: "Spanish (Mexico)",
    nativeName: "Espanol (Mexico)",
    direction: "ltr",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "h:mm a",
    numberFormat: "#,##0.00",
    isActive: true,
    isDefault: false,
  },
  {
    code: "fr-FR",
    languageCode: "fr",
    countryCode: "FR",
    displayName: "French (France)",
    nativeName: "Francais (France)",
    direction: "ltr",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm",
    numberFormat: "# ##0,00",
    isActive: true,
    isDefault: false,
  },
  {
    code: "de-DE",
    languageCode: "de",
    countryCode: "DE",
    displayName: "German (Germany)",
    nativeName: "Deutsch (Deutschland)",
    direction: "ltr",
    dateFormat: "DD.MM.YYYY",
    timeFormat: "HH:mm",
    numberFormat: "#.##0,00",
    isActive: true,
    isDefault: false,
  },
  {
    code: "hi-IN",
    languageCode: "hi",
    countryCode: "IN",
    displayName: "Hindi (India)",
    nativeName: "Hindi (Bharat)",
    direction: "ltr",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "h:mm A",
    numberFormat: "#,##,##0.00",
    isActive: true,
    isDefault: false,
  },
  {
    code: "ar-SA",
    languageCode: "ar",
    countryCode: "SA",
    displayName: "Arabic (Saudi Arabia)",
    nativeName: "Arabic",
    direction: "rtl",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm",
    numberFormat: "#,##0.00",
    isActive: true,
    isDefault: false,
  },
  {
    code: "zh-CN",
    languageCode: "zh",
    countryCode: "CN",
    displayName: "Chinese (Simplified)",
    nativeName: "Simplified Chinese",
    direction: "ltr",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "HH:mm",
    numberFormat: "#,##0.00",
    isActive: true,
    isDefault: false,
  },
  {
    code: "ja-JP",
    languageCode: "ja",
    countryCode: "JP",
    displayName: "Japanese (Japan)",
    nativeName: "Japanese (Japan)",
    direction: "ltr",
    dateFormat: "YYYY/MM/DD",
    timeFormat: "HH:mm",
    numberFormat: "#,##0",
    isActive: true,
    isDefault: false,
  },
];

/** Supported currencies with metadata */
export const SUPPORTED_CURRENCIES: Currency[] = [
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    symbolPosition: "before",
    decimalPlaces: 2,
    decimalSeparator: ".",
    thousandsSeparator: ",",
    isActive: true,
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    symbolPosition: "after",
    decimalPlaces: 2,
    decimalSeparator: ",",
    thousandsSeparator: ".",
    isActive: true,
  },
  {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    symbolPosition: "before",
    decimalPlaces: 2,
    decimalSeparator: ".",
    thousandsSeparator: ",",
    isActive: true,
  },
  {
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    symbolPosition: "before",
    decimalPlaces: 2,
    decimalSeparator: ".",
    thousandsSeparator: ",",
    isActive: true,
  },
  {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    symbolPosition: "before",
    decimalPlaces: 0,
    decimalSeparator: ".",
    thousandsSeparator: ",",
    isActive: true,
  },
  {
    code: "CNY",
    name: "Chinese Yuan",
    symbol: "¥",
    symbolPosition: "before",
    decimalPlaces: 2,
    decimalSeparator: ".",
    thousandsSeparator: ",",
    isActive: true,
  },
  {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "A$",
    symbolPosition: "before",
    decimalPlaces: 2,
    decimalSeparator: ".",
    thousandsSeparator: ",",
    isActive: true,
  },
  {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "C$",
    symbolPosition: "before",
    decimalPlaces: 2,
    decimalSeparator: ".",
    thousandsSeparator: ",",
    isActive: true,
  },
  {
    code: "AED",
    name: "UAE Dirham",
    symbol: "د.إ",
    symbolPosition: "before",
    decimalPlaces: 2,
    decimalSeparator: ".",
    thousandsSeparator: ",",
    isActive: true,
  },
  {
    code: "SAR",
    name: "Saudi Riyal",
    symbol: "﷼",
    symbolPosition: "before",
    decimalPlaces: 2,
    decimalSeparator: ".",
    thousandsSeparator: ",",
    isActive: true,
  },
];

/** Common timezones */
export const COMMON_TIMEZONES: Timezone[] = [
  {
    identifier: "UTC",
    displayName: "Coordinated Universal Time",
    abbreviation: "UTC",
    utcOffset: 0,
    region: "Universal",
    isCommon: true,
  },
  {
    identifier: "America/New_York",
    displayName: "Eastern Time (US & Canada)",
    abbreviation: "EST",
    utcOffset: -300,
    dstOffset: -240,
    region: "Americas",
    isCommon: true,
  },
  {
    identifier: "America/Los_Angeles",
    displayName: "Pacific Time (US & Canada)",
    abbreviation: "PST",
    utcOffset: -480,
    dstOffset: -420,
    region: "Americas",
    isCommon: true,
  },
  {
    identifier: "America/Chicago",
    displayName: "Central Time (US & Canada)",
    abbreviation: "CST",
    utcOffset: -360,
    dstOffset: -300,
    region: "Americas",
    isCommon: true,
  },
  {
    identifier: "Europe/London",
    displayName: "London",
    abbreviation: "GMT",
    utcOffset: 0,
    dstOffset: 60,
    region: "Europe",
    isCommon: true,
  },
  {
    identifier: "Europe/Paris",
    displayName: "Paris, Berlin, Rome",
    abbreviation: "CET",
    utcOffset: 60,
    dstOffset: 120,
    region: "Europe",
    isCommon: true,
  },
  {
    identifier: "Asia/Dubai",
    displayName: "Dubai, Abu Dhabi",
    abbreviation: "GST",
    utcOffset: 240,
    region: "Middle East",
    isCommon: true,
  },
  {
    identifier: "Asia/Kolkata",
    displayName: "India Standard Time",
    abbreviation: "IST",
    utcOffset: 330,
    region: "Asia",
    isCommon: true,
  },
  {
    identifier: "Asia/Shanghai",
    displayName: "Beijing, Shanghai",
    abbreviation: "CST",
    utcOffset: 480,
    region: "Asia",
    isCommon: true,
  },
  {
    identifier: "Asia/Tokyo",
    displayName: "Tokyo, Osaka",
    abbreviation: "JST",
    utcOffset: 540,
    region: "Asia",
    isCommon: true,
  },
  {
    identifier: "Australia/Sydney",
    displayName: "Sydney, Melbourne",
    abbreviation: "AEST",
    utcOffset: 600,
    dstOffset: 660,
    region: "Oceania",
    isCommon: true,
  },
];

/** Get locale by code */
export function getLocaleByCode(code: string): SupportedLocale | undefined {
  return SUPPORTED_LOCALES.find((l) => l.code === code);
}

/** Get currency by code */
export function getCurrencyByCode(code: string): Currency | undefined {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code);
}

/** Get timezone by identifier */
export function getTimezoneByIdentifier(
  identifier: string,
): Timezone | undefined {
  return COMMON_TIMEZONES.find((t) => t.identifier === identifier);
}

/** Check if locale is RTL */
export function isRtlLocale(localeCode: string): boolean {
  const locale = getLocaleByCode(localeCode);
  return locale?.direction === "rtl";
}

/** Get browser's preferred locale */
export function getBrowserLocale(): string {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;

  const browserLang = navigator.language || "en-US";

  // Try exact match first
  const exactMatch = SUPPORTED_LOCALES.find((l) => l.code === browserLang);
  if (exactMatch) return exactMatch.code;

  // Try language-only match
  const langCode = browserLang.split("-")[0];
  const langMatch = SUPPORTED_LOCALES.find((l) => l.languageCode === langCode);
  if (langMatch) return langMatch.code;

  return DEFAULT_LOCALE;
}

/** Get browser's preferred timezone */
export function getBrowserTimezone(): string {
  if (typeof Intl === "undefined") return DEFAULT_TIMEZONE;

  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}
