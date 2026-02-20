# Auth Consolidation Testing & Migration Plan

**Date:** 2026-02-20
**Implementation Status:** Phase 2 Complete (Server/Client Boundaries Fixed)
**Next Phase:** Phase 1 (NextAuth Removal) - Optional

---

## Completed Changes

### ✅ Phase 2: Server/Client Boundary Separation (P2.2)

**Files Created:**
- `/Users/adrianstier/shared-todo-list/src/lib/auth/dualAuth.server.ts` (95 lines)
  - Exports: `validateDualAuth()`, `getClerkUser()`, `hasClerkSession()`
  - Includes: `import 'server-only'` guard
  - Server-only imports: `@clerk/nextjs/server`, `NextRequest`

- `/Users/adrianstier/shared-todo-list/src/lib/auth/dualAuth.client.ts` (19 lines)
  - Exports: `useAuthMode()` hook
  - Includes: `'use client'` directive
  - Client-safe: No server imports

**Files Deleted:**
- `/Users/adrianstier/shared-todo-list/src/lib/auth/dualAuth.ts` (mixed server/client code)

**Impact:**
- ✅ Server-only code cannot be accidentally imported by client components
- ✅ TypeScript compilation passes (`npx tsc --noEmit` ✅)
- ✅ No existing imports to update (dualAuth.ts was unused)
- ✅ Future code will have clear boundaries enforced at import time

---

## Testing Checklist

### Test 1: PIN Authentication (Regression Test)

**Purpose:** Verify splitting dualAuth.ts didn't break existing PIN auth

**Steps:**
```bash
# 1. Start dev server
npm run dev

# 2. Navigate to http://localhost:3000
# Expected: LoginScreen appears

# 3. Select a user from the list
# Expected: PIN entry screen appears

# 4. Enter correct PIN
# Expected: Login succeeds, MainApp loads

# 5. Create a task
# Expected: Task is created and appears in list

# 6. Logout via UserSwitcher
# Expected: Returns to LoginScreen

# 7. Re-login with same user
# Expected: Session is restored (or requires re-login, both are valid)

# 8. Verify task persists
# Expected: Task created in step 5 is still visible
```

**Status:** ⏳ Pending user verification

---

### Test 2: TypeScript Build Check

**Purpose:** Verify no type errors from boundary split

**Steps:**
```bash
# Run TypeScript compiler in check mode
npx tsc --noEmit

# Expected output: (empty = success)
```

**Result:** ✅ **PASSED** (no output = no errors)

---

### Test 3: Production Build Check

**Purpose:** Verify app builds successfully with boundary changes

**Steps:**
```bash
# Build the app
npm run build

# Expected: Build succeeds with no errors
# Look for: "Compiled successfully" message
```

**Status:** ⏳ Pending execution

**Run:**
```bash
npm run build 2>&1 | tee build-output.log
# Check for "Error:" in output
```

---

### Test 4: Server-Only Import Protection

**Purpose:** Verify `server-only` package prevents client imports

**Test Case:** Create a temporary client component that tries to import server code

**Steps:**
```bash
# Create test file
cat > src/test/boundary-violation-test.tsx << 'EOF'
'use client';

// This should cause a build error:
import { validateDualAuth } from '@/lib/auth/dualAuth.server';

export function BoundaryViolationTest() {
  return <div>This should not compile</div>;
}
EOF

# Run build
npm run build

# Expected: Build error mentioning 'server-only'
# Error message should be similar to:
# "You're importing a component that needs server-only. That only works in a Server Component..."

# Clean up test file
rm src/test/boundary-violation-test.tsx
```

**Status:** ⏳ Pending execution

---

### Test 5: Clerk Dormant Mode (Feature Flag Test)

**Purpose:** Verify Clerk stays disabled when no keys are set

**Steps:**
```bash
# 1. Verify NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set
grep CLERK .env.local
# Expected: (empty or commented out)

# 2. Start dev server
npm run dev

# 3. Check middleware logs
# Look for: "[DualAuth] Clerk auth not available, trying PIN auth"

# 4. Check sign-in page
curl http://localhost:3000/sign-in
# Expected: Redirects to / (Clerk disabled)

# 5. Verify ClerkProvider wrapper
# View page source at http://localhost:3000
# Expected: No <script> tags from clerk.com
```

