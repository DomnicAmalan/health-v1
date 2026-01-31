-- Refactor Billing for International Support
-- Makes billing tables jurisdiction-agnostic
-- Deprecates India-specific columns (kept for backward compatibility)

-- ============================================
-- ADD JURISDICTION AND CURRENCY TO INVOICES
-- ============================================
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS jurisdiction_id UUID REFERENCES tax_jurisdictions(id),
    ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) REFERENCES currencies(code),
    ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(18,8) DEFAULT 1.0,
    ADD COLUMN IF NOT EXISTS base_currency_total DECIMAL(12,2); -- Total in org's base currency

-- Add column to indicate tax calculation method
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS tax_calculation_method VARCHAR(20) DEFAULT 'legacy'
        CHECK (tax_calculation_method IN ('legacy', 'dynamic'));

-- Rename India-specific columns (keep for backward compatibility, mark as deprecated)
COMMENT ON COLUMN invoices.cgst_amount IS 'DEPRECATED: Use invoice_tax_lines table. India CGST amount.';
COMMENT ON COLUMN invoices.sgst_amount IS 'DEPRECATED: Use invoice_tax_lines table. India SGST amount.';
COMMENT ON COLUMN invoices.igst_amount IS 'DEPRECATED: Use invoice_tax_lines table. India IGST amount.';
COMMENT ON COLUMN invoices.cess_amount IS 'DEPRECATED: Use invoice_tax_lines table. India Cess amount.';
COMMENT ON COLUMN invoices.place_of_supply IS 'DEPRECATED: India-specific. Use jurisdiction_id.';
COMMENT ON COLUMN invoices.is_inter_state IS 'DEPRECATED: India-specific.';
COMMENT ON COLUMN invoices.reverse_charge IS 'DEPRECATED: India-specific.';

-- ============================================
-- ADD CURRENCY TO INVOICE ITEMS
-- ============================================
ALTER TABLE invoice_items
    ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) REFERENCES currencies(code);

-- Deprecate India-specific tax columns in invoice_items
COMMENT ON COLUMN invoice_items.cgst_rate IS 'DEPRECATED: Use invoice_tax_lines table.';
COMMENT ON COLUMN invoice_items.cgst_amount IS 'DEPRECATED: Use invoice_tax_lines table.';
COMMENT ON COLUMN invoice_items.sgst_rate IS 'DEPRECATED: Use invoice_tax_lines table.';
COMMENT ON COLUMN invoice_items.sgst_amount IS 'DEPRECATED: Use invoice_tax_lines table.';
COMMENT ON COLUMN invoice_items.igst_rate IS 'DEPRECATED: Use invoice_tax_lines table.';
COMMENT ON COLUMN invoice_items.igst_amount IS 'DEPRECATED: Use invoice_tax_lines table.';
COMMENT ON COLUMN invoice_items.cess_rate IS 'DEPRECATED: Use invoice_tax_lines table.';
COMMENT ON COLUMN invoice_items.cess_amount IS 'DEPRECATED: Use invoice_tax_lines table.';

-- ============================================
-- ADD CURRENCY TO PAYMENTS
-- ============================================
-- Currency column already exists, just ensure it references currencies table
-- Cannot add FK to existing column directly if values don't match, so we make it nullable reference

-- Update payments table to have proper currency support
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(18,8) DEFAULT 1.0,
    ADD COLUMN IF NOT EXISTS base_currency_amount DECIMAL(12,2);

-- ============================================
-- REFACTOR PATIENT BILLING ACCOUNTS
-- Make tax ID fields generic (not just India GSTIN/PAN)
-- ============================================
ALTER TABLE patient_billing_accounts
    ADD COLUMN IF NOT EXISTS tax_id_type VARCHAR(50),      -- "GSTIN", "VAT", "EIN", etc.
    ADD COLUMN IF NOT EXISTS tax_id_number VARCHAR(50);     -- The actual ID number

-- Mark India-specific columns as deprecated
COMMENT ON COLUMN patient_billing_accounts.gstin IS 'DEPRECATED: Use tax_id_type + tax_id_number instead.';
COMMENT ON COLUMN patient_billing_accounts.pan IS 'DEPRECATED: Use tax_id_type + tax_id_number instead.';

-- ============================================
-- ADD SERVICE PRICING BY CURRENCY
-- ============================================
CREATE TABLE IF NOT EXISTS service_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    currency_code VARCHAR(3) NOT NULL REFERENCES currencies(code),

    -- Pricing
    price DECIMAL(12,2) NOT NULL,
    min_price DECIMAL(12,2),
    max_price DECIMAL(12,2),

    -- Validity
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(service_id, currency_code, effective_from)
);

