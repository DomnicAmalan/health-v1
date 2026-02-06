-- Sample appointments for testing
-- Uses fictional patients and creates realistic appointment scenarios

-- Insert sample appointments (using placeholder provider ID)
INSERT INTO appointments (
    id, organization_id, patient_id, provider_id,
    appointment_type, scheduled_datetime, duration_minutes, scheduled_end_datetime,
    location_name, room, department, status, reason, chief_complaint
)
VALUES
    -- Today's appointments
    (
        '20000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000010',
        'follow_up',
        NOW() + INTERVAL '2 hours',
        30,
        NOW() + INTERVAL '2 hours 30 minutes',
        'Main Clinic',
        'Room 101',
        'Internal Medicine',
        'scheduled',
        'Follow-up for hypertension',
        'Blood pressure check'
    ),
    (
        '20000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000010',
        'new_patient',
        NOW() + INTERVAL '4 hours',
        45,
        NOW() + INTERVAL '4 hours 45 minutes',
        'Main Clinic',
        'Room 102',
        'Family Medicine',
        'scheduled',
        'New patient visit',
        'Annual physical exam'
    ),
    -- Tomorrow's appointments
    (
        '20000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000010',
        'follow_up',
        NOW() + INTERVAL '1 day 3 hours',
        30,
        NOW() + INTERVAL '1 day 3 hours 30 minutes',
        'Main Clinic',
        'Room 103',
        'Cardiology',
        'scheduled',
        'Follow-up EKG results',
        'Chest pain evaluation'
    ),
    (
        '20000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000010',
        'urgent',
        NOW() + INTERVAL '1 day 1 hour',
        30,
        NOW() + INTERVAL '1 day 1 hour 30 minutes',
        'Main Clinic',
        'Room 104',
        'Urgent Care',
        'scheduled',
        'Urgent care visit',
        'Fever and cough'
    ),
    -- Past appointment (completed)
    (
        '20000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000010',
        'follow_up',
        NOW() - INTERVAL '2 days',
        30,
        NOW() - INTERVAL '2 days' + INTERVAL '30 minutes',
        'Main Clinic',
        'Room 105',
        'Endocrinology',
        'completed',
        'Diabetes management',
        'Follow-up on blood sugar'
    )
ON CONFLICT (id) DO NOTHING;

COMMIT;
