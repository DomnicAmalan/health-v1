-- Rollback Phase 1: Laboratory Information System

DROP TRIGGER IF EXISTS trigger_update_order_critical_flag ON lab_order_items;
DROP FUNCTION IF EXISTS update_order_critical_flag();

DROP TRIGGER IF EXISTS trigger_generate_lab_order_number ON lab_orders;
DROP FUNCTION IF EXISTS generate_lab_order_number();
DROP SEQUENCE IF EXISTS lab_order_seq;

DROP TABLE IF EXISTS lab_order_items CASCADE;
DROP TABLE IF EXISTS lab_orders CASCADE;
DROP TABLE IF EXISTS lab_reference_ranges CASCADE;
DROP TABLE IF EXISTS lab_panel_tests CASCADE;
DROP TABLE IF EXISTS lab_panels CASCADE;
DROP TABLE IF EXISTS lab_tests CASCADE;
