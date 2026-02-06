-- Seed Data: Common CDS Rules
-- Pre-defined clinical decision support rules for safety and quality

-- Critical Lab Value Alert (Potassium High)
INSERT INTO cds_rules (
    organization_id,
    rule_code,
    rule_name,
    rule_category,
    rule_type,
    trigger_condition,
    rule_logic,
    alert_severity,
    alert_title_template,
    alert_message_template,
    recommendation_template,
    is_blockable,
    requires_override_reason,
    is_active
)
SELECT
    o.id,
    'CRITICAL_K_HIGH',
    'Critical Potassium Level - High',
    'lab_interpretation',
    'value_range',
    '{"entity_type": "lab_result", "test_code": "K"}'::jsonb,
    '{"operator": ">", "threshold": 6.0, "unit": "mmol/L"}'::jsonb,
    'critical',
    'CRITICAL: Potassium {{value}} {{unit}}',
    'Patient {{patient_name}} has critically high potassium: {{value}} {{unit}} (normal: 3.5-5.5). Immediate intervention required.',
    'Notify physician immediately. Consider: ECG, insulin+glucose, calcium gluconate if ECG changes, dialysis if refractory.',
    FALSE,  -- Cannot be dismissed
    TRUE,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM cds_rules
    WHERE rule_code = 'CRITICAL_K_HIGH'
      AND organization_id = o.id
);

-- Critical Lab Value Alert (Potassium Low)
INSERT INTO cds_rules (
    organization_id,
    rule_code,
    rule_name,
    rule_category,
    rule_type,
    trigger_condition,
    rule_logic,
    alert_severity,
    alert_title_template,
    alert_message_template,
    recommendation_template,
    is_blockable,
    requires_override_reason,
    is_active
)
SELECT
    o.id,
    'CRITICAL_K_LOW',
    'Critical Potassium Level - Low',
    'lab_interpretation',
    'value_range',
    '{"entity_type": "lab_result", "test_code": "K"}'::jsonb,
    '{"operator": "<", "threshold": 2.5, "unit": "mmol/L"}'::jsonb,
    'critical',
    'CRITICAL: Potassium {{value}} {{unit}}',
    'Patient {{patient_name}} has critically low potassium: {{value}} {{unit}} (normal: 3.5-5.5). Risk of cardiac arrhythmia.',
    'Notify physician immediately. Check ECG. Administer IV potassium replacement per protocol.',
    FALSE,
    TRUE,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM cds_rules
    WHERE rule_code = 'CRITICAL_K_LOW'
      AND organization_id = o.id
);

-- Critical Glucose - Hypoglycemia
INSERT INTO cds_rules (
    organization_id,
    rule_code,
    rule_name,
    rule_category,
    rule_type,
    trigger_condition,
    rule_logic,
    alert_severity,
    alert_title_template,
    alert_message_template,
    recommendation_template,
    is_blockable,
    requires_override_reason,
    is_active
)
SELECT
    o.id,
    'CRITICAL_GLUCOSE_LOW',
    'Critical Glucose - Hypoglycemia',
    'lab_interpretation',
    'value_range',
    '{"entity_type": "lab_result", "test_code": "GLU"}'::jsonb,
    '{"operator": "<", "threshold": 3.0, "unit": "mmol/L"}'::jsonb,
    'critical',
    'CRITICAL: Glucose {{value}} {{unit}}',
    'Patient {{patient_name}} has severe hypoglycemia: {{value}} {{unit}}. Immediate treatment required.',
    'If conscious: oral glucose 15-20g. If unconscious: IV dextrose or IM glucagon. Recheck in 15 minutes.',
    FALSE,
    TRUE,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM cds_rules
    WHERE rule_code = 'CRITICAL_GLUCOSE_LOW'
      AND organization_id = o.id
);

