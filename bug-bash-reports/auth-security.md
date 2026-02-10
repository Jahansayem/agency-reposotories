# Auth & Security Bug Bash Report

## Summary
- Files audited: 27
- Issues found: 16 (2 critical, 4 high, 6 medium, 4 low)
- Issues fixed: 6

## Critical Issues

### [FIXED] Regex lastIndex bug in promptSanitizer causes intermittent bypass of injection/sensitive data detection
- **File**: `/Users/adrianstier/shared-todo-list/src/lib/promptSanitizer.ts`:131, 193-198
- **Severity**: CRITICAL
- **Description**: The `INJECTION_PATTERNS` and `SENSITIVE_PATTERNS` arrays contain regexes with the `/g` (global) flag. When `RegExp.prototype.test()` is called on a global regex, it advances `lastIndex`. On the next call with the same regex instance (e.g., a second call to `sanitizePromptInput` or `isInputSafe`), the regex starts matching from the middle of the string, causing it to miss patterns. This means:
  - `isInputSafe()` alternates between returning `true` and `false` for the same malicious input on successive calls
  - `sanitizePromptInput()` intermittently fails to detect sensitive data (SSNs, credit cards, etc.)
  - This is a well-known JavaScript footgun with stateful regex objects
- **Fix**: Added `pattern.lastIndex = 0` before each `.test()` call in both `isInputSafe()` and the sensitive data check loop in `sanitizePromptInput()`. This resets the regex state before each test, ensuring consistent detection.

### [FIXED] CSRF validateCsrfToken in csrf.ts uses wrong algorithm (SHA-256 hash instead of HMAC-SHA-256)
- **File**: `/Users/adrianstier/shared-todo-list/src/lib/csrf.ts`:70-78
- **Severity**: CRITICAL
- **Description**: The `validateCsrfToken` function in `csrf.ts` computes the expected CSRF signature using `createHash('sha256').update(${secret}:${nonce})` (plain SHA-256 hash) and truncates to 16 hex chars. However, the actual middleware (`middleware.ts`) and the `/api/csrf` endpoint both use `HMAC-SHA256(secret, nonce)` truncated to 32 hex chars. This means:
  - If any code imports and uses `validateCsrfToken` from `csrf.ts`, CSRF validation will ALWAYS FAIL (algorithm mismatch)
  - The `csrfMiddleware` export from `csrf.ts` is also broken for the same reason
  - Currently the middleware uses its own inline validation, so the active code path is not affected, but this is a dangerous latent bug
- **Fix**: Changed `validateCsrfToken` to use `createHmac('sha256', secretCookie).update(nonce).digest('hex').slice(0, 32)` to match the middleware's algorithm. Added `createHmac` to the crypto import.

## High Issues

### [FIXED] auth.ts verifyPin uses non-constant-time string comparison (timing attack)
- **File**: `/Users/adrianstier/shared-todo-list/src/lib/auth.ts`:36-39
- **Severity**: HIGH
- **Description**: The `verifyPin` function uses `===` operator to compare PIN hashes, which is not constant-time. An attacker could theoretically measure response time differences to determine the hash character by character. While the active login flow uses `timingSafeEqual` in the login API route, this exported function could be imported and used elsewhere, introducing a timing side-channel.
- **Fix**: Replaced `===` comparison with a constant-time XOR-based comparison loop (same pattern used in `secureAuth.ts`).

### [FIXED] forgot-pin route uses anon key Supabase client instead of service role client
- **File**: `/Users/adrianstier/shared-todo-list/src/app/api/auth/forgot-pin/route.ts`:3, 71-75
- **Severity**: HIGH
- **Description**: The route imported `{ supabase }` from `@/lib/supabaseClient`, which uses the anon key. With RLS enabled on the `users` table, the anon key client likely cannot query users by email, meaning the forgot-pin flow would silently fail to find any users. While the endpoint already returns a generic success message (preventing enumeration), the token insertion into `pin_reset_tokens` would also use the anon client, which may fail if RLS restricts inserts.
- **Fix**: Changed import to `{ createServiceRoleClient }` and instantiate the service role client within the request handler, matching the pattern used in the register and login routes.

