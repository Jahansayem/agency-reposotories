-- ============================================================================
-- Migration: Fix RLS Policies and Add Constraints
-- Date: 2026-02-20
-- Description:
--   1. Replace auth.uid() with public.get_current_user_id() in RLS policies
--      for analytics tables, agent tables, and customer_interactions
--   2. Replace wide-open USING(true) policies on contact_history,
--      pin_reset_tokens, device_tokens, task_reminders, daily_digests
--   3. Add missing index on contact_history(customer_id)
--   4. Add completed/status sync constraint on todos
--
-- Context: The app uses PIN-based auth where auth.uid() returns NULL.
--          public.get_current_user_id() reads from the session context instead.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Fix auth.uid() -> public.get_current_user_id() in analytics tables
-- ============================================================================
-- These policies were created in 20260206020000_fix_analytics_rls.sql using
-- auth.uid() which returns NULL under PIN-based auth.
-- ============================================================================

-- --------------------------------------------
-- 1.1: data_upload_batches
-- --------------------------------------------

DROP POLICY IF EXISTS "data_upload_batches_select_agency" ON data_upload_batches;
DROP POLICY IF EXISTS "data_upload_batches_insert_agency" ON data_upload_batches;
DROP POLICY IF EXISTS "data_upload_batches_update_agency" ON data_upload_batches;
DROP POLICY IF EXISTS "data_upload_batches_delete_agency" ON data_upload_batches;

CREATE POLICY "data_upload_batches_select_agency" ON data_upload_batches
  FOR SELECT
  USING (
    agency_id IS NULL
    OR agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = public.get_current_user_id() AND status = 'active'
    )
  );

CREATE POLICY "data_upload_batches_insert_agency" ON data_upload_batches
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT am.agency_id FROM agency_members am
      WHERE am.user_id = public.get_current_user_id() AND am.status = 'active'
    )
  );

CREATE POLICY "data_upload_batches_update_agency" ON data_upload_batches
  FOR UPDATE
  USING (
    agency_id IS NULL
    OR agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = public.get_current_user_id() AND status = 'active'
    )
  );

CREATE POLICY "data_upload_batches_delete_agency" ON data_upload_batches
  FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = public.get_current_user_id() AND status = 'active'
    )
  );

-- --------------------------------------------
-- 1.2: cross_sell_opportunities
-- --------------------------------------------

DROP POLICY IF EXISTS "cross_sell_opportunities_select_agency" ON cross_sell_opportunities;
DROP POLICY IF EXISTS "cross_sell_opportunities_insert_agency" ON cross_sell_opportunities;
DROP POLICY IF EXISTS "cross_sell_opportunities_update_agency" ON cross_sell_opportunities;
DROP POLICY IF EXISTS "cross_sell_opportunities_delete_agency" ON cross_sell_opportunities;

CREATE POLICY "cross_sell_opportunities_select_agency" ON cross_sell_opportunities
  FOR SELECT
  USING (
    agency_id IS NULL
    OR agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = public.get_current_user_id() AND status = 'active'
    )
  );

CREATE POLICY "cross_sell_opportunities_insert_agency" ON cross_sell_opportunities
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT am.agency_id FROM agency_members am
      WHERE am.user_id = public.get_current_user_id() AND am.status = 'active'
    )
  );

CREATE POLICY "cross_sell_opportunities_update_agency" ON cross_sell_opportunities
  FOR UPDATE
  USING (
    agency_id IS NULL
    OR agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = public.get_current_user_id() AND status = 'active'
    )
  );

CREATE POLICY "cross_sell_opportunities_delete_agency" ON cross_sell_opportunities
  FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = public.get_current_user_id() AND status = 'active'
    )
  );

-- --------------------------------------------
-- 1.3: renewal_calendar
-- --------------------------------------------

