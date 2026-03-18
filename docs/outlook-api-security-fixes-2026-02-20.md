# Outlook Add-in API Security Fixes (2026-02-20)

## Priority: P0.7 - Critical Security Vulnerabilities

## Problem Statement

The Outlook Add-in API key authentication had three critical security vulnerabilities:

1. **User Enumeration Across Tenants**: Missing `agencyId` allowed enumeration of all users across all agencies
2. **Identity Spoofing**: `createdBy` field was accepted from client requests, allowing attackers to impersonate users
3. **Unscoped Writes**: Tasks could be created without an `agency_id`, breaking multi-tenancy isolation

## Files Changed

### 1. `/src/lib/outlookAuth.ts`

**Changes:**
- **Line 131-141**: Made `agencyId` REQUIRED for all API key auth requests
  - Removed fallback to empty `agencyId`
  - Added security logging when `agencyId` is missing
  - Function now rejects with `null` if no agency context

- **Line 133-134**: Removed `createdBy` parameter
  - Function signature changed from `resolveApiKeyAgencyContext(agencyId, createdBy)` to `resolveApiKeyAgencyContext(agencyId)`
  - Fixed identity to `"Outlook Add-in"` (line 163)

- **Line 154**: Improved error message for missing agency
  - Changed from `"agency not found"` to `"agency not found or inactive"`

- **Line 235-256**: Removed client-supplied `createdBy` from request parsing
  - Deleted lines that extracted `createdBy` from request body
  - Added security comment explaining the fix

- **Line 258**: Updated function call to remove `createdBy` parameter
  - `resolveApiKeyAgencyContext(agencyId)` instead of `resolveApiKeyAgencyContext(agencyId, createdBy)`

- **Line 260-267**: Enhanced error message for missing agency
  - Clear guidance on how to provide `agencyId` (header, query param, or body)

**Impact:**
- **BREAKING CHANGE**: All API key requests now REQUIRE `agencyId`
- **BREAKING CHANGE**: `createdBy` field in request body is now ignored

---

### 2. `/src/app/api/outlook/users/route.ts`

**Changes:**
- **Line 5-6**: Added rate limiting imports
  - `import { withRateLimit, rateLimiters, createRateLimitResponse } from '@/lib/rateLimit';`

- **Line 47-60**: Added rate limiting to GET endpoint
  - 100 requests per minute per IP (using `rateLimiters.api`)
  - Returns 429 with retry-after header on rate limit exceeded

- **Line 61-72**: Deleted dangerous "all users" fallback path
  - Removed lines 64-105 that enumerated all users across all agencies
  - Added early return with 400 error if `agencyId` is missing
  - Security logging added

- **Line 73-82**: Simplified response
  - Only returns users from the scoped agency
  - No longer has `scoped: false` path

**Deleted Code:**
```typescript
// DELETED: Lines 64-105 (dangerous fallback)
// Backward compatible: return all users when no agency context
// Fetch registered users
const { data: registeredUsers, error: usersError } = await supabase
  .from('users')
  .select('name')
  .order('name');
// ... (also fetched from todos table)
```

**Impact:**
- **BREAKING CHANGE**: Endpoint now requires `agencyId` in all requests
- Users are scoped to the authenticated agency only

---

### 3. `/src/app/api/outlook/parse-email/route.ts`

**Changes:**
- **Line 7**: Added rate limiting imports
  - `import { withRateLimit, rateLimiters, createRateLimitResponse } from '@/lib/rateLimit';`

- **Line 56-73**: Deleted `getAllUsers()` helper function
  - Removed dangerous fallback that enumerated all users

- **Line 74-83**: Added rate limiting to POST endpoint
  - 10 requests per minute per IP (using `rateLimiters.ai`)
  - Protects expensive AI operations from abuse

- **Line 96-113**: Deleted "all users" fallback logic
  - Replaced with early return requiring `agencyId`
  - Added security logging
  - Clear error message guidance

- **Line 114-122**: Simplified user fetching
  - Only calls `getUsersFromAgency(agencyId)`
  - No longer falls back to all users if agency has no members

**Deleted Code:**
```typescript
// DELETED: Lines 56-73
async function getAllUsers(): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data: users, error } = await supabase
    .from('users')
    .select('name')
    .order('name');
  // ...
}

// DELETED: Lines 96-113
if (agencyId) {
  availableUsers = await getUsersFromAgency(agencyId);
  if (availableUsers.length === 0) {
    availableUsers = await getAllUsers(); // DANGEROUS
  }
} else {
  availableUsers = await getAllUsers(); // DANGEROUS
}
```

**Impact:**
- **BREAKING CHANGE**: Endpoint now requires `agencyId` in all requests
- Rate limiting already existed (kept at 10/min for AI operations)

---

