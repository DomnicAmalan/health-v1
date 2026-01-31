-- Seed Billing Data
-- GST Tax Codes (SAC for Healthcare Services) and Common Service Categories

-- Healthcare Service SAC Codes
INSERT INTO tax_codes (code, code_type, description, default_rate, effective_from) VALUES
-- Healthcare Services (Chapter 99)
('999311', 'SAC', 'Inpatient services (Room, Board, Nursing)', 0.00, '2017-07-01'),
('999312', 'SAC', 'Outpatient clinical services', 0.00, '2017-07-01'),
('999313', 'SAC', 'Medical laboratory and diagnostic imaging services', 5.00, '2017-07-01'),
('999314', 'SAC', 'Ambulance services', 0.00, '2017-07-01'),
('999315', 'SAC', 'Residential health facilities services', 0.00, '2017-07-01'),
('999319', 'SAC', 'Other human health services', 18.00, '2017-07-01'),

-- Pharmacy HSN Codes
('3001', 'HSN', 'Pharmaceutical goods - glands, organs dried', 5.00, '2017-07-01'),
('3002', 'HSN', 'Human blood, vaccines, toxins', 5.00, '2017-07-01'),
('3003', 'HSN', 'Medicaments (not 3002/3004/3006)', 12.00, '2017-07-01'),
('3004', 'HSN', 'Medicaments for therapeutic/prophylactic use', 12.00, '2017-07-01'),
('3005', 'HSN', 'Wadding, gauze, bandages, first-aid kits', 12.00, '2017-07-01'),
('3006', 'HSN', 'Pharmaceutical goods (sutures, dental cements)', 12.00, '2017-07-01'),

-- Medical Equipment HSN Codes
('9018', 'HSN', 'Instruments for medical, surgical use', 12.00, '2017-07-01'),
('9019', 'HSN', 'Mechano-therapy appliances, massage apparatus', 18.00, '2017-07-01'),
('9021', 'HSN', 'Orthopaedic appliances, hearing aids, pacemakers', 12.00, '2017-07-01'),
('9022', 'HSN', 'X-ray apparatus, radiation equipment', 18.00, '2017-07-01'),

-- Laboratory Services
('998814', 'SAC', 'Laboratory testing and analysis services', 18.00, '2017-07-01'),
('998815', 'SAC', 'Technical testing and analysis services', 18.00, '2017-07-01'),

-- Other Healthcare Related
('997311', 'SAC', 'Healthcare consulting services', 18.00, '2017-07-01'),
('997319', 'SAC', 'Other healthcare-related services', 18.00, '2017-07-01'),

-- Food Services (Hospital Canteen)
('996331', 'SAC', 'Food preparation services (canteen)', 5.00, '2017-07-01'),

-- Accommodation (Patient Attendant)
('996311', 'SAC', 'Room/accommodation services', 12.00, '2017-07-01')
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    default_rate = EXCLUDED.default_rate;

-- Note: Most healthcare services are exempt from GST (0%) in India
-- This seed data can be customized per organization needs
