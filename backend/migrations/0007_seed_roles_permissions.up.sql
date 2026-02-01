-- Migration: Seed initial roles, permissions, and super user
-- Description: Create default roles and permissions, and initial super user
-- Related Entities: 
--   - src/domain/entities/role.rs (Role)
--   - src/domain/entities/permission.rs (Permission)
--   - src/domain/entities/user.rs (User)
--
-- Data Seeded:
--   - Default roles: admin, doctor, nurse, receptionist
--   - Permissions for: patients, users, clinical, orders, results, pharmacy, scheduling, revenue, analytics, settings
--   - Role-permission assignments for doctor, nurse, receptionist
--   - Initial super user: admin@example.com (password placeholder)

-- Insert default roles
INSERT INTO roles (id, name, description) VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin', 'Administrator with full access'),
    ('00000000-0000-0000-0000-000000000002', 'doctor', 'Medical doctor role'),
    ('00000000-0000-0000-0000-000000000003', 'nurse', 'Nursing staff role'),
    ('00000000-0000-0000-0000-000000000004', 'receptionist', 'Front desk receptionist role')
ON CONFLICT (name) DO NOTHING;

-- Insert permissions (matching frontend permissions)
INSERT INTO permissions (id, name, resource, action, description) VALUES
    -- Patient permissions
    (gen_random_uuid(), 'patients:view', 'patients', 'view', 'View patient information'),
    (gen_random_uuid(), 'patients:create', 'patients', 'create', 'Create new patients'),
    (gen_random_uuid(), 'patients:update', 'patients', 'update', 'Update patient information'),
    (gen_random_uuid(), 'patients:delete', 'patients', 'delete', 'Delete patients'),
    (gen_random_uuid(), 'patients:view:ssn', 'patients', 'view:ssn', 'View patient SSN'),
    (gen_random_uuid(), 'patients:view:full', 'patients', 'view:full', 'View full patient details'),
    
    -- User permissions
    (gen_random_uuid(), 'users:view', 'users', 'view', 'View user information'),
    (gen_random_uuid(), 'users:create', 'users', 'create', 'Create new users'),
    (gen_random_uuid(), 'users:update', 'users', 'update', 'Update user information'),
    (gen_random_uuid(), 'users:delete', 'users', 'delete', 'Delete users'),
    
    -- Clinical permissions
    (gen_random_uuid(), 'clinical:view', 'clinical', 'view', 'View clinical notes'),
    (gen_random_uuid(), 'clinical:create', 'clinical', 'create', 'Create clinical notes'),
    (gen_random_uuid(), 'clinical:update', 'clinical', 'update', 'Update clinical notes'),
    (gen_random_uuid(), 'clinical:delete', 'clinical', 'delete', 'Delete clinical notes'),
    
    -- Orders permissions
    (gen_random_uuid(), 'orders:view', 'orders', 'view', 'View orders'),
    (gen_random_uuid(), 'orders:create', 'orders', 'create', 'Create orders'),
    (gen_random_uuid(), 'orders:update', 'orders', 'update', 'Update orders'),
    (gen_random_uuid(), 'orders:delete', 'orders', 'delete', 'Delete orders'),
    
    -- Results permissions
    (gen_random_uuid(), 'results:view', 'results', 'view', 'View test results'),
    (gen_random_uuid(), 'results:create', 'results', 'create', 'Create test results'),
    (gen_random_uuid(), 'results:update', 'results', 'update', 'Update test results'),
    (gen_random_uuid(), 'results:delete', 'results', 'delete', 'Delete test results'),
    
    -- Pharmacy permissions
    (gen_random_uuid(), 'pharmacy:view', 'pharmacy', 'view', 'View pharmacy information'),
    (gen_random_uuid(), 'pharmacy:create', 'pharmacy', 'create', 'Create pharmacy entries'),
    (gen_random_uuid(), 'pharmacy:update', 'pharmacy', 'update', 'Update pharmacy entries'),
    (gen_random_uuid(), 'pharmacy:delete', 'pharmacy', 'delete', 'Delete pharmacy entries'),
    
    -- Scheduling permissions
    (gen_random_uuid(), 'scheduling:view', 'scheduling', 'view', 'View schedules'),
    (gen_random_uuid(), 'scheduling:create', 'scheduling', 'create', 'Create appointments'),
    (gen_random_uuid(), 'scheduling:update', 'scheduling', 'update', 'Update appointments'),
    (gen_random_uuid(), 'scheduling:delete', 'scheduling', 'delete', 'Delete appointments'),
    
    -- Revenue permissions
    (gen_random_uuid(), 'revenue:view', 'revenue', 'view', 'View revenue information'),
    (gen_random_uuid(), 'revenue:create', 'revenue', 'create', 'Create revenue entries'),
    (gen_random_uuid(), 'revenue:update', 'revenue', 'update', 'Update revenue entries'),
    (gen_random_uuid(), 'revenue:delete', 'revenue', 'delete', 'Delete revenue entries'),
    
    -- Analytics permissions
    (gen_random_uuid(), 'analytics:view', 'analytics', 'view', 'View analytics'),
    (gen_random_uuid(), 'analytics:export', 'analytics', 'export', 'Export analytics data'),
    
    -- Settings permissions
    (gen_random_uuid(), 'settings:view', 'settings', 'view', 'View settings'),
    (gen_random_uuid(), 'settings:update', 'settings', 'update', 'Update settings'),

    -- Billing permissions
    (gen_random_uuid(), 'billing:view', 'billing', 'view', 'View billing information'),
    (gen_random_uuid(), 'billing:create', 'billing', 'create', 'Create billing entries'),
    (gen_random_uuid(), 'billing:update', 'billing', 'update', 'Update billing entries'),
    (gen_random_uuid(), 'billing:delete', 'billing', 'delete', 'Delete billing entries'),
    (gen_random_uuid(), 'billing:process_payment', 'billing', 'process_payment', 'Process payments'),
    (gen_random_uuid(), 'billing:manage_invoices', 'billing', 'manage_invoices', 'Manage invoices'),

    -- Insurance permissions
    (gen_random_uuid(), 'insurance:view', 'insurance', 'view', 'View insurance information'),
    (gen_random_uuid(), 'insurance:create', 'insurance', 'create', 'Create insurance entries'),
    (gen_random_uuid(), 'insurance:update', 'insurance', 'update', 'Update insurance entries'),
    (gen_random_uuid(), 'insurance:delete', 'insurance', 'delete', 'Delete insurance entries'),
    (gen_random_uuid(), 'insurance:manage_claims', 'insurance', 'manage_claims', 'Manage insurance claims'),
    (gen_random_uuid(), 'insurance:manage_preauth', 'insurance', 'manage_preauth', 'Manage pre-authorization'),

    -- Department permissions - OPD
    (gen_random_uuid(), 'departments:opd:view', 'departments', 'opd:view', 'View OPD information'),
    (gen_random_uuid(), 'departments:opd:manage', 'departments', 'opd:manage', 'Manage OPD'),
    (gen_random_uuid(), 'departments:opd:queue', 'departments', 'opd:queue', 'Manage OPD queue'),

    -- Department permissions - IPD
    (gen_random_uuid(), 'departments:ipd:view', 'departments', 'ipd:view', 'View IPD information'),
    (gen_random_uuid(), 'departments:ipd:admit', 'departments', 'ipd:admit', 'Admit patients to IPD'),
    (gen_random_uuid(), 'departments:ipd:discharge', 'departments', 'ipd:discharge', 'Discharge patients from IPD'),
    (gen_random_uuid(), 'departments:ipd:transfer', 'departments', 'ipd:transfer', 'Transfer patients'),

    -- Department permissions - Beds
    (gen_random_uuid(), 'departments:beds:view', 'departments', 'beds:view', 'View bed information'),
    (gen_random_uuid(), 'departments:beds:manage', 'departments', 'beds:manage', 'Manage beds'),
    (gen_random_uuid(), 'departments:beds:allocate', 'departments', 'beds:allocate', 'Allocate beds'),

    -- Department permissions - Wards
    (gen_random_uuid(), 'departments:wards:view', 'departments', 'wards:view', 'View ward information'),
    (gen_random_uuid(), 'departments:wards:manage', 'departments', 'wards:manage', 'Manage wards'),

    -- Department permissions - OT
    (gen_random_uuid(), 'departments:ot:view', 'departments', 'ot:view', 'View OT information'),
    (gen_random_uuid(), 'departments:ot:schedule', 'departments', 'ot:schedule', 'Schedule surgeries'),
    (gen_random_uuid(), 'departments:ot:manage', 'departments', 'ot:manage', 'Manage OT'),

    -- Lab permissions
    (gen_random_uuid(), 'lab:view', 'lab', 'view', 'View lab information'),
    (gen_random_uuid(), 'lab:order', 'lab', 'order', 'Order lab tests'),
    (gen_random_uuid(), 'lab:collect', 'lab', 'collect', 'Collect lab samples'),
    (gen_random_uuid(), 'lab:process', 'lab', 'process', 'Process lab samples'),
    (gen_random_uuid(), 'lab:result:entry', 'lab', 'result:entry', 'Enter lab results'),
    (gen_random_uuid(), 'lab:result:verify', 'lab', 'result:verify', 'Verify lab results'),
    (gen_random_uuid(), 'lab:result:amend', 'lab', 'result:amend', 'Amend lab results'),
    (gen_random_uuid(), 'lab:report:sign', 'lab', 'report:sign', 'Sign lab reports'),
    (gen_random_uuid(), 'lab:manage:tests', 'lab', 'manage:tests', 'Manage lab tests'),
    (gen_random_uuid(), 'lab:manage:panels', 'lab', 'manage:panels', 'Manage lab panels'),
    (gen_random_uuid(), 'lab:critical:notify', 'lab', 'critical:notify', 'Notify critical lab results'),

    -- Radiology permissions
    (gen_random_uuid(), 'radiology:view', 'radiology', 'view', 'View radiology information'),
    (gen_random_uuid(), 'radiology:order', 'radiology', 'order', 'Order radiology exams'),
    (gen_random_uuid(), 'radiology:schedule', 'radiology', 'schedule', 'Schedule radiology exams'),
    (gen_random_uuid(), 'radiology:perform', 'radiology', 'perform', 'Perform radiology exams'),
    (gen_random_uuid(), 'radiology:report:create', 'radiology', 'report:create', 'Create radiology reports'),
    (gen_random_uuid(), 'radiology:report:sign', 'radiology', 'report:sign', 'Sign radiology reports'),
    (gen_random_uuid(), 'radiology:report:addendum', 'radiology', 'report:addendum', 'Add radiology report addendum'),
    (gen_random_uuid(), 'radiology:manage:exams', 'radiology', 'manage:exams', 'Manage radiology exams'),
    (gen_random_uuid(), 'radiology:manage:rooms', 'radiology', 'manage:rooms', 'Manage radiology rooms'),
    (gen_random_uuid(), 'radiology:critical:notify', 'radiology', 'critical:notify', 'Notify critical radiology findings'),

    -- Workflow permissions
    (gen_random_uuid(), 'workflows:view', 'workflows', 'view', 'View workflows'),
    (gen_random_uuid(), 'workflows:create', 'workflows', 'create', 'Create workflows'),
    (gen_random_uuid(), 'workflows:update', 'workflows', 'update', 'Update workflows'),
    (gen_random_uuid(), 'workflows:delete', 'workflows', 'delete', 'Delete workflows'),

    -- Compliance permissions
    (gen_random_uuid(), 'compliance:view', 'compliance', 'view', 'View compliance information'),
    (gen_random_uuid(), 'compliance:create', 'compliance', 'create', 'Create compliance entries'),
    (gen_random_uuid(), 'compliance:update', 'compliance', 'update', 'Update compliance entries'),
    (gen_random_uuid(), 'compliance:delete', 'compliance', 'delete', 'Delete compliance entries'),
    (gen_random_uuid(), 'compliance:assess', 'compliance', 'assess', 'Perform compliance assessments'),
    (gen_random_uuid(), 'compliance:remediate', 'compliance', 'remediate', 'Remediate compliance issues'),

    -- Training permissions
    (gen_random_uuid(), 'training:view', 'training', 'view', 'View training information'),
    (gen_random_uuid(), 'training:enroll', 'training', 'enroll', 'Enroll in training'),
    (gen_random_uuid(), 'training:complete', 'training', 'complete', 'Complete training'),
    (gen_random_uuid(), 'training:manage', 'training', 'manage', 'Manage training'),
    (gen_random_uuid(), 'training:assign', 'training', 'assign', 'Assign training')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
