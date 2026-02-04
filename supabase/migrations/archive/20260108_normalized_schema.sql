-- Migration: Normalized Database Schema
-- Date: 2026-01-08
-- Description: Create normalized tables alongside existing JSONB columns for gradual migration

-- ============================================
-- SUBTASKS TABLE (normalized from JSONB)
-- ============================================
CREATE TABLE IF NOT EXISTS subtasks_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium',
  estimated_minutes INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subtasks_v2_todo_id ON subtasks_v2(todo_id);
CREATE INDEX idx_subtasks_v2_completed ON subtasks_v2(completed);
CREATE INDEX idx_subtasks_v2_display_order ON subtasks_v2(todo_id, display_order);

-- Enable RLS
ALTER TABLE subtasks_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subtasks
CREATE POLICY "rls_subtasks_select"
  ON subtasks_v2 FOR SELECT
  USING (
    CASE
      WHEN auth.rls_enabled() THEN (
        EXISTS (
          SELECT 1 FROM todos
          WHERE todos.id = subtasks_v2.todo_id
          AND (
            todos.assigned_to = auth.user_name() OR
            todos.created_by = auth.user_name() OR
            auth.is_admin()
          )
        )
      )
      ELSE true
    END
  );

CREATE POLICY "rls_subtasks_insert"
  ON subtasks_v2 FOR INSERT
  WITH CHECK (
    CASE
      WHEN auth.rls_enabled() THEN (
        EXISTS (
          SELECT 1 FROM todos
          WHERE todos.id = subtasks_v2.todo_id
          AND (
            todos.assigned_to = auth.user_name() OR
            todos.created_by = auth.user_name()
          )
        )
      )
      ELSE true
    END
  );

CREATE POLICY "rls_subtasks_update"
  ON subtasks_v2 FOR UPDATE
  USING (
    CASE
      WHEN auth.rls_enabled() THEN (
        EXISTS (
          SELECT 1 FROM todos
          WHERE todos.id = subtasks_v2.todo_id
          AND (
            todos.assigned_to = auth.user_name() OR
            todos.created_by = auth.user_name()
          )
        )
      )
      ELSE true
    END
  );

CREATE POLICY "rls_subtasks_delete"
  ON subtasks_v2 FOR DELETE
  USING (
    CASE
      WHEN auth.rls_enabled() THEN (
        EXISTS (
          SELECT 1 FROM todos
          WHERE todos.id = subtasks_v2.todo_id
          AND (
            todos.created_by = auth.user_name() OR
            auth.is_admin()
          )
        )
      )
      ELSE true
    END
  );

-- ============================================
-- ATTACHMENTS TABLE (normalized from JSONB)
-- ============================================
CREATE TABLE IF NOT EXISTS attachments_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  uploaded_by_name TEXT, -- Temporary - will migrate to user_id
  uploaded_by_id UUID REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_attachments_v2_todo_id ON attachments_v2(todo_id);
CREATE INDEX idx_attachments_v2_uploaded_by ON attachments_v2(uploaded_by_id);

-- Enable RLS
ALTER TABLE attachments_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attachments
CREATE POLICY "rls_attachments_select"
  ON attachments_v2 FOR SELECT
  USING (
    CASE
      WHEN auth.rls_enabled() THEN (
        EXISTS (
          SELECT 1 FROM todos
          WHERE todos.id = attachments_v2.todo_id
          AND (
            todos.assigned_to = auth.user_name() OR
            todos.created_by = auth.user_name() OR
            auth.is_admin()
          )
        )
      )
      ELSE true
    END
  );

CREATE POLICY "rls_attachments_insert"
  ON attachments_v2 FOR INSERT
  WITH CHECK (
    CASE
      WHEN auth.rls_enabled() THEN (
        EXISTS (
          SELECT 1 FROM todos
          WHERE todos.id = attachments_v2.todo_id
          AND (
            todos.assigned_to = auth.user_name() OR
            todos.created_by = auth.user_name()
          )
        )
      )
      ELSE true
    END
  );

CREATE POLICY "rls_attachments_delete"
  ON attachments_v2 FOR DELETE
  USING (
    CASE
      WHEN auth.rls_enabled() THEN (
        uploaded_by_name = auth.user_name() OR
        auth.is_admin()
      )
      ELSE true
    END
  );

