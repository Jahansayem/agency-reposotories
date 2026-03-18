# Outlook Add-in Security Fixes - Summary

**Date:** 2026-02-20
**Priority:** P0.7 (Critical)
**Status:** Fixed

## Vulnerabilities Patched

1. **User Enumeration** - API key calls without `agencyId` could list all users across all agencies
2. **Identity Spoofing** - `createdBy` field accepted from client allowed impersonation
3. **Unscoped Writes** - Tasks could be created without `agency_id`, breaking multi-tenancy RLS

## Files Changed

### 1. `/src/lib/outlookAuth.ts`
- **Line 131-141**: Made `agencyId` REQUIRED for API key auth (rejects if missing)
- **Line 133**: Removed `createdBy` parameter from function signature
- **Line 163**: Fixed identity to `"Outlook Add-in"` (no longer accepts from client)
- **Line 235-256**: Removed parsing of `createdBy` from request body
- **Line 260-267**: Enhanced error message with clear guidance

### 2. `/src/app/api/outlook/users/route.ts`
- **Line 6**: Added rate limiting imports
- **Line 49-57**: Added rate limiting (100 req/min per IP)
- **Line 62-76**: Added early return requiring `agencyId`
- **Deleted Lines 64-105**: Removed dangerous "all users" fallback

### 3. `/src/app/api/outlook/parse-email/route.ts`
- **Line 7**: Added rate limiting imports
- **Line 59-67**: Added rate limiting (10 req/min per IP for AI operations)
- **Line 80-94**: Added early return requiring `agencyId`
- **Deleted Function**: `getAllUsers()` removed entirely
- **Deleted Lines 96-113**: Removed "all users" fallback logic

### 4. `/src/app/api/outlook/create-task/route.ts`
- **Line 9**: Added rate limiting imports
- **Line 20-28**: Added rate limiting (100 req/min per IP)
- **Line 35-49**: Added early return requiring `agencyId`
- **Line 63**: Fixed creator to `'Outlook Add-in'` constant
- **Line 73**: Always set `agency_id: agencyId` (no longer conditional)

## Breaking Changes

**ALL Outlook API key requests now REQUIRE `agencyId`** via one of:
- HTTP Header: `X-Agency-Id: <uuid>`
- Query Parameter: `?agencyId=<uuid>`
- Request Body: `{ "agencyId": "<uuid>", ... }`

**Affected Endpoints:**
- `GET /api/outlook/users`
- `POST /api/outlook/parse-email`
- `POST /api/outlook/create-task`

## Rate Limits Added

| Endpoint | Limit | Window | Limiter |
|----------|-------|--------|---------|
| `/api/outlook/users` | 100 | 1 min | `api` |
| `/api/outlook/parse-email` | 10 | 1 min | `ai` |
| `/api/outlook/create-task` | 100 | 1 min | `api` |

## Client Update Required

**Before (Insecure):**
```javascript
fetch('/api/outlook/users', {
  headers: { 'X-API-Key': apiKey }
});
```

**After (Secure):**
```javascript
fetch('/api/outlook/users', {
  headers: {
    'X-API-Key': apiKey,
    'X-Agency-Id': agencyId // REQUIRED
  }
});
```

## Testing Commands

```bash
# Test missing agencyId returns 400
curl -X GET https://your-domain.com/api/outlook/users \
  -H "X-API-Key: $OUTLOOK_API_KEY"
# Expected: 400 "Missing or invalid agency_id"

# Test valid agencyId works
curl -X GET https://your-domain.com/api/outlook/users \
  -H "X-API-Key: $OUTLOOK_API_KEY" \
  -H "X-Agency-Id: $AGENCY_ID"
# Expected: 200 with agency-scoped users

# Test createdBy spoofing prevented
curl -X POST https://your-domain.com/api/outlook/create-task \
  -H "X-API-Key: $OUTLOOK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agencyId":"'$AGENCY_ID'","text":"Test","createdBy":"Spoofed User"}'
# Verify DB: created_by should be "Outlook Add-in", NOT "Spoofed User"
```

## Deployment Checklist

- [ ] Update Outlook add-in client code to include `agencyId`
- [ ] Test all three endpoints with valid `agencyId`
- [ ] Test all three endpoints without `agencyId` (should get 400)
- [ ] Verify rate limiting works (429 after limit)
- [ ] Check database: all new tasks have `agency_id` set
- [ ] Check database: all new tasks have `created_by = 'Outlook Add-in'`
- [ ] Monitor security logs for rejected requests
- [ ] Clean up any orphaned tasks without `agency_id` (see full docs)

## Full Documentation

See: `/docs/outlook-api-security-fixes-2026-02-20.md` for complete details including:
- Line-by-line change explanations
- Database cleanup queries
- Monitoring & alerting setup
- API testing instructions
