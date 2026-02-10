# Bug Bash Plan

## Scope Splits (6 parallel agents)

### 1. Auth & Security (`auth-security`)
- `src/components/auth/`, `src/components/LoginScreen.tsx`, `src/components/RegisterModal.tsx`
- `src/app/api/auth/`, `src/app/api/csrf/`, `src/app/api/security/`
- `src/lib/auth/`, `src/lib/auth.ts`, `src/lib/secureAuth.ts`, `src/lib/csrf.ts`
- `src/lib/authRateLimit.ts`, `src/lib/serverLockout.ts`, `src/lib/sessionValidator.ts`
- `src/lib/fieldEncryption.ts`, `src/lib/securityMonitor.ts`, `src/lib/promptSanitizer.ts`
- Focus: Auth flows, CSRF, rate limiting, session handling, input sanitization, encryption

### 2. Task & Todo Core (`task-core`)
- `src/components/AddTodo.tsx`, `src/components/AddTaskModal.tsx`, `src/components/TodoList.tsx`
- `src/components/TodoItem.tsx`, `src/components/todo/`, `src/components/todo-item/`
- `src/components/task/`, `src/components/task-detail/`, `src/components/SortableTodoItem.tsx`
- `src/app/api/todos/`, `src/store/`, `src/hooks/`
- Focus: CRUD operations, drag-and-drop, sorting, filtering, real-time sync, store logic

### 3. Calendar & Kanban Views (`calendar-kanban`)
- `src/components/calendar/` (all files)
- `src/components/kanban/`, `src/components/KanbanBoard.tsx`
- `src/components/views/`
- Focus: View switching, drag-drop rescheduling, render correctness, animation states

### 4. Analytics & Dashboard (`analytics-dashboard`)
- `src/components/analytics/`, `src/components/dashboard/`, `src/components/Dashboard.tsx`
- `src/components/customer/`, `src/components/CustomerEmailModal.tsx`
- `src/app/api/analytics/`, `src/app/api/dashboard/`, `src/app/api/customers/`
- `src/lib/analytics/`, `src/lib/segmentation.ts`, `src/lib/allstate-parser.ts`
- Focus: Data calculations, API responses, chart rendering, segmentation logic

### 5. Chat, Notifications & Real-time (`chat-realtime`)
- `src/components/chat/`, `src/components/ChatPanel.tsx`, `src/components/FloatingChat.tsx`
- `src/components/NotificationModal.tsx`, `src/components/PushNotificationSettings.tsx`
- `src/app/api/push-notifications/`, `src/app/api/push-send/`, `src/app/api/push-subscribe/`
- `src/lib/chatUtils.ts`, `src/lib/realtimeReconnection.ts`, `src/lib/webPushServer.ts`
- `src/lib/taskNotifications.ts`, `src/lib/reminderService.ts`
- Focus: Message handling, presence, WebSocket reconnection, push notification flow

### 6. API Routes & Shared Lib (`api-lib`)
- `src/app/api/agencies/`, `src/app/api/ai/`, `src/app/api/attachments/`
- `src/app/api/goals/`, `src/app/api/invitations/`, `src/app/api/templates/`
- `src/app/api/opportunities/`, `src/app/api/outlook/`, `src/app/api/reminders/`
- `src/lib/validation.ts`, `src/lib/validators.ts`, `src/lib/apiErrors.ts`
- `src/lib/agencyAuth.ts`, `src/lib/apiAuth.ts`, `src/lib/supabaseClient.ts`
- Focus: Route handlers, auth wrappers, error handling, input validation, DB queries

## Agent Instructions (per scope)
1. Read all files in scope systematically
2. Look for: type errors, logic bugs, null/undefined risks, race conditions, security issues, dead code, broken imports
3. Run `npx tsc --noEmit` after any fixes
4. Write findings to `bug-bash-reports/<scope-name>.md` with severity ratings
5. Fix CRITICAL and HIGH bugs directly; document MEDIUM and LOW

## Review Agent
- Spawned after all scope agents complete
- Reads all 6 reports
- Runs `npx tsc --noEmit` and `npm run build`
- Checks for cross-module issues (shared type changes, import breaks)
- Writes final summary to `bug-bash-reports/summary.md`

---

# Wave 2: Fix Remaining Open Items

## Scope Splits (4 agents)

### W2-1. DashboardPage Hooks + Auth Security (`w2-hooks-auth`)
- Fix DashboardPage.tsx hooks violation (CRITICAL)
- Fix allowDangerousEmailAccountLinking (HIGH)
- Fix dualAuth returning true without validation (MEDIUM)
- Fix LoginScreen user list/stats leaks (MEDIUM)
- Fix RegisterModal flickering color (MEDIUM)
- Fix non-timing-safe API key comparison in health check (MEDIUM)

### W2-2. Analytics API Hardening (`w2-analytics`)
- Fix customers API unbounded fetch (HIGH)
- Fix useAnalyticsAPI missing CSRF tokens (HIGH)
- Fix cross-sell summary empty string fallback (HIGH)
- Fix division by zero in lead quality (MEDIUM)
- Fix useLiveMetrics wrong endpoint (MEDIUM)
- Fix SQL wildcards in customer name (MEDIUM)

### W2-3. Task & Chat Fixes (`w2-task-chat`)
- Fix SmartParseModal handleConfirm not memoized (MEDIUM)
- Fix circular dependency in realtimeReconnection (MEDIUM)
- Fix client-provided createdBy overrides auth in outlook (MEDIUM)
- Fix duplicate USER_COLORS (MEDIUM)

### W2-4. Infrastructure Fixes (`w2-infra`)
- Fix in-memory rate limiting in forgot-pin (MEDIUM)
- Fix module-level Supabase client in attachments (MEDIUM)
- Fix CSV parsed through Excel parser (MEDIUM)
- Fix securityMonitor incomplete return type (MEDIUM)

---

# Wave 3: Remaining MEDIUM + LOW Items

## Scope Splits (3 agents)

### W3-1. Dead Code & Unused Imports (`w3-dead-code`)
Items: 1, 2, 4, 5, 6, 7, 8, 11, 13, 19, 20, 26

### W3-2. Logic & Data Bugs (`w3-logic`)
Items: 3, 10, 14, 21, 22, 23, 24, 25, 27
Plus remaining MEDIUM: VirtualTodoList any types, TaskDetailModal non-null assertion

### W3-3. Runtime & UX Issues (`w3-runtime`)
Items: 9, 12, 15, 16, 17, 18
Plus remaining MEDIUM: CSV parsed through Excel parser