### [FIXED] reset-pin route uses anon key Supabase client instead of service role client
- **File**: `/Users/adrianstier/shared-todo-list/src/app/api/auth/reset-pin/route.ts`:3, 52-56
- **Severity**: HIGH
- **Description**: Same issue as forgot-pin. The route imported the default anon key `supabase` client. With RLS enabled, the route would fail to read `pin_reset_tokens`, fail to update the user's `pin_hash`, and fail to mark tokens as used. This effectively breaks the entire PIN reset flow.
- **Fix**: Changed import to `{ createServiceRoleClient }`, instantiate service role client in the handler, and replaced the async `hashPin` import from `@/lib/auth` (which uses `crypto.subtle`) with a local synchronous `hashPin` using `crypto.createHash`, matching the pattern in other auth API routes.

### [OPEN] NextAuth allowDangerousEmailAccountLinking is enabled
- **File**: `/Users/adrianstier/shared-todo-list/src/app/api/auth/[...nextauth]/route.ts`:54, 59
- **Severity**: HIGH
- **Description**: Both Google and Apple providers have `allowDangerousEmailAccountLinking: true`. This allows an attacker who controls an email address on one OAuth provider to hijack an account that was created with that same email on a different provider. For example, if a user registered with Google, an attacker could create an Apple account with the same email and gain access to the original account. This is explicitly flagged as "dangerous" by NextAuth.
- **Fix needed**: Consider removing this flag and implementing a proper account linking flow that requires the user to prove ownership of both accounts. If the flag is intentionally enabled for the PIN-to-OAuth migration use case, document the risk and add additional verification.

## Medium Issues

### [OPEN] forgot-pin uses in-memory rate limiting (not distributed)
- **File**: `/Users/adrianstier/shared-todo-list/src/app/api/auth/forgot-pin/route.ts`:10-27
- **Severity**: MEDIUM
- **Description**: The rate limiting uses a local `Map` (`rateLimitMap`), which resets on server restart and is not shared across multiple server instances. In a multi-instance deployment (e.g., multiple Railway containers), each instance has its own rate limit state, allowing an attacker to multiply their attempts by the number of instances. The other auth routes use Redis-backed rate limiting.
- **Fix needed**: Replace with Redis-backed rate limiting (e.g., `rateLimiters.login` from `@/lib/rateLimit` or a dedicated limiter).

### [OPEN] LoginScreen fetches user list including role from client-side with anon key
- **File**: `/Users/adrianstier/shared-todo-list/src/components/LoginScreen.tsx`:157-168
- **Severity**: MEDIUM
- **Description**: The login screen fetches all users with `select('id, name, color, role, created_at, last_login')` using the anon key Supabase client. This exposes the full user list (including roles and last login times) to any unauthenticated visitor. While this is needed for the user-select login flow, it leaks information about team structure and activity patterns.
- **Fix needed**: Consider creating a dedicated API endpoint that returns only the minimum fields needed (id, name, color) and potentially limits the response. The `role`, `created_at`, and `last_login` fields are not needed on the login screen user cards (only `last_login` is shown but could be removed).

### [OPEN] LoginScreen fetches task counts and user activity stats without authentication
- **File**: `/Users/adrianstier/shared-todo-list/src/components/LoginScreen.tsx`:170-212
- **Severity**: MEDIUM
- **Description**: The `checkAndFetchStats` function queries `todos` and `users` tables using the anon key client to display stats on the login screen. This leaks operational data (total task count, weekly completion count, active user count) to unauthenticated visitors.
- **Fix needed**: Move stats fetching behind authentication or use a server-side endpoint.

### [OPEN] securityMonitor.getRecentEventsSummary returns incomplete type
- **File**: `/Users/adrianstier/shared-todo-list/src/lib/securityMonitor.ts`:508-520
- **Severity**: MEDIUM
- **Description**: The return type is `Record<SecurityEventType, number>` but the function builds a `Partial<Record<SecurityEventType, number>>` and casts it. Event types with zero count are omitted from the result, but the return type claims all event types will be present. Consumers checking `summary[someType]` may get `undefined` instead of `0`, leading to potential runtime errors.
- **Fix needed**: Change return type to `Partial<Record<SecurityEventType, number>>` or ensure all event types are included with zero values.

