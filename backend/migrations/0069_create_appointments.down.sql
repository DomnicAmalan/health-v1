-- Rollback: Appointments & Scheduling System

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_appointment_timestamp ON appointments;
DROP TRIGGER IF EXISTS trigger_calculate_appointment_wait_time ON appointments;
DROP TRIGGER IF EXISTS trigger_calculate_appointment_end_time ON appointments;

-- Drop functions
DROP FUNCTION IF EXISTS update_appointment_timestamp();
DROP FUNCTION IF EXISTS calculate_appointment_wait_time();
DROP FUNCTION IF EXISTS calculate_appointment_end_time();

-- Drop tables (cascade to handle foreign keys)
DROP TABLE IF EXISTS appointment_cancellation_reasons CASCADE;
DROP TABLE IF EXISTS appointment_blocks CASCADE;
DROP TABLE IF EXISTS appointment_availability CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
