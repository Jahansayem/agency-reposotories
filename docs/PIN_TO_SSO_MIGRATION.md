# PIN to SSO Migration Plan

> **Migration Guide for Transitioning Existing PIN Users to Clerk SSO**
>
> Last Updated: 2026-02-04 | Status: Phase 1 (Dual-Auth) Active

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Migration Phases](#migration-phases)
   - [Phase 1: Dual-Auth (Current)](#phase-1-dual-auth-current)
   - [Phase 2: User Linking](#phase-2-user-linking)
   - [Phase 3: Gradual Migration](#phase-3-gradual-migration)
   - [Phase 4: PIN Deprecation](#phase-4-pin-deprecation)
4. [User Linking Logic](#user-linking-logic)
5. [Data Preservation](#data-preservation)
6. [Rollback Plan](#rollback-plan)
7. [Success Metrics](#success-metrics)
8. [Technical Implementation Details](#technical-implementation-details)
9. [Troubleshooting](#troubleshooting)

---

## Executive Summary

This document outlines the migration strategy for transitioning existing PIN-authenticated users to Clerk SSO (Allstate federated login). The migration is designed to be:

- **Zero-downtime**: Users can continue working throughout the migration
- **Non-disruptive**: No data loss, no forced password resets
- **Gradual**: Phased rollout with feature flags for control
- **Reversible**: Full rollback capability at each phase

### Key Goals

1. Link existing user accounts to their Allstate/Clerk identities
2. Preserve all task history, assignments, and activity logs
3. Enable enterprise SSO while maintaining backward compatibility
4. Eventually deprecate PIN authentication for improved security

### Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Dual-Auth | 2 weeks | **Active** |
| Phase 2: User Linking | 2-4 weeks | Planned |
| Phase 3: Gradual Migration | 4-6 weeks | Planned |
| Phase 4: PIN Deprecation | 2 weeks | Future |

---

## Current State Analysis

### Existing PIN Authentication System

**Users Table Schema:**
```sql
-- Current users table (simplified)
users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,        -- Display name (e.g., "Derrick")
  pin_hash TEXT,                     -- SHA-256 hash of 4-digit PIN
  color TEXT DEFAULT '#0033A0',     -- User avatar color
  created_at TIMESTAMP,
  last_login TIMESTAMP,
  -- New columns (added for SSO support):
  clerk_id TEXT UNIQUE,             -- Clerk user ID (NULL for PIN-only users)
  email TEXT UNIQUE                 -- Email (required for Clerk, optional for PIN)
)
```

**Current User Distribution:**
- Total Users: ~15-50 per agency
- PIN-only users: 100% (before migration)
- Email addresses stored: 0% (PIN system doesn't require email)

### Session Management

**Current Implementation:**
```typescript
// Session stored in HttpOnly cookie
interface StoredSession {
  userId: string;      // UUID from users table
  userName: string;    // Display name
  loginAt: string;     // ISO timestamp
  token: string;       // Session token hash
}

// Cookie: session_token (HttpOnly, Secure, SameSite=Strict)
```

**Session Validation Flow:**
1. Client sends `session_token` cookie with requests
2. Middleware validates token exists
3. API routes validate token against database via `sessionValidator.ts`
4. Session expires after 30 minutes of inactivity

### Known Limitations

1. **No Email Addresses**: PIN system doesn't collect emails, making automatic linking harder
2. **Name-Based Identification**: Users are identified by display name (e.g., "Derrick")
3. **SHA-256 PIN Hashing**: Less secure than modern algorithms (but acceptable for 4-digit PINs)
4. **Client-Side Hashing**: PIN is hashed in browser before transmission

---

## Migration Phases

### Phase 1: Dual-Auth (Current)

**Status:** Active as of 2026-02-04

**Objective:** Enable Clerk SSO alongside existing PIN authentication with no disruption.

#### Feature Flags

```typescript
// src/lib/featureFlags.ts
AUTH_CONFIG = {
  clerkEnabled: true,   // NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set
  pinEnabled: true,     // NEXT_PUBLIC_DISABLE_PIN_AUTH !== 'true'
  isDualAuthMode: true  // Both enabled simultaneously
}
```

**Environment Variables:**
```bash
# Clerk (enables SSO)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# PIN (still enabled by default)
# NEXT_PUBLIC_DISABLE_PIN_AUTH=true  # Uncomment to disable PIN auth
```

#### How Dual-Auth Works

```
┌─────────────────────────────────────────────────────────────┐
│                     User Visits App                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  Check Clerk Session First    │
              └───────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
     ┌─────────────────┐           ┌─────────────────┐
     │  Clerk Session  │           │  No Clerk       │
     │  Found (SSO)    │           │  Session        │
     └─────────────────┘           └─────────────────┘
              │                               │
              ▼                               ▼
     ┌─────────────────┐           ┌─────────────────┐
     │  Link/Create    │           │  Check PIN      │
     │  User Record    │           │  Session Cookie │
     └─────────────────┘           └─────────────────┘
              │                               │
              │                    ┌──────────┴──────────┐
              │                    │                     │
              ▼                    ▼                     ▼
     ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
     │   Logged In     │  │  PIN Session    │  │  Show Login     │
     │   (via Clerk)   │  │  Valid → In     │  │  Screen         │
     └─────────────────┘  └─────────────────┘  └─────────────────┘
```

#### Login Screen Behavior

During dual-auth mode, the login screen displays:
1. **User Card Grid**: Existing PIN users with avatar selection
2. **SSO Button**: "Sign in with Allstate" (Clerk-powered)
3. **PIN Entry**: Traditional 4-digit PIN for selected user

```typescript
// User can choose either method:
// 1. Click user card → Enter PIN → Login via PIN
// 2. Click "Sign in with Allstate" → Redirect to Clerk → SSO login
```

#### Verification Checklist

- [ ] Both PIN and SSO logins work independently
- [ ] New SSO users get accounts created automatically
- [ ] Existing PIN users can still login with PIN
- [ ] Session cookies are properly managed for both methods
- [ ] Middleware accepts both authentication types

---

### Phase 2: User Linking

**Status:** Planned

**Objective:** Connect existing PIN user accounts to their Clerk/Allstate identities.

#### Automatic Linking Triggers

1. **On SSO Login**: When a Clerk user logs in, attempt to match with existing account
2. **Via Webhook**: Clerk `user.created` webhook triggers linking logic
3. **Manual Admin Action**: Admin can link accounts via dashboard

#### Linking Strategies (Priority Order)

```typescript
// src/lib/auth/linkClerkUser.ts - Existing implementation

async function linkClerkUser(clerkData: ClerkUserData): Promise<LinkedUser> {
  // 1. Check if already linked (clerk_id exists)
  const existingClerkUser = await findByClerkId(clerkData.clerkUserId);
  if (existingClerkUser) return existingClerkUser;

  // 2. Try to match by email (most reliable)
  if (clerkData.email) {
    const emailMatch = await findByEmail(clerkData.email);
    if (emailMatch) {
      await linkToClerk(emailMatch.id, clerkData.clerkUserId);
      return emailMatch;
    }
  }

  // 3. Try to match by name (fuzzy matching)
  const nameMatch = await findByName(clerkData.firstName, clerkData.lastName);
  if (nameMatch) {
    // Requires confirmation before linking (see below)
    return await promptLinkConfirmation(nameMatch, clerkData);
  }

  // 4. Create new user if no match found
  return await createNewUser(clerkData);
}
```

#### Enhanced Name Matching

Since existing users don't have emails, name matching is crucial:

```typescript
// Proposed: src/lib/auth/nameMatching.ts

interface NameMatchResult {
  userId: string;
  confidence: 'high' | 'medium' | 'low';
  matchedOn: string;
  requiresConfirmation: boolean;
}

async function findUserByName(
  firstName: string | null,
  lastName: string | null
): Promise<NameMatchResult | null> {
  const searchName = firstName || '';

  // Direct match: "Derrick" === "Derrick"
  const directMatch = await supabase
    .from('users')
    .select()
    .ilike('name', searchName)
    .is('clerk_id', null)  // Only unlinked users
    .single();

  if (directMatch.data) {
    return {
      userId: directMatch.data.id,
      confidence: 'high',
      matchedOn: 'exact_name',
      requiresConfirmation: false
    };
  }

  // Fuzzy match: "Derrick B." matches "Derrick"
  const fuzzyMatches = await supabase
    .from('users')
    .select()
    .or(`name.ilike.${searchName}%,name.ilike.%${searchName}`)
    .is('clerk_id', null);

  if (fuzzyMatches.data?.length === 1) {
    return {
      userId: fuzzyMatches.data[0].id,
      confidence: 'medium',
      matchedOn: 'fuzzy_name',
      requiresConfirmation: true  // Requires user/admin confirmation
    };
  }

  // Multiple matches - requires manual resolution
  if (fuzzyMatches.data?.length > 1) {
    // Log for admin review
    console.log('Multiple name matches found:', fuzzyMatches.data.map(u => u.name));
    return null;  // Cannot auto-link
  }

  return null;
}
```

#### Conflict Resolution

When multiple users match or confidence is low:

```typescript
// Database table for pending links
CREATE TABLE pending_user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  clerk_email TEXT,
  clerk_name TEXT,
  potential_matches JSONB,  -- Array of {userId, name, confidence}
  status TEXT DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected' | 'new_user'
  resolved_by TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Admin Resolution UI:**
- Show pending links in admin dashboard
- Display Clerk user info alongside potential matches
- Allow admin to approve link, reject, or create new user

#### Migration Script

```typescript
// scripts/link-existing-users.ts

async function linkExistingUsers() {
  // Get all PIN-only users (no clerk_id)
  const { data: pinUsers } = await supabase
    .from('users')
    .select('*')
    .is('clerk_id', null);

  console.log(`Found ${pinUsers.length} PIN-only users to potentially link`);

  // Get all Clerk users from Clerk API
  const clerkUsers = await clerkClient.users.getUserList();

  for (const clerkUser of clerkUsers) {
    const match = await findBestMatch(clerkUser, pinUsers);

    if (match.confidence === 'high') {
      // Auto-link with high confidence
      await supabase
        .from('users')
        .update({
          clerk_id: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress
        })
        .eq('id', match.userId);

      console.log(`Linked: ${clerkUser.firstName} → ${match.userName}`);
    } else if (match.confidence === 'medium') {
      // Create pending link for admin review
      await supabase
        .from('pending_user_links')
        .insert({
          clerk_user_id: clerkUser.id,
          clerk_email: clerkUser.emailAddresses[0]?.emailAddress,
          clerk_name: `${clerkUser.firstName} ${clerkUser.lastName}`,
          potential_matches: [{ ...match }],
          status: 'pending'
        });

      console.log(`Pending review: ${clerkUser.firstName}`);
    }
  }
}
```

---

### Phase 3: Gradual Migration

**Status:** Planned

**Objective:** Encourage and track user migration from PIN to SSO.

#### User Communication

**Email Notification Template:**
```
Subject: New Login Method Available - Sign in with Allstate

Hi [User Name],

We've upgraded Bealer Agency Todo with Allstate Single Sign-On (SSO)!

What's New:
• Sign in with your Allstate credentials
• No more remembering your PIN
• More secure authentication

What You Need to Do:
1. Click "Sign in with Allstate" on the login page
2. Use your Allstate email and password
3. Your existing tasks and data are already linked!

Your PIN login will continue to work, but we recommend switching
to SSO for better security.

Questions? Reply to this email or contact your agency admin.

– The Bealer Agency Team
```

#### In-App Migration Prompt

```typescript
// Component: MigrationPrompt.tsx (shown to PIN-only users)

function MigrationPrompt({ user }: { user: User }) {
  const [dismissed, setDismissed] = useState(false);

  // Only show to PIN users who haven't linked
  if (user.clerk_id || dismissed) return null;

  return (
    <Banner type="info" onDismiss={() => setDismissed(true)}>
      <h3>Upgrade to Allstate SSO</h3>
      <p>
        Sign in with your Allstate credentials for better security.
        Your tasks and data will be preserved.
      </p>
      <Button onClick={startSSOLinking}>
        Link My Account
      </Button>
    </Banner>
  );
}
```

#### Migration Tracking

```sql
-- Add migration tracking columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  migration_prompted_at TIMESTAMP;

ALTER TABLE users ADD COLUMN IF NOT EXISTS
  migration_completed_at TIMESTAMP;

ALTER TABLE users ADD COLUMN IF NOT EXISTS
  pin_last_used_at TIMESTAMP;

-- Migration tracking view
CREATE VIEW migration_progress AS
SELECT
  agency_id,
  COUNT(*) as total_users,
  COUNT(clerk_id) as sso_users,
  COUNT(*) FILTER (WHERE clerk_id IS NULL) as pin_only_users,
  ROUND(COUNT(clerk_id)::numeric / COUNT(*) * 100, 1) as migration_percent
FROM users
JOIN agency_members ON users.id = agency_members.user_id
GROUP BY agency_id;
```

#### Progress Dashboard

```typescript
// API: GET /api/admin/migration-progress
{
  "summary": {
    "totalUsers": 47,
    "migratedToSSO": 32,
    "pinOnly": 15,
    "percentComplete": 68.1
  },
  "byAgency": [
    { "agencyId": "...", "name": "Main Office", "migrated": 12, "total": 15 },
    { "agencyId": "...", "name": "Branch 1", "migrated": 10, "total": 12 }
  ],
  "recentMigrations": [
    { "userName": "Derrick", "migratedAt": "2026-02-04T10:30:00Z" }
  ],
  "pinOnlyUsers": [
    { "id": "...", "name": "Sarah", "lastLogin": "2026-02-03T15:00:00Z" }
  ]
}
```

---

### Phase 4: PIN Deprecation

**Status:** Future (after 80%+ migration)

**Objective:** Disable PIN authentication and clean up legacy code.

#### Deprecation Steps

1. **Soft Deprecation** (Week 1-2)
   - Set `NEXT_PUBLIC_DISABLE_PIN_AUTH=true`
   - PIN login shows deprecation notice
   - Redirect to SSO with "PIN is being retired" message

2. **Hard Deprecation** (Week 3-4)
   - Remove PIN login UI completely
   - PIN API endpoint returns 410 Gone
   - All users must use SSO

3. **Code Cleanup** (Post-migration)
   - Remove `pin_hash` column (optional, can keep for audit)
   - Remove PIN-related components and utilities
   - Archive `LoginScreen.tsx` PIN logic

#### Environment Variables for Deprecation

```bash
# Phase 4a: Soft deprecation (PIN works but shows warning)
NEXT_PUBLIC_DEPRECATE_PIN_AUTH=true

# Phase 4b: Hard deprecation (PIN disabled completely)
NEXT_PUBLIC_DISABLE_PIN_AUTH=true
```

#### Deprecation UI

```typescript
// When DEPRECATE_PIN_AUTH=true but not DISABLE_PIN_AUTH

function DeprecatedPinLogin() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <h3 className="font-semibold text-amber-800">
        PIN Login is Being Retired
      </h3>
      <p className="text-amber-700 mt-2">
        Please switch to "Sign in with Allstate" for continued access.
        PIN login will be disabled on [DATE].
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="primary" onClick={redirectToSSO}>
          Sign in with Allstate
        </Button>
        <Button variant="ghost" onClick={continueWithPin}>
          Continue with PIN (not recommended)
        </Button>
      </div>
    </div>
  );
}
```

#### Fallback for Unlinked Users

For users who never migrated:

```typescript
// When PIN is disabled but user has no clerk_id
if (!user.clerk_id && AUTH_CONFIG.isClerkOnly) {
  return (
    <AccountRecoveryFlow
      userId={user.id}
      userName={user.name}
      onRecovery={linkToClerk}
    />
  );
}

// AccountRecoveryFlow:
// 1. User enters their Allstate email
// 2. We send a verification email
// 3. User clicks link to confirm identity
// 4. Account is linked to their Clerk identity
```

---

## User Linking Logic

### Matching Priority

1. **Clerk ID** (100% confidence) - Already linked
2. **Email** (95% confidence) - Reliable if email exists
3. **Exact Name** (80% confidence) - Direct match on display name
4. **Fuzzy Name** (50% confidence) - Partial/similar name match
5. **No Match** (0%) - Create new user or manual link

### Matching Algorithm

```typescript
// src/lib/auth/userLinking.ts

interface LinkingResult {
  action: 'linked' | 'created' | 'pending_review' | 'conflict';
  userId?: string;
  confidence: number;
  matchMethod?: string;
  conflicts?: User[];
}

export async function findAndLinkUser(
  clerkUser: ClerkUser
): Promise<LinkingResult> {
  // Step 1: Already linked?
  const existing = await findByClerkId(clerkUser.id);
  if (existing) {
    return { action: 'linked', userId: existing.id, confidence: 1.0 };
  }

  // Step 2: Email match
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (email) {
    const emailMatch = await findByEmail(email);
    if (emailMatch && !emailMatch.clerk_id) {
      await linkUserToClerk(emailMatch.id, clerkUser.id, email);
      return {
        action: 'linked',
        userId: emailMatch.id,
        confidence: 0.95,
        matchMethod: 'email'
      };
    }
  }

  // Step 3: Name matching
  const firstName = clerkUser.firstName || '';
  const lastName = clerkUser.lastName || '';

  // Exact match
  const exactMatch = await findByExactName(firstName);
  if (exactMatch && !exactMatch.clerk_id) {
    await linkUserToClerk(exactMatch.id, clerkUser.id, email);
    return {
      action: 'linked',
      userId: exactMatch.id,
      confidence: 0.80,
      matchMethod: 'exact_name'
    };
  }

  // Fuzzy match (requires confirmation)
  const fuzzyMatches = await findByFuzzyName(firstName, lastName);
  if (fuzzyMatches.length === 1) {
    // Single fuzzy match - create pending link
    await createPendingLink(clerkUser.id, fuzzyMatches[0].id, 'fuzzy_name');
    return {
      action: 'pending_review',
      userId: fuzzyMatches[0].id,
      confidence: 0.50,
      matchMethod: 'fuzzy_name'
    };
  }

  if (fuzzyMatches.length > 1) {
    // Multiple matches - conflict
    await createPendingLink(clerkUser.id, null, 'conflict', fuzzyMatches);
    return {
      action: 'conflict',
      confidence: 0.0,
      conflicts: fuzzyMatches
    };
  }

  // Step 4: No match - create new user
  const newUser = await createUserFromClerk(clerkUser);
  return {
    action: 'created',
    userId: newUser.id,
    confidence: 1.0
  };
}
```

### Manual Linking (Admin Panel)

```typescript
// API: POST /api/admin/link-user
interface ManualLinkRequest {
  clerkUserId: string;
  targetUserId: string;  // Existing user to link
  adminUserId: string;   // Who's performing the action
}

async function manuallyLinkUser(req: ManualLinkRequest) {
  // Verify admin permissions
  const admin = await getUser(req.adminUserId);
  if (!isOwner(admin) && !isManager(admin)) {
    throw new Error('Unauthorized');
  }

  // Verify target user exists and isn't already linked
  const targetUser = await getUser(req.targetUserId);
  if (!targetUser) throw new Error('User not found');
  if (targetUser.clerk_id) throw new Error('User already linked');

  // Perform the link
  await supabase
    .from('users')
    .update({ clerk_id: req.clerkUserId })
    .eq('id', req.targetUserId);

  // Log the action
  await logActivity({
    action: 'user_linked_to_sso',
    user_name: admin.name,
    details: {
      targetUser: targetUser.name,
      clerkUserId: req.clerkUserId,
      linkedBy: admin.name
    }
  });

  return { success: true };
}
```

---

## Data Preservation

### Guaranteed Preservation

The following data is **guaranteed** to be preserved during migration:

| Data Type | Storage | Preservation Method |
|-----------|---------|---------------------|
| Tasks (todos) | `todos.created_by`, `todos.assigned_to` | Name-based, no change needed |
| Task History | `todo_versions` | Linked to `todo_id`, preserved |
| Chat Messages | `messages.created_by` | Name-based, no change needed |
| Activity Log | `activity_log.user_name` | Name-based, no change needed |
| Attachments | `todos.attachments` JSONB | Linked to task, preserved |
| Goals | `strategic_goals.created_by` | Name-based, preserved |

### Why Data is Safe

1. **Name-Based References**: Most data uses `user_name` (string), not `user_id` (UUID)
2. **Display Name Preserved**: Clerk linking updates `clerk_id`, not `name`
3. **No Cascade Deletes**: User accounts are never deleted, only linked
4. **Dual-Write Compatible**: Both PIN and SSO write to same data tables

### Migration Data Integrity Checks

```sql
-- Pre-migration check: Verify no orphaned data
SELECT
  'todos' as table_name,
  COUNT(*) as orphaned_count
FROM todos t
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.name = t.created_by)

UNION ALL

SELECT
  'messages',
  COUNT(*)
FROM messages m
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.name = m.created_by)

UNION ALL

SELECT
  'activity_log',
  COUNT(*)
FROM activity_log a
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.name = a.user_name);

-- Post-migration check: Verify all users accessible
SELECT
  u.name,
  u.clerk_id IS NOT NULL as has_sso,
  u.pin_hash IS NOT NULL as has_pin,
  COUNT(DISTINCT t.id) as task_count,
  COUNT(DISTINCT m.id) as message_count
FROM users u
LEFT JOIN todos t ON t.created_by = u.name
LEFT JOIN messages m ON m.created_by = u.name
GROUP BY u.id, u.name, u.clerk_id, u.pin_hash;
```

---

## Rollback Plan

### Rollback Triggers

Initiate rollback if:
- SSO login success rate drops below 90%
- More than 5% of users report access issues
- Critical security vulnerability in Clerk integration
- Clerk service outage lasting > 4 hours

### Rollback Procedures

#### Level 1: Soft Rollback (Prefer PIN)

```bash
# .env changes
NEXT_PUBLIC_PREFER_PIN_AUTH=true  # Show PIN option more prominently
```

Users can still use SSO, but PIN is promoted.

#### Level 2: Disable SSO (Emergency)

```bash
# .env changes
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=  # Remove Clerk key
# Or set to empty string
```

This immediately:
- Disables all Clerk authentication
- Falls back to PIN-only mode
- Preserves all user data (clerk_id remains in database)

#### Level 3: Full Rollback (Code Revert)

```bash
# If code changes caused issues
git revert HEAD~N  # Revert to pre-migration commit
npm run build
npm run deploy
```

### Rollback Checklist

- [ ] Identify rollback level needed (1, 2, or 3)
- [ ] Notify users via in-app banner
- [ ] Update environment variables
- [ ] Verify PIN login works for all users
- [ ] Monitor login success rates for 24 hours
- [ ] Document rollback reason for post-mortem

### Data After Rollback

After rollback:
- `clerk_id` values remain in database (harmless)
- Users created via SSO can use PIN reset flow
- No data loss occurs

---

## Success Metrics

### Key Performance Indicators (KPIs)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Migration Rate | 80% within 30 days | % users with `clerk_id` set |
| SSO Login Success | 99.5% | Successful SSO logins / attempts |
| PIN Deprecation | 100% by Phase 4 | % users migrated |
| Support Tickets | < 5% increase | Migration-related tickets |
| Average Login Time | < 5 seconds | Time from click to dashboard |

### Monitoring Dashboard

```sql
-- Daily migration metrics
SELECT
  DATE(u.migration_completed_at) as date,
  COUNT(*) as daily_migrations,
  SUM(COUNT(*)) OVER (ORDER BY DATE(u.migration_completed_at)) as cumulative
FROM users u
WHERE u.clerk_id IS NOT NULL
GROUP BY DATE(u.migration_completed_at)
ORDER BY date DESC
LIMIT 30;

-- Login method distribution (last 7 days)
SELECT
  DATE(created_at) as date,
  auth_method,
  COUNT(*) as logins
FROM login_audit_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), auth_method
ORDER BY date DESC, auth_method;
```

### Success Criteria by Phase

| Phase | Success Criteria |
|-------|------------------|
| Phase 1 | Both auth methods work, 0 data loss |
| Phase 2 | 90% of SSO users auto-linked correctly |
| Phase 3 | 80% migration rate achieved |
| Phase 4 | 100% on SSO, PIN safely deprecated |

---

## Technical Implementation Details

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/auth/linkClerkUser.ts` | Core user linking logic |
| `src/lib/auth/dualAuth.ts` | Dual authentication validator |
| `src/lib/featureFlags.ts` | Auth configuration (AUTH_CONFIG) |
| `src/middleware.ts` | Authentication middleware |
| `src/app/api/webhooks/clerk/route.ts` | Clerk webhook handler |
| `supabase/migrations/20260204_add_clerk_id.sql` | Database schema |

### Environment Variables

```bash
# Required for SSO
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# Optional configuration
NEXT_PUBLIC_DISABLE_PIN_AUTH=true       # Disable PIN completely
NEXT_PUBLIC_DEPRECATE_PIN_AUTH=true     # Show deprecation warning
NEXT_PUBLIC_PREFER_PIN_AUTH=true        # Prefer PIN in UI (rollback)
```

### Webhook Configuration

Configure in Clerk Dashboard:
- Endpoint: `https://your-domain.com/api/webhooks/clerk`
- Events:
  - `user.created` - Link or create user
  - `user.updated` - Sync profile changes
  - `user.deleted` - Log deletion (no action)

### Database Schema

```sql
-- Migration: 20260204_add_clerk_id.sql

-- Add SSO columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id) WHERE clerk_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Migration tracking (optional)
ALTER TABLE users ADD COLUMN IF NOT EXISTS migration_prompted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS migration_completed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_last_used_at TIMESTAMP;
```

---

## Troubleshooting

### Common Issues

#### 1. SSO User Can't See Their Tasks

**Symptom:** User logs in via SSO but sees empty task list.

**Cause:** User was created as new instead of linked to existing account.

**Solution:**
```sql
-- Find the duplicate accounts
SELECT * FROM users WHERE name ILIKE '%username%';

-- Manual link (replace IDs)
UPDATE users
SET clerk_id = 'clerk_user_id_here'
WHERE id = 'correct_pin_user_id_here';

-- Delete the duplicate SSO-only account
DELETE FROM users WHERE id = 'duplicate_sso_user_id';
```

#### 2. PIN Login Fails After Migration

**Symptom:** Existing PIN user can't log in with PIN.

**Cause:** Unlikely unless `pin_hash` was cleared.

**Solution:**
```sql
-- Check if pin_hash exists
SELECT id, name, pin_hash IS NOT NULL as has_pin
FROM users WHERE name = 'Username';

-- Reset PIN if needed (user must set new PIN)
-- This should be done through the app, not SQL
```

#### 3. Webhook Events Not Processing

**Symptom:** New SSO users not appearing in database.

**Cause:** Webhook secret mismatch or network issue.

**Solution:**
1. Check Railway/Vercel logs for webhook errors
2. Verify `CLERK_WEBHOOK_SECRET` matches Clerk Dashboard
3. Test webhook manually:
```bash
curl -X POST https://your-domain.com/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -d '{"type":"user.created","data":{...}}'
```

#### 4. Multiple Users With Same Name

**Symptom:** Name matching fails or links to wrong user.

**Cause:** Non-unique display names.

**Solution:**
```sql
-- Find duplicates
SELECT name, COUNT(*) FROM users GROUP BY name HAVING COUNT(*) > 1;

-- Differentiate names
UPDATE users SET name = 'Derrick B.' WHERE id = 'specific-uuid';
```

### Debug Commands

```bash
# Check feature flags
curl https://your-domain.com/api/debug/feature-flags

# Test Clerk connection
curl https://your-domain.com/api/debug/clerk-status

# View pending links
curl https://your-domain.com/api/admin/pending-links

# Migration progress
curl https://your-domain.com/api/admin/migration-progress
```

### Support Escalation

For issues not covered above:
1. Check Clerk Dashboard for authentication logs
2. Review Railway logs for server errors
3. Query `activity_log` for user actions
4. Contact Clerk support for SSO-specific issues

---

## Appendix

### Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Main developer guide
- [docs/MULTI_TENANCY_EXECUTION_PLAN.md](./MULTI_TENANCY_EXECUTION_PLAN.md) - Agency architecture
- [REFACTORING_PLAN.md](../REFACTORING_PLAN.md) - Overall improvement roadmap
- [docs/ALLSTATE_SECURITY_CHECKLIST.md](./ALLSTATE_SECURITY_CHECKLIST.md) - Security compliance

### Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-04 | 1.0 | Initial migration plan |

### Contributors

- Engineering Team
- Security Review: Pending
- Product Approval: Pending

---

**Document Status:** Draft
**Last Review:** 2026-02-04
**Next Review:** Before Phase 2 Launch
