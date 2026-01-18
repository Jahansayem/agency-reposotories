# Frontend Architecture Specification

## Overview

This document describes the current frontend architecture and provides guidance for future development work.

---

## Component Architecture

### Layout Components (`src/components/layout/`)

| Component | Purpose | Status |
|-----------|---------|--------|
| `AppShell.tsx` | Main application shell/wrapper | Active |
| `NavigationSidebar.tsx` | Desktop sidebar navigation | Active |
| `EnhancedBottomNav.tsx` | Mobile bottom navigation | Active |
| `CommandPalette.tsx` | Keyboard-driven command palette (Cmd+K) | Active |
| `TaskCard.tsx` | Reusable task card component | Active |
| `TaskDetailPanel.tsx` | Slide-out task detail view | Active |

### Core UI Components (`src/components/`)

| Component | Purpose | Status |
|-----------|---------|--------|
| `AppMenu.tsx` | Hamburger menu for secondary features | Active |
| `StatusLine.tsx` | Contextual single-line status | Active |
| `BottomTabs.tsx` | Mobile tab navigation | Active |
| `TodoList.tsx` | Main task list view | Active |
| `TodoItem.tsx` | Individual task item | Active |
| `KanbanBoard.tsx` | Kanban board view | Active |
| `AddTodo.tsx` | Task input with AI features | Active |
| `ChatPanel.tsx` | Team chat and DMs | Active |

### UI Primitives (`src/components/ui/`)

| Component | Purpose |
|-----------|---------|
| `Button.tsx` | Standardized button with variants (primary, secondary, danger, ghost, etc.) |
| `Modal.tsx` | Reusable modal with focus trap and accessibility |
| `Card.tsx` | Card container component |
| `Toast.tsx` | Toast notification component |
| `Skeleton.tsx` | Loading skeleton components |

---

## Design System

### CSS Variables

All colors use CSS variables defined in `globals.css`:

```css
/* Core Colors */
--brand-blue: #0033A0;
--accent: var(--brand-blue);
--foreground: /* theme-dependent */
--surface: /* theme-dependent */
--surface-2: /* secondary surface */
--surface-3: /* tertiary surface */

/* Semantic Colors */
--success: #059669;
--warning: #D97706;
--danger: #DC2626;

/* Text Colors */
--text-muted: /* muted text */
--text-light: /* lighter text */

/* Borders */
--border: /* standard border */
--border-subtle: /* subtle border */
--border-hover: /* hover state border */
```

### Spacing & Sizing

- Minimum touch targets: `min-h-[44px]` (44px)
- Border radius: `rounded-xl` (12px) for cards, `rounded-lg` (8px) for buttons
- Consistent padding: `p-4` for cards, `px-3 py-2` for buttons

### Button Variants

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'outline' | 'brand' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';
```

---

## State Management

### Zustand Store (`src/store/todoStore.ts`)

The application uses Zustand for state management:

```typescript
interface TodoStore {
  // Core state
  todos: Todo[];
  users: User[];

  // UI state
  quickFilter: QuickFilter;
  showCompleted: boolean;
  searchQuery: string;
  selectedTodos: Set<string>;

  // Actions
  setTodos: (todos: Todo[]) => void;
  addTodo: (todo: Todo) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  toggleComplete: (id: string) => void;

  // Bulk actions
  selectTodo: (id: string) => void;
  clearSelection: () => void;
  bulkComplete: () => void;
  bulkDelete: () => void;
}
```

### Custom Hooks

| Hook | Purpose |
|------|---------|
| `useTodoStore` | Access Zustand store |
| `useFilters` | Filter and sort todos |
| `useBulkActions` | Bulk selection and actions |
| `useKeyboardShortcuts` | Keyboard navigation |
| `useEscapeKey` | Escape key handling |
| `useTaskPatterns` | AI pattern suggestions |

---

## Real-Time Architecture

### Supabase Subscriptions

All real-time updates flow through Supabase channels:

```typescript
// Pattern for real-time subscriptions
useEffect(() => {
  const channel = supabase
    .channel('todos-channel')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'todos' },
      handleChange
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);
```

### Optimistic Updates

All mutations use optimistic updates for instant UI feedback:

1. Update local state immediately
2. Send request to Supabase
3. Real-time broadcast syncs other clients
4. Rollback on error

---

## Mobile-First Design

### Responsive Breakpoints

```css
/* Tailwind breakpoints */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

### Mobile Navigation

- `BottomTabs.tsx` - Primary navigation for mobile
- `EnhancedBottomNav.tsx` - Enhanced bottom nav with more options
- Touch targets minimum 44px height

### Desktop Navigation

- `NavigationSidebar.tsx` - Collapsible sidebar
- `CommandPalette.tsx` - Cmd+K for power users

---

## Accessibility

### ARIA Compliance

- All modals have `role="dialog"` and `aria-modal="true"`
- Focus trap in modals using `useRef` and keyboard handlers
- `aria-label` on all icon-only buttons
- `aria-expanded` on collapsible sections

### Keyboard Navigation

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Open command palette |
| `Escape` | Close modal/deselect |
| `?` | Show keyboard shortcuts |

---

## Performance Considerations

### Code Splitting

Large components should use dynamic imports:

```typescript
const ChatPanel = dynamic(() => import('./ChatPanel'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

### Memoization

- Use `useMemo` for expensive computations
- Use `useCallback` for event handlers passed to children
- Use `React.memo` for pure components that receive stable props

---

## Future Work

### Not Yet Implemented

1. **Focus Mode** - Hide all secondary UI for distraction-free task completion
2. **Swipe Actions** - Swipe-to-complete on mobile
3. **Lazy Loading** - Dynamic imports for ChatPanel, StrategicDashboard
4. **Task Bottom Sheet** - Full-width mobile detail view

### Improvement Opportunities

1. **Bundle Size** - Split large components (ChatPanel: 2000+ lines)
2. **Test Coverage** - Add more component tests
3. **Animation Polish** - Consistent Framer Motion animations
4. **Error Boundaries** - Add React error boundaries

---

## File Structure

```
src/
├── app/
│   ├── page.tsx              # Entry point
│   ├── layout.tsx            # Root layout
│   └── api/                  # API routes
├── components/
│   ├── layout/               # Layout components
│   ├── ui/                   # UI primitives
│   ├── chat/                 # Chat components
│   ├── todo/                 # Todo-specific components
│   └── *.tsx                 # Feature components
├── hooks/                    # Custom React hooks
├── lib/                      # Utilities and services
├── store/                    # Zustand store
├── types/                    # TypeScript types
└── contexts/                 # React contexts
```

---

## Testing Strategy

### Unit Tests (`tests/unit/`)

- Component tests using Vitest + React Testing Library
- Hook tests
- Utility function tests

### Integration Tests (`tests/integration/`)

- Store + hooks integration
- API route tests

### E2E Tests (`tests/*.spec.ts`)

- Playwright for full user flows
- Core workflow testing

---

*Last Updated: 2026-01-18*
