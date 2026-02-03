# Phase 4: Frontend Permission Migration - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all legacy permission checks (`isOwner()`, `isAdmin()`, hardcoded name arrays) with the new `usePermission()` hook and `PermissionGate` component.

**Architecture:** The permission infrastructure already exists (`usePermission`, `PermissionGate`, `AgencyContext`). This plan migrates 33 components to consistently use these patterns for navigation gating, feature gates, staff data scoping, role display, and legacy code cleanup.

**Tech Stack:** React 19, TypeScript, Zustand, Supabase real-time subscriptions

---

## Pre-requisites

Before starting Phase 4, ensure:
- [x] `src/types/agency.ts` has all 21 `AgencyPermissions` flags defined
- [x] `src/hooks/usePermission.ts` exists and works
- [x] `src/hooks/useRoleCheck.ts` exists and works
- [x] `src/components/ui/PermissionGate.tsx` exists and works
- [x] `src/contexts/AgencyContext.tsx` has `hasPermission()` with single-tenant fallback
- [x] `src/contexts/UserContext.tsx` exists and provides `currentUser`
- [ ] Phase 2 complete (auth plumbing threads agencyId through session)
- [ ] Phase 3 complete (API routes enforce permissions server-side)

---

## Task Overview

| Task | Component Area | Files | Priority |
|------|----------------|-------|----------|
| 1 | Navigation Gating | NavigationSidebar, CommandPalette | Critical |
| 2 | AppShell View Routing | AppShell, MainApp | Critical |
| 3 | Task Operations | TaskDetailPanel, TodoItem | High |
| 4 | Bulk Actions | BulkActionBar | High |
| 5 | Chat Message Management | ChatMessageList | High |
| 6 | Strategic Goals | StrategicDashboard | High |
| 7 | Staff Data Scoping | useTodoData hook, Zustand store | High |
| 8 | Real-time Event Filtering | useTodoData subscription | Medium |
| 9 | Role Display Updates | AgencySwitcher, AgencyMembersModal | Medium |
| 10 | Template Management | TodoModals, SaveTemplateModal | Medium |
| 11 | Legacy Code Cleanup | types/todo.ts, imports across codebase | Low |

---

## Task 1: Navigation Sidebar Permission Gating

**Files:**
- Modify: `src/components/layout/NavigationSidebar.tsx`
- Test: Manual verification + existing E2E tests

**Step 1: Read current NavigationSidebar implementation**

```bash
# Understand current structure
cat src/components/layout/NavigationSidebar.tsx | head -100
```

**Step 2: Add permission-based filtering to nav items**

Find the nav items array and add a `permission` field:

```typescript
// In NavigationSidebar.tsx
import { usePermission } from '@/hooks/usePermission';
import type { AgencyPermissions } from '@/types/agency';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType;
  view: string;
  permission?: keyof AgencyPermissions;  // NEW: optional permission requirement
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, view: 'tasks' },
  { id: 'chat', label: 'Chat', icon: MessageSquare, view: 'chat' },
  { id: 'goals', label: 'Strategic Goals', icon: Target, view: 'strategic', permission: 'can_view_strategic_goals' },
  { id: 'archive', label: 'Archive', icon: Archive, view: 'archive', permission: 'can_view_archive' },
];
```

**Step 3: Filter nav items by permission**

```typescript
// Inside the component
const canViewStrategicGoals = usePermission('can_view_strategic_goals');
const canViewArchive = usePermission('can_view_archive');

// Create permission lookup
const permissionMap: Record<string, boolean> = {
  'can_view_strategic_goals': canViewStrategicGoals,
  'can_view_archive': canViewArchive,
};

// Filter items
const visibleNavItems = NAV_ITEMS.filter(item =>
  !item.permission || permissionMap[item.permission]
);
```

**Step 4: Update render to use filtered items**

Replace any direct NAV_ITEMS mapping with `visibleNavItems.map(...)`.

**Step 5: Verify by running dev server**

```bash
npm run dev
# Log in as a staff user (no strategic goals permission)
# Verify Strategic Goals and Archive nav items are hidden
```

**Step 6: Commit**

```bash
git add src/components/layout/NavigationSidebar.tsx
git commit -m "feat(permissions): gate navigation items by user permissions

- Add permission field to NavItem interface
- Filter nav items based on usePermission() results
- Strategic Goals requires can_view_strategic_goals
- Archive requires can_view_archive

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: CommandPalette Permission Gating

**Files:**
- Modify: `src/components/layout/CommandPalette.tsx`

**Step 1: Read current CommandPalette structure**

Look for the commands array and how items are filtered/rendered.

**Step 2: Add permission field to command items**

```typescript
interface CommandItem {
  id: string;
  label: string;
  action: () => void;
  permission?: keyof AgencyPermissions;
  // ... other fields
}
```

**Step 3: Filter commands by permission**

```typescript
const canViewStrategicGoals = usePermission('can_view_strategic_goals');
const canViewArchive = usePermission('can_view_archive');
const canManageTemplates = usePermission('can_manage_templates');

