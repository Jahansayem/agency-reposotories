-- Atomic Todo Dual-Write Functions
-- Migration: Create atomic RPC functions for todo dual-write operations
-- Date: 2026-02-08
-- Purpose: Eliminate race conditions in TodoService dual-write operations
--
-- Background:
-- The TodoService writes to both the old (JSONB) schema and the new (normalized)
-- schema for zero-downtime migration. Previously, these were separate client-side
-- calls, creating race conditions where a failure between writes could leave data
-- inconsistent (e.g., todo created in old schema but subtasks missing from new schema).
--
-- These PostgreSQL functions wrap the dual-write operations in implicit transactions,
-- ensuring atomicity: either all writes succeed or none do.

-- ==================================================
-- FUNCTION: todo_create_with_sync
-- ==================================================
--
-- Atomically creates a todo in the old schema and syncs subtasks, attachments,
-- and user assignments to the normalized schema.
--
-- Parameters:
--   p_text, p_completed, p_status, etc. - Todo fields
--   p_subtasks - JSONB array of subtask objects
--   p_attachments - JSONB array of attachment objects
--   p_sync_normalized - Whether to sync to normalized schema tables
--
-- Returns: The newly created todo row as JSONB

CREATE OR REPLACE FUNCTION todo_create_with_sync(
  p_text TEXT,
  p_completed BOOLEAN DEFAULT FALSE,
  p_status TEXT DEFAULT 'todo',
  p_priority TEXT DEFAULT 'medium',
  p_created_by TEXT DEFAULT NULL,
  p_assigned_to TEXT DEFAULT NULL,
  p_due_date TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_recurrence TEXT DEFAULT NULL,
  p_subtasks JSONB DEFAULT '[]'::JSONB,
  p_attachments JSONB DEFAULT '[]'::JSONB,
  p_transcription TEXT DEFAULT NULL,
  p_agency_id UUID DEFAULT NULL,
  p_sync_normalized BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_todo RECORD;
  v_subtask JSONB;
  v_attachment JSONB;
  v_user_id UUID;
  v_index INTEGER;
BEGIN
  -- Step 1: Insert into the old (JSONB) schema
  INSERT INTO todos (
    text, completed, status, priority, created_by, assigned_to,
    due_date, notes, recurrence, subtasks, attachments, transcription, agency_id
  )
  VALUES (
    p_text, p_completed, p_status, p_priority, p_created_by, p_assigned_to,
    p_due_date, p_notes, p_recurrence, p_subtasks, p_attachments, p_transcription, p_agency_id
  )
  RETURNING * INTO v_new_todo;

  -- Step 2: If normalized schema sync is enabled, write to normalized tables
  IF p_sync_normalized THEN
    -- Sync subtasks
    IF p_subtasks IS NOT NULL AND jsonb_array_length(p_subtasks) > 0 THEN
      v_index := 0;
      FOR v_subtask IN SELECT * FROM jsonb_array_elements(p_subtasks)
      LOOP
        INSERT INTO subtasks_v2 (
          id, todo_id, text, completed, priority, estimated_minutes, display_order
        )
        VALUES (
          COALESCE((v_subtask->>'id')::UUID, gen_random_uuid()),
          v_new_todo.id,
          v_subtask->>'text',
          COALESCE((v_subtask->>'completed')::BOOLEAN, FALSE),
          COALESCE(v_subtask->>'priority', 'medium'),
          (v_subtask->>'estimatedMinutes')::INTEGER,
          v_index
        );
        v_index := v_index + 1;
      END LOOP;
    END IF;

    -- Sync attachments
    IF p_attachments IS NOT NULL AND jsonb_array_length(p_attachments) > 0 THEN
      FOR v_attachment IN SELECT * FROM jsonb_array_elements(p_attachments)
      LOOP
        INSERT INTO attachments_v2 (
          id, todo_id, file_name, file_type, file_size,
          storage_path, mime_type, uploaded_by_name, uploaded_at
        )
        VALUES (
          COALESCE((v_attachment->>'id')::UUID, gen_random_uuid()),
          v_new_todo.id,
          v_attachment->>'file_name',
          v_attachment->>'file_type',
          COALESCE((v_attachment->>'file_size')::INTEGER, 0),
          v_attachment->>'storage_path',
          v_attachment->>'mime_type',
          v_attachment->>'uploaded_by',
          COALESCE((v_attachment->>'uploaded_at')::TIMESTAMPTZ, NOW())
        );
      END LOOP;
    END IF;

    -- Sync user assignment
    IF p_assigned_to IS NOT NULL THEN
      SELECT id INTO v_user_id FROM users WHERE name = p_assigned_to LIMIT 1;
      IF v_user_id IS NOT NULL THEN
        INSERT INTO user_assignments (todo_id, user_id, assigned_at)
        VALUES (v_new_todo.id, v_user_id, v_new_todo.created_at)
        ON CONFLICT (todo_id, user_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  -- Return the created todo as JSONB
  RETURN to_jsonb(v_new_todo);

EXCEPTION
  WHEN OTHERS THEN
    -- The entire transaction is rolled back automatically
    RAISE WARNING 'todo_create_with_sync failed: %', SQLERRM;
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Failed to create todo: ' || SQLERRM
    );
END;
$$;

-- ==================================================
-- FUNCTION: todo_update_with_sync
-- ==================================================
--
-- Atomically updates a todo in the old schema and re-syncs subtasks,
-- attachments, and user assignments to the normalized schema.
--
-- Uses row-level locking (SELECT FOR UPDATE) to prevent concurrent
-- modifications from creating inconsistent state.
--
-- Returns: The updated todo row as JSONB

CREATE OR REPLACE FUNCTION todo_update_with_sync(
  p_todo_id UUID,
  p_updates JSONB,
  p_sync_normalized BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_todo RECORD;
  v_subtask JSONB;
  v_attachment JSONB;
  v_user_id UUID;
  v_index INTEGER;
  v_subtasks JSONB;
  v_attachments JSONB;
  v_assigned_to TEXT;
BEGIN
  -- Step 1: Lock and update the todo row
  -- The FOR UPDATE lock prevents concurrent modifications
  PERFORM 1 FROM todos WHERE id = p_todo_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Todo not found'
    );
  END IF;

  -- Build dynamic update using the JSONB fields
  UPDATE todos
  SET
    text = COALESCE(p_updates->>'text', text),
    completed = COALESCE((p_updates->>'completed')::BOOLEAN, completed),
    status = COALESCE(p_updates->>'status', status),
    priority = COALESCE(p_updates->>'priority', priority),
    assigned_to = CASE
      WHEN p_updates ? 'assigned_to' THEN p_updates->>'assigned_to'
      ELSE assigned_to
    END,
    due_date = CASE
      WHEN p_updates ? 'due_date' THEN (p_updates->>'due_date')::TIMESTAMPTZ
      ELSE due_date
    END,
    notes = CASE
      WHEN p_updates ? 'notes' THEN p_updates->>'notes'
      ELSE notes
    END,
    recurrence = CASE
      WHEN p_updates ? 'recurrence' THEN p_updates->>'recurrence'
      ELSE recurrence
    END,
    subtasks = CASE
      WHEN p_updates ? 'subtasks' THEN p_updates->'subtasks'
      ELSE subtasks
    END,
    attachments = CASE
      WHEN p_updates ? 'attachments' THEN p_updates->'attachments'
      ELSE attachments
    END,
    transcription = CASE
      WHEN p_updates ? 'transcription' THEN p_updates->>'transcription'
      ELSE transcription
    END,
    updated_at = NOW(),
    updated_by = CASE
      WHEN p_updates ? 'updated_by' THEN p_updates->>'updated_by'
      ELSE updated_by
    END,
    waiting_for_response = CASE
      WHEN p_updates ? 'waiting_for_response' THEN (p_updates->>'waiting_for_response')::BOOLEAN
      ELSE waiting_for_response
    END,
    waiting_since = CASE
      WHEN p_updates ? 'waiting_since' THEN (p_updates->>'waiting_since')::TIMESTAMPTZ
      ELSE waiting_since
    END,
    waiting_contact_type = CASE
      WHEN p_updates ? 'waiting_contact_type' THEN p_updates->>'waiting_contact_type'
      ELSE waiting_contact_type
    END,
    follow_up_after_hours = CASE
      WHEN p_updates ? 'follow_up_after_hours' THEN (p_updates->>'follow_up_after_hours')::INTEGER
      ELSE follow_up_after_hours
    END,
    category = CASE
      WHEN p_updates ? 'category' THEN p_updates->>'category'
      ELSE category
    END,
    premium_amount = CASE
      WHEN p_updates ? 'premium_amount' THEN (p_updates->>'premium_amount')::NUMERIC
      ELSE premium_amount
    END,
    customer_name = CASE
      WHEN p_updates ? 'customer_name' THEN p_updates->>'customer_name'
      ELSE customer_name
    END,
    policy_type = CASE
      WHEN p_updates ? 'policy_type' THEN p_updates->>'policy_type'
      ELSE policy_type
    END,
    renewal_status = CASE
      WHEN p_updates ? 'renewal_status' THEN p_updates->>'renewal_status'
      ELSE renewal_status
    END,
    customer_id = CASE
      WHEN p_updates ? 'customer_id' THEN (p_updates->>'customer_id')::UUID
      ELSE customer_id
    END,
    display_order = CASE
      WHEN p_updates ? 'display_order' THEN (p_updates->>'display_order')::INTEGER
      ELSE display_order
    END
  WHERE id = p_todo_id
  RETURNING * INTO v_updated_todo;

  -- Step 2: If normalized schema sync is enabled, re-sync normalized tables
  IF p_sync_normalized AND v_updated_todo IS NOT NULL THEN
    -- Re-sync subtasks if they were updated
    v_subtasks := v_updated_todo.subtasks;
    IF v_subtasks IS NOT NULL AND jsonb_array_length(v_subtasks) > 0 THEN
      -- Delete existing subtasks for this todo
      DELETE FROM subtasks_v2 WHERE todo_id = p_todo_id;

      -- Insert updated subtasks
      v_index := 0;
      FOR v_subtask IN SELECT * FROM jsonb_array_elements(v_subtasks)
      LOOP
        INSERT INTO subtasks_v2 (
          id, todo_id, text, completed, priority, estimated_minutes, display_order
        )
        VALUES (
          COALESCE((v_subtask->>'id')::UUID, gen_random_uuid()),
          p_todo_id,
          v_subtask->>'text',
          COALESCE((v_subtask->>'completed')::BOOLEAN, FALSE),
          COALESCE(v_subtask->>'priority', 'medium'),
          (v_subtask->>'estimatedMinutes')::INTEGER,
          v_index
        );
        v_index := v_index + 1;
      END LOOP;
    ELSIF v_subtasks IS NOT NULL AND jsonb_array_length(v_subtasks) = 0 THEN
      -- Subtasks were explicitly set to empty, remove all
      DELETE FROM subtasks_v2 WHERE todo_id = p_todo_id;
    END IF;

    -- Re-sync attachments if they were updated
    v_attachments := v_updated_todo.attachments;
    IF v_attachments IS NOT NULL AND jsonb_array_length(v_attachments) > 0 THEN
      -- Delete existing attachments for this todo
      DELETE FROM attachments_v2 WHERE todo_id = p_todo_id;

      -- Insert updated attachments
      FOR v_attachment IN SELECT * FROM jsonb_array_elements(v_attachments)
      LOOP
        INSERT INTO attachments_v2 (
          id, todo_id, file_name, file_type, file_size,
          storage_path, mime_type, uploaded_by_name, uploaded_at
        )
        VALUES (
          COALESCE((v_attachment->>'id')::UUID, gen_random_uuid()),
          p_todo_id,
          v_attachment->>'file_name',
          v_attachment->>'file_type',
          COALESCE((v_attachment->>'file_size')::INTEGER, 0),
          v_attachment->>'storage_path',
          v_attachment->>'mime_type',
          v_attachment->>'uploaded_by',
          COALESCE((v_attachment->>'uploaded_at')::TIMESTAMPTZ, NOW())
        );
      END LOOP;
    ELSIF v_attachments IS NOT NULL AND jsonb_array_length(v_attachments) = 0 THEN
      -- Attachments were explicitly set to empty, remove all
      DELETE FROM attachments_v2 WHERE todo_id = p_todo_id;
    END IF;

    -- Re-sync user assignment
    v_assigned_to := v_updated_todo.assigned_to;
    IF v_assigned_to IS NOT NULL THEN
      SELECT id INTO v_user_id FROM users WHERE name = v_assigned_to LIMIT 1;
      IF v_user_id IS NOT NULL THEN
        INSERT INTO user_assignments (todo_id, user_id, assigned_at)
        VALUES (p_todo_id, v_user_id, COALESCE(v_updated_todo.created_at, NOW()))
        ON CONFLICT (todo_id, user_id) DO NOTHING;
      END IF;
    ELSE
      -- If assigned_to was cleared, remove assignments
      DELETE FROM user_assignments WHERE todo_id = p_todo_id;
    END IF;
  END IF;

  -- Return the updated todo as JSONB
  RETURN to_jsonb(v_updated_todo);

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'todo_update_with_sync failed: %', SQLERRM;
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Failed to update todo: ' || SQLERRM
    );
