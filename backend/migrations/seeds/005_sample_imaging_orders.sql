-- Sample imaging/radiology orders for testing
-- Creates realistic imaging order scenarios

-- Insert sample imaging orders
INSERT INTO imaging_orders (
    id, organization_id, order_number, patient_id,
    ordering_provider_id, ordering_provider_name, ordering_datetime,
    study_type, modality, body_part, laterality,
    clinical_indication, priority, status
)
VALUES
    -- Pending X-Ray
    (
        '40000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        'RAD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-001',
        '10000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000010',
        'Dr. Smith',
        NOW() - INTERVAL '1 hour',
        'Chest X-Ray PA and Lateral',
        'XR',
        'Chest',
        NULL,
        'Cough and fever for 3 days. Rule out pneumonia.',
        'routine',
        'pending'
    ),
    -- Scheduled CT Scan
    (
        '40000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'RAD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-002',
        '10000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000010',
        'Dr. Johnson',
        NOW() - INTERVAL '2 hours',
        'CT Head without Contrast',
        'CT',
        'Head',
        NULL,
        'Persistent headaches. Rule out intracranial pathology.',
        'routine',
        'scheduled'
    ),
    -- In Progress MRI
    (
        '40000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000001',
        'RAD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-003',
        '10000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000010',
        'Dr. Williams',
        NOW() - INTERVAL '3 hours',
        'MRI Lumbar Spine without Contrast',
        'MRI',
        'Lumbar Spine',
        NULL,
        'Lower back pain radiating to left leg. Evaluate for disc herniation.',
        'urgent',
        'in_progress'
    ),
    -- Completed with Report
    (
        '40000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000001',
        'RAD-' || TO_CHAR(NOW() - INTERVAL '1 day', 'YYYYMMDD') || '-001',
        '10000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000010',
        'Dr. Brown',
        NOW() - INTERVAL '1 day 6 hours',
        'Ultrasound Abdomen Complete',
        'US',
        'Abdomen',
        NULL,
        'Right upper quadrant pain. Evaluate for cholelithiasis.',
        'routine',
        'completed'
    ),
    -- STAT CT (urgent)
    (
        '40000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000001',
        'RAD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-004',
        '10000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000010',
        'Dr. Davis',
        NOW() - INTERVAL '30 minutes',
        'CT Head without Contrast',
        'CT',
        'Head',
        NULL,
        'Acute onset severe headache. STAT. Rule out intracranial hemorrhage.',
        'stat',
        'pending'
    )
ON CONFLICT (organization_id, order_number) DO NOTHING;

-- Update completed order with report
UPDATE imaging_orders
SET
    report_status = 'final',
    radiologist_id = '00000000-0000-0000-0000-000000000011',
    radiologist_name = 'Dr. Radiologist',
    findings = 'FINDINGS:
The liver demonstrates normal size and echogenicity. No focal lesions identified.
The gallbladder shows multiple small echogenic foci with posterior acoustic shadowing consistent with cholelithiasis. No gallbladder wall thickening or pericholecystic fluid.
The bile ducts are not dilated.
The pancreas is unremarkable.
The spleen and kidneys appear normal.
No free fluid in the abdomen.',
    impression = 'IMPRESSION:
1. Cholelithiasis (gallstones) without evidence of acute cholecystitis.
2. Otherwise unremarkable abdominal ultrasound.',
    recommendations = 'Clinical correlation recommended. If symptomatic, surgical consultation may be appropriate.',
    reported_datetime = NOW() - INTERVAL '1 day 3 hours',
    verified_datetime = NOW() - INTERVAL '1 day 3 hours',
    performed_datetime = NOW() - INTERVAL '1 day 4 hours',
    completed_datetime = NOW() - INTERVAL '1 day 3 hours',
    accession_number = TO_CHAR(NOW() - INTERVAL '1 day', 'YYYYMMDD') || '-ORG-000001',
    pacs_study_instance_uid = '1.2.840.113619.2.55.1.1762295506.1974.1234567890.1',
    series_count = 3,
    image_count = 45
WHERE id = '40000000-0000-0000-0000-000000000004';

COMMIT;
