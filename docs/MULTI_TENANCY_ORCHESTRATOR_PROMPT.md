# Multi-Tenancy Implementation — Orchestrator Prompt

> **Usage:** Copy this entire prompt into a new Claude Code session. It will execute the full multi-tenancy plan across multiple context windows.

---

## THE PROMPT

```
You are implementing a multi-tenancy system for a Next.js 16 + Supabase todo application. The complete plan is at docs/MULTI_TENANCY_EXECUTION_PLAN.md — read it fully before starting. It contains 6 phases, agent review findings (section "Agent Review Findings"), and an agent orchestration plan.

This work will span multiple context windows. At the start of each session:
1. Read docs/MULTI_TENANCY_EXECUTION_PLAN.md
2. Read docs/MULTI_TENANCY_PROGRESS.md (you will create this on first run)
3. Pick up where you left off

## Rules

1. **Work one phase at a time.** Complete all sub-steps, run verification, then proceed.
2. **Dispatch parallel agents** within each phase per the "Agent Orchestration Plan" section. Use the Task tool with subagent_type="general-purpose" for code changes and subagent_type="Bash" for build/test verification.
3. **After each phase completes**, update docs/MULTI_TENANCY_PROGRESS.md with: phase completed, files modified, issues encountered, next phase to start.
4. **After each phase completes**, run `npm run build` and fix any TypeScript errors before proceeding.
5. **Commit after each phase** with message format: "Multi-tenancy Phase N: <description>"
6. **Read before writing.** Every agent must read the target file before modifying it. Never guess file contents.
7. **The Agent Review Findings section contains CRITICAL fixes** (C1-C5) that amend the original plan. These take precedence over the original phase descriptions. Specifically:
   - Phase 0 fixes must happen first (C1: set_request_context is_local, C2: agency_role type cast, H6: invitation demotion bug)
   - Phase 1A must drop the CORRECT policies (H1: the v3 policies on users/activity_log/task_templates/device_tokens/goal_categories, NOT todos/messages/goals/milestones which are already gone)
   - Phase 1A must create agency RLS policies for activity_log, task_templates, goal_categories (H2)
   - Phase 2A/2C must read agency from session, not client cookie (C5)
   - Phase 3B should use lightweight withSessionAuth for AI routes, not full withAgencyAuth (M2)

## Phase Execution Details

### Phase 0: Prerequisites

Dispatch 1 general-purpose agent:

AGENT PROMPT: "Read docs/MULTI_TENANCY_EXECUTION_PLAN.md fully, paying special attention to the 'Agent Review Findings' section findings C1, C2, H6, M3, M8. Then execute these fixes:

1. Fix set_request_context() in supabase/migrations/20260126_multi_tenancy.sql:
   - Change all set_config(..., false) to set_config(..., true) for transaction-local scope
   - Change the conditional app.agency_id set to unconditional: PERFORM set_config('app.agency_id', COALESCE(p_agency_id::text, ''), true);

2. Fix agency_role type cast in supabase/migrations/20260201000000_seed_default_agency.sql:
   - Remove all ::agency_role casts (lines 72-74), use plain string values instead

3. Fix accept_agency_invitation in supabase/migrations/20260126_multi_tenancy.sql:
   - Add WHERE clause to ON CONFLICT: WHERE agency_members.status != 'active' OR agency_members.role NOT IN ('owner', 'manager')

4. Add covering indexes — create new migration supabase/migrations/20260202_performance_indexes.sql:
   CREATE INDEX IF NOT EXISTS idx_agency_members_user_status ON agency_members(user_id, status) INCLUDE (agency_id);
   CREATE INDEX IF NOT EXISTS idx_todos_agency_created ON todos(agency_id, created_by);
   CREATE INDEX IF NOT EXISTS idx_todos_agency_assigned ON todos(agency_id, assigned_to);
   CREATE INDEX IF NOT EXISTS idx_todos_agency_status ON todos(agency_id, status);
   CREATE INDEX IF NOT EXISTS idx_messages_agency_created_at ON messages(agency_id, created_at DESC);
   CREATE INDEX IF NOT EXISTS idx_activity_log_agency_created_at ON activity_log(agency_id, created_at DESC);

5. Create standard error response helper — new file src/lib/apiResponse.ts:
   export function apiErrorResponse(code: string, message: string, status: number = 400): NextResponse
   export function apiSuccessResponse(data: Record<string, unknown>, status: number = 200): NextResponse
   Include proper typing with NextResponse from 'next/server'.

Read each file before modifying. Do not guess contents."

Then run: npm run build (expect it to pass since these are additive changes)

### Phase 1: Database & Type Foundation

Dispatch 2 general-purpose agents IN PARALLEL:

AGENT A (Database) PROMPT: "Read docs/MULTI_TENANCY_EXECUTION_PLAN.md sections: Phase 1A-1D, Migration SQL Reference, and Agent Review Findings H1, H2, H3, H5, M7, M8, L9.

Create migration file supabase/migrations/20260202_reconcile_rls_and_roles.sql that does the following IN A SINGLE TRANSACTION (BEGIN...COMMIT):

PART 1 — RLS RECONCILIATION:
First read these migration files to understand what policies currently exist:
- supabase/migrations/20260108_fix_all_security_warnings_v3.sql
- supabase/migrations/20260125_security_hardening.sql
- supabase/migrations/20260126_multi_tenancy.sql

The v3 rls_* policies on todos/messages/strategic_goals/goal_milestones were ALREADY dropped by 20260125. Do NOT try to drop them again.

Drop these SURVIVING v3 policies:
- users: rls_users_select, rls_users_insert
- users: users_update_policy, users_delete_policy (from hardening migration)
- activity_log: rls_activity_select, rls_activity_insert, rls_activity_delete
- task_templates: rls_templates_select, rls_templates_insert, rls_templates_update, rls_templates_delete
- device_tokens: rls_device_tokens_select, rls_device_tokens_insert, rls_device_tokens_delete
- goal_categories: rls_goal_categories_select, rls_goal_categories_insert, rls_goal_categories_update, rls_goal_categories_delete

Use DROP POLICY IF EXISTS for safety.

Create NEW agency-scoped RLS policies for:
- activity_log (SELECT/INSERT/DELETE scoped by agency_id via user_agency_ids())
- task_templates (SELECT/INSERT/UPDATE/DELETE scoped by agency_id, with is_shared fallback for SELECT)
- goal_categories (SELECT/INSERT/UPDATE/DELETE scoped by agency_id)
- users (SELECT scoped to users sharing at least one agency via agency_members join; keep INSERT open for registration; UPDATE/DELETE scoped to own row or agency admin)
- device_tokens (SELECT/INSERT/DELETE scoped to own user_id via get_current_user_id())

Model these on the existing agency policies in 20260126_multi_tenancy.sql (e.g., todos_select_agency).

PART 2 — ROLE MIGRATION:
Follow the Migration SQL Reference section exactly but also:
- Before dropping users_role_check, query pg_constraint to get actual name (finding L9)
- Update auth.is_admin() function to check ('owner', 'manager') instead of ('owner', 'admin') (finding M7)
- Update public.is_agency_admin() to check ('owner', 'manager')

PART 3 — PERMISSIONS EXPANSION:
Write 3 UPDATE statements for agency_members setting all 20 permission flags per role (owner/manager/staff). Use the exact permission matrix from the 'New Permission Flags (20 Total)' section.

PART 4 — SESSION AGENCY:
- ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS current_agency_id UUID REFERENCES agencies(id)
- CREATE INDEX IF NOT EXISTS idx_sessions_agency ON user_sessions(current_agency_id)
- Update the validate_session_token RPC function to also return current_agency_id (finding H5)

Read each existing migration file before writing. Wrap everything in BEGIN...COMMIT."

AGENT B (TypeScript) PROMPT: "Read docs/MULTI_TENANCY_EXECUTION_PLAN.md sections: Phase 1E, New Permission Flags (20 Total), and Agent Review Findings M3, M9.

Make these changes:

1. src/types/agency.ts:
   - Read the file first
   - Change AgencyRole from 'owner' | 'admin' | 'member' to 'owner' | 'manager' | 'staff'
   - Expand AgencyPermissions interface to all 20 fields (copy exactly from the plan's AgencyPermissions Interface section)
   - Update DEFAULT_PERMISSIONS for owner/manager/staff matching the plan's Default Permission Matrix
   - Update isAgencyAdmin() to check 'owner' | 'manager'
   - Update MemberStatus if needed

2. src/types/todo.ts:
   - Read the file first
   - Change UserRole to 'owner' | 'manager' | 'staff'
   - Delete the OWNER_USERNAME constant
   - In isOwner(): remove the name === OWNER_USERNAME fallback branch (keep only role-based checks)
   - In isAdmin(): remove the name === OWNER_USERNAME fallback branch
   - In canViewStrategicGoals(): remove name-based fallback
   - Do NOT delete these functions yet — just remove the name fallbacks. Phase 4 deletes them entirely.

3. src/lib/apiResponse.ts (should already exist from Phase 0):
   - Read it and verify the apiErrorResponse and apiSuccessResponse functions exist
   - If Phase 0 didn't create it, create it now

Read every file before modifying."

SYNC: After both agents complete, run `npm run build`. Expect TypeScript errors in files that import the old role types — that's expected and will be fixed in Phases 2-4. The important thing is the types themselves compile.

### Phase 2: Auth Plumbing

Dispatch 2 general-purpose agents IN PARALLEL:

AGENT A (Backend) PROMPT: "Read docs/MULTI_TENANCY_EXECUTION_PLAN.md sections: Phase 2A-2C, and Agent Review Findings C5, H4, H5, M1.

1. src/lib/sessionValidator.ts:
   - Read the file first
   - Add agencyId?: string to SessionValidationResult interface
   - In the RPC path: add agency_id to SessionRpcResult, map it to agencyId in the return
   - In the fallback path (around line 127): add current_agency_id to the SELECT on user_sessions, return as agencyId
   - In createSession(): add agencyId?: string parameter, include current_agency_id in the INSERT

2. src/app/api/auth/login/route.ts:
   - Read the file first
   - After PIN verification succeeds, query agency_members for the user's default agency: SELECT agency_id FROM agency_members WHERE user_id = $userId AND status = 'active' AND is_default_agency = true LIMIT 1
   - If no default found, try: SELECT agency_id FROM agency_members WHERE user_id = $userId AND status = 'active' LIMIT 1
   - If still no membership found, proceed with agencyId = null (finding M1)
   - Pass agencyId to createSession()
   - Add agencies array to the login response (query getUserAgencies if it exists in agencyAuth.ts, or write a simple query)

3. src/lib/apiAuth.ts:
   - Read the file first
   - Update extractAndValidateUserName() to also return agencyId from sessionResult
   - Create agencyScopedQuery helper:
     export function agencyScopedQuery(supabase: SupabaseClient, table: string, agencyId: string) {
       return supabase.from(table).select().eq('agency_id', agencyId);
     }
   - Update verifyTodoAccess() to accept agencyId parameter and add .eq('agency_id', agencyId) as the FIRST filter

4. src/lib/agencyAuth.ts:
   - Read the file first
   - CRITICAL (C5): Change verifyAgencyAccess to read agency_id from the session (via sessionValidator), NOT from the X-Agency-Id header or current_agency_id cookie. The cookie/header can be a fallback but session is authoritative.
   - Update withAgencyAdminAuth to check ['owner', 'manager'] instead of ['owner', 'admin'] (finding L4)

Read every file before modifying."

AGENT B (Frontend) PROMPT: "Read docs/MULTI_TENANCY_EXECUTION_PLAN.md sections: Phase 2D, and Agent Review Findings M5, M9.

1. Create src/contexts/UserContext.tsx (NEW):
   - Simple context that provides currentUser (including .role) to all descendants
   - Must sit ABOVE AgencyProvider in the component tree
   - Export useCurrentUser() hook
   - Accept currentUser as a prop (same shape as AuthUser from types/todo.ts)

2. Update src/app/page.tsx:
   - Read the file first
   - Wrap the component tree with UserProvider above AgencyProvider:
     <UserProvider currentUser={currentUser}>
       <AgencyProvider userId={currentUser.id}>
         ...
       </AgencyProvider>
     </UserProvider>

3. Create src/hooks/usePermission.ts (NEW):
   - Import useAgencyContext and useCurrentUser
   - When multi-tenancy is enabled: delegate to AgencyContext.hasPermission()
   - When multi-tenancy is disabled: look up DEFAULT_PERMISSIONS[currentUser.role] and check the permission flag
   - Return boolean

4. Create src/hooks/useRoleCheck.ts (NEW):
   - Returns { isOwner: boolean, isManager: boolean, isStaff: boolean, currentRole: AgencyRole | null }
   - When multi-tenancy enabled: read from AgencyContext.currentRole
   - When disabled: read from UserContext currentUser.role

5. Create src/components/ui/PermissionGate.tsx (NEW):
   - Props: permission (keyof AgencyPermissions), fallback?: ReactNode, children: ReactNode
   - Uses usePermission() internally
   - Renders children if permitted, fallback if not (default: null)
   - Mark as 'use client'

6. Fix src/contexts/AgencyContext.tsx:
   - Read the file first
   - In hasPermission(): replace the 'return true when multi-tenancy disabled' with: look up DEFAULT_PERMISSIONS[role from UserContext] and check the specific permission

Read every file before modifying."

SYNC: Run `npm run build` after both complete.

### Phase 3: API Route Hardening

Dispatch 3 general-purpose agents IN PARALLEL:

AGENT A PROMPT: "Read docs/MULTI_TENANCY_EXECUTION_PLAN.md sections: Phase 3A, 3B, and Agent Review Findings M2, L1.

PART 1 — Close zero-auth routes:
- DELETE src/app/api/debug/derrick-agencies/route.ts entirely
- DELETE src/app/api/debug/feature-flags/route.ts entirely (or gate behind admin auth if you think it's useful for debugging — your call)
- src/app/api/todos/reorder/route.ts: Read it, add withAgencyAuth wrapper, add .eq('agency_id', ctx.agencyId) to all queries
- src/app/api/push-notifications/send/route.ts: Read it, add withAgencyAuth, restrict notification targets to users in the same agency
- src/app/api/agencies/route.ts: Read it. GET: add session auth (extractAndValidateUserName), return only user's agencies. POST: remove the creator.name === 'Derrick' guard, use session auth instead (any authenticated user can create).

PART 2 — Auth-gate AI routes with lightweight session auth:
Create withSessionAuth in src/lib/agencyAuth.ts (NOT withAgencyAiAuth to avoid circular deps — finding L1):
  export function withSessionAuth(handler: (req: NextRequest, userId: string, userName: string) => Promise<NextResponse>): (req: NextRequest) => Promise<NextResponse>
  - Validates session cookie via validateSession()
  - Returns 401 if invalid
  - Calls handler with userId and userName (no agency lookup — these are stateless)

Apply to these 8 routes by composing: export const POST = withAiErrorHandling('Name', withSessionAuth(handler))
Read each file before modifying:
- src/app/api/ai/smart-parse/route.ts
- src/app/api/ai/enhance-task/route.ts
- src/app/api/ai/breakdown-task/route.ts
- src/app/api/ai/generate-email/route.ts
- src/app/api/ai/translate-email/route.ts
- src/app/api/ai/parse-voicemail/route.ts
- src/app/api/ai/parse-content-to-subtasks/route.ts
- src/app/api/ai/transcribe/route.ts (already has some auth — verify and strengthen)
- src/app/api/ai/parse-file/route.ts (same)

Read every file before modifying."

AGENT B PROMPT: "Read docs/MULTI_TENANCY_EXECUTION_PLAN.md sections: Phase 3C (data routes), 3D (system routes), and Agent Review Findings H4, M4.

For EVERY route below: read the file first, add withAgencyAuth wrapper, call set_request_context() RPC at handler start for RLS defense-in-depth, add .eq('agency_id', ctx.agencyId) to all Supabase queries, set agency_id on all INSERTs.

Data routes (read each file, modify):
- src/app/api/todos/route.ts (GET, POST, PUT, DELETE)
- src/app/api/activity/route.ts (GET, POST)
- src/app/api/templates/route.ts (GET, POST, DELETE)
- src/app/api/attachments/route.ts (POST, DELETE, GET) — filter via parent todo's agency_id
- src/app/api/patterns/suggestions/route.ts (GET)
- src/app/api/patterns/analyze/route.ts (POST) — use withAgencyAdminAuth
- src/app/api/digest/latest/route.ts (GET)

System/cron routes — create withSystemAuth pattern:
Create in src/lib/agencyAuth.ts:
  export function withSystemAuth(handler: (req: NextRequest) => Promise<NextResponse>): (req: NextRequest) => Promise<NextResponse>
  - Validates CRON_SECRET or API_KEY header
  - Returns 401 if invalid
  - No agency context (system routes process all agencies)

Apply to:
- src/app/api/reminders/process/route.ts — ensure queries JOIN with agency_id for context
- src/app/api/digest/generate/route.ts — generate per-agency digests

Read every file before modifying."

AGENT C PROMPT: "Read docs/MULTI_TENANCY_EXECUTION_PLAN.md sections: Phase 3C (remaining routes), and Agent Review Findings H4.

For EVERY route below: read the file first, add withAgencyAuth wrapper (or withAgencyOwnerAuth for goals), add .eq('agency_id', ctx.agencyId) to all Supabase queries, set agency_id on all INSERTs.

Routes to modify (read each file first):
- src/app/api/goals/route.ts (GET, POST, PUT, DELETE) — use withAgencyOwnerAuth; remove LEGACY_OWNER_NAME constant
- src/app/api/goals/categories/route.ts (GET, POST) — use withAgencyOwnerAuth; remove LEGACY_OWNER_NAME
- src/app/api/goals/milestones/route.ts (GET, POST, PUT, DELETE) — use withAgencyOwnerAuth; remove LEGACY_OWNER_NAME; filter milestones via parent goal's agency
- src/app/api/reminders/route.ts (GET, POST, DELETE, PATCH) — withAgencyAuth + agency filter
- src/app/api/push-send/route.ts (POST) — withAgencyAuth + restrict targets to same agency
- src/app/api/push-subscribe/route.ts (GET, POST, DELETE) — withAgencyAuth (user-scoped, not agency-scoped for push tokens)
- src/app/api/todos/waiting/route.ts (POST, DELETE) — withAgencyAuth + agency filter
- src/app/api/todos/check-waiting/route.ts (GET) — withSystemAuth (cron route)
- src/app/api/security/events/route.ts — replace userName === 'Derrick' with permission check via withAgencyAuth

Read every file before modifying."

SYNC: Run `npm run build` after all 3 complete. Fix any TypeScript errors.

### Phase 4: Frontend Permission Migration

Dispatch 2 general-purpose agents IN PARALLEL:

AGENT A (Components) PROMPT: "Read docs/MULTI_TENANCY_EXECUTION_PLAN.md sections: Phase 4A, 4B, 4D, 4E, Hardcoded Name Checks to Remove.

Replace all isOwner/isAdmin/name-based checks with usePermission() or PermissionGate. Read each file before modifying.

Navigation gating:
- src/components/layout/NavigationSidebar.tsx: Replace isOwner(currentUser) with usePermission('can_view_strategic_goals')
- src/components/layout/AppShell.tsx: Same replacement
- src/components/layout/CommandPalette.tsx: Add permission field to CommandItem, filter by usePermission
- src/components/UtilitySidebar.tsx: Replace checkIsOwner with usePermission
- src/components/layout/EnhancedBottomNav.tsx: Add permission-based filtering

Feature gates:
- src/components/TodoList.tsx line 82: Replace ['derrick', 'adrian'].includes() with usePermission('can_view_archive')
- src/components/TodoList.tsx line 1975: Replace isOwner with usePermission('can_view_strategic_goals')
- src/components/TodoItem.tsx: Gate delete button on usePermission('can_delete_tasks') OR task.created_by === currentUser.name
- src/components/todo/BulkActionBar.tsx: Disable bulk delete if !usePermission('can_delete_tasks')
- src/components/layout/TaskDetailPanel.tsx: Gate delete on permission
- src/components/ChatPanel.tsx lines 240,1067: Gate pin on usePermission('can_pin_messages')
- src/components/SaveTemplateModal.tsx: Gate on usePermission('can_manage_templates')

Role display updates (change 'admin' labels to 'Manager', 'member' to 'Staff'):
- src/components/AgencySwitcher.tsx
- src/components/layout/AppShell.tsx (if role labels shown)
- src/components/LoginScreen.tsx: default role 'staff'
- src/components/UserSwitcher.tsx: default role 'staff'
- src/app/page.tsx: default role 'staff'
- src/app/join/[token]/page.tsx: update types

Legacy cleanup:
- src/types/todo.ts: DELETE isOwner(), isAdmin(), canViewStrategicGoals() functions, OWNER_USERNAME, ACTIVITY_FEED_USERS, FULL_VISIBILITY_USERS
- Remove all import { isOwner } from '@/types/todo' across ~12 files (search for them)

Read every file before modifying."

AGENT B (Data/State) PROMPT: "Read docs/MULTI_TENANCY_EXECUTION_PLAN.md sections: Phase 4C, and Agent Review Findings H7, M6.

1. Agency-switch state reset:
   - src/store/todoStore.ts (or wherever the Zustand store is): Read it, add a resetStore() action that clears todos, sets loading: true, clears selectedTodos, clears any cached state
   - src/contexts/AgencyContext.tsx: In switchAgency(), call useTodoStore.getState().resetStore() after updating the agency
   - src/components/MainApp.tsx or AppShell: Key major components on currentAgencyId so they remount on agency switch:
     <TodoList key={currentAgencyId} ... />
     <ChatPanel key={currentAgencyId} ... />
     <ActivityFeed key={currentAgencyId} ... />
     <Dashboard key={currentAgencyId} ... />

2. Staff data scoping:
   - src/hooks/useTodoData.ts: Read it. When the user lacks can_view_all_tasks permission, add .or('created_by.eq.${userName},assigned_to.eq.${userName}') to the fetch query
   - In the real-time event handler: when user lacks can_view_all_tasks, check if incoming todo matches created_by === userName || assigned_to === userName before writing to store. For UPDATE events, if the todo NO LONGER matches (e.g., was unassigned from user), REMOVE it from the store.

3. Rename TemplatePicker.isOwner:
   - src/components/TemplatePicker.tsx: Rename the TemplateItem prop from isOwner to isTemplateCreator (or canDelete). This is a local prop, not the agency isOwner.

Read every file before modifying."

SYNC: Run `npm run build`. Must compile with ZERO errors.

### Phase 5: Onboarding & Invitations

Dispatch 2 general-purpose agents, Agent B starts after Agent A:

AGENT A (API) PROMPT: "Read docs/MULTI_TENANCY_EXECUTION_PLAN.md section: Phase 5A, 5C.

Create these new API routes:

1. src/app/api/auth/register/route.ts (NEW):
   POST handler. Accept { name, pin, email?, invitation_token?, create_agency?: { name, slug? } }
   - Hash PIN server-side (SHA-256 for backward compat)
   - If invitation_token provided, validate it then accept invitation atomically
   - If create_agency provided, create agency and assign user as owner
   - Set HttpOnly session cookie via setSessionCookie()
   - Return { success, user, agency? }

2. src/app/api/agencies/[agencyId]/invitations/route.ts (NEW):
   GET: List pending invitations (withAgencyAuth, owner/manager only)
   POST: Create invitation. Generate token via crypto.randomBytes(32).toString('hex'). Store sha256(token) in DB (finding L7). Check max_users limit. Return { success, invitation: { id, token, email, role, expires_at, invite_url } }

3. src/app/api/agencies/[agencyId]/invitations/[id]/route.ts (NEW):
   DELETE: Revoke invitation (withAgencyAuth, owner/manager only)

4. src/app/api/invitations/validate/route.ts (NEW):
   POST: { token } → look up by sha256(token), return { valid, agency_name, role, email, expires_at }
   Rate-limited (max 10 per minute per IP)

5. src/app/api/invitations/accept/route.ts (NEW):
   POST: { token, name?, pin?, is_new_user? }
   - If is_new_user, create user first via register logic
   - Call accept_agency_invitation Postgres function
   - Set session cookie
   - Return { success, agency, role }

6. Fix src/app/api/agencies/route.ts POST:
   Remove the creator.name === 'Derrick' guard. Any authenticated user can create (with rate limit).

Read existing files for patterns before creating new ones. Use the same auth patterns as existing routes."

AGENT B (UI) — dispatch AFTER Agent A completes: "Read docs/MULTI_TENANCY_EXECUTION_PLAN.md section: Phase 5B. Also read Agent A's newly created API routes to understand the response shapes.

1. Create src/components/InvitationForm.tsx (NEW):
   - Form with email input, role selector (manager/staff), submit button
   - Calls POST /api/agencies/[agencyId]/invitations
   - Shows the generated invite URL with a copy button

2. Create src/components/PendingInvitationsList.tsx (NEW):
   - Lists pending invitations with email, role, expires_at, revoke button
   - Calls GET /api/agencies/[agencyId]/invitations
   - Revoke calls DELETE /api/agencies/[agencyId]/invitations/[id]

3. Modify src/components/AgencyMembersModal.tsx:
   - Read it first
   - Replace direct-add form with InvitationForm
   - Add PendingInvitationsList tab/section

4. Modify src/components/LoginScreen.tsx:
   - Read it first
   - Add 'Have an invite code?' section below the login form
   - Input for paste token, validates via /api/invitations/validate, shows agency name + role, confirm to accept

5. Modify src/app/join/[token]/page.tsx:
   - Read it first
   - Replace direct Supabase queries with API calls to /api/invitations/validate and /api/invitations/accept
   - Update role types from 'admin'|'member' to 'manager'|'staff'

Read every file before modifying."

SYNC: Run `npm run build`.

### Phase 6: Polish & Email

Dispatch 1 general-purpose agent:

"Read docs/MULTI_TENANCY_EXECUTION_PLAN.md section: Phase 6.

1. Create src/lib/email.ts (NEW):
   - Install resend: add to package.json dependencies
   - Create sendInvitationEmail(to, agencyName, inviteUrl, role) function
   - Use RESEND_API_KEY env var. If not set, log warning and skip (don't fail).

2. Integrate email into invitation creation:
   - src/app/api/agencies/[agencyId]/invitations/route.ts POST: after creating invitation, call sendInvitationEmail (fire-and-forget, don't await)

3. Error response standardization:
   - Search all API routes for inconsistent error response shapes
   - Replace with apiErrorResponse() from src/lib/apiResponse.ts
   - Target: all routes should use { success: false, error: 'CODE', message: 'Human readable' }

4. Final verification checklist from the plan:
   - Verify no 'Derrick' or 'adrian' string literals remain in source code (except the one-time migration function)
   - Verify all isOwner imports are removed
   - Run npm run build — must pass with zero errors

Read every file before modifying."

## Progress Tracking

Create docs/MULTI_TENANCY_PROGRESS.md on first run with this template:

# Multi-Tenancy Implementation Progress

## Current Phase: 0
## Status: Not Started

### Phase 0: Prerequisites
- [ ] C1: set_request_context is_local fix
- [ ] C2: agency_role type cast fix
- [ ] H6: invitation demotion fix
- [ ] M8: covering indexes
- [ ] M3: apiErrorResponse helper

### Phase 1: Database & Type Foundation
- [ ] 1A: RLS reconciliation migration
- [ ] 1B: Role migration
- [ ] 1C: Permissions expansion
- [ ] 1D: Session agency_id
- [ ] 1E: TypeScript type updates
- [ ] Build verification

### Phase 2: Auth Plumbing
- [ ] 2A: sessionValidator.ts
- [ ] 2B: login/route.ts
- [ ] 2C: apiAuth.ts + agencyScopedQuery
- [ ] 2D: UserContext + usePermission + PermissionGate
- [ ] Build verification

### Phase 3: API Route Hardening
- [ ] 3A: Zero-auth routes closed
- [ ] 3B: AI routes with withSessionAuth
- [ ] 3C: Data routes with agency filter
- [ ] 3D: System routes with withSystemAuth
- [ ] Build verification

### Phase 4: Frontend Permission Migration
- [ ] 4A: Navigation gating
- [ ] 4B: Feature-level gates
- [ ] 4C: Staff data scoping + agency switch reset
- [ ] 4D: Role display updates
- [ ] 4E: Legacy code cleanup
- [ ] Build verification (zero errors)

### Phase 5: Onboarding & Invitations
- [ ] 5A: API routes (register, invitations)
- [ ] 5B: UI components
- [ ] 5C: Self-service agency creation
- [ ] Build verification

### Phase 6: Polish & Email
- [ ] 6A: Resend integration
- [ ] 6B: Error standardization
- [ ] 6C: Final verification
- [ ] Build passes
- [ ] No hardcoded names remain

## Files Modified Log
(Updated after each phase)

## Issues Encountered
(Updated as needed)
```

---

## Context Window Management

This work is too large for a single context window. The prompt above is designed so that:

1. **Each phase is self-contained** — an agent can execute a phase by reading the plan + progress file
2. **The progress file** tracks exactly where you left off
3. **Phase prompts are complete** — each agent prompt contains all the information needed without reading prior conversation
4. **Build verification gates** prevent cascading errors across phases

If you run out of context mid-phase, the progress file will show which sub-tasks are checked off. Resume by reading the plan + progress file and continuing from the last unchecked item.

## Estimated Execution

| Phase | Agent Dispatches | Key Risk |
|-------|-----------------|----------|
| Phase 0 | 1 | Low — small fixes |
| Phase 1 | 2 parallel + 1 build check | Medium — SQL must be correct |
| Phase 2 | 2 parallel + 1 build check | Medium — auth chain is critical path |
| Phase 3 | 3 parallel + 1 build check | High — most files touched, most likely merge conflicts |
| Phase 4 | 2 parallel + 1 build check | Medium — many component changes |
| Phase 5 | 2 sequential + 1 build check | Low — all new files |
| Phase 6 | 1 + 1 build check | Low — polish |
| **Total** | **~15 agents** | |
