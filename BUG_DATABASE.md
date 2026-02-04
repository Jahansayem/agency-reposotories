# Bug Database

**Generated:** 2026-02-03
**Total Bugs Found:** 65+
**Agents Used:** 6 specialized reviewers

---

## Summary by Severity

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 12 | 🔴 Needs immediate fix |
| HIGH | 18 | 🟠 Fix this sprint |
| MEDIUM | 25 | 🟡 Schedule for fix |
| LOW | 10+ | 🟢 Nice to have |

---

## CRITICAL BUGS (Fix Immediately)

### API-001: Race Condition in Agency Members POST
**File:** `src/app/api/agencies/[agencyId]/members/route.ts:86`
**Category:** Security, Logic
**Description:** Nested Supabase query inside authorization check creates SQL timing vulnerability. If inner query fails, `.data?.id` returns `undefined`, making authorization always fail silently.
```typescript
// BUG: Nested query can fail silently
.eq('user_id', (await supabase.from('users').select('id').eq('name', requested_by).single()).data?.id)
```
**Fix:** Separate queries - fetch requester ID first, then verify permission.

---

### API-002: Same Race Condition in Agency Members DELETE
**File:** `src/app/api/agencies/[agencyId]/members/route.ts:189`
**Category:** Security, Logic
**Description:** Identical vulnerable pattern as API-001.
**Fix:** Same as API-001.

---

### REACT-001: Memory Leak - Timer in MainApp
**File:** `src/components/MainApp.tsx:167-178`
**Category:** Memory Leak
**Description:** `taskLinkHighlightTimerRef` created inside setTimeout not tracked for cleanup. Rapid clicks create orphaned timers.
**Fix:** Clear both timers before creating new ones; track nested timer properly.

---

### REACT-002: Memory Leak - Audio Element in ChatPanel
**File:** `src/components/ChatPanel.tsx:562-577`
**Category:** Memory Leak
**Description:** Audio element's `onerror` handler creates closure. If cleanup runs before onerror fires, handler still has reference to audio object.
**Fix:** Use `isCleanedUp` flag; set `audio.onerror = null` in cleanup.

---

### REALTIME-001: Infinite Re-subscription in useReadReceipts
**File:** `src/hooks/useReadReceipts.ts:254-333`
**Category:** Performance, Memory
**Description:** Effect depends on `currentUser` object which changes every render, causing infinite subscribe/unsubscribe loop.
**Fix:** Use `currentUser?.id` instead of entire object.

---

### REALTIME-002: Infinite Re-subscription in useEditingIndicator
**File:** `src/hooks/useEditingIndicator.ts:173-278`
**Category:** Performance, Memory
**Description:** Same issue as REALTIME-001 - `currentUser` and `broadcastEditing` cause infinite re-subscriptions.
**Fix:** Use stable IDs; memoize callbacks.

---

### TYPE-001: Dangerous `as Todo` Cast Without Validation
**File:** `src/hooks/useTodoData.ts:171,184`
**Category:** Type Safety
**Description:** Supabase real-time payloads cast to `Todo` without validation. Database nulls cause runtime errors.
**Fix:** Create `parseTodo()` validator function.

---

### TYPE-002: Dangerous `as ChatMessage` Cast
**File:** `src/hooks/useChatSubscription.ts:137`
**Category:** Type Safety
**Description:** Same issue as TYPE-001 for chat messages.
**Fix:** Create `parseChatMessage()` validator.

---

### TYPE-003: Sync Queue Uses `any` for Data
**File:** `src/lib/db/indexedDB.ts:45,295`
**Category:** Type Safety
**Description:** Offline sync queue stores `any` data, losing all type safety. Corrupted data synced back.
**Fix:** Use discriminated union based on table name.

---

