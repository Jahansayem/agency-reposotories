# Bug Bash Report: Task & Todo Core

**Scope:** Task & Todo Core
**Auditor:** Claude (Opus 4.6)
**Date:** 2026-02-09
**Status:** Complete

## Summary

Audited **65+ files** across the Task & Todo Core scope:
- Types, store, hooks, components, API routes
- `src/types/todo.ts`, `src/store/todoStore.ts`
- `src/components/` (AddTodo, TodoList, TodoItem, VirtualTodoList, SortableTodoItem, SwipeableTodoItem, AnimatedTodoItem, InlineAddTask, TaskSections, TaskCompletionSummary, DuplicateDetectionModal, SmartParseModal, AddTaskModal)
- `src/components/todo-item/` (SubtaskItem, MetadataBadges, QuickInlineActions, ActionsDropdownMenu, DeleteConfirmDialog, ExpandedPanel, CollapsedPanels, types, utils, index)
- `src/components/task/` (TaskCard, TaskCardHeader, TaskCardMetadata, TaskCardSecondary, TaskCardStatusStrip, index)
- `src/components/task-detail/` (TaskDetailModal, useTaskDetail, TaskDetailHeader, MetadataSection, NotesSection, SubtasksSection, AttachmentsSection, ReminderRow, WaitingRow, TaskDetailFooter, OverflowMenu, index)
- `src/components/todo/` (TodoHeader, TodoListContent, TodoModals, BulkActionBar, TodoMergeModal, TodoFiltersBar, todoListUtils, index)
- `src/hooks/` (useTodoOperations, useTodoListState, useTodoBulkOperations, useTodoKeyboardShortcuts, useTodoActions, useTodoItem, useTodoData, useTodoModalActions, useFilters, useBulkActions, useTodoModals, useModalState)
- `src/app/api/todos/` (route.ts, reorder/route.ts, waiting/route.ts, check-waiting/route.ts)

**Issues found:** 13
**Issues fixed:** 4 (all HIGH severity)
**TypeScript check:** PASSED (npx tsc --noEmit)

---

## Issues

### FIXED

#### 1. [HIGH] Snooze produces full ISO string instead of YYYY-MM-DD date
- **File:** `/Users/adrianstier/shared-todo-list/src/hooks/useTodoItem.ts` line 239
- **Description:** `handleSnooze` passes `newDueDate.toISOString()` to `onSetDueDate`, producing a full ISO timestamp (e.g., `2026-02-16T08:00:00.000Z`). The `due_date` field across the entire codebase uses `YYYY-MM-DD` format. Date input elements use `.split('T')[0]` to extract the date portion. Passing a full ISO string would cause display inconsistencies and could break date comparisons in filters.
- **Fix:** Changed to `newDueDate.toISOString().split('T')[0]`.

#### 2. [HIGH] calculateNextDueDate returns full ISO instead of YYYY-MM-DD
- **File:** `/Users/adrianstier/shared-todo-list/src/hooks/useTodoActions.ts` line 329
- **Description:** `calculateNextDueDate()` returns `nextDate.toISOString()` which produces a full ISO timestamp. This function is called when recurring tasks complete to set the next due date. The inconsistent format (ISO vs `YYYY-MM-DD`) could cause timezone-related off-by-one errors and display bugs.
- **Fix:** Changed to `nextDate.toISOString().split('T')[0]`.

#### 3. [HIGH] useTaskDetail snooze produces full ISO string instead of YYYY-MM-DD
- **File:** `/Users/adrianstier/shared-todo-list/src/components/task-detail/useTaskDetail.ts` line 159
- **Description:** The `snooze` callback in `useTaskDetail` sets `due_date` to `date.toISOString()` (full ISO timestamp), inconsistent with the `YYYY-MM-DD` format used everywhere else for due dates. This affects the TaskDetailModal snooze feature.
- **Fix:** Changed to `date.toISOString().split('T')[0]`.

#### 4. [HIGH] Stale closure: addTodo references createTodoDirectly before it's defined
- **File:** `/Users/adrianstier/shared-todo-list/src/hooks/useTodoOperations.ts` lines 58-86
- **Description:** `addTodo` was defined with `useCallback` before `createTodoDirectly`, but `addTodo` calls `createTodoDirectly` inside its callback body. The dependency array originally listed only `[todos, openDuplicateModal]`, missing `createTodoDirectly`. This meant `addTodo` would capture a stale reference to `createTodoDirectly`. Additionally, since `createTodoDirectly` was a `const` declared after `addTodo`, adding it to the dependency array would have caused a temporal dead zone reference error.
- **Fix:** Reordered the two functions so `createTodoDirectly` is defined first, then `addTodo` references it correctly in both its body and dependency array `[todos, openDuplicateModal, createTodoDirectly]`.

