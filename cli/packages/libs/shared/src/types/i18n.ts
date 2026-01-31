/**
 * Internationalization Types
 * Multi-language support, localization, and currency management
 */

/** Supported locale */
export interface SupportedLocale {
  code: string; // BCP 47 tag: "en-US", "es-ES", "zh-CN"
  languageCode: string; // ISO 639-1: "en", "es", "zh"
  countryCode?: string; // ISO 3166-1: "US", "ES", "CN"
  displayName: string; // "English (United States)"
  nativeName: string; // "English (United States)"
  direction: "ltr" | "rtl"; // Text direction
  dateFormat: string; // Default date format
  timeFormat: string; // Default time format
  numberFormat: string; // "1,234.56" vs "1.234,56"
  isActive: boolean;
  isDefault: boolean;
}

/** Translation entry */
export interface Translation {
  id: string;
  localeCode: string;
  namespace: string; // "ui", "forms", "errors", "reports"
  key: string;
  value: string;
  pluralForm?: string; // For pluralization
  context?: string; // Additional context for translators
  updatedAt: string;
}

/** Translation namespace */
export type TranslationNamespace =
  | "ui"
  | "forms"
  | "errors"
  | "reports"
  | "medical"
  | "billing"
  | "common";

/** Currency definition */
export interface Currency {
  code: string; // ISO 4217: "USD", "EUR", "INR"
  name: string; // "US Dollar"
  symbol: string; // "$"
  symbolPosition: "before" | "after";
  decimalPlaces: number;
  decimalSeparator: string;
  thousandsSeparator: string;
  isActive: boolean;
}

/** Exchange rate */
export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: string;
  source: "manual" | "api" | "bank";
  expiresAt?: string;
}

/** Organization currency settings */
export interface OrganizationCurrencies {
  organizationId: string;
  baseCurrency: string; // For accounting
  displayCurrency: string; // Default display
  enabledCurrencies: string[];
  autoUpdateRates: boolean;
  rateUpdateFrequency?: string;
}

/** User locale preferences */
export interface UserLocalePreferences {
  userId: string;
  preferredLocale: string;
  preferredTimezone: string;
  preferredCurrency?: string;
  dateFormatOverride?: string;
  timeFormatOverride?: string;
  numberFormatOverride?: string;
  use24HourTime: boolean;
}

/** Timezone definition */
export interface Timezone {
  identifier: string; // IANA: "America/New_York"
  displayName: string; // "Eastern Time (US & Canada)"
  abbreviation: string; // "EST"
  utcOffset: number; // -300 (minutes)
  dstOffset?: number; // -240 during DST
  region: string; // "Americas"
  isCommon: boolean;
}

/** Address format (varies by country) */
export interface AddressFormat {
  countryCode: string;
  format: string[]; // Field order
  requiredFields: string[];
  postalCodeLabel: string; // "ZIP Code", "Postal Code", "PIN Code"
  postalCodeFormat?: string; // Regex
  stateLabel: string; // "State", "Province", "Prefecture"
  hasStates: boolean;
}

/** Name format (varies by culture) */
export interface NameFormat {
  localeCode: string;
  order: "given-family" | "family-given"; // Western vs Eastern
  middleNamePosition?: "after_given" | "after_family" | "none";
  formalFormat: string; // "{title} {family}, {given}"
  informalFormat: string; // "{given} {family}"
  sortBy: "family" | "given";
}

/** Formatted value with locale info */
export interface LocalizedValue<T> {
  value: T;
  formatted: string;
  locale: string;
}

/** Date/time display options */
export interface DateTimeDisplayOptions {
  showDate: boolean;
  showTime: boolean;
  showTimezone: boolean;
  dateStyle?: "full" | "long" | "medium" | "short";
  timeStyle?: "full" | "long" | "medium" | "short";
  use24Hour?: boolean;
}

/** Currency display options */
export interface CurrencyDisplayOptions {
  showSymbol: boolean;
  showCode: boolean;
  showDecimals: boolean;
  style: "symbol" | "code" | "name";
}

/** Locale search parameters */
export interface LocaleSearchParams {
  languageCode?: string;
  countryCode?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

/** Currency search parameters */
export interface CurrencySearchParams {
  code?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

/** Timezone search parameters */
export interface TimezoneSearchParams {
  region?: string;
  isCommon?: boolean;
  page?: number;
  pageSize?: number;
}

/** Locale list response */
export interface LocaleListResponse {
  data: SupportedLocale[];
  total: number;
  page: number;
  pageSize: number;
}

/** Currency list response */
export interface CurrencyListResponse {
  data: Currency[];
  total: number;
  page: number;
  pageSize: number;
}

/** Exchange rate list response */
export interface ExchangeRateListResponse {
  data: ExchangeRate[];
  total: number;
  page: number;
  pageSize: number;
}

/** Request to convert currency */
export interface CurrencyConversionRequest {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  date?: string; // Use rate from this date
}

/** Currency conversion result */
export interface CurrencyConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  targetCurrency: string;
  exchangeRate: number;
  rateDate: string;
}

/** Translation bundle (for frontend) */
export interface TranslationBundle {
  locale: string;
  namespace: string;
  translations: Record<string, string>;
  loadedAt: string;
}
