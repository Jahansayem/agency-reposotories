# Bealer Agency Task Manager — Project Context

## What This Is
Insurance agency task management app for Bealer Insurance Agency. Multi-user, real-time collaborative tool for managing customer tasks, renewals, claims, quotes, and follow-ups. Built for a small team (~5 agents) led by owner Derrick.

## Tech Stack
- **Framework:** Next.js 16 (App Router), React 19, TypeScript 5.9 (strict)
- **Styling:** Tailwind CSS 4 with CSS custom properties theming (`var(--surface)`, `var(--foreground)`, `var(--accent)`, `var(--border)`, `var(--text-muted)`, `var(--surface-hover)`, `var(--surface-2)`, `var(--background)`). Dark mode via these properties + occasional `dark:` overrides.
- **Animation:** Framer Motion 12
- **Drag & Drop:** @dnd-kit/core 6, @dnd-kit/sortable 8
- **Dates:** date-fns 4
- **Icons:** Lucide React
- **State:** Zustand 5 (todoStore), React Query 5, SWR 2
- **Backend:** Supabase (Postgres + RLS + realtime subscriptions)
- **AI:** Anthropic Claude via Vercel AI SDK (`ai` package), `@ai-sdk/anthropic`
- **Testing:** Playwright (E2E), Vitest + Testing Library (unit/integration)
- **Other:** PWA support, push notifications, Sentry error tracking, Clerk auth

## Repo Structure
```
/Users/adrianstier/shared-todo-list/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # ~20 API route groups (todos, customers, ai, agencies, etc.)
│   │   └── page.tsx            # Entry point
│   ├── components/
│   │   ├── calendar/           # ← FOCUS AREA (10 files, ~3,300 LOC)
│   │   ├── layout/             # AppShell, NavigationSidebar, EnhancedBottomNav, UnifiedAppBar
│   │   ├── dashboard/          # Dashboard panels including RenewalsCalendarPanel
│   │   ├── task-detail/        # Task detail panel and metadata
│   │   ├── views/              # DashboardPage, AnalyticsPage, CustomerLookupView
│   │   ├── ui/                 # shadcn-style primitives (Modal, Toast, etc.)
│   │   ├── MainApp.tsx         # Top-level view router (~1,077 LOC)
│   │   └── [90+ other component files]
│   ├── hooks/                  # Custom hooks
│   ├── lib/                    # Supabase client, AI helpers, utilities
│   ├── store/                  # Zustand stores
│   └── types/                  # TypeScript types (todo.ts, calendar.ts, customer.ts, agency.ts, etc.)
├── tests/                      # Playwright E2E specs
├── supabase/                   # Migrations
└── docs/                       # Implementation docs
```

## Navigation Architecture
- **ActiveView type:** `'tasks' | 'calendar' | 'dashboard' | 'activity' | 'opportunities' | 'analytics' | 'customers'`
- **Desktop:** Persistent sidebar (`NavigationSidebar`) + main content area + optional right panels
- **Mobile:** Bottom nav (`EnhancedBottomNav`) with "More" overflow menu for Calendar and other secondary views
- **View switching:** Managed by `AppShell` context, consumed by `MainApp` which lazy-loads views via `next/dynamic`
- Calendar is loaded as: `const CalendarView = dynamic(() => import('./calendar/CalendarView'), { ssr: false })`

## Calendar Architecture (Focus Area)

