-- Drop Service Catalog Schema

DROP TRIGGER IF EXISTS update_service_packages_timestamp ON service_packages;
DROP TRIGGER IF EXISTS update_gst_rates_timestamp ON gst_rates;
DROP TRIGGER IF EXISTS update_service_categories_timestamp ON service_categories;
DROP TRIGGER IF EXISTS update_services_timestamp ON services;
DROP FUNCTION IF EXISTS update_billing_timestamp();

DROP TABLE IF EXISTS service_package_items;
DROP TABLE IF EXISTS service_packages;
DROP TABLE IF EXISTS service_price_tiers;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS gst_rates;
DROP TABLE IF EXISTS tax_codes;
DROP TABLE IF EXISTS service_categories;
