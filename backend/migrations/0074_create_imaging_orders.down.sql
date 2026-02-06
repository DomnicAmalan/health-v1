-- Rollback: Imaging/Radiology Orders System

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_imaging_order_timestamp ON imaging_orders;
DROP TRIGGER IF EXISTS trigger_record_imaging_order_status_change ON imaging_orders;
DROP TRIGGER IF EXISTS trigger_generate_accession_number ON imaging_orders;

-- Drop functions
DROP FUNCTION IF EXISTS update_imaging_order_timestamp();
DROP FUNCTION IF EXISTS record_imaging_order_status_change();
DROP FUNCTION IF EXISTS generate_accession_number();

-- Drop sequence
DROP SEQUENCE IF EXISTS imaging_accession_seq;

-- Drop tables (cascade to handle foreign keys)
DROP TABLE IF EXISTS imaging_order_history CASCADE;
DROP TABLE IF EXISTS imaging_report_addenda CASCADE;
DROP TABLE IF EXISTS imaging_orders CASCADE;
DROP TABLE IF EXISTS imaging_study_types CASCADE;
DROP TABLE IF EXISTS imaging_modalities CASCADE;
