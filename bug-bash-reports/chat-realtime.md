# Bug Bash Report: Chat, Notifications & Real-time

**Scope Agent:** Claude Opus 4.6
**Date:** 2026-02-09
**Files Audited:** 32
**Issues Found:** 14
**Fixes Applied:** 3 (CRITICAL: 1, HIGH: 2)

---

## Fixes Applied

### FIX-1: CRITICAL -- `useState` misused as side-effect initializer (ChatAttachments.tsx)

**File:** `src/components/ChatAttachments.tsx`, lines 96-110
**Severity:** CRITICAL
**Type:** Logic bug / React anti-pattern

**Problem:** The `AttachmentPreview` component used `useState(() => { ... })` to trigger a `FileReader` side-effect for generating image preview URLs. This is incorrect because:
1. `useState` with an initializer function only runs once on mount and is designed for computing initial state, not triggering async side effects.
2. The callback would never re-run when the `file` prop changed, causing stale previews.
3. No cleanup was performed for non-image files.

**Fix:** Replaced `useState()` side-effect with a proper `useEffect(() => { ... }, [file])` that:
- Tracks the `file` dependency and re-runs when the file changes
- Clears `previewUrl` for non-image files
- Added `useEffect` to the import statement (was using `React.useEffect` without React imported, which caused a tsc error)

---

### FIX-2: HIGH -- Send button disabled with attachment-only messages (ChatInputBar.tsx)

**File:** `src/components/chat/ChatInputBar.tsx`, line 485
**Severity:** HIGH
**Type:** Logic bug

**Problem:** The send button's `disabled` prop was `{!newMessage.trim() || disabled}`, which prevented users from sending messages that have an attachment but no text. The `handleSend()` function (line 190-193) explicitly supports attachment-only messages via `if ((!text && !uploadedAttachment) || !conversation) return;`, but the button UI did not match this logic. Users could only send attachment-only messages via Enter key, not by clicking the send button.

**Fix:** Changed disabled condition to `{(!newMessage.trim() && !uploadedAttachment) || disabled}` so the send button is enabled when an attachment is uploaded even without text.

---

### FIX-3: MEDIUM -- Stale closure in handleMouseLeave (WelcomeBackNotification.tsx)

**File:** `src/components/WelcomeBackNotification.tsx`, line 133
**Severity:** MEDIUM (upgraded from original assessment due to user-facing impact)
**Type:** Stale closure bug

**Problem:** `handleMouseLeave` called `onClose()` directly (the prop value captured at render time) instead of `onCloseRef.current()` (the ref that stays in sync with the latest prop). The component correctly creates `onCloseRef` (line 37) and keeps it synced (line 44), and the auto-dismiss timer (line 97) correctly uses `onCloseRef.current()`. But `handleMouseLeave` bypassed the ref, meaning if the parent re-rendered and changed the `onClose` callback between when the component mounted and when the user moves their mouse away, the stale callback would be invoked.

**Fix:** Changed `onClose()` to `onCloseRef.current()` in the `handleMouseLeave` timeout callback to match the pattern used in the auto-dismiss timer.

---

## Issues Found (Not Fixed)

### ISSUE-4: MEDIUM -- Circular dependency between handleStatusChange and startHeartbeat (realtimeReconnection.ts)

**File:** `src/lib/realtimeReconnection.ts`, lines 172-242
**Severity:** MEDIUM
**Type:** Circular dependency / potential infinite re-creation

`handleStatusChange` (line 172) calls `startHeartbeat()` on SUBSCRIBED status. `startHeartbeat` (line 222) has `handleStatusChange` in its `useCallback` dependency array (line 242). This creates a circular reference where changes to either function trigger re-creation of the other. In practice, React's memoization may prevent this from being an issue, but it creates unnecessary re-renders and violates the principle of clean dependency chains.

---

### ISSUE-5: LOW -- `withReconnection` utility is incomplete (realtimeReconnection.ts)

**File:** `src/lib/realtimeReconnection.ts`, lines 356-393
**Severity:** LOW
**Type:** Dead code / incomplete implementation