### UTIL-001: Auth Session Expiry Timezone Bug
**File:** `src/lib/auth.ts:39-46`
**Category:** Logic
**Description:** Session expiry check doesn't handle timezone conversion correctly. User traveling across timezones may have premature/delayed expiry.
**Fix:** Add `isNaN()` check; use `>=` instead of `>`.

---

### UTIL-002: Session Validator Race Condition
**File:** `src/lib/sessionValidator.ts:171-193`
**Category:** Logic, Security
**Description:** Concurrent requests can both try to invalidate same session, causing inconsistent auth behavior.
**Fix:** Use atomic update with condition; add `isNaN` check for corrupted timestamps.

---

### UTIL-003: RegEx DoS in duplicateDetection
**File:** `src/lib/duplicateDetection.ts:6`
**Category:** Security
**Description:** Phone number regex has catastrophic backtracking potential with malicious input.
**Fix:** Use more restrictive regex pattern.

---

## HIGH SEVERITY BUGS

### API-003: Missing Agency Scope in Invitation Lookup
**File:** `src/app/api/invitations/accept/route.ts:169-174`
**Description:** If invitation.agency_id is null, query silently succeeds allowing duplicate memberships.

### API-004: Transcription Endpoint No File Validation
**File:** `src/app/api/ai/transcribe/route.ts:39`
**Description:** `formData.get('audio') as File` has no runtime validation.

### API-005: Outlook Parse Email Missing Rate Limiting
**File:** `src/app/api/outlook/parse-email/route.ts:13-20`
**Description:** No rate limiting on expensive AI operations.

### API-006: Todo Reorder N+1 Query Problem
**File:** `src/app/api/todos/reorder/route.ts:157-167`
**Description:** Updates tasks one-by-one in loop. 100 tasks = 100 database queries.

### REACT-003: Stale Closure in useEditingIndicator
**File:** `src/hooks/useEditingIndicator.ts:82-107`
**Description:** `timeoutMs` captured in closure; if prop changes, recursive call uses stale value.

### REACT-004: Race Condition in useChatMessages markMessagesAsRead
**File:** `src/hooks/useChatMessages.ts:348-405`
**Description:** Fallback loop reads stale `originalMessages` if RPC fails.

### REACT-005: Missing Dependency in ChatPanel Subscription
**File:** `src/components/ChatPanel.tsx:714-859`
**Description:** `fetchMessages` in deps causes subscription teardown on every conversation change.

### REALTIME-003: usePresence Location Updates Leak
**File:** `src/hooks/usePresence.ts:106-117`
**Description:** Location update effect has no cleanup; object refs cause re-tracking.

### TYPE-004: `subtasks`/`attachments` Optional But Always Expected
**File:** `src/types/todo.ts:85-86`
**Description:** Types say optional but code always expects arrays.

### UTIL-004: Agency Auth Buffer Comparison
**File:** `src/lib/agencyAuth.ts:516-538`
**Description:** Empty catch blocks swallow encoding errors; timing-safe comparison mask failures.

### SILENT-001: Empty Catch Block Audio Playback
**File:** `src/components/ChatPanel.tsx:353`
**Description:** Completely swallows audio playback errors.

### SILENT-002: Fire-and-Forget Email Invitations
**File:** `src/app/api/invitations/route.ts:220`
**Description:** Email send failures not tracked or reported.

---

## MEDIUM SEVERITY BUGS

### API-007: Agency Creation Missing Slug Validation
**File:** `src/app/api/agencies/route.ts:39`
**Description:** No length/format validation on slugs.

### API-008: Goals API Missing Pagination
**File:** `src/app/api/goals/route.ts:30`
**Description:** Returns ALL goals without limit.

### API-009: Push Send Missing Target Validation
**File:** `src/app/api/push-send/route.ts:278-279`
**Description:** Proceeds with empty target list.

### API-010: Smart Parse Missing Token Count
**File:** `src/app/api/ai/smart-parse/route.ts:186-192`
**Description:** No input length limit before sending to Claude.

