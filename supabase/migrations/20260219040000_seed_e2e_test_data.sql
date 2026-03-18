-- ============================================
-- Seed E2E Test Data
-- ============================================
-- Purpose: Create test user (Derrick) and test customer (Janis Urich)
-- for E2E tests to use consistently.
--
-- NOTE: This migration is OPTIONAL and only needed if:
--   1. You're running E2E tests locally with a fresh database
--   2. The seed_customer_data.sql migration hasn't been run yet
--   3. You want the "Derrick" user to exist before running E2E tests
--
-- The E2E tests will work WITHOUT this migration by:
--   - Creating Derrick account via registration flow if he doesn't exist
--   - Using James Wilson customer from seed_customer_data.sql
--
-- Author: Claude Code Integration
-- Date: 2026-02-19
-- ============================================

-- ============================================
-- 1. Create Test User (Derrick) with PIN 8008
-- ============================================

INSERT INTO users (
  id,
  name,
  email,
  color,
  role,
  pin_hash,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'Derrick',
  'derrick.test@bealeragency.com',
  '#8B4513', -- Brown color
  'owner',
  '286c897eba57ce67e79fff80229d9eacddde784b29a18a1d47c17bade5ad1a08', -- SHA-256 hash of "8008"
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Get the Derrick user ID for later use
DO $$
DECLARE
  derrick_user_id UUID;
  bealer_agency_id UUID;
BEGIN
  -- Get Derrick's user ID
  SELECT id INTO derrick_user_id
  FROM users
  WHERE email = 'derrick.test@bealeragency.com';

  -- Get Bealer Agency ID
  SELECT id INTO bealer_agency_id
  FROM agencies
  WHERE slug = 'bealer-agency';

  -- If Derrick user doesn't exist, skip agency membership
  IF derrick_user_id IS NULL THEN
    RAISE NOTICE 'Derrick user not found - skipping agency membership';
    RETURN;
  END IF;

  -- If Bealer Agency doesn't exist, skip agency membership
  IF bealer_agency_id IS NULL THEN
    RAISE NOTICE 'Bealer Agency not found - skipping agency membership';
    RETURN;
  END IF;

  -- Assign Derrick to Bealer Agency as owner
  INSERT INTO agency_members (
    user_id,
    agency_id,
    role,
    status,
    permissions,
    is_default_agency,
    joined_at
  )
  VALUES (
    derrick_user_id,
    bealer_agency_id,
    'owner',
    'active',
    jsonb_build_object(
      'can_manage_members', true,
      'can_manage_settings', true,
      'can_create_tasks', true,
      'can_edit_all_tasks', true,
      'can_delete_all_tasks', true,
      'can_view_analytics', true,
      'can_manage_templates', true,
      'can_manage_categories', true
    ),
    true, -- Set as default agency
    NOW()
  )
  ON CONFLICT (user_id, agency_id) DO NOTHING;

  RAISE NOTICE 'Assigned Derrick to Bealer Agency as owner';
END $$;

-- ============================================
-- 2. Create Test Customer (Janis Urich) with Opportunity
-- ============================================

-- Get Bealer Agency ID for customer association
DO $$
DECLARE
  bealer_agency_id UUID;
BEGIN
  SELECT id INTO bealer_agency_id
  FROM agencies
  WHERE slug = 'bealer-agency';

  -- Insert customer insights record
  INSERT INTO customer_insights (
    agency_id,
    customer_name,
    customer_email,
    customer_phone,
    total_premium,
    total_policies,
    products_held,
    tenure_years,
    retention_risk,
    upcoming_renewal
  ) VALUES (
    bealer_agency_id,
    'Janis Urich',
    'janis.urich@email.com',
    '(555) 987-6543',
    5800.00,
    2,
    ARRAY['Auto', 'Home'],
    4,
    'low',
    NOW() + INTERVAL '35 days'
  )
  ON CONFLICT DO NOTHING;

  -- Insert cross-sell opportunity for Janis Urich
  INSERT INTO cross_sell_opportunities (
    agency_id,
    customer_name,
    phone,
    email,
    priority_rank,
    priority_tier,
    priority_score,
    current_products,
    recommended_product,
    potential_premium_add,
    renewal_date,
    days_until_renewal,
    talking_point_1,
    talking_point_2,
    talking_point_3
  ) VALUES (
    bealer_agency_id,
    'Janis Urich',
    '(555) 987-6543',
    'janis.urich@email.com',
    1,
    'HOT',
    92,
    'Auto, Home',
    'Umbrella',
    450.00,
    NOW() + INTERVAL '35 days',
    30,
    'Owns waterfront property - increased liability exposure',
    'Frequently hosts events at home based on social media',
    'Umbrella policy adds $2M protection for just $450/year'
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seeded test customer Janis Urich with HOT cross-sell opportunity';
END $$;

-- ============================================
-- 3. Verification
-- ============================================

DO $$
DECLARE
  derrick_exists BOOLEAN;
  janis_exists BOOLEAN;
  janis_opportunity_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM users WHERE email = 'derrick.test@bealeragency.com') INTO derrick_exists;
  SELECT EXISTS(SELECT 1 FROM customer_insights WHERE customer_name = 'Janis Urich') INTO janis_exists;
  SELECT EXISTS(SELECT 1 FROM cross_sell_opportunities WHERE customer_name = 'Janis Urich') INTO janis_opportunity_exists;

  IF derrick_exists AND janis_exists AND janis_opportunity_exists THEN
    RAISE NOTICE '✅ E2E test data seeded successfully!';
    RAISE NOTICE '   - User: Derrick (owner, PIN: 8008)';
    RAISE NOTICE '   - Customer: Janis Urich (HOT opportunity)';
  ELSE
    IF NOT derrick_exists THEN
      RAISE WARNING '❌ Derrick user not created';
    END IF;
    IF NOT janis_exists THEN
      RAISE WARNING '❌ Janis Urich customer not created';
    END IF;
    IF NOT janis_opportunity_exists THEN
      RAISE WARNING '❌ Janis Urich opportunity not created';
    END IF;
  END IF;
END $$;
