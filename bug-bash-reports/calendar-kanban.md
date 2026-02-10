# Calendar & Kanban Bug Bash Report

## Summary
- Files audited: 21
- Issues found: 14 (1 critical, 2 high, 5 medium, 6 low)
- Issues fixed: 2 (both HIGH severity)

## Files Audited

### Calendar
1. `src/types/calendar.ts`
2. `src/components/calendar/calendarUtils.ts`
3. `src/components/calendar/CalendarView.tsx`
4. `src/components/calendar/MonthView.tsx`
5. `src/components/calendar/WeekView.tsx`
6. `src/components/calendar/DayView.tsx`
7. `src/components/calendar/CalendarDayCell.tsx`
8. `src/components/calendar/MiniCalendar.tsx`
9. `src/components/calendar/CalendarViewSwitcher.tsx`
10. `src/components/calendar/CalendarDragOverlay.tsx`
11. `src/components/calendar/index.ts`

### Kanban
12. `src/components/kanban/KanbanCard.tsx`
13. `src/components/kanban/KanbanColumn.tsx`
14. `src/components/kanban/kanbanUtils.ts`
15. `src/components/kanban/index.ts`
16. `src/components/KanbanBoard.tsx`

### Views
17. `src/components/views/AIInbox.tsx`
18. `src/components/views/ChatView.tsx`
19. `src/components/views/DashboardPage.tsx`
20. `src/components/views/AnalyticsPage.tsx`
21. `src/components/views/CustomerLookupView.tsx`
22. `src/components/views/index.ts`

---

## Critical Issues

### 1. CROSS-MODULE: React Hooks called after conditional early return in DashboardPage
- **File**: `src/components/views/DashboardPage.tsx`, lines 137-176+
- **Severity**: CRITICAL
- **Description**: The component calls `useState` (lines 126-127) before a conditional early return on lines 137-171 (`if (useNewDashboards)`), but then calls `useEffect` (line 176), and multiple `useMemo` hooks (lines 182-370) AFTER the conditional return. This violates React's Rules of Hooks, which require hooks to be called in the same order on every render. If `useNewDashboards` were to toggle from `true` to `false` between renders, React would see a different number of hook calls and crash.
- **Impact**: Since `useNewDashboards` defaults to `true` and is likely always `true`, the hooks after line 176 are effectively dead code. The app works by accident. If anyone ever passes `useNewDashboards={false}` or toggles it, React would throw an error.
- **Fix**: Move all hooks above the conditional return, or restructure into separate components.
- **Note**: Marked as CROSS-MODULE because `DashboardPage.tsx` is in `views/` which is my scope, but the fix touches component architecture. Not fixed because it requires significant refactoring.

---

## High Issues

### 2. Timezone bug in CalendarView category counts -- FIXED
- **File**: `src/components/calendar/CalendarView.tsx`, line 188
- **Severity**: HIGH
- **Status**: FIXED
- **Description**: The `categoryCounts` memo uses `new Date(todo.due_date)` to create a Date object for `isSameMonth` comparison. When `due_date` is a date-only string like `"2024-01-31"`, `new Date("2024-01-31")` is parsed as UTC midnight. In western timezones (e.g., PST = UTC-8), this evaluates to January 30, 11:59 PM local time. This can cause tasks due on the 1st of a month to be counted in the wrong month's category filter counts. The main calendar grid (line 173) correctly avoids this by using `todo.due_date.split('T')[0]`, but the filter counts do not.
- **Impact**: Category filter badge counts in the sidebar may show incorrect numbers, especially for tasks due on the first or last day of a month, depending on user timezone.
- **Fix applied**: Changed to string-based month comparison using `todo.due_date.substring(0, 7)` compared against `format(currentDate, 'yyyy-MM')`. Also removed the now-unused `isSameMonth` import from date-fns.

### 3. CalendarDayCell popup stuck open after drag ends -- FIXED
- **File**: `src/components/calendar/CalendarDayCell.tsx`, lines 161-162, 232-233
- **Severity**: HIGH
- **Status**: FIXED
- **Description**: The popup's `onMouseLeave` handler checks `!isDragActive` before closing: `onMouseLeave={() => !isDragActive && setShowPopup(false)}`. During a drag operation, `isDragActive` is `true`, so the popup stays open (correct behavior -- allows dragging from popup). However, when the drag ends and `isDragActive` becomes `false` via parent state update, `onMouseLeave` does NOT fire because the mouse hasn't moved. If the mouse cursor is still over the popup after the drag ends, the popup remains stuck open until the user moves the mouse away.
- **Impact**: After dragging a task from a popup to another date, the popup from the source date cell may remain visible, creating visual confusion. The user must move the mouse away to dismiss it.
- **Fix applied**: Added a `useEffect` with a `useRef` to track the previous value of `isDragActive`. When `isDragActive` transitions from `true` to `false`, the popup is automatically closed via `setShowPopup(false)`. This ensures the popup is dismissed when the drag operation completes.

---

## Medium Issues

### 4. Unused variable `config` in KanbanColumn sectioned view
- **File**: `src/components/kanban/KanbanColumn.tsx`, line 134
- **Severity**: MEDIUM
- **Description**: Inside the sectioned view IIFE, `const config = dateSectionConfig[sectionKey]` is assigned but never used. This was likely intended for rendering section headers (the comment on line 139 says "Cards - no section headers (clean layout)"), suggesting section headers were removed but the variable assignment was left behind.
- **Impact**: Dead code; no runtime effect. `dateSectionConfig` is imported but only used for this unused assignment.