END;
$$;

-- ==================================================
-- FUNCTION: todo_delete_with_sync
-- ==================================================
--
-- Atomically deletes a todo from both the old and normalized schemas.
-- Deletes normalized schema data first, then the main todo record.
-- The ON DELETE CASCADE on subtasks_v2 and attachments_v2 handles
-- those, but we explicitly delete user_assignments.
--
-- Returns: JSONB with success/error status

CREATE OR REPLACE FUNCTION todo_delete_with_sync(
  p_todo_id UUID,
  p_sync_normalized BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Lock the row to prevent concurrent operations
  PERFORM 1 FROM todos WHERE id = p_todo_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Todo not found'
    );
  END IF;

  -- Step 1: Delete from normalized schema (if enabled)
  IF p_sync_normalized THEN
    -- user_assignments doesn't have ON DELETE CASCADE from todos
    DELETE FROM user_assignments WHERE todo_id = p_todo_id;
    -- subtasks_v2 and attachments_v2 have ON DELETE CASCADE, but explicit
    -- delete ensures we don't rely on cascade timing
    DELETE FROM subtasks_v2 WHERE todo_id = p_todo_id;
    DELETE FROM attachments_v2 WHERE todo_id = p_todo_id;
  END IF;

  -- Step 2: Delete from old schema
  DELETE FROM todos WHERE id = p_todo_id;

  RETURN jsonb_build_object(
    'success', true
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'todo_delete_with_sync failed: %', SQLERRM;
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Failed to delete todo: ' || SQLERRM
    );