-- Drug-Drug Interaction: Warfarin + NSAIDs
INSERT INTO cds_rules (
    organization_id,
    rule_code,
    rule_name,
    rule_category,
    rule_type,
    trigger_condition,
    rule_logic,
    alert_severity,
    alert_title_template,
    alert_message_template,
    recommendation_template,
    is_blockable,
    requires_override_reason,
    is_active
)
SELECT
    o.id,
    'INTERACTION_WARFARIN_NSAID',
    'Major Drug Interaction: Warfarin + NSAID',
    'drug_safety',
    'drug_interaction',
    '{"entity_type": "medication"}'::jsonb,
    '{"drug_a": "warfarin", "drug_b_class": "nsaid", "severity": "major"}'::jsonb,
    'warning',
    'Major Drug Interaction',
    'Concurrent use of warfarin and NSAIDs significantly increases bleeding risk.',
    'Consider: alternative analgesic (acetaminophen), gastric protection (PPI), monitor INR more frequently, or avoid combination if possible.',
    TRUE,
    TRUE,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM cds_rules
    WHERE rule_code = 'INTERACTION_WARFARIN_NSAID'
      AND organization_id = o.id
);

-- Renal Dosing Alert: Vancomycin
INSERT INTO cds_rules (
    organization_id,
    rule_code,
    rule_name,
    rule_category,
    rule_type,
    trigger_condition,
    rule_logic,
    alert_severity,
    alert_title_template,
    alert_message_template,
    recommendation_template,
    is_blockable,
    requires_override_reason,
    is_active
)
SELECT
    o.id,
    'RENAL_DOSING_VANCOMYCIN',
    'Renal Dose Adjustment Required: Vancomycin',
    'drug_safety',
    'renal_dosing',
    '{"entity_type": "medication", "drug_name": "vancomycin"}'::jsonb,
    '{"check": "creatinine_clearance", "threshold": 50, "unit": "ml/min"}'::jsonb,
    'warning',
    'Renal Dose Adjustment Recommended',
    'Patient has CrCl {{creatinine_clearance}} ml/min. Vancomycin requires dose adjustment for renal impairment.',
    'Recommended: Reduce dose or extend interval. Monitor trough levels. Consult pharmacy for dosing guidance.',
    TRUE,
    TRUE,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM cds_rules
    WHERE rule_code = 'RENAL_DOSING_VANCOMYCIN'
      AND organization_id = o.id
);

-- Allergy Alert: Penicillin Cross-Reactivity
INSERT INTO cds_rules (
    organization_id,
    rule_code,
    rule_name,
    rule_category,
    rule_type,
    trigger_condition,
    rule_logic,
    alert_severity,
    alert_title_template,
    alert_message_template,
    recommendation_template,
    is_blockable,
    requires_override_reason,
    is_active
)
SELECT
    o.id,
    'ALLERGY_PENICILLIN_CROSS',
    'Allergy Alert: Penicillin Cross-Reactivity',
    'drug_safety',
    'allergy_check',
    '{"entity_type": "medication"}'::jsonb,
    '{"allergy": "penicillin", "drug_class": "cephalosporin", "cross_reactivity_risk": "10%"}'::jsonb,
    'warning',
    'Allergy Cross-Reactivity Warning',
    'Patient has documented penicillin allergy. Prescribing cephalosporin {{drug_name}}. Cross-reactivity risk ~10%.',
    'If severe penicillin allergy (anaphylaxis): avoid cephalosporins. For mild reactions: may proceed with caution and monitoring.',
    TRUE,
    TRUE,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM cds_rules
    WHERE rule_code = 'ALLERGY_PENICILLIN_CROSS'
      AND organization_id = o.id
);

-- Pregnancy Category Alert
INSERT INTO cds_rules (
    organization_id,
    rule_code,
    rule_name,
    rule_category,
    rule_type,
    trigger_condition,
    rule_logic,
    alert_severity,
    alert_title_template,
    alert_message_template,
    recommendation_template,
    is_blockable,
    requires_override_reason,
    is_active
)
SELECT
    o.id,
    'PREGNANCY_CONTRAINDICATED',
    'Pregnancy Contraindication Alert',
    'drug_safety',
    'pregnancy_check',
    '{"entity_type": "medication", "patient_gender": "female", "reproductive_age": true}'::jsonb,
    '{"pregnancy_category": ["X", "D"], "check_pregnancy_status": true}'::jsonb,
    'critical',
    'Pregnancy Contraindication',
    'Drug {{drug_name}} is contraindicated in pregnancy (Category {{category}}). Patient is female of reproductive age.',
    'Verify pregnancy status. If pregnant or planning pregnancy, consider alternative therapy. Document counseling.',
    TRUE,
    TRUE,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM cds_rules
    WHERE rule_code = 'PREGNANCY_CONTRAINDICATED'
      AND organization_id = o.id
);

