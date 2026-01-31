-- Dynamic Tax System
-- Supports any country's tax structure (GST, VAT, Sales Tax, etc.)
-- Replaces hardcoded India-specific CGST/SGST/IGST columns

-- ============================================
-- TAX SYSTEM TYPES
-- ============================================
DO $$ BEGIN
    CREATE TYPE tax_system_type AS ENUM (
        'gst',          -- Goods and Services Tax (India, Australia, Singapore)
        'vat',          -- Value Added Tax (EU, UK, UAE, Saudi)
        'sales_tax',    -- Sales Tax (USA - state/county/city)
        'consumption',  -- Consumption Tax (Japan)
        'hst',          -- Harmonized Sales Tax (Canada)
        'none'          -- No tax / Healthcare exempt
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TAX JURISDICTIONS
-- Defines tax rules for each country/region
-- ============================================
CREATE TABLE IF NOT EXISTS tax_jurisdictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Location identification
    country_code VARCHAR(2) NOT NULL,      -- ISO 3166-1 alpha-2 (US, IN, GB)
    region_code VARCHAR(10),               -- State/Province code (optional)
    city_code VARCHAR(50),                 -- City code (for US city taxes)

    -- Tax system info
    tax_system tax_system_type NOT NULL,
    jurisdiction_name VARCHAR(200) NOT NULL,  -- "United States - California"
    tax_authority VARCHAR(200),               -- "California Department of Tax and Fee Administration"

    -- Currency for this jurisdiction
    default_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),

    -- Healthcare specific
    healthcare_exempt BOOLEAN DEFAULT false,  -- Many countries exempt healthcare
    healthcare_exempt_categories TEXT[],      -- Specific categories that are exempt

    -- Tax identification fields required in this jurisdiction
    tax_id_label VARCHAR(50),                -- "GST Number", "VAT Number", "EIN"
    tax_id_format VARCHAR(100),              -- Regex for validation
    tax_id_required BOOLEAN DEFAULT false,

    -- Invoice requirements
    invoice_prefix VARCHAR(20),
    invoice_number_format VARCHAR(100),
    requires_tax_breakdown BOOLEAN DEFAULT true,

    -- Status
    is_active BOOLEAN DEFAULT true,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(country_code, region_code, city_code, effective_from)
);

-- ============================================
-- TAX COMPONENTS
-- Dynamic tax components (replaces hardcoded CGST/SGST/IGST columns)
-- ============================================
CREATE TABLE IF NOT EXISTS tax_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jurisdiction_id UUID NOT NULL REFERENCES tax_jurisdictions(id) ON DELETE CASCADE,

    -- Component identification
    component_code VARCHAR(50) NOT NULL,     -- "CGST", "SGST", "VAT", "STATE_TAX"
    component_name VARCHAR(100) NOT NULL,    -- "Central GST", "State GST", "Value Added Tax"
    component_name_local VARCHAR(100),       -- Localized name

    -- Description
    description TEXT,

    -- Tax rate
    rate_percent DECIMAL(5,2) NOT NULL,      -- 9.00, 18.00, 20.00

    -- What this tax applies to
    applies_to VARCHAR(20) DEFAULT 'all' CHECK (applies_to IN (
        'all',           -- All items
        'goods',         -- Physical goods only
        'services',      -- Services only
        'healthcare',    -- Healthcare specific
        'pharmacy',      -- Pharmacy/drugs only
        'equipment'      -- Medical equipment
    )),

    -- Calculation order (for compound taxes)
    calculation_order INT DEFAULT 1,
    is_compound BOOLEAN DEFAULT false,       -- Calculate on base + previous taxes?

    -- Reporting
    report_line_code VARCHAR(50),            -- Code for tax return reporting
    report_line_name VARCHAR(100),

    -- Status
    is_active BOOLEAN DEFAULT true,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(jurisdiction_id, component_code, effective_from)
);

