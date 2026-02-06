-- Seed data for lab tests and panels
-- Run after migrations to populate master data

-- Insert lab tests (Hematology)
INSERT INTO lab_tests (organization_id, test_code, test_name, test_name_short, loinc_code, category, specimen_type, specimen_volume, container_type, container_color, turnaround_time_hours, requires_fasting, result_type, result_unit, is_active, method_name, department)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'CBC', 'Complete Blood Count', 'CBC', '58410-2', 'Hematology', 'Whole Blood', '3 mL', 'EDTA Tube', 'Lavender', 2, false, 'Numeric', 'cells/μL', true, 'Automated Analyzer', 'Laboratory'),
    ('00000000-0000-0000-0000-000000000001', 'HGB', 'Hemoglobin', 'Hgb', '718-7', 'Hematology', 'Whole Blood', '3 mL', 'EDTA Tube', 'Lavender', 2, false, 'Numeric', 'g/dL', true, 'Automated Analyzer', 'Laboratory'),
    ('00000000-0000-0000-0000-000000000001', 'HCT', 'Hematocrit', 'Hct', '4544-3', 'Hematology', 'Whole Blood', '3 mL', 'EDTA Tube', 'Lavender', 2, false, 'Numeric', '%', true, 'Automated Analyzer', 'Laboratory'),
    ('00000000-0000-0000-0000-000000000001', 'WBC', 'White Blood Cell Count', 'WBC', '6690-2', 'Hematology', 'Whole Blood', '3 mL', 'EDTA Tube', 'Lavender', 2, false, 'Numeric', 'cells/μL', true, 'Automated Analyzer', 'Laboratory'),
    ('00000000-0000-0000-0000-000000000001', 'PLT', 'Platelet Count', 'Plt', '777-3', 'Hematology', 'Whole Blood', '3 mL', 'EDTA Tube', 'Lavender', 2, false, 'Numeric', 'cells/μL', true, 'Automated Analyzer', 'Laboratory'),
    ('00000000-0000-0000-0000-000000000001', 'ESR', 'Erythrocyte Sedimentation Rate', 'ESR', '4537-7', 'Hematology', 'Whole Blood', '3 mL', 'EDTA Tube', 'Lavender', 1, false, 'Numeric', 'mm/hr', true, 'Westergren Method', 'Laboratory')
ON CONFLICT (organization_id, test_code) DO NOTHING;

-- Insert lab tests (Biochemistry)
INSERT INTO lab_tests (organization_id, test_code, test_name, test_name_short, loinc_code, category, specimen_type, specimen_volume, container_type, container_color, turnaround_time_hours, requires_fasting, result_type, result_unit, is_active, method_name, department)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'GLU', 'Glucose', 'Glucose', '2345-7', 'Biochemistry', 'Serum', '2 mL', 'SST Tube', 'Gold', 2, true, 'Numeric', 'mg/dL', true, 'Enzymatic', 'Laboratory'),
    ('00000000-0000-0000-0000-000000000001', 'BUN', 'Blood Urea Nitrogen', 'BUN', '3094-0', 'Biochemistry', 'Serum', '2 mL', 'SST Tube', 'Gold', 2, false, 'Numeric', 'mg/dL', true, 'Enzymatic', 'Laboratory'),
    ('00000000-0000-0000-0000-000000000001', 'CREAT', 'Creatinine', 'Creat', '2160-0', 'Biochemistry', 'Serum', '2 mL', 'SST Tube', 'Gold', 2, false, 'Numeric', 'mg/dL', true, 'Enzymatic', 'Laboratory'),
    ('00000000-0000-0000-0000-000000000001', 'NA', 'Sodium', 'Na', '2951-2', 'Biochemistry', 'Serum', '2 mL', 'SST Tube', 'Gold', 2, false, 'Numeric', 'mmol/L', true, 'ISE', 'Laboratory'),
    ('00000000-0000-0000-0000-000000000001', 'K', 'Potassium', 'K', '2823-3', 'Biochemistry', 'Serum', '2 mL', 'SST Tube', 'Gold', 2, false, 'Numeric', 'mmol/L', true, 'ISE', 'Laboratory'),
    ('00000000-0000-0000-0000-000000000001', 'CL', 'Chloride', 'Cl', '2075-0', 'Biochemistry', 'Serum', '2 mL', 'SST Tube', 'Gold', 2, false, 'Numeric', 'mmol/L', true, 'ISE', 'Laboratory'),
    ('00000000-0000-0000-0000-000000000001', 'ALT', 'Alanine Aminotransferase', 'ALT', '1742-6', 'Biochemistry', 'Serum', '2 mL', 'SST Tube', 'Gold', 4, false, 'Numeric', 'U/L', true, 'Enzymatic', 'Laboratory'),
    ('00000000-0000-0000-0000-000000000001', 'AST', 'Aspartate Aminotransferase', 'AST', '1920-8', 'Biochemistry', 'Serum', '2 mL', 'SST Tube', 'Gold', 4, false, 'Numeric', 'U/L', true, 'Enzymatic', 'Laboratory'),
    ('00000000-0000-0000-0000-000000000001', 'TBIL', 'Total Bilirubin', 'T.Bil', '1975-2', 'Biochemistry', 'Serum', '2 mL', 'SST Tube', 'Gold', 4, false, 'Numeric', 'mg/dL', true, 'Colorimetric', 'Laboratory'),
    ('00000000-0000-0000-0000-000000000001', 'ALKP', 'Alkaline Phosphatase', 'ALP', '6768-6', 'Biochemistry', 'Serum', '2 mL', 'SST Tube', 'Gold', 4, false, 'Numeric', 'U/L', true, 'Enzymatic', 'Laboratory')