END;
$$;

-- ==================================================
-- GRANT PERMISSIONS
-- ==================================================

-- Grant execute to both authenticated and anon roles
-- (matching the pattern used by append_attachment_if_under_limit)
GRANT EXECUTE ON FUNCTION todo_create_with_sync(
  TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, JSONB, JSONB, TEXT, UUID, BOOLEAN
) TO authenticated;
GRANT EXECUTE ON FUNCTION todo_create_with_sync(
  TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, JSONB, JSONB, TEXT, UUID, BOOLEAN
) TO anon;

GRANT EXECUTE ON FUNCTION todo_update_with_sync(UUID, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION todo_update_with_sync(UUID, JSONB, BOOLEAN) TO anon;

GRANT EXECUTE ON FUNCTION todo_delete_with_sync(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION todo_delete_with_sync(UUID, BOOLEAN) TO anon;

-- ==================================================
-- COMMENTS
-- ==================================================

COMMENT ON FUNCTION todo_create_with_sync IS 'Atomically create a todo and sync to normalized schema tables';
COMMENT ON FUNCTION todo_update_with_sync IS 'Atomically update a todo and re-sync normalized schema tables';
COMMENT ON FUNCTION todo_delete_with_sync IS 'Atomically delete a todo from both old and normalized schemas';
