-- Seed Data: Laboratory Test Catalog
-- Common lab tests and panels for general hospital use

-- ============================================================================
-- HEMATOLOGY TESTS
-- ============================================================================

INSERT INTO lab_tests (
    organization_id, test_code, test_name, test_name_short, loinc_code,
    category, specimen_type, specimen_volume, container_type, container_color,
    turnaround_time_hours, requires_fasting, result_type, result_unit,
    is_active, method_name, department
)
SELECT
    o.id, 'WBC', 'White Blood Cell Count', 'WBC', '6690-2',
    'Hematology', 'Blood', '2-3 mL', 'EDTA tube', 'Purple',
    2, FALSE, 'numeric', '10^9/L',
    TRUE, 'Automated cell counter', 'Hematology'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM lab_tests WHERE test_code = 'WBC' AND organization_id = o.id);

INSERT INTO lab_tests (
    organization_id, test_code, test_name, test_name_short, loinc_code,
    category, specimen_type, specimen_volume, container_type, container_color,
    turnaround_time_hours, requires_fasting, result_type, result_unit,
    is_active, method_name, department
)
SELECT
    o.id, 'RBC', 'Red Blood Cell Count', 'RBC', '789-8',
    'Hematology', 'Blood', '2-3 mL', 'EDTA tube', 'Purple',
    2, FALSE, 'numeric', '10^12/L',
    TRUE, 'Automated cell counter', 'Hematology'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM lab_tests WHERE test_code = 'RBC' AND organization_id = o.id);

INSERT INTO lab_tests (
    organization_id, test_code, test_name, test_name_short, loinc_code,
    category, specimen_type, specimen_volume, container_type, container_color,
    turnaround_time_hours, requires_fasting, result_type, result_unit,
    is_active, method_name, department
)
SELECT
    o.id, 'HGB', 'Hemoglobin', 'Hgb', '718-7',
    'Hematology', 'Blood', '2-3 mL', 'EDTA tube', 'Purple',
    2, FALSE, 'numeric', 'g/dL',
    TRUE, 'Automated cell counter', 'Hematology'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM lab_tests WHERE test_code = 'HGB' AND organization_id = o.id);

INSERT INTO lab_tests (
    organization_id, test_code, test_name, test_name_short, loinc_code,
    category, specimen_type, specimen_volume, container_type, container_color,
    turnaround_time_hours, requires_fasting, result_type, result_unit,
    is_active, method_name, department
)
SELECT
    o.id, 'HCT', 'Hematocrit', 'Hct', '4544-3',
    'Hematology', 'Blood', '2-3 mL', 'EDTA tube', 'Purple',
    2, FALSE, 'numeric', '%',
    TRUE, 'Automated cell counter', 'Hematology'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM lab_tests WHERE test_code = 'HCT' AND organization_id = o.id);

INSERT INTO lab_tests (
    organization_id, test_code, test_name, test_name_short, loinc_code,
    category, specimen_type, specimen_volume, container_type, container_color,
    turnaround_time_hours, requires_fasting, result_type, result_unit,
    is_active, method_name, department
)
SELECT
    o.id, 'PLT', 'Platelet Count', 'Platelets', '777-3',
    'Hematology', 'Blood', '2-3 mL', 'EDTA tube', 'Purple',
    2, FALSE, 'numeric', '10^9/L',
    TRUE, 'Automated cell counter', 'Hematology'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM lab_tests WHERE test_code = 'PLT' AND organization_id = o.id);

-- ============================================================================
-- BIOCHEMISTRY TESTS
-- ============================================================================

INSERT INTO lab_tests (
    organization_id, test_code, test_name, test_name_short, loinc_code,
    category, specimen_type, specimen_volume, container_type, container_color,
    turnaround_time_hours, requires_fasting, result_type, result_unit,
    is_active, method_name, department
)
SELECT
    o.id, 'GLU', 'Glucose', 'Glucose', '2345-7',
    'Biochemistry', 'Blood', '3-5 mL', 'Plain tube', 'Red',
    1, TRUE, 'numeric', 'mg/dL',
    TRUE, 'Enzymatic colorimetric', 'Biochemistry'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM lab_tests WHERE test_code = 'GLU' AND organization_id = o.id);

