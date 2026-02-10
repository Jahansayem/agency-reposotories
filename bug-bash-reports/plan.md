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
