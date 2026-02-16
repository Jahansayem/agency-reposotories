# Authentication Migration Plan: PIN to Federated SSO

**Created:** 2026-02-04
**Status:** Planning
**Target:** Allstate ISSAS-compliant Federated SSO

---

## Executive Summary

This plan migrates the Wavezly Todo List from PIN-based authentication to **Federated SSO** using an Auth Broker pattern. This is required for Allstate production deployment per ISSAS security standards.

**Current State:** PIN-based authentication (4-digit)
**Target State:** Federated SSO via SAML 2.0/OIDC with Auth Broker

---

## Why This Migration is Required

### Allstate ISSAS Requirements

1. **No Direct Password Collection** - Apps cannot ask for Allstate credentials
2. **Federated Authentication** - Must use SAML 2.0 or OIDC
3. **IdP-Initiated Login** - Support login from Allstate Gateway portal
4. **No Phishing Appearance** - Custom login forms trigger security audit failure

### Business Impact

| Without Migration | With Migration |
|-------------------|----------------|
| ❌ Cannot deploy to Allstate agencies | ✅ Full Allstate deployment |
| ❌ Security audit failure | ✅ ISSAS compliant |
| ❌ Looks like phishing | ✅ Trusted IdP redirect |
| ❌ MFA not satisfied | ✅ MFA via corporate IdP |

---

## Architecture Decision: Auth Broker Selection

### Options Evaluated

| Broker | SAML | OIDC | Multi-tenant | Pricing | Recommendation |
|--------|------|------|--------------|---------|----------------|
| **Clerk** | ✅ Enterprise | ✅ | ✅ | $25/mo + usage | ⭐ **Recommended** |
| **Auth0** | ✅ Enterprise | ✅ | ✅ | $23/mo + usage | Good alternative |
| **AWS Cognito** | ✅ | ✅ | ⚠️ Complex | Pay-per-use | If already on AWS |
| **NextAuth.js** | ⚠️ Manual | ✅ | ⚠️ DIY | Free | Already in codebase |

### Recommendation: **Clerk**

**Reasons:**
1. Modern React SDK with excellent DX
2. Built-in multi-tenant/organization support (perfect for agencies)
3. Enterprise SAML connections with simple admin UI
4. Pre-built components (SignIn, UserButton, etc.)
5. Handles session management, JWT, refresh automatically
6. Supports "Log in with Allstate" button configuration

---

## Implementation Phases

### Phase 1: Auth Broker Setup (Week 1-2)

**Goal:** Add Clerk as authentication layer alongside existing PIN system

#### 1.1 Install Clerk

```bash
npm install @clerk/nextjs
```

#### 1.2 Environment Variables

```env
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

#### 1.3 Wrap App with ClerkProvider

```typescript
// src/app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

#### 1.4 Create Sign-In Page

```typescript
// src/app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
```

#### 1.5 Protect API Routes

