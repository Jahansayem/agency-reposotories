# Agent Handoff: Task Manual Reordering - Stages 1 & 2 Complete

**Date**: 2026-02-01
**Agent**: Full-Stack Engineer (Database + Backend)
**Status**: ✅ Stage 1 Complete, ✅ Stage 2 Complete
**Next Agent**: Frontend Engineer (Stage 3)

---

## ✅ Completed Work

### Stage 1: Database Schema ✅

**Files Created:**
1. `supabase/migrations/20260201_add_display_order.sql`

**Changes:**
- Added `display_order INTEGER` column to `todos` table
- Set initial values using `ROW_NUMBER()` based on `created_at DESC`
- Created index `idx_todos_display_order` for query performance
- Added column comment for documentation
- Included rollback script for safe migration

**SQL Summary:**
```sql
ALTER TABLE todos ADD COLUMN display_order INTEGER;
UPDATE todos SET display_order = ROW_NUMBER() OVER (ORDER BY created_at DESC);
CREATE INDEX idx_todos_display_order ON todos(display_order);
```

---

### Stage 2: Backend API ✅

**Files Created:**
1. `src/app/api/todos/reorder/route.ts` (220 lines)

**API Endpoint:**
- `POST /api/todos/reorder`

**Supported Reorder Modes:**

1. **Move to specific position:**
   ```json
   {
     "todoId": "uuid",
     "newOrder": 5,
     "userName": "Derrick"
   }
   ```

2. **Move up or down one position:**
   ```json
   {
     "todoId": "uuid",
     "direction": "up",  // or "down"
     "userName": "Derrick"
   }
   ```

3. **Swap with another task:**
   ```json
   {
     "todoId": "uuid",
     "targetTodoId": "other-uuid",
     "userName": "Derrick"
   }
   ```

**Response:**
```json
{
  "success": true,
  "updatedTasks": [
    { "id": "uuid", "display_order": 3, ... },
    { "id": "uuid2", "display_order": 4, ... }
  ]
}
```

**Features:**
- Three reorder strategies (position, up/down, swap)
- Activity logging (`task_reordered` action)
- Error handling (404 for missing tasks, 400 for invalid params)
- Returns all updated tasks for client sync

---

### TypeScript Types Updated

**File Modified:**
- `src/types/todo.ts`

**Changes:**
1. Added `display_order?: number` to `Todo` interface (line 92)
2. Added `'task_reordered'` to `ActivityAction` type (line 404)

**Interface Update:**
```typescript
export interface Todo {
  // ... existing fields
  display_order?: number; // Manual sort order for list view
  // ... rest of fields
}
```

---

## 📝 Notes for Frontend Engineer (Stage 3)

### What You Need to Do

You're building the UI for manual task reordering in the list view. Here's your checklist:

#### 1. Update TodoItem Component
**File**: `src/components/TodoItem.tsx`

**Tasks:**
- [ ] Change checkbox from square to circular
  - Replace `rounded` with `rounded-full` in Tailwind classes
  - Adjust checkbox size if needed (keep same visual weight)

- [ ] Add drag handle icon
  - Use `GripVertical` icon from `lucide-react`
  - Position on left side of task (before checkbox)
  - Show on hover with opacity transition
  - Add `cursor-grab` on hover, `cursor-grabbing` when dragging

**Example drag handle:**
```tsx
<div className="drag-handle opacity-0 group-hover:opacity-50 hover:opacity-100 cursor-grab active:cursor-grabbing">
  <GripVertical size={16} className="text-gray-400" />
</div>
```

#### 2. Update TodoList Component
**File**: `src/components/TodoList.tsx`

**Tasks:**
- [ ] Sort tasks by `display_order` ASC (fallback to `created_at DESC` if null)
- [ ] Integrate drag-and-drop using `@dnd-kit` (already in package.json)
- [ ] Add reorder API call to `/api/todos/reorder`
- [ ] Implement optimistic UI updates
- [ ] Add real-time sync for reorder events

**Drag-and-Drop Reference:**
- Look at `src/components/KanbanBoard.tsx` - it already uses `@dnd-kit`
- Use same library patterns for consistency

**Sort Logic:**
```tsx
const sortedTodos = useMemo(() => {
  return [...todos].sort((a, b) => {
    // Primary sort: display_order (null values last)
    if (a.display_order !== null && b.display_order !== null) {
      return a.display_order - b.display_order;
    }
    if (a.display_order !== null) return -1;
    if (b.display_order !== null) return 1;

    // Fallback: created_at DESC
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}, [todos]);
```

**Reorder API Call:**
```tsx
const handleReorder = async (todoId: string, newOrder: number) => {
  // Optimistic update
  const backup = [...todos];
  setTodos(/* reordered array */);

  try {
    const response = await fetch('/api/todos/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        todoId,
        newOrder,
        userName: currentUser.name,
      }),
    });

    if (!response.ok) throw new Error('Failed to reorder');

    const { updatedTasks } = await response.json();
    // Real-time will sync, but you can merge here for instant feedback
  } catch (error) {
    console.error('Reorder failed:', error);
    setTodos(backup); // Rollback
    alert('Failed to reorder task');
  }
};
```

