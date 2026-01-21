-- ============================================
-- Quick SQL: Enable Private/Public Task Visibility
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Add is_private column if not exists
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

-- Step 2: Add index for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_todos_is_private ON todos(is_private);

-- Step 3: Add documentation comment
COMMENT ON COLUMN todos.is_private IS 'If true, task is only visible to creator and assignee. Default false (public).';

-- Step 4: Update NULL values to FALSE (for safety)
UPDATE todos
SET is_private = FALSE
WHERE is_private IS NULL;

-- Step 5: Verify the changes
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'todos' AND column_name = 'is_private';

-- Step 6: Check current statistics
SELECT
  COUNT(*) FILTER (WHERE is_private = TRUE) AS private_tasks,
  COUNT(*) FILTER (WHERE is_private = FALSE OR is_private IS NULL) AS public_tasks,
  COUNT(*) AS total_tasks
FROM todos;

-- ============================================
-- Verification Queries
-- ============================================

-- Test: View private tasks
SELECT id, text, created_by, assigned_to, is_private
FROM todos
WHERE is_private = TRUE
ORDER BY created_at DESC
LIMIT 5;

-- Test: View public tasks
SELECT id, text, created_by, assigned_to, is_private
FROM todos
WHERE is_private = FALSE OR is_private IS NULL
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- Note: is_private Field Usage
-- ============================================
-- FALSE or NULL: Task is visible to all team members (public)
-- TRUE: Task is only visible to creator and assignee (private)
-- Default: FALSE (public)