INSERT INTO lab_tests (
    organization_id, test_code, test_name, test_name_short, loinc_code,
    category, specimen_type, specimen_volume, container_type, container_color,
    turnaround_time_hours, requires_fasting, result_type, result_unit,
    is_active, method_name, department
)
SELECT
    o.id, 'NA', 'Sodium', 'Na', '2951-2',
    'Biochemistry', 'Blood', '3-5 mL', 'Plain tube', 'Red',
    1, FALSE, 'numeric', 'mmol/L',
    TRUE, 'Ion-selective electrode', 'Biochemistry'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM lab_tests WHERE test_code = 'NA' AND organization_id = o.id);

INSERT INTO lab_tests (
    organization_id, test_code, test_name, test_name_short, loinc_code,
    category, specimen_type, specimen_volume, container_type, container_color,
    turnaround_time_hours, requires_fasting, result_type, result_unit,
    is_active, method_name, department
)
SELECT
    o.id, 'K', 'Potassium', 'K', '2823-3',
    'Biochemistry', 'Blood', '3-5 mL', 'Plain tube', 'Red',
    1, FALSE, 'numeric', 'mmol/L',
    TRUE, 'Ion-selective electrode', 'Biochemistry'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM lab_tests WHERE test_code = 'K' AND organization_id = o.id);

INSERT INTO lab_tests (
    organization_id, test_code, test_name, test_name_short, loinc_code,
    category, specimen_type, specimen_volume, container_type, container_color,
    turnaround_time_hours, requires_fasting, result_type, result_unit,
    is_active, method_name, department
)
SELECT
    o.id, 'CL', 'Chloride', 'Cl', '2075-0',
    'Biochemistry', 'Blood', '3-5 mL', 'Plain tube', 'Red',
    1, FALSE, 'numeric', 'mmol/L',
    TRUE, 'Ion-selective electrode', 'Biochemistry'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM lab_tests WHERE test_code = 'CL' AND organization_id = o.id);

INSERT INTO lab_tests (
    organization_id, test_code, test_name, test_name_short, loinc_code,
    category, specimen_type, specimen_volume, container_type, container_color,
    turnaround_time_hours, requires_fasting, result_type, result_unit,
    is_active, method_name, department
)
SELECT
    o.id, 'CO2', 'Carbon Dioxide', 'CO2', '2028-9',
    'Biochemistry', 'Blood', '3-5 mL', 'Plain tube', 'Red',
    1, FALSE, 'numeric', 'mmol/L',
    TRUE, 'Enzymatic', 'Biochemistry'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM lab_tests WHERE test_code = 'CO2' AND organization_id = o.id);

INSERT INTO lab_tests (
    organization_id, test_code, test_name, test_name_short, loinc_code,
    category, specimen_type, specimen_volume, container_type, container_color,
    turnaround_time_hours, requires_fasting, result_type, result_unit,
    is_active, method_name, department
)
SELECT
    o.id, 'BUN', 'Blood Urea Nitrogen', 'BUN', '3094-0',
    'Biochemistry', 'Blood', '3-5 mL', 'Plain tube', 'Red',
    2, FALSE, 'numeric', 'mg/dL',
    TRUE, 'Enzymatic UV', 'Biochemistry'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM lab_tests WHERE test_code = 'BUN' AND organization_id = o.id);

INSERT INTO lab_tests (
    organization_id, test_code, test_name, test_name_short, loinc_code,
    category, specimen_type, specimen_volume, container_type, container_color,
    turnaround_time_hours, requires_fasting, result_type, result_unit,
    is_active, method_name, department
)
SELECT
    o.id, 'CREAT', 'Creatinine', 'Creat', '2160-0',
    'Biochemistry', 'Blood', '3-5 mL', 'Plain tube', 'Red',
    2, FALSE, 'numeric', 'mg/dL',
    TRUE, 'Jaffe method', 'Biochemistry'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM lab_tests WHERE test_code = 'CREAT' AND organization_id = o.id);

