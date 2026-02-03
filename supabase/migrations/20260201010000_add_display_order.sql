-- Migration: Add display_order column for manual task sorting
-- Created: 2026-02-01
-- Purpose: Enable users to manually reorder tasks in list view (Todoist-style)

-- Add display_order column (nullable for backward compatibility)
ALTER TABLE todos ADD COLUMN display_order INTEGER;

-- Set initial order based on created_at (newest first)
-- Use row_number() to assign sequential order
UPDATE todos
SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
  FROM todos
) AS subquery
WHERE todos.id = subquery.id;

-- Create index for performance (tasks will be sorted by display_order frequently)
CREATE INDEX idx_todos_display_order ON todos(display_order);

-- Add comment for documentation
COMMENT ON COLUMN todos.display_order IS 'Manual sort order for list view. Lower numbers appear first. NULL falls back to created_at DESC.';

-- Migration rollback (if needed):
-- DROP INDEX IF EXISTS idx_todos_display_order;
-- ALTER TABLE todos DROP COLUMN IF EXISTS display_order;
