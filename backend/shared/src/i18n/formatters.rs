//! Locale-aware formatting utilities

use chrono::{DateTime, NaiveDate, TimeZone};

/// Format a date according to locale
pub fn format_date(date: NaiveDate, locale: &str) -> String {
    let format = match locale {
        "en-US" => "%m/%d/%Y",
        "en-GB" | "es-ES" | "es-MX" | "fr-FR" | "hi-IN" | "ar-SA" => "%d/%m/%Y",
        "de-DE" => "%d.%m.%Y",
        "zh-CN" | "ja-JP" => "%Y-%m-%d",
        _ => "%Y-%m-%d", // ISO format as fallback
    };
    date.format(format).to_string()
}

/// Format a datetime according to locale
pub fn format_datetime<Tz: TimeZone>(
    datetime: DateTime<Tz>,
    locale: &str,
    include_time: bool,
) -> String
where
    Tz::Offset: std::fmt::Display,
{
    let date_format = match locale {
        "en-US" => "%m/%d/%Y",
        "en-GB" | "es-ES" | "es-MX" | "fr-FR" | "hi-IN" | "ar-SA" => "%d/%m/%Y",
        "de-DE" => "%d.%m.%Y",
        "zh-CN" | "ja-JP" => "%Y-%m-%d",
        _ => "%Y-%m-%d",
    };

    let time_format = match locale {
        "en-US" | "hi-IN" => "%I:%M %p",
        _ => "%H:%M",
    };

    if include_time {
        datetime.format(&format!("{} {}", date_format, time_format)).to_string()
    } else {
        datetime.format(date_format).to_string()
    }
}

/// Currency info for formatting
#[derive(Debug, Clone)]
pub struct CurrencyInfo {
    pub code: String,
    pub symbol: String,
    pub decimal_places: u8,
    pub symbol_before: bool,
    pub decimal_separator: char,
    pub thousands_separator: char,
}

/// Get currency info by code
fn get_currency_info(code: &str) -> CurrencyInfo {
    match code.to_uppercase().as_str() {
        "USD" => CurrencyInfo {
            code: "USD".to_string(),
            symbol: "$".to_string(),
            decimal_places: 2,
            symbol_before: true,
            decimal_separator: '.',
            thousands_separator: ',',
        },
        "EUR" => CurrencyInfo {
            code: "EUR".to_string(),
            symbol: "€".to_string(),
            decimal_places: 2,
            symbol_before: false,
            decimal_separator: ',',
            thousands_separator: '.',
        },
        "GBP" => CurrencyInfo {
            code: "GBP".to_string(),
            symbol: "£".to_string(),
            decimal_places: 2,
            symbol_before: true,
            decimal_separator: '.',
            thousands_separator: ',',
        },
        "INR" => CurrencyInfo {
            code: "INR".to_string(),
            symbol: "₹".to_string(),
            decimal_places: 2,
            symbol_before: true,
            decimal_separator: '.',
            thousands_separator: ',',
        },
        "JPY" => CurrencyInfo {
            code: "JPY".to_string(),
            symbol: "¥".to_string(),
            decimal_places: 0,
            symbol_before: true,
            decimal_separator: '.',
            thousands_separator: ',',
        },
        "CNY" => CurrencyInfo {
            code: "CNY".to_string(),
            symbol: "¥".to_string(),
            decimal_places: 2,
            symbol_before: true,
            decimal_separator: '.',
            thousands_separator: ',',
        },
        "AED" => CurrencyInfo {
            code: "AED".to_string(),
            symbol: "د.إ".to_string(),
            decimal_places: 2,
            symbol_before: true,
            decimal_separator: '.',
            thousands_separator: ',',
        },
        "SAR" => CurrencyInfo {
            code: "SAR".to_string(),
            symbol: "﷼".to_string(),
            decimal_places: 2,
            symbol_before: true,
            decimal_separator: '.',
            thousands_separator: ',',
        },
        "AUD" => CurrencyInfo {
            code: "AUD".to_string(),
            symbol: "A$".to_string(),
            decimal_places: 2,
            symbol_before: true,
            decimal_separator: '.',
            thousands_separator: ',',
        },
        "CAD" => CurrencyInfo {
            code: "CAD".to_string(),
            symbol: "C$".to_string(),
            decimal_places: 2,
            symbol_before: true,
            decimal_separator: '.',
            thousands_separator: ',',
        },
        _ => CurrencyInfo {
            code: code.to_uppercase(),
            symbol: code.to_uppercase(),
            decimal_places: 2,
            symbol_before: true,
            decimal_separator: '.',
            thousands_separator: ',',
        },
    }
}

