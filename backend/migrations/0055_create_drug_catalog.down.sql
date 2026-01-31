-- Rollback: Drop drug catalog tables

DROP TRIGGER IF EXISTS update_drug_allergy_mapping_updated_at ON drug_allergy_mapping;
DROP TRIGGER IF EXISTS update_drug_contraindications_updated_at ON drug_contraindications;
DROP TRIGGER IF EXISTS update_drug_interactions_updated_at ON drug_interactions;
DROP TRIGGER IF EXISTS update_drug_master_updated_at ON drug_master;
DROP TRIGGER IF EXISTS update_drug_schedules_updated_at ON drug_schedules;
DROP TRIGGER IF EXISTS update_drug_catalogs_updated_at ON drug_catalogs;

DROP TABLE IF EXISTS drug_allergy_mapping CASCADE;
DROP TABLE IF EXISTS drug_contraindications CASCADE;
DROP TABLE IF EXISTS drug_interactions CASCADE;
DROP TABLE IF EXISTS drug_master CASCADE;
DROP TABLE IF EXISTS drug_schedules CASCADE;
DROP TABLE IF EXISTS drug_catalogs CASCADE;

DROP TYPE IF EXISTS interaction_severity;
DROP TYPE IF EXISTS drug_route;
DROP TYPE IF EXISTS drug_form_type;
DROP TYPE IF EXISTS drug_schedule_type;
