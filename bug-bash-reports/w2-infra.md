# W2: Infrastructure Fixes Report

## Summary
- Issues assigned: 4
- Issues fixed: 3 (LoginScreen stats leak deferred — user list is intentional for PIN login)
- TypeScript: PASS

## Fixes

### 1. MEDIUM: In-memory rate limiting in forgot-pin — FIXED
- **File**: `src/app/api/auth/forgot-pin/route.ts`
- Replaced local `Map()` rate limiter with the project's existing Redis-backed rate limiting from `src/lib/authRateLimit.ts`.

### 2. MEDIUM: Module-level Supabase client in attachments — FIXED
- **File**: `src/app/api/attachments/route.ts`
- Moved Supabase client creation from module scope into each route handler, matching the per-request pattern used by other API routes.

### 3. MEDIUM: securityMonitor incomplete return type — FIXED
- **File**: `src/lib/securityMonitor.ts`
- Fixed return type to properly include zero-count event types.

### 4. LoginScreen user/stats leaks — DEFERRED
- The user list is intentional for the PIN-based login flow (users select their card).
- Stats fetching would require significant LoginScreen refactoring.
