# Calendar UX/UI Troubleshooting & Improvement — Multi-Agent Prompts

## Overview

Three agents run in parallel on separate worktrees, then a fourth agent merges and validates.

**Codebase scope:**
- `src/components/calendar/` — 10 files, ~3,300 lines total
- `src/components/dashboard/RenewalsCalendarPanel.tsx` — 263 lines
- `tests/calendar-view.spec.ts` — 327 lines E2E tests
- `src/types/calendar.ts` — 1 line (CalendarViewMode type)

**Architecture summary:**
- CalendarView.tsx (806 LOC): Main container — nav header, filter dropdowns, view switching, mini calendar sidebar, Today's Focus stats, keyboard shortcuts (D/W/M/T/N, arrows)
- MonthView.tsx (316 LOC): ARIA grid with keyboard arrow navigation, drag-drop via @dnd-kit, animated transitions
- WeekView.tsx (337 LOC): 7-column responsive grid (2-col mobile → 7-col desktop), drag-drop between days
- DayView.tsx (469 LOC): Time-period grouping (morning/afternoon/evening/all-day), inline quick-add, current time indicator
- CalendarDayCell.tsx (570 LOC): Month cell with hover popup, inline quick-add, draggable tasks, heatmap coloring, 3-task preview + overflow
- MiniCalendar.tsx (92 LOC): Sidebar date picker
- CalendarViewSwitcher.tsx (88 LOC): Day/Week/Month segmented tabs
- CalendarDragOverlay.tsx (31 LOC): Visual drag overlay
- constants.ts (137 LOC): Shared colors, labels, utility functions (isTaskOverdue, getSubtaskProgress, isFollowUpOverdue, etc.)

**Tech stack:** Next.js, React, Tailwind CSS (CSS custom properties theming), Framer Motion, @dnd-kit/core, date-fns, Lucide icons. Dark mode supported. Supabase backend with RLS.

**Test login:** User "Derrick", PIN 8008. Tests use loginAsExistingUser or manual PIN entry.

---

## Worktree Setup

```bash
cd /Users/adrianstier/shared-todo-list
git worktree add .worktrees/calendar-visual -b fix/calendar-visual
git worktree add .worktrees/calendar-functional -b fix/calendar-functional
git worktree add .worktrees/calendar-mobile -b fix/calendar-mobile
```

---

## Agent 1: Visual & UX Audit

**Branch:** `fix/calendar-visual`
**Worktree:** `.worktrees/calendar-visual`

### Mission
Systematically screenshot every calendar view state, identify visual bugs, layout issues, and UX friction points, then fix them. Focus on desktop (≥1024px) first.

### Step 1: Run the app and screenshot every state

```bash
cd /Users/adrianstier/shared-todo-list/.worktrees/calendar-visual
npm run dev
```

Open the app at localhost:3000. Log in as Derrick (PIN 8008). Navigate to Calendar view.

Screenshot each of these states:
1. **Month view** — default state with tasks visible
2. **Month view** — hover over a day cell with 3+ tasks (popup should appear)
3. **Month view** — a day cell with 0 tasks (should show "+ Add task")
4. **Month view** — navigate to previous month, then next month (observe animation)
5. **Week view** — default state
6. **Week view** — day with many tasks (7+) — check count badge colors
7. **Day view** — today with tasks in multiple time periods
8. **Day view** — empty day (past date)
9. **Day view** — today with current time indicator
10. **Filter dropdown** — open filter menu, toggle categories
11. **Filter dropdown** — toggle assignee filter
12. **Sidebar** — mini calendar, Today's Focus panel, category legend
13. **Today button** — when viewing a different month (should pulse)
14. **View switcher** — all three states (Day/Week/Month active)
15. **Dark mode** — repeat key screenshots in dark mode

### Step 2: Identify and categorize issues

For each screenshot, note:
- **Visual bugs**: Overlapping elements, truncation issues, alignment problems, inconsistent spacing
- **Color/contrast**: Text readability, hover state visibility, dark mode issues
- **Layout**: Overflow handling, responsive breakpoints, sidebar proportions
- **Animations**: Janky transitions, missing transitions, too-slow transitions
- **UX friction**: Confusing interactions, missing affordances, unclear states

### Step 3: Fix issues

