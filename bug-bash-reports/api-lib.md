# Bug Bash Report: API Routes & Shared Lib

**Scope Agent**: API Routes & Shared Library
**Date**: 2026-02-09
**Files Audited**: 47 (16 shared lib + 3 DB services + 28 API routes)

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH     | 1 (fixed) |
| MEDIUM   | 4 |
| LOW      | 7 |

**1 HIGH severity bug fixed** -- operator precedence error in invitation URL construction that produced `"https://null"` URLs under certain header conditions.

---

## CRITICAL Issues

None found.

---

## HIGH Issues

### H-001: Operator precedence bug in invite URL construction (FIXED)

- **File**: `src/app/api/agencies/[agencyId]/invitations/route.ts`
- **Lines**: 195-199
- **Status**: Fixed

**Before (broken):**
```typescript
const baseUrl = request.headers.get('origin')
    || request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : process.env.NEXT_PUBLIC_APP_URL
      || 'https://shared-todo-list-production.up.railway.app';
```

Due to JavaScript operator precedence (`||` binds tighter than `?:`), this parsed as:
```
(origin || x-forwarded-host) ? `https://${x-forwarded-host}` : fallback
```

When `origin` was present but `x-forwarded-host` was null, the condition evaluated to truthy (from the origin string), but the truthy branch used `x-forwarded-host` (null), producing `"https://null"`. The invitation URL would then be `https://null/join/TOKEN` -- a completely broken link sent to the invited user.

**After (fixed):**
```typescript
const origin = request.headers.get('origin');
const forwardedHost = request.headers.get('x-forwarded-host');
const baseUrl = origin
    ? origin
    : forwardedHost
      ? `https://${forwardedHost}`
      : process.env.NEXT_PUBLIC_APP_URL
      || 'https://shared-todo-list-production.up.railway.app';
