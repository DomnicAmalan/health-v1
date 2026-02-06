-- Test Users Seed Data
-- Creates well-known test users for E2E and integration testing
-- Password for all users: "testpassword123" (hashed with Argon2id)

-- Note: This is test data only - never use in production!
-- The password hash is intentionally weak for testing purposes

BEGIN;

-- Test Organization
INSERT INTO organizations (id, name, code, status, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000100', 'Test Medical Center', 'TMC', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Test Users
-- Password: testpassword123
-- Hash generated with: echo -n "testpassword123" | argon2 <salt> -id
INSERT INTO users (
  id,
  email,
  username,
  password_hash,
  is_active,
  is_verified,
  is_super_user,
  organization_id,
  created_at,
  updated_at
)
VALUES
  -- Admin user
  (
    '00000000-0000-0000-0000-000000000001',
    'admin@test.com',
    'admin',
    '$argon2id$v=19$m=19456,t=2,p=1$testpassword123$J8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3',
    true,
    true,
    true,
    '00000000-0000-0000-0000-000000000100',
    NOW(),
    NOW()
  ),
  -- Doctor user
  (
    '00000000-0000-0000-0000-000000000002',
    'doctor@test.com',
    'dr_smith',
    '$argon2id$v=19$m=19456,t=2,p=1$testpassword123$J8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3',
    true,
    true,
    false,
    '00000000-0000-0000-0000-000000000100',
    NOW(),
    NOW()
  ),
  -- Nurse user
  (
    '00000000-0000-0000-0000-000000000003',
    'nurse@test.com',
    'nurse_jones',
    '$argon2id$v=19$m=19456,t=2,p=1$testpassword123$J8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3',
    true,
    true,
    false,
    '00000000-0000-0000-0000-000000000100',
    NOW(),
    NOW()
  ),
  -- Receptionist user
  (
    '00000000-0000-0000-0000-000000000004',
    'receptionist@test.com',
    'receptionist_brown',
    '$argon2id$v=19$m=19456,t=2,p=1$testpassword123$J8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3',
    true,
    true,
    false,
    '00000000-0000-0000-0000-000000000100',
    NOW(),
    NOW()
  ),
  -- Patient user (portal access)
  (
    '00000000-0000-0000-0000-000000000005',
    'patient@test.com',
    'patient_john',
    '$argon2id$v=19$m=19456,t=2,p=1$testpassword123$J8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3',
    true,
    true,
    false,
    '00000000-0000-0000-0000-000000000100',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Assign roles to users (if using role-based access)
-- Note: Adjust based on your actual roles table structure
INSERT INTO user_roles (user_id, role_id, created_at)
SELECT
  '00000000-0000-0000-0000-000000000001',
  id,
  NOW()
FROM roles
WHERE name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id, created_at)
SELECT
  '00000000-0000-0000-0000-000000000002',
  id,
  NOW()
FROM roles
WHERE name = 'provider'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id, created_at)
SELECT
  '00000000-0000-0000-0000-000000000003',
  id,
  NOW()
FROM roles
WHERE name = 'nurse'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id, created_at)
SELECT
  '00000000-0000-0000-0000-000000000004',
  id,
  NOW()
FROM roles
WHERE name = 'receptionist'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id, created_at)
SELECT
  '00000000-0000-0000-0000-000000000005',
  id,
  NOW()
FROM roles
WHERE name = 'user'
ON CONFLICT DO NOTHING;

COMMIT;