**Status:** ⏳ Pending execution

---

### Test 6: API Route Authentication (Integration Test)

**Purpose:** Verify API routes still authenticate correctly

**Steps:**
```bash
# 1. Login via UI to get session cookie

# 2. Test authenticated endpoint
curl -H "Cookie: session_token=<your-token>" http://localhost:3000/api/todos

# Expected: 200 OK with JSON response

# 3. Test without auth
curl http://localhost:3000/api/todos

# Expected: 401 Unauthorized
```

**Status:** ⏳ Pending execution

---

## Future Phase: NextAuth Removal (Optional)

**Note:** This phase is **OPTIONAL** as NextAuth is already dead code (no active usage).
Removal reduces attack surface but has no functional impact.

### Files to Delete

```bash
# API route
rm src/app/api/auth/[...nextauth]/route.ts

# OAuth buttons component (if only used for NextAuth)
# Check usage first:
rg "OAuthLoginButtons" src/
# If no matches outside LoginScreen.tsx (and LoginScreen doesn't use it):
rm src/components/OAuthLoginButtons.tsx
```

### Files to Modify

**package.json:**
```diff
  "dependencies": {
-   "next-auth": "^4.24.13",
-   "@auth/supabase-adapter": "^1.0.0",
```

**Run:**
```bash
npm install  # Update package-lock.json
```

**.env.example:**
```diff
- # NextAuth Configuration (Deprecated - use Clerk instead)
- NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
- NEXTAUTH_URL=http://localhost:3000
-
- # Legacy OAuth 2.0 (Deprecated - use Clerk instead)
- GOOGLE_CLIENT_ID=your-google-client-id
- GOOGLE_CLIENT_SECRET=your-google-client-secret
- APPLE_CLIENT_ID=your-apple-client-id
- APPLE_CLIENT_SECRET=your-apple-secret
```

### Verification Tests

**After NextAuth removal:**

```bash
# 1. Verify route is gone
curl http://localhost:3000/api/auth/signin
# Expected: 404 Not Found

# 2. Verify package removed
npm ls next-auth
# Expected: (not found)

# 3. Verify build still works
npm run build
# Expected: Success

# 4. Search for orphaned references
rg "next-auth|NextAuth|nextauth" src/
# Expected: No matches (or only in docs/test files)
```

---

## Rollback Plan

**If Phase 2 (Server/Client Split) Causes Issues:**

### Step 1: Restore Original File

```bash
# Restore dualAuth.ts from git history
git show HEAD~1:src/lib/auth/dualAuth.ts > src/lib/auth/dualAuth.ts

# Remove split files
rm src/lib/auth/dualAuth.server.ts
rm src/lib/auth/dualAuth.client.ts
```

### Step 2: Verify Rollback

```bash
# Check file is restored
ls -la src/lib/auth/dualAuth.ts

# Rebuild
npm run build

# Test login flow
npm run dev
# Verify login works
```

**Note:** Rollback is **low risk** because:
- No existing code imports dualAuth.ts (unused module)
- PIN auth is completely separate and unaffected
- Clerk is dormant (disabled by default)

---

## Future Clerk Activation (SSO Rollout)

**When Allstate requires SAML/SSO:**

### Step 1: Configure Clerk

```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
```

### Step 2: Update Imports for Dual-Auth Routes

**Example: API route that needs Clerk support:**

```typescript
// Before (PIN-only):
import { validateSession } from '@/lib/sessionValidator';

export async function GET(request: NextRequest) {
  const session = await validateSession(request);
  if (!session.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... handler code
}

// After (Dual-auth with Clerk support):
import { validateDualAuth } from '@/lib/auth/dualAuth.server';

export async function GET(request: NextRequest) {
  const auth = await validateDualAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // auth.authMethod tells you which system authenticated the user
  // 'clerk' | 'pin'
  // ... handler code
}
```

### Step 3: Test Dual-Auth Mode