#### 3. Real-Time Sync
**File**: `src/components/TodoList.tsx` (in the existing `useEffect` with real-time subscription)

**Tasks:**
- [ ] Listen for `UPDATE` events on `todos` table
- [ ] When `display_order` changes, re-sort the local list
- [ ] Handle edge case: user reorders while another user also reorders (last-write-wins)

**Real-Time Handler:**
```tsx
useEffect(() => {
  const channel = supabase
    .channel('todos-list')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'todos' },
      (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Todo;
          setTodos(prev => prev.map(t =>
            t.id === updated.id ? updated : t
          ));
        }
        // ... existing INSERT/DELETE handlers
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);
```

#### 4. Optional: Up/Down Buttons
**File**: `src/components/TodoItem.tsx`

If you want to add keyboard-accessible up/down arrows (in addition to drag handle):

```tsx
<div className="flex gap-1">
  <button onClick={() => moveTask(todo.id, 'up')} className="...">
    <ChevronUp size={14} />
  </button>
  <button onClick={() => moveTask(todo.id, 'down')} className="...">
    <ChevronDown size={14} />
  </button>
</div>
```

API call for up/down:
```tsx
const moveTask = async (todoId: string, direction: 'up' | 'down') => {
  await fetch('/api/todos/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ todoId, direction, userName: currentUser.name }),
  });
};
```

---

## 🎨 Design Reference

**User Provided Screenshot:**
- Circular checkboxes (not square)
- Drag handle (≡ icon) next to each task
- Clean, minimal aesthetic (Todoist-style)

**Key Design Decisions:**
1. **Drag handle visibility**: Show on hover (opacity: 0 → 50% → 100%)
2. **Circular checkbox**: Use `rounded-full` instead of `rounded`
3. **Drag cursor**: `cursor-grab` on hover, `cursor-grabbing` when dragging
4. **Smooth transitions**: Use Framer Motion or CSS transitions for reordering animation

---

## 🧪 Testing Checklist for Stage 3

Once you complete the frontend implementation, verify:

- [ ] Checkboxes are circular (not square)
- [ ] Drag handle appears on task hover
- [ ] Dragging a task reorders it in the list
- [ ] Order persists after page reload
- [ ] Order syncs in real-time to other browser tabs
- [ ] Optimistic UI updates (instant feedback)
- [ ] Rollback works if API fails
- [ ] Keyboard accessibility (Tab + Arrow keys for up/down buttons if implemented)
- [ ] Mobile: Touch drag works on mobile devices

---

## 📚 Related Files to Reference

| File | Why Look at It |
|------|----------------|
| `src/components/KanbanBoard.tsx` | Already uses @dnd-kit for drag-and-drop |
| `src/components/TodoList.tsx` | Existing real-time subscription pattern |
| `src/components/TodoItem.tsx` | Current checkbox styling to replace |
| `src/lib/animations.ts` | Framer Motion variants for smooth transitions |

---

## 🚨 Important Considerations

1. **Backward Compatibility**: Tasks without `display_order` should fallback to `created_at DESC`
2. **Performance**: Index on `display_order` ensures fast sorting even with 1000+ tasks
3. **Concurrency**: Last-write-wins strategy for concurrent reorders (acceptable for this use case)
4. **Mobile**: Touch events work with @dnd-kit, but test thoroughly on iOS Safari
5. **Activity Logging**: Reorder events are logged for audit trail

---

## 📦 Files Modified/Created

### Created
- ✅ `supabase/migrations/20260201_add_display_order.sql`
- ✅ `src/app/api/todos/reorder/route.ts`
- ✅ `docs/PIPELINE_TASK_REORDERING.md`
- ✅ `.claude/memory/task_reordering_feature.md`

### Modified
- ✅ `src/types/todo.ts` (added `display_order` field and `task_reordered` action)

### To Be Modified (Stage 3 - Your Work)
- ⏳ `src/components/TodoItem.tsx` (circular checkbox, drag handle)
- ⏳ `src/components/TodoList.tsx` (sorting, drag-and-drop, API integration)

---

## 🎯 Success Criteria

Your implementation is complete when:
- ✅ Users can drag tasks to reorder them
- ✅ Checkboxes are circular (Todoist style)
- ✅ Order persists across page reloads
- ✅ Order syncs in real-time to all clients
- ✅ UI feels smooth and responsive (<100ms feedback)
- ✅ No breaking changes to existing functionality

---

## 🔗 Next Steps After Stage 3

Once you complete the frontend:
1. Update `docs/PIPELINE_TASK_REORDERING.md` (mark Stage 3 complete)
2. Create handoff document for Code Reviewer (Stage 4)
3. Code Reviewer will write E2E tests and validate implementation

---

**Questions?**
- Read: `docs/CLAUDE.md` - Comprehensive developer guide
- Read: `docs/PIPELINE_TASK_REORDERING.md` - Full pipeline documentation
- Read: `.claude/memory/task_reordering_feature.md` - Feature requirements

**Good luck with Stage 3!** 🚀

---

**Last Updated**: 2026-02-01
**Status**: Ready for Frontend Engineer
**Blocked**: None
