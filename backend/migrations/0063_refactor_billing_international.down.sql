-- Rollback billing internationalization refactor

DROP TRIGGER IF EXISTS update_organization_billing_config_timestamp ON organization_billing_config;
DROP TRIGGER IF EXISTS update_service_prices_timestamp ON service_prices;

DROP FUNCTION IF EXISTS calculate_tax(DECIMAL, UUID, VARCHAR);
DROP FUNCTION IF EXISTS get_tax_components(UUID, VARCHAR);

DROP TABLE IF EXISTS organization_billing_config;
DROP TABLE IF EXISTS service_prices;

-- Remove added columns from invoices
ALTER TABLE invoices
    DROP COLUMN IF EXISTS jurisdiction_id,
    DROP COLUMN IF EXISTS currency_code,
    DROP COLUMN IF EXISTS exchange_rate,
    DROP COLUMN IF EXISTS base_currency_total,
    DROP COLUMN IF EXISTS tax_calculation_method;

-- Remove added columns from invoice_items
ALTER TABLE invoice_items
    DROP COLUMN IF EXISTS currency_code;

-- Remove added columns from payments
ALTER TABLE payments
    DROP COLUMN IF EXISTS exchange_rate,
    DROP COLUMN IF EXISTS base_currency_amount;

-- Remove added columns from patient_billing_accounts
ALTER TABLE patient_billing_accounts
    DROP COLUMN IF EXISTS tax_id_type,
    DROP COLUMN IF EXISTS tax_id_number;

-- Remove jurisdiction from tax_codes
ALTER TABLE tax_codes
    DROP COLUMN IF EXISTS jurisdiction_id;