Common patterns to look for and fix:
- **Month cell overflow**: Tasks in cells might overflow or cause inconsistent cell heights across the row. The `min-h-[72px] sm:min-h-[100px]` constraint may not be enough.
- **Popup positioning**: The CalendarDayCell popup uses `columnIndex >= 5` for right-alignment and `rowIndex >= Math.ceil(totalRows / 2)` for bottom-flip. Verify these work at grid edges and don't clip viewport.
- **Filter dropdown z-index**: The filter dropdown has a `z-[100]` overlay but the popup in CalendarDayCell uses `z-[500]`. Verify these don't conflict.
- **Weekend dimming**: WeekView reduces weekend opacity to 75%. Verify tasks in weekend columns are still readable.
- **Heatmap colors**: CalendarDayCell applies subtle red/amber tints for busy days. Verify these are visible in both light and dark mode.
- **AnimatePresence mode**: Month/Week/Day views use `mode="popLayout"` or `mode="wait"`. Verify no flicker during transitions.
- **Print styles**: CalendarView has `print:` classes. Verify `Ctrl+P` produces a clean printout.

### Step 4: Polish

- Ensure consistent border-radius, padding, and gap values across all views
- Verify category color dots are consistent size across month preview, week, and day views
- Check that hover states have appropriate visual feedback everywhere
- Verify focus rings are visible and properly colored on all interactive elements
- Check that the "Today" button pulse animation isn't distracting or that it stops when the view includes today

### Files you may modify
- `src/components/calendar/CalendarView.tsx`
- `src/components/calendar/CalendarDayCell.tsx`
- `src/components/calendar/MonthView.tsx`
- `src/components/calendar/WeekView.tsx`
- `src/components/calendar/DayView.tsx`
- `src/components/calendar/MiniCalendar.tsx`
- `src/components/calendar/CalendarViewSwitcher.tsx`
- `src/components/calendar/constants.ts`

### Completion checklist
- [ ] All 15 screenshot states checked
- [ ] All visual bugs documented and fixed
- [ ] Dark mode verified for all views
- [ ] No new TypeScript errors (`npx tsc --noEmit`)
- [ ] Write completion notes to `.serena/memories/agent_handoffs.md`

---

## Agent 2: Functional Testing & Bug Fixes

**Branch:** `fix/calendar-functional`
**Worktree:** `.worktrees/calendar-functional`

### Mission
Run existing E2E tests, identify failures, test untested functionality, fix bugs in calendar logic and interactions.

### Step 1: Run existing tests

```bash
cd /Users/adrianstier/shared-todo-list/.worktrees/calendar-functional
npx playwright test tests/calendar-view.spec.ts --project=chromium --reporter=list
```

Document which tests pass/fail. Fix any failures.

### Step 2: Manual functional testing

Start the dev server and test these interactions by hand:

