# Fix "Failed to create session" Error

## Problem
Login fails with "Failed to create session" because the `user_sessions` table doesn't exist in the Supabase database.

**Error Details:**
```
errorCode: 'PGRST205',
errorMessage: "Could not find the table 'public.user_sessions' in the schema cache"
```

## Root Cause
The `user_sessions` table migration exists in the codebase but hasn't been run in the Supabase database yet.

## Solution
You need to run the migration file in your Supabase project to create the `user_sessions` table.

### Steps:

1. **Go to Supabase Dashboard:**
   - Navigate to https://supabase.com/dashboard
   - Open your project: `bzjssogezdnybbenqygq`

2. **Open SQL Editor:**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Migration:**
   - Copy the contents of `supabase/migrations/20260114_security_improvements.sql`
   - Paste into the SQL editor
   - Click "Run" or press Cmd+Enter

4. **Verify the Table Was Created:**
   - Go to "Table Editor" in the left sidebar
   - Look for the `user_sessions` table
   - You should see it with these columns:
     - `id` (UUID)
     - `user_id` (UUID, foreign key to users)
     - `token_hash` (TEXT)
     - `created_at` (TIMESTAMPTZ)
     - `expires_at` (TIMESTAMPTZ)
     - `last_activity` (TIMESTAMPTZ)
     - `ip_address` (TEXT)
     - `user_agent` (TEXT)
     - `is_valid` (BOOLEAN)

5. **Test Login:**
   - Go back to http://localhost:3000
   - Try logging in with Derrick / PIN 8008
   - Login should now succeed!

## Migration File Location
`supabase/migrations/20260114_security_improvements.sql`

## Why This Happened
The migration files in the `supabase/migrations/` directory are not automatically applied to your Supabase project. They need to be manually run in the Supabase SQL editor.

## Alternative: Run All Pending Migrations
If you want to run ALL migrations (recommended), you can:

1. Open each `.sql` file in `supabase/migrations/` folder
2. Run them in order (sorted by filename/date)
3. This ensures your database schema is fully up-to-date

## Files to Run (in order):
```bash
supabase/migrations/20241216_initial_tables.sql
supabase/migrations/20250103_activity_templates.sql
supabase/migrations/20250104_messages_attachments.sql
supabase/migrations/20250106_strategic_goals.sql
supabase/migrations/20250107_device_tokens.sql
supabase/migrations/20260114_security_improvements.sql
supabase/migrations/20260125_security_hardening.sql
```

## Status After Fix
✅ CSRF validation - WORKING
✅ Railway build - WORKING
⏳ Session creation - PENDING (run migration)
⏳ Login flow - PENDING (run migration)

---

**Note:** This is a one-time setup step. Once the migrations are run, login will work permanently.