-- ============================================================================
-- LIVER FUNCTION TESTS
-- ============================================================================

INSERT INTO lab_tests (
    organization_id, test_code, test_name, test_name_short, loinc_code,
    category, specimen_type, specimen_volume, container_type, container_color,
    turnaround_time_hours, requires_fasting, result_type, result_unit,
    is_active, method_name, department
)
SELECT
    o.id, 'ALT', 'Alanine Aminotransferase', 'ALT', '1742-6',
    'Biochemistry', 'Blood', '3-5 mL', 'Plain tube', 'Red',
    2, FALSE, 'numeric', 'U/L',
    TRUE, 'Enzymatic UV', 'Biochemistry'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM lab_tests WHERE test_code = 'ALT' AND organization_id = o.id);

INSERT INTO lab_tests (
    organization_id, test_code, test_name, test_name_short, loinc_code,
    category, specimen_type, specimen_volume, container_type, container_color,
    turnaround_time_hours, requires_fasting, result_type, result_unit,
    is_active, method_name, department
)
SELECT
    o.id, 'AST', 'Aspartate Aminotransferase', 'AST', '1920-8',
    'Biochemistry', 'Blood', '3-5 mL', 'Plain tube', 'Red',
    2, FALSE, 'numeric', 'U/L',
    TRUE, 'Enzymatic UV', 'Biochemistry'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM lab_tests WHERE test_code = 'AST' AND organization_id = o.id);

INSERT INTO lab_tests (
    organization_id, test_code, test_name, test_name_short, loinc_code,
    category, specimen_type, specimen_volume, container_type, container_color,
    turnaround_time_hours, requires_fasting, result_type, result_unit,
    is_active, method_name, department
)
SELECT
    o.id, 'ALP', 'Alkaline Phosphatase', 'ALP', '6768-6',
    'Biochemistry', 'Blood', '3-5 mL', 'Plain tube', 'Red',
    2, FALSE, 'numeric', 'U/L',
    TRUE, 'Enzymatic colorimetric', 'Biochemistry'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM lab_tests WHERE test_code = 'ALP' AND organization_id = o.id);

INSERT INTO lab_tests (
    organization_id, test_code, test_name, test_name_short, loinc_code,
    category, specimen_type, specimen_volume, container_type, container_color,
    turnaround_time_hours, requires_fasting, result_type, result_unit,
    is_active, method_name, department
)
SELECT
    o.id, 'TBIL', 'Total Bilirubin', 'T.Bil', '1975-2',
    'Biochemistry', 'Blood', '3-5 mL', 'Plain tube', 'Red',
    2, FALSE, 'numeric', 'mg/dL',
    TRUE, 'Diazo method', 'Biochemistry'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM lab_tests WHERE test_code = 'TBIL' AND organization_id = o.id);

-- ============================================================================
-- LAB PANELS
-- ============================================================================

-- Complete Blood Count (CBC)
INSERT INTO lab_panels (organization_id, panel_code, panel_name, description, category, is_active)
SELECT
    o.id, 'CBC', 'Complete Blood Count',
    'Comprehensive blood cell analysis including WBC, RBC, Hemoglobin, Hematocrit, and Platelets',
    'Hematology', TRUE
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM lab_panels WHERE panel_code = 'CBC' AND organization_id = o.id);

-- Link tests to CBC panel
INSERT INTO lab_panel_tests (panel_id, test_id, display_order)
SELECT
    p.id, t.id, 1
FROM lab_panels p
CROSS JOIN lab_tests t
WHERE p.panel_code = 'CBC'
  AND t.test_code = 'WBC'
  AND p.organization_id = t.organization_id
  AND NOT EXISTS (
    SELECT 1 FROM lab_panel_tests
    WHERE panel_id = p.id AND test_id = t.id
  );