const filteredCommands = commands.filter(cmd => {
  if (!cmd.permission) return true;
  switch (cmd.permission) {
    case 'can_view_strategic_goals': return canViewStrategicGoals;
    case 'can_view_archive': return canViewArchive;
    case 'can_manage_templates': return canManageTemplates;
    default: return true;
  }
});
```

**Step 4: Test with Cmd+K**

```bash
npm run dev
# Press Cmd+K (or Ctrl+K)
# Verify restricted commands don't appear for staff users
```

**Step 5: Commit**

```bash
git add src/components/layout/CommandPalette.tsx
git commit -m "feat(permissions): gate command palette items by permission

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: AppShell View Routing Guards

**Files:**
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/components/MainApp.tsx` (if view routing is here)

**Step 1: Find view routing logic**

Search for where `view === 'strategic'` or similar conditionals exist.

**Step 2: Add permission check before rendering restricted views**

```typescript
const canViewStrategicGoals = usePermission('can_view_strategic_goals');
const canViewArchive = usePermission('can_view_archive');

// In render logic:
{view === 'strategic' && canViewStrategicGoals && <StrategicDashboard />}
{view === 'archive' && canViewArchive && <ArchiveView />}

// If user navigates to restricted view without permission, redirect to tasks
useEffect(() => {
  if (view === 'strategic' && !canViewStrategicGoals) {
    setView('tasks');
  }
  if (view === 'archive' && !canViewArchive) {
    setView('tasks');
  }
}, [view, canViewStrategicGoals, canViewArchive]);
```

**Step 3: Test view access**

```bash
npm run dev
# Try URL manipulation to access /strategic as staff
# Verify redirect to tasks
```

**Step 4: Commit**

```bash
git add src/components/layout/AppShell.tsx src/components/MainApp.tsx
git commit -m "feat(permissions): guard restricted views with permission checks

- Prevent rendering strategic/archive views without permission
- Auto-redirect to tasks if user navigates to restricted view

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: TaskDetailPanel Operation Permissions

**Files:**
- Modify: `src/components/layout/TaskDetailPanel.tsx`

**Step 1: Identify all action buttons**

Look for: Delete, Edit, Assign, AI features, Template save

**Step 2: Gate each action with appropriate permission**

```typescript
const canDeleteTasks = usePermission('can_delete_tasks');
const canEditAnyTask = usePermission('can_edit_any_task');
const canAssignTasks = usePermission('can_assign_tasks');
const canUseAiFeatures = usePermission('can_use_ai_features');

// For delete button:
const canDelete = canDeleteTasks || task.created_by === currentUser?.name;

// For edit button (on others' tasks):
const canEdit = canEditAnyTask || task.created_by === currentUser?.name;

// For assign dropdown:
{canAssignTasks && (
  <AssigneeDropdown ... />
)}

// For AI features:
{canUseAiFeatures && (
  <AIFeaturesMenu ... />
)}
```

**Step 3: Test each action**

```bash
npm run dev
# Login as staff user
# Open a task created by another user
# Verify: cannot delete, cannot edit, cannot assign
# Login as manager
# Verify: can do all operations
```

**Step 4: Commit**

```bash
git add src/components/layout/TaskDetailPanel.tsx
git commit -m "feat(permissions): gate task detail actions by permission

- Delete requires can_delete_tasks or ownership
- Edit requires can_edit_any_task or ownership
- Assign requires can_assign_tasks
- AI features require can_use_ai_features

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: TodoItem Operation Permissions

**Files:**
- Modify: `src/components/TodoItem.tsx`

**Step 1: Verify current permission usage**

The component may already use `usePermission()`. Check what's implemented vs what's missing.

**Step 2: Ensure consistent permission checks**

```typescript
const canDeleteTasks = usePermission('can_delete_tasks');
const canEditAnyTask = usePermission('can_edit_any_task');

const isOwnTask = todo.created_by === currentUserName;
const canDelete = canDeleteTasks || isOwnTask;
const canEdit = canEditAnyTask || isOwnTask;

// In context menu or action buttons:
{canDelete && (
  <button onClick={handleDelete}>Delete</button>
)}
```

**Step 3: Commit**

```bash
git add src/components/TodoItem.tsx
git commit -m "feat(permissions): ensure TodoItem respects task permissions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: BulkActionBar Permissions

