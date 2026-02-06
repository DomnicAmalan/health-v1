-- Rollback: Clinical Notes & Documentation System

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_clinical_note_timestamp ON clinical_notes;

-- Drop functions
DROP FUNCTION IF EXISTS increment_macro_use_count();
DROP FUNCTION IF EXISTS update_clinical_note_timestamp();

-- Drop tables (cascade to handle foreign keys)
DROP TABLE IF EXISTS note_attachments CASCADE;
DROP TABLE IF EXISTS note_macros CASCADE;
DROP TABLE IF EXISTS note_templates CASCADE;
DROP TABLE IF EXISTS clinical_notes CASCADE;
