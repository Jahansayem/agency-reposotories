# Quick Fix: 401 Unauthorized Error

## ✅ Problem Identified

The digest endpoint returns **401 Unauthorized** because `OUTLOOK_ADDON_API_KEY` was missing from your environment variables.

---

## ✅ Local Fix Applied

I've added the API key to your `.env.local` file:

```bash
OUTLOOK_ADDON_API_KEY=cron_0c4c935f4aec3811280656be067fec405d4c08fde7934832e8d1b6d4ae09ffbd
```

**Status:** ✅ Local environment fixed

---

## ⏳ Netlify Fix Required

You need to add the same API key to Netlify for the deployed site to work.

### Step 1: Go to Netlify Dashboard

1. Open: https://app.netlify.com/
2. Select your project: **wavezly**
3. Click **Site configuration** → **Environment variables**

### Step 2: Add Environment Variable

Click **Add a variable** → **Add a single variable**

```
Key: OUTLOOK_ADDON_API_KEY
Value: cron_0c4c935f4aec3811280656be067fec405d4c08fde7934832e8d1b6d4ae09ffbd
```

Click **Create variable**

### Step 3: Redeploy

After adding the variable:
1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**
3. Wait for deployment to complete (~2-3 minutes)

---

## ⏳ Supabase Fix Required (For Edge Function)

You also need to set this in Supabase for the cron Edge Function to work.

```bash
npx supabase secrets set OUTLOOK_ADDON_API_KEY=cron_0c4c935f4aec3811280656be067fec405d4c08fde7934832e8d1b6d4ae09ffbd
```

---

## 🧪 Test After Fixes

### Test 1: PowerShell (After Netlify Deploy)

```powershell
$apiKey = "cron_0c4c935f4aec3811280656be067fec405d4c08fde7934832e8d1b6d4ae09ffbd"

Invoke-WebRequest `
  -Uri "https://wavezly.netlify.app/api/digest/generate?type=morning" `
  -Method POST `
  -Headers @{ "X-API-Key" = $apiKey } `
  -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**Expected Output:**
```json
{
  "success": true,
  "digestType": "morning",
  "generated": 3,
  "notified": 0,
  "failed": 0
}
```

### Test 2: Curl (Alternative)

```bash
curl -X POST \
  "https://wavezly.netlify.app/api/digest/generate?type=morning" \
  -H "X-API-Key: cron_0c4c935f4aec3811280656be067fec405d4c08fde7934832e8d1b6d4ae09ffbd"
```

---

## 📋 Checklist

- [x] API key added to `.env.local` (local development)
- [ ] API key added to Netlify environment variables
- [ ] Netlify site redeployed
- [ ] API key added to Supabase secrets
- [ ] Tested endpoint successfully

---

## 🎯 Summary

**Issue:** API key was missing from all environments
**Root Cause:** `OUTLOOK_ADDON_API_KEY` was never configured
**Fix Applied:** Added to `.env.local`
**Next Steps:** Add to Netlify + Supabase, then test

---

## 🔐 Security Note

Your API key is:
```
cron_0c4c935f4aec3811280656be067fec405d4c08fde7934832e8d1b6d4ae09ffbd
```

**Keep this secure!**
- ✅ Stored in `.env.local` (git-ignored)
- ⏳ Add to Netlify (secure environment variables)
- ⏳ Add to Supabase (encrypted secrets)
- ❌ Never commit to git
- ❌ Never share publicly

---

## 📚 Related Files Updated

- `.env.local` - Added `OUTLOOK_ADDON_API_KEY`

---

**Once Netlify is updated, the digest endpoint will work!**