### NOT FIXED (MEDIUM)

#### 5. [MEDIUM] SmartParseModal: handleConfirm not memoized but used in useEffect deps
- **File:** `/Users/adrianstier/shared-todo-list/src/components/SmartParseModal.tsx` line ~91
- **Description:** `handleConfirm` is a plain function (not wrapped in `useCallback`) but appears to be referenced in a `useEffect` dependency array. Since its identity changes on every render, the effect will re-register keyboard listeners every render. Not a crash bug but causes unnecessary re-registrations and potential performance overhead.

#### 6. [MEDIUM] VirtualTodoList: Multiple `any` types in props
- **File:** `/Users/adrianstier/shared-todo-list/src/components/VirtualTodoList.tsx` lines 29-37
- **Description:** Props `onSetPriority`, `onStatusChange`, `onSetRecurrence`, `onUpdateSubtasks`, and `onUpdateAttachments` all use `any` type instead of proper typed signatures. This disables type-checking for these callbacks and could allow incorrect argument types to be passed silently.

#### 7. [MEDIUM] VirtualTodoList: Missing props compared to TodoItemProps
- **File:** `/Users/adrianstier/shared-todo-list/src/components/VirtualTodoList.tsx`
- **Description:** Several props that `TodoItem` expects are not passed through `VirtualTodoList`: `onSetReminder`, `onMarkWaiting`, `onClearWaiting`, `onEmailCustomer`, `onOpenDetail`. This means tasks rendered via virtual scrolling may be missing functionality compared to non-virtual rendering.

#### 8. [MEDIUM] AddTodo: Unsafe type cast for subtasks
- **File:** `/Users/adrianstier/shared-todo-list/src/components/AddTodo.tsx` line ~347
- **Description:** Uses `undefined as unknown as Subtask[]` when no subtasks exist. While this doesn't cause a runtime error because it is only passed through to the add handler where `undefined` is acceptable, the double cast pattern (`undefined as unknown as T`) is a code smell that circumvents TypeScript's type safety.

#### 9. [MEDIUM] TodoList: `any[]` type for attachments parameter
- **File:** `/Users/adrianstier/shared-todo-list/src/components/TodoList.tsx` line ~482
- **Description:** The `updateAttachments` callback uses `any[]` type for the attachments parameter instead of `Attachment[]`. This weakens type safety.

#### 10. [MEDIUM] useTodoKeyboardShortcuts: Missing callback deps in useEffect
- **File:** `/Users/adrianstier/shared-todo-list/src/hooks/useTodoKeyboardShortcuts.ts` line ~125
- **Description:** The `useEffect` has an ESLint exhaustive-deps disable comment. The dependency array `[visibleTodos.length, showBulkActions, selectedTodos.size]` is missing multiple callback functions used inside the effect: `setSearchQuery`, `setQuickFilter`, `setFocusMode`, `toggleFocusMode`, `clearSelection`, `selectAll`, `openShortcuts`, `setShowBulkActions`. If these callbacks are not stable references, the effect could use stale versions.

### NOT FIXED (LOW)

#### 11. [LOW] DuplicateDetectionModal: Unused `newTaskSourceFile` prop
- **File:** `/Users/adrianstier/shared-todo-list/src/components/DuplicateDetectionModal.tsx` line ~37
- **Description:** The `newTaskSourceFile` prop is declared in the interface and accepted by the component, but never referenced in the component body. Dead code.

#### 12. [LOW] TaskSections: Many declared but unused props
- **File:** `/Users/adrianstier/shared-todo-list/src/components/TaskSections.tsx` lines 25-48
- **Description:** The `TaskSectionsProps` interface declares many props (users, currentUserName, selectedTodos, showBulkActions, onSelectTodo, onToggle, onDelete, etc.) but the component only destructures and uses `todos`, `renderTodoItem`, and `emptyState`. The other props are passed through from `TodoListContent` but not used.

