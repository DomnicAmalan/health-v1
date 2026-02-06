-- Rollback Phase 0.4: Clinical Decision Support

DROP TABLE IF EXISTS cds_rule_audit_log CASCADE;
DROP TABLE IF EXISTS cds_rules CASCADE;
DROP TABLE IF EXISTS clinical_alerts CASCADE;
