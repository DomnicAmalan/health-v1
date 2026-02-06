-- Seed data: Context-aware lab test recommendations by body system
-- Maps anatomical regions to clinically relevant lab tests

-- Helper function to get body system ID by code
CREATE OR REPLACE FUNCTION get_body_system_id(p_system_code VARCHAR) RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM body_systems WHERE system_code = p_system_code LIMIT 1);
END;
$$ LANGUAGE plpgsql;

-- Helper function to get lab test ID by code
CREATE OR REPLACE FUNCTION get_lab_test_id(p_test_code VARCHAR) RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM lab_tests WHERE test_code = p_test_code LIMIT 1);
END;
$$ LANGUAGE plpgsql;

-- LIVER SYSTEM → Hepatic Function Panel
INSERT INTO body_system_lab_tests (body_system_id, lab_test_id, relevance_score, recommendation_reason)
SELECT
    get_body_system_id('DIGESTIVE_LIVER'),
    get_lab_test_id(test_code),
    relevance_score,
    recommendation_reason
FROM (VALUES
    ('ALT', 1.00, 'Primary marker of hepatocellular injury'),
    ('AST', 1.00, 'Hepatocellular injury and hepatitis screening'),
    ('ALP', 0.95, 'Cholestatic liver disease and bile duct obstruction'),
    ('TBIL', 0.95, 'Jaundice evaluation and liver function'),
    ('DBIL', 0.90, 'Conjugated vs unconjugated hyperbilirubinemia'),
    ('ALB', 0.90, 'Liver synthetic function and nutritional status'),
    ('TP', 0.85, 'Total protein for liver synthetic function'),
    ('GGT', 0.85, 'Confirm hepatobiliary origin of elevated ALP'),
    ('PT', 0.80, 'Liver synthetic function (clotting factors)'),
    ('INR', 0.80, 'Standardized measure of coagulation')
) AS t(test_code, relevance_score, recommendation_reason)
WHERE get_lab_test_id(test_code) IS NOT NULL;

-- CARDIOVASCULAR SYSTEM → Cardiac Markers
INSERT INTO body_system_lab_tests (body_system_id, lab_test_id, relevance_score, recommendation_reason)
SELECT
    get_body_system_id('CARDIOVASCULAR_HEART'),
    get_lab_test_id(test_code),
    relevance_score,
    recommendation_reason
FROM (VALUES
    ('TROP', 1.00, 'Gold standard for myocardial infarction diagnosis'),
    ('CK', 0.95, 'Muscle damage including cardiac muscle'),
    ('CKMB', 0.95, 'Cardiac-specific creatine kinase isoenzyme'),
    ('BNP', 0.90, 'Heart failure screening and severity assessment'),
    ('NTPROBNP', 0.90, 'Heart failure diagnosis with longer half-life than BNP'),
    ('CHOL', 0.85, 'Cardiovascular risk assessment'),
    ('LDL', 0.85, 'Primary target for CVD risk reduction'),
    ('HDL', 0.80, 'Protective cholesterol fraction'),
    ('TG', 0.80, 'Triglycerides for lipid panel completion')
) AS t(test_code, relevance_score, recommendation_reason)
WHERE get_lab_test_id(test_code) IS NOT NULL;

-- RESPIRATORY SYSTEM → Pulmonary Function
INSERT INTO body_system_lab_tests (body_system_id, lab_test_id, relevance_score, recommendation_reason)
SELECT
    get_body_system_id('RESPIRATORY_LUNGS'),
    get_lab_test_id(test_code),
    relevance_score,
    recommendation_reason
FROM (VALUES
    ('DDIMER', 1.00, 'Pulmonary embolism screening (high sensitivity)'),
    ('ABG', 0.95, 'Acid-base status and oxygenation assessment')
) AS t(test_code, relevance_score, recommendation_reason)
WHERE get_lab_test_id(test_code) IS NOT NULL;

-- URINARY SYSTEM → Renal Function Panel
INSERT INTO body_system_lab_tests (body_system_id, lab_test_id, relevance_score, recommendation_reason)
SELECT
    get_body_system_id('URINARY_KIDNEYS'),
    get_lab_test_id(test_code),
    relevance_score,
    recommendation_reason
