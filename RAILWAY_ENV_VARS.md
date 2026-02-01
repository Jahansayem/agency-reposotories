# Railway Environment Variables Required

## Critical Production Deployment Error

**Error**: `SUPABASE_SERVICE_ROLE_KEY is required for the login endpoint`

Your Railway deployment is failing because the following environment variable is missing:

## Required Environment Variables

Add these in Railway Dashboard → Variables:

```
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key-from-supabase>
```

## How to Get the Service Role Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **service_role** key (NOT the anon key)
5. Add it to Railway as `SUPABASE_SERVICE_ROLE_KEY`

## Other Environment Variables (Already Set)

These should already be configured, but verify they exist:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
ANTHROPIC_API_KEY=<your-anthropic-key>
OPENAI_API_KEY=<your-openai-key>
OUTLOOK_ADDON_API_KEY=<your-outlook-addon-key>
```

## Security Note

⚠️ **CRITICAL**: The service_role key has FULL DATABASE ACCESS and bypasses Row Level Security (RLS).

- Only use it on the **server side** (API routes)
- Never expose it to the client
- Never commit it to git

## After Adding the Variable

1. Add `SUPABASE_SERVICE_ROLE_KEY` in Railway Dashboard
2. Railway will automatically trigger a new deployment
3. The build should succeed
