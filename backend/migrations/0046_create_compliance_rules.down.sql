-- Rollback: Drop compliance rules tables

DROP TRIGGER IF EXISTS update_compliance_gaps_updated_at ON compliance_gaps;
DROP TRIGGER IF EXISTS update_compliance_assessments_updated_at ON compliance_assessments;
DROP TRIGGER IF EXISTS update_compliance_rules_updated_at ON compliance_rules;
DROP TABLE IF EXISTS compliance_gaps;
DROP TABLE IF EXISTS compliance_assessments;
DROP TABLE IF EXISTS compliance_rules;
DROP TYPE IF EXISTS entity_type;