#### 13. [LOW] TaskDetailModal: Non-null assertion on potentially null `todo`
- **File:** `/Users/adrianstier/shared-todo-list/src/components/task-detail/TaskDetailModal.tsx` line 87
- **Description:** `useTaskDetail` is called with `todo!` (non-null assertion) on line 87, but the null guard (`if (!todo) return null`) doesn't come until line 102-104 -- after hooks have been called. This is necessary due to React's rules of hooks (hooks can't be called conditionally). While the parent component typically guards against null `todo` before rendering, this pattern means if `todo` is null, hooks will run with undefined data before the null check returns null. The `useTaskDetail` hook reads `todo.text`, `todo.notes`, etc. which would throw if `todo` were actually null.

---

## Files Audited (No Issues Found)

The following files were audited and found to be clean:

- `src/types/todo.ts` -- Well-structured types, constants, and helpers
- `src/store/todoStore.ts` -- Zustand store with proper selectors and devtools
- `src/components/AddTaskModal.tsx` -- Clean modal wrapper
- `src/components/SortableTodoItem.tsx` -- Proper memo with custom comparator
- `src/components/SwipeableTodoItem.tsx` -- Touch gesture handling
- `src/components/SwipeableSortableTodoItem.tsx` -- Combined swipe + sort
- `src/components/InlineAddTask.tsx` -- Simple inline input
- `src/components/TaskCompletionSummary.tsx` -- Clean modal with focus trap
- `src/components/todo-item/SubtaskItem.tsx` -- Memoized subtask component
- `src/components/todo-item/MetadataBadges.tsx` -- Badge display
- `src/components/todo-item/QuickInlineActions.tsx` -- Inline action controls
- `src/components/todo-item/ActionsDropdownMenu.tsx` -- Portal-based dropdown
- `src/components/todo-item/DeleteConfirmDialog.tsx` -- Confirmation dialog
- `src/components/todo-item/ExpandedPanel.tsx` -- Full task editing panel
- `src/components/todo-item/CollapsedPanels.tsx` -- Inline content panels
- `src/components/todo-item/utils.ts` -- Utility functions
- `src/components/task/TaskCard.tsx` -- Unified task card
- `src/components/task/TaskCardHeader.tsx` -- Card header
- `src/components/task/TaskCardMetadata.tsx` -- Card metadata
- `src/components/task/TaskCardSecondary.tsx` -- Secondary metadata
- `src/components/task/TaskCardStatusStrip.tsx` -- Status indicator
- `src/components/task-detail/TaskDetailHeader.tsx` -- Detail modal header
- `src/components/task-detail/MetadataSection.tsx` -- Detail metadata grid
- `src/components/task-detail/NotesSection.tsx` -- Notes with auto-resize
- `src/components/task-detail/SubtasksSection.tsx` -- Subtask management
- `src/components/task-detail/AttachmentsSection.tsx` -- Attachment management
- `src/components/task-detail/ReminderRow.tsx` -- Reminder picker row
- `src/components/task-detail/WaitingRow.tsx` -- Waiting status row
- `src/components/task-detail/TaskDetailFooter.tsx` -- Footer with timestamps
- `src/components/task-detail/OverflowMenu.tsx` -- Overflow menu
- `src/components/todo/TodoHeader.tsx` -- Simplified header
- `src/components/todo/TodoListContent.tsx` -- List/kanban rendering
- `src/components/todo/TodoModals.tsx` -- All modals orchestration
- `src/components/todo/BulkActionBar.tsx` -- Bulk action bar
- `src/components/todo/TodoMergeModal.tsx` -- Merge modal
- `src/components/todo/TodoFiltersBar.tsx` -- Filter bar with keyboard shortcuts
- `src/components/todo/todoListUtils.ts` -- Pure utility functions
- `src/hooks/useTodoListState.ts` -- Consolidated state hook
- `src/hooks/useTodoBulkOperations.ts` -- Bulk operations
- `src/hooks/useTodoData.ts` -- Data fetching with real-time
- `src/hooks/useTodoModalActions.ts` -- Modal action handlers
- `src/hooks/useFilters.ts` -- Filter, search, and sort logic
- `src/hooks/useBulkActions.ts` -- Bulk selection and operations
- `src/hooks/useTodoModals.ts` -- Modal state management
- `src/hooks/useModalState.ts` -- Raw modal state
- `src/app/api/todos/route.ts` -- Secure CRUD API
- `src/app/api/todos/reorder/route.ts` -- Reorder API
- `src/app/api/todos/waiting/route.ts` -- Waiting status API
- `src/app/api/todos/check-waiting/route.ts` -- Cron check endpoint

---

## Verification

```
$ npx tsc --noEmit
(no errors)
```

All 4 fixes pass TypeScript compilation with no regressions.
