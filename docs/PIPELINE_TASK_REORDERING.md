# Pipeline: Manual Task Reordering Feature

**Date**: 2026-02-01
**Feature**: Manual task reordering with drag handles and circular checkboxes
**Status**: 🚧 In Progress

---

## 📋 Overview

Implement Todoist-style manual task reordering with:
- Circular checkboxes (instead of square)
- Drag handles (≡ icon) for manual reordering
- Persistent sort order across sessions
- Real-time sync to all clients

**Reference**: User provided Todoist screenshot showing desired UI

---

## 🔄 Pipeline Stages

### Stage 1: Database Schema ✅ READY
**Agent**: Database Engineer
**Task**: Add `display_order` column to `todos` table
**Files**: `supabase/migrations/20260201_add_display_order.sql`

**Acceptance Criteria**:
- [ ] Migration file created
- [ ] `display_order` column added (INTEGER, nullable)
- [ ] Initial values set based on created_at DESC
- [ ] Index created for performance
- [ ] Migration tested locally

---

### Stage 2: Backend API ⏳ WAITING ON STAGE 1
**Agent**: Backend Engineer
**Task**: Create reorder API endpoint
**Files**:
- `src/app/api/todos/reorder/route.ts` (new)
- `src/lib/activityLogger.ts` (modify - add 'task_reordered' action)

**Acceptance Criteria**:
- [ ] `POST /api/todos/reorder` endpoint created
- [ ] Accepts: `{ todoId, newOrder }` or `{ todoId, direction: 'up' | 'down' }`
- [ ] Updates display_order for affected tasks (transaction)
- [ ] Returns updated tasks
- [ ] Activity logging for reorder actions
- [ ] Error handling (task not found, invalid order)

---

### Stage 3: Frontend Implementation ⏳ WAITING ON STAGE 2
**Agent**: Frontend Engineer
**Tasks**:
1. Update TypeScript types
2. Update TodoItem component (circular checkbox, drag handle)
3. Update TodoList component (drag-and-drop, reorder logic)
4. Add real-time sync for reordering

**Files**:
- `src/types/todo.ts` (modify)
- `src/components/TodoItem.tsx` (modify)
- `src/components/TodoList.tsx` (modify)

**Acceptance Criteria**:
- [ ] `Todo` interface has `display_order?: number` field
- [ ] Checkboxes are circular (`rounded-full`)
- [ ] Drag handle (≡) visible on hover or always
- [ ] Drag-and-drop working with @dnd-kit
- [ ] Up/down buttons as alternative to dragging
- [ ] Optimistic UI updates
- [ ] Real-time sync when other users reorder
- [ ] Fallback to created_at DESC if no display_order

---

### Stage 4: Testing & Validation ⏳ WAITING ON STAGE 3
**Agent**: Code Reviewer
**Task**: Write E2E tests and validate implementation
**Files**: `tests/manual-reordering.spec.ts` (new)

**Acceptance Criteria**:
- [ ] E2E test: Drag task to new position
- [ ] E2E test: Use up/down buttons to reorder
- [ ] E2E test: Order persists after reload
- [ ] E2E test: Multi-client sync (two browser tabs)
- [ ] E2E test: Keyboard accessibility
- [ ] No regressions in existing tests
- [ ] Visual regression check (circular checkboxes)

---

## 📦 Deliverables

### Database
- [x] Migration file: `supabase/migrations/20260201_add_display_order.sql`
- [ ] Migration applied to local DB
- [ ] Migration applied to production DB (after testing)

### Backend
- [ ] Reorder API endpoint: `src/app/api/todos/reorder/route.ts`
- [ ] Activity logging support for reordering

### Frontend
- [ ] Updated types: `src/types/todo.ts`
- [ ] Updated component: `src/components/TodoItem.tsx`
- [ ] Updated component: `src/components/TodoList.tsx`

### Testing
- [ ] E2E test file: `tests/manual-reordering.spec.ts`
- [ ] Manual testing checklist completed

---

## 🎯 Success Metrics

- ✅ Users can drag tasks to reorder in list view
- ✅ Drag handle appears on task hover
- ✅ Checkboxes are circular (Todoist style)
- ✅ Order persists across page reloads
- ✅ Order syncs in real-time to other clients
- ✅ No performance degradation (<100ms reorder time)
- ✅ Accessible via keyboard (Tab + Arrow keys)

---

## 🚨 Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Concurrent reorders** | Use last-write-wins strategy, add timestamp |
| **Performance with large lists** | Index on display_order, limit list size |
| **Breaking existing sorting** | Make display_order nullable, fallback to created_at |
| **Mobile drag-and-drop** | Add up/down buttons as touch-friendly alternative |

---

## 📝 Notes for Next Agent

### For Database Engineer (Stage 1)
- Start with migration file creation
- Use `row_number()` to set initial order based on `created_at DESC`
- Test migration with rollback script
- See `supabase/migrations/` for examples of existing migrations

### For Backend Engineer (Stage 2)
- Look at `src/app/api/activity/route.ts` for API pattern examples
- Use Supabase client from `src/lib/supabase.ts`
- Add `task_reordered` to activity log action types
- Consider batch updates for performance (update multiple tasks at once)

### For Frontend Engineer (Stage 3)
- Kanban already uses @dnd-kit - reference `src/components/KanbanBoard.tsx`
- Use `GripVertical` icon from `lucide-react` for drag handle
- Circular checkbox: Replace `rounded` with `rounded-full` in Tailwind classes
- Add `cursor-grab` on drag handle hover
- Optimistic updates pattern: Update local state → API call → rollback on error

### For Code Reviewer (Stage 4)
- Test in Safari (WebKit) and Chrome
- Verify accessibility with screen reader
- Check mobile touch interactions
- Verify no layout shift when dragging

---

## 🔗 Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Developer guide
- [docs/AGENT_WORKFLOWS.md](./AGENT_WORKFLOWS.md) - Agent role definitions
- [src/components/KanbanBoard.tsx](../src/components/KanbanBoard.tsx) - Existing drag-and-drop reference
- [User Guide Sprint 3](./USER_GUIDE_SPRINT3.md) - Recent features

---

**Last Updated**: 2026-02-01
**Current Stage**: Stage 1 (Database Schema)
**Next Agent**: Database Engineer