```

The fix extracts both header values into named variables and uses a clear ternary chain that always produces a valid URL.

---

## MEDIUM Issues

### M-001: Non-timing-safe API key comparison in health check

- **File**: `src/app/api/health/env-check/route.ts`
- **Line**: 22
- **Description**: The `isAuthorized` function uses `apiKey === validApiKey` (strict equality) instead of a timing-safe comparison like `crypto.timingSafeEqual()`. While this endpoint only reveals boolean environment configuration status (not secrets), an attacker could theoretically use timing attacks to derive the API key character by character.
- **Impact**: Low practical risk since the endpoint reveals limited information, but violates defense-in-depth principles for secret comparison.

### M-002: Module-level Supabase client instantiation in attachments route

- **File**: `src/app/api/attachments/route.ts`
- **Line**: 23
- **Description**: `const supabase = getSupabaseClient();` is called at module scope, creating a single shared client at import time. In serverless environments, this client persists across invocations within the same function instance, which could lead to stale credentials if `SUPABASE_SERVICE_ROLE_KEY` is rotated. Other API routes in the codebase consistently use lazy initialization (calling `getSupabaseClient()` inside each handler function).
- **Impact**: Stale client in long-running serverless instances; inconsistent with codebase patterns.

### M-003: Client-provided `createdBy` overrides authenticated identity

- **File**: `src/app/api/outlook/create-task/route.ts`
- **Line**: 35
- **Description**: The `creator` is set as `createdBy || ctx.userName || 'Outlook Add-in'`, where `createdBy` comes from the request body. Since the `withOutlookAuth` wrapper already provides `ctx.userName` from the authenticated session, allowing the client to override the creator field enables identity spoofing. The authenticated identity should take precedence.
- **Impact**: A user could create tasks attributed to other users.

### M-004: Duplicate `USER_COLORS` constant in invitation accept route

- **File**: `src/app/api/invitations/accept/route.ts`
- **Lines**: 25-28
- **Description**: Defines its own `USER_COLORS` array (`['#0033A0', '#72B5E8', ...]`) that differs from the canonical `USER_COLORS` in `src/lib/constants.ts` (`['#0033A0', '#059669', ...]`). The two arrays have different colors, meaning users created via invitation acceptance get different avatar colors than users created through other flows.
- **Impact**: Inconsistent user avatar colors; violates single-source-of-truth principle.

---

## LOW Issues

### L-001: Logger operator precedence ambiguity

- **File**: `src/lib/logger.ts`
- **Line**: 84
- **Description**: The condition `lowerKey.includes('token') && !lowerKey.includes('csrf') ||` relies on implicit `&&` > `||` precedence. While logically correct (redacts "token" fields that are NOT csrf tokens), it would benefit from explicit parentheses for readability: `(lowerKey.includes('token') && !lowerKey.includes('csrf')) ||`.
- **Impact**: Readability concern; no functional bug.

### L-002: Logger called with wrong argument types in digest generation

- **File**: `src/app/api/digest/generate/route.ts`
- **Lines**: 225-230
- **Description**: `logger.error()` is called with a plain object as the second argument instead of an `Error` instance. The logger signature expects `(message: string, error: Error | unknown, metadata: object)`, but receives `{ overdue: error, today: error, ... }` as the error parameter. The error details should be in the metadata parameter instead.
- **Impact**: Error object is logged as `[object Object]` instead of with a proper stack trace; the actual Supabase errors lose their structure.

### L-003: Logger called with string as error in pattern analysis

- **File**: `src/app/api/patterns/analyze/route.ts`
- **Line**: 141
- **Description**: `logger.error('Failed to parse AI response', responseText, ...)` passes the AI response text (a string) as the error argument. The response text should be in the metadata object instead.
- **Impact**: Minor logging format issue.

### L-004: Clerk webhook uses console.log instead of structured logger

- **File**: `src/app/api/webhooks/clerk/route.ts`
- **Lines**: 21, 59, 69, 84, 99, 107, 113, 116
- **Description**: This route uses `console.log()` and `console.error()` throughout instead of the project's structured `logger` from `@/lib/logger`. All other API routes in the codebase use the structured logger, which provides Sentry integration, sensitive data redaction, and structured metadata.
- **Impact**: Inconsistent logging; Clerk webhook events are not captured in Sentry; no sensitive data redaction applied to webhook payloads.

### L-005: `extractTodoIdFromPath` has a tautological condition

- **File**: `src/lib/apiAuth.ts`
- **Lines**: 252-258
- **Description**: The condition `if (parts.length >= 1)` is always true because `String.split('/')` always returns an array with at least one element (even for an empty string, it returns `[""]`). The comment says paths are `{todoId}/{attachmentId}.{ext}`, so the check should be `parts.length >= 2` to verify the path actually contains a separator. With the current code, an empty or malformed `storagePath` like `""` would return `""` as a valid todoId.
- **Impact**: Could return empty string as a "valid" todoId on malformed input.

### L-006: Dead code -- `getAgencyScope` exported from two files

- **File**: `src/lib/apiAuth.ts` (line 291) and `src/lib/agencyAuth.ts` (line 694)
- **Description**: Both files export a `getAgencyScope` function with different signatures (one sync, one async). Neither function is imported or used anywhere in the codebase. Both are dead code.
- **Impact**: Code bloat; potential confusion if someone imports the wrong one.

### L-007: Activity logging uses mismatched action types

- **Files**: `src/app/api/agencies/[agencyId]/invitations/route.ts` (line 204), `src/app/api/invitations/accept/route.ts` (line 277)
- **Description**: Both invitation-related activities log with `action: 'task_created'` and include a `details.type` field with the actual action (`invitation_created` / `invitation_accepted`). Comments in the code acknowledge this mismatch: "Reuse existing action type; ideally 'invitation_created'". This makes activity log filtering unreliable since invitation events appear as task creation events.
- **Impact**: Activity log queries filtering by action type will conflate task creations with invitation events.

---

## CROSS-MODULE Issues

### X-001: Pre-existing TypeScript error in useTodoOperations hook

- **File**: `src/hooks/useTodoOperations.ts` (line 86)
- **Error**: `TS2448: Block-scoped variable 'createTodoDirectly' used before its declaration` and `TS2454: Variable 'createTodoDirectly' is used before being assigned.`
- **Description**: This file has pre-existing TypeScript compilation errors. This is outside the API/lib scope but affects `npx tsc --noEmit`, which exits with code 2. These errors existed before any changes in this bug bash.
- **Note**: This is in `src/hooks/`, not in the API or lib scope. Flagged as cross-module for awareness.

---

## Verification

- **TypeScript check**: `npx tsc --noEmit` exits with code 2 due to pre-existing errors in `src/hooks/useTodoOperations.ts` (outside scope). No new type errors introduced by the H-001 fix.
- **Files modified**: 1 file (`src/app/api/agencies/[agencyId]/invitations/route.ts`)

---

## Files Audited

### Shared Library (16 files)
- `src/lib/validation.ts` -- clean
- `src/lib/validators.ts` -- clean
- `src/lib/apiErrors.ts` -- clean
- `src/lib/apiErrorResponse.ts` -- clean
- `src/lib/apiResponse.ts` -- clean
- `src/lib/apiAuth.ts` -- L-005, L-006
- `src/lib/agencyAuth.ts` -- L-006
- `src/lib/supabaseClient.ts` -- clean
- `src/lib/logger.ts` -- L-001
- `src/lib/secureLogger.ts` -- clean
- `src/lib/fileValidator.ts` -- clean
- `src/lib/email.ts` -- clean
- `src/lib/duplicateDetection.ts` -- clean
- `src/lib/smartDefaults.ts` -- clean
- `src/lib/featureFlags.ts` -- clean
- `src/lib/constants.ts` -- clean

### Database Services (3 files)
- `src/lib/db/indexedDB.ts` -- clean
- `src/lib/db/offlineSync.ts` -- clean
- `src/lib/db/todoService.ts` -- clean

### API Routes (28 files)
- `src/app/api/agencies/route.ts` -- clean
- `src/app/api/agencies/[agencyId]/members/route.ts` -- clean
- `src/app/api/agencies/[agencyId]/invitations/route.ts` -- H-001 (fixed), L-007
- `src/app/api/agencies/[agencyId]/invitations/[id]/route.ts` -- clean
- `src/app/api/attachments/route.ts` -- M-002
- `src/app/api/goals/route.ts` -- clean
- `src/app/api/goals/categories/route.ts` -- clean
- `src/app/api/goals/milestones/route.ts` -- clean
- `src/app/api/invitations/validate/route.ts` -- clean
- `src/app/api/invitations/accept/route.ts` -- M-004, L-007
- `src/app/api/templates/route.ts` -- clean
- `src/app/api/activity/route.ts` -- clean
- `src/app/api/health/env-check/route.ts` -- M-001
- `src/app/api/outlook/users/route.ts` -- clean
- `src/app/api/outlook/parse-email/route.ts` -- clean
- `src/app/api/outlook/create-task/route.ts` -- M-003
- `src/app/api/digest/latest/route.ts` -- clean
- `src/app/api/digest/generate/route.ts` -- L-002
- `src/app/api/webhooks/clerk/route.ts` -- L-004
- `src/app/api/patterns/suggestions/route.ts` -- clean
- `src/app/api/patterns/analyze/route.ts` -- L-003
- `src/app/api/ai/enhance-task/route.ts` -- clean
- `src/app/api/ai/breakdown-task/route.ts` -- clean
- `src/app/api/ai/generate-email/route.ts` -- clean
- `src/app/api/ai/translate-email/route.ts` -- clean
- `src/app/api/ai/parse-voicemail/route.ts` -- clean
- `src/app/api/ai/parse-content-to-subtasks/route.ts` -- clean
- `src/app/api/ai/suggest-defaults/route.ts` -- clean
- `src/app/api/ai/daily-digest/route.ts` -- clean
- `src/app/api/ai/parse-file/route.ts` -- clean
- `src/app/api/ai/transcribe/route.ts` -- clean
- `src/app/api/ai/suggest-category/route.ts` -- clean
- `src/app/api/ai/smart-parse/route.ts` -- clean
