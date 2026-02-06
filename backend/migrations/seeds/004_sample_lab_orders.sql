-- Sample lab orders for testing
-- Creates realistic lab order scenarios with different statuses

-- Insert sample lab orders
INSERT INTO lab_orders (
    id, organization_id, order_number, patient_id,
    ordering_provider_id, ordering_provider_name, ordering_datetime,
    priority, clinical_indication, status
)
VALUES
    -- Pending lab order (just created)
    (
        '30000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        'LAB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-001',
        '10000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000010',
        'Dr. Smith',
        NOW() - INTERVAL '30 minutes',
        'routine',
        'Routine follow-up for hypertension',
        'pending'
    ),
    -- Collected lab order (specimen collected, awaiting lab)
    (
        '30000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'LAB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-002',
        '10000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000010',
        'Dr. Johnson',
        NOW() - INTERVAL '2 hours',
        'routine',
        'Annual physical exam labs',
        'collected'
    ),
    -- In-lab order (being processed)
    (
        '30000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000001',
        'LAB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-003',
        '10000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000010',
        'Dr. Williams',
        NOW() - INTERVAL '4 hours',
        'urgent',
        'Chest pain workup',
        'received'
    ),
    -- Completed lab order (results ready)
    (
        '30000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000001',
        'LAB-' || TO_CHAR(NOW() - INTERVAL '1 day', 'YYYYMMDD') || '-001',
        '10000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000010',
        'Dr. Brown',
        NOW() - INTERVAL '1 day 6 hours',
        'routine',
        'Pre-operative clearance',
        'completed'
    ),
    -- STAT order (urgent, high priority)
    (
        '30000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000001',
        'LAB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-004',
        '10000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000010',
        'Dr. Davis',
        NOW() - INTERVAL '15 minutes',
        'stat',
        'Suspected hyperkalemia - cardiac symptoms',
        'pending'
    )
ON CONFLICT (organization_id, order_number) DO NOTHING;

-- Insert lab order items (tests for each order)
-- Order 1: BMP (Basic Metabolic Panel)
INSERT INTO lab_order_items (order_id, test_id, test_name, specimen_id, status)
SELECT
    '30000000-0000-0000-0000-000000000001',
    id,
    test_name,
    'SPEC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-001',
    'pending'
FROM lab_tests
WHERE test_code IN ('GLU', 'BUN', 'CREAT', 'NA', 'K', 'CL')
ON CONFLICT DO NOTHING;

-- Order 2: CBC + Lipid Panel
INSERT INTO lab_order_items (order_id, test_id, test_name, specimen_id, status)
SELECT
    '30000000-0000-0000-0000-000000000002',
    id,
    test_name,
    'SPEC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-002A',
    'collected'
FROM lab_tests
WHERE test_code IN ('HGB', 'HCT', 'WBC', 'PLT')
ON CONFLICT DO NOTHING;

INSERT INTO lab_order_items (order_id, test_id, test_name, specimen_id, status)
SELECT
    '30000000-0000-0000-0000-000000000002',
    id,
    test_name,
    'SPEC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-002B',
    'collected'
FROM lab_tests
WHERE test_code IN ('CHOL', 'TRIG', 'HDL', 'LDL')
ON CONFLICT DO NOTHING;

-- Order 3: Cardiac enzymes (in progress)
INSERT INTO lab_order_items (order_id, test_id, test_name, specimen_id, status)
SELECT
    '30000000-0000-0000-0000-000000000003',
    id,
    test_name,
    'SPEC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-003',
    'received'
FROM lab_tests
WHERE test_code IN ('GLU', 'K', 'NA', 'CREAT')
ON CONFLICT DO NOTHING;

-- Order 4: LFT (completed with results)
INSERT INTO lab_order_items (order_id, test_id, test_name, specimen_id, status, result_value, result_unit, is_abnormal, is_critical, resulted_datetime)
SELECT
    '30000000-0000-0000-0000-000000000004',
    id,
    test_name,
    'SPEC-' || TO_CHAR(NOW() - INTERVAL '1 day', 'YYYYMMDD') || '-001',
    'completed',
    CASE
        WHEN test_code = 'ALT' THEN '28'
        WHEN test_code = 'AST' THEN '32'
        WHEN test_code = 'TBIL' THEN '0.8'
        WHEN test_code = 'ALKP' THEN '75'
    END,
    result_unit,
    false,
    false,
    NOW() - INTERVAL '1 day 2 hours'
FROM lab_tests
WHERE test_code IN ('ALT', 'AST', 'TBIL', 'ALKP')
ON CONFLICT DO NOTHING;

-- Order 5: STAT Potassium (critical)
INSERT INTO lab_order_items (order_id, test_id, test_name, specimen_id, status)
SELECT
    '30000000-0000-0000-0000-000000000005',
    id,
    test_name,
    'SPEC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-005',
    'pending'
FROM lab_tests
WHERE test_code IN ('K', 'NA', 'CREAT')
ON CONFLICT DO NOTHING;

COMMIT;
