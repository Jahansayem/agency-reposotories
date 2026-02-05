-- ============================================
-- SECURITY FIX: Analytics Tables RLS Policies
-- ============================================
-- Purpose: Fix CRITICAL security flaw where RLS policies allowed
-- ANY agency to access ALL analytics data due to permissive
-- USING (true) WITH CHECK (true) policies.
--
-- This migration:
-- 1. DROPS existing permissive policies on all 5 analytics tables
-- 2. CREATES new agency-scoped policies with proper data isolation
--
-- Tables affected:
-- - data_upload_batches
-- - cross_sell_opportunities
-- - renewal_calendar
-- - customer_insights
-- (contact_history skipped - table does not exist)
--
-- Author: Database Engineer (Security Fix)
-- Date: 2026-02-06
-- Severity: CRITICAL
-- ============================================

-- ============================================
-- STEP 1: DROP EXISTING PERMISSIVE POLICIES
-- These policies allowed cross-agency data access
-- ============================================

-- Drop data_upload_batches policy
DROP POLICY IF EXISTS "Allow all operations on upload batches" ON data_upload_batches;

-- Drop cross_sell_opportunities policy
DROP POLICY IF EXISTS "Allow all operations on cross sell opportunities" ON cross_sell_opportunities;

-- Drop renewal_calendar policy
DROP POLICY IF EXISTS "Allow all operations on renewal calendar" ON renewal_calendar;

-- Drop customer_insights policy
DROP POLICY IF EXISTS "Allow all operations on customer insights" ON customer_insights;

-- Note: contact_history table does not exist in this database - skipping

-- ============================================
-- STEP 2: CREATE AGENCY-SCOPED POLICIES
-- Following the pattern from 20260126_multi_tenancy.sql
-- ============================================

-- --------------------------------------------
-- Table: data_upload_batches
-- Tracks data file uploads per agency
-- --------------------------------------------

CREATE POLICY "data_upload_batches_select_agency" ON data_upload_batches
  FOR SELECT
  USING (
    agency_id IS NULL  -- Allow legacy/demo data
    OR agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "data_upload_batches_insert_agency" ON data_upload_batches
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT am.agency_id FROM agency_members am
      WHERE am.user_id = auth.uid() AND am.status = 'active'
    )
  );

CREATE POLICY "data_upload_batches_update_agency" ON data_upload_batches
  FOR UPDATE
  USING (
    agency_id IS NULL
    OR agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "data_upload_batches_delete_agency" ON data_upload_batches
  FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- --------------------------------------------
-- Table: cross_sell_opportunities
-- Main cross-sell opportunity records per agency
-- --------------------------------------------

CREATE POLICY "cross_sell_opportunities_select_agency" ON cross_sell_opportunities
  FOR SELECT
  USING (
    agency_id IS NULL  -- Allow legacy/demo data
    OR agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "cross_sell_opportunities_insert_agency" ON cross_sell_opportunities
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT am.agency_id FROM agency_members am
      WHERE am.user_id = auth.uid() AND am.status = 'active'
    )
  );

CREATE POLICY "cross_sell_opportunities_update_agency" ON cross_sell_opportunities
  FOR UPDATE
  USING (
    agency_id IS NULL
    OR agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "cross_sell_opportunities_delete_agency" ON cross_sell_opportunities
  FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- --------------------------------------------
-- Table: renewal_calendar
-- Calendar view of renewals per agency
-- --------------------------------------------

CREATE POLICY "renewal_calendar_select_agency" ON renewal_calendar
  FOR SELECT
  USING (
    agency_id IS NULL  -- Allow legacy/demo data
    OR agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "renewal_calendar_insert_agency" ON renewal_calendar
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT am.agency_id FROM agency_members am
      WHERE am.user_id = auth.uid() AND am.status = 'active'
    )
  );

CREATE POLICY "renewal_calendar_update_agency" ON renewal_calendar
  FOR UPDATE
  USING (
    agency_id IS NULL
    OR agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "renewal_calendar_delete_agency" ON renewal_calendar
  FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- --------------------------------------------
-- Table: customer_insights
-- Aggregated customer analytics per agency
-- --------------------------------------------

CREATE POLICY "customer_insights_select_agency" ON customer_insights
  FOR SELECT
  USING (
    agency_id IS NULL  -- Allow legacy/demo data
    OR agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "customer_insights_insert_agency" ON customer_insights
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT am.agency_id FROM agency_members am
      WHERE am.user_id = auth.uid() AND am.status = 'active'
    )
  );

CREATE POLICY "customer_insights_update_agency" ON customer_insights
  FOR UPDATE
  USING (
    agency_id IS NULL
    OR agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "customer_insights_delete_agency" ON customer_insights
  FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Note: contact_history table does not exist - skipping policies for that table

-- ============================================
-- VERIFICATION COMMENTS
-- ============================================

COMMENT ON POLICY "data_upload_batches_select_agency" ON data_upload_batches
  IS 'Agency-scoped: Users can only SELECT upload batches from their agencies';

COMMENT ON POLICY "cross_sell_opportunities_select_agency" ON cross_sell_opportunities
  IS 'Agency-scoped: Users can only SELECT opportunities from their agencies';

COMMENT ON POLICY "renewal_calendar_select_agency" ON renewal_calendar
  IS 'Agency-scoped: Users can only SELECT renewals from their agencies';

COMMENT ON POLICY "customer_insights_select_agency" ON customer_insights
  IS 'Agency-scoped: Users can only SELECT insights from their agencies';

-- Note: contact_history table comment skipped - table doesn't exist

-- ============================================
-- END OF SECURITY FIX MIGRATION
-- ============================================
