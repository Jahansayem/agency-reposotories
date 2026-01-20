# Critical Code Patterns

## 1. Activity Logging (MANDATORY)

Every database mutation MUST log activity:

```typescript
import { logActivity } from '@/lib/activityLogger';

// After any mutation (create, update, delete)
await logActivity({
  action: 'task_created',  // or task_updated, task_deleted, etc.
  todo_id: todo.id,
  todo_text: todo.text,
  user_name: currentUser.name,
  details: { /* context */ }
});
```

**Action Types:**
- `task_created`, `task_updated`, `task_deleted`
- `task_completed`, `task_reopened`
- `status_changed`, `priority_changed`
- `assigned_to_changed`, `due_date_changed`
- `subtask_added`, `subtask_completed`, `subtask_deleted`
- `notes_updated`
- `attachment_added`, `attachment_removed`
- `tasks_merged`

## 2. Real-time Subscription (MUST CLEANUP)

```typescript
useEffect(() => {
  const channel = supabase
    .channel('unique-channel-name')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'todos' },
      (payload) => {
        // Handle INSERT, UPDATE, DELETE
      }
    )
    .subscribe();

  // REQUIRED: Clean up on unmount
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

## 3. Optimistic Updates

```typescript
const handleUpdate = async (id: string, newValue: string) => {
  const prev = items.find(i => i.id === id);
  
  // 1. Update UI immediately
  setItems(items.map(i => i.id === id ? {...i, value: newValue} : i));
  
  try {
    // 2. Persist to database
    await supabase.from('table').update({value: newValue}).eq('id', id);
  } catch (error) {
    // 3. Rollback on error
    setItems(items.map(i => i.id === id ? prev : i));
    alert('Update failed');
  }
};
```

## 4. Owner-Only Features

```typescript
const isOwner = currentUser?.name === 'Derrick';

// In JSX
{isOwner && <StrategicDashboard />}

// In handlers
if (!isOwner) {
  alert('Owner access required');
  return;
}
```

## 5. Server-Side Supabase

```typescript
// In API routes, use SERVICE_ROLE_KEY (not anon key)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Server only!
);
```

## 6. Error Handling

```typescript
try {
  const { data, error } = await supabase.from('todos').select();
  if (error) throw error;
  return data;
} catch (error) {
  console.error('Operation failed:', error);
  // User-friendly message
  alert('Failed to load tasks. Please refresh.');
}
```

## 7. TypeScript Types

All types are in `src/types/todo.ts`. When adding new fields:

1. Update the interface in `todo.ts`
2. Update any affected components
3. Run `npm run build` to verify

---

*Updated: 2026-01-20*