### 4. `/src/app/api/outlook/create-task/route.ts`

**Changes:**
- **Line 9**: Added rate limiting imports
  - `import { withRateLimit, rateLimiters, createRateLimitResponse } from '@/lib/rateLimit';`

- **Line 18-27**: Added rate limiting to POST endpoint
  - 100 requests per minute per IP (using `rateLimiters.api`)

- **Line 31-43**: Added agency requirement check
  - Early return with 400 error if `agencyId` is missing
  - Security logging added

- **Line 54**: Fixed creator identity to constant
  - Changed from `ctx.userName || 'Outlook Add-in'` to `'Outlook Add-in'`
  - No longer trusts client-supplied identity

- **Line 58-62**: Made `agency_id` required in task object
  - Changed from conditional `if (agencyId) { task.agency_id = agencyId; }`
  - Now always sets `agency_id: agencyId` (after validating it exists)

**Old Code (Lines 34-50):**
```typescript
const creator = ctx.userName || 'Outlook Add-in'; // DANGEROUS - trusted client

const task: Record<string, unknown> = {
  id: taskId,
  text: text.trim(),
  completed: false,
  status: 'todo',
  created_at: now,
  created_by: creator,
};

// Only include agency_id if auth context provides one (multi-tenancy enabled)
if (agencyId) {
  task.agency_id = agencyId; // DANGEROUS - could create unscoped tasks
}
```

**New Code:**
```typescript
const creator = 'Outlook Add-in'; // FIXED - constant identity

const task: Record<string, unknown> = {
  id: taskId,
  text: text.trim(),
  completed: false,
  status: 'todo',
  created_at: now,
  created_by: creator,
  agency_id: agencyId, // Always set (validated above)
};
```

**Impact:**
- **BREAKING CHANGE**: Endpoint now requires `agencyId` in all requests
- Tasks always have `agency_id` set (no more unscoped writes)
- Creator identity is fixed to `"Outlook Add-in"` (no spoofing)

---

## Summary of Breaking Changes

All Outlook add-in API key requests now REQUIRE `agencyId` to be provided via one of:
1. **HTTP Header**: `X-Agency-Id: <agency-uuid>`
2. **Query Parameter**: `?agencyId=<agency-uuid>`
3. **Request Body**: `{ "agencyId": "<agency-uuid>", ... }`

### Endpoints Affected:
- `GET /api/outlook/users`
- `POST /api/outlook/parse-email`
- `POST /api/outlook/create-task`

### Client-Side Changes Required:

#### Before (Insecure):
```javascript
// Missing agencyId - would enumerate all users
fetch('/api/outlook/users', {
  headers: {
    'X-API-Key': apiKey
  }
});

// Could spoof identity
fetch('/api/outlook/create-task', {
  method: 'POST',
  headers: { 'X-API-Key': apiKey },
  body: JSON.stringify({
    text: 'Task text',
    createdBy: 'Spoofed User' // DANGEROUS
  })
});
```

#### After (Secure):
```javascript
// REQUIRED: Include agencyId in header
fetch('/api/outlook/users', {
  headers: {
    'X-API-Key': apiKey,
    'X-Agency-Id': agencyId // REQUIRED
  }
});

// OR: Include in query parameter
fetch(`/api/outlook/users?agencyId=${agencyId}`, {
  headers: { 'X-API-Key': apiKey }
});

// OR: Include in request body
fetch('/api/outlook/create-task', {
  method: 'POST',
  headers: { 'X-API-Key': apiKey },
  body: JSON.stringify({
    agencyId: agencyId, // REQUIRED
    text: 'Task text'
    // createdBy is now IGNORED
  })
});
```

---

## Rate Limiting Summary

| Endpoint | Limiter | Limit | Window |
|----------|---------|-------|--------|
| `GET /api/outlook/users` | `api` | 100 requests | 1 minute |
| `POST /api/outlook/parse-email` | `ai` | 10 requests | 1 minute |
| `POST /api/outlook/create-task` | `api` | 100 requests | 1 minute |

All rate limits are per-IP address using Upstash Redis.

---

## Testing Instructions

### 1. Test Missing `agencyId` Returns 400

```bash
# Should return 400: "Missing or invalid agency_id"
curl -X GET https://your-domain.com/api/outlook/users \
  -H "X-API-Key: $OUTLOOK_API_KEY"

# Should return 400: "Agency context required"
curl -X POST https://your-domain.com/api/outlook/create-task \
  -H "X-API-Key: $OUTLOOK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test task"}'
```

### 2. Test Valid `agencyId` Works

