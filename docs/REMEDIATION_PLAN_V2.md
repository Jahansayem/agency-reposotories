# Remediation Plan V2: Post-Review Fixes

## Status After First Remediation
- 58 issues found in first review → 7-phase remediation completed
- ~38 fully fixed, ~8 partially fixed, ~4 new issues introduced, ~12 newly discovered
- **47 unique issues remain** (7 CRITICAL, 12 HIGH, 18 MEDIUM, 10 LOW)

## Validated Findings (verified against current codebase)
Some review agent findings were stale. After verification:
- ✅ `X-User-Name` auth bypass already removed
- ✅ `csrf_token` non-HttpOnly cookie already removed from middleware (but still in `src/lib/csrf.ts`)
- ✅ Reminders route already uses `extractAndValidateUserName`
- ✅ TodoList handlers already wrapped in `useCallback`
- ✅ KanbanBoard blob URLs already revoked

---

## PHASE 1: CSRF & Auth Foundation (Blocks everything)

### 1A: Fix CSRF signature algorithm mismatch
- **Files**: `src/app/api/csrf/route.ts`, `src/lib/csrf.ts`
- **Problem**: CSRF endpoint uses SHA-256 hash but middleware validates with HMAC-SHA256. Tokens never match.
- **Fix**: Update `/api/csrf/route.ts` to use HMAC-SHA256 via `crypto.createHmac('sha256', secret).update(nonce).digest('hex').slice(0, 32)` to match middleware's `computeCsrfSignature`
- **Issues**: #1

### 1B: Remove legacy CSRF token leak in csrf.ts
- **File**: `src/lib/csrf.ts`
- **Problem**: `setCsrfCookies` sets non-HttpOnly `csrf_token` cookie exposing the secret
- **Fix**: Remove the `csrf_token` cookie setter entirely. Only `csrf_secret` (HttpOnly) and `csrf_nonce` (non-HttpOnly) should be set.
- **Issues**: #2

### 1C: Fix apiAuth query param fallback
- **File**: `src/lib/apiAuth.ts`
- **Problem**: `extractAndValidateUserName` falls back to untrusted `userName` query parameter when session is valid but userName not populated
- **Fix**: Remove the query param fallback. If session is valid but userName missing, return an error.
- **Issues**: #9

### 1D: Fix login endpoint PIN comparison
- **File**: `src/app/api/auth/login/route.ts`
- **Problem**: Uses `!==` for PIN hash comparison (not constant-time)
- **Fix**: Use `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` for hash comparison. Also ensure service role key is required (not falling back to anon key).
- **Issues**: #8, #10

---

## PHASE 2: Route Auth Hardening (Parallel with Phase 1)

### 2A: Add auth to patterns endpoints
- **Files**: `src/app/api/patterns/suggestions/route.ts`, `src/app/api/patterns/analyze/route.ts`
- **Problem**: Both endpoints are completely unauthenticated
- **Fix**: Add `extractAndValidateUserName(request)` check to both handlers
- **Issues**: #4, #5

### 2B: Add auth to activity GET
- **File**: `src/app/api/activity/route.ts`
- **Problem**: GET handler has no auth (POST was fixed)
- **Fix**: Add `extractAndValidateUserName(request)` to GET handler
- **Issues**: #6

### 2C: Add verifyTodoAccess to todos PUT
- **File**: `src/app/api/todos/route.ts`
- **Problem**: PUT handler missing authorization check (DELETE has it)
- **Fix**: Add `verifyTodoAccess` call matching the pattern in DELETE handler
- **Issues**: #7

### 2D: Fix push-subscribe IDOR
- **File**: `src/app/api/push-subscribe/route.ts`
- **Problem**: Accepts userId from body without verifying it matches authenticated user
- **Fix**: Compare body `userId` against session `userId` from `extractAndValidateUserName`
- **Issues**: #11

### 2E: Fix push-send authorization
- **File**: `src/app/api/push-send/route.ts`
- **Problem**: Any authenticated user can send push to any other user
- **Fix**: Restrict to sending notifications only where sender is assigned_to or created_by the related task
- **Issues**: #12

