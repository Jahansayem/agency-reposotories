-- Migration: Add OAuth 2.0 Support
-- Date: 2026-01-08
-- Description: Add fields to support OAuth authentication alongside PIN auth

-- Add OAuth fields to users table (non-breaking changes)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS email_verified TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'pin', -- 'pin', 'google', 'apple', 'both'
  ADD COLUMN IF NOT EXISTS provider_account_id TEXT;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(auth_provider);

-- Create accounts table for NextAuth (OAuth providers)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

-- Create sessions table for NextAuth
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);

-- Create verification tokens table for NextAuth
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Enable RLS on new tables (with permissive policies for now)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;

-- Permissive policies (will be tightened in later migration)
CREATE POLICY "Allow all operations on accounts" ON accounts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on sessions" ON sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on verification_tokens" ON verification_tokens
  FOR ALL USING (true) WITH CHECK (true);

-- Function to migrate user from PIN to OAuth
CREATE OR REPLACE FUNCTION migrate_user_to_oauth(
  p_user_id UUID,
  p_email TEXT,
  p_provider TEXT,
  p_provider_account_id TEXT
) RETURNS VOID AS $$
BEGIN
  -- Update user record
  UPDATE users
  SET
    email = p_email,
    auth_provider = CASE
      WHEN auth_provider = 'pin' THEN 'both'
      ELSE p_provider
    END,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on migration
COMMENT ON TABLE accounts IS 'OAuth provider accounts for NextAuth.js';
COMMENT ON TABLE sessions IS 'User sessions for NextAuth.js';
COMMENT ON FUNCTION migrate_user_to_oauth IS 'Helper function to migrate PIN users to OAuth while maintaining backward compatibility';
