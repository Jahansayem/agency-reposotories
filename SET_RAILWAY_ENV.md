# Railway Environment Variable - Service Role Key

## Your Service Role Key

Copy this value and add it to Railway:

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6anNzb2dlemRueWJiZW5xeWdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEyODU1OCwiZXhwIjoyMDgwNzA0NTU4fQ.APsw4Ia8asCkdrBOqWUNUdnMeB8knU8BwvNUSaJ424Q
```

## Steps to Add to Railway

### Option 1: Railway CLI (Fastest)
```bash
railway variables --set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6anNzb2dlemRueWJiZW5xeWdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEyODU1OCwiZXhwIjoyMDgwNzA0NTU4fQ.APsw4Ia8asCkdrBOqWUNUdnMeB8knU8BwvNUSaJ424Q"
```

### Option 2: Railway Dashboard (Manual)

1. Go to https://railway.app/project/harmonious-eagerness
2. Click on your service: **shared-todo-list**
3. Go to **Variables** tab
4. Click **+ New Variable**
5. Set:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6anNzb2dlemRueWJiZW5xeWdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEyODU1OCwiZXhwIjoyMDgwNzA0NTU4fQ.APsw4Ia8asCkdrBOqWUNUdnMeB8knU8BwvNUSaJ424Q`
6. Click **Add**
7. Railway will automatically trigger a new deployment

## Verification

Once added, Railway will rebuild automatically. Check:
- Build logs should complete successfully (no more "SUPABASE_SERVICE_ROLE_KEY is required" error)
- Deployment should show as "Active"
- App should be accessible at: https://shared-todo-list-production.up.railway.app

## Security Notes

⚠️ **This key has FULL DATABASE ACCESS**
- Only use server-side (API routes)
- Never expose to client
- Never commit to git (it's in .env.local which is gitignored)
- This key bypasses Row Level Security

The deployment failure will be resolved once this variable is set.
