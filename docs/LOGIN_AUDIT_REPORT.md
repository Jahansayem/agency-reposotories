# Login Process Audit Report

**Date:** 2026-02-04
**Scope:** Frontend and backend authentication flows
**Method:** Code review + Playwright live testing

---

## Executive Summary

The login system has **functional core flows** but contains several **security vulnerabilities** and **UX issues** that should be addressed before production deployment at scale.

| Severity | Count | Description |
|----------|-------|-------------|
| **Critical** | 2 | Security vulnerabilities requiring immediate fix |
| **High** | 3 | Significant issues affecting security/UX |
| **Medium** | 4 | Issues that should be addressed |
| **Low** | 3 | Minor improvements |

---

## Issues Found

### Critical Severity

#### 1. Server-Side Lockout Not Functioning
**Location:** `src/lib/serverLockout.ts`, `src/app/api/auth/login/route.ts`
**Tested:** 6+ consecutive failed login attempts produced no lockout

**Evidence:**
- All 6 attempts returned HTTP 401 (not 429 Too Many Requests)
- UI continued showing "4 attempts left" without decrementing
- No lockout message ever displayed

**Root Cause:** Redis is likely not configured in local/dev environment. The lockout system silently fails when Redis is unavailable.

**Impact:** Brute-force attacks possible against 4-digit PINs (only 10,000 combinations)

**Recommendation:**
1. Add fallback to in-memory rate limiting when Redis unavailable
2. Log warning when Redis connection fails
3. Consider fail-closed behavior (deny login if rate limiter unavailable)

---

#### 2. PIN Security Weakness
**Location:** `src/lib/auth.ts`, `src/components/LoginScreen.tsx`

**Issues:**
- **No salt on PIN hash** - SHA-256(PIN) is directly stored
- Only 10,000 possible PINs (0000-9999)
- All PIN hashes are precomputable (rainbow table trivial)
- PIN transmitted as plaintext (relies on HTTPS)

**Evidence from code review:**
```typescript
// src/lib/auth.ts - No salt used
const hashArray = Array.from(new Uint8Array(hashBuffer));
const pin_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
```

**Recommendation:**
1. Add per-user salt to PIN hashing (Argon2id recommended)
2. Implement password/passphrase option for high-security accounts
3. Add MFA option (TOTP) for managers/owners

---

### High Severity

#### 3. Attempts Counter UI Not Updating
**Location:** `src/components/LoginScreen.tsx`
**Tested:** Counter stayed at "4 attempts left" after 6 failures

**Evidence:**
- First failure: Shows "4 attempts left"
- Second failure: Still shows "4 attempts left"
- Third+ failures: Counter never decrements

**Root Cause:** Frontend not reading `attemptsRemaining` from API response or server not returning it.

**Recommendation:** Ensure API returns remaining attempts and frontend updates UI accordingly.

---

#### 4. OAuth Buttons Return 403 Without Error Message
**Location:** `src/components/LoginScreen.tsx`, `/api/auth/signin/google`
**Tested:** Clicking "Sign in with Google" returned 403 Forbidden

**Evidence:**
- Console error: `Failed to load resource: 403 (Forbidden) @ /api/auth/signin/google`
- UI showed "Loading workspace..." briefly then returned to login
- No user-facing error message displayed

**Recommendation:**
1. Show toast: "Google Sign-In not configured" or hide buttons when OAuth not available
2. Add feature flag to conditionally render OAuth buttons

---

#### 5. Duplicate Username Check API Error
**Location:** `/api/users` endpoint (Supabase REST)
**Tested:** During registration, duplicate name check returns 406

**Evidence:**
```
Failed to load resource: 406 () @
https://...supabase.co/rest/v1/users?select=id&name=ilike.Test+User
```

**Impact:** Registration still works, but error is logged and could mask other issues.

**Recommendation:** Fix the Supabase query format or handle 406 gracefully.

---

### Medium Severity

#### 6. "Offline" Indicator Shows After Login
**Location:** Task list view
**Tested:** After successful login/registration, "Offline" indicator appeared

**Evidence:** Real-time subscription may not be establishing properly for new users.

**Recommendation:** Investigate real-time channel subscription on initial login.

---

#### 7. Invite Code Shows Raw Error Code
**Location:** `src/components/LoginScreen.tsx`
**Tested:** Invalid invite code shows "INVALID_TOKEN"

**Evidence:** Error displayed as technical code, not user-friendly message.

