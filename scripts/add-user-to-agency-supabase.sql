-- ============================================
-- Add User to Agency (Supabase SQL Editor)
-- ============================================
-- Instructions:
-- 1. Edit the values in the DECLARE section below
-- 2. Copy everything and paste into Supabase SQL Editor
-- 3. Click Run

DO $$
DECLARE
  -- 🔧 CONFIGURE THESE VALUES:
  v_user_name text := 'Sefra';           -- ← Change this to the user's name
  v_agency_slug text := 'wavezly'; -- ← Change this to the agency slug
  v_user_role text := 'member';          -- ← Can be: 'owner', 'admin', or 'member'
  v_is_default boolean := false;         -- ← Set to true if this should be default agency

  -- Internal variables (don't change these)
  v_user_id uuid;
  v_agency_id uuid;
  v_permissions jsonb;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM users WHERE name = v_user_name;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User "%" not found. Check spelling or run: SELECT name FROM users;', v_user_name;
  END IF;

  -- Get agency ID
  SELECT id INTO v_agency_id FROM agencies WHERE slug = v_agency_slug;
  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Agency with slug "%" not found. Check spelling or run: SELECT name, slug FROM agencies;', v_agency_slug;
  END IF;

  -- Set permissions based on role
  IF v_user_role = 'owner' OR v_user_role = 'admin' THEN
    v_permissions := '{
      "can_create_tasks": true,
      "can_delete_tasks": true,
      "can_view_strategic_goals": true,
      "can_invite_users": true,
      "can_manage_templates": true
    }'::jsonb;
  ELSE
    v_permissions := '{
      "can_create_tasks": true,
      "can_delete_tasks": false,
      "can_view_strategic_goals": false,
      "can_invite_users": false,
      "can_manage_templates": false
    }'::jsonb;
  END IF;

  -- Insert or update membership
  INSERT INTO agency_members (
    user_id,
    agency_id,
    role,
    status,
    permissions,
    is_default_agency
  ) VALUES (
    v_user_id,
    v_agency_id,
    v_user_role::agency_role,
    'active',
    v_permissions,
    v_is_default
  )
  ON CONFLICT (user_id, agency_id) DO UPDATE SET
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    status = 'active',
    is_default_agency = EXCLUDED.is_default_agency;

  RAISE NOTICE 'SUCCESS: % added to % as %', v_user_name, v_agency_slug, v_user_role;
END $$;

-- Verify the result
SELECT
  u.name AS user_name,
  a.name AS agency_name,
  a.slug AS agency_slug,
  am.role,
  am.status,
  am.is_default_agency AS is_default,
  am.created_at
FROM agency_members am
JOIN users u ON am.user_id = u.id
JOIN agencies a ON am.agency_id = a.id
WHERE u.name = 'Sefra'  -- ← Change to match your user name above
  AND a.slug = 'wavezly';  -- ← Change to match your agency slug above