**Files:**
- Modify: `src/components/todo/BulkActionBar.tsx`

**Step 1: Gate bulk delete**

```typescript
const canDeleteTasks = usePermission('can_delete_tasks');

// Disable or hide bulk delete if no permission
{canDeleteTasks && (
  <Button onClick={handleBulkDelete}>Delete Selected</Button>
)}
```

**Step 2: Gate bulk reassign**

```typescript
const canAssignTasks = usePermission('can_assign_tasks');

{canAssignTasks && (
  <ReassignDropdown ... />
)}
```

**Step 3: Test bulk operations**

```bash
npm run dev
# Select multiple tasks
# Verify staff cannot see delete/reassign in bulk bar
```

**Step 4: Commit**

```bash
git add src/components/todo/BulkActionBar.tsx
git commit -m "feat(permissions): gate bulk actions by permission

- Bulk delete requires can_delete_tasks
- Bulk reassign requires can_assign_tasks

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: ChatMessageList Pin/Delete Permissions

**Files:**
- Modify: `src/components/chat/ChatMessageList.tsx`

**Step 1: Add permission checks**

```typescript
const canPinMessages = usePermission('can_pin_messages');
const canDeleteAnyMessage = usePermission('can_delete_any_message');

// For each message:
const isOwnMessage = message.created_by === currentUser?.name;
const canDelete = canDeleteAnyMessage || isOwnMessage;
const canPin = canPinMessages;

// In message actions:
{canPin && (
  <button onClick={() => handlePin(message.id)}>
    {message.is_pinned ? 'Unpin' : 'Pin'}
  </button>
)}

{canDelete && (
  <button onClick={() => handleDelete(message.id)}>Delete</button>
)}
```

**Step 2: Commit**

```bash
git add src/components/chat/ChatMessageList.tsx
git commit -m "feat(permissions): gate chat message actions by permission

- Pin/unpin requires can_pin_messages
- Delete requires can_delete_any_message or message ownership

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Staff Data Scoping in useTodoData

**Files:**
- Modify: `src/hooks/useTodoData.ts`

**Step 1: Check can_view_all_tasks permission**

```typescript
import { usePermission } from '@/hooks/usePermission';
import { useCurrentUser } from '@/contexts/UserContext';

const canViewAllTasks = usePermission('can_view_all_tasks');
const currentUser = useCurrentUser();
```

**Step 2: Filter todos for staff users**

```typescript
// After fetching todos:
const visibleTodos = useMemo(() => {
  if (canViewAllTasks) return todos;

  // Staff can only see tasks they created or are assigned to
  return todos.filter(todo =>
    todo.created_by === currentUser?.name ||
    todo.assigned_to === currentUser?.name
  );
}, [todos, canViewAllTasks, currentUser?.name]);
```

**Step 3: Update Zustand store subscription**

In the real-time event handler, also filter:

```typescript
.on('postgres_changes', { event: 'INSERT', ... }, (payload) => {
  const newTodo = payload.new as Todo;

  // Only add to store if user can see it
  if (canViewAllTasks ||
      newTodo.created_by === currentUser?.name ||
      newTodo.assigned_to === currentUser?.name) {
    setTodos(prev => [newTodo, ...prev]);
  }
})
```

**Step 4: Handle task un-assignment**

When a task is updated and the user is no longer assigned, remove from their view:

```typescript
.on('postgres_changes', { event: 'UPDATE', ... }, (payload) => {
  const updated = payload.new as Todo;

  if (!canViewAllTasks) {
    const canSee = updated.created_by === currentUser?.name ||
                   updated.assigned_to === currentUser?.name;
    if (!canSee) {
      // Remove from store
      setTodos(prev => prev.filter(t => t.id !== updated.id));
      return;
    }
  }

  // Normal update
  setTodos(prev => prev.map(t => t.id === updated.id ? updated : t));
})
```

**Step 5: Commit**

```bash
git add src/hooks/useTodoData.ts
git commit -m "feat(permissions): scope task visibility for staff users

- Staff only see tasks they created or are assigned to
- Real-time updates respect staff visibility scope
- Task un-assignment removes from staff view

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Role Display Updates

**Files:**
- Modify: `src/components/AgencySwitcher.tsx`
- Modify: `src/components/AgencyMembersModal.tsx`

**Step 1: Update role labels**

```typescript
const ROLE_LABELS: Record<AgencyRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  staff: 'Staff',
};

const ROLE_ICONS: Record<AgencyRole, React.ComponentType> = {
  owner: Crown,
  manager: Briefcase,
  staff: User,
};
```

**Step 2: Update role selector in AgencyMembersModal**

```typescript
<select value={member.role} onChange={handleRoleChange}>
  <option value="manager">Manager</option>
  <option value="staff">Staff</option>
