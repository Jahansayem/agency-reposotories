# Multi-Tenancy Execution Plan

> **Status:** Planning Complete | **Created:** 2026-02-01 | **Phases:** 6
> **Context:** This plan enables 5,000+ Allstate agencies with owner/manager/staff role hierarchy, invitation-based onboarding, and full data isolation.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Assessment](#current-state-assessment)
3. [Phase Dependencies](#phase-dependencies)
4. [Phase 1: Database & Type Foundation](#phase-1-database--type-foundation)
5. [Phase 2: Auth Plumbing](#phase-2-auth-plumbing)
6. [Phase 3: API Route Hardening](#phase-3-api-route-hardening)
7. [Phase 4: Frontend Permission Migration](#phase-4-frontend-permission-migration)
8. [Phase 5: Onboarding & Invitations](#phase-5-onboarding--invitations)
9. [Phase 6: Polish & Email](#phase-6-polish--email)
10. [Complete File Inventory](#complete-file-inventory)
11. [API Route Inventory (42 Routes)](#api-route-inventory-42-routes)
12. [Hardcoded Name Checks to Remove](#hardcoded-name-checks-to-remove)
13. [New Permission Flags (20 Total)](#new-permission-flags-20-total)
14. [Migration SQL Reference](#migration-sql-reference)
15. [Verification Checklists](#verification-checklists)

---

## Executive Summary

The multi-tenancy system is **~70% built, 0% operational**. Database tables, RLS policies, auth wrappers (`withAgencyAuth`), and the `AgencyContext` all exist but are disconnected. Five core problems must be solved:

1. **RLS is neutralized** -- v3 policies with `ELSE true` fallbacks override agency-scoped policies (Postgres OR's same-command policies)
2. **`currentUser.current_agency_role` is never populated** -- every `isOwner()` call falls through to `name === 'Derrick'`
3. **14 API routes have zero authentication** including `todos/reorder`, `push-notifications/send`, all 7 AI routes, and 2 debug endpoints
4. **Zero routes use agency_id filtering** (except `/api/agencies/[agencyId]/members`)
5. **No way to create invitations** -- the `/join/[token]` page exists but nothing creates tokens

---

## Current State Assessment

### What Exists (Built but Disconnected)

| Layer | Status | Details |
|-------|--------|---------|
| **Database schema** | 90% complete | `agencies`, `agency_members`, `agency_invitations` tables; `agency_id` FK on `todos`, `messages`, `activity_log`, `strategic_goals`, `task_templates`, `goal_categories` |
| **RLS policies** | Built but broken | v3 policies (`rls_*`) have `ELSE true` fallbacks. Agency policies exist but are overridden. `set_request_context()` RPC exists but is never called. |
| **Auth wrappers** | Built but unused | `withAgencyAuth`, `withAgencyAdminAuth`, `withAgencyOwnerAuth`, `verifyAgencyAccess`, `getAgencyScope`, `setAgencyContext` all exist in `src/lib/agencyAuth.ts` |
| **AgencyContext** | Built, partially consumed | Provides `hasPermission()`, `isAgencyOwner`, `isAgencyAdmin`, `currentRole`, `currentPermissions`. Only used by AgencySwitcher/AgencyMembersModal. |
| **Join page** | Built, no feeder | `/join/[token]` page validates tokens and accepts invitations. Nothing creates invitations. |
| **Invitation table** | Built, empty | `agency_invitations` with token, email, 7-day expiry, `accept_agency_invitation()` Postgres function |

### What's Missing

- Invitation CRUD API routes
- Self-service agency creation (blocked by `creator.name === 'Derrick'` guard)
- `agencyId` in session validator chain
- Agency scoping on all 42 API routes
- Frontend `usePermission` hook and `PermissionGate` component
- Email delivery capability (no sendgrid/resend/nodemailer)
- Server-side registration endpoint (currently client-side Supabase insert)

### The RLS Problem Explained

Two migration files create conflicting policies on the same tables:

**`20260108_fix_all_security_warnings_v3.sql`** -- Creates `rls_todos_select`, `rls_todos_insert`, etc. These check `rls_enabled()` (which reads `app.enable_rls`, defaults to `false`). When false, every policy evaluates to `ELSE true` = **fully permissive**.

**`20260126_multi_tenancy.sql`** -- Creates `todos_select_agency`, `todos_insert_agency`, etc. These check `current_agency_id()` and `user_agency_ids()`.

**The conflict:** PostgreSQL evaluates same-command policies with OR logic. Since the v3 policies always return `true` (via `ELSE true`), they override the agency policies completely. **Both policy sets exist simultaneously and the v3 set wins.**

### The `isOwner()` Fallback Chain

```
isOwner(currentUser)
  └─> check currentUser.current_agency_role === 'owner'  → NEVER SET (undefined)
       └─> check currentUser.role === 'owner'            → only if users.role = 'owner'
            └─> check currentUser.name === 'Derrick'     → ALWAYS REACHED as fallback
```

This means Derrick is always owner, nobody else can be.

---

## Phase Dependencies

```
Phase 1 (DB + Types)           ← Foundation, blocks everything
    ├──> Phase 2 (Auth Plumbing)    ← Threads agencyId through auth chain
    │       ├──> Phase 3 (API Route Hardening)    ← Closes auth gaps, adds agency filtering
    │       └──> Phase 4 (Frontend Permissions)   ← Replaces isOwner/isAdmin with permission hooks
    └──> Phase 5 (Onboarding + Invitations)       ← Self-service agency creation + team invitations
              └──> Phase 6 (Polish + Email)       ← Resend integration, verification
```

Phases 3 and 4 can run in parallel after Phase 2.
Phase 5 depends only on Phase 1 (role types) and can run in parallel with Phases 3-4.

---

## Agent Orchestration Plan

### Available Agent Types

| Agent | Capabilities | Tools | Best For |
|-------|-------------|-------|----------|
| **general-purpose** | Full tool access, multi-step autonomous work | Read, Write, Edit, Grep, Glob, Bash, Web | Writing code, implementing features, fixing bugs across multiple files |
| **Bash** | Command execution | Bash only | Running migrations, builds, tests, git operations |
| **Explore** | Fast codebase search and analysis | Read, Grep, Glob (no write) | Finding files, understanding patterns, pre-implementation research |
| **Plan** | Architecture design, implementation planning | Read, Grep, Glob (no write) | Designing approaches, reviewing code, identifying dependencies |

### Phase 0: Prerequisites (Sequential — 1 agent)

**Agent:** 1x general-purpose
**Why sequential:** These are small, interconnected SQL fixes that must be tested together.

```
general-purpose Agent A:
  1. Fix set_request_context() is_local → true
  2. Fix agency_role type cast in seed migration
  3. Fix accept_agency_invitation demotion bug
  4. Add covering indexes
  5. Define apiErrorResponse() helper + type
```

### Phase 1: Database & Type Foundation (2 agents in parallel)

```
general-purpose Agent A (Database):        general-purpose Agent B (TypeScript):
  1A. Write reconcile RLS migration           1E. Update AgencyRole type
      - Drop correct v3 policies              1E. Expand AgencyPermissions to 20 fields
      - Create agency policies for            1E. Update DEFAULT_PERMISSIONS
        activity_log, task_templates,         1E. Update UserRole, delete OWNER_USERNAME
        goal_categories                       1E. Add apiErrorResponse() to shared location
      - Scoped user SELECT policy
  1B. Write role migration SQL
      - Include auth.is_admin() update
  1C. Write permissions expansion SQL
  1D. Add current_agency_id to sessions
      + update validate_session_token RPC

  ──── SYNC POINT: Both complete ────
  Bash Agent: Run migrations in test env
```

**Interaction:** Agent B's type changes must match Agent A's SQL constraints. Agent A should output the exact role values and permission field names so Agent B uses identical strings.

### Phase 2: Auth Plumbing (2 agents in parallel)

```
general-purpose Agent A (Backend):         general-purpose Agent B (Frontend):
  2A. sessionValidator.ts                    2D. Create UserContext (above AgencyProvider)
      - Add agencyId from session            2D. Create usePermission hook
      - Update fallback query path           2D. Create useRoleCheck hook
  2B. login/route.ts                         2D. Create PermissionGate component
      - Default agency lookup                2D. Fix AgencyContext.hasPermission()
      - Handle no-membership edge case           non-multi-tenancy fallback
  2C. apiAuth.ts
      - Return agencyId
      - Create agencyScopedQuery helper
      - Update verifyTodoAccess

  ──── SYNC POINT: Both complete ────
```

**Interaction:** Agent B's `usePermission` hook consumes the permission type that Phase 1E defined. Agent A's `extractAndValidateUserName()` return type change affects how Phase 3 routes consume it — no direct dependency on Agent B.

### Phase 3: API Route Hardening (3 agents in parallel)

This is the largest phase with 42 routes. Split by route category:

```
general-purpose Agent A:          general-purpose Agent B:          general-purpose Agent C:
  3A. Zero-auth routes (6):         3C-1. Data routes (10):           3C-2. Remaining routes (8):
      - Delete debug endpoints        - /api/todos (CRUD)              - /api/goals (CRUD)
      - todos/reorder                 - /api/activity                  - /api/goals/categories
      - push-notifications/send       - /api/templates                 - /api/goals/milestones
      - /api/agencies GET/POST        - /api/attachments               - /api/reminders
                                      - /api/patterns/*                - /api/push-send
  3B. AI routes (8):                  - /api/digest/latest             - /api/push-subscribe
      - Create withSessionAuth                                         - /api/todos/waiting
      - Apply to all 8 AI routes    3D. System/cron routes (3):        - /api/todos/check-waiting
                                      - reminders/process
                                      - digest/generate
                                      - Create withSystemAuth

  ──── SYNC POINT: All 3 complete ────
  Bash Agent: npm run build + verify no type errors
  Bash Agent: Run API auth tests
```

**Interaction:** All 3 agents import from the same `agencyAuth.ts` and `apiAuth.ts`. Agent A creates `withSessionAuth`. Agents B and C use `withAgencyAuth` and `agencyScopedQuery` from Phase 2. No cross-agent file conflicts since each touches different route files.

### Phase 4: Frontend Permission Migration (2 agents in parallel)

```
general-purpose Agent A (Components):      general-purpose Agent B (Data/State):
  4A. Navigation gating (5 components)       4C. Staff data scoping in useTodoData
  4B. Feature-level gates (7 components)     4C. Real-time event handler filtering
  4D. Role display updates (7 components)    4C. Agency-switch state reset
  4E. Legacy code cleanup                        (Zustand resetStore, component keys)
      - Delete isOwner/isAdmin imports       Rename TemplatePicker.isOwner
      - Remove OWNER_USERNAME
      - Remove hardcoded name arrays

  ──── SYNC POINT: Both complete ────
  Bash Agent: npm run build
```

**Interaction:** Agent A removes `isOwner()` imports that Agent B's files may also import. Agent A should complete the removal from `types/todo.ts` first; Agent B should not touch that file. Both agents touch different component files.

### Phase 5: Onboarding & Invitations (2 agents in parallel)

```
general-purpose Agent A (API):             general-purpose Agent B (UI):
  5A. /api/auth/register                     5B. InvitationForm component
  5A. /api/agencies/[id]/invitations         5B. PendingInvitationsList component
  5A. /api/invitations/validate              5B. OnboardingWizard component
  5A. /api/invitations/accept                5B. InviteCodeInput component
  5C. Remove creator name guard              5B. Modify AgencyMembersModal
                                             5B. Modify LoginScreen
                                             5B. Modify join/[token]/page.tsx

  ──── Agent B starts after Agent A's API routes exist ────
```

**Interaction:** Agent B's UI components call Agent A's API endpoints. Agent A should complete the route implementations first. Agent B can start on component scaffolding/UI in parallel but needs the API response shapes from Agent A for integration.

### Phase 6: Polish (1 agent)

```
general-purpose Agent A:
  6A. Email integration (Resend)
  6B. Error response standardization (retrofit existing routes)
  6C. Final verification

Bash Agent: Full build + E2E test suite
```

### Parallelism Summary

| Phase | Parallel Agents | Bottleneck |
|-------|----------------|------------|
| Phase 0 | 1 | Small scope, sequential fixes |
| Phase 1 | 2 (DB + TS) | Migration must run before Phase 2 |
| Phase 2 | 2 (Backend + Frontend) | Both needed before Phase 3/4 |
| Phase 3 | **3** (routes split by category) | Largest phase, max parallelism |
| Phase 4 | 2 (Components + Data/State) | isOwner removal is a shared dependency |
| Phase 5 | 2 (API → then UI) | UI depends on API shapes |
| Phase 6 | 1 | Final polish, must be sequential |

**Maximum concurrent agents across phases: 3** (during Phase 3).
**Total estimated agent dispatches: ~15** across all phases.

### Cross-Phase Sync Points

After each phase, run these verification steps before proceeding:

```
Phase 0 → Bash: Run migrations in test, verify set_request_context works
Phase 1 → Bash: npm run build (expect errors in consumers — that's Phase 2-4 work)
Phase 2 → Bash: npm run build (should compile), manual test login flow
Phase 3 → Bash: npm run build, curl all routes for 401 without session
Phase 4 → Bash: npm run build (zero errors), manual test permission gates
Phase 5 → Bash: npm run build, test registration + invitation flow
Phase 6 → Bash: Full E2E test suite
```

---

## Phase 1: Database & Type Foundation

**Goal:** Fix RLS conflicts, upgrade roles to owner/manager/staff, expand permissions to 20 flags, add agency context to sessions.

### 1A: Reconcile Conflicting RLS Policies

**New migration: `supabase/migrations/YYYYMMDD_reconcile_rls_policies.sql`**

Drop ALL v3 `rls_*` policies that conflict with the agency-scoped policies:
- `rls_todos_select`, `rls_todos_insert`, `rls_todos_update`, `rls_todos_delete`
- `rls_messages_select`, `rls_messages_insert`, `rls_messages_update`, `rls_messages_delete`
- `rls_goals_select`, `rls_goals_insert`, `rls_goals_update`, `rls_goals_delete`
- `rls_milestones_select`, `rls_milestones_insert`, `rls_milestones_update`, `rls_milestones_delete`

Keep the agency-scoped policies from `20260126_multi_tenancy.sql` as the sole policies.

**Why this is first:** Without this, no amount of agency policy work matters -- the v3 `ELSE true` fallbacks will always override.

### 1B: Role System Migration

**New migration: `supabase/migrations/YYYYMMDD_upgrade_roles.sql`**

```sql
-- Step 1: Widen constraints temporarily
ALTER TABLE agency_members DROP CONSTRAINT IF EXISTS agency_members_role_check;
ALTER TABLE agency_members ADD CONSTRAINT agency_members_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'member', 'staff'));

ALTER TABLE agency_invitations DROP CONSTRAINT IF EXISTS agency_invitations_role_check;
ALTER TABLE agency_invitations ADD CONSTRAINT agency_invitations_role_check
  CHECK (role IN ('admin', 'manager', 'member', 'staff'));

-- Step 2: Migrate data
UPDATE agency_members SET role = 'manager' WHERE role = 'admin';
UPDATE agency_members SET role = 'staff' WHERE role = 'member';
UPDATE agency_invitations SET role = 'manager' WHERE role = 'admin';
UPDATE agency_invitations SET role = 'staff' WHERE role = 'member';
UPDATE users SET role = 'manager' WHERE role = 'admin';
UPDATE users SET role = 'staff' WHERE role = 'member';

-- Step 3: Tighten constraints
ALTER TABLE agency_members DROP CONSTRAINT agency_members_role_check;
ALTER TABLE agency_members ADD CONSTRAINT agency_members_role_check
  CHECK (role IN ('owner', 'manager', 'staff'));

ALTER TABLE agency_invitations DROP CONSTRAINT agency_invitations_role_check;
ALTER TABLE agency_invitations ADD CONSTRAINT agency_invitations_role_check
  CHECK (role IN ('manager', 'staff'));

-- Step 4: Update RLS helper
CREATE OR REPLACE FUNCTION public.is_agency_admin(p_agency_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM agency_members
    WHERE agency_id = p_agency_id
      AND user_id = public.get_current_user_id()
      AND role IN ('owner', 'manager')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### 1C: Expand AgencyPermissions JSONB

Write all 20 permission flags to every existing `agency_members` row. See [New Permission Flags](#new-permission-flags-20-total) for the full matrix.

### 1D: Add `current_agency_id` to Sessions

```sql
ALTER TABLE user_sessions ADD COLUMN current_agency_id UUID REFERENCES agencies(id);
CREATE INDEX idx_sessions_agency ON user_sessions(current_agency_id);
```

### 1E: Type Definition Updates

**File: `src/types/agency.ts`**
- Change `AgencyRole` from `'owner' | 'admin' | 'member'` to `'owner' | 'manager' | 'staff'`
- Expand `AgencyPermissions` from 5 to 20 fields
- Update `DEFAULT_PERMISSIONS` for owner/manager/staff
- Update `isAgencyAdmin()` to check `'owner' | 'manager'`

**File: `src/types/todo.ts`**
- Change `UserRole` to `'owner' | 'manager' | 'staff'`
- **Delete** `OWNER_USERNAME = 'Derrick'` constant
- Remove name-based fallbacks from `isOwner()`, `isAdmin()`, `canViewStrategicGoals()`

### Phase 1 Verification
- [ ] Only agency-scoped RLS policies exist (no v3 `rls_*` policies)
- [ ] All `agency_members` rows have role = `owner`, `manager`, or `staff`
- [ ] All `agency_members` rows have 20-field permissions JSONB
- [ ] `user_sessions` has `current_agency_id` column
- [ ] TypeScript compiles with new types (expect errors in consuming code -- that's the todo list for later phases)

---

## Phase 2: Auth Plumbing

**Goal:** Thread agency context through the entire auth chain so every API route and frontend component can access it.

### 2A: Session Validator

**File: `src/lib/sessionValidator.ts`**

| Change | Details |
|--------|---------|
| `SessionValidationResult` interface | Add `agencyId?: string` |
| `validateSession()` fallback query path (lines 124-189) | Also select `current_agency_id` from `user_sessions`, return as `agencyId` |
| `SessionRpcResult` interface | Add `agency_id: string` |
| `createSession()` function (lines 217-256) | Accept `agencyId?: string` param, include `current_agency_id: agencyId` in insert |

### 2B: Login Flow

**File: `src/app/api/auth/login/route.ts`**

After successful PIN verification:
1. Query `agency_members` for user's default agency (`is_default_agency = true`)
2. Pass `agencyId` to `createSession()`
3. Return `agencies` array and `default_agency_id` in login response
4. Default role to `'staff'` instead of `'member'`

### 2C: API Auth

**File: `src/lib/apiAuth.ts`**

| Change | Details |
|--------|---------|
| `extractAndValidateUserName()` return type | Add `agencyId?: string` from `sessionResult.agencyId` |
| `verifyTodoAccess()` | Accept `agencyId` param, add `.eq('agency_id', agencyId)` to query |

### 2D: Frontend Permission Infrastructure

**New file: `src/hooks/usePermission.ts`**
```typescript
// Bridges AgencyContext (multi-tenancy) and legacy role (single-tenant)
function usePermission(permission: keyof AgencyPermissions): boolean
```

**New file: `src/hooks/useRoleCheck.ts`**
```typescript
// Role-level checks without name fallbacks
function useRoleCheck(): { isOwner: boolean; isManager: boolean; currentRole: AgencyRole | null }
```

**New file: `src/components/ui/PermissionGate.tsx`**
```tsx
// Declarative permission wrapper
<PermissionGate permission="can_view_strategic_goals">
  <StrategicGoalsButton />
</PermissionGate>
```

**Modified: `src/contexts/AgencyContext.tsx`**
- Fix `hasPermission()` to derive from `DEFAULT_PERMISSIONS[role]` when multi-tenancy is disabled (instead of returning `true` unconditionally)

### Phase 2 Verification
- [ ] `validateSession()` returns `agencyId` when session has one
- [ ] Login response includes `agencies` array
- [ ] `extractAndValidateUserName()` returns `agencyId`
- [ ] `verifyTodoAccess()` enforces agency boundary
- [ ] `usePermission('can_view_strategic_goals')` returns correct value for each role
- [ ] `PermissionGate` renders/hides children correctly

---

## Phase 3: API Route Hardening

**Goal:** Close auth gaps and add agency scoping to all 42 routes.

### 3A: Critical -- Close Zero-Auth Routes

**Priority 1 (immediate):**

| Route | Current Auth | Fix |
|-------|-------------|-----|
| `/api/debug/derrick-agencies` | **NONE** | **Delete entirely** |
| `/api/debug/feature-flags` | **NONE** | **Delete or gate behind admin auth** |
| `/api/todos/reorder` | **NONE** | Add `withAgencyAuth` + agency filter |
| `/api/push-notifications/send` | **NONE** | Add `withAgencyAuth` + restrict targets to same agency |
| `/api/agencies` GET | **NONE** | Add session auth, return only user's agencies |
| `/api/agencies` POST | Name check only | Remove `creator.name === 'Derrick'` guard, use session auth |

### 3B: Auth-Gate AI Routes

All 7 unauthenticated AI routes need session auth:

| Route | Fix |
|-------|-----|
| `/api/ai/smart-parse` | `withAgencyAuth` composed with `withAiErrorHandling` |
| `/api/ai/enhance-task` | Same |
| `/api/ai/breakdown-task` | Same |
| `/api/ai/generate-email` | Same |
| `/api/ai/translate-email` | Same |
| `/api/ai/parse-voicemail` | Same |
| `/api/ai/parse-content-to-subtasks` | Same |

**New helper in `src/lib/agencyAuth.ts`:**
```typescript
export function withAgencyAiAuth(
  component: string,
  handler: (request: NextRequest, ctx: AgencyAuthContext) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse>
```

### 3C: Agency_id Filtering on Data Routes

Convert all data routes to use `withAgencyAuth` wrapper + `.eq('agency_id', ctx.agencyId)`:

| Route | Methods | Key Change |
|-------|---------|------------|
| `/api/todos` | GET, POST, PUT, DELETE | Filter by agency; set `agency_id` on POST |
| `/api/activity` | GET, POST | Filter + set on insert |
| `/api/templates` | GET, POST, DELETE | Filter + set on insert |
| `/api/attachments` | POST, DELETE, GET | Filter via parent todo's agency |
| `/api/goals` | GET, POST, PUT, DELETE | Convert to `withAgencyOwnerAuth` + filter |
| `/api/goals/categories` | GET, POST | Filter by agency |
| `/api/goals/milestones` | GET, POST, PUT, DELETE | Filter via parent goal |
| `/api/reminders` | GET, POST, DELETE, PATCH | Filter by agency |
| `/api/todos/waiting` | POST, DELETE | Filter by agency |
| `/api/todos/reorder` | POST | Filter by agency |
| `/api/patterns/suggestions` | GET | Filter by agency |
| `/api/patterns/analyze` | POST | Convert to `withAgencyAdminAuth` + filter |
| `/api/digest/latest` | GET | Filter by agency |
| `/api/push-subscribe` | GET, POST, DELETE | Scope to user (already user-scoped) |
| `/api/push-send` | POST | Restrict targets to same agency |

### 3D: System/Cron Routes

| Route | Fix |
|-------|-----|
| `/api/outlook/users` | Filter users by agency (from request context) |
| `/api/outlook/create-task` | Set `agency_id` on created task |
| `/api/reminders/process` | Process per-agency or add agency to notification context |
| `/api/digest/generate` | Generate per-agency digests |
| `/api/todos/check-waiting` | Process per-agency |

### Phase 3 Verification
- [ ] Debug endpoints deleted/gated
- [ ] All AI routes return 401 without session
- [ ] `GET /api/todos` returns only current agency's tasks
- [ ] Cross-agency todo access returns 404
- [ ] Creating a todo sets `agency_id` from session
- [ ] Goals endpoints require owner role
- [ ] Push notifications restricted to same-agency targets

---

## Phase 4: Frontend Permission Migration

**Goal:** Replace all `isOwner()`/`isAdmin()` checks with permission-based gates.

### 4A: Navigation Gating (Highest Visibility)

| Component | File | Current Gate | New Gate |
|-----------|------|-------------|----------|
| `NavigationSidebar` | `src/components/layout/NavigationSidebar.tsx:260` | `isOwner(currentUser)` via `ownerOnly` flag | `usePermission('can_view_strategic_goals')` |
| `AppShell` mobile menu | `src/components/layout/AppShell.tsx:463` | `isOwner(currentUser)` | `usePermission('can_view_strategic_goals')` |
| `CommandPalette` | `src/components/layout/CommandPalette.tsx:122,195` | `ownerOnly: true` + `isOwner` | `permission` field on `CommandItem` |
| `UtilitySidebar` | `src/components/UtilitySidebar.tsx:329` | `checkIsOwner` | `usePermission('can_view_strategic_goals')` |
| `EnhancedBottomNav` | `src/components/layout/EnhancedBottomNav.tsx` | No gating at all | Hide restricted items per permission |

### 4B: Feature-Level Gates

| Component | File:Line | Current Gate | New Gate |
|-----------|-----------|-------------|----------|
| `TodoList` archive | `src/components/TodoList.tsx:82` | `['derrick', 'adrian'].includes(userName.toLowerCase())` | `usePermission('can_view_archive')` |
| `TodoList` strategic | `src/components/TodoList.tsx:1975` | `isOwner({ name: userName })` | `usePermission('can_view_strategic_goals')` |
| `TodoItem` delete | `src/components/TodoItem.tsx` | Always shown | Conditional on `can_delete_tasks` (or own task) |
| `BulkActionBar` delete | `src/components/todo/BulkActionBar.tsx` | No check | Disable if `!can_delete_tasks` |
| `TaskDetailPanel` delete | `src/components/layout/TaskDetailPanel.tsx` | No check | Conditional on `can_delete_tasks` |
| `ChatPanel` pin | `src/components/ChatPanel.tsx:240,1067` | No check | `usePermission('can_pin_messages')` |
| `SaveTemplateModal` | `src/components/SaveTemplateModal.tsx` | No check | `usePermission('can_manage_templates')` |

### 4C: Staff Data Scoping

When `!can_view_all_tasks` (staff role):

| Component | Scoping Change |
|-----------|---------------|
| `TodoList` / `useTodoData` | Filter to `created_by` OR `assigned_to` current user |
| `Dashboard` | Show only user's task stats; hide "team" cards |
| `ActivityFeed` | Show only activity for user's tasks |
| `KanbanBoard` | Same filter as TodoList |
| Quick filters | Default to "My Tasks"; hide "All Tasks" |

### 4D: Role Display Updates

All components that display role labels/icons/colors:

| Component | Changes |
|-----------|---------|
| `AgencySwitcher` | `admin` → `Manager` with Briefcase icon; `member` → `Staff` with User icon |
| `AgencyMembersModal` | Update role selector dropdown, role badges, switch/case blocks |
| `RegisterModal` | Default `role: 'staff'` instead of `'member'` |
| `LoginScreen` | Default `role: 'staff'` fallback |
| `UserSwitcher` | Default `role: 'staff'` fallback |
| `page.tsx` | Default `role: 'staff'` fallback |
| `join/[token]/page.tsx` | Update type from `'admin' | 'member'` to `'manager' | 'staff'` |

### 4E: Legacy Code Cleanup

Remove from `src/types/todo.ts`:
- `OWNER_USERNAME` constant
- `isOwner()` function
- `isAdmin()` function
- `canViewStrategicGoals()` function
- `ACTIVITY_FEED_USERS` and `FULL_VISIBILITY_USERS` arrays

Remove all `import { isOwner } from '@/types/todo'` across ~12 files.

Deprecate on `AuthUser` type:
- `current_agency_role` field (never populated)
- `current_agency_permissions` field (never populated)

### Phase 4 Verification
- [ ] Strategic Goals hidden for staff users
- [ ] Archive hidden for staff users
- [ ] Staff cannot delete others' tasks
- [ ] Staff sees only their own tasks in list/kanban
- [ ] Manager sees all tasks but cannot change agency settings
- [ ] No `'Derrick'` or `'adrian'` string literals remain in component code
- [ ] All `isOwner()` imports removed

---

## Phase 5: Onboarding & Invitations

**Goal:** Self-service agency creation and invitation-based team building.

### 5A: New API Routes

| # | Route | Method | Auth | Purpose |
|---|-------|--------|------|---------|
| 1 | `/api/auth/register` | POST | Public | Server-side registration (replaces client-side Supabase insert) |
| 2 | `/api/agencies/[agencyId]/invitations` | POST | Owner/Manager | Create invitation with crypto-random token |
| 3 | `/api/agencies/[agencyId]/invitations` | GET | Owner/Manager | List pending invitations |
| 4 | `/api/agencies/[agencyId]/invitations/[id]` | DELETE | Owner/Manager | Revoke invitation |
| 5 | `/api/invitations/validate` | POST | Public | Validate token (for join page) |
| 6 | `/api/invitations/accept` | POST | Public/Session | Accept invitation + optional registration |

#### Route Details

**`POST /api/auth/register`**
```
Request: { name, pin, email?, invitation_token?, create_agency?: { name, slug?, primary_color? } }
Response: { success, user: { id, name, color, role }, agency?: { id, name, slug } }
```
- Hash PIN server-side
- If `invitation_token` provided, accept invitation atomically
- If `create_agency` provided, create agency + assign as owner
- Set HttpOnly session cookie

**`POST /api/agencies/[agencyId]/invitations`**
```
Request: { email, role: 'manager' | 'staff', expires_in_days?: number }
Response: { success, invitation: { id, token, email, role, expires_at, invite_url } }
```
- Generate token: `crypto.randomBytes(32).toString('hex')`
- Check agency `max_users` limit
- Return `https://{domain}/join/{token}`

**`POST /api/invitations/validate`**
```
Request: { token }
Response: { valid, agency_name?, agency_color?, role?, email?, expires_at? }
```
- Public endpoint for join page
- Rate-limited to prevent token scanning

**`POST /api/invitations/accept`**
```
Request: { token, name?, pin?, is_new_user? }
Response: { success, agency: { id, name, slug }, role }
```
- Calls `accept_agency_invitation` Postgres function
- If `is_new_user`, creates user first
- Sets session cookie

### 5B: UI Changes

**New components:**
- `InvitationForm` -- in AgencyMembersModal, replaces direct "Add Member by name"
- `PendingInvitationsList` -- shows pending invitations with revoke button
- `OnboardingWizard` -- post-registration guided flow for new agency owners
- `InviteCodeInput` -- "Have an invite code?" section on LoginScreen

**Modified components:**

| Component | Changes |
|-----------|---------|
| `AgencyMembersModal` | Replace direct-add form with invitation flow; add pending invitations |
| `LoginScreen` | Add "Have an invite code?" input below OAuth buttons (~line 620) |
| `RegisterModal` | Call `/api/auth/register` instead of direct Supabase insert; support `invitation_token` prop |
| `join/[token]/page.tsx` | Replace direct Supabase queries with server-side API calls (`/api/invitations/validate`, `/api/invitations/accept`) |

### 5C: Self-Service Agency Creation

- Remove `creator.name === 'Derrick'` guard from `POST /api/agencies` (line 74 of `src/app/api/agencies/route.ts`)
- Any authenticated user can create an agency (with rate limit: max 5 per user)
- Add optional `create_agency` parameter to `/api/auth/register` for atomic register+create

### Phase 5 Verification
- [ ] New user can register → create agency → get invite link
- [ ] Invite link leads to `/join/{token}` → register → auto-join agency
- [ ] Existing user can accept invite to join second agency
- [ ] Agency switcher shows both agencies
- [ ] Revoking invitation invalidates the token immediately
- [ ] Expired tokens are rejected
- [ ] Rate limit prevents token brute-force

---

## Phase 6: Polish & Email

### 6A: Email Integration (Resend)

- `npm install resend`
- Create `src/lib/email.ts` with `sendInvitationEmail(to, agencyName, inviteUrl, role)`
- Integrate into invitation creation endpoint (non-blocking, fire-and-forget)
- Environment variable: `RESEND_API_KEY`
- Free tier: 100 emails/day; Paid: $20/month for 50K

Phase 1 works without email (shareable links). Most Allstate agencies are small teams where the owner can share a link directly.

### 6B: Error Response Standardization

Standardize all API error responses to:
```json
{ "success": false, "error": "<code>", "message": "<human-readable>" }
```

Currently the codebase uses at least 3 different shapes.

### 6C: Final Verification

- [ ] End-to-end: register → create agency → invite → accept → login → correct permissions
- [ ] Cross-agency isolation: user A cannot see agency B's data
- [ ] Staff scoping: staff cannot see other users' tasks
- [ ] Manager scoping: manager sees all tasks but cannot change agency settings
- [ ] Owner: full access to strategic goals, agency settings, billing
- [ ] `npm run build` passes with no TypeScript errors
- [ ] No `'Derrick'` or `'adrian'` string literals in any source file

---

## Complete File Inventory

### Files Modified Per Phase

#### Phase 1: Database & Types
| File | Change |
|------|--------|
| `supabase/migrations/new_reconcile_policies.sql` | **NEW** -- Drop v3 `rls_*` policies |
| `supabase/migrations/new_upgrade_roles.sql` | **NEW** -- Role migration + permissions expansion + session column |
| `src/types/agency.ts` | AgencyRole, AgencyPermissions (20 flags), DEFAULT_PERMISSIONS |
| `src/types/todo.ts` | UserRole, delete OWNER_USERNAME, remove name fallbacks |

#### Phase 2: Auth Plumbing
| File | Change |
|------|--------|
| `src/lib/sessionValidator.ts` | Add `agencyId` to validation result and `createSession()` |
| `src/app/api/auth/login/route.ts` | Look up default agency, return in response |
| `src/lib/apiAuth.ts` | Return `agencyId`, add to `verifyTodoAccess` |
| `src/hooks/usePermission.ts` | **NEW** -- Unified permission hook |
| `src/hooks/useRoleCheck.ts` | **NEW** -- Role check without name fallbacks |
| `src/components/ui/PermissionGate.tsx` | **NEW** -- Declarative permission wrapper |
| `src/contexts/AgencyContext.tsx` | Fix `hasPermission` non-multi-tenancy fallback |

#### Phase 3: API Routes
| File | Change |
|------|--------|
| `src/app/api/debug/derrick-agencies/route.ts` | **DELETE** |
| `src/app/api/debug/feature-flags/route.ts` | **DELETE or gate** |
| `src/app/api/todos/reorder/route.ts` | Add `withAgencyAuth` + agency filter |
| `src/app/api/push-notifications/send/route.ts` | Add auth + agency restriction |
| `src/app/api/agencies/route.ts` | Session auth on GET, remove name guard on POST |
| `src/app/api/ai/smart-parse/route.ts` | Add `withAgencyAiAuth` |
| `src/app/api/ai/enhance-task/route.ts` | Same |
| `src/app/api/ai/breakdown-task/route.ts` | Same |
| `src/app/api/ai/generate-email/route.ts` | Same |
| `src/app/api/ai/translate-email/route.ts` | Same |
| `src/app/api/ai/parse-voicemail/route.ts` | Same |
| `src/app/api/ai/parse-content-to-subtasks/route.ts` | Same |
| `src/app/api/todos/route.ts` | Agency scoping on all CRUD |
| `src/app/api/activity/route.ts` | Agency scoping |
| `src/app/api/templates/route.ts` | Agency scoping |
| `src/app/api/attachments/route.ts` | Agency scoping via parent todo |
| `src/app/api/goals/route.ts` | `withAgencyOwnerAuth` + agency filter |
| `src/app/api/goals/categories/route.ts` | Same |
| `src/app/api/goals/milestones/route.ts` | Same |
| `src/app/api/reminders/route.ts` | Agency scoping |
| `src/app/api/todos/waiting/route.ts` | Agency scoping |
| `src/app/api/patterns/suggestions/route.ts` | Agency scoping |
| `src/app/api/patterns/analyze/route.ts` | `withAgencyAdminAuth` + agency scoping |
| `src/app/api/digest/latest/route.ts` | Agency scoping |
| `src/app/api/push-send/route.ts` | Restrict to same agency |
| `src/lib/agencyAuth.ts` | Add `withAgencyAiAuth` helper; rename admin→manager |
| `src/lib/aiApiHelper.ts` | Compose with agency auth |

#### Phase 4: Frontend
| File | Change |
|------|--------|
| `src/components/layout/NavigationSidebar.tsx` | Permission-based nav gating |
| `src/components/layout/AppShell.tsx` | Permission-based mobile menu |
| `src/components/layout/CommandPalette.tsx` | Permission field on commands |
| `src/components/UtilitySidebar.tsx` | Permission check |
| `src/components/TodoList.tsx` | Remove name arrays, permission gates, staff scoping |
| `src/components/TodoItem.tsx` | Gate delete on permission |
| `src/components/todo/BulkActionBar.tsx` | Gate bulk delete |
| `src/components/layout/TaskDetailPanel.tsx` | Gate delete |
| `src/components/ChatPanel.tsx` | Gate pin on permission |
| `src/components/chat/ChatMessageList.tsx` | Gate pin UI |
| `src/components/SaveTemplateModal.tsx` | Permission check |
| `src/components/Dashboard.tsx` | Staff data scoping |
| `src/components/ActivityFeed.tsx` | Staff data scoping |
| `src/components/AgencySwitcher.tsx` | Role labels/icons update |
| `src/components/AgencyMembersModal.tsx` | Invitation UI + role updates |
| `src/components/RegisterModal.tsx` | Default `'staff'` |
| `src/components/LoginScreen.tsx` | Default `'staff'` |
| `src/components/UserSwitcher.tsx` | Default `'staff'` |
| `src/app/page.tsx` | Default `'staff'` |
| `src/app/join/[token]/page.tsx` | Type update |
| `src/components/layout/EnhancedBottomNav.tsx` | Permission-aware filtering |
| `src/components/MainApp.tsx` | Guard view routing |

#### Phase 5: Onboarding
| File | Change |
|------|--------|
| `src/app/api/auth/register/route.ts` | **NEW** -- Server-side registration |
| `src/app/api/agencies/[agencyId]/invitations/route.ts` | **NEW** -- Create/list invitations |
| `src/app/api/agencies/[agencyId]/invitations/[id]/route.ts` | **NEW** -- Revoke invitation |
| `src/app/api/invitations/validate/route.ts` | **NEW** -- Public token validation |
| `src/app/api/invitations/accept/route.ts` | **NEW** -- Accept invitation |
| `src/components/InvitationForm.tsx` | **NEW** -- Invitation creation UI |
| `src/components/PendingInvitationsList.tsx` | **NEW** -- List pending invitations |
| `src/components/OnboardingWizard.tsx` | **NEW** -- Post-registration flow |

#### Phase 6: Polish
| File | Change |
|------|--------|
| `src/lib/email.ts` | **NEW** -- Resend integration |
| Multiple API routes | Error response standardization |

---

## API Route Inventory (42 Routes)

| # | Route | Methods | Current Auth | Agency Filter | Severity |
|---|-------|---------|-------------|--------------|----------|
| 1 | `/api/todos` | GET,POST,PUT,DELETE | Session (`validateSession`) | **NO** | CRITICAL |
| 2 | `/api/todos/reorder` | POST | **NONE** | **NO** | CRITICAL |
| 3 | `/api/todos/waiting` | POST,DELETE | Session | **NO** | HIGH |
| 4 | `/api/todos/check-waiting` | GET | CRON_SECRET | **NO** | MEDIUM |
| 5 | `/api/activity` | GET,POST | Session | **NO** | HIGH |
| 6 | `/api/templates` | GET,POST,DELETE | Session | **NO** | HIGH |
| 7 | `/api/attachments` | POST,DELETE,GET | Session | **NO** | HIGH |
| 8 | `/api/reminders` | GET,POST,DELETE,PATCH | Session | **NO** | HIGH |
| 9 | `/api/reminders/process` | POST,GET | API Key | **NO** | MEDIUM |
| 10 | `/api/goals` | GET,POST,PUT,DELETE | Session + name check | **NO** | HIGH |
| 11 | `/api/goals/categories` | GET,POST | Session + name check | **NO** | HIGH |
| 12 | `/api/goals/milestones` | GET,POST,PUT,DELETE | Session + name check | **NO** | HIGH |
| 13 | `/api/push-subscribe` | GET,POST,DELETE | Session | **NO** | MEDIUM |
| 14 | `/api/push-send` | POST | Session | **NO** | MEDIUM |
| 15 | `/api/push-notifications/send` | POST | **NONE** | **NO** | CRITICAL |
| 16 | `/api/digest/latest` | GET | Session | **NO** | MEDIUM |
| 17 | `/api/digest/generate` | POST,GET | API Key | **NO** | MEDIUM |
| 18 | `/api/patterns/suggestions` | GET | Session | **NO** | LOW |
| 19 | `/api/patterns/analyze` | POST | Session | **NO** | MEDIUM |
| 20 | `/api/ai/smart-parse` | POST | **NONE** | **NO** | HIGH |
| 21 | `/api/ai/enhance-task` | POST | **NONE** | **NO** | HIGH |
| 22 | `/api/ai/breakdown-task` | POST | **NONE** | **NO** | HIGH |
| 23 | `/api/ai/generate-email` | POST | **NONE** | **NO** | HIGH |
| 24 | `/api/ai/translate-email` | POST | **NONE** | **NO** | HIGH |
| 25 | `/api/ai/parse-voicemail` | POST | **NONE** | **NO** | HIGH |
| 26 | `/api/ai/parse-content-to-subtasks` | POST | **NONE** | **NO** | MEDIUM |
| 27 | `/api/ai/transcribe` | POST | Session | **NO** | MEDIUM |
| 28 | `/api/ai/parse-file` | POST | Session | **NO** | MEDIUM |
| 29 | `/api/ai/daily-digest` | POST | Session | **NO** | MEDIUM |
| 30 | `/api/agencies` | GET,POST | **NONE** (POST has name check) | N/A | CRITICAL |
| 31 | `/api/agencies/[id]/members` | GET,POST,DELETE,PATCH | `verifyAgencyAccess` | **YES** | OK |
| 32 | `/api/auth/login` | POST | N/A (is auth) | **NO** | LOW |
| 33 | `/api/auth/[...nextauth]` | GET,POST | NextAuth | N/A | OK |
| 34 | `/api/security/events` | GET | Session + admin | **NO** | LOW |
| 35 | `/api/csrf` | GET | Cookie | N/A | OK |
| 36 | `/api/csp-report` | POST,OPTIONS | **NONE** (browser) | N/A | OK |
| 37 | `/api/health/env-check` | GET | API Key | N/A | OK |
| 38 | `/api/debug/feature-flags` | GET | **NONE** | N/A | HIGH |
| 39 | `/api/debug/derrick-agencies` | GET | **NONE** | N/A | CRITICAL |
| 40 | `/api/outlook/users` | GET | API Key | **NO** | MEDIUM |
| 41 | `/api/outlook/create-task` | POST | API Key | **NO** | MEDIUM |
| 42 | `/api/outlook/parse-email` | POST | API Key | **NO** | LOW |

---

## Hardcoded Name Checks to Remove

| File | Line | Code | Replacement |
|------|------|------|-------------|
| `src/types/todo.ts` | 504 | `OWNER_USERNAME = 'Derrick'` | Delete constant |
| `src/types/todo.ts` | 527 | `user.name === OWNER_USERNAME` in `isOwner()` | Remove branch |
| `src/types/todo.ts` | 550 | `user.name === OWNER_USERNAME` in `isAdmin()` | Remove branch |
| `src/components/TodoList.tsx` | 82 | `['derrick', 'adrian'].includes(userName.toLowerCase())` | `usePermission('can_view_archive')` |
| `src/app/api/agencies/route.ts` | 74 | `creator.name === 'Derrick'` | Session auth (any user) |
| `src/app/api/goals/route.ts` | 11 | `LEGACY_OWNER_NAME = 'Derrick'` | Delete, use role/permission |
| `src/app/api/goals/categories/route.ts` | 11 | Same pattern | Same fix |
| `src/app/api/goals/milestones/route.ts` | 11 | Same pattern | Same fix |
| `src/app/api/security/events/route.ts` | 31 | `userName === 'Derrick'` | `can_view_security_events` permission |
| `supabase/migrations/20260126_multi_tenancy.sql` | 734 | `u.name = 'Derrick'` | Leave (one-time migration function) |

---

## New Permission Flags (20 Total)

### AgencyPermissions Interface

```typescript
export interface AgencyPermissions {
  // Task Management
  can_create_tasks: boolean;
  can_edit_any_task: boolean;
  can_delete_tasks: boolean;
  can_assign_tasks: boolean;
  can_reorder_tasks: boolean;

  // Strategic Goals
  can_view_strategic_goals: boolean;
  can_manage_strategic_goals: boolean;

  // Team Management
  can_invite_users: boolean;
  can_remove_users: boolean;
  can_change_roles: boolean;

  // Templates & Content
  can_manage_templates: boolean;
  can_use_ai_features: boolean;

  // Chat & Communication
  can_pin_messages: boolean;
  can_delete_any_message: boolean;

  // Reporting & Analytics
  can_view_activity_feed: boolean;
  can_view_dashboard: boolean;
  can_view_archive: boolean;

  // Agency Administration
  can_manage_agency_settings: boolean;
  can_view_security_events: boolean;
  can_manage_billing: boolean;
}
```

### Default Permission Matrix

| Permission | Owner | Manager | Staff |
|-----------|-------|---------|-------|
| `can_create_tasks` | true | true | true |
| `can_edit_any_task` | true | true | false |
| `can_delete_tasks` | true | true | false |
| `can_assign_tasks` | true | true | false |
| `can_reorder_tasks` | true | true | false |
| `can_view_strategic_goals` | true | true | false |
| `can_manage_strategic_goals` | true | false | false |
| `can_invite_users` | true | true | false |
| `can_remove_users` | true | true | false |
| `can_change_roles` | true | false | false |
| `can_manage_templates` | true | true | false |
| `can_use_ai_features` | true | true | true |
| `can_pin_messages` | true | true | false |
| `can_delete_any_message` | true | true | false |
| `can_view_activity_feed` | true | true | true |
| `can_view_dashboard` | true | true | true |
| `can_view_archive` | true | true | false |
| `can_manage_agency_settings` | true | false | false |
| `can_view_security_events` | true | true | false |
| `can_manage_billing` | true | false | false |

---

## Migration SQL Reference

### Full Role Migration SQL

```sql
-- ================================================================
-- Migration: Upgrade role system + expand permissions + add session agency
-- ================================================================

-- 1. Reconcile RLS policies (drop v3 ELSE-true policies)
-- [See Phase 1A for full list of policies to drop]

-- 2. Widen role constraints temporarily
ALTER TABLE agency_members DROP CONSTRAINT IF EXISTS agency_members_role_check;
ALTER TABLE agency_members ADD CONSTRAINT agency_members_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'member', 'staff'));

ALTER TABLE agency_invitations DROP CONSTRAINT IF EXISTS agency_invitations_role_check;
ALTER TABLE agency_invitations ADD CONSTRAINT agency_invitations_role_check
  CHECK (role IN ('admin', 'manager', 'member', 'staff'));

-- 3. Migrate role values
UPDATE agency_members SET role = 'manager' WHERE role = 'admin';
UPDATE agency_members SET role = 'staff' WHERE role = 'member';
UPDATE agency_invitations SET role = 'manager' WHERE role = 'admin';
UPDATE agency_invitations SET role = 'staff' WHERE role = 'member';
UPDATE users SET role = 'manager' WHERE role = 'admin';
UPDATE users SET role = 'staff' WHERE role = 'member';

-- 4. Update permissions JSONB for all members
-- [See Phase 1C -- 3 UPDATE statements for owner/manager/staff with all 20 flags]

-- 5. Tighten constraints to new values only
ALTER TABLE agency_members DROP CONSTRAINT agency_members_role_check;
ALTER TABLE agency_members ADD CONSTRAINT agency_members_role_check
  CHECK (role IN ('owner', 'manager', 'staff'));

ALTER TABLE agency_invitations DROP CONSTRAINT agency_invitations_role_check;
ALTER TABLE agency_invitations ADD CONSTRAINT agency_invitations_role_check
  CHECK (role IN ('manager', 'staff'));

-- 6. Update users table constraint
DO $$
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('owner', 'manager', 'staff'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- 7. Update RLS functions
CREATE OR REPLACE FUNCTION public.is_agency_admin(p_agency_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM agency_members
    WHERE agency_id = p_agency_id
      AND user_id = public.get_current_user_id()
      AND role IN ('owner', 'manager')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 8. Add agency to sessions
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS current_agency_id UUID REFERENCES agencies(id);
CREATE INDEX IF NOT EXISTS idx_sessions_agency ON user_sessions(current_agency_id);
```

---

## Verification Checklists

### Per-Phase Verification

Each phase section above includes its own verification checklist. Complete all items before proceeding to the next phase.

### Final Integration Test Plan

1. **Registration flow:** New user registers → creates agency → is owner
2. **Invitation flow:** Owner creates invite → employee opens link → registers → auto-joins as staff
3. **Multi-agency:** User accepts invite to second agency → switcher shows both → data isolated
4. **Staff scoping:** Staff user sees only their tasks, cannot delete others' tasks
5. **Manager access:** Manager sees all tasks, can invite/remove users, cannot access agency settings
6. **Owner access:** Full access to strategic goals, agency settings, security events
7. **Cross-agency isolation:** User in agency A cannot see agency B's todos/messages/goals
8. **Permission customization:** Owner modifies staff member's permissions → changes take effect
9. **Session agency switching:** User switches agency → session updates → data refreshes
10. **Build verification:** `npm run build` completes with zero errors

---

## Agent Review Findings (2026-02-02)

Four specialist agents reviewed this plan. Below is the consolidated feedback organized by severity, with amendments to the plan noted inline.

### CRITICAL Issues (Must Fix Before Starting)

#### C1: `set_request_context()` uses `is_local=false` — cross-tenant data leakage via connection pooling
**Source:** Database Agent
**Problem:** The `set_request_context()` function (line 228-241 of `20260126_multi_tenancy.sql`) calls `set_config('app.user_id', ..., false)`. The `false` parameter means GUC variables persist for the **entire connection**, not just the current transaction. With Supabase's PgBouncer in transaction mode, the previous user's identity leaks to the next request on the same connection.
**Additionally:** The function only sets `app.agency_id` conditionally (`IF p_agency_id IS NOT NULL`), leaving stale values from previous connections.
**Fix:** Change all `set_config` calls to use `true` (transaction-local). Always set/clear `app.agency_id` unconditionally:
```sql
PERFORM set_config('app.agency_id', COALESCE(p_agency_id::text, ''), true);
```
**Plan amendment:** Add to Phase 1A migration SQL.

#### C2: `agency_role` type cast in seed migration does not exist — migration will fail
**Source:** Database Agent
**Problem:** `20260201000000_seed_default_agency.sql` lines 72-74 cast to `::agency_role`, which is a PostgreSQL type that was never created. The seed migration will fail at runtime.
**Fix:** Remove the `::agency_role` casts and use plain string values (the CHECK constraint validates them).
**Plan amendment:** Add as a prerequisite fix before running any new migrations.

#### C3: RLS migration window creates total data exposure
**Source:** Security Agent
**Problem:** Dropping v3 policies (Phase 1A) before agency policies are fully functional creates a window where tables have RLS enabled but no working policies — meaning all data is blocked OR all data is visible (depending on whether any fallback exists).
**Fix:** Execute the policy drop + agency policy verification in a single transaction. Test the agency policies work (with `set_request_context()` called) BEFORE dropping the v3 policies:
1. In the migration: first verify agency policies return correct results via test queries
2. Only then `DROP POLICY IF EXISTS rls_*`
3. Wrap in `BEGIN ... COMMIT`
**Plan amendment:** Phase 1A must be a single-transaction migration with verification steps.

#### C4: Client-side Supabase queries bypass all server-side auth
**Source:** Security Agent
**Problem:** 20+ direct `supabase.from('todos')` calls in `TodoList.tsx`, `ChatPanel.tsx`, `MainApp.tsx` bypass all API route auth. These use the client-side anon key and only RLS stands between them and the database.
**Implication:** Until RLS is fully working AND `set_request_context()` is called before every subscription, client-side queries are a data isolation vulnerability.
**Fix:** RLS must be fully operational before any multi-tenancy launch. Long-term, migrate CRUD calls to API routes (keeping client-side Supabase only for real-time subscriptions).
**Plan amendment:** Add a Phase 0 prerequisite: verify RLS works end-to-end with `set_request_context()` in a test environment before proceeding.

#### C5: Agency ID from client-controlled cookie enables cross-tenant probing
**Source:** Security Agent
**Problem:** `AgencyContext.tsx` line 191 sets `current_agency_id` cookie client-side without `HttpOnly` or `Secure` flags. `agencyAuth.ts` reads this cookie (lines 132-136) to determine agency context. An attacker can set this cookie to any agency ID.
**Fix:** Server-side agency resolution: read `current_agency_id` from the session record (Phase 1D adds it), not from a client cookie. The cookie can remain for UI convenience but must not be the authoritative source.
**Plan amendment:** Phase 2A/2C must prioritize reading agency from session, not cookie. Add explicit note that `agencyAuth.ts` must use session-derived agency ID.

### HIGH Issues

#### H1: Plan lists wrong v3 policies to drop — they were already dropped by earlier migration
**Source:** Database Agent
**Problem:** Phase 1A lists `rls_todos_select`, `rls_messages_select`, etc. for dropping. But `20260125_security_hardening.sql` already dropped these and replaced them with `todos_select_policy`, etc. Then `20260126_multi_tenancy.sql` dropped those and created `*_agency` policies. The v3 `rls_*` policies on `todos/messages/goals/milestones` are already gone.
**What actually needs dropping:** Surviving v3 policies on tables NOT covered by `20260125` or `20260126`:
- `users`: `rls_users_select`, `rls_users_insert` (+ hardening-era `users_update_policy`, `users_delete_policy`)
- `activity_log`: `rls_activity_select`, `rls_activity_insert`, `rls_activity_delete`
- `task_templates`: `rls_templates_select/insert/update/delete`
- `device_tokens`: `rls_device_tokens_select/insert/delete`
- `goal_categories`: `rls_goal_categories_select/insert/update/delete`
**Plan amendment:** Rewrite Phase 1A with the correct policy list. Create agency-scoped replacement policies for `activity_log`, `task_templates`, and `goal_categories`.

#### H2: Three tables have `agency_id` but NO agency RLS policy
**Source:** Database Agent
**Problem:** `activity_log`, `task_templates`, and `goal_categories` all have an `agency_id` column but zero agency-scoped RLS policies. Their only policies are the old v3 versions with `USING(true)` fallbacks.
**Fix:** Create agency-scoped policies for these three tables in the Phase 1A migration.
**Plan amendment:** Add to Phase 1A.

#### H3: `users` table has `USING(true)` SELECT policy — user enumeration across tenants
**Source:** Database + Security Agents
**Problem:** `rls_users_select` policy uses `USING(true)`, meaning any user can enumerate all users across all agencies.
**Fix:** Scope user listing to agency-visible users (those sharing at least one agency via `agency_members`). Keep a public-access path for login/registration only.
**Plan amendment:** Add to Phase 1A — create agency-scoped user SELECT policy.

#### H4: No shared query builder — 80-100+ manual `.eq('agency_id')` calls
**Source:** Backend Agent
**Problem:** Every API route will independently call `.eq('agency_id', ctx.agencyId)`. Missing it once = data leak. With 42 routes and multiple queries per route, this is 80-100+ places where the filter must be manually added.
**Recommendations:**
1. Call `set_request_context()` RPC at the start of every API route and rely on RLS for defense-in-depth
2. Create an `agencyScopedQuery(table, ctx)` helper that auto-appends the filter
3. The `.eq('agency_id')` in routes becomes a secondary defense layer on top of RLS
**Plan amendment:** Add `agencyScopedQuery` helper to Phase 2C. Add `set_request_context()` call requirement to Phase 3 route template.

#### H5: `validate_session_token` RPC not updated in migration SQL
**Source:** Backend Agent
**Problem:** Phase 1D adds `current_agency_id` to `user_sessions` but doesn't update the `validate_session_token` PostgreSQL function to return it. The fallback query path (line 127 of `sessionValidator.ts`) also isn't updated.
**Fix:** Add RPC function update to the Phase 1D migration. Update the fallback SELECT to include `current_agency_id`.
**Plan amendment:** Add to Phase 1D migration SQL and Phase 2A file changes.

#### H6: `accept_agency_invitation` ON CONFLICT can demote an owner to staff
**Source:** Database Agent
**Problem:** The `ON CONFLICT (agency_id, user_id) DO UPDATE SET status = 'active', role = v_invitation.role` will silently demote an active owner if they receive and accept a staff invitation.
**Fix:** Add `WHERE agency_members.status != 'active' OR agency_members.role NOT IN ('owner', 'manager')` to the ON CONFLICT clause.
**Plan amendment:** Add to Phase 5A or as a prerequisite fix.

#### H7: Agency switch does not reset Zustand store — stale cross-agency data visible
**Source:** Frontend Agent
**Problem:** When switching agencies, old todos remain in the Zustand store until `useTodoData`'s `useEffect` refires. During re-fetch, stale data is visible. Chat, activity, goals, templates, and filters also don't reset.
**Fix:** Add `resetStore()` action to Zustand store, called from `switchAgency()`. Key components on `currentAgencyId` for full remount:
```tsx
<TodoList key={currentAgencyId} ... />
```
**Plan amendment:** Add to Phase 4 with a state reset checklist.

#### H8: RLS must be fixed before real-time subscriptions provide any data isolation
**Source:** Frontend Agent
**Problem:** `supabase.channel().on('postgres_changes', ...)` is a WebSocket that cannot move to API routes. RLS is the only enforcement layer for real-time data. Until RLS works, subscriptions leak data.
**Fix:** This reinforces C4 — RLS must be fully operational as a prerequisite.
**Plan amendment:** Already covered by C4 / Phase 0 prerequisite.

### MEDIUM Issues

#### M1: No-agency-membership edge case on login not handled
**Source:** Backend Agent
**Problem:** If a user has no agency memberships, the login flow (Phase 2B) would fail when looking up default agency.
**Fix:** Login should succeed with `agencies: []` and `default_agency_id: null`, redirecting to an onboarding/agency-selection flow.
**Plan amendment:** Add edge case handling to Phase 2B.

#### M2: AI routes don't need full agency auth — 3 extra DB queries per request
**Source:** Backend Agent
**Problem:** Most AI routes are stateless (no database queries). `withAgencyAuth` adds 3 extra DB queries (session + membership + agency) that are unnecessary.
**Fix:** Create a lightweight `withSessionAuth` for stateless endpoints that only validates the session.
**Plan amendment:** Phase 3B should use `withSessionAuth` instead of `withAgencyAiAuth` for AI routes that don't query data.

#### M3: Error response standardization deferred to Phase 6 causes churn
**Source:** Backend Agent
**Problem:** Currently 3+ different error shapes. All code written in Phases 2-5 will use inconsistent shapes and need rewriting in Phase 6.
**Fix:** Define the standard error shape and helper in Phase 1 (type + `apiErrorResponse()` function). Require all new code to use it.
**Plan amendment:** Move error shape definition from Phase 6B to Phase 1E.

#### M4: Cron routes have no multi-agency auth pattern
**Source:** Backend Agent
**Problem:** Cron/system routes (`reminders/process`, `digest/generate`, `todos/check-waiting`) bypass session auth via API key. They have no agency context in the request. The plan's `withAgencyAuth` doesn't apply.
**Fix:** Define a `withSystemAuth` pattern that authenticates via API key and iterates across all agencies. Use batch queries with agency joins rather than per-agency iteration.
**Plan amendment:** Add `withSystemAuth` pattern to Phase 3D.

#### M5: `usePermission` cannot access `currentUser.role` when multi-tenancy is off
**Source:** Frontend Agent
**Problem:** `AgencyProvider` wraps `AppShell`, so `usePermission` cannot call `useAppShell()` to get `currentUser.role` — that context isn't available yet. When multi-tenancy is off, role data has no source.
**Fix:** Create a `UserContext` that sits above both `AgencyProvider` and `AppShell`, providing `currentUser` including `.role`.
**Plan amendment:** Add `UserContext` to Phase 2D.

#### M6: Real-time subscriptions cannot be scoped to staff-visible tasks
**Source:** Frontend Agent
**Problem:** Supabase real-time `filter` only supports single equality checks. Cannot filter for `created_by=X OR assigned_to=X`. Staff scoping must happen client-side.
**Fix:** Keep agency-level filter on subscription. In the event handler, check `created_by === userName || assigned_to === userName` before writing to store. Handle task **un-assignment** by removing from store when a task no longer matches.
**Plan amendment:** Add to Phase 4C implementation details.

#### M7: `auth.is_admin()` not updated for new role values
**Source:** Database Agent
**Problem:** The `auth.is_admin()` function (from `20260114`) checks `role IN ('owner', 'admin')`. After role migration, no users have `role = 'admin'`, so managers lose admin privileges on hardening-era policies.
**Fix:** Update `auth.is_admin()` to check `('owner', 'manager')` in the Phase 1B migration.
**Plan amendment:** Add to Phase 1B migration SQL.

#### M8: Missing composite indexes for RLS query patterns
**Source:** Database Agent
**Problem:** `user_agency_ids()` is called per-row in RLS without a covering index. Common query patterns (`agency_id + created_by`, `agency_id + status`) lack composite indexes.
**Fix:** Add covering indexes:
```sql
CREATE INDEX idx_agency_members_user_status ON agency_members(user_id, status) INCLUDE (agency_id);
CREATE INDEX idx_todos_agency_created ON todos(agency_id, created_by);
CREATE INDEX idx_todos_agency_status ON todos(agency_id, status);
CREATE INDEX idx_messages_agency_created ON messages(agency_id, created_at DESC);
```
**Plan amendment:** Add to Phase 1A or 1D migration.

#### M9: `AgencyPermissions` has 5 fields currently; plan requires 20 — stale defaults in code
**Source:** Frontend Agent
**Problem:** `DEFAULT_PERMISSIONS` in `src/types/agency.ts` still uses old `admin`/`member` roles and only 5 permission fields. This will break at runtime until Phase 1E is complete.
**Plan amendment:** Already covered by Phase 1E but should be highlighted as a blocking dependency for all frontend work.

#### M10: No `NOT NULL` constraint on `agency_id` after backfill
**Source:** Database Agent
**Problem:** After backfilling all rows with `agency_id`, new rows can still be inserted with `agency_id = NULL`, bypassing agency scoping.
**Fix:** After confirming backfill is complete and application always sets `agency_id`, add:
```sql
ALTER TABLE todos ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE messages ALTER COLUMN agency_id SET NOT NULL;
-- etc. for all agency-scoped tables
```
Also remove the `OR agency_id IS NULL` fallback from RLS policies.
**Plan amendment:** Add as a Phase 3 post-verification step.

### LOW Issues

#### L1: Potential circular dependency if `withAgencyAiAuth` lives in `agencyAuth.ts`
**Source:** Backend Agent
**Fix:** Compose `withAgencyAuth` + `withAiErrorHandling` in route files, not in helper modules.

#### L2: `TemplatePicker.isOwner` naming collision with agency `isOwner`
**Source:** Frontend Agent
**Fix:** Rename prop to `isTemplateCreator` or `canDelete` during Phase 4.

#### L3: Milestone/attachment join-through-parent queries not specified
**Source:** Backend Agent
**Fix:** Document the two-hop query pattern for milestones (via goal) and attachments (via todo).

#### L4: `withAgencyAdminAuth` hardcodes `['owner', 'admin']` at line 481
**Source:** Backend Agent
**Fix:** Update to `['owner', 'manager']` in Phase 3 when `agencyAuth.ts` is modified.

#### L5: Race condition in session-agency switching
**Source:** Security Agent
**Fix:** Update `current_agency_id` on `user_sessions` server-side when agency is switched, not just in client cookie/localStorage.

#### L6: No rollback migration or transactional wrapping
**Source:** Database Agent
**Fix:** Take database snapshot before running. Wrap migrations in `BEGIN ... COMMIT`. Create a documented rollback migration.

#### L7: Invitation tokens stored as plaintext
**Source:** Security Agent
**Fix:** Store `sha256(token)` in the database. Compare hashed values in `accept_agency_invitation()`.

#### L8: Two separate backfill mechanisms exist (function + seed migration)
**Source:** Database Agent
**Fix:** Remove the dead `migrate_to_bealer_agency()` function. Keep only the seed migration.

#### L9: `users.role` CHECK constraint may have auto-generated name
**Source:** Database Agent
**Fix:** Query `pg_constraint` for actual constraint name before dropping:
```sql
SELECT conname FROM pg_constraint WHERE conrelid = 'users'::regclass AND contype = 'c';
```

### Summary: Amended Phase Sequence

Based on the reviews, the recommended execution order becomes:

```
Phase 0 (NEW): Prerequisites
  - Fix set_request_context() is_local parameter
  - Fix agency_role type cast in seed migration
  - Fix accept_agency_invitation demotion bug
  - Define standard error response shape
  - Add covering indexes for RLS performance
  - Verify RLS works end-to-end in test environment

Phase 1: Database & Type Foundation (AMENDED)
  - 1A: Drop CORRECT v3 policies (users, activity_log, task_templates, device_tokens, goal_categories)
       + Create agency policies for activity_log, task_templates, goal_categories
       + Create scoped user SELECT policy
       + All in single transaction with verification
  - 1B: Role migration (add auth.is_admin() update for 'manager')
  - 1C: Permissions expansion (20 flags)
  - 1D: Session agency_id + validate_session_token RPC update
  - 1E: Type definitions + error response helper

Phase 2: Auth Plumbing (AMENDED)
  - 2A: Session validator (use session-derived agency, not cookie)
  - 2B: Login flow (handle no-membership edge case)
  - 2C: API auth + agencyScopedQuery helper
  - 2D: Frontend (add UserContext above AgencyProvider; usePermission; PermissionGate)

Phase 3: API Route Hardening (AMENDED)
  - 3A: Close zero-auth routes
  - 3B: AI routes use withSessionAuth (lightweight, not full agency auth)
  - 3C: Data routes with agency filtering + set_request_context() calls
  - 3D: System/cron routes with withSystemAuth pattern
  - Post: Add NOT NULL constraints on agency_id columns

Phase 4: Frontend Permission Migration (AMENDED)
  - Add agency-switch state reset (Zustand reset + component key)
  - Staff real-time filtering in event handlers
  - Rename TemplatePicker.isOwner → isTemplateCreator

Phases 5-6: Unchanged
```

---

*Last updated: 2026-02-02*
*Generated from analysis by 5 specialized agents covering RLS, roles, onboarding, API hardening, and frontend permissions.*
*Reviewed by 4 specialist agents: Security, Backend Architecture, Frontend Architecture, Database Engineering.*
