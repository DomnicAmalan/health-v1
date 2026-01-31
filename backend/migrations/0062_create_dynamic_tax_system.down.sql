-- Rollback dynamic tax system

DROP TRIGGER IF EXISTS update_organization_tax_settings_timestamp ON organization_tax_settings;
DROP TRIGGER IF EXISTS update_tax_components_timestamp ON tax_components;
DROP TRIGGER IF EXISTS update_tax_jurisdictions_timestamp ON tax_jurisdictions;

DROP TABLE IF EXISTS organization_tax_settings;
DROP TABLE IF EXISTS invoice_tax_lines;
DROP TABLE IF EXISTS tax_components;
DROP TABLE IF EXISTS tax_jurisdictions;

DROP TYPE IF EXISTS tax_system_type;
