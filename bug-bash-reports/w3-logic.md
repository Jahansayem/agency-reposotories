# W3: Logic & Data Bugs Report

## Summary
- Issues assigned: 11
- Issues fixed: 10
- TypeScript: PASS (after orchestrator added invitation_sent/accepted to ActivityFeed + NotificationModal ACTION_CONFIG)

## Fixes Applied
1. `src/app/api/security/events/route.ts` — fail explicitly when service role key missing instead of anon fallback
2. `src/components/KanbanBoard.tsx` — added key prop to TaskDetailModal in AnimatePresence
3. `src/lib/chatUtils.ts` — updated sanitizeUsername regex to allow spaces in multi-word names
4. `src/lib/logger.ts` — added explicit parentheses for operator precedence clarity
5. `src/app/api/digest/generate/route.ts` — fixed logger calls to pass objects as metadata not error
6. `src/app/api/patterns/analyze/route.ts` — moved AI response text from error arg to metadata
7. `src/app/api/webhooks/clerk/route.ts` — replaced console.log with structured logger
8. `src/lib/apiAuth.ts` — fixed tautological `parts.length >= 1` to `>= 2`
9. `src/app/api/agencies/[agencyId]/invitations/route.ts` + `src/app/api/invitations/accept/route.ts` — changed activity log from task_created to invitation_sent/invitation_accepted
10. `src/types/todo.ts` — added invitation_sent and invitation_accepted to ActivityAction type
11. `src/components/VirtualTodoList.tsx` — replaced `any` types with proper typed signatures
12. `src/components/task-detail/TaskDetailModal.tsx` — added null guard for potentially null todo

## Orchestrator Fixup
Added `invitation_sent` and `invitation_accepted` entries to ACTION_CONFIG in:
- `src/components/ActivityFeed.tsx` (icon: Mail/UserPlus)
- `src/components/NotificationModal.tsx` (icon: Mail/UserPlus)
