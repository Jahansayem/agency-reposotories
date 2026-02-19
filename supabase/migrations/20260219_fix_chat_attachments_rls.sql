-- Migration: Fix chat-attachments storage RLS policy
-- Date: 2026-02-19
--
-- Problem: The original migration (20260201020000_chat_attachments.sql) created
-- an INSERT policy restricted to `authenticated` role. However, this app uses
-- PIN-based authentication, not Supabase Auth, so the client connects as `anon`.
-- This causes all chat attachment uploads to fail silently with a storage error.
--
-- Fix: Drop the authenticated-only INSERT policy and replace it with one that
-- also allows the `anon` role to upload to the chat-attachments bucket.
-- The DELETE policy is also updated to allow anon users to delete (since there
-- is no auth.uid() to check against with PIN-based auth).

-- Drop the old INSERT policy that only allowed authenticated users
DROP POLICY IF EXISTS "Allow authenticated users to upload chat attachments"
ON storage.objects;

-- Create new INSERT policy that allows both authenticated and anon users
CREATE POLICY "Allow users to upload chat attachments"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- Drop the old DELETE policy that relied on auth.uid()
DROP POLICY IF EXISTS "Allow users to delete their own chat attachments"
ON storage.objects;

-- Create new DELETE policy that allows both roles
-- Since we use PIN-based auth, we cannot verify ownership via auth.uid()
CREATE POLICY "Allow users to delete chat attachments"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'chat-attachments');