-- Admin gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    '00000000-0000-0000-0000-000000000001'::UUID, -- admin role
    id
FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Doctor permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    '00000000-0000-0000-0000-000000000002'::UUID, -- doctor role
    id
FROM permissions
WHERE name IN (
    'patients:view', 'patients:view:full',
    'clinical:view', 'clinical:create', 'clinical:update',
    'orders:view', 'orders:create',
    'results:view',
    'scheduling:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Nurse permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    '00000000-0000-0000-0000-000000000003'::UUID, -- nurse role
    id
FROM permissions
WHERE name IN (
    'patients:view',
    'clinical:view', 'clinical:update',
    'orders:view',
    'results:view',
    'scheduling:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Receptionist permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    '00000000-0000-0000-0000-000000000004'::UUID, -- receptionist role
    id
FROM permissions
WHERE name IN (
    'patients:view', 'patients:create',
    'scheduling:view', 'scheduling:create', 'scheduling:update'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Create initial super user (password: admin123 - CHANGE IN PRODUCTION!)
-- Password hash generated with bcrypt (cost 10) for "admin123"
INSERT INTO users (id, email, username, password_hash, is_active, is_verified, is_super_user)
VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    'admin@example.com',
    'admin',
    '$2b$10$8NgvXvHskesW5Egst41uO.bIdrTPjX9lPZTCMjaS1dSNbJRSiLKmu', -- bcrypt hash for "admin123"
    true,
    true,
    true
)
ON CONFLICT (email) DO NOTHING;

-- Note: The super user password hash above is a placeholder.
-- In production, generate a proper bcrypt hash and replace it.
-- You can generate one using: cargo run --bin generate-password-hash

-- Assign admin role to super user
INSERT INTO user_roles (user_id, role_id)
VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID, -- super user
    '00000000-0000-0000-0000-000000000001'::UUID  -- admin role
)
ON CONFLICT (user_id, role_id) DO NOTHING;

