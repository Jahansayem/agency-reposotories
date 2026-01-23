# Daily Digest Cron - Supabase Edge Function

This Edge Function triggers the Next.js digest generation API endpoint on a schedule.

## Setup Instructions

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link to Your Project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

To find your project ref:
- Go to Supabase Dashboard → Settings → General → Reference ID

### 4. Set Environment Secrets

```bash
# Your Netlify site URL (or Railway/Vercel URL)
supabase secrets set NETLIFY_URL=https://your-site.netlify.app

# Your API key for authentication
supabase secrets set OUTLOOK_ADDON_API_KEY=your-api-key-here
```

### 5. Deploy the Edge Function

```bash
supabase functions deploy digest-cron
```

### 6. Configure Cron Triggers in Supabase Dashboard

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Find the `digest-cron` function
3. Click **"Add trigger"** → **"Cron"**

**Morning Digest:**
- **Name:** Morning Digest
- **Cron Expression:** `0 13 * * *` (5am Pacific = 1pm UTC)
- **Request Method:** GET
- **Request Path:** `?type=morning`
- **HTTP Headers:** (leave empty)

**Afternoon Digest:**
- **Name:** Afternoon Digest
- **Cron Expression:** `0 0 * * *` (4pm Pacific = 12am UTC next day)
- **Request Method:** GET
- **Request Path:** `?type=afternoon`
- **HTTP Headers:** (leave empty)

## Cron Schedule Explanation

### Pacific Time → UTC Conversion

**Morning (5am Pacific):**
- Winter (PST): 5am PST = 1pm UTC → `0 13 * * *`
- Summer (PDT): 5am PDT = 12pm UTC → `0 12 * * *`
- **Use:** `0 13 * * *` (works year-round, 1 hour later in summer)

**Afternoon (4pm Pacific):**
- Winter (PST): 4pm PST = 12am UTC (next day) → `0 0 * * *`
- Summer (PDT): 4pm PDT = 11pm UTC (same day) → `0 23 * * *`
- **Use:** `0 0 * * *` (works year-round, 1 hour earlier in summer)

### Adjusting for Daylight Saving Time

If you want exact Pacific time regardless of DST:
- Update cron schedules twice a year (March and November)
- OR accept 1-hour variation during DST transitions

## Testing Locally

Test the Edge Function locally before deploying:

```bash
# Start local Supabase (including Edge Functions runtime)
supabase start

# Serve the function locally
supabase functions serve digest-cron

# Test in another terminal
curl "http://localhost:54321/functions/v1/digest-cron?type=morning"
```

## Testing in Production

After deployment, test manually:

```bash
# Get the function URL from Supabase Dashboard
curl "https://YOUR_PROJECT_REF.supabase.co/functions/v1/digest-cron?type=morning"
```

## Monitoring

### View Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click on `digest-cron`
3. View **Logs** tab for execution history

### Check Cron History

1. Go to **Edge Functions** → `digest-cron`
2. Click **Triggers** tab
3. View cron execution history

## Troubleshooting

### Function fails with "Site URL not configured"
- Run: `supabase secrets set NETLIFY_URL=https://your-site.netlify.app`

### Function fails with "API key not configured"
- Run: `supabase secrets set OUTLOOK_ADDON_API_KEY=your-key`

### Digest generation returns 401 Unauthorized
- Verify the API key matches your Next.js environment variable `OUTLOOK_ADDON_API_KEY`

### Cron doesn't trigger
- Check cron expression syntax in dashboard
- Verify timezone (cron uses UTC)
- Check function logs for errors

### Wrong time execution
- Remember: Supabase cron uses UTC, not Pacific Time
- Use conversion formulas above to adjust schedule

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NETLIFY_URL` | Your deployed site URL | `https://your-app.netlify.app` |
| `OUTLOOK_ADDON_API_KEY` | API key for digest endpoint | `your-secret-key-123` |

## Architecture

```
Supabase Cron (5am/4pm Pacific)
    ↓
Supabase Edge Function (digest-cron)
    ↓
Next.js API (/api/digest/generate)
    ↓
Claude AI + Supabase DB
    ↓
Generate & Store Digests + Send Push Notifications
```

## Cost

Supabase Edge Functions:
- **Free tier:** 500,000 invocations/month, 2GB bandwidth
- **Cost:** This function will use ~60 invocations/month (2/day × 30 days)
- **Bandwidth:** ~1-5KB per invocation ≈ 300KB/month

**Total cost: FREE** (well within free tier limits)
