-- Create user_sessions table for secure session management
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  is_valid BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_valid ON user_sessions(is_valid) WHERE is_valid = TRUE;

-- Enable RLS on sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for server-side session creation)
CREATE POLICY "service_role_all"
  ON user_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can only see their own sessions
CREATE POLICY "rls_sessions_select"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can only update their own sessions
CREATE POLICY "rls_sessions_update"
  ON user_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can only delete their own sessions
CREATE POLICY "rls_sessions_delete"
  ON user_sessions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
