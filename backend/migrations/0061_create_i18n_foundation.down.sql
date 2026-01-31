-- Rollback i18n foundation

DROP TRIGGER IF EXISTS update_user_locale_preferences_timestamp ON user_locale_preferences;
DROP TRIGGER IF EXISTS update_organization_currencies_timestamp ON organization_currencies;
DROP TRIGGER IF EXISTS update_currencies_timestamp ON currencies;
DROP TRIGGER IF EXISTS update_supported_locales_timestamp ON supported_locales;
DROP TRIGGER IF EXISTS update_translations_timestamp ON translations;

DROP FUNCTION IF EXISTS update_i18n_timestamp();

DROP TABLE IF EXISTS user_locale_preferences;
DROP TABLE IF EXISTS organization_currencies;
DROP TABLE IF EXISTS timezones;
DROP TABLE IF EXISTS exchange_rates;
DROP TABLE IF EXISTS currencies;
DROP TABLE IF EXISTS supported_locales;
DROP TABLE IF EXISTS translations;