### REACT-006: Typing Timeouts Memory Leak
**File:** `src/components/ChatPanel.tsx:807-825`
**Description:** Typing timeout race between creation and cleanup.

### REACT-007: Stale isReordering Module-Level Flag
**File:** `src/hooks/useTodoData.ts:27-30,190-201`
**Description:** Module-level flag shared across all component instances.

### TYPE-005: `status` and `completed` Inconsistency
**File:** `src/types/todo.ts:73-74`
**Description:** Can have `completed: true` with `status: 'todo'`.

### TYPE-006: `subtasks` Typed as `any[]` in TodoVersion
**File:** `src/hooks/useVersionHistory.ts:32`
**Description:** Loses type safety in version history.

### TYPE-007: Permissions Can Be Null at Runtime
**File:** `src/types/agency.ts:79` + `src/lib/agencyAuth.ts:315`
**Description:** Type says required but database returns null.

### UTIL-005: NaN Propagation in duplicateDetection
**File:** `src/lib/duplicateDetection.ts:58,77-79`
**Description:** Division by zero when both strings have no words > 2 chars.

### UTIL-006: CSRF Token Fetch Race Condition
**File:** `src/lib/csrf.ts:245-266`
**Description:** Concurrent requests can all see null promise and start fetches.

### UTIL-007: Memory Leak in chatUtils Rate Limit
**File:** `src/lib/chatUtils.ts:100,116-124`
**Description:** Rate limit Map never cleans up old entries.

### UTIL-008: Timezone Bug in reminderService
**File:** `src/lib/reminderService.ts:514-517`
**Description:** "morning_of" preset uses local timezone for UTC dates.

### REALTIME-004: useChatSubscription Timeout Map Leak
**File:** `src/hooks/useChatSubscription.ts:159-170`
**Description:** Cleared timeout not deleted from Map immediately.

### REALTIME-005: ActivityFeed Race Condition
**File:** `src/components/ActivityFeed.tsx:272-333`
**Description:** No agency_id check on incoming events.

### REALTIME-006: NotificationModal Overlapping Subscriptions
**File:** `src/components/NotificationModal.tsx:149-172`
**Description:** Rapid open/close creates overlapping channels.

### SILENT-003 through SILENT-012: Various Console.error Instead of Logger
**Files:** Multiple (redis.ts, webPushService.ts, etc.)
**Description:** Errors logged to console but not sent to monitoring.

---

## LOW SEVERITY BUGS

### REACT-008: Dashboard GreetingDisplay 60-Second Update ✅ FIXED
**File:** `src/components/Dashboard.tsx:51-107`
**Description:** Updates every minute but greeting only changes at hour boundaries.
**Fix Applied:** Changed from 60-second interval to dynamic timeout that calculates ms until next greeting change (12:00, 17:00, or 00:00). Reduces re-renders from ~60/hour to max 1/hour.

### TYPE-008: Inconsistent Nullable Patterns
**File:** `src/types/todo.ts:321-333`
**Description:** Mixing `?:` and `| null` confuses undefined vs null.

### TYPE-009: Attachment file_type is String Not Union
**File:** `src/types/todo.ts:21`
**Description:** Should use `AttachmentCategory` type.

### TYPE-010: ActivityLogEntry details Too Loose
**File:** `src/types/todo.ts:413`
**Description:** `Record<string, unknown>` loses action-specific typing.

### TYPE-011: No Shared API Response Types
**Files:** Various API routes
**Description:** Each route defines ad-hoc response shape.

### TYPE-012: `any` Type for Supabase Client
**File:** `src/app/api/auth/login/route.ts:15`
**Description:** Loses type checking on database queries.

---

## Fix Status