### [OPEN] RegisterModal calls getRandomUserColor() on every render in PIN step
- **File**: `/Users/adrianstier/shared-todo-list/src/components/RegisterModal.tsx`:351, 417
- **Severity**: MEDIUM
- **Description**: The PIN entry and confirm PIN steps call `getRandomUserColor()` inline in the JSX to set the avatar background color. Since this returns a random value each time, the avatar color changes on every re-render (e.g., when typing a PIN digit), creating a flickering effect.
- **Fix needed**: Store the color in state (e.g., `useState(getRandomUserColor)`) so it's consistent across renders.

### [OPEN] dualAuth validateDualAuth returns `authenticated: true` without actual validation
- **File**: `/Users/adrianstier/shared-todo-list/src/lib/auth/dualAuth.ts`:65-73
- **Severity**: MEDIUM
- **Description**: When a PIN session token is found, `validateDualAuth` returns `{ authenticated: true, authMethod: 'pin' }` without actually validating the token against the database. The function only checks for the *presence* of a token. The comment says "the actual validation happens in sessionValidator", but the return value of `authenticated: true` could be misleading to callers who trust this result.
- **Fix needed**: Either rename the result to indicate it's a preliminary check (e.g., `tokenPresent: true`), or perform actual validation by calling `validateSession`.

## Low Issues

### [OPEN] Dead code: csrf.ts contains validateCsrfToken and csrfMiddleware that are unused
- **File**: `/Users/adrianstier/shared-todo-list/src/lib/csrf.ts`:44-187
- **Severity**: LOW
- **Description**: The `validateCsrfToken` and `csrfMiddleware` functions in `csrf.ts` are exported but not imported anywhere in the codebase. The actual CSRF validation is handled inline in `middleware.ts`. These functions are dead code that could confuse developers.
- **Fix needed**: Remove the dead functions or add clear documentation that they are not used in the active flow.

### [OPEN] Unused IDLE_TIMEOUT constant in sessionCookies.ts
- **File**: `/Users/adrianstier/shared-todo-list/src/lib/sessionCookies.ts`:15
- **Severity**: LOW
- **Description**: `const IDLE_TIMEOUT = 30 * 60;` is declared but never used in the file. The idle timeout logic is handled in `sessionValidator.ts`.
- **Fix needed**: Remove the unused constant.

### [OPEN] security/events API constructs Supabase client with fallback to anon key
- **File**: `/Users/adrianstier/shared-todo-list/src/app/api/security/events/route.ts`:16-19
- **Severity**: LOW
- **Description**: `getSupabaseClient()` falls back to `NEXT_PUBLIC_SUPABASE_ANON_KEY` if `SUPABASE_SERVICE_ROLE_KEY` is not set: `process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!`. Security audit logs and auth failure logs should only be accessible with the service role key. Falling back to the anon key could either expose data (if RLS is misconfigured) or silently fail to return results.
- **Fix needed**: Use `createServiceRoleClient()` consistently and fail explicitly if the service role key is not configured.

### [OPEN] hashPin function duplicated across login, register, and reset-pin routes
- **File**: `/Users/adrianstier/shared-todo-list/src/app/api/auth/login/route.ts`:44-46, `/Users/adrianstier/shared-todo-list/src/app/api/auth/register/route.ts`:15-17, `/Users/adrianstier/shared-todo-list/src/app/api/auth/reset-pin/route.ts`:22-24
- **Severity**: LOW
- **Description**: The server-side `hashPin` function (using `createHash('sha256')`) is duplicated in three separate API routes. This creates maintenance risk -- if the hashing algorithm needs to change, all three must be updated in sync.
- **Fix needed**: Extract to a shared server-side utility (e.g., `@/lib/auth/serverHash.ts`).

## Cross-Module Issues

### [CROSS-MODULE] ChatAttachments.tsx has pre-existing TypeScript error
- **File**: `/Users/adrianstier/shared-todo-list/src/components/ChatAttachments.tsx`:100
- **Severity**: LOW
- **Description**: `error TS2686: 'React' refers to a UMD global, but the current file is a module`. This is a pre-existing issue unrelated to auth/security but blocks a fully clean `tsc --noEmit` run.
