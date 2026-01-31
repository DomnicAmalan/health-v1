-- Drop Billing & Invoice Schema

DROP TRIGGER IF EXISTS update_billing_accounts_timestamp ON patient_billing_accounts;
DROP TRIGGER IF EXISTS update_payments_timestamp ON payments;
DROP TRIGGER IF EXISTS update_invoice_items_timestamp ON invoice_items;
DROP TRIGGER IF EXISTS update_invoices_timestamp ON invoices;

DROP TABLE IF EXISTS billing_adjustments;
DROP TABLE IF EXISTS payment_allocations;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS patient_billing_accounts;

DROP TYPE IF EXISTS payment_status;
DROP TYPE IF EXISTS payment_method;
DROP TYPE IF EXISTS invoice_type;
DROP TYPE IF EXISTS invoice_status;