```bash
# Should return 200 with agency-scoped users
curl -X GET https://your-domain.com/api/outlook/users \
  -H "X-API-Key: $OUTLOOK_API_KEY" \
  -H "X-Agency-Id: $AGENCY_ID"

# Should create task with agency_id set
curl -X POST https://your-domain.com/api/outlook/create-task \
  -H "X-API-Key: $OUTLOOK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agencyId": "'$AGENCY_ID'",
    "text": "Test task from Outlook"
  }'
```

### 3. Test `createdBy` Spoofing Is Prevented

```bash
# createdBy should be IGNORED, task creator should be "Outlook Add-in"
curl -X POST https://your-domain.com/api/outlook/create-task \
  -H "X-API-Key: $OUTLOOK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agencyId": "'$AGENCY_ID'",
    "text": "Test task",
    "createdBy": "Spoofed User"
  }'

# Verify in database:
# SELECT created_by FROM todos WHERE text = 'Test task';
# Should return "Outlook Add-in", NOT "Spoofed User"
```

### 4. Test Rate Limiting

```bash
# Run 101 requests rapidly - should get 429 on request 101
for i in {1..101}; do
  curl -X GET https://your-domain.com/api/outlook/users \
    -H "X-API-Key: $OUTLOOK_API_KEY" \
    -H "X-Agency-Id: $AGENCY_ID" \
    -w "Status: %{http_code}\n" \
    -s -o /dev/null
done
```

### 5. Test Multi-Tenancy Isolation

```bash
# Create task in Agency A
curl -X POST https://your-domain.com/api/outlook/create-task \
  -H "X-API-Key: $OUTLOOK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agencyId": "'$AGENCY_A_ID'", "text": "Agency A task"}'

# Verify Agency B cannot see Agency A's users
curl -X GET https://your-domain.com/api/outlook/users \
  -H "X-API-Key: $OUTLOOK_API_KEY" \
  -H "X-Agency-Id: $AGENCY_B_ID"

# Should only return Agency B users, NOT Agency A users
```

---

## Security Improvements Achieved

1. **User Enumeration FIXED**
   - No endpoint returns all users across all agencies
   - All user queries are scoped to authenticated agency

2. **Identity Spoofing FIXED**
   - `createdBy` field is no longer accepted from client
   - All API key requests use fixed identity: `"Outlook Add-in"`

3. **Unscoped Writes FIXED**
   - Tasks always have `agency_id` set
   - No tasks can be created without agency context
   - Multi-tenancy RLS policies will now correctly isolate data

4. **Rate Limiting ADDED**
   - All endpoints now have rate limiting
   - Prevents abuse and DDoS attacks
   - Protects expensive AI operations (parse-email)

---

## Deployment Checklist

- [ ] Update Outlook add-in client code to include `agencyId` in all requests
- [ ] Test API key auth with valid `agencyId`
- [ ] Test API key auth with missing `agencyId` (should fail with 400)
- [ ] Test rate limiting works (429 after limit exceeded)
- [ ] Verify tasks are created with `agency_id` set
- [ ] Verify `created_by` is always "Outlook Add-in"
- [ ] Run database query to find any orphaned tasks without `agency_id`
- [ ] Monitor security logs for rejected requests

---

## Database Cleanup (If Needed)

If unscoped tasks were created before this fix, clean them up:

```sql
-- Find orphaned tasks with no agency_id
SELECT id, text, created_at, created_by
FROM todos
WHERE agency_id IS NULL
ORDER BY created_at DESC;

-- Option 1: Delete orphaned tasks (if they are test data)
-- DELETE FROM todos WHERE agency_id IS NULL;

-- Option 2: Assign orphaned tasks to a default agency (if they are real)
-- UPDATE todos
-- SET agency_id = '<default-agency-id>'
-- WHERE agency_id IS NULL;
```

---

## Monitoring & Alerting

Add alerts for:
1. High rate of 400 errors on Outlook endpoints (may indicate client not updated)
2. 429 rate limit errors (may indicate abuse or legitimate spike)
3. Security log events with `component: 'OutlookAuth'` and missing `agencyId`

Example query for security logs:
```javascript
logger.security('Outlook API key auth rejected: missing agency_id', {
  component: 'OutlookAuth',
});
```

---

## Related Documentation

- **Outlook Add-in Client Implementation**: `/docs/outlook-addon/`
- **Rate Limiting Configuration**: `/src/lib/rateLimit.ts`
- **Agency Auth Context**: `/src/lib/agencyAuth.ts`
- **Multi-Tenancy RLS Policies**: `/docs/database/rls-policies.md`

---

## Questions & Support

For questions about this security fix, contact:
- Security Team: security@bealeragency.com
- DevOps: devops@bealeragency.com

---

**Document Version:** 1.0
**Date:** 2026-02-20
**Author:** Claude Sonnet 4.5 (Security Fix)
**Reviewer:** [Pending]
**Status:** Implemented, Pending Review
