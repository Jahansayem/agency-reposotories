# Task Manual Reordering Feature

## User Request
Build a way to move tasks up and down manually in the list view:
1. Add drag handle (two lines icon) next to each task for manual reordering
2. Change checkbox from square to circle (like Todoist)
3. Allow users to manually sort tasks by dragging or clicking up/down arrows

## Reference Image
User provided screenshot showing Todoist-style interface with:
- Circular checkboxes for task completion
- Drag handles (≡) next to tasks
- Clean, minimal design

## Current State
- **List View**: `src/components/TodoList.tsx` - uses standard rectangular checkboxes
- **Kanban View**: Already has drag-and-drop with `@dnd-kit` library
- **Database**: Tasks have no manual `display_order` column currently

## Technical Requirements

### 1. Database Schema Changes
**Agent: Database Engineer**

Add `display_order` column to `todos` table:
```sql
ALTER TABLE todos ADD COLUMN display_order INTEGER;

-- Set initial order based on created_at
UPDATE todos SET display_order = row_number() OVER (ORDER BY created_at DESC);

-- Create index for performance
CREATE INDEX idx_todos_display_order ON todos(display_order);
```

### 2. Backend API Changes
**Agent: Backend Engineer**

Update API to handle reordering:
- `PATCH /api/todos/reorder` - Update display_order for affected tasks
- Modify existing CRUD endpoints to respect display_order in queries

### 3. Frontend Components
**Agent: Frontend Engineer**

#### TodoList.tsx Changes
- Add drag-and-drop for list view using existing `@dnd-kit` library
- Add drag handle icon (two horizontal lines)
- Change checkbox from square to circle
- Add up/down arrow buttons as alternative to dragging
- Sort tasks by `display_order` ASC
- Optimistic UI updates on reorder

#### TodoItem.tsx Changes
- Replace square checkbox with circular checkbox
- Add drag handle component
- Add optional up/down buttons

#### Styling
- Use Tailwind for circular checkbox: `rounded-full` instead of `rounded`
- Style drag handle with opacity on hover
- Match Todoist aesthetic: clean, minimal

### 4. TypeScript Types
**Agent: Frontend Engineer**

Update `src/types/todo.ts`:
```typescript
export interface Todo {
  // ... existing fields
  display_order: number | null; // Add this field
}
```

### 5. Real-Time Sync Considerations
**Agent: Tech Lead**

- When user reorders, update `display_order` for affected tasks
- Real-time events should trigger re-sort on other clients
- Handle conflicts if multiple users reorder simultaneously (last-write-wins)

## Implementation Plan

### Phase 1: Database Schema (Database Engineer)
1. Create migration file: `supabase/migrations/20260201_add_display_order.sql`
2. Add `display_order` column with default values
3. Test migration in local Supabase

### Phase 2: Backend API (Backend Engineer)
1. Create `src/app/api/todos/reorder/route.ts`
2. Add reorder logic with transaction support
3. Update existing queries to ORDER BY display_order
4. Add activity logging for reorder actions

### Phase 3: Frontend UI (Frontend Engineer)
1. Update TodoItem.tsx:
   - Change checkbox to circular
   - Add drag handle icon
2. Update TodoList.tsx:
   - Integrate drag-and-drop with @dnd-kit
   - Add reorder API call
   - Add optimistic updates
3. Update types in `src/types/todo.ts`
4. Test real-time sync

### Phase 4: Testing & Polish (Code Reviewer)
1. E2E tests for drag-and-drop reordering
2. Test multi-client sync
3. Test accessibility (keyboard navigation)
4. Visual regression testing

## Success Criteria
- ✅ Users can drag tasks to reorder them in list view
- ✅ Drag handle (≡) appears on hover/always visible
- ✅ Checkboxes are circular instead of square
- ✅ Order persists across page reloads
- ✅ Order syncs in real-time to other clients
- ✅ No breaking changes to existing functionality

## Files to Modify
- `supabase/migrations/20260201_add_display_order.sql` (new)
- `src/app/api/todos/reorder/route.ts` (new)
- `src/components/TodoList.tsx` (modify)
- `src/components/TodoItem.tsx` (modify)
- `src/types/todo.ts` (modify)
- `src/lib/activityLogger.ts` (add 'task_reordered' action)
- `tests/manual-reordering.spec.ts` (new)

## Design Decisions
1. Use existing `@dnd-kit` library (already in project for Kanban)
2. Add both drag handle AND up/down buttons for accessibility
3. `display_order` is nullable for backward compatibility
4. Tasks without display_order sort by created_at DESC (fallback)

## Timeline
- Phase 1 (DB): 30 minutes
- Phase 2 (API): 1 hour
- Phase 3 (Frontend): 2 hours
- Phase 4 (Testing): 1 hour
**Total: ~4.5 hours**

---
**Status**: Ready for implementation
**Created**: 2026-02-01
**Feature Request**: User #4521
