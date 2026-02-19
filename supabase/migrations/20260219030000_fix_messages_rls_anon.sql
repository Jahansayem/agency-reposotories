-- Migration: Fix messages RLS for anon role (PIN-based auth)
--
-- Problem: The agency-scoped RLS policies from 20260126_multi_tenancy.sql
-- rely on session context (app.user_name, app.user_id) set via set_request_context().
-- This context is only set in server-side API routes. Client-side Supabase calls
-- use the anon key without session context, causing all message operations to fail
-- when multi-tenancy is enabled (agency_id IS NOT NULL).
--
-- Fix: Add permissive policies for the anon role that allow basic CRUD operations.
-- The app validates users via PIN authentication on the client side.
-- Agency filtering is done at the query level (client adds .eq('agency_id', ...)).

-- Drop the restrictive agency-scoped policies
DROP POLICY IF EXISTS "messages_select_agency" ON messages;
DROP POLICY IF EXISTS "messages_insert_agency" ON messages;
DROP POLICY IF EXISTS "messages_update_agency" ON messages;
DROP POLICY IF EXISTS "messages_delete_agency" ON messages;

-- SELECT: Allow all messages (client filters by agency_id and conversation)
CREATE POLICY "messages_select_all"
  ON messages FOR SELECT
  TO anon, authenticated
  USING (true);

-- INSERT: Allow inserting messages (client sets created_by and agency_id)
CREATE POLICY "messages_insert_all"
  ON messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- UPDATE: Allow updating messages (for reactions, edits, read_by, pins)
CREATE POLICY "messages_update_all"
  ON messages FOR UPDATE
  TO anon, authenticated
  USING (true);

-- DELETE: Allow deleting messages (soft delete via deleted_at update)
CREATE POLICY "messages_delete_all"
  ON messages FOR DELETE
  TO anon, authenticated
  USING (true);
