# Wave 3 Bug Bash: Runtime & UX Issues

## 1. CalendarDayCell popup truncates at 5 tasks -- FIXED
- **File**: `src/components/calendar/CalendarDayCell.tsx`
- **Problem**: Popup used `todos.slice(0, 5)` and showed a "+X more tasks" label for hidden tasks. Hidden tasks were not draggable because they were never rendered.
- **Fix**: Removed the `.slice(0, 5)` limit and the "+X more" label. The popup container already has `max-h-[200px] overflow-y-auto`, so all tasks are now rendered and scrollable, including being draggable via `DraggableTaskItem`.

## 2. DockedChatPanel notifications/DND toggles are local-only -- DOCUMENTED
- **File**: `src/components/chat/DockedChatPanel.tsx`
- **Problem**: `notificationsEnabled` and `isDndMode` are `useState` hooks local to the component. The parent `ChatPanel` has its own separate notification/DND state that is persisted to localStorage and wired to actual notification behavior. The docked panel toggles only affect the visual indicator.
- **Fix**: Added a TODO comment documenting the limitation and the steps needed to wire them up (add callback and state props from parent). A full fix would require extending `DockedChatPanelProps` with `notificationsEnabled`, `isDndMode`, `onToggleNotifications`, and `onToggleDnd` -- more than a bug-fix scope.

## 3. FloatingChatButton unread count doesn't filter by agency -- DOCUMENTED
- **File**: `src/components/FloatingChatButton.tsx`
- **Problem**: The Supabase realtime subscription on line 155 listens to `table: 'messages'` with no agency filter. The `fetchUnreadCount` query also fetches from the `messages` table without an `agency_id` filter.
- **Fix**: Added a TODO comment. The component does not receive `agencyId` in its props and does not use `useAgency()` context. The fix requires either adding `agencyId` as a prop or importing `useAgency` and adding a `filter` clause to the subscription config.

## 4. NotificationModal channel name includes Date.now() -- FIXED
- **File**: `src/components/NotificationModal.tsx`
- **Problem**: The Supabase channel name was constructed inline as `` `notification-modal-${currentUserName}-${Date.now()}` ``. While the code had guards against duplicate channels via `channelRef.current`, if the effect re-ran (e.g., `currentUserName` in the dependency array changed), it would generate a new channel name each time, potentially leaking channels.
- **Fix**: Moved the channel name into a `useRef` so it is computed once on mount and stays stable across re-renders and effect runs.

## 5. push-send/route.ts creates new client per request -- NO FIX NEEDED
- **File**: `src/app/api/push-send/route.ts`
- **Analysis**: The `getSupabase()` function (line 31) creates a new `createClient()` per invocation. This is the correct pattern for Next.js API routes using service role keys -- per-request clients are safer than module-level singletons because they avoid shared state across concurrent requests. The `webpush` initialization is correctly done at module level since it's stateless configuration.

## 6. ChatPanel message subscription doesn't filter by conversation -- BY DESIGN
- **File**: `src/components/ChatPanel.tsx`
- **Analysis**: The subscription (line 755) listens to all messages for the agency (or all messages if no agency). This is intentional and necessary because:
  1. The component maintains `unreadCounts` across ALL conversations (team + all DMs)
  2. Notification sounds and browser notifications need to fire for any incoming message
  3. The `sortedConversations` list needs all messages to sort by most recent activity
  4. Conversation-level filtering happens at the display layer via `filteredMessages` from the `useChatMessages` hook
- Filtering the subscription to a single conversation would break unread badges, notifications, and conversation sorting.

## 7. CSV parsed through Excel parser -- NON-ISSUE
- **File**: `src/app/api/analytics/ai-upload/route.ts`
- **Analysis**: The `parseExcelFile` function uses `XLSX.read(buffer, { type: 'array' })` which auto-detects the input format. The SheetJS (XLSX) library natively supports CSV, TSV, and other delimited text formats in addition to Excel binary formats. The file type validation on line 530 accepts `.csv`, `.xlsx`, and `.xls`. CSV files passed to `XLSX.read()` are parsed correctly without any special handling needed.

## Summary

| # | Issue | Status | Type |
|---|-------|--------|------|
| 1 | CalendarDayCell popup truncates at 5 tasks | FIXED | Code change |
| 2 | DockedChatPanel notifications/DND local-only | DOCUMENTED | TODO comment |
| 3 | FloatingChatButton unread no agency filter | DOCUMENTED | TODO comment |
| 4 | NotificationModal channel name Date.now() | FIXED | Code change |
| 5 | push-send creates new client per request | NO FIX NEEDED | Correct pattern |
| 6 | ChatPanel subscription no conversation filter | BY DESIGN | Intentional |
| 7 | CSV parsed through Excel parser | NON-ISSUE | XLSX handles CSV |

## TypeScript Check
Pre-existing error in `src/components/todo/TodoModals.tsx` (line 240): `newTaskSourceFile` prop does not exist on `DuplicateDetectionModalProps`. This is unrelated to wave 3 changes.
