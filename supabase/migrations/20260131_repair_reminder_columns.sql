-- Repair migration: Add missing reminder columns to todos table
-- The 20260118_reminders migration was marked as applied but the ALTER TABLE
-- statements may have failed. This ensures the columns exist.

ALTER TABLE todos ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Recreate index for simple reminder column (idempotent)
CREATE INDEX IF NOT EXISTS idx_todos_reminder_pending
    ON todos (reminder_at)
    WHERE reminder_at IS NOT NULL AND reminder_sent = FALSE AND completed = FALSE;

-- Ensure task_reminders table exists (idempotent)
DO $$ BEGIN
    CREATE TYPE reminder_type AS ENUM ('push_notification', 'chat_message', 'both');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reminder_status AS ENUM ('pending', 'sent', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS task_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_type reminder_type DEFAULT 'both',
    status reminder_status DEFAULT 'pending',
    message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure RLS is enabled
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on task_reminders" ON task_reminders;
CREATE POLICY "Allow all operations on task_reminders" ON task_reminders
    FOR ALL USING (true) WITH CHECK (true);

-- Also add daily_digests table if missing (for digest persistence)
CREATE TABLE IF NOT EXISTS daily_digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    digest_type TEXT NOT NULL DEFAULT 'morning',
    digest_date DATE NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'America/Los_Angeles'),
    digest_data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, digest_type, digest_date)
);

ALTER TABLE daily_digests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on daily_digests" ON daily_digests;
CREATE POLICY "Allow all operations on daily_digests" ON daily_digests
    FOR ALL USING (true) WITH CHECK (true);
