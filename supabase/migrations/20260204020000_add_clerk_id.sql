-- Migration: Add Clerk user ID to users table
-- Purpose: Support Clerk SSO alongside existing PIN authentication
-- Date: 2026-02-04

-- Add clerk_id column to users table
-- This allows linking Clerk-authenticated users to existing accounts
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;

-- Add email column if not exists (Clerk uses email as primary identifier)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Create index for fast Clerk ID lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id) WHERE clerk_id IS NOT NULL;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN users.clerk_id IS 'Clerk user ID for SSO authentication. NULL for PIN-only users.';
COMMENT ON COLUMN users.email IS 'User email address. Required for Clerk users, optional for PIN users.';

-- Grant permissions
GRANT ALL ON users TO postgres, anon, authenticated, service_role;
