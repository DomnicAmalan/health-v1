-- Sample patient data for testing
-- These are fictional patients with realistic data

-- Insert sample patients
INSERT INTO ehr_patients (id, ien, organization_id, mrn, last_name, first_name, date_of_birth, gender, ssn_last_four, email, phone_mobile, address_line1, city, state, zip_code, status)
VALUES
    ('10000000-0000-0000-0000-000000000001', 1001, '00000000-0000-0000-0000-000000000001', 'MRN001', 'Smith', 'John', '1980-05-15', 'male', '1234', 'john.smith@example.com', '555-0101', '123 Main St', 'Springfield', 'IL', '62701', 'active'),
    ('10000000-0000-0000-0000-000000000002', 1002, '00000000-0000-0000-0000-000000000001', 'MRN002', 'Johnson', 'Emily', '1992-08-22', 'female', '5678', 'emily.johnson@example.com', '555-0102', '456 Oak Ave', 'Springfield', 'IL', '62702', 'active'),
    ('10000000-0000-0000-0000-000000000003', 1003, '00000000-0000-0000-0000-000000000001', 'MRN003', 'Williams', 'Michael', '1975-03-10', 'male', '9012', 'michael.williams@example.com', '555-0103', '789 Elm St', 'Springfield', 'IL', '62703', 'active'),
    ('10000000-0000-0000-0000-000000000004', 1004, '00000000-0000-0000-0000-000000000001', 'MRN004', 'Brown', 'Sarah', '1988-11-30', 'female', '3456', 'sarah.brown@example.com', '555-0104', '321 Pine Rd', 'Springfield', 'IL', '62704', 'active'),
    ('10000000-0000-0000-0000-000000000005', 1005, '00000000-0000-0000-0000-000000000001', 'MRN005', 'Davis', 'Robert', '1965-07-18', 'male', '7890', 'robert.davis@example.com', '555-0105', '654 Maple Dr', 'Springfield', 'IL', '62705', 'active')
ON CONFLICT (organization_id, mrn) DO NOTHING;

COMMIT;
