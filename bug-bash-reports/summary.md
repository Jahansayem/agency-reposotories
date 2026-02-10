# Bug Bash Summary

## Overview
- Total files audited: ~238
- Total issues found: 79
- Total issues fixed: 17
- TypeScript (`npx tsc --noEmit`): **PASS** (0 errors)
- Build (`npm run build`): **PASS** (compiled successfully, 65 routes generated)
- Files modified: 16 (no overlapping edits between agents)
- No new files created (only modifications to existing files)

---

## Fixes by Scope

### Auth & Security (6 fixed, 10 open)

| # | Severity | File | Fix Description | Verified |
|---|----------|------|-----------------|----------|
| 1 | CRITICAL | `src/lib/promptSanitizer.ts` | Reset `lastIndex` on global regexes before `.test()` calls in `isInputSafe()` and `sanitizePromptInput()` to prevent intermittent bypass of injection/sensitive data detection | PASS |
| 2 | CRITICAL | `src/lib/csrf.ts` | Changed `validateCsrfToken` from plain SHA-256 hash to HMAC-SHA-256 with 32-char hex slice, matching the middleware algorithm. Added `createHmac` import. | PASS |
| 3 | HIGH | `src/lib/auth.ts` | Replaced `===` PIN hash comparison with constant-time XOR loop to prevent timing attacks | PASS |
| 4 | HIGH | `src/app/api/auth/forgot-pin/route.ts` | Changed from anon key `supabase` import to `createServiceRoleClient()` for RLS bypass | PASS |
| 5 | HIGH | `src/app/api/auth/reset-pin/route.ts` | Changed from anon key `supabase` import to `createServiceRoleClient()` + local synchronous `hashPin` | PASS |
| 6 | LOW | `src/lib/csrf.ts` | Fixed as part of fix #2 (dead code now at least correct if ever used) | PASS |

### Task & Todo Core (4 fixed, 9 open)

| # | Severity | File | Fix Description | Verified |
|---|----------|------|-----------------|----------|
| 1 | HIGH | `src/hooks/useTodoItem.ts:239` | Snooze: changed `toISOString()` to `toISOString().split('T')[0]` for YYYY-MM-DD format | PASS |
| 2 | HIGH | `src/hooks/useTodoActions.ts:329` | `calculateNextDueDate`: changed `toISOString()` to `toISOString().split('T')[0]` | PASS |
| 3 | HIGH | `src/components/task-detail/useTaskDetail.ts:159` | Snooze: changed `toISOString()` to `toISOString().split('T')[0]` | PASS |
| 4 | HIGH | `src/hooks/useTodoOperations.ts` | Reordered `createTodoDirectly` before `addTodo` to fix stale closure; added `createTodoDirectly` to `addTodo`'s dependency array | PASS |

### Calendar & Kanban (2 fixed, 11 open)

| # | Severity | File | Fix Description | Verified |
|---|----------|------|-----------------|----------|
| 1 | HIGH | `src/components/calendar/CalendarView.tsx:188` | Timezone-safe category counts: replaced `new Date(todo.due_date)` + `isSameMonth` with string-based `substring(0,7)` comparison | PASS |
| 2 | HIGH | `src/components/calendar/CalendarDayCell.tsx` | Added `useEffect` + `useRef` to auto-close popup when `isDragActive` transitions from `true` to `false` | PASS |

### Analytics & Dashboard (1 fixed, 9 open)

| # | Severity | File | Fix Description | Verified |
|---|----------|------|-----------------|----------|
| 1 | CRITICAL | `src/app/api/analytics/cross-sell/route.ts` | Added `ALLOWED_FIELDS` whitelist to PATCH handler; filters incoming fields before `.update()`. Returns 400 if no valid fields remain. | PASS |

### Chat & Real-time (3 fixed, 11 open)

| # | Severity | File | Fix Description | Verified |
|---|----------|------|-----------------|----------|
| 1 | CRITICAL | `src/components/ChatAttachments.tsx` | Replaced `useState` side-effect initializer with proper `useEffect(() => {...}, [file])` for image previews. Fixed `useEffect` import. | PASS |
| 2 | HIGH | `src/components/chat/ChatInputBar.tsx:485` | Send button: changed `!newMessage.trim()` to `(!newMessage.trim() && !uploadedAttachment)` to allow attachment-only sends | PASS |
| 3 | MEDIUM | `src/components/WelcomeBackNotification.tsx:133` | Changed `onClose()` to `onCloseRef.current()` in `handleMouseLeave` to fix stale closure | PASS |

### API Routes & Lib (1 fixed, 11 open)

| # | Severity | File | Fix Description | Verified |
|---|----------|------|-----------------|----------|
| 1 | HIGH | `src/app/api/agencies/[agencyId]/invitations/route.ts` | Fixed operator precedence bug: extracted `origin` and `forwardedHost` into named variables with explicit ternary chain. Prevents `"https://null"` invitation URLs. | PASS |

---

## Cross-Module Issues

### 1. DashboardPage.tsx: React Hooks violation (conditional return before hooks)
- **File**: `src/components/views/DashboardPage.tsx`, lines 137-176+
- **Severity**: CRITICAL (latent -- not currently causing runtime errors)
- **Status**: NOT FIXED (intentionally deferred)
- **Flagged by**: Calendar/Kanban agent
- **Details**: `useState` is called on lines 126-127, then a conditional early return on lines 137-171 (`if (useNewDashboards)`), followed by `useEffect` (line 176) and multiple `useMemo` hooks (lines 182+) AFTER the return. This violates React's Rules of Hooks. It works by accident because `useNewDashboards` defaults to `true` and the legacy code path after the hooks is effectively dead code.
- **Risk**: If `useNewDashboards` ever toggles during the component's lifecycle, React would throw a hooks order error. Low practical risk since it is hardcoded to `true`.
- **Recommendation**: Split into two components or move all hooks above the conditional return.

