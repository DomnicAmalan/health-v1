//! Internationalization (i18n) Module
//!
//! Provides localization support for the healthcare system:
//! - Accept-Language header parsing
//! - Localized error messages
//! - Date/time formatting utilities
//! - Currency formatting utilities

mod locale;
mod messages;
mod formatters;

pub use locale::{
    Locale, LocaleInfo, AcceptLanguage, parse_accept_language,
    DEFAULT_LOCALE, SUPPORTED_LOCALES,
};
pub use messages::{
    LocalizedMessages, ErrorMessage, get_localized_error,
};
pub use formatters::{
    format_date, format_datetime, format_currency, format_number,
};
