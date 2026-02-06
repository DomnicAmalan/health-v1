-- Rollback Phase 1: EHR Patients Table

DROP TRIGGER IF EXISTS trigger_update_patient_timestamp ON ehr_patients;
DROP FUNCTION IF EXISTS update_patient_timestamp();

DROP TRIGGER IF EXISTS trigger_update_patient_age ON ehr_patients;
DROP FUNCTION IF EXISTS update_patient_age();

DROP TRIGGER IF EXISTS trigger_generate_mrn ON ehr_patients;
DROP FUNCTION IF EXISTS generate_mrn();
DROP SEQUENCE IF EXISTS patient_mrn_seq;

DROP TABLE IF EXISTS patient_merge_history CASCADE;
DROP TABLE IF EXISTS patient_identifiers CASCADE;
DROP TABLE IF EXISTS ehr_patients CASCADE;
