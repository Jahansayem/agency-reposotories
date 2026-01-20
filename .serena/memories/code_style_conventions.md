# Code Style & Conventions

## File Naming
- Components: `PascalCase.tsx` (e.g., `TodoList.tsx`)
- Utilities: `camelCase.ts` (e.g., `duplicateDetection.ts`)
- API routes: `route.ts` (Next.js App Router convention)

## Component Structure
```typescript
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Todo } from '@/types/todo';

interface MyComponentProps {
  todos: Todo[];
  onUpdate: (todo: Todo) => void;
}

export function MyComponent({ todos, onUpdate }: MyComponentProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Side effects
  }, []);

  const handleAction = async () => {
    // Event handlers
  };

  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
}
```

## TypeScript
- All types defined in `src/types/todo.ts`
- Prefer interfaces over types for objects
- Use enums for string unions

## Styling
- Tailwind utility classes for all styling
- CSS variables for theme colors
- Dark mode: `dark:` prefix in Tailwind classes
- Responsive: `sm:`, `md:`, `lg:` breakpoints

## Error Handling
```typescript
try {
  const { data, error } = await supabase.from('todos').select();
  if (error) throw error;
  setTodos(data);
} catch (error) {
  console.error('Failed to fetch todos:', error);
  alert('Failed to load tasks. Please refresh.');
}
```

## Real-Time Pattern
```typescript
useEffect(() => {
  const channel = supabase
    .channel('unique-channel-name')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, handleChange)
    .subscribe();
  return () => supabase.removeChannel(channel); // REQUIRED cleanup
}, []);
```

## Activity Logging
All mutations must call `logActivity()`:
```typescript
import { logActivity } from '@/lib/activityLogger';
await logActivity({
  action: 'task_created',
  todo_id: newTodo.id,
  todo_text: newTodo.text,
  user_name: currentUser.name,
  details: { priority: newTodo.priority }
});
```