INSERT INTO lab_panel_tests (panel_id, test_id, display_order)
SELECT p.id, t.id, 2
FROM lab_panels p CROSS JOIN lab_tests t
WHERE p.panel_code = 'CBC' AND t.test_code = 'RBC' AND p.organization_id = t.organization_id
  AND NOT EXISTS (SELECT 1 FROM lab_panel_tests WHERE panel_id = p.id AND test_id = t.id);

INSERT INTO lab_panel_tests (panel_id, test_id, display_order)
SELECT p.id, t.id, 3
FROM lab_panels p CROSS JOIN lab_tests t
WHERE p.panel_code = 'CBC' AND t.test_code = 'HGB' AND p.organization_id = t.organization_id
  AND NOT EXISTS (SELECT 1 FROM lab_panel_tests WHERE panel_id = p.id AND test_id = t.id);

INSERT INTO lab_panel_tests (panel_id, test_id, display_order)
SELECT p.id, t.id, 4
FROM lab_panels p CROSS JOIN lab_tests t
WHERE p.panel_code = 'CBC' AND t.test_code = 'HCT' AND p.organization_id = t.organization_id
  AND NOT EXISTS (SELECT 1 FROM lab_panel_tests WHERE panel_id = p.id AND test_id = t.id);

INSERT INTO lab_panel_tests (panel_id, test_id, display_order)
SELECT p.id, t.id, 5
FROM lab_panels p CROSS JOIN lab_tests t
WHERE p.panel_code = 'CBC' AND t.test_code = 'PLT' AND p.organization_id = t.organization_id
  AND NOT EXISTS (SELECT 1 FROM lab_panel_tests WHERE panel_id = p.id AND test_id = t.id);

-- Basic Metabolic Panel (BMP)
INSERT INTO lab_panels (organization_id, panel_code, panel_name, description, category, is_active)
SELECT
    o.id, 'BMP', 'Basic Metabolic Panel',
    'Essential chemistry tests: Glucose, Electrolytes (Na, K, Cl, CO2), Kidney function (BUN, Creatinine)',
    'Biochemistry', TRUE
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM lab_panels WHERE panel_code = 'BMP' AND organization_id = o.id);

-- Link tests to BMP
INSERT INTO lab_panel_tests (panel_id, test_id, display_order)
SELECT p.id, t.id, 1 FROM lab_panels p CROSS JOIN lab_tests t WHERE p.panel_code = 'BMP' AND t.test_code = 'GLU' AND p.organization_id = t.organization_id AND NOT EXISTS (SELECT 1 FROM lab_panel_tests WHERE panel_id = p.id AND test_id = t.id);

INSERT INTO lab_panel_tests (panel_id, test_id, display_order)
SELECT p.id, t.id, 2 FROM lab_panels p CROSS JOIN lab_tests t WHERE p.panel_code = 'BMP' AND t.test_code = 'NA' AND p.organization_id = t.organization_id AND NOT EXISTS (SELECT 1 FROM lab_panel_tests WHERE panel_id = p.id AND test_id = t.id);

INSERT INTO lab_panel_tests (panel_id, test_id, display_order)
SELECT p.id, t.id, 3 FROM lab_panels p CROSS JOIN lab_tests t WHERE p.panel_code = 'BMP' AND t.test_code = 'K' AND p.organization_id = t.organization_id AND NOT EXISTS (SELECT 1 FROM lab_panel_tests WHERE panel_id = p.id AND test_id = t.id);

INSERT INTO lab_panel_tests (panel_id, test_id, display_order)
SELECT p.id, t.id, 4 FROM lab_panels p CROSS JOIN lab_tests t WHERE p.panel_code = 'BMP' AND t.test_code = 'CL' AND p.organization_id = t.organization_id AND NOT EXISTS (SELECT 1 FROM lab_panel_tests WHERE panel_id = p.id AND test_id = t.id);

INSERT INTO lab_panel_tests (panel_id, test_id, display_order)
SELECT p.id, t.id, 5 FROM lab_panels p CROSS JOIN lab_tests t WHERE p.panel_code = 'BMP' AND t.test_code = 'CO2' AND p.organization_id = t.organization_id AND NOT EXISTS (SELECT 1 FROM lab_panel_tests WHERE panel_id = p.id AND test_id = t.id);