-- ============================================
-- ORGANIZATION BILLING CONFIGURATION
-- ============================================
CREATE TABLE IF NOT EXISTS organization_billing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Primary jurisdiction for this org
    jurisdiction_id UUID REFERENCES tax_jurisdictions(id),

    -- Invoice settings
    invoice_prefix VARCHAR(20),
    invoice_number_format VARCHAR(100) DEFAULT 'INV-{YYYY}-{SEQ:5}',
    next_invoice_sequence INT DEFAULT 1,

    -- Receipt settings
    receipt_prefix VARCHAR(20),
    receipt_number_format VARCHAR(100) DEFAULT 'RCP-{YYYY}-{SEQ:5}',
    next_receipt_sequence INT DEFAULT 1,

    -- Tax settings
    default_tax_inclusive BOOLEAN DEFAULT false,
    auto_calculate_tax BOOLEAN DEFAULT true,

    -- Rounding
    price_rounding_mode VARCHAR(20) DEFAULT 'half_up',
    tax_rounding_mode VARCHAR(20) DEFAULT 'half_up',

    -- Payment settings
    default_payment_terms_days INT DEFAULT 30,
    late_fee_percent DECIMAL(5,2),
    late_fee_grace_days INT DEFAULT 0,

    -- Display settings
    show_tax_breakdown BOOLEAN DEFAULT true,
    show_original_currency BOOLEAN DEFAULT true, -- Show original currency on multi-currency invoices

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id)
);

-- ============================================
-- UPDATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_invoices_jurisdiction ON invoices(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_invoices_currency ON invoices(currency_code);
CREATE INDEX IF NOT EXISTS idx_service_prices_service ON service_prices(service_id);
CREATE INDEX IF NOT EXISTS idx_service_prices_currency ON service_prices(currency_code);

-- ============================================
-- MIGRATE TAX CODE TABLE TO BE INTERNATIONAL
-- ============================================
-- Rename India-specific columns
ALTER TABLE tax_codes
    ADD COLUMN IF NOT EXISTS jurisdiction_id UUID REFERENCES tax_jurisdictions(id);

-- Update comments
COMMENT ON COLUMN tax_codes.code IS 'Tax code (HSN, SAC, or jurisdiction-specific code)';
COMMENT ON COLUMN tax_codes.code_type IS 'Code type - varies by country (HSN/SAC for India, commodity codes elsewhere)';

-- ============================================
-- HELPER FUNCTION: Get tax components for a jurisdiction
-- ============================================
CREATE OR REPLACE FUNCTION get_tax_components(
    p_jurisdiction_id UUID,
    p_applies_to VARCHAR DEFAULT 'all'
)
RETURNS TABLE (
    component_id UUID,
    component_code VARCHAR,
    component_name VARCHAR,
    rate_percent DECIMAL,
    calculation_order INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tc.id,
        tc.component_code,
        tc.component_name,
        tc.rate_percent,
        tc.calculation_order
    FROM tax_components tc
    WHERE tc.jurisdiction_id = p_jurisdiction_id
      AND tc.is_active = true
      AND (tc.applies_to = 'all' OR tc.applies_to = p_applies_to)
      AND tc.effective_from <= CURRENT_DATE
      AND (tc.effective_to IS NULL OR tc.effective_to >= CURRENT_DATE)
    ORDER BY tc.calculation_order;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION: Calculate tax for an amount
-- ============================================
CREATE OR REPLACE FUNCTION calculate_tax(
    p_amount DECIMAL,
    p_jurisdiction_id UUID,
    p_applies_to VARCHAR DEFAULT 'all'
)
RETURNS TABLE (
    component_code VARCHAR,
    component_name VARCHAR,
    taxable_amount DECIMAL,
    tax_rate DECIMAL,
    tax_amount DECIMAL
) AS $$
DECLARE
    v_base_amount DECIMAL := p_amount;
    v_running_total DECIMAL := p_amount;
    v_component RECORD;
BEGIN
    FOR v_component IN
        SELECT * FROM get_tax_components(p_jurisdiction_id, p_applies_to)
    LOOP
        RETURN QUERY SELECT
            v_component.component_code,
            v_component.component_name,
            v_base_amount,
            v_component.rate_percent,
            ROUND(v_base_amount * v_component.rate_percent / 100, 2);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_service_prices_timestamp
    BEFORE UPDATE ON service_prices
    FOR EACH ROW EXECUTE FUNCTION update_i18n_timestamp();

CREATE TRIGGER update_organization_billing_config_timestamp
    BEFORE UPDATE ON organization_billing_config
    FOR EACH ROW EXECUTE FUNCTION update_i18n_timestamp();
