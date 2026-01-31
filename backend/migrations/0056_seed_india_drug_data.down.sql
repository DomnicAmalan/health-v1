-- Rollback: Remove India drug seed data

-- Remove module rules
DELETE FROM field_validations WHERE module_name = 'pharmacy' AND region_id IN (SELECT id FROM geographic_regions WHERE code = 'IND');
DELETE FROM module_rules WHERE module_name = 'pharmacy' AND region_id IN (SELECT id FROM geographic_regions WHERE code = 'IND');

-- Remove drug data
DELETE FROM drug_allergy_mapping WHERE drug_id IN (SELECT id FROM drug_master WHERE catalog_id = 'c0000000-0000-0000-0000-000000000001'::UUID);
DELETE FROM drug_contraindications WHERE drug_id IN (SELECT id FROM drug_master WHERE catalog_id = 'c0000000-0000-0000-0000-000000000001'::UUID);
DELETE FROM drug_interactions WHERE catalog_id = 'c0000000-0000-0000-0000-000000000001'::UUID;
DELETE FROM drug_master WHERE catalog_id = 'c0000000-0000-0000-0000-000000000001'::UUID;
DELETE FROM drug_schedules WHERE id IN (
    'b0000000-0000-0000-0000-000000000001'::UUID,
    'b0000000-0000-0000-0000-000000000002'::UUID,
    'b0000000-0000-0000-0000-000000000003'::UUID,
    'b0000000-0000-0000-0000-000000000004'::UUID,
    'b0000000-0000-0000-0000-000000000005'::UUID
);
DELETE FROM drug_catalogs WHERE id = 'c0000000-0000-0000-0000-000000000001'::UUID;

-- Note: We don't remove geographic_regions as they may be used elsewhere
