-- ============================================================================
-- Migration: Fix SECURITY DEFINER Functions Search Path (P1.8)
-- Date: 2026-02-20
-- Description:
--   Adds SET search_path = public, pg_temp to all SECURITY DEFINER functions
--   to prevent privilege escalation via schema injection attacks.
--
-- Problem:
--   SECURITY DEFINER functions run with the privileges of the function owner.
--   Without explicit search_path, attackers can create malicious objects in
--   schemas earlier in the search path to hijack function calls.
--
-- Solution:
--   1. Add SET search_path = public, pg_temp to all SECURITY DEFINER functions
--   2. Schema-qualify all table references as public.table_name
--   3. Only allow public schema and temporary objects (pg_temp)
--
-- References:
--   - PostgreSQL Security: https://www.postgresql.org/docs/current/sql-createfunction.html
--   - OWASP: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
-- ============================================================================

-- ============================================================================
-- Multi-tenancy core functions (20260126_multi_tenancy.sql)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_agency_ids(p_user_id UUID)
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT am.agency_id
    FROM public.agency_members am
    WHERE am.user_id = p_user_id
      AND am.status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_agency_owner(p_agency_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.agency_members am
    WHERE am.agency_id = p_agency_id
      AND am.user_id = public.get_current_user_id()
      AND am.role = 'owner'
      AND am.status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_agency_admin(p_agency_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.agency_members am
    WHERE am.agency_id = p_agency_id
      AND am.user_id = public.get_current_user_id()
      AND am.role IN ('owner', 'manager')
      AND am.status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_user_agency_role(p_agency_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT am.role INTO v_role
  FROM public.agency_members am
  WHERE am.agency_id = p_agency_id
    AND am.user_id = public.get_current_user_id()
    AND am.status = 'active';
  RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.current_agency_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.agency_id', true), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================================
-- Agency invitation functions
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_agency_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS TABLE(agency_id UUID, role TEXT) AS $$
DECLARE
  v_invitation RECORD;
  v_existing_role TEXT;
  v_role_rank INT;
  v_existing_rank INT;
BEGIN
  -- Find valid invitation
  SELECT * INTO v_invitation
  FROM public.agency_invitations
  WHERE token = p_token
    AND expires_at > NOW()
    AND accepted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Check if user already has a membership in this agency
  SELECT am.role INTO v_existing_role
  FROM public.agency_members am
  WHERE am.agency_id = v_invitation.agency_id
    AND am.user_id = p_user_id;

  IF v_existing_role IS NOT NULL THEN
    -- User already has a membership
    -- Define role hierarchy: owner=3, manager=2, staff=1
    v_role_rank := CASE v_invitation.role
      WHEN 'owner' THEN 3
      WHEN 'manager' THEN 2
      WHEN 'staff' THEN 1
      ELSE 0
    END;

    v_existing_rank := CASE v_existing_role
      WHEN 'owner' THEN 3
      WHEN 'manager' THEN 2
      WHEN 'staff' THEN 1
      ELSE 0
    END;

    -- Only upgrade, never downgrade
    IF v_role_rank > v_existing_rank THEN
      UPDATE public.agency_members
      SET role = v_invitation.role,
          status = 'active',
          updated_at = NOW()
      WHERE agency_members.agency_id = v_invitation.agency_id
        AND agency_members.user_id = p_user_id;
    ELSE
      -- Just ensure they're active, don't change role
      UPDATE public.agency_members
      SET status = 'active',
          updated_at = NOW()
      WHERE agency_members.agency_id = v_invitation.agency_id
        AND agency_members.user_id = p_user_id;
    END IF;
  ELSE
    -- No existing membership, create new one
    INSERT INTO public.agency_members (agency_id, user_id, role, status)
    VALUES (v_invitation.agency_id, p_user_id, v_invitation.role, 'active');
  END IF;

  -- Mark invitation as accepted
  UPDATE public.agency_invitations
  SET accepted_at = NOW()
  WHERE id = v_invitation.id;

  -- Return result
  RETURN QUERY SELECT v_invitation.agency_id, v_invitation.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION create_agency_with_owner(
  p_agency_name TEXT,
  p_pin_code TEXT,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_agency_id UUID;
BEGIN
  -- Create the agency
  INSERT INTO public.agencies (name, pin_code)
  VALUES (p_agency_name, p_pin_code)
  RETURNING id INTO v_agency_id;

  -- Add creator as owner
  INSERT INTO public.agency_members (agency_id, user_id, role, status)
  VALUES (v_agency_id, p_user_id, 'owner', 'active');

  RETURN v_agency_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================================
-- Auth and security functions (20260114_security_improvements.sql)
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.users WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE name = public.get_user_name();
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_user_name()
RETURNS TEXT AS $$
  SELECT name FROM public.users WHERE id = public.get_user_id();
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.users WHERE name = public.get_user_name()),
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.rls_enabled()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT rls_enabled FROM public.feature_flags WHERE id = 1),
    true  -- Default to enabled for security
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION log_auth_event(
  p_event_type TEXT,
  p_user_id UUID,
  p_ip_address TEXT,
  p_success BOOLEAN
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.auth_events (event_type, user_id, ip_address, success)
  VALUES (p_event_type, p_user_id, p_ip_address, p_success);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_max_count INTEGER,
  p_window_minutes INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limit_log
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  RETURN v_count < p_max_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION record_rate_limit_hit(
  p_user_id UUID,
  p_action TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.rate_limit_log (user_id, action)
  VALUES (p_user_id, p_action);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================================
-- Session validation (20260125_security_hardening.sql)
-- ============================================================================

CREATE OR REPLACE FUNCTION log_session_validation(
  p_token TEXT,
  p_user_id UUID,
  p_is_valid BOOLEAN,
  p_reason TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.session_validation_log (token, user_id, is_valid, reason)
  VALUES (p_token, p_user_id, p_is_valid, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.sessions
  WHERE expires_at < NOW();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================================
-- Role system functions (20260203050000_phase1_database_foundation.sql)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_members am
    WHERE am.user_id = public.get_current_user_id()
      AND am.agency_id = public.current_agency_id()
      AND am.role IN ('owner', 'manager')
      AND am.status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.has_permission(p_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Get user's role in current agency
  v_role := public.get_user_agency_role(public.current_agency_id());

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- Check if role has permission
  RETURN EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    WHERE rp.role = v_role
      AND rp.permission = p_permission
      AND rp.enabled = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION validate_session_token(p_token TEXT)
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  agency_id UUID,
  role TEXT,
  is_valid BOOLEAN
) AS $$
DECLARE
  v_session RECORD;
  v_user RECORD;
  v_membership RECORD;
BEGIN
  -- Find session
  SELECT * INTO v_session
  FROM public.sessions s
  WHERE s.token = p_token
    AND s.expires_at > NOW();

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::UUID, NULL::TEXT, false;
    RETURN;
  END IF;

  -- Get user info
  SELECT * INTO v_user
  FROM public.users u
  WHERE u.id = v_session.user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::UUID, NULL::TEXT, false;
    RETURN;
  END IF;

  -- Get agency membership
  SELECT am.agency_id, am.role INTO v_membership
  FROM public.agency_members am
  WHERE am.user_id = v_user.id
    AND am.status = 'active'
  LIMIT 1;

  RETURN QUERY SELECT
    v_user.id,
    v_user.name,
    v_membership.agency_id,
    v_membership.role,
    true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================================
-- Mark message as read (20260120_mark_message_read.sql)
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_message_as_read(message_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.messages
  SET read = true
  WHERE id = message_id AND sender_id = user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_definer_func RECORD;
  v_count INTEGER := 0;
  v_missing INTEGER := 0;
BEGIN
  -- Check all SECURITY DEFINER functions have search_path set
  FOR v_definer_func IN
    SELECT
      n.nspname as schema,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as args,
      p.proconfig as config
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.prosecdef = true  -- SECURITY DEFINER
      AND n.nspname IN ('public', 'auth')
      AND p.proname NOT LIKE 'pg_%'
  LOOP
    v_count := v_count + 1;

    -- Check if search_path is set in config
    IF v_definer_func.config IS NULL OR
       NOT EXISTS (
         SELECT 1 FROM unnest(v_definer_func.config) cfg
         WHERE cfg LIKE 'search_path=%'
       ) THEN
      v_missing := v_missing + 1;
      RAISE WARNING 'SECURITY DEFINER function missing search_path: %.%(%)',
        v_definer_func.schema,
        v_definer_func.function_name,
        v_definer_func.args;
    END IF;
  END LOOP;

  IF v_missing > 0 THEN
    RAISE WARNING '⚠️  % of % SECURITY DEFINER functions still missing search_path', v_missing, v_count;
  ELSE
    RAISE NOTICE '✅ All % SECURITY DEFINER functions have search_path protection', v_count;
  END IF;

  RAISE NOTICE '✅ SECURITY DEFINER search_path migration complete';
END $$;