The `withReconnection` utility function has a `// TODO: Implement reconnection manager` comment at line 382. The function sets up a channel and returns cleanup, but does not actually integrate with the reconnection manager (`useRealtimeReconnection`). This is dead code that provides a false sense of reconnection support.

---

### ISSUE-6: LOW -- DockedChatPanel notifications/DND toggles are local-only (DockedChatPanel.tsx)

**File:** `src/components/chat/DockedChatPanel.tsx`, lines 90-91
**Severity:** LOW
**Type:** Logic inconsistency

`notificationsEnabled` and `isDndMode` in the docked panel are local `useState` values (lines 90-91) that are not connected to the parent ChatPanel's state. Toggling DND or notifications in the docked view has no effect on actual notification behavior, which is managed by the parent ChatPanel's `isDndMode` and `notificationsEnabled` states. This means the toggles in the header (lines 268-285) are non-functional UI elements.

---

### ISSUE-7: LOW -- Unused import `createClient` in reminders/process/route.ts

**File:** `src/app/api/reminders/process/route.ts`, line 11
**Severity:** LOW
**Type:** Dead import

`createClient` from `@supabase/supabase-js` is imported on line 11 and used in the GET handler (line 74), but the POST handler uses `processAllDueReminders` which internally creates its own client. The GET handler manually creates a client instead of using the shared service role client pattern. This is not a bug but an inconsistency.

---

### ISSUE-8: LOW -- `sanitizeUsername` strips spaces from multi-word names (chatUtils.ts)

**File:** `src/lib/chatUtils.ts`, line 88
**Severity:** LOW
**Type:** Logic limitation

`sanitizeUsername` only allows `[a-zA-Z0-9_]` which strips spaces from multi-word usernames (e.g., "Adrian Stier" becomes "AdrianStier"). The mention regex `/@(\w+)/g` in `extractMentions` also only captures `\w+` (no spaces), meaning multi-word usernames can never be properly mentioned. This is a systemic limitation but may be by design if all usernames are single-word.

---

### ISSUE-9: LOW -- FloatingChatButton unread count subscription does not filter by agency (FloatingChatButton.tsx)

**File:** `src/components/FloatingChatButton.tsx`, lines 155-164
**Severity:** LOW
**Type:** Logic gap

The real-time subscription for unread message counts listens to all messages in the `messages` table without agency filtering (line 159: `{ event: '*', schema: 'public', table: 'messages' }`). In a multi-agency environment, this could trigger unnecessary refetches when messages from other agencies are inserted. The initial fetch query (lines 100-104) also does not filter by agency_id.

---

### ISSUE-10: LOW -- NotificationModal channel name includes Date.now() (NotificationModal.tsx)

**File:** `src/components/NotificationModal.tsx`, line 214
**Severity:** LOW
**Type:** Minor resource concern

The notification modal creates channels with names like `notification-modal-${currentUserName}-${Date.now()}`. Since `Date.now()` changes on every render cycle, if the modal is rapidly opened/closed, the debounce (line 209) may not fully prevent duplicate channels. The existing debounce at 100ms and the `channelRef.current` guard should mitigate this, but the `Date.now()` in the channel name means old channel names can never be reused, potentially accumulating in Supabase's channel registry.

---

### ISSUE-11: LOW -- `getSupabase()` in push-send/route.ts creates new client per request (push-send/route.ts)

**File:** `src/app/api/push-send/route.ts`, lines 31-38
**Severity:** LOW
**Type:** Performance

`getSupabase()` creates a new Supabase client on every API call. While Supabase clients are lightweight, reusing a module-level client (similar to the `webpush` initialization pattern already used in the same file) would be more efficient for high-traffic push notification endpoints.

---

### ISSUE-12: LOW -- ChatPanel message subscription does not filter by conversation (ChatPanel.tsx)

**File:** `src/components/ChatPanel.tsx`, lines 755-759
**Severity:** LOW
**Type:** Performance / design choice

