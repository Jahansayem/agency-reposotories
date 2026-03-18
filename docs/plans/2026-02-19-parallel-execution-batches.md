# Customer History - Parallel Execution Plan

## 🎯 Overview

This implementation is divided into **4 parallel sessions** that can run simultaneously after Session 1 (Foundation) completes.

**Dependency Flow:**
```
Session 1 (Foundation) → MUST COMPLETE FIRST
    ↓
    ├─→ Session 2 (Backend APIs)
    ├─→ Session 3 (Frontend UI)
    ├─→ Session 4 (Retroactive Linking)
    └─→ Session 5 (Testing & Docs)
```

**Total Time Estimate:**
- Sequential: ~7-8 hours
- Parallel (4 sessions): ~3-4 hours

---

## Session 1: Database Foundation (CRITICAL PATH - DO FIRST)

**Duration:** ~60 minutes
**Dependencies:** None
**Blocks:** All other sessions

### Tasks:
- ✅ Task 1: Create `customer_interactions` table
- ✅ Task 2: Add `completed_at` to `todos` table
- ✅ Task 3: Add task completion logging trigger
- ✅ Task 4: Add contact history logging trigger

### Deliverables:
- Migration file: `supabase/migrations/20260219_customer_interactions.sql`
- All triggers working and tested
- Database ready for API development

---

## Session 2: Backend APIs (Run after Session 1)

**Duration:** ~45 minutes
**Dependencies:** Session 1 complete
**Blocks:** Session 3, Session 5

### Tasks:
- ✅ Task 5: GET `/api/customers/[id]/history` endpoint
- ✅ Task 6: POST `/api/interactions/log` endpoint

### Deliverables:
- API routes created and tested
- Types defined in `src/types/interaction.ts`
- Manual testing with curl verified

---

## Session 3: Frontend UI (Run after Session 2)

**Duration:** ~60 minutes
**Dependencies:** Session 2 complete
**Blocks:** Session 5 (testing)

### Tasks:
- ✅ Task 7: Create `useCustomerHistory` hook
- ✅ Task 8: Build `InteractionTimeline` component
- ✅ Task 9: Update `CustomerDetailPanel` with History section

### Deliverables:
- Working timeline view in customer panel
- Real-time interaction display
- Load more pagination

---

## Session 4: Retroactive Linking (Run after Session 1)

**Duration:** ~75 minutes
**Dependencies:** Session 1 complete
**Blocks:** Session 5 (testing)

### Tasks:
- ✅ Task 10: Build matching algorithm with tests
- ✅ Task 11: Create admin API endpoints
- ✅ Task 12: Build admin UI at `/customers/link-history`

### Deliverables:
- Matching algorithm with unit tests passing
- Admin endpoints working
- Functional review UI for approving links

---

## Session 5: Testing & Documentation (Run after Sessions 2-4)

**Duration:** ~45 minutes
**Dependencies:** Sessions 2, 3, 4 complete
**Blocks:** None (final step)

### Tasks:
- ✅ Task 13: E2E tests for interaction logging
- ✅ Task 14: Feature documentation

### Deliverables:
- E2E tests passing
- `docs/CUSTOMER_HISTORY.md` complete
- README updated

---

## 🚀 Execution Prompts

### Prompt for Session 1 (Foundation)

```
I'm implementing the Customer History feature from the plan at:
docs/plans/2026-02-19-customer-history-implementation.md

This is SESSION 1: Database Foundation (CRITICAL PATH)

Execute these tasks in order:
- Task 1: Database Migration - customer_interactions Table
- Task 2: Database Migration - Add completed_at to todos
- Task 3: Database Triggers - Task Completion Logging
- Task 4: Database Triggers - Contact History Logging

After completing all 4 tasks:
1. Run: npm run migrate:schema
2. Test triggers manually (instructions in plan)
3. Commit all changes
4. Report: "Session 1 complete - database foundation ready"

Follow TDD approach from the implementation plan exactly.
Use superpowers:executing-plans skill.
```

---

### Prompt for Session 2 (Backend APIs)

```
I'm implementing the Customer History feature from the plan at:
docs/plans/2026-02-19-customer-history-implementation.md

This is SESSION 2: Backend APIs

PREREQUISITES:
- Session 1 (Database Foundation) MUST be complete
- Verify customer_interactions table exists

Execute these tasks:
- Task 5: Backend API - Customer History Endpoint
- Task 6: Backend API - Manual Interaction Logging

After completing both tasks:
1. Test endpoints with curl (commands in plan)
2. Verify JSON responses match expected format
3. Commit all changes
4. Report: "Session 2 complete - backend APIs ready"

Follow the implementation plan exactly.
Use superpowers:executing-plans skill.
```

---

### Prompt for Session 3 (Frontend UI)

