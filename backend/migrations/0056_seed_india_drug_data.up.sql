-- Migration: Seed India drug regulatory data
-- Description: Seeds Indian Pharmacopoeia catalog, schedules, and essential medicines
-- Regulatory Body: CDSCO (Central Drugs Standard Control Organisation)
-- Reference: Drugs and Cosmetics Act, 1940 & Rules, 1945

-- =============================================================================
-- GEOGRAPHIC REGION: India and Tamil Nadu
-- =============================================================================

-- Insert India if not exists
INSERT INTO geographic_regions (id, name, code, level, parent_id, metadata)
SELECT
    'a0000000-0000-0000-0000-000000000356'::UUID,
    'India',
    'IND',
    'country',
    NULL,
    '{"iso3166_alpha2": "IN", "iso3166_alpha3": "IND", "currency": "INR", "timezone": "Asia/Kolkata"}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM geographic_regions WHERE code = 'IND'
);

-- Insert Tamil Nadu if not exists
INSERT INTO geographic_regions (id, name, code, level, parent_id, metadata)
SELECT
    'a0000000-0000-0000-0000-000000000033'::UUID,
    'Tamil Nadu',
    'TN',
    'state',
    (SELECT id FROM geographic_regions WHERE code = 'IND' LIMIT 1),
    '{"state_code": "TN", "capital": "Chennai", "drug_controller": "Tamil Nadu State Drug Control"}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM geographic_regions WHERE code = 'TN' AND level = 'state'
);

-- =============================================================================
-- DRUG CATALOG: Indian Pharmacopoeia
-- =============================================================================

INSERT INTO drug_catalogs (id, catalog_code, catalog_name, catalog_version, region_id, country_code, regulatory_body, regulatory_url, effective_from, is_primary, is_active)
VALUES (
    'c0000000-0000-0000-0000-000000000001'::UUID,
    'IND-IP',
    'Indian Pharmacopoeia',
    '2022',
    (SELECT id FROM geographic_regions WHERE code = 'IND' LIMIT 1),
    'IND',
    'Central Drugs Standard Control Organisation (CDSCO)',
    'https://cdsco.gov.in',
    '2022-01-01',
    true,
    true
);

-- =============================================================================
-- DRUG SCHEDULES: India (Drugs and Cosmetics Rules)
-- =============================================================================

-- Schedule H - Prescription drugs
INSERT INTO drug_schedules (id, schedule_code, schedule_name, schedule_type, catalog_id, region_id, description, prescriber_requirements, dispensing_requirements, record_keeping_days, refill_allowed, max_refills, is_active)
VALUES (
    'b0000000-0000-0000-0000-000000000001'::UUID,
    'H',
    'Schedule H - Prescription Only',
    'schedule_h',
    'c0000000-0000-0000-0000-000000000001'::UUID,
    (SELECT id FROM geographic_regions WHERE code = 'IND' LIMIT 1),
    'Drugs that can only be sold on prescription of a Registered Medical Practitioner',
    'Registered Medical Practitioner (RMP)',
    'Must be dispensed by licensed pharmacist. Prescription must include: patient name, date, signature of RMP',
    730,  -- 2 years record keeping
    true,
    3,    -- Max 3 refills
    true
);

-- Schedule H1 - Strict prescription drugs (antibiotics, etc.)
INSERT INTO drug_schedules (id, schedule_code, schedule_name, schedule_type, catalog_id, region_id, description, prescriber_requirements, dispensing_requirements, record_keeping_days, refill_allowed, max_refills, is_active)
VALUES (
    'b0000000-0000-0000-0000-000000000002'::UUID,
    'H1',
    'Schedule H1 - Strict Prescription',
    'schedule_h1',
    'c0000000-0000-0000-0000-000000000001'::UUID,
    (SELECT id FROM geographic_regions WHERE code = 'IND' LIMIT 1),
    'Antibiotics, anti-TB drugs, and others requiring stricter control to prevent misuse',
    'Registered Medical Practitioner (RMP)',
    'Separate register required. Must record: patient name, address, doctor name, registration number, drug name, quantity, date',
    1095,  -- 3 years record keeping
    false, -- No refills for H1
    0,
    true
);