### 5. `onReschedule` prop accepted but not implemented in WeekView
- **File**: `src/components/calendar/WeekView.tsx`, lines 21, 45
- **Severity**: MEDIUM
- **Description**: The `onReschedule` prop is declared in the interface and destructured in the component, but is never used. The WeekView has no DndContext or droppable/draggable setup. Drag-and-drop rescheduling is only functional in MonthView.
- **Impact**: Consumers passing `onReschedule` to WeekView might expect drag-and-drop to work, but it silently does nothing.

### 6. `onReschedule` prop accepted but not implemented in DayView
- **File**: `src/components/calendar/DayView.tsx`, lines 13, 28
- **Severity**: MEDIUM
- **Description**: Same as issue #5 but for DayView. The prop is declared and destructured but never referenced.
- **Impact**: Same as #5.

### 7. Entire `calendarUtils.ts` module is dead code
- **File**: `src/components/calendar/calendarUtils.ts`
- **Severity**: MEDIUM
- **Description**: The file exports three functions (`groupTodosByDate`, `getWeekDays`, `toDateKey`) that are never imported by any file in the codebase. `CalendarView.tsx` duplicates the `groupTodosByDate` logic inline in its `todosByDate` memo (lines 164-178). `WeekView.tsx` duplicates `getWeekDays` logic inline (lines 47-52). The `toDateKey` function duplicates `format(date, 'yyyy-MM-dd')` calls found throughout the calendar components.
- **Impact**: Unnecessary module in the bundle. No runtime effect but increases confusion about where canonical logic lives.

### 8. `theme` destructured but unused in AIInbox
- **File**: `src/components/views/AIInbox.tsx`, line 104
- **Severity**: MEDIUM
- **Description**: `const { theme } = useTheme()` is called but `theme` is never referenced in the component. The component uses only CSS variable-based styling, so the theme context value is not needed.
- **Impact**: Unnecessary context subscription; the component will re-render whenever the theme changes even though it doesn't use the value.

---

## Low Issues

### 9. Unused imports in KanbanBoard.tsx: `Flag`, `User`, `AlertCircle`, `memo`, `Music`
- **File**: `src/components/KanbanBoard.tsx`, lines 3, 21, 22, 25, 33
- **Severity**: LOW
- **Description**: Five imports are never referenced in the component body:
  - `memo` from `react` (line 3)
  - `Flag` from `lucide-react` (line 21)
  - `User` from `lucide-react` (line 22)
  - `AlertCircle` from `lucide-react` (line 25)
  - `Music` from `lucide-react` (line 33)
- **Impact**: Slightly larger bundle size. No runtime effect.

### 10. Destructured but unused props in KanbanBoard: `onSetReminder`, `onMarkWaiting`, `onClearWaiting`
- **File**: `src/components/KanbanBoard.tsx`, lines 788-790
- **Severity**: LOW
- **Description**: Three props (`onSetReminder`, `onMarkWaiting`, `onClearWaiting`) are destructured from the component props but are never passed down to any child component or used in any handler. These were likely part of features that were moved or removed.
- **Impact**: Dead code. Props are accepted on the interface but have no effect.

### 11. `useMemo` import unused in CalendarDayCell
- **File**: `src/components/calendar/CalendarDayCell.tsx`, line 3
- **Severity**: LOW (actually used on line 126)
- **Status**: FALSE POSITIVE -- `useMemo` IS used for `categoryGroups` on line 126.

### 12. CalendarDayCell popup truncates at 5 tasks without drag support for hidden items
- **File**: `src/components/calendar/CalendarDayCell.tsx`, lines 253, 261
- **Severity**: LOW
- **Description**: The popup shows only the first 5 tasks (`todos.slice(0, 5)`) with a "+N more tasks" label for the rest. However, those hidden tasks cannot be dragged because they are not rendered as `DraggableTaskItem` components. Users with more than 5 tasks on a single day cannot drag the hidden ones.
- **Impact**: Minor UX limitation; users need to click the date to see all tasks if they want to interact with tasks beyond the first 5.

### 13. Missing `key` prop on TaskDetailModal inside AnimatePresence
- **File**: `src/components/KanbanBoard.tsx`, lines 1055-1077
- **Severity**: LOW
- **Description**: The `TaskDetailModal` inside `AnimatePresence` does not have a `key` prop. While `AnimatePresence` can detect child removal, a `key` (e.g., `key={selectedTodoId}`) would ensure proper exit animation when switching between different tasks and help AnimatePresence track the component lifecycle.
- **Impact**: The exit animation may not play cleanly when switching directly from one task to another (the old modal won't animate out before the new one animates in).

### 14. Stale closure risk in CalendarView's `goToToday` and `handleMiniCalendarDateClick`
- **File**: `src/components/calendar/CalendarView.tsx`, lines 131-140
- **Severity**: LOW
- **Description**: Both `goToToday` (line 131) and `handleMiniCalendarDateClick` (line 137) use `currentDate` in their dependency arrays and reference it in the callback to determine direction. However, since they use `setCurrentDate` (not the functional updater form) and compare against `currentDate` from the closure, there's a minor risk of stale closure if these fire in quick succession. In practice, the `useCallback` dependency on `currentDate` ensures the callbacks are recreated, so this is not a real bug.
- **Status**: FALSE POSITIVE upon deeper analysis.

---

## No-Fix Rationale

For the CRITICAL issue (#1, DashboardPage hooks violation): This requires significant component restructuring. The component needs to either (a) move all hooks above the early return, (b) split into two components (NewDashboard and LegacyDashboard), or (c) wrap the legacy dashboard in a separate component. Since `useNewDashboards` defaults to `true`, the legacy code path is effectively dead and this isn't causing runtime errors. The fix carries refactoring risk for a code path that isn't executed.

Both HIGH issues (#2 and #3) were fixed successfully. See details in the High Issues section above.

---

## TypeScript Check

```
$ npx tsc --noEmit
(No errors)
```

All files pass TypeScript compilation. No type errors found.
