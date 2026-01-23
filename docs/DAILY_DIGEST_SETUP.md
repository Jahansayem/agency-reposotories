# Daily Digest Setup Guide - Supabase Cron

Complete guide for setting up automated daily digests using Supabase Edge Functions.

## Quick Setup (5 Minutes)

### Step 1: Install & Login

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login
```

### Step 2: Deploy Edge Function

```bash
# Run automated deployment script
./scripts/deploy-digest-cron.sh
```

This script will:
- ✅ Link to your Supabase project
- ✅ Configure environment secrets
- ✅ Deploy the Edge Function

### Step 3: Configure Cron Triggers

Go to **Supabase Dashboard** → **Edge Functions** → **digest-cron** → **Add Trigger**

**Morning Digest (5am Pacific):**
```
Name: Morning Digest
Type: Cron
Schedule: 0 13 * * *
Request Method: GET
Request Path: ?type=morning
```

**Afternoon Digest (4pm Pacific):**
```
Name: Afternoon Digest
Type: Cron
Schedule: 0 0 * * *
Request Method: GET
Request Path: ?type=afternoon
```

Click **Save** for each trigger.

### Step 4: Test

```bash
# Test morning digest manually
curl "https://YOUR_PROJECT_REF.supabase.co/functions/v1/digest-cron?type=morning"

# Expected response:
# {
#   "success": true,
#   "digestType": "morning",
#   "generated": 2,
#   "notified": 2,
#   "failed": 0,
#   "duration": "3245ms"
# }
```

---

## Manual Setup (Detailed)

If you prefer manual setup or the script fails, follow these steps:

### 1. Link Your Project

```bash
# Find your project ref in Supabase Dashboard → Settings → General
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Set Environment Secrets

```bash
# Your deployed site URL (Netlify/Vercel/Railway)
supabase secrets set NETLIFY_URL=https://your-site.netlify.app

# Your API key (same as OUTLOOK_ADDON_API_KEY in .env)
supabase secrets set OUTLOOK_ADDON_API_KEY=your-secret-api-key
```

### 3. Deploy Edge Function

```bash
cd supabase/functions
supabase functions deploy digest-cron
```

### 4. Configure Cron

Follow Step 3 from Quick Setup above.

---

## Environment Variables

You need these variables set in **two places**:

### Supabase Secrets (for Edge Function)

```bash
supabase secrets set NETLIFY_URL=https://your-site.netlify.app
supabase secrets set OUTLOOK_ADDON_API_KEY=your-api-key
```

### Next.js Environment (for API endpoint)

In your hosting platform (Netlify/Vercel/Railway), set:

```bash
ANTHROPIC_API_KEY=your-claude-api-key
OUTLOOK_ADDON_API_KEY=your-api-key  # Must match Supabase secret
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional for push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public
VAPID_PRIVATE_KEY=your-vapid-private
VAPID_SUBJECT=mailto:your-email@example.com
```

---

## Cron Schedule Reference

### Pacific Time → UTC Conversion

| Pacific Time | UTC Time | Cron Expression | Notes |
|--------------|----------|----------------|-------|
| 5:00 AM PST | 1:00 PM UTC | `0 13 * * *` | Winter (Nov-Mar) |
| 5:00 AM PDT | 12:00 PM UTC | `0 12 * * *` | Summer (Mar-Nov) |
| 4:00 PM PST | 12:00 AM UTC | `0 0 * * *` | Winter (next day) |
| 4:00 PM PDT | 11:00 PM UTC | `0 23 * * *` | Summer (same day) |

**Recommendation:** Use `0 13 * * *` (morning) and `0 0 * * *` (afternoon) year-round. Accept 1-hour drift during DST transitions.

### Alternative: Exact Pacific Time

Update cron schedules twice a year:
- **March (DST starts):** Switch to summer schedules
- **November (DST ends):** Switch to winter schedules

---

## Troubleshooting

### Function deploys but doesn't trigger

**Problem:** Cron trigger not configured
**Solution:** Add cron triggers in Supabase Dashboard (Step 3)

### Function returns "Site URL not configured"

**Problem:** `NETLIFY_URL` secret not set
**Solution:**
```bash
supabase secrets set NETLIFY_URL=https://your-site.netlify.app
```

### Function returns 401 Unauthorized from API

**Problem:** API key mismatch between Supabase and Next.js
**Solution:** Verify both have the same `OUTLOOK_ADDON_API_KEY`:
```bash
# Check Supabase secret
supabase secrets list

# Check Next.js env in hosting dashboard
# They must match exactly
```

### Digests generate but don't send push notifications

**Problem:** VAPID keys not configured
**Solution:** Set push notification environment variables in Next.js:
```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:...
```