-- Schedule X - Narcotics and controlled substances
INSERT INTO drug_schedules (id, schedule_code, schedule_name, schedule_type, catalog_id, region_id, description, prescriber_requirements, dispensing_requirements, record_keeping_days, refill_allowed, max_refills, max_quantity_days, is_active)
VALUES (
    'b0000000-0000-0000-0000-000000000003'::UUID,
    'X',
    'Schedule X - Controlled Substances',
    'schedule_x',
    'c0000000-0000-0000-0000-000000000001'::UUID,
    (SELECT id FROM geographic_regions WHERE code = 'IND' LIMIT 1),
    'Narcotics and psychotropic substances under NDPS Act',
    'Registered Medical Practitioner with special authorization',
    'Requires special forms. Double-locked storage. Daily count mandatory. Destruction witness required.',
    1825,  -- 5 years record keeping
    false, -- No refills for Schedule X
    0,
    30,    -- Max 30 days supply
    true
);

-- Schedule G - Hospital restricted
INSERT INTO drug_schedules (id, schedule_code, schedule_name, schedule_type, catalog_id, region_id, description, prescriber_requirements, dispensing_requirements, refill_allowed, is_active)
VALUES (
    'b0000000-0000-0000-0000-000000000004'::UUID,
    'G',
    'Schedule G - Hospital/Institution Only',
    'schedule_g',
    'c0000000-0000-0000-0000-000000000001'::UUID,
    (SELECT id FROM geographic_regions WHERE code = 'IND' LIMIT 1),
    'Drugs restricted to hospitals, dispensaries, and similar institutions',
    'Hospital-based Registered Medical Practitioner',
    'Can only be sold to hospitals, dispensaries, clinics, or to persons with special permit',
    false,
    true
);

-- OTC - Over the counter
INSERT INTO drug_schedules (id, schedule_code, schedule_name, schedule_type, catalog_id, region_id, description, prescriber_requirements, dispensing_requirements, refill_allowed, is_active)
VALUES (
    'b0000000-0000-0000-0000-000000000005'::UUID,
    'OTC',
    'Over The Counter',
    'otc',
    'c0000000-0000-0000-0000-000000000001'::UUID,
    (SELECT id FROM geographic_regions WHERE code = 'IND' LIMIT 1),
    'Non-prescription drugs safe for self-medication',
    NULL,
    'Can be sold without prescription. Pharmacist advice recommended.',
    true,
    true
);

-- =============================================================================
-- ESSENTIAL MEDICINES (Sample - National List of Essential Medicines India 2022)
-- =============================================================================

-- Paracetamol (OTC)
INSERT INTO drug_master (id, drug_code, generic_name, brand_names, catalog_id, schedule_id, therapeutic_class, pharmacological_class, atc_code, form, route, strength, strength_unit, strength_value, usual_dose, max_daily_dose, pregnancy_category, storage_conditions, is_formulary, is_active)
VALUES (
    'd0000000-0000-0000-0000-000000000001'::UUID,
    'IND-PARA-500',
    'Paracetamol',
    ARRAY['Crocin', 'Calpol', 'Dolo'],
    'c0000000-0000-0000-0000-000000000001'::UUID,
    'b0000000-0000-0000-0000-000000000005'::UUID,  -- OTC
    'Analgesic/Antipyretic',
    'Non-opioid analgesic',
    'N02BE01',
    'tablet',
    'oral',
    '500mg',
    'mg',
    500,
    '500-1000mg every 4-6 hours',
    '4000mg',
    'B',
    'Store below 30°C. Protect from moisture.',
    true,
    true
);

-- Amoxicillin (Schedule H1)
INSERT INTO drug_master (id, drug_code, generic_name, brand_names, catalog_id, schedule_id, therapeutic_class, pharmacological_class, atc_code, form, route, strength, strength_unit, strength_value, usual_dose, max_daily_dose, pediatric_dose, pregnancy_category, storage_conditions, is_formulary, is_active)
VALUES (
    'd0000000-0000-0000-0000-000000000002'::UUID,
    'IND-AMOX-500',
    'Amoxicillin',
    ARRAY['Mox', 'Novamox', 'Amoxil'],
    'c0000000-0000-0000-0000-000000000001'::UUID,
    'b0000000-0000-0000-0000-000000000002'::UUID,  -- Schedule H1
    'Antibiotic',
    'Penicillin (Beta-lactam)',
    'J01CA04',
    'capsule',
    'oral',
    '500mg',
    'mg',
    500,
    '500mg every 8 hours',
    '3000mg',
    '25-50mg/kg/day in divided doses',
    'B',
    'Store below 25°C. Keep dry.',
    true,
    true
);