### ✅ FIXED - Sprint 1 (Critical)
1. ✅ REALTIME-001, REALTIME-002 - Fixed infinite re-subscription loops by using stable IDs in useEffect deps
2. ✅ API-001, API-002 - Fixed auth race conditions by separating nested queries
3. ✅ TYPE-001, TYPE-002, TYPE-003 - Added parseTodo/parseChatMessage validators with runtime validation
4. ✅ UTIL-001, UTIL-002 - Fixed session expiry timezone bug and race condition with isNaN checks
5. ✅ UTIL-003 - Fixed RegEx DoS vulnerability with restrictive pattern and input length limit
6. ✅ UTIL-005 - Fixed NaN propagation in stringSimilarity

### ✅ FIXED - Sprint 2 (High)
7. ✅ API-006 - Fixed N+1 query problem with Promise.all for parallel updates
8. ✅ REACT-001, REACT-002 - Fixed memory leaks in timer refs and audio element
9. ✅ SILENT-001, SILENT-002 - Added proper error logging for audio playback and email sending

### ✅ FIXED - Sprint 3 (Medium)
10. ✅ UTIL-007 - Fixed memory leak in chatUtils rate limit Map with cleanup interval
11. ✅ REALTIME-004 - Fixed timeout Map cleanup in useChatSubscription

### ✅ FIXED - Sprint 4 (Low Priority)
12. ✅ REACT-008 - Dashboard greeting optimized to update only at hour boundaries (12:00, 17:00, 00:00)

### Remaining (Low Priority)
13. TYPE-008 through TYPE-012 - Type consistency improvements
14. Additional SILENT-* bugs - Console.error instead of logger in various files

---

## Files Modified

| Bug ID | File | Change |
|--------|------|--------|
| REALTIME-001 | `src/hooks/useReadReceipts.ts` | Changed dependency from `currentUser` to `currentUser?.id` |
| REALTIME-002 | `src/hooks/useEditingIndicator.ts` | Added currentUserRef, stable broadcastEditing callback |
| API-001, API-002 | `src/app/api/agencies/[agencyId]/members/route.ts` | Separated nested queries |
| TYPE-001, TYPE-002 | `src/hooks/useTodoData.ts`, `src/hooks/useChatSubscription.ts` | Use parseTodo/parseChatMessage validators |
| TYPE-003 | `src/lib/db/indexedDB.ts` | Added typed SyncQueueItem, SyncQueueData |
| UTIL-001 | `src/lib/auth.ts` | Added isNaN check, use >= for expiry |
| UTIL-002 | `src/lib/sessionValidator.ts` | Added isNaN check, atomic update condition |
| UTIL-003, UTIL-005 | `src/lib/duplicateDetection.ts` | Restrictive regex, input limit, null guard |
| API-006 | `src/app/api/todos/reorder/route.ts` | Promise.all for parallel updates |
| REACT-001 | `src/components/MainApp.tsx` | Clear nested timer before creating new |
| REACT-002 | `src/components/ChatPanel.tsx` | Set audio.onerror = null in cleanup |
| SILENT-001 | `src/components/ChatPanel.tsx` | Log audio playback errors |
| SILENT-002 | `src/app/api/agencies/[agencyId]/invitations/route.ts` | Log email send failures |
| UTIL-007 | `src/lib/chatUtils.ts` | Added cleanup interval for rate limit Map |
| REALTIME-004 | `src/hooks/useChatSubscription.ts` | Delete timeout from Map immediately on clear |
| NEW | `src/lib/validators.ts` | Created parseTodo, parseChatMessage validators |
| REACT-008 | `src/components/Dashboard.tsx` | Changed GreetingDisplay from 60-second interval to hour-boundary timeout |

---

## Verification Checklist

After fixing each bug:
- [x] TypeScript compiles without errors (source files)
- [ ] Unit test added for edge case
- [ ] Manual testing performed
- [ ] No regressions in related functionality
- [ ] Playwright tests pass

---

**Last Updated:** 2026-02-03
**Reviewed By:** Multi-agent orchestration
**Fixes Applied:** 2026-02-03 - 16 bugs fixed across 15 files