**Navigation:**
- [ ] Keyboard shortcuts: D (day), W (week), M (month), T (today), N (new task), ← → (navigate)
- [ ] Arrow keys in month grid navigate between cells (don't conflict with global arrow shortcuts)
- [ ] Escape closes filter dropdown, popup, and quick-add
- [ ] Today button navigates to current date in all three views
- [ ] Mini calendar date click updates main view date (doesn't change view mode)
- [ ] Click day number in month → drills into day view
- [ ] Click day header in week → drills into day view

**Drag and Drop:**
- [ ] Month view: drag task from one cell to another → shows toast "Task moved to [date]"
- [ ] Week view: drag task between day columns → shows toast
- [ ] Drag over a cell highlights it with accent ring
- [ ] Drag cancel returns task to original position
- [ ] Drag overlay follows cursor and shows task info
- [ ] Popup closes when drag ends (even without mouse movement)

**Quick Actions:**
- [ ] Hover over task in popup → shows checkmark and clock icons
- [ ] Click checkmark → marks task complete (verify Supabase update)
- [ ] Click clock → toggles waiting_for_response (verify Supabase update)
- [ ] Quick complete in day view works
- [ ] Toggle waiting in day view works

**Quick Add:**
- [ ] Month view empty cell: click "+ Add task" → shows inline input
- [ ] Type text + Enter → creates task with that date
- [ ] Press Escape → closes input without creating
- [ ] Blur with empty text → closes input
- [ ] Day view: click "+ Quick add task" → shows input, same behavior
- [ ] Quick add resets when navigating to different date

**Filtering:**
- [ ] Category filter: uncheck a category → tasks in that category disappear from all views
- [ ] "Select All" / "Clear All" work
- [ ] Assignee filter: check a name → only that person's tasks show
- [ ] Filter badge count updates correctly
- [ ] Filter state persists across view mode changes (month→week→day)
- [ ] Filter dropdown closes when clicking outside

**Data Display:**
- [ ] Overdue tasks show red text + pulsing dot
- [ ] At-risk renewals show amber warning triangle
- [ ] Waiting tasks show amber/red clock icon (red when follow-up overdue)
- [ ] Premium amounts display correctly (format: $1.2K, $500)
- [ ] Customer segment dots (elite=gold, premium=purple) display
- [ ] Subtask progress (e.g., "2/5") displays
- [ ] Recurrence icon displays with correct tooltip
- [ ] Reminder bell icon displays for tasks with pending reminders

**Edge Cases:**
- [ ] Day with 10+ tasks in month view: shows 3 previews + "+7 more"
- [ ] Very long task names truncate properly with ellipsis
- [ ] Task with no due_date doesn't appear in calendar (verify it's filtered)
- [ ] Completed tasks don't appear (verify filtered in allTodosByDate)
- [ ] Category counts in sidebar match actual filtered tasks
- [ ] View transitions don't flash or flicker
- [ ] Rapidly clicking prev/next doesn't break state

### Step 3: Fix bugs found

For each bug:
1. Document the reproduction steps
2. Identify the root cause in code
3. Fix it
4. Verify the fix manually

### Step 4: Add missing test coverage

Write new Playwright tests for critical untested paths. Add them to `tests/calendar-view.spec.ts`:

```typescript
// Suggested new test blocks:

test.describe('Calendar drag and drop', () => {
  // Test drag-drop reschedule in month view
  // Test drag-drop reschedule in week view
  // Test drag overlay appears during drag
});

test.describe('Calendar keyboard shortcuts', () => {
  // Test D/W/M switches view
  // Test T goes to today
  // Test arrow keys navigate (month view grid)
  // Test Escape closes filter/popup
});

test.describe('Calendar quick add', () => {
  // Test inline quick add in month empty cell
  // Test inline quick add in day view
  // Test Enter submits, Escape cancels
});

test.describe('Calendar day view', () => {
  // Test time period grouping headers appear
  // Test current time indicator on today
  // Test empty past day message
});

test.describe('Calendar data display', () => {
  // Test overdue tasks show red indicators
  // Test filter persistence across view changes
});
```

Follow existing test patterns:
- Use `login(page)` then `navigateToCalendar(page)` helpers
- Use `switchToMonthView(page)` when needed
- Use `isMobileViewport(page)` for conditional checks
- Prefer `data-testid` selectors where available, ARIA selectors otherwise
- Add `data-testid` attributes to components if needed for reliable selection

### Files you may modify
- `src/components/calendar/CalendarView.tsx`
- `src/components/calendar/CalendarDayCell.tsx`
- `src/components/calendar/MonthView.tsx`
- `src/components/calendar/WeekView.tsx`
- `src/components/calendar/DayView.tsx`
- `src/components/calendar/constants.ts`
- `tests/calendar-view.spec.ts`

### Completion checklist
- [ ] Existing 13 tests all pass
- [ ] All manual functional tests checked off (document any known issues)
- [ ] Bugs found and fixed (list in handoff)
- [ ] New test coverage added (target: drag-drop, keyboard shortcuts, quick add, day view)
- [ ] `npx playwright test tests/calendar-view.spec.ts --project=chromium` passes
- [ ] `npx tsc --noEmit` passes
- [ ] Write completion notes to `.serena/memories/agent_handoffs.md`

---

## Agent 3: Mobile & Responsive UX

**Branch:** `fix/calendar-mobile`
**Worktree:** `.worktrees/calendar-mobile`

### Mission
Test and fix the calendar on mobile viewports. The calendar has responsive code but likely has significant mobile UX issues.

### Step 1: Test at mobile viewports

```bash
cd /Users/adrianstier/shared-todo-list/.worktrees/calendar-mobile
npm run dev
```

Test at these viewport sizes:
- **iPhone SE** (375×667)
- **iPhone 12/13** (390×844)
- **iPad Mini** (768×1024)
- **iPad** (1024×1366) — this is the lg breakpoint where sidebar appears

### Step 2: Known mobile concerns to investigate

**Navigation:**
- [ ] Bottom nav "More" menu → Calendar works (tested in E2E but verify visually)
- [ ] Calendar heading appears after navigation
- [ ] View switcher (Day/Week/Month) is usable at 375px width
- [ ] Prev/Next/Today buttons don't wrap or overflow

**Month View on Mobile:**
- [ ] 7-column grid at 375px: cells are ~50px wide — very cramped
  - Task previews are likely unreadable at this size
  - The `text-[10px] sm:text-xs` sizing may still be too large
  - Consider: should mobile month view show only dot indicators instead of text previews?
- [ ] Cell min-height `min-h-[72px]` may cause too much scrolling on small screens
- [ ] Popup on cell hover — hover doesn't exist on touch! The popup is only triggered by `onMouseEnter`. Need a tap-to-open mechanism.
- [ ] "+N more" link uses `onClick` with `stopPropagation` — verify it works on touch

**Week View on Mobile:**
- [ ] Layout is `grid-cols-2 sm:grid-cols-4 md:grid-cols-7` — at 375px shows 2 columns, meaning you see 2 days at a time. Is this confusing? Can you scroll to see all 7?
- [ ] Day column headers show abbreviated names on mobile (`format(day, 'EEE')`)
- [ ] Task count badges fit within narrow columns

**Day View on Mobile:**
- [ ] This is probably the best mobile view — full-width task cards
- [ ] Quick-add input keyboard handling on iOS (Enter key behavior)
- [ ] Quick action buttons (complete/waiting) — hover-triggered opacity won't work on touch. Need always-visible or tap-triggered.

**Sidebar:**
- [ ] Hidden below `lg` breakpoint (`hidden lg:flex`). Correct behavior.
- [ ] Filter dropdown is the only way to access category filters on mobile
- [ ] Mini calendar and Today's Focus stats are invisible on mobile — is this acceptable?

**Touch Interactions:**
- [ ] Drag-and-drop uses PointerSensor with `distance: 8` activation. Test on actual touch — does it conflict with scroll?
- [ ] Long-press to drag? Or should drag be disabled on mobile?
- [ ] Swipe gestures for prev/next navigation? (Not implemented — consider adding)

### Step 3: Fix mobile issues

Priority fixes (most likely needed):

**A. Month view cell tap interaction (HIGH)**
The popup only opens on `onMouseEnter` which doesn't fire on touch. Fix:
```typescript
// CalendarDayCell.tsx — add tap handler
const handleCellClick = useCallback(() => {
  if (todos.length > 0 && window.matchMedia('(hover: none)').matches) {
    // On touch devices, first tap opens popup, second tap navigates to day view
    if (!showPopup) {
      setShowPopup(true);
      return;
    }
  }
  onClick();
}, [onClick, todos.length, showPopup]);
```

**B. Quick action buttons visibility on touch (HIGH)**
`opacity-0 group-hover/task:opacity-100` won't work on touch. Fix:
```typescript
// Add a media query approach or always show on touch devices
className={`... ${
  'opacity-0 group-hover/task:opacity-100 [@media(hover:none)]:opacity-100'
}`}
```

**C. Month view task previews on small screens (MEDIUM)**
At 375px, text previews in cells are nearly illegible. Consider:
- Below `sm` breakpoint, show only colored dots (no text) in month cells
- Or reduce to showing max 2 previews instead of 3
- Or increase cell touch target without showing text

**D. Week view 2-column layout (MEDIUM)**
Showing only 2 days at a time on mobile is functional but disorienting. Consider:
- A horizontal scroll view showing all 7 days
- Or defaulting to day view on mobile instead of week view
- Or a list-based week view instead of grid

**E. Swipe navigation (LOW)**
Add horizontal swipe gesture for prev/next:
```typescript
// Use framer-motion drag gesture or a touch event handler
// Swipe left = next, swipe right = previous
```

### Step 4: Run mobile E2E tests

```bash
# Run existing tests at mobile viewport
npx playwright test tests/calendar-view.spec.ts --project=chromium \
  --viewport='{"width":390,"height":844}' --reporter=list
```

Add new mobile-specific tests:
```typescript
test.describe('Calendar mobile UX', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  
  test('Month cell tap opens popup on touch device', async ({ page }) => { ... });
  test('Quick action buttons visible on touch', async ({ page }) => { ... });
  test('View switcher fits at 375px', async ({ page }) => { ... });
  test('Day view quick-add works on mobile', async ({ page }) => { ... });
});
```

### Files you may modify
- `src/components/calendar/CalendarDayCell.tsx` (touch interaction, responsive sizing)
- `src/components/calendar/WeekView.tsx` (mobile layout)
- `src/components/calendar/MonthView.tsx` (mobile cell rendering)
- `src/components/calendar/CalendarView.tsx` (swipe gestures, mobile defaults)
- `src/components/calendar/DayView.tsx` (touch action visibility)
- `tests/calendar-view.spec.ts` (mobile tests)

### Completion checklist
- [ ] All 4 viewport sizes tested and screenshotted
- [ ] Month cell touch interaction fixed
- [ ] Quick action touch visibility fixed
- [ ] Month view readable on 375px screens
- [ ] Week view usable on mobile
- [ ] No regressions at desktop viewport
- [ ] Mobile E2E tests added and passing
- [ ] `npx tsc --noEmit` passes
- [ ] Write completion notes to `.serena/memories/agent_handoffs.md`

---

## Agent 4: Merge & Validate

**Branch:** `main`
**Runs after Agents 1-3 complete**

### Step 1: Merge branches

```bash
cd /Users/adrianstier/shared-todo-list
git checkout main

# Merge in order: functional fixes first (most likely to have test changes),
# then visual, then mobile
git merge fix/calendar-functional --no-edit
git merge fix/calendar-visual --no-edit
git merge fix/calendar-mobile --no-edit

# Resolve any conflicts — calendar files are the likely conflict zone
# Prefer mobile agent's changes for responsive code
# Prefer visual agent's changes for styling
# Prefer functional agent's changes for logic/behavior
```

### Step 2: Resolve conflicts

Most likely conflict areas:
- `CalendarDayCell.tsx` — all three agents may modify this (visual styling, click handlers, touch handling)
- `CalendarView.tsx` — visual agent (styling) and mobile agent (swipe, defaults) may both touch this
- `tests/calendar-view.spec.ts` — functional and mobile agents both add tests
- `constants.ts` — less likely but possible

### Step 3: Run full validation

```bash
# TypeScript
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build

# All calendar tests
npx playwright test tests/calendar-view.spec.ts --project=chromium --reporter=list

# Full test suite (catch regressions)
npx playwright test --project=chromium --reporter=list
```

### Step 4: Visual regression check

Start dev server and manually verify:
- [ ] Desktop month view looks correct
- [ ] Desktop week view looks correct
- [ ] Desktop day view looks correct
- [ ] Mobile month view (390px) — cells readable, tap works
- [ ] Mobile day view — quick actions visible
- [ ] Dark mode — all views
- [ ] Drag and drop — month and week views
- [ ] Keyboard shortcuts all work
- [ ] Filter dropdown works
- [ ] No console errors

### Step 5: Clean up worktrees

```bash
git worktree remove .worktrees/calendar-visual
git worktree remove .worktrees/calendar-functional
git worktree remove .worktrees/calendar-mobile
git branch -d fix/calendar-visual fix/calendar-functional fix/calendar-mobile
```

### Step 6: Document changes

Write a summary of all changes made to `.serena/memories/agent_handoffs.md`:
- Bugs found and fixed (by agent)
- UX improvements made
- New tests added
- Known remaining issues (if any)

---

## Quick Reference: Key Patterns

**Theming:** Uses CSS custom properties (`var(--surface)`, `var(--foreground)`, `var(--accent)`, etc.), not raw Tailwind colors. Always use these for backgrounds, text, borders.

**Dark mode:** Supported via CSS custom properties. Some overrides use `dark:` prefix for specific adjustments.

**Test login:**
```typescript
await page.goto('/');
// Click Derrick user card, enter PIN 8008
```

**Navigate to calendar:**
```typescript
// Desktop: sidebar button
// Mobile: More menu → Calendar
```

**Activity logging:** Any Supabase mutations must call `safeLogActivity()`.

**TypeScript:** Strict mode. All types in `src/types/`.

**Existing test helpers:** `hideDevOverlay(page)`, `isMobileViewport(page)`, `login(page)`, `navigateToCalendar(page)`, `switchToMonthView(page)`.