### 2. No cross-agent file conflicts detected
- All 16 modified files were touched by exactly one agent each.
- No overlapping edits, no merge conflicts.
- `tsc --noEmit` and `npm run build` both pass cleanly after all 6 agents' changes.

### 3. API/Lib agent flagged pre-existing `useTodoOperations.ts` tsc error
- The API/Lib agent reported `TS2448` and `TS2454` errors in `src/hooks/useTodoOperations.ts`. However, the Task/Core agent's fix (reordering `createTodoDirectly` before `addTodo`) resolved this. The API/Lib agent likely ran `tsc` before the Task/Core agent applied their fix. Current state: **no tsc errors**.

### 4. Auth agent flagged pre-existing ChatAttachments.tsx tsc error
- The Auth agent reported `TS2686: 'React' refers to a UMD global` in `ChatAttachments.tsx`. The Chat/Realtime agent's fix (adding `useEffect` to the import destructure and removing `React.useEffect`) resolved this. Current state: **no tsc errors**.

---

## Open Items (not fixed)

### CRITICAL
| Issue | File | Scope | Description |
|-------|------|-------|-------------|
| DashboardPage hooks violation | `src/components/views/DashboardPage.tsx` | Calendar/Kanban | React hooks called after conditional early return -- violates Rules of Hooks. Works by accident because the legacy code path is dead. Needs component restructuring. |

### HIGH
| Issue | File | Scope | Description |
|-------|------|-------|-------------|
| `allowDangerousEmailAccountLinking` enabled | `src/app/api/auth/[...nextauth]/route.ts` | Auth | Both Google and Apple OAuth providers have this flag enabled, allowing email-based account hijacking across providers. |
| Customers API fetches ALL records | `src/app/api/customers/route.ts` | Analytics | No `.limit()` on customer/cross-sell queries -- OOM risk for large agencies. |
| useAnalyticsAPI missing CSRF tokens | `src/components/analytics/hooks/useAnalyticsAPI.ts` | Analytics | POST requests via `useApiCall` use plain `fetch()` without CSRF tokens. |
| Summary query empty string fallback | `src/app/api/analytics/cross-sell/route.ts:135` | Analytics | `.eq('agency_id', agencyId || '')` could match empty-string agency records. |

### MEDIUM
| Issue | File | Scope | Description |
|-------|------|-------|-------------|
| In-memory rate limiting (forgot-pin) | `src/app/api/auth/forgot-pin/route.ts` | Auth | Rate limiting uses local `Map`, not Redis -- resets on restart, not shared across instances. |
| LoginScreen leaks user list | `src/components/LoginScreen.tsx` | Auth | Fetches user roles, last_login to unauthenticated visitors. |
| LoginScreen leaks stats | `src/components/LoginScreen.tsx` | Auth | Fetches task counts and user activity without auth. |
| dualAuth returns true without validation | `src/lib/auth/dualAuth.ts` | Auth | `validateDualAuth` returns `authenticated: true` based on token presence alone. |
| securityMonitor incomplete return type | `src/lib/securityMonitor.ts` | Auth | Return type claims all event types present but omits zero-count types. |
| RegisterModal flickering color | `src/components/RegisterModal.tsx` | Auth | `getRandomUserColor()` called on every render. |
| SmartParseModal handleConfirm not memoized | `src/components/SmartParseModal.tsx` | Task | Unmemoized function in useEffect deps causes re-registration every render. |
| VirtualTodoList `any` types | `src/components/VirtualTodoList.tsx` | Task | Multiple callback props use `any` type. |
| VirtualTodoList missing props | `src/components/VirtualTodoList.tsx` | Task | Missing several `TodoItem` props -- tasks in virtual scroll have reduced functionality. |
| Division by zero in lead quality | `src/app/api/analytics/lead-quality/route.ts` | Analytics | Empty array division produces NaN. |
| useLiveMetrics wrong endpoint | `src/components/analytics/hooks/useAnalyticsRealtime.ts` | Analytics | Fetches GET on segmentation endpoint which returns wrong data structure. |
| SQL wildcards in customer name | `src/app/api/customers/[id]/route.ts` | Analytics | Customer name used in `ilike` without escaping `%` and `_`. |
| CSV parsed through Excel parser | `src/app/api/analytics/ai-upload/route.ts` | Analytics | CSV files routed through XLSX library instead of dedicated CSV parser. |
| Circular dependency in reconnection | `src/lib/realtimeReconnection.ts` | Chat | `handleStatusChange` and `startHeartbeat` have circular `useCallback` dependencies. |
| Client-provided createdBy overrides auth | `src/app/api/outlook/create-task/route.ts` | API/Lib | Request body can override authenticated identity. |
| Duplicate USER_COLORS | `src/app/api/invitations/accept/route.ts` | API/Lib | Different color arrays than canonical `constants.ts`. |
| Module-level Supabase client | `src/app/api/attachments/route.ts` | API/Lib | Shared client at module scope, inconsistent with per-request pattern. |
| Non-timing-safe API key comparison | `src/app/api/health/env-check/route.ts` | API/Lib | Uses `===` for API key comparison instead of `timingSafeEqual`. |

---

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **PASS** (0 errors) |
| `npm run build` | **PASS** (compiled in 24.8s, 65 routes, 0 errors) |
| Cross-agent file conflicts | **NONE** (16 files modified, each by exactly one agent) |
| New files introduced | **NONE** (only modifications to existing files) |
| All 17 fixes spot-checked | **ALL PASS** (code changes match reported descriptions) |
