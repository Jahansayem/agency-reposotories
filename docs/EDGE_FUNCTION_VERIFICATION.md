# Edge Function Verification Guide

Since Supabase MCP focuses on database operations, here's how to verify your Edge Function deployment manually.

## ✅ Local Files Status

**Edge Function Files Created:**
- ✅ `supabase/functions/digest-cron/index.ts` - Main function code
- ✅ `supabase/functions/digest-cron/README.md` - Documentation
- ✅ `scripts/deploy-digest-cron.sh` - Deployment script
- ✅ `scripts/check-edge-function-status.sh` - Status checker

**Database Status (Verified via Supabase MCP):**
- ✅ `daily_digests` table configured
- ✅ RLS policies enabled
- ✅ Real-time sync active
- ✅ 3 users ready to receive digests

## 🔍 Quick Verification Steps

### Method 1: Use the Status Checker Script (Windows PowerShell)

```powershell
# Make sure you have Supabase CLI
npm install -g supabase

# Run the status checker
bash scripts/check-edge-function-status.sh
```

### Method 2: Manual Verification (Step-by-Step)

#### Step 1: Check Supabase CLI

```bash
# Using npx (no global install needed)
npx supabase --version

# OR using global install
supabase --version
```

**Expected output:** `1.x.x` or similar version number

#### Step 2: Login to Supabase

```bash
npx supabase login
```

**Expected:** Browser opens for authentication

#### Step 3: Link Your Project

```bash
# Get your project ref from: https://supabase.com/dashboard
# Settings → General → Reference ID

npx supabase link --project-ref YOUR_PROJECT_REF
```

**Expected output:** `Linked to project YOUR_PROJECT_REF`

#### Step 4: Check Deployed Functions

```bash
npx supabase functions list
```

**Expected output if deployed:**
```
┌────────────────┬────────────┬─────────┬─────────────────────┐
│ Name           │ Status     │ Version │ Created At          │
├────────────────┼────────────┼─────────┼─────────────────────┤
│ digest-cron    │ ACTIVE     │ 1       │ 2026-01-24 00:00:00 │
└────────────────┴────────────┴─────────┴─────────────────────┘
```

**If NOT listed:** Function hasn't been deployed yet

#### Step 5: Check Environment Secrets

```bash
npx supabase secrets list
```

**Expected output:**
```
┌────────────────────────┬────────────────────────┐
│ Name                   │ Value (masked)         │
├────────────────────────┼────────────────────────┤
│ NETLIFY_URL            │ ht*********************│
│ OUTLOOK_ADDON_API_KEY  │ ********************   │
└────────────────────────┴────────────────────────┘
```

**If empty:** Secrets not set yet

#### Step 6: Deploy (If Not Already Deployed)

```bash
# Set secrets first
npx supabase secrets set NETLIFY_URL=https://your-site.netlify.app
npx supabase secrets set OUTLOOK_ADDON_API_KEY=your-api-key

# Deploy function
npx supabase functions deploy digest-cron
```

**Expected output:**
```
Deploying Function...
Bundled digest-cron
Deployed digest-cron (version 1)
```

#### Step 7: Test the Function

```bash
# Replace YOUR_PROJECT_REF with your actual project reference
curl "https://YOUR_PROJECT_REF.supabase.co/functions/v1/digest-cron?type=morning"
```

**Expected success response:**
```json
{
  "success": true,
  "digestType": "morning",
  "generated": 3,
  "notified": 0,
  "failed": 0,
  "duration": "3500ms"
}
```

**Possible error responses:**

```json
{
  "success": false,
  "error": "Site URL not configured"
}
```
→ **Fix:** Set `NETLIFY_URL` secret

```json
{
  "success": false,
  "error": "API key not configured"
}
```
→ **Fix:** Set `OUTLOOK_ADDON_API_KEY` secret

```json
{
  "success": false,
  "error": "Unauthorized"
}
```
→ **Fix:** API key mismatch between Supabase and Next.js environment

---

## 🎯 Verification Checklist

Use this checklist to verify your complete setup:

### Pre-Deployment

- [ ] Supabase CLI installed (`npx supabase --version` works)
- [ ] Logged in to Supabase (`npx supabase login`)
- [ ] Project linked (`npx supabase link --project-ref ...`)
- [ ] Edge Function files exist in `supabase/functions/digest-cron/`