```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/api/todos(.*)',
  '/api/agencies(.*)',
  '/api/goals(.*)',
  // ... other protected routes
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

#### 1.6 Feature Flag for Dual Auth

```typescript
// src/lib/featureFlags.ts
export const AUTH_FLAGS = {
  CLERK_ENABLED: process.env.NEXT_PUBLIC_CLERK_ENABLED === 'true',
  PIN_ENABLED: process.env.NEXT_PUBLIC_PIN_ENABLED !== 'false', // Default true
};
```

**Deliverables:**
- [ ] Clerk account created
- [ ] Clerk SDK installed and configured
- [ ] Sign-in/sign-up pages created
- [ ] API routes protected with Clerk middleware
- [ ] Feature flag for dual auth mode
- [ ] Existing PIN login still works

---

### Phase 2: User Migration (Week 2-3)

**Goal:** Link existing users to Clerk identities

#### 2.1 Database Schema Update

```sql
-- Migration: Add clerk_id to users table
ALTER TABLE users ADD COLUMN clerk_id TEXT UNIQUE;
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
```

#### 2.2 User Linking Logic

```typescript
// src/lib/auth/linkClerkUser.ts
export async function linkClerkUser(clerkUserId: string, email: string) {
  // Find existing user by email or name
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (existingUser) {
    // Link existing user to Clerk
    await supabase
      .from('users')
      .update({ clerk_id: clerkUserId })
      .eq('id', existingUser.id);
    return existingUser;
  }

  // Create new user
  const { data: newUser } = await supabase
    .from('users')
    .insert({
      name: email.split('@')[0],
      clerk_id: clerkUserId,
      color: getRandomColor(),
    })
    .select()
    .single();

  return newUser;
}
```

#### 2.3 Agency Membership via Clerk Organizations

Clerk has built-in Organizations feature that maps perfectly to agencies:

```typescript
// Clerk Organization = Agency
// Clerk Org Membership = agency_members
// Clerk Org Role = owner/manager/staff
```

**Deliverables:**
- [ ] Database migration for clerk_id
- [ ] User linking logic implemented
- [ ] Clerk Organizations configured for agencies
- [ ] Existing agency memberships migrated

---

### Phase 3: Allstate SAML Configuration (Week 3-4)

**Goal:** Configure SAML Enterprise Connection for Allstate IdP

#### 3.1 Enable Enterprise SSO in Clerk

1. Go to Clerk Dashboard → SSO Connections
2. Add SAML Connection
3. Name it "Allstate"
4. Configure:
   - **ACS URL:** `https://your-app.clerk.accounts.dev/v1/saml/acs`
   - **Entity ID:** `https://your-app.clerk.accounts.dev`

#### 3.2 Request Allstate IdP Metadata

During vendor onboarding, request from Allstate:
- IdP Metadata URL (XML)
- Or manual values:
  - IdP SSO URL
  - IdP Entity ID
  - X.509 Certificate

#### 3.3 Configure SAML in Clerk

```
Clerk Dashboard → SSO Connections → Allstate → Configuration
- Paste IdP Metadata URL
- Or manually enter:
  - IdP SSO URL: https://allstate.onelogin.com/trust/saml2/...
  - IdP Entity ID: https://allstate.onelogin.com/...
  - Certificate: [paste X.509 cert]
```

#### 3.4 Add "Log in with Allstate" Button

```typescript
// src/components/auth/AllstateLoginButton.tsx
import { useSignIn } from '@clerk/nextjs';

export function AllstateLoginButton() {
  const { signIn } = useSignIn();

  const handleAllstateLogin = async () => {
    await signIn.authenticateWithRedirect({
      strategy: 'saml',
      identifier: 'allstate', // SAML connection name
      redirectUrl: '/sso-callback',
      redirectUrlComplete: '/',
    });
  };

  return (
    <button
      onClick={handleAllstateLogin}
      className="flex items-center gap-2 bg-[#0033A0] text-white px-4 py-2 rounded"
    >
      <AllstateLogo className="w-5 h-5" />
      Log in with Allstate
    </button>
  );
}
```

**Deliverables:**
- [ ] SAML connection configured in Clerk
- [ ] Allstate IdP metadata obtained
- [ ] "Log in with Allstate" button implemented
- [ ] SSO callback page created
- [ ] Tested with Allstate sandbox (if available)

---

### Phase 4: Deprecate PIN Authentication (Week 4-5)

**Goal:** Remove PIN system after successful migration

#### 4.1 Disable PIN Registration

```typescript
// src/lib/featureFlags.ts
export const AUTH_FLAGS = {
  CLERK_ENABLED: true,
  PIN_ENABLED: false, // Disable PIN
  SHOW_MIGRATION_BANNER: true, // Prompt existing PIN users
};
```

#### 4.2 Migration Banner for PIN Users

```typescript
// src/components/auth/MigrationBanner.tsx
export function MigrationBanner() {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <p className="font-medium">PIN login is being retired</p>
      <p className="text-sm mt-1">
        Please link your account to Allstate SSO for continued access.
      </p>
      <AllstateLoginButton className="mt-2" />
    </div>
  );
}
```

#### 4.3 Cleanup Tasks

- [ ] Remove PIN hashing code
- [ ] Remove PIN input components
- [ ] Remove `pin_hash` column (after migration period)
- [ ] Remove lockout logic (Clerk handles this)
- [ ] Update documentation

**Deliverables:**
- [ ] PIN login disabled
- [ ] Migration banner shown to remaining PIN users
- [ ] All users migrated to Clerk/SAML
- [ ] Legacy auth code removed

