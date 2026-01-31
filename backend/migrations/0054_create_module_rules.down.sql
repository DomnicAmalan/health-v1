-- Rollback: Drop module rules framework tables

DROP TRIGGER IF EXISTS update_hospital_config_updated_at ON hospital_config;
DROP TRIGGER IF EXISTS update_field_validations_updated_at ON field_validations;
DROP TRIGGER IF EXISTS update_module_rules_updated_at ON module_rules;

DROP TABLE IF EXISTS hospital_config CASCADE;
DROP TABLE IF EXISTS field_validations CASCADE;
DROP TABLE IF EXISTS module_rules CASCADE;

DROP TYPE IF EXISTS field_validation_type;
DROP TYPE IF EXISTS module_rule_category;