FROM (VALUES
    ('CREAT', 1.00, 'Primary marker of kidney function'),
    ('BUN', 1.00, 'Renal function and hydration status'),
    ('NA', 0.95, 'Sodium balance and renal tubular function'),
    ('K', 0.95, 'Potassium balance in renal disease'),
    ('CL', 0.90, 'Chloride for electrolyte panel'),
    ('CO2', 0.90, 'Bicarbonate for acid-base assessment'),
    ('CA', 0.85, 'Calcium metabolism in CKD'),
    ('PHOS', 0.85, 'Phosphate regulation in renal failure'),
    ('MG', 0.80, 'Magnesium in renal disease')
) AS t(test_code, relevance_score, recommendation_reason)
WHERE get_lab_test_id(test_code) IS NOT NULL;

-- PANCREAS → Pancreatic Enzymes
INSERT INTO body_system_lab_tests (body_system_id, lab_test_id, relevance_score, recommendation_reason)
SELECT
    get_body_system_id('DIGESTIVE_PANCREAS'),
    get_lab_test_id(test_code),
    relevance_score,
    recommendation_reason
FROM (VALUES
    ('AMY', 1.00, 'Pancreatic inflammation (pancreatitis)'),
    ('LIP', 1.00, 'More specific than amylase for pancreatitis'),
    ('GLU', 0.90, 'Pancreatic endocrine function (diabetes screening)')
) AS t(test_code, relevance_score, recommendation_reason)
WHERE get_lab_test_id(test_code) IS NOT NULL;

-- THYROID → Thyroid Function Panel
INSERT INTO body_system_lab_tests (body_system_id, lab_test_id, relevance_score, recommendation_reason)
SELECT
    get_body_system_id('HEAD_NECK_THYROID'),
    get_lab_test_id(test_code),
    relevance_score,
    recommendation_reason
FROM (VALUES
    ('TSH', 1.00, 'Primary screening test for thyroid function'),
    ('FT4', 0.95, 'Free thyroxine for hypothyroidism/hyperthyroidism'),
    ('FT3', 0.85, 'Free triiodothyronine in hyperthyroidism')
) AS t(test_code, relevance_score, recommendation_reason)
WHERE get_lab_test_id(test_code) IS NOT NULL;

-- MUSCULOSKELETAL → Bone and Muscle Markers
INSERT INTO body_system_lab_tests (body_system_id, lab_test_id, relevance_score, recommendation_reason)
SELECT
    get_body_system_id('MUSCULOSKELETAL'),
    get_lab_test_id(test_code),
    relevance_score,
    recommendation_reason
FROM (VALUES
    ('CA', 1.00, 'Bone metabolism and mineral balance'),
    ('PHOS', 0.95, 'Phosphate for bone health'),
    ('ALP', 0.95, 'Bone turnover and osteoblastic activity'),
    ('CK', 0.90, 'Muscle damage and rhabdomyolysis'),
    ('VD', 0.85, 'Vitamin D for bone health'),
    ('ESR', 0.80, 'Inflammatory arthropathies'),
    ('CRP', 0.80, 'Acute inflammation in musculoskeletal disease')
) AS t(test_code, relevance_score, recommendation_reason)
WHERE get_lab_test_id(test_code) IS NOT NULL;

-- HEMATOLOGIC SYSTEM (general) → Complete Blood Count
INSERT INTO body_system_lab_tests (body_system_id, lab_test_id, relevance_score, recommendation_reason)
SELECT
    get_body_system_id('LYMPHATIC'),
    get_lab_test_id(test_code),
    relevance_score,
    recommendation_reason
FROM (VALUES
    ('CBC', 1.00, 'Complete blood count for hematologic assessment'),
    ('WBC', 1.00, 'White blood cell count for infection/inflammation'),
    ('HGB', 0.95, 'Hemoglobin for anemia evaluation'),
    ('HCT', 0.95, 'Hematocrit for blood volume assessment'),
    ('PLT', 0.95, 'Platelet count for clotting function'),
    ('RBC', 0.90, 'Red blood cell count')
) AS t(test_code, relevance_score, recommendation_reason)
WHERE get_lab_test_id(test_code) IS NOT NULL;

-- ENDOCRINE SYSTEM → Metabolic Panel
INSERT INTO body_system_lab_tests (body_system_id, lab_test_id, relevance_score, recommendation_reason)
SELECT
    get_body_system_id('ENDOCRINE'),
    get_lab_test_id(test_code),
    relevance_score,
    recommendation_reason