INSERT INTO lab_panel_tests (panel_id, test_id, display_order)
SELECT p.id, t.id, 6 FROM lab_panels p CROSS JOIN lab_tests t WHERE p.panel_code = 'BMP' AND t.test_code = 'BUN' AND p.organization_id = t.organization_id AND NOT EXISTS (SELECT 1 FROM lab_panel_tests WHERE panel_id = p.id AND test_id = t.id);

INSERT INTO lab_panel_tests (panel_id, test_id, display_order)
SELECT p.id, t.id, 7 FROM lab_panels p CROSS JOIN lab_tests t WHERE p.panel_code = 'BMP' AND t.test_code = 'CREAT' AND p.organization_id = t.organization_id AND NOT EXISTS (SELECT 1 FROM lab_panel_tests WHERE panel_id = p.id AND test_id = t.id);

-- ============================================================================
-- REFERENCE RANGES
-- ============================================================================

-- WBC reference ranges
INSERT INTO lab_reference_ranges (test_id, age_min_years, age_max_years, gender, reference_min, reference_max, unit, critical_min, critical_max)
SELECT t.id, 18, 120, 'all', 4.0, 11.0, '10^9/L', 2.0, 30.0
FROM lab_tests t WHERE t.test_code = 'WBC'
AND NOT EXISTS (SELECT 1 FROM lab_reference_ranges WHERE test_id = t.id AND gender = 'all');

-- Hemoglobin reference ranges (gender-specific)
INSERT INTO lab_reference_ranges (test_id, age_min_years, age_max_years, gender, reference_min, reference_max, unit, critical_min, critical_max)
SELECT t.id, 18, 120, 'male', 13.5, 17.5, 'g/dL', 7.0, 20.0
FROM lab_tests t WHERE t.test_code = 'HGB'
AND NOT EXISTS (SELECT 1 FROM lab_reference_ranges WHERE test_id = t.id AND gender = 'male');

INSERT INTO lab_reference_ranges (test_id, age_min_years, age_max_years, gender, reference_min, reference_max, unit, critical_min, critical_max)
SELECT t.id, 18, 120, 'female', 12.0, 15.5, 'g/dL', 7.0, 20.0
FROM lab_tests t WHERE t.test_code = 'HGB'
AND NOT EXISTS (SELECT 1 FROM lab_reference_ranges WHERE test_id = t.id AND gender = 'female');

-- Glucose reference ranges
INSERT INTO lab_reference_ranges (test_id, age_min_years, age_max_years, gender, reference_min, reference_max, unit, critical_min, critical_max)
SELECT t.id, 18, 120, 'all', 70, 100, 'mg/dL', 40, 500
FROM lab_tests t WHERE t.test_code = 'GLU'
AND NOT EXISTS (SELECT 1 FROM lab_reference_ranges WHERE test_id = t.id AND gender = 'all');

-- Potassium reference ranges (CRITICAL for cardiac function)
INSERT INTO lab_reference_ranges (test_id, age_min_years, age_max_years, gender, reference_min, reference_max, unit, critical_min, critical_max, is_critical_low, is_critical_high)
SELECT t.id, 18, 120, 'all', 3.5, 5.0, 'mmol/L', 2.5, 6.0, TRUE, TRUE
FROM lab_tests t WHERE t.test_code = 'K'
AND NOT EXISTS (SELECT 1 FROM lab_reference_ranges WHERE test_id = t.id AND gender = 'all');

-- Sodium reference ranges
INSERT INTO lab_reference_ranges (test_id, age_min_years, age_max_years, gender, reference_min, reference_max, unit, critical_min, critical_max)
SELECT t.id, 18, 120, 'all', 136, 145, 'mmol/L', 120, 160
FROM lab_tests t WHERE t.test_code = 'NA'
AND NOT EXISTS (SELECT 1 FROM lab_reference_ranges WHERE test_id = t.id AND gender = 'all');