### Deployment

- [ ] Secrets set:
  - [ ] `NETLIFY_URL` (your deployed site URL)
  - [ ] `OUTLOOK_ADDON_API_KEY` (your API key)
- [ ] Function deployed (`npx supabase functions deploy digest-cron`)
- [ ] Function appears in `npx supabase functions list`

### Post-Deployment

- [ ] Function responds to HTTP requests (curl test succeeds)
- [ ] Test generates digests (check database after test)
- [ ] Cron triggers configured in Supabase Dashboard:
  - [ ] Morning digest (0 13 * * *)
  - [ ] Afternoon digest (0 0 * * *)

### Database Verification (Already Verified ✅)

- [x] `daily_digests` table exists
- [x] RLS policies configured
- [x] Real-time sync enabled
- [x] Users table has active users

---

## 🔧 Troubleshooting

### "Project not linked"

```bash
# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF
```

Find project ref: Supabase Dashboard → Settings → General → Reference ID

### "Function not found" after deployment

**Causes:**
1. Deployment failed silently
2. Wrong project linked
3. Function name mismatch

**Fix:**
```bash
# Re-deploy
npx supabase functions deploy digest-cron

# Verify
npx supabase functions list
```

### "Secrets not persisting"

```bash
# List current secrets
npx supabase secrets list

# Set again if missing
npx supabase secrets set NETLIFY_URL=https://your-site.netlify.app
npx supabase secrets set OUTLOOK_ADDON_API_KEY=your-api-key

# Verify
npx supabase secrets list
```

### Function deploys but returns errors

**Check logs:**
```bash
npx supabase functions logs digest-cron --limit 50
```

Common errors in logs:
- **"NETLIFY_URL is undefined"** → Secret not set
- **"API key not configured"** → Secret not set
- **"fetch failed"** → NETLIFY_URL is incorrect
- **"401 Unauthorized"** → API key mismatch

---

## 📊 Verification via Supabase Dashboard

### Check Edge Function

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **Edge Functions** in sidebar
4. Look for **digest-cron** in the list

**If present:**
- ✅ Function is deployed
- Check version number
- View logs tab for execution history

**If not present:**
- ❌ Function not deployed yet
- Run `npx supabase functions deploy digest-cron`

### Check Cron Triggers

1. In Edge Functions, click **digest-cron**
2. Go to **Triggers** tab
3. Should see 2 cron jobs:
   - Morning Digest (0 13 * * *)
   - Afternoon Digest (0 0 * * *)

**If no triggers:**
- Click **Add Trigger**
- Select **Cron**
- Configure as shown in setup guide

### Check Function Logs

1. Click **digest-cron** → **Logs** tab
2. If function has run, you'll see execution logs
3. Look for:
   - Request logs (when cron triggers)
   - Response logs (success/failure)
   - Error logs (if any issues)

---

## 🚀 Complete Deployment Commands

If starting from scratch:

```bash
# 1. Install CLI (one time)
npm install -g supabase

# 2. Login (one time)
npx supabase login

# 3. Link project (one time per project)
npx supabase link --project-ref YOUR_PROJECT_REF

# 4. Set secrets (one time)
npx supabase secrets set NETLIFY_URL=https://your-site.netlify.app
npx supabase secrets set OUTLOOK_ADDON_API_KEY=your-api-key

# 5. Deploy function (every time you update code)
npx supabase functions deploy digest-cron

# 6. Test
curl "https://YOUR_PROJECT_REF.supabase.co/functions/v1/digest-cron?type=morning"

# 7. Check logs
npx supabase functions logs digest-cron
```

---

## 📋 Summary

**What We Can Verify:**
- ✅ Database schema (via Supabase MCP)
- ✅ Users configured (via Supabase MCP)
- ✅ Local Edge Function files created

**What Requires Manual Verification:**
- ⏳ Edge Function deployment status
- ⏳ Environment secrets configuration
- ⏳ Cron triggers setup
- ⏳ Function execution logs

**Next Action:** Run the verification steps above to check Edge Function status.

---

**Quick Start Command:**
```bash
# All-in-one status check
bash scripts/check-edge-function-status.sh
```

This will verify:
- CLI installation
- Login status
- Project link
- Deployed functions
- Environment secrets
- Function endpoint