DROP POLICY IF EXISTS "renewal_calendar_select_agency" ON renewal_calendar;
DROP POLICY IF EXISTS "renewal_calendar_insert_agency" ON renewal_calendar;
DROP POLICY IF EXISTS "renewal_calendar_update_agency" ON renewal_calendar;
DROP POLICY IF EXISTS "renewal_calendar_delete_agency" ON renewal_calendar;

CREATE POLICY "renewal_calendar_select_agency" ON renewal_calendar
  FOR SELECT
  USING (
    agency_id IS NULL
    OR agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = public.get_current_user_id() AND status = 'active'
    )
  );

CREATE POLICY "renewal_calendar_insert_agency" ON renewal_calendar
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT am.agency_id FROM agency_members am
      WHERE am.user_id = public.get_current_user_id() AND am.status = 'active'
    )
  );

CREATE POLICY "renewal_calendar_update_agency" ON renewal_calendar
  FOR UPDATE
  USING (
    agency_id IS NULL
    OR agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = public.get_current_user_id() AND status = 'active'
    )
  );

CREATE POLICY "renewal_calendar_delete_agency" ON renewal_calendar
  FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = public.get_current_user_id() AND status = 'active'
    )
  );

-- --------------------------------------------
-- 1.4: customer_insights
-- --------------------------------------------

DROP POLICY IF EXISTS "customer_insights_select_agency" ON customer_insights;
DROP POLICY IF EXISTS "customer_insights_insert_agency" ON customer_insights;
DROP POLICY IF EXISTS "customer_insights_update_agency" ON customer_insights;
DROP POLICY IF EXISTS "customer_insights_delete_agency" ON customer_insights;

CREATE POLICY "customer_insights_select_agency" ON customer_insights
  FOR SELECT
  USING (
    agency_id IS NULL
    OR agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = public.get_current_user_id() AND status = 'active'
    )
  );

CREATE POLICY "customer_insights_insert_agency" ON customer_insights
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT am.agency_id FROM agency_members am
      WHERE am.user_id = public.get_current_user_id() AND am.status = 'active'
    )
  );

CREATE POLICY "customer_insights_update_agency" ON customer_insights
  FOR UPDATE
  USING (
    agency_id IS NULL
    OR agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = public.get_current_user_id() AND status = 'active'
    )
  );

CREATE POLICY "customer_insights_delete_agency" ON customer_insights
  FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = public.get_current_user_id() AND status = 'active'
    )
  );

-- ============================================================================
-- SECTION 2: Fix auth.uid() -> public.get_current_user_id() in agent tables
-- ============================================================================
-- These policies were created in 20260219_agent_tables.sql using auth.uid().
-- ============================================================================

-- --------------------------------------------
-- 2.1: agent_conversations
-- --------------------------------------------

DROP POLICY IF EXISTS "Users can view own conversations" ON agent_conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON agent_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON agent_conversations;

CREATE POLICY "Users can view own conversations" ON agent_conversations
  FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = public.get_current_user_id()
    )
    AND user_id = public.get_current_user_id()
    AND is_deleted = false
  );

CREATE POLICY "Users can create own conversations" ON agent_conversations
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = public.get_current_user_id()
    )
    AND user_id = public.get_current_user_id()
  );

CREATE POLICY "Users can update own conversations" ON agent_conversations
  FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = public.get_current_user_id()
    )
    AND user_id = public.get_current_user_id()
  );

-- --------------------------------------------
-- 2.2: agent_messages
-- --------------------------------------------

DROP POLICY IF EXISTS "Users can view messages in own conversations" ON agent_messages;
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON agent_messages;

CREATE POLICY "Users can view messages in own conversations" ON agent_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM agent_conversations
      WHERE user_id = public.get_current_user_id()
      AND is_deleted = false
    )
  );

CREATE POLICY "Users can create messages in own conversations" ON agent_messages
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM agent_conversations
      WHERE user_id = public.get_current_user_id()
    )
  );

