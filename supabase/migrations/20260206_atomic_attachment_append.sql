-- Atomic Attachment Append Function
-- Migration: Create atomic RPC for attachment append with limit checking
-- Date: 2026-02-06
-- Purpose: Eliminate race condition in attachment uploads

-- ==================================================
-- FUNCTION: append_attachment_if_under_limit
-- ==================================================
--
-- This function atomically appends an attachment to a todo's attachments
-- array ONLY if the current count is below the max limit. This prevents
-- race conditions where two concurrent uploads could both pass the
-- count check and exceed the limit.
--
-- The function uses row-level locking (SELECT FOR UPDATE) to ensure
-- no other transaction can read/modify the attachments array while
-- we're updating it.
--
-- Returns:
--   - success: true if attachment was appended
--   - success: false if limit was reached
--   - error: string with error message if operation failed

CREATE OR REPLACE FUNCTION append_attachment_if_under_limit(
  p_todo_id UUID,
  p_attachment JSONB,
  p_max_attachments INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_count INTEGER;
  v_updated_attachments JSONB;
BEGIN
  -- Lock the row to prevent concurrent modifications
  -- This ensures no race condition between count check and update
  SELECT
    jsonb_array_length(COALESCE(attachments, '[]'::jsonb))
  INTO v_current_count
  FROM todos
  WHERE id = p_todo_id
  FOR UPDATE;  -- Critical: locks the row until transaction completes

  -- Check if record exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Todo not found'
    );
  END IF;

  -- Check if limit is reached
  IF v_current_count >= p_max_attachments THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Maximum of %s attachments reached', p_max_attachments)
    );
  END IF;

  -- Atomically append the new attachment
  UPDATE todos
  SET attachments = COALESCE(attachments, '[]'::jsonb) || p_attachment::jsonb
  WHERE id = p_todo_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return failure
    RAISE WARNING 'append_attachment_if_under_limit failed: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Database error during attachment append'
    );
END;
$$;

-- ==================================================
-- FUNCTION: remove_attachment_by_id
-- ==================================================
--
-- Atomically remove an attachment from a todo's attachments array
-- by its ID. Uses row-level locking to prevent race conditions.
--
-- Returns:
--   - success: true if attachment was removed
--   - success: false if attachment was not found
--   - error: string with error message if operation failed

CREATE OR REPLACE FUNCTION remove_attachment_by_id(
  p_todo_id UUID,
  p_attachment_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attachments JSONB;
  v_updated_attachments JSONB;
  v_found BOOLEAN := FALSE;
BEGIN
  -- Lock the row to prevent concurrent modifications
  SELECT attachments
  INTO v_attachments
  FROM todos
  WHERE id = p_todo_id
  FOR UPDATE;

  -- Check if record exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Todo not found'
    );
  END IF;

  -- Remove the attachment with matching ID
  -- Filter out the attachment by building a new array without it
  SELECT jsonb_agg(elem)
  INTO v_updated_attachments
  FROM jsonb_array_elements(COALESCE(v_attachments, '[]'::jsonb)) elem
  WHERE elem->>'id' != p_attachment_id;

  -- Check if anything was removed
  IF jsonb_array_length(COALESCE(v_updated_attachments, '[]'::jsonb))
     = jsonb_array_length(COALESCE(v_attachments, '[]'::jsonb)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Attachment not found'
    );
  END IF;

  -- Update with filtered array
  UPDATE todos
  SET attachments = COALESCE(v_updated_attachments, '[]'::jsonb)
  WHERE id = p_todo_id;

  RETURN jsonb_build_object(
    'success', true
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'remove_attachment_by_id failed: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Database error during attachment removal'
    );
END;
$$;

-- ==================================================
-- GRANT PERMISSIONS
-- ==================================================

-- Grant execute permission to authenticated users
-- These functions use SECURITY DEFINER so they run with the permissions
-- of the function owner (postgres), allowing bypassing RLS
GRANT EXECUTE ON FUNCTION append_attachment_if_under_limit(UUID, JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_attachment_by_id(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION append_attachment_if_under_limit(UUID, JSONB, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION remove_attachment_by_id(UUID, TEXT) TO anon;

-- ==================================================
-- TEST QUERIES (Run manually to verify)
-- ==================================================

-- Test 1: Append attachment to todo with space
-- Should succeed
/*
SELECT append_attachment_if_under_limit(
  'some-todo-uuid'::uuid,
  '{"id": "test-123", "file_name": "test.pdf", "file_size": 1024}'::jsonb,
  10
);
*/

-- Test 2: Append when at limit
-- Should return success: false
/*
-- First, manually set attachments to an array of 10 items
-- Then try to append one more
SELECT append_attachment_if_under_limit(
  'some-todo-uuid'::uuid,
  '{"id": "test-456", "file_name": "test2.pdf"}'::jsonb,
  10
);
*/

-- Test 3: Remove attachment
-- Should succeed
/*
SELECT remove_attachment_by_id(
  'some-todo-uuid'::uuid,
  'test-123'
);
*/

-- Test 4: Remove non-existent attachment
-- Should return success: false
/*
SELECT remove_attachment_by_id(
  'some-todo-uuid'::uuid,
  'does-not-exist'
);
*/

-- ==================================================
-- VERIFICATION
-- ==================================================

-- List all functions related to attachments
SELECT
  routine_name,
  routine_type,
  data_type,
  security_type
FROM information_schema.routines
WHERE routine_name LIKE '%attachment%'
  AND routine_schema = 'public'
ORDER BY routine_name;

-- Expected output:
-- routine_name                      | routine_type | data_type | security_type
-- ----------------------------------|--------------|-----------|---------------
-- append_attachment_if_under_limit  | FUNCTION     | jsonb     | DEFINER
-- remove_attachment_by_id           | FUNCTION     | jsonb     | DEFINER
