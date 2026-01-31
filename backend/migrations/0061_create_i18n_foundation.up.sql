-- Internationalization (i18n) Foundation
-- Supports worldwide deployment with multi-language, multi-currency, and localization

-- ============================================
-- TRANSLATIONS TABLE (UI Strings)
-- ============================================
CREATE TABLE IF NOT EXISTS translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Locale (BCP 47 format: en-US, es-ES, hi-IN, ar-SA, zh-CN)
    locale_code VARCHAR(10) NOT NULL,

    -- Namespace for grouping (ui, forms, errors, reports, email)
    namespace VARCHAR(50) NOT NULL DEFAULT 'ui',

    -- Translation key and value
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,

    -- Context/description for translators
    context TEXT,

    -- Metadata
    is_reviewed BOOLEAN DEFAULT false,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(locale_code, namespace, key)
);

-- ============================================
-- SUPPORTED LOCALES
-- ============================================
CREATE TABLE IF NOT EXISTS supported_locales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- BCP 47 locale code
    locale_code VARCHAR(10) NOT NULL UNIQUE,

    -- Display names
    display_name VARCHAR(100) NOT NULL, -- "English (United States)"
    native_name VARCHAR(100) NOT NULL,  -- "English (United States)"

    -- Language details
    language_code VARCHAR(5) NOT NULL,  -- "en"
    country_code VARCHAR(5),            -- "US"
    script_code VARCHAR(10),            -- "Latn" (Latin script)

    -- Formatting
    text_direction VARCHAR(3) DEFAULT 'ltr' CHECK (text_direction IN ('ltr', 'rtl')),
    date_format VARCHAR(50) DEFAULT 'YYYY-MM-DD',
    time_format VARCHAR(50) DEFAULT 'HH:mm:ss',
    datetime_format VARCHAR(100) DEFAULT 'YYYY-MM-DD HH:mm:ss',
    number_decimal_separator VARCHAR(5) DEFAULT '.',
    number_thousands_separator VARCHAR(5) DEFAULT ',',

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    completion_percent DECIMAL(5,2) DEFAULT 0, -- Translation completion

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CURRENCIES (ISO 4217)
-- ============================================
CREATE TABLE IF NOT EXISTS currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ISO 4217 currency code
    code VARCHAR(3) NOT NULL UNIQUE, -- USD, EUR, INR, GBP
    numeric_code VARCHAR(3),         -- 840, 978, 356, 826

    -- Display
    name VARCHAR(100) NOT NULL,      -- "US Dollar"
    symbol VARCHAR(10) NOT NULL,     -- "$"
    symbol_native VARCHAR(10),       -- "$"

    -- Formatting
    decimal_places INT DEFAULT 2,
    decimal_separator VARCHAR(5) DEFAULT '.',
    thousands_separator VARCHAR(5) DEFAULT ',',
    symbol_position VARCHAR(10) DEFAULT 'before' CHECK (symbol_position IN ('before', 'after')),
    space_between BOOLEAN DEFAULT false, -- Space between symbol and amount

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXCHANGE RATES
-- ============================================
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Currency pair
    from_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    to_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),

    -- Rate (1 from_currency = rate to_currency)
    rate DECIMAL(18,8) NOT NULL,

    -- Validity
    effective_from DATE NOT NULL,
    effective_to DATE,

    -- Source of rate
    source VARCHAR(50) DEFAULT 'manual', -- manual, ecb, xe, openexchangerates
    source_timestamp TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,

    UNIQUE(from_currency, to_currency, effective_from)
);

-- ============================================
-- ORGANIZATION CURRENCY SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS organization_currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Base currency for accounting (all financial reports in this currency)
    base_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),

    -- Default display currency (can be overridden by user preference)
    default_display_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),

    -- Additional currencies enabled for this organization
    enabled_currencies VARCHAR(3)[] DEFAULT '{}',

    -- Rounding rules
    rounding_mode VARCHAR(20) DEFAULT 'half_up' CHECK (rounding_mode IN (
        'half_up', 'half_down', 'half_even', 'up', 'down', 'ceiling', 'floor'
    )),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id)
);

-- ============================================
-- USER LOCALE PREFERENCES
-- ============================================
-- Add columns to users table if it exists, otherwise create preferences table
CREATE TABLE IF NOT EXISTS user_locale_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,

    -- Language/Locale
    preferred_locale VARCHAR(10) DEFAULT 'en-US',

    -- Timezone (IANA timezone: America/New_York, Asia/Kolkata, Europe/London)
    preferred_timezone VARCHAR(100) DEFAULT 'UTC',

    -- Currency display preference
    preferred_currency VARCHAR(3) REFERENCES currencies(code),

    -- Date/Time format overrides (null = use locale default)
    date_format_override VARCHAR(50),
    time_format_override VARCHAR(50),

    -- Number format preference
    use_locale_number_format BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TIMEZONES (Reference table)
