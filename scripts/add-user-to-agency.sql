-- ============================================
-- Add User to Agency Script
-- ============================================
-- This script helps you add an existing user to an agency
--
-- Instructions:
-- 1. First, run the queries in Step 1 to see available agencies and users
-- 2. Copy the agency_id and user_id from the results
-- 3. Update Step 2 with those IDs
-- 4. Run Step 2 to add the user to the agency

-- ============================================
-- STEP 1: View Available Agencies and Users
-- ============================================

-- 1a. List all agencies
SELECT
  id as agency_id,
  name,
  slug,
  is_active
FROM agencies
WHERE is_active = true
ORDER BY name;

-- 1b. List all users
SELECT
  id as user_id,
  name,
  role
FROM users
ORDER BY name;

-- 1c. View current agency memberships
SELECT
  u.name as user_name,
  a.name as agency_name,
  am.role,
  am.status,
  am.is_default_agency
FROM agency_members am
JOIN users u ON am.user_id = u.id
JOIN agencies a ON am.agency_id = a.id
ORDER BY u.name, a.name;

-- ============================================
-- STEP 2: Add User to Agency
-- ============================================
-- IMPORTANT: Replace the values below with actual IDs from Step 1

-- Option A: Add by ID (use the IDs from Step 1a and 1b)
INSERT INTO agency_members (
  user_id,
  agency_id,
  role,
  status,
  permissions,
  is_default_agency
)
VALUES (
  '63d6c186-3cea-43d5-a7bf-e918afefac90'::uuid,  -- ← Replace with actual user_id from Step 1b
  'REPLACE_WITH_AGENCY_ID_FROM_STEP_1a'::uuid,    -- ← Replace with actual agency_id from Step 1a
  'member',  -- Can be: 'owner', 'admin', or 'member'
  'active',
  '{
    "can_create_tasks": true,
    "can_delete_tasks": false,
    "can_view_strategic_goals": false,
    "can_invite_users": false,
    "can_manage_templates": false
  }'::jsonb,
  false  -- Set to true if this should be the user's default agency
)
ON CONFLICT (user_id, agency_id) DO UPDATE SET
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  status = EXCLUDED.status;

-- Option B: Add by name (if you prefer to use names instead of IDs)
-- Uncomment and use this instead of Option A if you prefer:

/*
INSERT INTO agency_members (
  user_id,
  agency_id,
  role,
  status,
  permissions,
  is_default_agency
)
VALUES (
  (SELECT id FROM users WHERE name = 'Sefra'),           -- ← Replace with actual user name
  (SELECT id FROM agencies WHERE slug = 'bealer-agency'), -- ← Replace with actual agency slug
  'member',
  'active',
  '{
    "can_create_tasks": true,
    "can_delete_tasks": false,
    "can_view_strategic_goals": false,
    "can_invite_users": false,
    "can_manage_templates": false
  }'::jsonb,
  false
)
ON CONFLICT (user_id, agency_id) DO UPDATE SET
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  status = EXCLUDED.status;
*/

-- ============================================
-- STEP 3: Verify the Addition
-- ============================================

-- Check that the user was added successfully
SELECT
  u.name as user_name,
  a.name as agency_name,
  a.slug as agency_slug,
  am.role,
  am.status,
  am.is_default_agency,
  am.created_at
FROM agency_members am
JOIN users u ON am.user_id = u.id
JOIN agencies a ON am.agency_id = a.id
WHERE u.id = '63d6c186-3cea-43d5-a7bf-e918afefac90'::uuid  -- ← Replace with user_id
ORDER BY am.created_at DESC;

-- ============================================
-- PERMISSION TEMPLATES
-- ============================================
-- Copy these as needed for different roles:

-- MEMBER (default permissions - most restrictive)
/*
'{
  "can_create_tasks": true,
  "can_delete_tasks": false,
  "can_view_strategic_goals": false,
  "can_invite_users": false,
  "can_manage_templates": false
}'::jsonb
*/

-- ADMIN (elevated permissions)
/*
'{
  "can_create_tasks": true,
  "can_delete_tasks": true,
  "can_view_strategic_goals": true,
  "can_invite_users": true,
  "can_manage_templates": true
}'::jsonb
*/

-- OWNER (full permissions)
/*
'{
  "can_create_tasks": true,
  "can_delete_tasks": true,
  "can_view_strategic_goals": true,
  "can_invite_users": true,
  "can_manage_templates": true
}'::jsonb
*/
