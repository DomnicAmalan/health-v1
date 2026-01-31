/**
 * Internationalization Formatters
 * Locale-aware formatting for dates, numbers, and currencies
 */

import type { CurrencyDisplayOptions, DateTimeDisplayOptions } from "../types/i18n";
import { getCurrencyByCode, DEFAULT_LOCALE, DEFAULT_CURRENCY } from "./config";

/**
 * Format a number according to locale
 */
export function formatNumber(
  value: number,
  locale: string = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return value.toString();
  }
}

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
  options?: CurrencyDisplayOptions,
): string {
  const currency = getCurrencyByCode(currencyCode);

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: options?.style === "name" ? "decimal" : "currency",
      currency: currencyCode,
      currencyDisplay: options?.style === "code" ? "code" : "symbol",
      minimumFractionDigits: options?.showDecimals === false ? 0 : currency?.decimalPlaces ?? 2,
      maximumFractionDigits: options?.showDecimals === false ? 0 : currency?.decimalPlaces ?? 2,
    });

    return formatter.format(amount);
  } catch {
    // Fallback formatting
    const symbol = currency?.symbol ?? currencyCode;
    const formatted = amount.toFixed(currency?.decimalPlaces ?? 2);
    return currency?.symbolPosition === "after"
      ? `${formatted} ${symbol}`
      : `${symbol}${formatted}`;
  }
}

/**
 * Format a date according to locale
 */
export function formatDate(
  date: Date | string,
  locale: string = DEFAULT_LOCALE,
  options?: DateTimeDisplayOptions,
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (Number.isNaN(dateObj.getTime())) {
    return "";
  }

  try {
    const intlOptions: Intl.DateTimeFormatOptions = {};

    if (options?.showDate !== false) {
      intlOptions.dateStyle = options?.dateStyle ?? "medium";
    }

    if (options?.showTime) {
      intlOptions.timeStyle = options?.timeStyle ?? "short";
      if (options?.use24Hour !== undefined) {
        intlOptions.hour12 = !options.use24Hour;
      }
    }

    if (options?.showTimezone) {
      intlOptions.timeZoneName = "short";
    }

    return new Intl.DateTimeFormat(locale, intlOptions).format(dateObj);
  } catch {
    return dateObj.toLocaleDateString();
  }
}

/**
 * Format a time according to locale
 */
export function formatTime(
  date: Date | string,
  locale: string = DEFAULT_LOCALE,
  use24Hour?: boolean,
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (Number.isNaN(dateObj.getTime())) {
    return "";
  }

  try {
    const options: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: use24Hour === undefined ? undefined : !use24Hour,
    };

    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  } catch {
    return dateObj.toLocaleTimeString();
  }
}

/**
 * Format relative time (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeTime(
  date: Date | string,
  locale: string = DEFAULT_LOCALE,
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (Number.isNaN(dateObj.getTime())) {
    return "";
  }

  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);
  const diffWeeks = Math.round(diffDays / 7);
  const diffMonths = Math.round(diffDays / 30);
  const diffYears = Math.round(diffDays / 365);

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

    if (Math.abs(diffSecs) < 60) {
      return rtf.format(diffSecs, "second");
    }
    if (Math.abs(diffMins) < 60) {
      return rtf.format(diffMins, "minute");
    }
    if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, "hour");
    }
    if (Math.abs(diffDays) < 7) {
      return rtf.format(diffDays, "day");
    }
    if (Math.abs(diffWeeks) < 4) {
      return rtf.format(diffWeeks, "week");
    }
    if (Math.abs(diffMonths) < 12) {
      return rtf.format(diffMonths, "month");
    }
    return rtf.format(diffYears, "year");
  } catch {
    // Fallback for browsers without RelativeTimeFormat
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "tomorrow";
    if (diffDays === -1) return "yesterday";
    return formatDate(dateObj, locale);
  }
}

/**
 * Format a percentage
 */
export function formatPercent(
  value: number,
  locale: string = DEFAULT_LOCALE,
  decimals: number = 2,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value / 100);
  } catch {
    return `${value.toFixed(decimals)}%`;
  }
}

/**
 * Format a phone number (basic international format)
 */
export function formatPhoneNumber(
  phone: string,
  countryCode?: string,
): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 0) return "";

  // If country code provided, add +
  if (countryCode) {
    return `+${digits}`;
  }

  // Basic US format
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // International format with +
  if (digits.length > 10) {
    return `+${digits}`;
  }

  return digits;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(
  bytes: number,
  locale: string = DEFAULT_LOCALE,
): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  const formatted = formatNumber(size, locale, {
    maximumFractionDigits: unitIndex === 0 ? 0 : 2,
  });

  return `${formatted} ${units[unitIndex]}`;
}

/**
 * Parse a localized number string to a number
 */
export function parseLocalizedNumber(
  value: string,
  locale: string = DEFAULT_LOCALE,
): number | null {
  if (!value) return null;

  try {
    // Get the locale's decimal separator
    const parts = new Intl.NumberFormat(locale).formatToParts(1234.5);
    const decimalPart = parts.find((p) => p.type === "decimal");
    const groupPart = parts.find((p) => p.type === "group");

    let normalized = value;

    // Remove group separator
    if (groupPart) {
      normalized = normalized.split(groupPart.value).join("");
    }

    // Replace decimal separator with dot
    if (decimalPart && decimalPart.value !== ".") {
      normalized = normalized.replace(decimalPart.value, ".");
    }

    // Remove any remaining non-numeric characters except . and -
    normalized = normalized.replace(/[^\d.-]/g, "");

    const result = Number.parseFloat(normalized);
    return Number.isNaN(result) ? null : result;
  } catch {
    const result = Number.parseFloat(value);
    return Number.isNaN(result) ? null : result;
  }
}

/**
 * Get the currency symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  const currency = getCurrencyByCode(currencyCode);
  return currency?.symbol ?? currencyCode;
}

/**
 * Convert amount between currencies
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate: number,
): number {
  if (fromCurrency === toCurrency) return amount;
  return amount * exchangeRate;
}