-- Metformin (Schedule H)
INSERT INTO drug_master (id, drug_code, generic_name, brand_names, catalog_id, schedule_id, therapeutic_class, pharmacological_class, atc_code, form, route, strength, strength_unit, strength_value, usual_dose, max_daily_dose, pregnancy_category, renal_adjustment_required, storage_conditions, is_formulary, is_active)
VALUES (
    'd0000000-0000-0000-0000-000000000003'::UUID,
    'IND-METF-500',
    'Metformin',
    ARRAY['Glycomet', 'Glucophage', 'Obimet'],
    'c0000000-0000-0000-0000-000000000001'::UUID,
    'b0000000-0000-0000-0000-000000000001'::UUID,  -- Schedule H
    'Antidiabetic',
    'Biguanide',
    'A10BA02',
    'tablet',
    'oral',
    '500mg',
    'mg',
    500,
    '500mg twice daily with meals',
    '2550mg',
    'B',
    true,
    'Store below 30°C.',
    true,
    true
);

-- Amlodipine (Schedule H)
INSERT INTO drug_master (id, drug_code, generic_name, brand_names, catalog_id, schedule_id, therapeutic_class, pharmacological_class, atc_code, form, route, strength, strength_unit, strength_value, usual_dose, max_daily_dose, pregnancy_category, storage_conditions, is_formulary, is_active)
VALUES (
    'd0000000-0000-0000-0000-000000000004'::UUID,
    'IND-AMLO-5',
    'Amlodipine',
    ARRAY['Amlip', 'Amlopress', 'Stamlo'],
    'c0000000-0000-0000-0000-000000000001'::UUID,
    'b0000000-0000-0000-0000-000000000001'::UUID,  -- Schedule H
    'Antihypertensive',
    'Calcium channel blocker (Dihydropyridine)',
    'C08CA01',
    'tablet',
    'oral',
    '5mg',
    'mg',
    5,
    '5mg once daily',
    '10mg',
    'C',
    'Store below 30°C. Protect from light.',
    true,
    true
);

-- Omeprazole (Schedule H)
INSERT INTO drug_master (id, drug_code, generic_name, brand_names, catalog_id, schedule_id, therapeutic_class, pharmacological_class, atc_code, form, route, strength, strength_unit, strength_value, usual_dose, max_daily_dose, pregnancy_category, storage_conditions, is_formulary, is_active)
VALUES (
    'd0000000-0000-0000-0000-000000000005'::UUID,
    'IND-OMEP-20',
    'Omeprazole',
    ARRAY['Omez', 'Prilosec', 'Ocid'],
    'c0000000-0000-0000-0000-000000000001'::UUID,
    'b0000000-0000-0000-0000-000000000001'::UUID,  -- Schedule H
    'Gastrointestinal',
    'Proton pump inhibitor',
    'A02BC01',
    'capsule',
    'oral',
    '20mg',
    'mg',
    20,
    '20mg once daily before breakfast',
    '40mg',
    'C',
    'Store below 25°C. Protect from moisture.',
    true,
    true
);

-- Morphine (Schedule X)
INSERT INTO drug_master (id, drug_code, generic_name, brand_names, catalog_id, schedule_id, therapeutic_class, pharmacological_class, atc_code, form, route, strength, strength_unit, strength_value, usual_dose, max_daily_dose, pregnancy_category, storage_conditions, is_formulary, is_active)
VALUES (
    'd0000000-0000-0000-0000-000000000006'::UUID,
    'IND-MORPH-10',
    'Morphine Sulphate',
    ARRAY['MS Contin', 'Morcontin'],
    'c0000000-0000-0000-0000-000000000001'::UUID,
    'b0000000-0000-0000-0000-000000000003'::UUID,  -- Schedule X
    'Opioid Analgesic',
    'Opioid agonist',
    'N02AA01',
    'tablet',
    'oral',
    '10mg',
    'mg',
    10,
    '10-30mg every 4 hours as needed',
    'Individualized',
    'C',
    'Store in locked cabinet. Keep records.',
    true,
    true
);

-- =============================================================================
-- DRUG INTERACTIONS (Sample)
-- =============================================================================

-- Metformin + Amlodipine interaction (sample drug-drug)
INSERT INTO drug_interactions (drug_id_1, drug_id_2, generic_name_1, generic_name_2, severity, interaction_type, mechanism, clinical_effect, management, evidence_level, catalog_id)
VALUES (
    'd0000000-0000-0000-0000-000000000003'::UUID,  -- Metformin
    'd0000000-0000-0000-0000-000000000004'::UUID,  -- Amlodipine
    'Metformin',
    'Amlodipine',
    'minor',
    'pharmacokinetic',
    'Amlodipine may slightly increase metformin plasma levels',
    'Minimal clinical significance in most patients',
    'Generally safe. Monitor blood glucose if dose changes.',
    'probable',
    'c0000000-0000-0000-0000-000000000001'::UUID
);

