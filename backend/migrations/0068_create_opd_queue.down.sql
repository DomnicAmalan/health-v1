-- Rollback: OPD Queue Management System

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_opd_consultations_timestamp ON opd_consultations;
DROP TRIGGER IF EXISTS trigger_update_opd_queue_timestamp ON opd_queue;
DROP TRIGGER IF EXISTS trigger_calculate_consultation_duration ON opd_consultations;
DROP TRIGGER IF EXISTS trigger_calculate_opd_wait_time ON opd_queue;
DROP TRIGGER IF EXISTS trigger_generate_opd_queue_number ON opd_queue;

-- Drop functions
DROP FUNCTION IF EXISTS update_opd_timestamp();
DROP FUNCTION IF EXISTS calculate_consultation_duration();
DROP FUNCTION IF EXISTS calculate_opd_wait_time();
DROP FUNCTION IF EXISTS generate_opd_queue_number();

-- Drop tables (cascade to handle foreign keys)
DROP TABLE IF EXISTS opd_display_config CASCADE;
DROP TABLE IF EXISTS opd_consultations CASCADE;
DROP TABLE IF EXISTS opd_queue CASCADE;