### 2F: Fix cron endpoint fail-open
- **File**: `src/app/api/todos/check-waiting/route.ts`
- **Problem**: Skips auth when CRON_SECRET not set
- **Fix**: Return 500 if CRON_SECRET is not configured
- **Issues**: #13

### 2G: Fix health check weak auth
- **File**: `src/app/api/health/env-check/route.ts`
- **Problem**: Accepts any bearer token or any session cookie value
- **Fix**: Require proper session validation or specific admin token
- **Issues**: #15

### 2H: Fix goals API auth bypass
- **Files**: `src/app/api/goals/route.ts`, categories, milestones
- **Problem**: Trusts client-supplied userName for owner access verification
- **Fix**: Use `extractAndValidateUserName(request)` instead of query params/body for identity
- **Issues**: #20

### 2I: Error message sanitization
- **Files**: Multiple API routes (`parse-file`, `attachments`, `outlook/parse-email`, `transcribe`)
- **Problem**: Return `error.message` to clients
- **Fix**: Replace with generic "Internal server error", log full error server-side
- **Issues**: #21

### 2J: Add file size validation to parse-file
- **File**: `src/app/api/ai/parse-file/route.ts`
- **Problem**: No file size limit (transcribe has 25MB but parse-file has none)
- **Fix**: Add 10MB size check
- **Issues**: #22

---

## PHASE 3: Frontend & Config Fixes (Parallel with Phase 2)

### 3A: Fix ChatPanel bare fetch
- **File**: `src/components/ChatPanel.tsx`
- **Problem**: Push notification uses bare `fetch` instead of `fetchWithCsrf`
- **Fix**: Replace with `fetchWithCsrf`
- **Issues**: #35

### 3B: Fix TodoItem memo comparator
- **File**: `src/components/TodoItem.tsx`
- **Problem**: `areTodoItemPropsEqual` uses `&&` instead of `||` for users comparison
- **Fix**: Change to `||` so component re-renders when either reference or length changes
- **Issues**: #29

### 3C: Fix uncleaned setTimeouts
- **Files**: `src/components/MainApp.tsx`, `src/components/layout/AppShell.tsx`, `src/components/TodoItem.tsx`
- **Problem**: setTimeout IDs not stored or cleaned up on unmount
- **Fix**: Store timer IDs in refs, clear on unmount
- **Issues**: #30

### 3D: Fix TaskDetailPanel missing try/catch
- **File**: `src/components/layout/TaskDetailPanel.tsx`
- **Problem**: Save operations have no error handling, saving indicator can get stuck
- **Fix**: Wrap `onUpdate` calls in try/catch with finally block for `setSaving(false)`
- **Issues**: #33

### 3E: Fix useChatMessages loadMoreMessages deps
- **File**: `src/hooks/useChatMessages.ts`
- **Problem**: `messages` in dependency array causes infinite recreation
- **Fix**: Use `messages.length` or a ref for the offset calculation
- **Issues**: #26

### 3F: Console.error → logger.error
- **Files**: Multiple server-side files
- **Problem**: `console.error` bypasses PII-sanitizing logger
- **Fix**: Replace with `logger.error` from `@/lib/logger`
- **Issues**: #42

---

## PHASE 4: Verification

- Run `npx next build` to confirm zero TypeScript errors
- Grep for remaining deprecated patterns
- Verify CSRF token flow works end-to-end (middleware HMAC matches endpoint HMAC)

---

## Issues Deferred (Low priority / Business decision needed)

| # | Issue | Reason |
|---|-------|--------|
| 3 | Middleware token-presence-only validation | By design -- full validation in API routes. Acceptable tradeoff. |
| 16 | CSP unsafe-inline | Requires nonce-based CSP which is a larger refactor |
| 17 | Client-side lockout bypassable | Server-side lockout exists; client-side is UX only |
| 34 | Security monitor in-memory store | Requires Redis migration |
| 36 | Duplicate AuthUser types | Refactoring task, not security |
| 37 | reactStrictMode disabled | Can cause issues with real-time subscriptions |
| 38-47 | Various LOW issues | Session expiry, dead props, Dockerfile version, etc. |
