//! Locale handling and Accept-Language header parsing

use std::str::FromStr;

/// Default locale for the system
pub const DEFAULT_LOCALE: &str = "en-US";

/// Supported locales
pub static SUPPORTED_LOCALES: &[&str] = &[
    "en-US", "en-GB", "es-ES", "es-MX", "fr-FR", "de-DE",
    "hi-IN", "ar-SA", "zh-CN", "ja-JP", "pt-BR", "it-IT",
];

/// Locale identifier
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Locale {
    /// Full locale code (e.g., "en-US")
    pub code: String,
    /// Language code (e.g., "en")
    pub language: String,
    /// Country/region code (e.g., "US")
    pub region: Option<String>,
}

impl Locale {
    /// Create a new locale from a code
    pub fn new(code: &str) -> Self {
        let parts: Vec<&str> = code.split('-').collect();
        Self {
            code: code.to_string(),
            language: parts.first().unwrap_or(&"en").to_lowercase(),
            region: parts.get(1).map(|r| r.to_uppercase()),
        }
    }

    /// Check if this locale is supported
    pub fn is_supported(&self) -> bool {
        SUPPORTED_LOCALES.contains(&self.code.as_str())
    }

    /// Get the best matching supported locale
    pub fn best_match(&self) -> &'static str {
        // Try exact match first
        if let Some(exact) = SUPPORTED_LOCALES.iter().find(|&&l| l == self.code) {
            return exact;
        }

        // Try language-only match
        if let Some(lang_match) = SUPPORTED_LOCALES
            .iter()
            .find(|&&l| l.starts_with(&self.language))
        {
            return lang_match;
        }

        // Fall back to default
        DEFAULT_LOCALE
    }

    /// Check if this locale is RTL (right-to-left)
    pub fn is_rtl(&self) -> bool {
        matches!(self.language.as_str(), "ar" | "he" | "fa" | "ur")
    }
}

impl Default for Locale {
    fn default() -> Self {
        Self::new(DEFAULT_LOCALE)
    }
}

impl FromStr for Locale {
    type Err = std::convert::Infallible;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self::new(s))
    }
}

/// Locale information with metadata
#[derive(Debug, Clone)]
pub struct LocaleInfo {
    pub code: &'static str,
    pub name: &'static str,
    pub native_name: &'static str,
    pub direction: &'static str,
    pub date_format: &'static str,
    pub time_format: &'static str,
    pub currency: &'static str,
}

/// Get locale info for a locale code
pub fn get_locale_info(code: &str) -> Option<LocaleInfo> {
    match code {
        "en-US" => Some(LocaleInfo {
            code: "en-US",
            name: "English (United States)",
            native_name: "English (United States)",
            direction: "ltr",
            date_format: "MM/DD/YYYY",
            time_format: "h:mm A",
            currency: "USD",
        }),
        "en-GB" => Some(LocaleInfo {
            code: "en-GB",
            name: "English (United Kingdom)",
            native_name: "English (United Kingdom)",
            direction: "ltr",
            date_format: "DD/MM/YYYY",
            time_format: "HH:mm",
            currency: "GBP",
        }),
        "es-ES" => Some(LocaleInfo {
            code: "es-ES",
            name: "Spanish (Spain)",
            native_name: "Espanol (Espana)",
            direction: "ltr",
            date_format: "DD/MM/YYYY",
            time_format: "HH:mm",
            currency: "EUR",
        }),
        "fr-FR" => Some(LocaleInfo {
            code: "fr-FR",
            name: "French (France)",
            native_name: "Francais (France)",
            direction: "ltr",
            date_format: "DD/MM/YYYY",
            time_format: "HH:mm",
            currency: "EUR",
        }),
        "de-DE" => Some(LocaleInfo {
            code: "de-DE",
            name: "German (Germany)",
            native_name: "Deutsch (Deutschland)",
            direction: "ltr",
            date_format: "DD.MM.YYYY",
            time_format: "HH:mm",
            currency: "EUR",
        }),
        "hi-IN" => Some(LocaleInfo {
            code: "hi-IN",
            name: "Hindi (India)",
            native_name: "Hindi (Bharat)",
            direction: "ltr",
            date_format: "DD/MM/YYYY",
            time_format: "h:mm A",
            currency: "INR",
        }),
        "ar-SA" => Some(LocaleInfo {
            code: "ar-SA",
            name: "Arabic (Saudi Arabia)",
            native_name: "Arabic",
            direction: "rtl",
            date_format: "DD/MM/YYYY",
            time_format: "HH:mm",
            currency: "SAR",
        }),
        "zh-CN" => Some(LocaleInfo {
            code: "zh-CN",
            name: "Chinese (Simplified)",
            native_name: "Simplified Chinese",
            direction: "ltr",
            date_format: "YYYY-MM-DD",
            time_format: "HH:mm",
            currency: "CNY",
        }),
        "ja-JP" => Some(LocaleInfo {
            code: "ja-JP",
            name: "Japanese (Japan)",
            native_name: "Japanese",
            direction: "ltr",
            date_format: "YYYY/MM/DD",
            time_format: "HH:mm",
            currency: "JPY",
        }),
        _ => None,
    }
}

