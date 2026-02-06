-- Rollback: Vital Signs Recording System

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_vital_signs_timestamp ON vital_signs;
DROP TRIGGER IF EXISTS trigger_flag_abnormal_vitals ON vital_signs;
DROP TRIGGER IF EXISTS trigger_calculate_bmi ON vital_signs;

-- Drop functions
DROP FUNCTION IF EXISTS update_vital_signs_timestamp();
DROP FUNCTION IF EXISTS flag_abnormal_vitals();
DROP FUNCTION IF EXISTS calculate_bmi();

-- Drop tables (cascade to handle foreign keys)
DROP TABLE IF EXISTS vital_signs_templates CASCADE;
DROP TABLE IF EXISTS vital_signs_reference_ranges CASCADE;
DROP TABLE IF EXISTS vital_signs CASCADE;