---

### Phase 5: MyConnection Portal Integration (Optional)

**Goal:** Add app as tile in Allstate Gateway for captive agents

#### 5.1 IdP-Initiated SSO

Configure Clerk to accept IdP-initiated SAML assertions:

```
Clerk Dashboard → SSO Connections → Allstate → Advanced
- Enable "Allow IdP-initiated SSO"
- Set Default Redirect URL: /dashboard
```

#### 5.2 Deep Linking

Support deep links from MyConnection portal:

```typescript
// src/app/sso-callback/page.tsx
export default function SSOCallback() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  // After Clerk processes SAML, redirect to intended page
  return <RedirectToSignIn afterSignInUrl={redirectTo} />;
}
```

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1-2 | Auth Broker Setup | Clerk installed, dual auth working |
| 2-3 | User Migration | Users linked to Clerk, orgs configured |
| 3-4 | SAML Configuration | Allstate SSO working |
| 4-5 | PIN Deprecation | Legacy auth removed |
| 5+ | Portal Integration | MyConnection tile (if required) |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Allstate IdP metadata delayed | Keep PIN enabled as fallback |
| User confusion during migration | Clear communication, migration banner |
| Data loss during migration | clerk_id is additive, no destructive changes |
| Clerk downtime | Clerk has 99.99% SLA |
| Cost overruns | Monitor MAU, adjust plan as needed |

---

## Cost Estimate

| Item | Monthly Cost |
|------|-------------|
| Clerk Pro | $25 base |
| MAU (500 users) | ~$25 (first 1000 included) |
| SAML Enterprise | Included in Pro |
| **Total** | **~$50/month** |

---

## Testing Checklist

### Pre-Launch
- [ ] Clerk sign-in works in dev
- [ ] Existing PIN users can still log in
- [ ] New users can register via Clerk
- [ ] API routes protected by Clerk middleware
- [ ] Agency membership synced with Clerk Organizations

### SAML Testing
- [ ] SAML connection configured correctly
- [ ] "Log in with Allstate" redirects to IdP
- [ ] SAML assertion creates/links user
- [ ] Roles mapped correctly (owner/manager/staff)
- [ ] IdP-initiated SSO works (if required)

### Post-Launch
- [ ] All users migrated from PIN
- [ ] No PIN-related code remains
- [ ] Security audit passes
- [ ] Performance unchanged

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/app/layout.tsx` | Modify | Add ClerkProvider |
| `src/app/sign-in/[[...sign-in]]/page.tsx` | Create | Clerk sign-in page |
| `src/app/sign-up/[[...sign-up]]/page.tsx` | Create | Clerk sign-up page |
| `src/app/sso-callback/page.tsx` | Create | SSO callback handler |
| `src/middleware.ts` | Modify | Add Clerk middleware |
| `src/lib/auth/linkClerkUser.ts` | Create | User linking logic |
| `src/components/auth/AllstateLoginButton.tsx` | Create | SSO button |
| `src/components/auth/MigrationBanner.tsx` | Create | Migration prompt |
| `supabase/migrations/xxx_add_clerk_id.sql` | Create | Add clerk_id column |
| `src/lib/featureFlags.ts` | Modify | Add auth feature flags |

---

## Decision Points

### Before Starting

1. **Confirm Auth Broker choice** - Clerk vs Auth0 vs Cognito
2. **Confirm Allstate onboarding status** - When will IdP metadata be available?
3. **Confirm budget** - ~$50/month acceptable?

### During Implementation

1. **Week 2:** Decide if user migration needs manual intervention
2. **Week 3:** Confirm SAML configuration with Allstate IT
3. **Week 4:** Set PIN deprecation date (recommend 30-day notice)

---

## References

- [Clerk SAML Documentation](https://clerk.com/docs/authentication/saml)
- [Clerk Organizations](https://clerk.com/docs/organizations/overview)
- [NextAuth.js to Clerk Migration](https://clerk.com/docs/migrations/nextauth)
- [Allstate ISSAS Standards](#) (request from Allstate IT)

---

**Document Version:** 1.0
**Owner:** Development Team
**Next Review:** After Phase 1 completion