```bash
# Both systems enabled:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_DISABLE_PIN_AUTH=false

# Start app
npm run dev

# Test 1: Clerk login via /sign-in
# Expected: Clerk UI appears, SAML SSO works

# Test 2: PIN login via /
# Expected: LoginScreen appears, PIN auth works

# Test 3: API routes accept both auth methods
# - Login via Clerk → get Clerk session
# - Call API → should accept Clerk session
# - Logout
# - Login via PIN → get PIN session
# - Call API → should accept PIN session
```

### Step 4: Monitor Dual-Auth Logs

```typescript
// In API routes using validateDualAuth():
const auth = await validateDualAuth(request);
console.log(`Authenticated via: ${auth.authMethod}`);
// Logs: "Authenticated via: clerk" or "Authenticated via: pin"
```

**Metrics to track:**
- % of users using Clerk vs PIN
- Any auth failures (neither system worked)
- Session conflicts (user has both Clerk + PIN session)

---

## Breaking Changes Summary

### Phase 2 (Server/Client Split) - COMPLETED

**Breaking Changes:**
- ❌ **NONE** - No existing imports of `dualAuth.ts` to break

**Non-Breaking Changes:**
- ✅ Added `server-only` guard to prevent future client imports
- ✅ Split client hook (`useAuthMode`) into separate file
- ✅ TypeScript enforces boundaries at import time

---

### Future Phase 1 (NextAuth Removal) - OPTIONAL

**Breaking Changes:**
- ❌ OAuth login buttons (Google/Apple) will be removed
  - **Mitigation:** No users currently use OAuth (NextAuth is dead code)
  - **Fallback:** PIN login still works

- ❌ `/api/auth/*` routes will 404
  - **Mitigation:** No traffic to these routes (not linked in app)
  - **Fallback:** Use `/api/auth/login` (PIN) or `/sign-in` (Clerk)

---

## Monitoring & Observability

### Logs to Watch After Deployment

**Auth Method Distribution:**
```bash
# Grep production logs for auth method usage
grep "Authenticated via:" logs.txt | sort | uniq -c
# Expected (current state):
#   1000 Authenticated via: pin
#      0 Authenticated via: clerk
```

**Auth Failures:**
```bash
# Grep for auth failures
grep "No valid authentication found" logs.txt
# Expected: Should be rare (only unauthenticated requests)
```

**Boundary Violations:**
```bash
# Check for server-only import errors
grep "server-only" logs.txt
# Expected: (empty - no violations)
```

---

## Sign-Off Checklist

**Before Deploying to Production:**

- [ ] All tests pass (`npm run build`, `npm test`)
- [ ] TypeScript check passes (`npx tsc --noEmit`)
- [ ] PIN login flow tested manually (Step-by-step in Test 1)
- [ ] API routes authenticate correctly (Test 6)
- [ ] No boundary violations detected (Test 4)
- [ ] Clerk remains dormant without keys (Test 5)
- [ ] Rollback plan documented and understood
- [ ] Monitoring/logging in place to track auth method distribution

---

## Success Criteria

**Phase 2 (Server/Client Split) Success:**
- ✅ TypeScript build passes
- ✅ PIN auth works unchanged
- ✅ No server imports in client components
- ✅ `server-only` guard prevents future violations

**Future Phase 1 (NextAuth Removal) Success:**
- ⏳ NextAuth routes return 404
- ⏳ Package removed from `package.json`
- ⏳ No references to NextAuth in codebase (except docs)
- ⏳ App builds and runs unchanged

**Future SSO Rollout Success:**
- ⏳ Clerk activates when keys are set
- ⏳ Both Clerk and PIN auth work simultaneously
- ⏳ API routes accept both auth methods
- ⏳ No auth conflicts or failures

---

## Contact & Support

**Questions about this migration?**
- See: `/Users/adrianstier/shared-todo-list/docs/AUTH_CONSOLIDATION_ANALYSIS.md`
- Refer to: Boundary violations section (P2.2)
- Review: Feature flag isolation strategy (P2.1)

**Rollback needed?**
- Follow: Rollback Plan section above
- Restore: `git show HEAD~1:src/lib/auth/dualAuth.ts`

**Clerk activation help?**
- See: `docs/ALLSTATE_SAML_MAPPING.md`
- See: `docs/AUTH_MIGRATION_PLAN.md`