/// Format a currency amount
pub fn format_currency(amount: f64, currency_code: &str, _locale: &str) -> String {
    let info = get_currency_info(currency_code);

    // Format the number part
    let formatted_number = format_number_with_separators(
        amount,
        info.decimal_places,
        info.decimal_separator,
        info.thousands_separator,
    );

    // Combine with symbol
    if info.symbol_before {
        format!("{}{}", info.symbol, formatted_number)
    } else {
        format!("{} {}", formatted_number, info.symbol)
    }
}

/// Format a number with locale-aware separators
pub fn format_number(value: f64, locale: &str, decimal_places: u8) -> String {
    let (decimal_sep, thousands_sep) = match locale {
        "de-DE" | "es-ES" | "fr-FR" | "it-IT" | "pt-BR" => (',', '.'),
        _ => ('.', ','),
    };

    format_number_with_separators(value, decimal_places, decimal_sep, thousands_sep)
}

/// Format a number with custom separators
fn format_number_with_separators(
    value: f64,
    decimal_places: u8,
    decimal_separator: char,
    thousands_separator: char,
) -> String {
    let rounded = if decimal_places > 0 {
        let multiplier = 10_f64.powi(decimal_places as i32);
        (value * multiplier).round() / multiplier
    } else {
        value.round()
    };

    let abs_value = rounded.abs();
    let is_negative = value < 0.0;

    // Split into integer and decimal parts
    let integer_part = abs_value.trunc() as i64;
    let decimal_part = if decimal_places > 0 {
        let frac = abs_value.fract();
        let multiplier = 10_i64.pow(decimal_places as u32);
        ((frac * multiplier as f64).round() as i64).abs()
    } else {
        0
    };

    // Format integer part with thousands separators
    let integer_str = integer_part.to_string();
    let mut formatted_integer = String::new();
    for (i, c) in integer_str.chars().rev().enumerate() {
        if i > 0 && i % 3 == 0 {
            formatted_integer.push(thousands_separator);
        }
        formatted_integer.push(c);
    }
    let formatted_integer: String = formatted_integer.chars().rev().collect();

    // Combine parts
    let result = if decimal_places > 0 {
        format!(
            "{}{}{}",
            formatted_integer,
            decimal_separator,
            format!("{:0>width$}", decimal_part, width = decimal_places as usize)
        )
    } else {
        formatted_integer
    };

    if is_negative {
        format!("-{}", result)
    } else {
        result
    }
}

/// Format a percentage
pub fn format_percent(value: f64, locale: &str, decimal_places: u8) -> String {
    format!("{}%", format_number(value, locale, decimal_places))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;

    #[test]
    fn test_format_date() {
        let date = NaiveDate::from_ymd_opt(2024, 12, 25).unwrap();

        assert_eq!(format_date(date, "en-US"), "12/25/2024");
        assert_eq!(format_date(date, "en-GB"), "25/12/2024");
        assert_eq!(format_date(date, "de-DE"), "25.12.2024");
        assert_eq!(format_date(date, "ja-JP"), "2024-12-25");
    }

    #[test]
    fn test_format_currency() {
        assert_eq!(format_currency(1234.56, "USD", "en-US"), "$1,234.56");
        assert_eq!(format_currency(1234.56, "EUR", "de-DE"), "1.234,56 €");
        assert_eq!(format_currency(1234.56, "GBP", "en-GB"), "£1,234.56");
        assert_eq!(format_currency(1234.0, "JPY", "ja-JP"), "¥1,234");
    }

    #[test]
    fn test_format_number() {
        assert_eq!(format_number(1234.567, "en-US", 2), "1,234.57");
        assert_eq!(format_number(1234.567, "de-DE", 2), "1.234,57");
        assert_eq!(format_number(-1234.56, "en-US", 2), "-1,234.56");
    }
}