-- =============================================================================
-- DRUG CONTRAINDICATIONS (Sample)
-- =============================================================================

-- Metformin contraindicated in renal failure
INSERT INTO drug_contraindications (drug_id, contraindication_type, condition_code, condition_name, description, severity, alternative_recommendation, catalog_id)
VALUES (
    'd0000000-0000-0000-0000-000000000003'::UUID,
    'absolute',
    'N18.5',  -- ICD-10 for CKD Stage 5
    'Chronic Kidney Disease Stage 5',
    'Contraindicated in severe renal impairment (eGFR < 30 mL/min)',
    'contraindicated',
    'Consider insulin or other antidiabetic agents safe in renal failure',
    'c0000000-0000-0000-0000-000000000001'::UUID
);

-- =============================================================================
-- DRUG-ALLERGY MAPPING
-- =============================================================================

-- Amoxicillin - Penicillin allergy
INSERT INTO drug_allergy_mapping (drug_id, allergen_class, allergen_name, cross_reactivity_class, typical_severity)
VALUES (
    'd0000000-0000-0000-0000-000000000002'::UUID,
    'Penicillin',
    'Beta-lactam ring',
    'Cephalosporins',  -- Cross-reactivity with cephalosporins
    'severe'
);

-- =============================================================================
-- MODULE RULES: India-specific pharmacy rules
-- =============================================================================

-- Rule: Schedule H1 requires separate register
INSERT INTO module_rules (rule_code, rule_name, description, module_name, entity_name, regulation_id, region_id, category, rule_definition, error_message, priority, is_mandatory, is_active)
SELECT
    'IND-CDSCO-H1-REGISTER',
    'Schedule H1 Separate Register',
    'Schedule H1 drugs require entries in a separate register',
    'pharmacy',
    'prescription',
    NULL,
    (SELECT id FROM geographic_regions WHERE code = 'IND' LIMIT 1),
    'documentation',
    '{
        "trigger": "on_dispense",
        "condition": {"schedule_type": "schedule_h1"},
        "action": "require_register_entry",
        "fields": ["patient_name", "patient_address", "prescriber_name", "prescriber_registration", "drug_name", "quantity", "date"]
    }'::jsonb,
    'Schedule H1 drugs require separate register entry with patient and prescriber details',
    100,
    true,
    true
WHERE EXISTS (SELECT 1 FROM geographic_regions WHERE code = 'IND');

-- Rule: Schedule X requires special form
INSERT INTO module_rules (rule_code, rule_name, description, module_name, entity_name, regulation_id, region_id, category, rule_definition, error_message, priority, is_mandatory, is_active)
SELECT
    'IND-NDPS-SPECIAL-FORM',
    'Schedule X Special Form',
    'Schedule X (controlled substances) require special prescription form',
    'pharmacy',
    'prescription',
    NULL,
    (SELECT id FROM geographic_regions WHERE code = 'IND' LIMIT 1),
    'documentation',
    '{
        "trigger": "on_prescribe",
        "condition": {"schedule_type": "schedule_x"},
        "action": "require_special_form",
        "form_type": "NDPS_Form"
    }'::jsonb,
    'Schedule X drugs require NDPS special prescription form',
    110,
    true,
    true
WHERE EXISTS (SELECT 1 FROM geographic_regions WHERE code = 'IND');

-- Field validation: Prescription must have prescriber registration number
INSERT INTO field_validations (module_name, entity_name, field_name, validation_type, validation_config, error_message, error_code, severity, regulation_id, region_id, priority, is_active)
SELECT
    'pharmacy',
    'prescription',
    'prescriber_registration_number',
    'required',
    '{"when": {"schedule_type": {"in": ["schedule_h", "schedule_h1", "schedule_x"]}}}'::jsonb,
    'Prescriber registration number is required for scheduled drugs',
    'PRESC_REG_REQUIRED',
    'error',
    NULL,
    (SELECT id FROM geographic_regions WHERE code = 'IND' LIMIT 1),
    100,
    true
WHERE EXISTS (SELECT 1 FROM geographic_regions WHERE code = 'IND');
