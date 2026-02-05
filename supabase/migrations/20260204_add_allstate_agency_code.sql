/**
 * Migration: Add Allstate Agency Code to Agencies Table
 *
 * Adds support for Allstate PingFederate SAML integration:
 * - allstate_agency_code: Unique identifier from Allstate (e.g., "A1234")
 * - Index for fast lookups during SAML authentication
 * - Function for agency lookup by code
 *
 * Date: 2026-02-04
 * Related: src/lib/auth/samlClaimHandler.ts
 */

-- ============================================
-- 1. Add allstate_agency_code column
-- ============================================

-- Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agencies' AND column_name = 'allstate_agency_code'
  ) THEN
    ALTER TABLE agencies ADD COLUMN allstate_agency_code TEXT;

    COMMENT ON COLUMN agencies.allstate_agency_code IS
      'Allstate agency code from PingFederate SAML (e.g., "A1234"). Used for SSO agency matching.';
  END IF;
END $$;

-- ============================================
-- 2. Create unique index for lookups
-- ============================================

-- Create unique index for fast lookups during SAML authentication
-- Using partial index to allow multiple NULL values
CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_allstate_code
  ON agencies (allstate_agency_code)
  WHERE allstate_agency_code IS NOT NULL;

-- ============================================
-- 3. Add lookup function
-- ============================================

-- Function to find agency by Allstate code
CREATE OR REPLACE FUNCTION find_agency_by_allstate_code(p_agency_code TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.name, a.slug, a.is_active
  FROM agencies a
  WHERE a.allstate_agency_code = UPPER(TRIM(p_agency_code))
    AND a.is_active = true;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION find_agency_by_allstate_code(TEXT) IS
  'Find active agency by Allstate agency code (case-insensitive)';

-- ============================================
-- 4. Add trigger to normalize agency codes
-- ============================================

-- Ensure agency codes are always uppercase and trimmed
CREATE OR REPLACE FUNCTION normalize_allstate_agency_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.allstate_agency_code IS NOT NULL THEN
    NEW.allstate_agency_code := UPPER(TRIM(NEW.allstate_agency_code));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid errors
DROP TRIGGER IF EXISTS normalize_allstate_code_trigger ON agencies;

-- Create trigger
CREATE TRIGGER normalize_allstate_code_trigger
  BEFORE INSERT OR UPDATE OF allstate_agency_code ON agencies
  FOR EACH ROW
  EXECUTE FUNCTION normalize_allstate_agency_code();

COMMENT ON FUNCTION normalize_allstate_agency_code() IS
  'Normalizes Allstate agency codes to uppercase on insert/update';

-- ============================================
-- 5. Update Bealer Agency (optional)
-- ============================================

-- If Bealer Agency exists and you want to assign it an Allstate code,
-- uncomment and modify the following:
-- UPDATE agencies
-- SET allstate_agency_code = 'BEALER001'
-- WHERE slug = 'bealer-agency';

-- ============================================
-- 6. Add RLS policy for agency code queries
-- ============================================

-- Allow authenticated users to look up agencies by code
-- (needed for SAML authentication flow)
DO $$
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "agencies_select_by_code" ON agencies;

  -- Create policy that allows selecting agencies by allstate_agency_code
  -- This is used during SAML authentication before user has agency membership
  CREATE POLICY "agencies_select_by_code"
    ON agencies FOR SELECT
    USING (
      -- Allow lookup by agency code (for SAML flow)
      allstate_agency_code IS NOT NULL
      OR
      -- Standard member access
      id IN (SELECT public.user_agency_ids())
      OR
      -- Super admin access
      (SELECT global_role FROM users WHERE id = public.get_current_user_id()) = 'super_admin'
    );
END $$;

-- ============================================
-- 7. Verification
-- ============================================

DO $$
DECLARE
  v_column_exists BOOLEAN;
  v_index_exists BOOLEAN;
  v_function_exists BOOLEAN;
BEGIN
  -- Check column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agencies' AND column_name = 'allstate_agency_code'
  ) INTO v_column_exists;

  -- Check index
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_agencies_allstate_code'
  ) INTO v_index_exists;

  -- Check function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'find_agency_by_allstate_code'
  ) INTO v_function_exists;

  -- Report results
  RAISE NOTICE '=== Allstate Agency Code Migration ===';
  RAISE NOTICE 'Column allstate_agency_code: %', CASE WHEN v_column_exists THEN 'OK' ELSE 'MISSING' END;
  RAISE NOTICE 'Index idx_agencies_allstate_code: %', CASE WHEN v_index_exists THEN 'OK' ELSE 'MISSING' END;
  RAISE NOTICE 'Function find_agency_by_allstate_code: %', CASE WHEN v_function_exists THEN 'OK' ELSE 'MISSING' END;

  IF NOT (v_column_exists AND v_index_exists AND v_function_exists) THEN
    RAISE EXCEPTION 'Migration verification failed - some components are missing';
  END IF;

  RAISE NOTICE 'Migration completed successfully!';
END $$;