ON CONFLICT (organization_id, test_code) DO NOTHING;

-- Insert lab tests (Lipid Panel)
INSERT INTO lab_tests (organization_id, test_code, test_name, test_name_short, loinc_code, category, specimen_type, specimen_volume, container_type, container_color, turnaround_time_hours, requires_fasting, result_type, result_unit, is_active, method_name, department)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'CHOL', 'Total Cholesterol', 'Chol', '2093-3', 'Biochemistry', 'Serum', '2 mL', 'SST Tube', 'Gold', 4, true, 'Numeric', 'mg/dL', true, 'Enzymatic', 'Laboratory'),
    ('00000000-0000-0000-0000-000000000001', 'TRIG', 'Triglycerides', 'Trig', '2571-8', 'Biochemistry', 'Serum', '2 mL', 'SST Tube', 'Gold', 4, true, 'Numeric', 'mg/dL', true, 'Enzymatic', 'Laboratory'),
    ('00000000-0000-0000-0000-000000000001', 'HDL', 'High Density Lipoprotein', 'HDL', '2085-9', 'Biochemistry', 'Serum', '2 mL', 'SST Tube', 'Gold', 4, true, 'Numeric', 'mg/dL', true, 'Enzymatic', 'Laboratory'),
    ('00000000-0000-0000-0000-000000000001', 'LDL', 'Low Density Lipoprotein', 'LDL', '2089-1', 'Biochemistry', 'Serum', '2 mL', 'SST Tube', 'Gold', 4, true, 'Numeric', 'mg/dL', true, 'Calculated', 'Laboratory')
ON CONFLICT (organization_id, test_code) DO NOTHING;

-- Insert lab panels
INSERT INTO lab_panels (organization_id, panel_code, panel_name, description, category, is_active)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'CBC_PANEL', 'Complete Blood Count Panel', 'Comprehensive hematology panel', 'Hematology', true),
    ('00000000-0000-0000-0000-000000000001', 'BMP', 'Basic Metabolic Panel', 'Glucose, BUN, Creatinine, Electrolytes', 'Biochemistry', true),
    ('00000000-0000-0000-0000-000000000001', 'LFT', 'Liver Function Tests', 'AST, ALT, Bilirubin, Alkaline Phosphatase', 'Biochemistry', true),
    ('00000000-0000-0000-0000-000000000001', 'LIPID', 'Lipid Panel', 'Total Cholesterol, Triglycerides, HDL, LDL', 'Biochemistry', true)
ON CONFLICT (organization_id, panel_code) DO NOTHING;

-- Link tests to panels (CBC Panel)
INSERT INTO lab_panel_tests (panel_id, test_id, display_order)
SELECT
    (SELECT id FROM lab_panels WHERE panel_code = 'CBC_PANEL' LIMIT 1),
    lt.id,
    ROW_NUMBER() OVER () as display_order
FROM lab_tests lt
WHERE lt.test_code IN ('HGB', 'HCT', 'WBC', 'PLT')
ON CONFLICT (panel_id, test_id) DO NOTHING;

-- Link tests to panels (BMP)
INSERT INTO lab_panel_tests (panel_id, test_id, display_order)
SELECT
    (SELECT id FROM lab_panels WHERE panel_code = 'BMP' LIMIT 1),
    lt.id,
    ROW_NUMBER() OVER () as display_order
