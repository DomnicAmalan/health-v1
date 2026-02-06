-- Rollback: Drop encounters table

DROP TRIGGER IF EXISTS update_encounters_updated_at ON encounters;
DROP FUNCTION IF EXISTS generate_encounter_number();
DROP TABLE IF EXISTS encounters CASCADE;
