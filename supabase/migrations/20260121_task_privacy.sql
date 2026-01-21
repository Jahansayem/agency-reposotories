-- Migration: Enable Private/Public Task Visibility
-- Date: 2026-01-21
-- Description: Ensure is_private column exists in todos table for task privacy feature

-- Add is_private column if it doesn't exist
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

-- Add index for filtering private tasks (optimizes queries)
CREATE INDEX IF NOT EXISTS idx_todos_is_private ON todos(is_private);

-- Add comment for documentation
COMMENT ON COLUMN todos.is_private IS 'If true, task is only visible to creator and assignee. Default false (public).';

-- Verify column exists and show current structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'todos' AND column_name = 'is_private';

-- Update existing NULL values to FALSE (for safety)
UPDATE todos
SET is_private = FALSE
WHERE is_private IS NULL;

-- Check current private task count
SELECT
  COUNT(*) FILTER (WHERE is_private = TRUE) AS private_tasks,
  COUNT(*) FILTER (WHERE is_private = FALSE OR is_private IS NULL) AS public_tasks,
  COUNT(*) AS total_tasks
FROM todos;