-- ============================================
CREATE TABLE IF NOT EXISTS timezones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- IANA timezone identifier
    tz_identifier VARCHAR(100) NOT NULL UNIQUE, -- America/New_York

    -- Display
    display_name VARCHAR(100) NOT NULL, -- "(UTC-05:00) Eastern Time"
    abbreviation VARCHAR(10),           -- EST/EDT

    -- Offset (minutes from UTC, can change with DST)
    utc_offset_minutes INT NOT NULL,
    observes_dst BOOLEAN DEFAULT false,

    -- Grouping
    region VARCHAR(50), -- Americas, Europe, Asia, etc.
    country_code VARCHAR(2),

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_translations_locale ON translations(locale_code);
CREATE INDEX IF NOT EXISTS idx_translations_namespace ON translations(namespace);
CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(key);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_effective ON exchange_rates(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_timezones_region ON timezones(region);

-- ============================================
-- SEED DEFAULT LOCALES
-- ============================================
INSERT INTO supported_locales (locale_code, display_name, native_name, language_code, country_code, text_direction, date_format, number_decimal_separator, number_thousands_separator, is_default)
VALUES
    ('en-US', 'English (United States)', 'English (United States)', 'en', 'US', 'ltr', 'MM/DD/YYYY', '.', ',', true),
    ('en-GB', 'English (United Kingdom)', 'English (United Kingdom)', 'en', 'GB', 'ltr', 'DD/MM/YYYY', '.', ',', false),
    ('es-ES', 'Spanish (Spain)', 'Español (España)', 'es', 'ES', 'ltr', 'DD/MM/YYYY', ',', '.', false),
    ('fr-FR', 'French (France)', 'Français (France)', 'fr', 'FR', 'ltr', 'DD/MM/YYYY', ',', ' ', false),
    ('de-DE', 'German (Germany)', 'Deutsch (Deutschland)', 'de', 'DE', 'ltr', 'DD.MM.YYYY', ',', '.', false),
    ('hi-IN', 'Hindi (India)', 'हिन्दी (भारत)', 'hi', 'IN', 'ltr', 'DD/MM/YYYY', '.', ',', false),
    ('ar-SA', 'Arabic (Saudi Arabia)', 'العربية (السعودية)', 'ar', 'SA', 'rtl', 'DD/MM/YYYY', '٫', '٬', false),
    ('zh-CN', 'Chinese (Simplified)', '中文（简体）', 'zh', 'CN', 'ltr', 'YYYY-MM-DD', '.', ',', false),
    ('ja-JP', 'Japanese (Japan)', '日本語（日本）', 'ja', 'JP', 'ltr', 'YYYY/MM/DD', '.', ',', false),
    ('pt-BR', 'Portuguese (Brazil)', 'Português (Brasil)', 'pt', 'BR', 'ltr', 'DD/MM/YYYY', ',', '.', false)
ON CONFLICT (locale_code) DO NOTHING;

-- ============================================
-- SEED COMMON CURRENCIES
-- ============================================
INSERT INTO currencies (code, numeric_code, name, symbol, symbol_native, decimal_places, symbol_position)
VALUES
    ('USD', '840', 'US Dollar', '$', '$', 2, 'before'),
    ('EUR', '978', 'Euro', '€', '€', 2, 'before'),
    ('GBP', '826', 'British Pound', '£', '£', 2, 'before'),
    ('INR', '356', 'Indian Rupee', '₹', '₹', 2, 'before'),
    ('AED', '784', 'UAE Dirham', 'AED', 'د.إ', 2, 'before'),
    ('SAR', '682', 'Saudi Riyal', 'SAR', 'ر.س', 2, 'before'),
    ('AUD', '036', 'Australian Dollar', 'A$', '$', 2, 'before'),
    ('CAD', '124', 'Canadian Dollar', 'CA$', '$', 2, 'before'),
    ('JPY', '392', 'Japanese Yen', '¥', '￥', 0, 'before'),
    ('CNY', '156', 'Chinese Yuan', 'CN¥', '¥', 2, 'before'),
    ('CHF', '756', 'Swiss Franc', 'CHF', 'CHF', 2, 'before'),
    ('SGD', '702', 'Singapore Dollar', 'S$', '$', 2, 'before'),
    ('MYR', '458', 'Malaysian Ringgit', 'RM', 'RM', 2, 'before'),
    ('BRL', '986', 'Brazilian Real', 'R$', 'R$', 2, 'before'),
    ('ZAR', '710', 'South African Rand', 'R', 'R', 2, 'before'),
    ('KES', '404', 'Kenyan Shilling', 'KSh', 'KSh', 2, 'before'),
    ('NGN', '566', 'Nigerian Naira', '₦', '₦', 2, 'before'),
    ('EGP', '818', 'Egyptian Pound', 'E£', 'ج.م', 2, 'before'),
    ('PKR', '586', 'Pakistani Rupee', 'Rs', '₨', 2, 'before'),
    ('BDT', '050', 'Bangladeshi Taka', '৳', '৳', 2, 'before')
ON CONFLICT (code) DO NOTHING;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_i18n_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_translations_timestamp
    BEFORE UPDATE ON translations
    FOR EACH ROW EXECUTE FUNCTION update_i18n_timestamp();

CREATE TRIGGER update_supported_locales_timestamp
    BEFORE UPDATE ON supported_locales
    FOR EACH ROW EXECUTE FUNCTION update_i18n_timestamp();

CREATE TRIGGER update_currencies_timestamp
    BEFORE UPDATE ON currencies
    FOR EACH ROW EXECUTE FUNCTION update_i18n_timestamp();

CREATE TRIGGER update_organization_currencies_timestamp
    BEFORE UPDATE ON organization_currencies
    FOR EACH ROW EXECUTE FUNCTION update_i18n_timestamp();

CREATE TRIGGER update_user_locale_preferences_timestamp
    BEFORE UPDATE ON user_locale_preferences
    FOR EACH ROW EXECUTE FUNCTION update_i18n_timestamp();