</select>
```

**Step 3: Commit**

```bash
git add src/components/AgencySwitcher.tsx src/components/AgencyMembersModal.tsx
git commit -m "feat(permissions): update role display labels and icons

- Owner: Crown icon
- Manager: Briefcase icon
- Staff: User icon

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Template Management Permissions

**Files:**
- Modify: `src/components/todo/TodoModals.tsx`
- Modify: `src/components/SaveTemplateModal.tsx` (if exists)

**Step 1: Gate template creation**

```typescript
const canManageTemplates = usePermission('can_manage_templates');

{canManageTemplates && (
  <Button onClick={openSaveTemplateModal}>Save as Template</Button>
)}
```

**Step 2: Gate template management**

```typescript
// In template list:
{canManageTemplates && (
  <Button onClick={() => deleteTemplate(template.id)}>Delete</Button>
)}
```

**Step 3: Commit**

```bash
git add src/components/todo/TodoModals.tsx src/components/SaveTemplateModal.tsx
git commit -m "feat(permissions): gate template management by permission

- Creating templates requires can_manage_templates
- Deleting templates requires can_manage_templates

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Legacy Code Cleanup

**Files:**
- Modify: `src/types/todo.ts` - Remove legacy comment, ensure no `isOwner`/`isAdmin` functions
- Search & remove: All `import { isOwner } from '@/types/todo'` statements

**Step 1: Verify legacy functions are removed**

```bash
grep -r "isOwner\|isAdmin\|OWNER_USERNAME" src/
# Should return no results in source files (only in types/todo.ts comment)
```

**Step 2: Remove any remaining imports**

```bash
# Find files that might still import legacy functions
grep -r "import.*isOwner\|import.*isAdmin" src/
```

**Step 3: Clean up types/todo.ts**

Remove the legacy comment if all migrations are complete:

```typescript
// DELETE these lines:
// Legacy isOwner(), isAdmin(), canViewStrategicGoals() functions deleted in Phase 4E.
// Use usePermission() hook or useRoleCheck() hook instead.
// See src/hooks/usePermission.ts and src/hooks/useRoleCheck.ts.
```

**Step 4: Final grep verification**

```bash
grep -r "'Derrick'\|\"Derrick\"" src/components/ src/hooks/ src/lib/
# Should return no permission-related hardcoded names
# (Test files with 'Derrick' are OK)
```

**Step 5: Commit**

```bash
git add -A
git commit -m "chore(cleanup): remove legacy permission code

- Remove isOwner/isAdmin imports
- Remove hardcoded name checks
- Remove legacy comments from types/todo.ts

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Build Verification

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No type errors

**Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds

**Step 3: Run E2E tests**

```bash
npx playwright test
```

Expected: All tests pass (some may need updates for new permission behavior)

**Step 4: Final commit**

```bash
git add -A
git commit -m "test: verify Phase 4 permission migration complete

- TypeScript compiles without errors
- Build succeeds
- E2E tests pass

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Verification Checklist

After completing all tasks:

- [ ] Strategic Goals hidden for staff users in nav
- [ ] Archive hidden for staff users in nav
- [ ] Staff cannot delete others' tasks
- [ ] Staff sees only their own tasks in list/kanban
- [ ] Manager sees all tasks but cannot change agency settings
- [ ] Bulk delete only visible when user has can_delete_tasks
- [ ] Chat pin/delete respects permissions
- [ ] Template save only visible with can_manage_templates
- [ ] No `'Derrick'` or `'adrian'` string literals remain in component code
- [ ] No `isOwner()` imports remain
- [ ] `npm run build` passes with no TypeScript errors
- [ ] E2E tests pass

---

## Parallel Agent Orchestration

This plan can be executed with **2 parallel agents**:

### Agent A: UI Components
- Task 1: NavigationSidebar
- Task 2: CommandPalette
- Task 3: AppShell
- Task 4: TaskDetailPanel
- Task 5: TodoItem
- Task 6: BulkActionBar

### Agent B: Data & State
- Task 7: ChatMessageList
- Task 8: Staff Data Scoping (useTodoData)
- Task 9: Role Display Updates
- Task 10: Template Management

### Sync Point
After both agents complete, run:
- Task 11: Legacy Code Cleanup (single agent)
- Task 12: Build Verification (single agent)

---

## Rollback Plan

If issues arise:
1. All changes are atomic per commit
2. Each task can be reverted independently
3. Permission hooks have fallback behavior (return `true` if permission undefined)
4. Feature flag `multi_tenancy` can disable permission enforcement

---

*Plan created: 2026-02-03*
*Estimated tasks: 12*
*Parallel agents: 2*
*Sync points: 1*