-- --------------------------------------------
-- 2.3: agent_usage
-- --------------------------------------------

DROP POLICY IF EXISTS "Users can view own usage" ON agent_usage;
DROP POLICY IF EXISTS "Users can create own usage records" ON agent_usage;
DROP POLICY IF EXISTS "Managers can view agency usage" ON agent_usage;

CREATE POLICY "Users can view own usage" ON agent_usage
  FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = public.get_current_user_id()
    )
    AND user_id = public.get_current_user_id()
  );

CREATE POLICY "Users can create own usage records" ON agent_usage
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = public.get_current_user_id()
    )
    AND user_id = public.get_current_user_id()
  );

CREATE POLICY "Managers can view agency usage" ON agent_usage
  FOR SELECT
  USING (
    agency_id IN (
      SELECT am.agency_id FROM agency_members am
      WHERE am.user_id = public.get_current_user_id()
      AND am.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- SECTION 3: Fix auth.uid() -> public.get_current_user_id() in customer_interactions
-- ============================================================================
-- This policy was created in 20260220_customer_interactions.sql using auth.uid().
-- ============================================================================

DROP POLICY IF EXISTS "Agency isolation for customer interactions" ON customer_interactions;

CREATE POLICY "Agency isolation for customer interactions" ON customer_interactions
  FOR ALL
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = public.get_current_user_id()
    )
  );

-- ============================================================================
-- SECTION 4: Fix wide-open RLS policies (USING (true))
-- ============================================================================

-- --------------------------------------------
-- 4.1: contact_history — scope to agency via cross_sell_opportunities join
-- Original policy: "Allow all operations on contact history" FOR ALL USING (true)
-- from 20260205020000_contact_history.sql
-- --------------------------------------------

DROP POLICY IF EXISTS "Allow all operations on contact history" ON contact_history;

CREATE POLICY "contact_history_agency_select" ON contact_history
  FOR SELECT
  USING (
    opportunity_id IN (
      SELECT id FROM cross_sell_opportunities
      WHERE agency_id IN (
        SELECT agency_id FROM agency_members
        WHERE user_id = public.get_current_user_id()
      )
    )
  );

CREATE POLICY "contact_history_agency_insert" ON contact_history
  FOR INSERT
  WITH CHECK (
    opportunity_id IN (
      SELECT id FROM cross_sell_opportunities
      WHERE agency_id IN (
        SELECT agency_id FROM agency_members
        WHERE user_id = public.get_current_user_id()
      )
    )
  );

CREATE POLICY "contact_history_agency_update" ON contact_history
  FOR UPDATE
  USING (
    opportunity_id IN (
      SELECT id FROM cross_sell_opportunities
      WHERE agency_id IN (
        SELECT agency_id FROM agency_members
        WHERE user_id = public.get_current_user_id()
      )
    )
  );

CREATE POLICY "contact_history_agency_delete" ON contact_history
  FOR DELETE
  USING (
    opportunity_id IN (
      SELECT id FROM cross_sell_opportunities
      WHERE agency_id IN (
        SELECT agency_id FROM agency_members
        WHERE user_id = public.get_current_user_id()
      )
    )
  );

-- --------------------------------------------
-- 4.2: pin_reset_tokens — scope to own user
-- Original policy: "Allow all operations on pin_reset_tokens" FOR ALL USING (true)
-- from 20260206040000_pin_reset_tokens.sql
-- --------------------------------------------

DROP POLICY IF EXISTS "Allow all operations on pin_reset_tokens" ON pin_reset_tokens;

CREATE POLICY "pin_reset_tokens_select_own" ON pin_reset_tokens
  FOR SELECT
  USING (user_id = public.get_current_user_id());

CREATE POLICY "pin_reset_tokens_insert" ON pin_reset_tokens
  FOR INSERT
  WITH CHECK (true); -- Service role handles inserts