FROM lab_tests lt
WHERE lt.test_code IN ('GLU', 'BUN', 'CREAT', 'NA', 'K', 'CL')
ON CONFLICT (panel_id, test_id) DO NOTHING;

-- Link tests to panels (LFT)
INSERT INTO lab_panel_tests (panel_id, test_id, display_order)
SELECT
    (SELECT id FROM lab_panels WHERE panel_code = 'LFT' LIMIT 1),
    lt.id,
    ROW_NUMBER() OVER () as display_order
FROM lab_tests lt
WHERE lt.test_code IN ('ALT', 'AST', 'TBIL', 'ALKP')
ON CONFLICT (panel_id, test_id) DO NOTHING;

-- Link tests to panels (Lipid Panel)
INSERT INTO lab_panel_tests (panel_id, test_id, display_order)
SELECT
    (SELECT id FROM lab_panels WHERE panel_code = 'LIPID' LIMIT 1),
    lt.id,
    ROW_NUMBER() OVER () as display_order
FROM lab_tests lt
WHERE lt.test_code IN ('CHOL', 'TRIG', 'HDL', 'LDL')
ON CONFLICT (panel_id, test_id) DO NOTHING;

-- Insert reference ranges
-- Hemoglobin ranges
INSERT INTO lab_reference_ranges (test_id, age_min_years, age_max_years, gender, reference_min, reference_max, unit, interpretation, is_critical_low, is_critical_high)
SELECT id, 18, 120, 'male', 13.5, 17.5, 'g/dL', 'Normal range for adult males', true, false FROM lab_tests WHERE test_code = 'HGB'
ON CONFLICT DO NOTHING;

INSERT INTO lab_reference_ranges (test_id, age_min_years, age_max_years, gender, reference_min, reference_max, unit, interpretation, is_critical_low, is_critical_high)
SELECT id, 18, 120, 'female', 12.0, 16.0, 'g/dL', 'Normal range for adult females', true, false FROM lab_tests WHERE test_code = 'HGB'
ON CONFLICT DO NOTHING;

-- WBC ranges
INSERT INTO lab_reference_ranges (test_id, age_min_years, age_max_years, gender, reference_min, reference_max, unit, interpretation, is_critical_low, is_critical_high)
SELECT id, 18, 120, 'all', 4000, 11000, 'cells/μL', 'Normal WBC count', true, true FROM lab_tests WHERE test_code = 'WBC'
ON CONFLICT DO NOTHING;

-- Glucose ranges
INSERT INTO lab_reference_ranges (test_id, age_min_years, age_max_years, gender, reference_min, reference_max, unit, interpretation, is_critical_low, is_critical_high)
SELECT id, 18, 120, 'all', 70, 100, 'mg/dL', 'Normal fasting glucose', true, true FROM lab_tests WHERE test_code = 'GLU'
ON CONFLICT DO NOTHING;

-- Creatinine ranges
INSERT INTO lab_reference_ranges (test_id, age_min_years, age_max_years, gender, reference_min, reference_max, unit, interpretation, is_critical_low, is_critical_high)
SELECT id, 18, 120, 'male', 0.7, 1.3, 'mg/dL', 'Normal creatinine for males', false, true FROM lab_tests WHERE test_code = 'CREAT'
ON CONFLICT DO NOTHING;

INSERT INTO lab_reference_ranges (test_id, age_min_years, age_max_years, gender, reference_min, reference_max, unit, interpretation, is_critical_low, is_critical_high)
SELECT id, 18, 120, 'female', 0.6, 1.1, 'mg/dL', 'Normal creatinine for females', false, true FROM lab_tests WHERE test_code = 'CREAT'
ON CONFLICT DO NOTHING;

-- Potassium ranges (critical!)
INSERT INTO lab_reference_ranges (test_id, age_min_years, age_max_years, gender, reference_min, reference_max, unit, interpretation, is_critical_low, is_critical_high)
SELECT id, 18, 120, 'all', 3.5, 5.0, 'mmol/L', 'Normal potassium range', true, true FROM lab_tests WHERE test_code = 'K'
ON CONFLICT DO NOTHING;

-- Sodium ranges
INSERT INTO lab_reference_ranges (test_id, age_min_years, age_max_years, gender, reference_min, reference_max, unit, interpretation, is_critical_low, is_critical_high)
SELECT id, 18, 120, 'all', 136, 145, 'mmol/L', 'Normal sodium range', true, true FROM lab_tests WHERE test_code = 'NA'
ON CONFLICT DO NOTHING;

COMMIT;
