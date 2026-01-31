-- Drop Insurance Claims Schema

DROP TRIGGER IF EXISTS update_claims_timestamp ON insurance_claims;
DROP TRIGGER IF EXISTS update_preauths_timestamp ON insurance_preauths;
DROP TRIGGER IF EXISTS update_patient_policies_timestamp ON patient_insurance_policies;
DROP TRIGGER IF EXISTS update_insurance_plans_timestamp ON insurance_plans;
DROP TRIGGER IF EXISTS update_insurance_payers_timestamp ON insurance_payers;

DROP TABLE IF EXISTS insurance_claim_history;
DROP TABLE IF EXISTS insurance_claims;
DROP TABLE IF EXISTS insurance_preauths;
DROP TABLE IF EXISTS patient_insurance_policies;
DROP TABLE IF EXISTS insurance_plans;
DROP TABLE IF EXISTS insurance_payers;

DROP TYPE IF EXISTS claim_status;
DROP TYPE IF EXISTS preauth_status;