/// Parsed Accept-Language header entry
#[derive(Debug, Clone)]
pub struct AcceptLanguage {
    pub locale: Locale,
    pub quality: f32,
}

impl AcceptLanguage {
    pub fn new(locale: Locale, quality: f32) -> Self {
        Self { locale, quality }
    }
}

/// Parse the Accept-Language header value
///
/// Example: "en-US,en;q=0.9,es;q=0.8"
///
/// Returns a list of locales sorted by quality (highest first)
pub fn parse_accept_language(header: &str) -> Vec<AcceptLanguage> {
    let mut locales: Vec<AcceptLanguage> = header
        .split(',')
        .filter_map(|part| {
            let part = part.trim();
            if part.is_empty() {
                return None;
            }

            let mut parts = part.split(';');
            let locale_str = parts.next()?.trim();

            // Parse quality value (default is 1.0)
            let quality = parts
                .find_map(|p| {
                    let p = p.trim();
                    if p.starts_with("q=") {
                        p[2..].parse::<f32>().ok()
                    } else {
                        None
                    }
                })
                .unwrap_or(1.0);

            Some(AcceptLanguage::new(Locale::new(locale_str), quality))
        })
        .collect();

    // Sort by quality (descending)
    locales.sort_by(|a, b| b.quality.partial_cmp(&a.quality).unwrap_or(std::cmp::Ordering::Equal));

    locales
}

/// Get the best locale from Accept-Language header
pub fn get_preferred_locale(accept_language: &str) -> Locale {
    let locales = parse_accept_language(accept_language);

    // Find first supported locale
    for al in locales {
        let best = al.locale.best_match();
        if best != DEFAULT_LOCALE || al.locale.language == "en" {
            return Locale::new(best);
        }
    }

    Locale::default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_accept_language() {
        let header = "en-US,en;q=0.9,es;q=0.8";
        let locales = parse_accept_language(header);

        assert_eq!(locales.len(), 3);
        assert_eq!(locales[0].locale.code, "en-US");
        assert_eq!(locales[0].quality, 1.0);
        assert_eq!(locales[1].locale.code, "en");
        assert_eq!(locales[1].quality, 0.9);
        assert_eq!(locales[2].locale.code, "es");
        assert_eq!(locales[2].quality, 0.8);
    }

    #[test]
    fn test_locale_best_match() {
        let locale = Locale::new("es-MX");
        assert_eq!(locale.best_match(), "es-MX");

        let locale = Locale::new("es-AR");
        assert_eq!(locale.best_match(), "es-ES"); // Falls back to first Spanish

        let locale = Locale::new("xx-XX");
        assert_eq!(locale.best_match(), DEFAULT_LOCALE);
    }

    #[test]
    fn test_locale_rtl() {
        assert!(Locale::new("ar-SA").is_rtl());
        assert!(Locale::new("he-IL").is_rtl());
        assert!(!Locale::new("en-US").is_rtl());
    }
}