### File Inventory
| File | LOC | Purpose |
|------|-----|---------|
| `CalendarView.tsx` | 806 | Main container: nav header, filter dropdowns, view switching, sidebar (mini calendar + Today's Focus + category legend), keyboard shortcuts |
| `CalendarDayCell.tsx` | 570 | Month grid cell: hover popup with full task list, inline quick-add, draggable tasks, 3-task preview with overflow, heatmap coloring |
| `DayView.tsx` | 469 | Day detail: time-period grouping (morning/afternoon/evening/all-day), current time indicator, inline quick-add, task cards with full metadata |
| `WeekView.tsx` | 337 | 7-day grid (responsive: 2-col mobile → 4-col tablet → 7-col desktop), drag-drop between days, task count badges |
| `MonthView.tsx` | 316 | ARIA grid with keyboard navigation, drag-drop, animated month transitions |
| `constants.ts` | 137 | Shared category colors/labels, utility fns (isTaskOverdue, getSubtaskProgress, isFollowUpOverdue, hasPendingReminders, formatPremiumCompact, getInitials) |
| `MiniCalendar.tsx` | 92 | Sidebar date picker (visible ≥lg breakpoint) |
| `CalendarViewSwitcher.tsx` | 88 | Day/Week/Month segmented tab control |
| `CalendarDragOverlay.tsx` | 31 | Visual overlay during drag operations |
| `constants.ts` exports | — | CATEGORY_COLORS, CATEGORY_LABELS, ALL_CATEGORIES, PRIORITY_ORDER, STATUS_BORDER, SEGMENT_COLORS/LABELS, PREMIUM_DISPLAY_THRESHOLD |

### CalendarView Props Interface
```typescript
interface CalendarViewProps {
  todos: Todo[];
  onTaskClick: (todo: Todo) => void;
  onDateClick: (date: Date) => void;
  onReschedule?: (todoId: string, newDate: string) => void;
  onQuickComplete?: (todoId: string) => void;
  onToggleWaiting?: (todoId: string, waiting: boolean) => void;
  onQuickAdd?: (dateKey: string, text: string) => void;
}
```

### View Modes
- `CalendarViewMode = 'day' | 'week' | 'month'`
- Default view: `week`
- Month → Day: clicking a date drills into day view
- Week → Day: clicking a day header drills into day view

### Keyboard Shortcuts (CalendarView.tsx)
D/W/M = switch view, T = today, N = new task, ← → = navigate prev/next, Escape = close filter/popup

### Filtering System
- **Categories:** quote, renewal, claim, service, follow-up, prospecting, other — each with distinct color
- **Assignees:** dynamic from task data
- Two filter UIs: dropdown (all viewports) + sidebar legend (≥lg only)
- Filter state is local React state (not persisted)

### Drag & Drop
- @dnd-kit PointerSensor with 8px activation distance
- Enabled in Month and Week views when `onReschedule` prop provided
- Drop targets: day cells (month) or day columns (week)
- Shows toast on successful reschedule

### Task Data Shape (relevant fields)
```typescript
interface Todo {
  id: string;
  text: string;
  customer_name?: string;
  due_date?: string;          // ISO string, may or may not have time component
  completed: boolean;
  status: 'todo' | 'in_progress' | 'done';
  category?: DashboardTaskCategory;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  assigned_to?: string;
  waiting_for_response?: boolean;
  waiting_since?: string;
  follow_up_after_hours?: number;
  renewal_status?: string;    // 'at-risk' triggers amber warning
  customer_segment?: string;  // 'elite' | 'premium' | 'standard' | 'entry'
  premium_amount?: number;
  subtasks?: Subtask[];
  reminders?: TaskReminder[];
  reminder_at?: string;
  recurrence?: string;
  notes?: string;
}
```

### Known Mobile Issues
1. **Month cell popups are hover-only** — `onMouseEnter`/`onMouseLeave` triggers don't fire on touch. No tap-to-open fallback.
2. **Quick action buttons (complete/waiting) use `opacity-0 group-hover:opacity-100`** — invisible on touch devices.
3. **Month cells at 375px are ~50px wide** with 10px text previews — likely unreadable.
4. **Week view shows 2 columns on mobile** (`grid-cols-2`) — only 2 of 7 days visible without scrolling.
5. **Sidebar (mini calendar, Today's Focus, category legend) is hidden below lg breakpoint** — stats and date picker inaccessible on mobile.

## Existing Tests
`tests/calendar-view.spec.ts` — 13 tests across 5 describe blocks:
1. Calendar view navigation (3 tests): nav appears, positioned after Tasks in sidebar, can navigate back
2. Calendar view rendering (3 tests): displays month/year, weekday headers, day cells
3. Calendar month navigation (3 tests): prev/next month, round-trip
4. Calendar category filter (2 tests): filter button visible, dropdown shows options
5. Calendar sidebar active state (2 tests): active/inactive nav states

**Not tested:** drag-drop, keyboard shortcuts, quick-add, day view, week view, mobile viewports, dark mode, task interactions.

### Test Helpers
```typescript
login(page)              // Derrick, PIN 8008, dismisses tours/dialogs
navigateToCalendar(page) // Clicks sidebar/bottom-nav Calendar button
switchToMonthView(page)  // Clicks Month tab in view switcher
isMobileViewport(page)   // Returns true if width < 1024
hideDevOverlay(page)     // Imported from test-base
```

## Critical Patterns & Constraints
1. **Always use CSS custom properties** for colors — never raw Tailwind palette colors for surfaces/text/borders
2. **Activity logging:** Any Supabase mutation must call `safeLogActivity()`
3. **Subscription cleanup:** Real-time subscriptions must be cleaned up in useEffect returns
4. **Owner-only features:** Check `currentUser?.name === 'Derrick'` for strategic features
5. **TypeScript strict:** All types in `src/types/`, no `any`
6. **Component lazy loading:** Heavy views use `next/dynamic` with `ssr: false`
7. **Optimistic updates:** Prefer for better UX on mutations

## Dev Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type check
npm run test         # Vitest unit tests
npx playwright test tests/calendar-view.spec.ts --project=chromium  # Calendar E2E
```

## Agent Prompt Location
Full multi-agent prompts for calendar improvement work:
`/Users/adrianstier/shared-todo-list/docs/CALENDAR_IMPROVEMENT_AGENT_PROMPTS.md`