```
I'm implementing the Customer History feature from the plan at:
docs/plans/2026-02-19-customer-history-implementation.md

This is SESSION 3: Frontend UI

PREREQUISITES:
- Session 2 (Backend APIs) MUST be complete
- Verify API endpoints respond correctly

Execute these tasks:
- Task 7: Frontend Hook - useCustomerHistory
- Task 8: Frontend Component - InteractionTimeline
- Task 9: Update CustomerDetailPanel - Add History Section

After completing all 3 tasks:
1. Start dev server: npm run dev
2. Test in browser - verify timeline appears and loads data
3. Commit all changes
4. Report: "Session 3 complete - frontend UI ready"

Follow the implementation plan exactly.
Use superpowers:executing-plans skill.
```

---

### Prompt for Session 4 (Retroactive Linking)

```
I'm implementing the Customer History feature from the plan at:
docs/plans/2026-02-19-customer-history-implementation.md

This is SESSION 4: Retroactive Linking Tool

PREREQUISITES:
- Session 1 (Database Foundation) MUST be complete
- Verify customer_interactions table exists

Execute these tasks:
- Task 10: Retroactive Linking - Matching Algorithm
- Task 11: Retroactive Linking - Backend API
- Task 12: Retroactive Linking - Admin UI

After completing all 3 tasks:
1. Run unit tests: npm test -- retroactiveLinking.test.ts
2. Test admin UI at /customers/link-history
3. Verify "Find Matches" and "Apply Links" work
4. Commit all changes
5. Report: "Session 4 complete - retroactive linking ready"

Follow the implementation plan exactly.
Use superpowers:executing-plans skill.
```

---

### Prompt for Session 5 (Testing & Docs)

```
I'm implementing the Customer History feature from the plan at:
docs/plans/2026-02-19-customer-history-implementation.md

This is SESSION 5: Testing & Documentation (FINAL)

PREREQUISITES:
- Sessions 2, 3, and 4 MUST all be complete
- Verify all features work in browser

Execute these tasks:
- Task 13: E2E Tests - Interaction Logging
- Task 14: Final Integration & Documentation

After completing both tasks:
1. Run all tests: npm test && npm run test:e2e
2. Verify docs/CUSTOMER_HISTORY.md is complete
3. Commit all changes
4. Report: "Session 5 complete - Customer History feature DONE ✅"

Follow the implementation plan exactly.
Use superpowers:executing-plans skill.
```

---

## 📊 Progress Tracking

Use this checklist to track completion across sessions:

```
□ Session 1: Database Foundation (CRITICAL - DO FIRST)
  □ Task 1: customer_interactions table
  □ Task 2: completed_at column
  □ Task 3: Task completion trigger
  □ Task 4: Contact logging trigger
  □ Migration deployed
  □ Triggers tested

□ Session 2: Backend APIs (After Session 1)
  □ Task 5: GET history endpoint
  □ Task 6: POST log endpoint
  □ API tests passing

□ Session 3: Frontend UI (After Session 2)
  □ Task 7: useCustomerHistory hook
  □ Task 8: InteractionTimeline component
  □ Task 9: CustomerDetailPanel update
  □ UI working in browser

□ Session 4: Retroactive Linking (After Session 1)
  □ Task 10: Matching algorithm + tests
  □ Task 11: Admin API endpoints
  □ Task 12: Admin UI page
  □ Unit tests passing
  □ Admin tool functional

□ Session 5: Testing & Docs (After 2, 3, 4)
  □ Task 13: E2E tests
  □ Task 14: Documentation
  □ All tests passing
  □ Docs complete
```

---

## ⚠️ Important Notes

### Session 1 is Blocking!
**DO NOT start Sessions 2-4 until Session 1 is complete and committed.**
The database schema must exist before any code can use it.

### Session 2 Blocks Session 3
Session 3 (Frontend) needs the API endpoints from Session 2.
Can run Session 4 in parallel with Session 2.

### Session 5 is Final
Only start Session 5 when Sessions 2, 3, and 4 are all done.

### Merge Strategy
1. Session 1 → merge to main immediately
2. Sessions 2-4 → merge as they complete (no conflicts expected)
3. Session 5 → merge last (tests + docs)

### If Sessions Conflict
If multiple sessions modify the same file (unlikely with this batching):
1. First session to finish merges
2. Other sessions rebase and resolve conflicts
3. Or: coordinate in a shared branch

---

## 🎯 Recommended Execution Order

**Fastest (4 parallel sessions):**
```
Day 1 Morning:
  Session 1 (You) → Foundation

Day 1 Afternoon (Start 3 sessions in parallel):
  Session 2 (Agent 1) → Backend APIs
  Session 3 (Agent 2) → Frontend UI (wait for Session 2)
  Session 4 (Agent 3) → Retroactive Linking

Day 1 Evening:
  Session 5 (You) → Testing & Docs
```

**Solo Approach (Sequential):**
```
Session 1 → Commit → Session 2 → Commit → Session 3 → Commit → Session 4 → Commit → Session 5
```

---

**Ready to execute!** Start with Session 1 prompt above.