The messages real-time subscription listens to ALL messages in the agency (or all messages if no agency), not just the current conversation. While this is intentional (it enables unread counts across conversations and the conversation list), it means every message insert/update/delete triggers the callback handler regardless of relevance to the current view. For agencies with high chat volume, this could cause unnecessary processing.

---

### ISSUE-13: LOW -- Missing `React` import warning fixed as part of FIX-1 (ChatAttachments.tsx)

**File:** `src/components/ChatAttachments.tsx`, line 3
**Severity:** LOW (was CRITICAL before fix)
**Type:** Type error

The previous bug fix (from the earlier session) introduced `React.useEffect` without `React` being imported, which caused `tsc` to fail with: `error TS2686: 'React' refers to a UMD global, but the current file is a module`. This was caught and fixed by adding `useEffect` to the destructured imports from `'react'` and changing `React.useEffect` to `useEffect`.

---

### ISSUE-14: LOW -- `handleClick` and `handleClose` in WelcomeBackNotification use prop directly (WelcomeBackNotification.tsx)

**File:** `src/components/WelcomeBackNotification.tsx`, lines 114-122
**Severity:** LOW
**Type:** Inconsistency

The `handleClick` (line 115) and `handleClose` (line 120) functions call `onClose()` and `onViewProgress()` directly from props rather than through refs, unlike the timer-based callbacks. This is technically fine because these are synchronous click handlers that always use the latest prop value from the current render. However, the inconsistency with the timer-based callbacks (which correctly use refs) could confuse future maintainers. Not a bug, just a style note.

---

## Summary by Severity

| Severity | Count | Fixed |
|----------|-------|-------|
| CRITICAL | 1     | 1     |
| HIGH     | 1     | 1     |
| MEDIUM   | 2     | 1     |
| LOW      | 10    | 0     |
| **Total**| **14**| **3** |

## Files Modified

1. `src/components/ChatAttachments.tsx` -- FIX-1 (useState to useEffect) + FIX-13 (import fix)
2. `src/components/chat/ChatInputBar.tsx` -- FIX-2 (send button disabled logic)
3. `src/components/WelcomeBackNotification.tsx` -- FIX-3 (stale closure)

## Type Check

```
npx tsc --noEmit  # PASS (0 errors)
```

## Files Audited (32 total)

### Components (22 files)
- `src/components/chat/index.ts`
- `src/components/chat/TaskAssignmentCard.tsx`
- `src/components/chat/ChatConversationList.tsx`
- `src/components/chat/ChatPanelHeader.tsx`
- `src/components/chat/ChatMessageList.tsx`
- `src/components/chat/ChatInputBar.tsx`
- `src/components/chat/DockedChatPanel.tsx`
- `src/components/ChatPanel.tsx`
- `src/components/FloatingChat.tsx`
- `src/components/FloatingChatButton.tsx`
- `src/components/ChatAttachments.tsx`
- `src/components/NotificationModal.tsx`
- `src/components/NotificationPermissionBanner.tsx`
- `src/components/PushNotificationSettings.tsx`
- `src/components/PresenceIndicator.tsx`
- `src/components/PresenceBadge.tsx`
- `src/components/TypingIndicator.tsx`
- `src/components/ReadReceipts.tsx`
- `src/components/EditingIndicator.tsx`
- `src/components/VoiceRecordingIndicator.tsx`
- `src/components/WelcomeBackNotification.tsx`

### API Routes (5 files)
- `src/app/api/push-notifications/send/route.ts`
- `src/app/api/push-send/route.ts`
- `src/app/api/push-subscribe/route.ts`
- `src/app/api/reminders/route.ts`
- `src/app/api/reminders/process/route.ts`

### Library / Business Logic (5 files)
- `src/lib/chatUtils.ts`
- `src/lib/realtimeReconnection.ts`
- `src/lib/webPushServer.ts`
- `src/lib/webPushService.ts`
- `src/lib/taskNotifications.ts`
- `src/lib/reminderService.ts`