CREATE POLICY "pin_reset_tokens_delete_own" ON pin_reset_tokens
  FOR DELETE
  USING (user_id = public.get_current_user_id());

-- --------------------------------------------
-- 4.3: device_tokens — drop old permissive policy
-- Original policy: "Users can manage own device tokens" FOR ALL USING (true)
-- from 20241217_device_tokens.sql
-- The reconciliation migration (20260202020000) added proper user-scoped
-- policies but didn't drop this old wide-open one.
-- --------------------------------------------

DROP POLICY IF EXISTS "Users can manage own device tokens" ON device_tokens;

-- --------------------------------------------
-- 4.4: task_reminders — scope to own user
-- Original policy: "Allow all operations on task_reminders" FOR ALL USING (true)
-- from 20260118_reminders.sql (re-created after DROP IF EXISTS)
-- --------------------------------------------

DROP POLICY IF EXISTS "Allow all operations on task_reminders" ON task_reminders;

CREATE POLICY "task_reminders_select_own" ON task_reminders
  FOR SELECT
  USING (user_id = public.get_current_user_id());

CREATE POLICY "task_reminders_insert_own" ON task_reminders
  FOR INSERT
  WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "task_reminders_update_own" ON task_reminders
  FOR UPDATE
  USING (user_id = public.get_current_user_id());

CREATE POLICY "task_reminders_delete_own" ON task_reminders
  FOR DELETE
  USING (user_id = public.get_current_user_id());

-- --------------------------------------------
-- 4.5: daily_digests — fix overly permissive policies
-- Original policies from 20260121_daily_digests.sql:
--   "Users can view own digests" FOR SELECT USING (true)
--   "Allow digest creation" FOR INSERT WITH CHECK (true)
--   "Allow digest updates" FOR UPDATE USING (true) WITH CHECK (true)
-- Note: We keep the insert policy as-is (service role handles digest creation)
-- but we rename "Anyone can view digests" to match what actually exists.
-- --------------------------------------------

-- Drop the policies that actually exist (from the migration file)
DROP POLICY IF EXISTS "Users can view own digests" ON daily_digests;
DROP POLICY IF EXISTS "Allow digest creation" ON daily_digests;
DROP POLICY IF EXISTS "Allow digest updates" ON daily_digests;
-- Also drop these names in case they were renamed at some point
DROP POLICY IF EXISTS "Anyone can view digests" ON daily_digests;
DROP POLICY IF EXISTS "Users can manage their digests" ON daily_digests;

CREATE POLICY "daily_digests_select_own" ON daily_digests
  FOR SELECT
  USING (user_id = public.get_current_user_id());

-- Keep insert permissive — digest generation runs via service role / cron
CREATE POLICY "daily_digests_insert" ON daily_digests
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "daily_digests_update_own" ON daily_digests
  FOR UPDATE
  USING (user_id = public.get_current_user_id());

-- ============================================================================
-- SECTION 5: Add missing index on contact_history(customer_id)
-- ============================================================================
-- The customer_id column was added in 20260220_customer_interactions.sql
-- with an index idx_contact_history_customer, but a filtered index for
-- non-null values improves query performance.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_contact_history_customer_id
  ON contact_history(customer_id)
  WHERE customer_id IS NOT NULL;

-- ============================================================================
-- SECTION 6: Add completed/status sync constraint on todos
-- ============================================================================
-- Ensures the boolean `completed` field and the text `status` field stay
-- in sync. Prevents bugs where completed=true but status='todo'.
-- ============================================================================

-- Note: "ADD CONSTRAINT IF NOT EXISTS" is only supported in PostgreSQL 17+.
-- For compatibility, we use DO block with exception handling.
DO $$
BEGIN
  ALTER TABLE todos ADD CONSTRAINT completed_status_sync
    CHECK (
      (completed = true AND status = 'done') OR
      (completed = false AND status IN ('todo', 'in_progress'))
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