FROM (VALUES
    ('GLU', 1.00, 'Diabetes screening and glucose metabolism'),
    ('HBA1C', 1.00, 'Long-term glycemic control (3-month average)'),
    ('TSH', 0.95, 'Thyroid function screening'),
    ('CORT', 0.80, 'Adrenal function (Cushing/Addison disease)')
) AS t(test_code, relevance_score, recommendation_reason)
WHERE get_lab_test_id(test_code) IS NOT NULL;

-- GALLBLADDER → Biliary Obstruction
INSERT INTO body_system_lab_tests (body_system_id, lab_test_id, relevance_score, recommendation_reason)
SELECT
    get_body_system_id('DIGESTIVE_GALLBLADDER'),
    get_lab_test_id(test_code),
    relevance_score,
    recommendation_reason
FROM (VALUES
    ('ALP', 1.00, 'Cholestatic pattern in biliary obstruction'),
    ('GGT', 1.00, 'Confirms hepatobiliary origin of elevated ALP'),
    ('TBIL', 0.95, 'Conjugated hyperbilirubinemia in obstruction'),
    ('DBIL', 0.95, 'Direct bilirubin elevated in cholestasis'),
    ('ALT', 0.85, 'May be mildly elevated in biliary disease'),
    ('AST', 0.85, 'May be mildly elevated in biliary disease')
) AS t(test_code, relevance_score, recommendation_reason)
WHERE get_lab_test_id(test_code) IS NOT NULL;

-- SPLEEN → Hematologic Function
INSERT INTO body_system_lab_tests (body_system_id, lab_test_id, relevance_score, recommendation_reason)
SELECT
    get_body_system_id('DIGESTIVE_SPLEEN'),
    get_lab_test_id(test_code),
    relevance_score,
    recommendation_reason
FROM (VALUES
    ('CBC', 1.00, 'Cytopenias from hypersplenism'),
    ('PLT', 0.95, 'Thrombocytopenia in splenic sequestration'),
    ('WBC', 0.90, 'Leukopenia from splenic dysfunction')
) AS t(test_code, relevance_score, recommendation_reason)
WHERE get_lab_test_id(test_code) IS NOT NULL;

-- STOMACH → GI Bleeding and Anemia
INSERT INTO body_system_lab_tests (body_system_id, lab_test_id, relevance_score, recommendation_reason)
SELECT
    get_body_system_id('DIGESTIVE_STOMACH'),
    get_lab_test_id(test_code),
    relevance_score,
    recommendation_reason
FROM (VALUES
    ('HGB', 1.00, 'Anemia from chronic GI bleeding'),
    ('HCT', 0.95, 'Hematocrit in acute GI hemorrhage'),
    ('FE', 0.90, 'Iron deficiency from chronic blood loss'),
    ('CBC', 0.85, 'Complete assessment of blood loss')
) AS t(test_code, relevance_score, recommendation_reason)
WHERE get_lab_test_id(test_code) IS NOT NULL;

-- BRAIN/NEUROLOGICAL → Metabolic Encephalopathy Workup
INSERT INTO body_system_lab_tests (body_system_id, lab_test_id, relevance_score, recommendation_reason)
SELECT
    get_body_system_id('NEUROLOGICAL_CENTRAL'),
    get_lab_test_id(test_code),
    relevance_score,
    recommendation_reason
FROM (VALUES
    ('GLU', 1.00, 'Hypoglycemia/hyperglycemia causing altered mental status'),
    ('NA', 0.95, 'Hyponatremia/hypernatremia and confusion'),
    ('CA', 0.90, 'Hypercalcemia causing altered mental status'),
    ('NH3', 0.85, 'Hepatic encephalopathy (ammonia levels)')
) AS t(test_code, relevance_score, recommendation_reason)
WHERE get_lab_test_id(test_code) IS NOT NULL;

-- Drop helper functions
DROP FUNCTION IF EXISTS get_body_system_id(VARCHAR);
DROP FUNCTION IF EXISTS get_lab_test_id(VARCHAR);

-- Verification query
SELECT
    bs.system_name,
    lt.test_name,
    bslt.relevance_score,
    bslt.recommendation_reason
FROM body_system_lab_tests bslt
JOIN body_systems bs ON bslt.body_system_id = bs.id
LEFT JOIN lab_tests lt ON bslt.lab_test_id = lt.id
ORDER BY bs.system_name, bslt.relevance_score DESC;