-- ============================================
-- USER ASSIGNMENTS TABLE (replaces string references)
-- ============================================
CREATE TABLE IF NOT EXISTS user_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by_id UUID REFERENCES users(id),
  UNIQUE(todo_id, user_id)
);

CREATE INDEX idx_user_assignments_todo ON user_assignments(todo_id);
CREATE INDEX idx_user_assignments_user ON user_assignments(user_id);

-- Enable RLS
ALTER TABLE user_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user assignments
CREATE POLICY "rls_assignments_select"
  ON user_assignments FOR SELECT
  USING (
    CASE
      WHEN auth.rls_enabled() THEN (
        user_id = auth.user_id() OR
        auth.is_admin()
      )
      ELSE true
    END
  );

CREATE POLICY "rls_assignments_insert"
  ON user_assignments FOR INSERT
  WITH CHECK (true); -- Anyone can assign tasks

CREATE POLICY "rls_assignments_delete"
  ON user_assignments FOR DELETE
  USING (
    CASE
      WHEN auth.rls_enabled() THEN (
        assigned_by_id = auth.user_id() OR
        auth.is_admin()
      )
      ELSE true
    END
  );

-- ============================================
-- MIGRATION TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS schema_migration_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  rows_migrated INTEGER DEFAULT 0,
  total_rows INTEGER DEFAULT 0,
  migration_started_at TIMESTAMP WITH TIME ZONE,
  migration_completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  error_message TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MIGRATION ERROR LOG
-- ============================================
CREATE TABLE IF NOT EXISTS migration_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  error TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_migration_errors_table ON migration_errors(table_name);

-- ============================================
-- HELPER FUNCTIONS FOR DATA CONSISTENCY
-- ============================================

-- Function to check if subtasks are in sync
CREATE OR REPLACE FUNCTION check_subtasks_sync(p_todo_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  jsonb_count INTEGER;
  table_count INTEGER;
BEGIN
  -- Count subtasks in JSONB
  SELECT COALESCE(jsonb_array_length(subtasks), 0)
  INTO jsonb_count
  FROM todos
  WHERE id = p_todo_id;

  -- Count subtasks in table
  SELECT COUNT(*)
  INTO table_count
  FROM subtasks_v2
  WHERE todo_id = p_todo_id;

  RETURN jsonb_count = table_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get all subtasks (prefers table, falls back to JSONB)
CREATE OR REPLACE FUNCTION get_subtasks(p_todo_id UUID)
RETURNS TABLE (
  id UUID,
  text TEXT,
  completed BOOLEAN,
  priority TEXT,
  estimated_minutes INTEGER,
  display_order INTEGER
) AS $$
BEGIN
  -- Check if normalized table has data
  IF EXISTS (SELECT 1 FROM subtasks_v2 WHERE todo_id = p_todo_id LIMIT 1) THEN
    -- Return from normalized table
    RETURN QUERY
    SELECT
      s.id,
      s.text,
      s.completed,
      s.priority,
      s.estimated_minutes,
      s.display_order
    FROM subtasks_v2 s
    WHERE s.todo_id = p_todo_id
    ORDER BY s.display_order;
  ELSE
    -- Return from JSONB
    RETURN QUERY
    SELECT
      (st->>'id')::UUID,
      st->>'text',
      (st->>'completed')::BOOLEAN,
      st->>'priority',
      (st->>'estimatedMinutes')::INTEGER,
      (row_number() OVER () - 1)::INTEGER
    FROM todos t,
    jsonb_array_elements(t.subtasks) WITH ORDINALITY AS st
    WHERE t.id = p_todo_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE subtasks_v2 IS 'Normalized subtasks table (migrating from JSONB)';
COMMENT ON TABLE attachments_v2 IS 'Normalized attachments table (migrating from JSONB)';
COMMENT ON TABLE user_assignments IS 'Normalized user assignments (migrating from string names)';
COMMENT ON TABLE schema_migration_status IS 'Tracks progress of schema migration';
COMMENT ON FUNCTION check_subtasks_sync IS 'Verify subtasks are in sync between JSONB and table';
COMMENT ON FUNCTION get_subtasks IS 'Get subtasks from either normalized table or JSONB fallback';

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE subtasks_v2;
ALTER PUBLICATION supabase_realtime ADD TABLE attachments_v2;
ALTER PUBLICATION supabase_realtime ADD TABLE user_assignments;