### Wrong timezone (digests at wrong time)

**Problem:** Cron uses UTC, not Pacific
**Solution:** Use correct cron expressions:
- Morning: `0 13 * * *` (5am Pacific)
- Afternoon: `0 0 * * *` (4pm Pacific)

---

## Monitoring

### View Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click **digest-cron**
3. View **Logs** tab

### Check Cron Execution History

1. Go to **Edge Functions** → **digest-cron**
2. Click **Triggers** tab
3. See execution timestamps and results

### Check Digest Generation Results

Query your database:

```sql
-- Check today's digests
SELECT
  user_name,
  digest_type,
  generated_at,
  read_at
FROM daily_digests
WHERE digest_date = CURRENT_DATE
ORDER BY generated_at DESC;

-- Count digests by type
SELECT
  digest_type,
  COUNT(*) as count,
  COUNT(read_at) as read_count
FROM daily_digests
WHERE digest_date = CURRENT_DATE
GROUP BY digest_type;
```

---

## Testing

### Test Locally

```bash
# Start local Supabase
supabase start

# Serve function locally
supabase functions serve digest-cron

# Test in another terminal
curl "http://localhost:54321/functions/v1/digest-cron?type=morning"
```

### Test in Production

```bash
# Manual trigger (bypasses cron schedule)
curl "https://YOUR_PROJECT_REF.supabase.co/functions/v1/digest-cron?type=morning"

# Should return:
# {
#   "success": true,
#   "digestType": "morning",
#   "generated": 2,
#   "notified": 2,
#   "failed": 0,
#   "duration": "3500ms",
#   "results": [
#     { "userName": "Derrick", "generated": true, "notified": true },
#     { "userName": "Sefra", "generated": true, "notified": true }
#   ]
# }
```

---

## Cost Analysis

### Supabase Edge Functions

- **Free Tier:** 500,000 invocations/month, 2GB bandwidth
- **Usage:** ~60 invocations/month (2/day × 30 days)
- **Bandwidth:** ~300KB/month
- **Cost:** **FREE** ✅

### Anthropic API (Claude)

- **Cost:** ~$0.003 per digest (Sonnet 3.5)
- **Usage:** 60 digests/month × 2 users = 120 API calls
- **Monthly Cost:** ~$0.36
- **Cost:** **Negligible** ✅

### Supabase Database

- **Storage:** ~1KB per digest × 60/month = 60KB/month
- **Cost:** **FREE** (within limits) ✅

**Total Monthly Cost: ~$0.36** (only Anthropic API)

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Supabase Cron Trigger (5am/4pm Pacific)                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Supabase Edge Function (digest-cron)                   │
│     - Validates environment                                 │
│     - Calls Next.js API endpoint                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Next.js API (/api/digest/generate)                     │
│     - Fetches users from database                          │
│     - Queries tasks, activity for each user                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Claude AI (Anthropic)                                   │
│     - Generates personalized briefing                       │
│     - Summarizes tasks and team activity                   │
│     - Provides focus suggestions                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Supabase Database                                       │
│     - Stores digest in daily_digests table                 │
│     - Tracks read status                                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  6. Push Notifications (Optional)                           │
│     - Sends notification to user's devices                 │
│     - Uses web-push via VAPID keys                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Useful Commands

```bash
# Deploy function
supabase functions deploy digest-cron

# View function logs
supabase functions logs digest-cron

# List all secrets
supabase secrets list

# Set a secret
supabase secrets set KEY=value

# Unset a secret
supabase secrets unset KEY

# Test function locally
supabase functions serve digest-cron

# Link to project
supabase link --project-ref YOUR_REF
```

---

## FAQ

**Q: Can I change the digest schedule?**
A: Yes, update the cron expressions in Supabase Dashboard → Edge Functions → digest-cron → Triggers.

**Q: Can I disable digests temporarily?**
A: Yes, disable the cron triggers in Supabase Dashboard (toggle switch).

**Q: How do I add more users?**
A: Users are automatically included based on the `users` table. Add users via your app's login flow.

**Q: Can users opt out of digests?**
A: Currently no. Add a user preference in the future (see REFACTORING_PLAN.md).

**Q: What if Claude API is down?**
A: The function will log an error but won't crash. Users won't receive that digest.

**Q: Can I run this on a different schedule?**
A: Yes, change the cron expressions. Remember to convert Pacific Time → UTC.

---

## Next Steps

After setup:
1. ✅ Monitor logs for first few days
2. ✅ Verify digests are generated correctly
3. ✅ Check push notifications work (if enabled)
4. ✅ Gather user feedback on digest content
5. ✅ Consider adding user preferences (see REFACTORING_PLAN.md)

---

**Last Updated:** 2026-01-24
**Status:** Production-ready