**Recommendation:** Map error codes to friendly messages:
- `INVALID_TOKEN` → "This invitation link is invalid or has expired"
- `ALREADY_ACCEPTED` → "This invitation has already been used"

---

#### 8. Deprecated Header-Based Auth Still Active
**Location:** `src/lib/sessionValidator.ts:54-68`

**Evidence from code review:**
```typescript
// Fallback: Check legacy X-User-Id header (deprecated)
const userId = request.headers.get('X-User-Id');
if (userId) {
  logger.warn('deprecated-header-auth', { userId });
  return { userId, isValid: true };
}
```

**Impact:** Attackers could bypass session validation by setting header.

**Recommendation:** Remove deprecated fallback or add additional verification.

---

#### 9. Multiple Session Sources Complexity
**Location:** `src/lib/sessionValidator.ts`

**Evidence:** Session can come from 4 sources:
1. HttpOnly cookie (primary)
2. Authorization Bearer token
3. Request context
4. Deprecated X-User-Id header

**Impact:** Complex attack surface, harder to audit.

**Recommendation:** Consolidate to single session source (HttpOnly cookie).

---

### Low Severity

#### 10. Console DOM Warning
**Location:** Login page
**Evidence:** "Multiple forms should be contained..."

**Recommendation:** Review form nesting in LoginScreen.tsx.

---

#### 11. No Loading State on PIN Submission
**Location:** `src/components/LoginScreen.tsx`
**Tested:** PIN auto-submits but no loading indicator

**Recommendation:** Add loading spinner during authentication.

---

#### 12. Registration Success Has No Celebration
**Location:** `src/components/RegisterModal.tsx`
**Tested:** Registration completed silently, auto-login happened

**Recommendation:** Add success animation/message before transitioning to app.

---

## What Works Well

| Feature | Status | Notes |
|---------|--------|-------|
| User selection UI | ✅ Working | Clean card-based user list |
| PIN entry with auto-advance | ✅ Working | Good UX, digits auto-focus |
| Registration 3-step wizard | ✅ Working | Name → PIN → Confirm flow |
| PIN confirmation matching | ✅ Working | Validates PINs match |
| Auto-login after registration | ✅ Working | Smooth transition |
| Logout | ✅ Working | Clears session, returns to login |
| New user appears in list | ✅ Working | Test User appeared after registration |
| "Incorrect PIN" feedback | ✅ Working | Alert shown on wrong PIN |
| Back button navigation | ✅ Working | Returns to user selection |

---

## Test User Created

A test user was created during Playwright testing:
- **Name:** Test User
- **PIN:** 1234
- **Created:** 2026-02-04

This user can be deleted after testing if desired.

---

## Recommendations Priority

### Immediate (Before Production)
1. Fix server-side lockout to work without Redis (fail-closed)
2. Add salt to PIN hashing
3. Remove deprecated header-based auth fallback

### Short-Term (Next Sprint)
4. Update attempts counter in UI properly
5. Add user-friendly OAuth error messages
6. Fix duplicate username check API call
7. Map invite code errors to friendly messages

### Medium-Term (Technical Debt)
8. Consolidate session sources
9. Add MFA option for sensitive roles
10. Consider password option alongside PIN

---

## Console Errors Summary

| Error | Count | Endpoint | Severity |
|-------|-------|----------|----------|
| 406 Not Acceptable | 1 | `/users?select=id&name=ilike...` | Medium |
| 403 Forbidden | 1 | `/api/auth/signin/google` | High |
| 401 Unauthorized | 6+ | `/api/auth/login` | Expected (wrong PIN) |

---

## Files Reviewed

### Frontend
- `src/components/LoginScreen.tsx` - Main login UI
- `src/components/RegisterModal.tsx` - Registration wizard
- `src/contexts/UserContext.tsx` - User state provider
- `src/contexts/AgencyContext.tsx` - Multi-tenancy context
- `src/lib/auth.ts` - Client-side auth utilities

### Backend
- `src/app/api/auth/login/route.ts` - Login endpoint
- `src/app/api/auth/register/route.ts` - Registration endpoint
- `src/lib/serverLockout.ts` - Redis-based lockout
- `src/lib/authRateLimit.ts` - Rate limiting
- `src/lib/sessionValidator.ts` - Session validation
- `src/lib/sessionCookies.ts` - Cookie management

---

**Report Generated:** 2026-02-04 via Playwright MCP testing + code review