-- QTc Prolongation Alert
INSERT INTO cds_rules (
    organization_id,
    rule_code,
    rule_name,
    rule_category,
    rule_type,
    trigger_condition,
    rule_logic,
    alert_severity,
    alert_title_template,
    alert_message_template,
    recommendation_template,
    is_blockable,
    requires_override_reason,
    is_active
)
SELECT
    o.id,
    'QTC_PROLONGATION_RISK',
    'QTc Prolongation Risk with Multiple Drugs',
    'drug_safety',
    'drug_interaction',
    '{"entity_type": "medication"}'::jsonb,
    '{"check": "qt_prolonging_drugs", "count_threshold": 2}'::jsonb,
    'warning',
    'QTc Prolongation Risk',
    'Patient is on multiple QT-prolonging medications: {{drug_list}}. Increased risk of torsades de pointes.',
    'Consider: baseline ECG, monitor QTc interval, correct electrolytes (K, Mg), reduce number of QT-prolonging drugs if possible.',
    TRUE,
    TRUE,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM cds_rules
    WHERE rule_code = 'QTC_PROLONGATION_RISK'
      AND organization_id = o.id
);

-- Age-Based Dosing Alert (Pediatric)
INSERT INTO cds_rules (
    organization_id,
    rule_code,
    rule_name,
    rule_category,
    rule_type,
    trigger_condition,
    rule_logic,
    alert_severity,
    alert_title_template,
    alert_message_template,
    recommendation_template,
    is_blockable,
    requires_override_reason,
    is_active
)
SELECT
    o.id,
    'PEDIATRIC_DOSING_CHECK',
    'Pediatric Dosing Verification Required',
    'drug_safety',
    'age_based_dosing',
    '{"entity_type": "medication", "patient_age_years": "<18"}'::jsonb,
    '{"weight_based_dosing": true, "max_dose_check": true}'::jsonb,
    'warning',
    'Pediatric Dosing Verification',
    'Patient is {{age}} years old ({{weight}} kg). Verify pediatric dosing: {{dose}} {{unit}} of {{drug_name}}.',
    'Confirm dose is appropriate for age and weight. Check maximum dose limits. Consider body surface area if applicable.',
    TRUE,
    FALSE,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM cds_rules
    WHERE rule_code = 'PEDIATRIC_DOSING_CHECK'
      AND organization_id = o.id
);

-- Geriatric Fall Risk with Sedating Medications
INSERT INTO cds_rules (
    organization_id,
    rule_code,
    rule_name,
    rule_category,
    rule_type,
    trigger_condition,
    rule_logic,
    alert_severity,
    alert_title_template,
    alert_message_template,
    recommendation_template,
    is_blockable,
    requires_override_reason,
    is_active
)
SELECT
    o.id,
    'GERIATRIC_FALL_RISK',
    'Fall Risk: Sedating Medication in Elderly',
    'drug_safety',
    'geriatric_check',
    '{"entity_type": "medication", "patient_age_years": ">=65"}'::jsonb,
    '{"drug_effect": "sedating", "fall_risk_increase": true}'::jsonb,
    'info',
    'Fall Risk Assessment Recommended',
    'Patient age {{age}} prescribed sedating medication {{drug_name}}. Increased fall risk.',
    'Assess fall risk. Consider: lower starting dose, non-pharmacological alternatives, remove trip hazards, use of assistive devices.',
    TRUE,
    FALSE,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM cds_rules
    WHERE rule_code = 'GERIATRIC_FALL_RISK'
      AND organization_id = o.id
);