-- ============================================
-- INVOICE TAX LINES
-- Dynamic tax breakdown per invoice item
-- Replaces hardcoded cgst_amount, sgst_amount, igst_amount columns
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_tax_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    invoice_item_id UUID REFERENCES invoice_items(id) ON DELETE CASCADE,
    tax_component_id UUID NOT NULL REFERENCES tax_components(id),

    -- Amounts
    taxable_amount DECIMAL(12,2) NOT NULL,   -- Base amount for tax calculation
    tax_rate DECIMAL(5,2) NOT NULL,          -- Rate applied (snapshot)
    tax_amount DECIMAL(12,2) NOT NULL,       -- Calculated tax

    -- Component info (denormalized for invoice record)
    component_code VARCHAR(50) NOT NULL,
    component_name VARCHAR(100) NOT NULL,

    -- For reporting
    is_exempt BOOLEAN DEFAULT false,
    exemption_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORGANIZATION TAX SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS organization_tax_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Primary jurisdiction
    primary_jurisdiction_id UUID NOT NULL REFERENCES tax_jurisdictions(id),

    -- Tax identification
    tax_registration_number VARCHAR(50),     -- GST number, VAT number, etc.
    tax_registration_name VARCHAR(200),
    tax_registration_address TEXT,

    -- Inter-jurisdiction settings (for multi-state/country operations)
    enable_inter_jurisdiction BOOLEAN DEFAULT false,

    -- Default tax behavior
    default_taxable BOOLEAN DEFAULT true,
    include_tax_in_price BOOLEAN DEFAULT false,  -- Price inclusive of tax?

    -- Rounding
    tax_rounding_mode VARCHAR(20) DEFAULT 'half_up',
    round_at VARCHAR(20) DEFAULT 'line' CHECK (round_at IN ('line', 'total')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tax_jurisdictions_country ON tax_jurisdictions(country_code);
CREATE INDEX IF NOT EXISTS idx_tax_jurisdictions_region ON tax_jurisdictions(country_code, region_code);
CREATE INDEX IF NOT EXISTS idx_tax_components_jurisdiction ON tax_components(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_tax_components_code ON tax_components(component_code);
CREATE INDEX IF NOT EXISTS idx_invoice_tax_lines_invoice ON invoice_tax_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_tax_lines_item ON invoice_tax_lines(invoice_item_id);

-- ============================================
-- SEED TAX JURISDICTIONS FOR COMMON COUNTRIES
-- ============================================

-- India (GST)
INSERT INTO tax_jurisdictions (country_code, region_code, tax_system, jurisdiction_name, tax_authority, default_currency, healthcare_exempt, tax_id_label, tax_id_format)
VALUES
    ('IN', NULL, 'gst', 'India (Central)', 'Central Board of Indirect Taxes', 'INR', false, 'GSTIN', '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')
ON CONFLICT DO NOTHING;

-- Get India jurisdiction ID for components
DO $$
DECLARE
    india_id UUID;
BEGIN
    SELECT id INTO india_id FROM tax_jurisdictions WHERE country_code = 'IN' AND region_code IS NULL LIMIT 1;

    IF india_id IS NOT NULL THEN
        -- India GST Components
        INSERT INTO tax_components (jurisdiction_id, component_code, component_name, rate_percent, applies_to, description)
        VALUES
            (india_id, 'CGST_9', 'Central GST 9%', 9.00, 'all', 'Central GST component at 9%'),
            (india_id, 'SGST_9', 'State GST 9%', 9.00, 'all', 'State GST component at 9%'),
            (india_id, 'IGST_18', 'Integrated GST 18%', 18.00, 'all', 'Inter-state GST at 18%'),
            (india_id, 'CGST_6', 'Central GST 6%', 6.00, 'all', 'Central GST component at 6%'),
            (india_id, 'SGST_6', 'State GST 6%', 6.00, 'all', 'State GST component at 6%'),
            (india_id, 'IGST_12', 'Integrated GST 12%', 12.00, 'all', 'Inter-state GST at 12%'),
            (india_id, 'CGST_2.5', 'Central GST 2.5%', 2.50, 'all', 'Central GST component at 2.5%'),
            (india_id, 'SGST_2.5', 'State GST 2.5%', 2.50, 'all', 'State GST component at 2.5%'),
            (india_id, 'IGST_5', 'Integrated GST 5%', 5.00, 'all', 'Inter-state GST at 5%'),
            (india_id, 'EXEMPT', 'GST Exempt', 0.00, 'healthcare', 'GST exempt healthcare services')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- USA (Sales Tax - varies by state)
INSERT INTO tax_jurisdictions (country_code, region_code, tax_system, jurisdiction_name, tax_authority, default_currency, healthcare_exempt, tax_id_label)
VALUES
    ('US', 'CA', 'sales_tax', 'United States - California', 'California CDTFA', 'USD', true, 'EIN'),
    ('US', 'TX', 'sales_tax', 'United States - Texas', 'Texas Comptroller', 'USD', true, 'EIN'),
    ('US', 'NY', 'sales_tax', 'United States - New York', 'NYS Tax Department', 'USD', true, 'EIN'),
    ('US', 'FL', 'sales_tax', 'United States - Florida', 'Florida DOR', 'USD', true, 'EIN')
ON CONFLICT DO NOTHING;

-- UK (VAT)
INSERT INTO tax_jurisdictions (country_code, region_code, tax_system, jurisdiction_name, tax_authority, default_currency, healthcare_exempt, tax_id_label, tax_id_format)
VALUES
    ('GB', NULL, 'vat', 'United Kingdom', 'HMRC', 'GBP', true, 'VAT Number', '^GB[0-9]{9}$')
ON CONFLICT DO NOTHING;

-- EU Countries (VAT)
INSERT INTO tax_jurisdictions (country_code, region_code, tax_system, jurisdiction_name, tax_authority, default_currency, healthcare_exempt, tax_id_label)
VALUES
    ('DE', NULL, 'vat', 'Germany', 'Bundeszentralamt für Steuern', 'EUR', true, 'USt-IdNr'),
    ('FR', NULL, 'vat', 'France', 'Direction générale des finances publiques', 'EUR', true, 'TVA'),
    ('IT', NULL, 'vat', 'Italy', 'Agenzia delle Entrate', 'EUR', true, 'Partita IVA'),
    ('ES', NULL, 'vat', 'Spain', 'Agencia Tributaria', 'EUR', true, 'NIF/CIF'),
    ('NL', NULL, 'vat', 'Netherlands', 'Belastingdienst', 'EUR', true, 'BTW')
ON CONFLICT DO NOTHING;

-- Middle East (VAT)
INSERT INTO tax_jurisdictions (country_code, region_code, tax_system, jurisdiction_name, tax_authority, default_currency, healthcare_exempt, tax_id_label)
VALUES
    ('AE', NULL, 'vat', 'United Arab Emirates', 'Federal Tax Authority', 'AED', false, 'TRN'),
    ('SA', NULL, 'vat', 'Saudi Arabia', 'ZATCA', 'SAR', false, 'VAT Number')
ON CONFLICT DO NOTHING;

-- Australia (GST)
INSERT INTO tax_jurisdictions (country_code, region_code, tax_system, jurisdiction_name, tax_authority, default_currency, healthcare_exempt, tax_id_label)
VALUES
    ('AU', NULL, 'gst', 'Australia', 'Australian Taxation Office', 'AUD', true, 'ABN')
ON CONFLICT DO NOTHING;

-- Canada (HST/GST)
INSERT INTO tax_jurisdictions (country_code, region_code, tax_system, jurisdiction_name, tax_authority, default_currency, healthcare_exempt, tax_id_label)
VALUES
    ('CA', 'ON', 'hst', 'Canada - Ontario', 'Canada Revenue Agency', 'CAD', true, 'GST/HST Number'),
    ('CA', 'BC', 'gst', 'Canada - British Columbia', 'Canada Revenue Agency', 'CAD', true, 'GST Number')
ON CONFLICT DO NOTHING;

-- Japan (Consumption Tax)
INSERT INTO tax_jurisdictions (country_code, region_code, tax_system, jurisdiction_name, tax_authority, default_currency, healthcare_exempt, tax_id_label)
VALUES
    ('JP', NULL, 'consumption', 'Japan', 'National Tax Agency', 'JPY', true, 'Registration Number')
ON CONFLICT DO NOTHING;

-- Add standard VAT components for UK
DO $$
DECLARE
    uk_id UUID;
BEGIN
    SELECT id INTO uk_id FROM tax_jurisdictions WHERE country_code = 'GB' LIMIT 1;

    IF uk_id IS NOT NULL THEN
        INSERT INTO tax_components (jurisdiction_id, component_code, component_name, rate_percent, applies_to, description)
        VALUES
            (uk_id, 'VAT_20', 'Standard VAT', 20.00, 'all', 'Standard VAT rate'),
            (uk_id, 'VAT_5', 'Reduced VAT', 5.00, 'all', 'Reduced VAT rate'),
            (uk_id, 'VAT_0', 'Zero VAT', 0.00, 'healthcare', 'Zero-rated for healthcare'),
            (uk_id, 'EXEMPT', 'VAT Exempt', 0.00, 'healthcare', 'VAT exempt healthcare services')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Add UAE VAT components
DO $$
DECLARE
    uae_id UUID;
BEGIN
    SELECT id INTO uae_id FROM tax_jurisdictions WHERE country_code = 'AE' LIMIT 1;

    IF uae_id IS NOT NULL THEN
        INSERT INTO tax_components (jurisdiction_id, component_code, component_name, rate_percent, applies_to, description)
        VALUES
            (uae_id, 'VAT_5', 'UAE VAT', 5.00, 'all', 'UAE Standard VAT rate'),
            (uae_id, 'VAT_0', 'Zero VAT', 0.00, 'healthcare', 'Zero-rated')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Add Australia GST components
DO $$
DECLARE
    au_id UUID;
BEGIN
    SELECT id INTO au_id FROM tax_jurisdictions WHERE country_code = 'AU' LIMIT 1;

    IF au_id IS NOT NULL THEN
        INSERT INTO tax_components (jurisdiction_id, component_code, component_name, rate_percent, applies_to, description)
        VALUES
            (au_id, 'GST_10', 'Australian GST', 10.00, 'all', 'Standard GST rate'),
            (au_id, 'GST_FREE', 'GST Free', 0.00, 'healthcare', 'GST-free healthcare')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Triggers
CREATE TRIGGER update_tax_jurisdictions_timestamp
    BEFORE UPDATE ON tax_jurisdictions
    FOR EACH ROW EXECUTE FUNCTION update_i18n_timestamp();

CREATE TRIGGER update_tax_components_timestamp
    BEFORE UPDATE ON tax_components
    FOR EACH ROW EXECUTE FUNCTION update_i18n_timestamp();

CREATE TRIGGER update_organization_tax_settings_timestamp
    BEFORE UPDATE ON organization_tax_settings
    FOR EACH ROW EXECUTE FUNCTION update_i18n_timestamp();
