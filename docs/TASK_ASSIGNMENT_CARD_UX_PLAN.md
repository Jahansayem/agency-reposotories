# Task Assignment Card UX Implementation Plan

**Version:** 1.0
**Created:** 2026-01-15
**Author:** UX Engineer
**Timeline:** 4-6 hours
**Risk Level:** Low
**User Impact:** Improved notification readability and accessibility

---

## Tech Lead Prompt

> **Copy this section when handing off to the Tech Lead:**
>
> We need to replace the text-based task notification messages in chat with a visual card component. Currently, when tasks are assigned, users receive a wall of emoji-heavy text that's hard to scan and has accessibility issues (screen readers announce every emoji by name).
>
> **The goal:** Create a `TaskAssignmentCard` component that renders inside chat messages when `created_by === 'System'` and `related_todo_id` exists. The card should match our existing TodoItem visual style (priority color bar, badges) and be fully accessible.
>
> **Key files:**
> - Create: `src/components/chat/TaskAssignmentCard.tsx`
> - Modify: `src/components/ChatPanel.tsx` (message rendering logic ~line 1600)
> - Modify: `src/lib/taskNotifications.ts` (add metadata to messages)
> - Modify: `src/types/todo.ts` (add message metadata type)
>
> **Full spec:** `docs/TASK_ASSIGNMENT_CARD_UX_PLAN.md`
>
> **Acceptance criteria:**
> 1. System messages with `related_todo_id` render as visual cards
> 2. Cards show priority color bar, due date, subtask preview, notes preview
> 3. Entire card is clickable (opens task)
> 4. Explicit "View Task" button for keyboard/screen reader users
> 5. No emoji announced by screen readers
> 6. Works in both light and dark mode
> 7. Responsive on mobile (full width) and desktop (max 320px)

---

## Executive Summary

This plan upgrades task assignment/completion notifications from plain text with emojis to rich visual cards that match the app's design system. The change improves:

- **Accessibility**: Eliminates screen reader emoji noise
- **Scannability**: Visual hierarchy makes notifications easier to parse
- **Consistency**: Cards use the same visual patterns as TodoItem
- **Interactivity**: Entire card is tappable with explicit button fallback

---

## Current State Analysis

### Existing Implementation

**File:** `src/lib/taskNotifications.ts`

The current system generates text-based messages like:

```
📋 **New Task Assigned**
From: Derrick

━━━━━━━━━━━━━━━━━━━━
🟠 **Call John Smith** (High)
📅 Due: Tomorrow

📝 Subtasks: 0/3 completed
  ○ Review coverage
  ○ Calculate premium
  ○ Send quote
━━━━━━━━━━━━━━━━━━━━
👆 Tap "View Task" to open
```

**Problems:**
1. Screen readers announce: "Clipboard emoji, New Task Assigned, Orange Circle emoji..." etc.
2. No visual priority indicator (just emoji)
3. Dense text block is hard to scan on mobile
4. "View Task" button only appears if `related_todo_id` exists AND user notices the button
5. Doesn't match the polished UI of the rest of the app

### Message Structure

**File:** `src/types/todo.ts:139-157`

```typescript
export interface ChatMessage {
  id: string;
  text: string;
  created_by: string;  // 'System' for notifications
  created_at: string;
  related_todo_id?: string;  // Links to task
  recipient?: string | null;
  // ... other fields
}
```

**Key insight:** We can detect system notifications by checking `created_by === 'System'` and `related_todo_id` exists.

---

## Implementation Plan

### Phase 1: Type Definitions
**Estimated Time:** 15 minutes
**Dependency:** None

### Phase 2: TaskAssignmentCard Component
**Estimated Time:** 2-3 hours
**Dependency:** Phase 1

### Phase 3: ChatPanel Integration
**Estimated Time:** 1-2 hours
**Dependency:** Phase 2

### Phase 4: Notification System Updates
**Estimated Time:** 1 hour
**Dependency:** None (can parallel with Phase 2)

### Phase 5: Testing & Polish
**Estimated Time:** 1 hour
**Dependency:** Phases 1-4

---

## Phase 1: Type Definitions

### Task 1.1: Add Message Metadata Type

**File:** `src/types/todo.ts`

Add after `ChatMessage` interface (around line 157):

```typescript
// ============================================
// Chat Message Metadata Types
// ============================================

/**
 * Notification types for system-generated messages
 */
export type SystemNotificationType =
  | 'task_assignment'
  | 'task_completion'
  | 'task_reassignment';

/**
 * Metadata for system notification messages
 * Stored in message.text as JSON prefix or separate field
 */
export interface SystemMessageMetadata {
  type: SystemNotificationType;
  taskId: string;
  assignedBy?: string;
  completedBy?: string;
  reassignedBy?: string;
  previousAssignee?: string;
  // Indicates this message should render as a card
  renderAsCard: true;
}

/**
 * Helper to check if a message is a system notification
 */
export function isSystemNotification(message: ChatMessage): boolean {
  return message.created_by === 'System' && !!message.related_todo_id;
}
```

---

## Phase 2: TaskAssignmentCard Component

### Task 2.1: Create Component File

**New File:** `src/components/chat/TaskAssignmentCard.tsx`

```typescript
'use client';

import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  CheckCircle,
  FileText,
  ChevronRight,
  AlertTriangle,
  User,
  RefreshCw,
} from 'lucide-react';
import { Todo, PRIORITY_CONFIG, SystemNotificationType } from '@/types/todo';
import { formatDistanceToNow, isPast, isToday, isTomorrow, format } from 'date-fns';

// ============================================
// Types
// ============================================

interface TaskAssignmentCardProps {
  /** The task being notified about */
  todo: Todo;
  /** Type of notification */
  notificationType: SystemNotificationType;
  /** Who triggered this notification */
  actionBy: string;
  /** Optional: who was previously assigned (for reassignment) */
  previousAssignee?: string;
  /** Callback when user wants to view the task */
  onViewTask: () => void;
  /** Whether the current user is the message sender (affects styling) */
  isOwnMessage?: boolean;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Format due date for display with relative terms
 */
function formatDueDate(dueDate: string): { text: string; isOverdue: boolean } {
  const date = new Date(dueDate);
  const isOverdue = isPast(date) && !isToday(date);

  if (isToday(date)) {
    return { text: 'Due today', isOverdue: false };
  }
  if (isTomorrow(date)) {
    return { text: 'Due tomorrow', isOverdue: false };
  }
  if (isOverdue) {
    return { text: `Overdue (${format(date, 'MMM d')})`, isOverdue: true };
  }
  return { text: `Due ${formatDistanceToNow(date, { addSuffix: true })}`, isOverdue: false };
}

/**
 * Get notification header content based on type
 */
function getNotificationHeader(
  type: SystemNotificationType,
  actionBy: string,
  previousAssignee?: string
): { icon: React.ReactNode; title: string; subtitle: string } {
  switch (type) {
    case 'task_assignment':
      return {
        icon: <User className="w-4 h-4" aria-hidden="true" />,
        title: 'New Task Assigned',
        subtitle: `from ${actionBy}`,
      };
    case 'task_completion':
      return {
        icon: <CheckCircle className="w-4 h-4" aria-hidden="true" />,
        title: 'Task Completed',
        subtitle: `by ${actionBy}`,
      };
    case 'task_reassignment':
      return {
        icon: <RefreshCw className="w-4 h-4" aria-hidden="true" />,
        title: 'Task Reassigned',
        subtitle: previousAssignee
          ? `from ${previousAssignee} by ${actionBy}`
          : `by ${actionBy}`,
      };
    default:
      return {
        icon: <FileText className="w-4 h-4" aria-hidden="true" />,
        title: 'Task Update',
        subtitle: `by ${actionBy}`,
      };
  }
}

// ============================================
// Component
// ============================================

export const TaskAssignmentCard = memo(function TaskAssignmentCard({
  todo,
  notificationType,
  actionBy,
  previousAssignee,
  onViewTask,
  isOwnMessage = false,
}: TaskAssignmentCardProps) {
  const priorityConfig = PRIORITY_CONFIG[todo.priority];
  const subtasksCompleted = todo.subtasks?.filter(s => s.completed).length || 0;
  const subtasksTotal = todo.subtasks?.length || 0;
  const header = getNotificationHeader(notificationType, actionBy, previousAssignee);

  // Due date formatting
  const dueInfo = todo.due_date ? formatDueDate(todo.due_date) : null;

  // Handle card click
  const handleCardClick = useCallback(() => {
    onViewTask();
  }, [onViewTask]);

  // Handle keyboard activation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onViewTask();
      }
    },
    [onViewTask]
  );

  // Handle button click (prevent double-firing)
  const handleButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onViewTask();
    },
    [onViewTask]
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${header.title}: ${todo.text}. ${todo.priority} priority. Click to view task.`}
      className={`
        w-full sm:max-w-xs
        bg-white dark:bg-gray-800
        rounded-xl
        border border-gray-200 dark:border-gray-700
        overflow-hidden
        shadow-sm hover:shadow-md
        transition-all duration-200
        cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
        ${isOwnMessage ? 'ml-auto' : ''}
      `}
    >
      {/* Priority color bar */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: priorityConfig.color }}
        aria-hidden="true"
      />

      <div className="p-4">
        {/* Notification header */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className={`
              w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
              ${notificationType === 'task_completion'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              }
            `}
          >
            {header.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-white">
              {header.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {header.subtitle}
            </p>
          </div>
        </div>

        {/* Task title + priority badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-medium text-gray-900 dark:text-white text-sm leading-snug flex-1">
            {todo.text}
          </h4>
          {(todo.priority === 'urgent' || todo.priority === 'high') && (
            <span
              className="px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0"
              style={{
                backgroundColor: priorityConfig.bgColor,
                color: priorityConfig.color,
              }}
            >
              {priorityConfig.label}
            </span>
          )}
        </div>

        {/* Due date */}
        {dueInfo && (
          <div
            className={`flex items-center gap-1.5 text-xs mb-3 ${
              dueInfo.isOverdue
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {dueInfo.isOverdue ? (
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{dueInfo.text}</span>
          </div>
        )}

        {/* Subtasks preview */}
        {subtasksTotal > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {subtasksCompleted}/{subtasksTotal} subtasks
              </span>
            </div>
            <ul className="space-y-1" aria-label="Subtask preview">
              {todo.subtasks?.slice(0, 3).map((subtask) => (
                <li
                  key={subtask.id}
                  className={`text-xs flex items-center gap-2 ${
                    subtask.completed
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span
                    className={subtask.completed ? 'text-green-500' : 'text-gray-400'}
                    aria-hidden="true"
                  >
                    {subtask.completed ? '✓' : '○'}
                  </span>
                  <span className={subtask.completed ? 'line-through' : ''}>
                    {subtask.text}
                  </span>
                  <span className="sr-only">
                    {subtask.completed ? '(completed)' : '(pending)'}
                  </span>
                </li>
              ))}
              {subtasksTotal > 3 && (
                <li className="text-xs text-gray-400 dark:text-gray-500 italic pl-5">
                  +{subtasksTotal - 3} more...
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Notes preview */}
        {todo.notes && (
          <div className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3">
            <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p className="line-clamp-2">{todo.notes}</p>
          </div>
        )}

        {/* Action footer */}
        <div className="flex items-center justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={handleButtonClick}
            className="
              flex items-center gap-1.5
              px-3 py-1.5
              text-xs font-medium
              text-blue-600 dark:text-blue-400
              bg-blue-50 dark:bg-blue-900/30
              rounded-lg
              hover:bg-blue-100 dark:hover:bg-blue-900/50
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800
            "
            aria-label={`View task: ${todo.text}`}
          >
            View Task
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.article>
  );
});

export default TaskAssignmentCard;
```

### Task 2.2: Create Directory Structure

Ensure the directory exists:

```bash
mkdir -p src/components/chat
```

### Task 2.3: Create Index Export

**New File:** `src/components/chat/index.ts`

```typescript
export { TaskAssignmentCard } from './TaskAssignmentCard';
```

---

## Phase 3: ChatPanel Integration

### Task 3.1: Import TaskAssignmentCard

**File:** `src/components/ChatPanel.tsx`

Add to imports (around line 1-50):

```typescript
import { TaskAssignmentCard } from './chat/TaskAssignmentCard';
import { isSystemNotification, SystemNotificationType } from '@/types/todo';
```

### Task 3.2: Add Helper Function

Add inside ChatPanel component (before the return statement):

```typescript
/**
 * Parse system message to extract notification type and metadata
 */
const parseSystemMessage = useCallback((message: ChatMessage): {
  notificationType: SystemNotificationType;
  actionBy: string;
  previousAssignee?: string;
} | null => {
  if (!isSystemNotification(message)) return null;

  const text = message.text;

  // Detect notification type from message content
  if (text.includes('New Task Assigned') || text.includes('Task Reassigned to You')) {
    // Extract "From: Username" or "By: Username"
    const fromMatch = text.match(/From:\s*(\w+)/);
    const byMatch = text.match(/By:\s*(\w+)/);
    const actionBy = fromMatch?.[1] || byMatch?.[1] || 'Unknown';

    if (text.includes('Reassigned')) {
      return { notificationType: 'task_reassignment', actionBy };
    }
    return { notificationType: 'task_assignment', actionBy };
  }

  if (text.includes('Task Completed')) {
    const byMatch = text.match(/By:\s*(\w+)/);
    return { notificationType: 'task_completion', actionBy: byMatch?.[1] || 'Unknown' };
  }

  if (text.includes('Task Reassigned')) {
    const byMatch = text.match(/by\s+(\w+)/);
    const toMatch = text.match(/to\s+(\w+)/);
    return {
      notificationType: 'task_reassignment',
      actionBy: byMatch?.[1] || 'Unknown',
      previousAssignee: undefined, // Could parse "from X" if needed
    };
  }

  return null;
}, []);

/**
 * Find a todo by ID from the todos prop or fetch it
 */
const getTodoById = useCallback((todoId: string): Todo | undefined => {
  // First check if we have it in the todos list
  // Note: ChatPanel may need access to todos - check if prop exists
  // If not available, we may need to add it or fetch from context
  return undefined; // Placeholder - see integration notes
}, []);
```

### Task 3.3: Update Message Rendering Logic

**File:** `src/components/ChatPanel.tsx`

Find the message rendering section (around line 1591-1620) and update:

**Current code:**
```tsx
{/* Message bubble */}
<div className="relative">
  <motion.div
    onClick={() => setTapbackMessageId(tapbackMessageId === msg.id ? null : msg.id)}
    className={`px-4 py-2.5 rounded-2xl break-words ...`}
    whileHover={{ scale: 1.01 }}
  >
    {renderMessageText(msg.text)}

    {/* Task link button (Feature 2) */}
    {msg.related_todo_id && onTaskLinkClick && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTaskLinkClick(msg.related_todo_id!);
        }}
        // ...
      >
        <ExternalLink className="w-3.5 h-3.5" />
        View Task
      </button>
    )}
  </motion.div>
  // ...
</div>
```

**Updated code:**
```tsx
{/* Message bubble */}
<div className="relative">
  {/* Check if this is a system notification that should render as a card */}
  {(() => {
    const systemMeta = parseSystemMessage(msg);
    const linkedTodo = msg.related_todo_id ? todosMap?.get(msg.related_todo_id) : undefined;

    // Render as card if: system message + has linked todo + todo data available
    if (systemMeta && linkedTodo) {
      return (
        <TaskAssignmentCard
          todo={linkedTodo}
          notificationType={systemMeta.notificationType}
          actionBy={systemMeta.actionBy}
          previousAssignee={systemMeta.previousAssignee}
          onViewTask={() => onTaskLinkClick?.(msg.related_todo_id!)}
          isOwnMessage={isOwn}
        />
      );
    }

    // Fallback to regular message bubble
    return (
      <motion.div
        onClick={() => setTapbackMessageId(tapbackMessageId === msg.id ? null : msg.id)}
        className={`px-4 py-2.5 rounded-2xl break-words whitespace-pre-wrap cursor-pointer transition-all duration-200 text-[15px] leading-relaxed ${
          isOwn
            ? 'bg-gradient-to-br from-[#72B5E8] to-[#A8D4F5] text-[#00205B] rounded-br-md shadow-lg shadow-[#72B5E8]/20'
            : 'bg-white/[0.08] text-white rounded-bl-md border border-white/[0.06]'
        } ${showTapbackMenu ? 'ring-2 ring-[#72B5E8]/50' : ''}`}
        whileHover={{ scale: 1.01 }}
      >
        {renderMessageText(msg.text)}

        {/* Task link button - only show for non-system messages or when card fails */}
        {msg.related_todo_id && onTaskLinkClick && !systemMeta && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTaskLinkClick(msg.related_todo_id!);
            }}
            className={`mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isOwn
                ? 'bg-[#00205B]/20 text-[#00205B] hover:bg-[#00205B]/30'
                : 'bg-white/[0.1] text-white/80 hover:bg-white/[0.15]'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Task
          </button>
        )}
      </motion.div>
    );
  })()}

  {/* Action buttons on hover - only show for non-card messages */}
  {isHovered && !showTapbackMenu && !isSystemNotification(msg) && (
    // ... existing hover buttons ...
  )}
</div>
```

### Task 3.4: Add Todos Map Prop (if needed)

**Integration Note:** ChatPanel needs access to todos to render the cards. Check if:

1. **Option A:** `todos` is already passed as a prop - create a Map for O(1) lookup
2. **Option B:** Add a new prop `todosMap: Map<string, Todo>`
3. **Option C:** Use React Context to access todos

**If adding prop, update ChatPanel interface:**

```typescript
interface ChatPanelProps {
  // ... existing props
  todosMap?: Map<string, Todo>;
}
```

**In parent component (likely TodoList.tsx), create the map:**

```typescript
const todosMap = useMemo(
  () => new Map(todos.map(t => [t.id, t])),
  [todos]
);

// Pass to ChatPanel
<ChatPanel
  // ... other props
  todosMap={todosMap}
/>
```

---

## Phase 4: Notification System Updates (Optional Enhancement)

### Task 4.1: Add Structured Metadata to Messages

**File:** `src/lib/taskNotifications.ts`

This is an **optional enhancement** for cleaner parsing. Instead of parsing text, we can store metadata.

**Option A: JSON prefix in message text**

```typescript
interface MessageWithMetadata {
  text: string;
  metadata: SystemMessageMetadata;
}

function buildTaskCardMessage(options: TaskCardMessageOptions): string {
  // Build the human-readable text (fallback for email/push notifications)
  const humanReadable = buildHumanReadableMessage(options);

  // Prepend JSON metadata for parsing
  const metadata: SystemMessageMetadata = {
    type: options.type === 'assignment' ? 'task_assignment' :
          options.type === 'completion' ? 'task_completion' : 'task_reassignment',
    taskId: options.taskId!, // Add taskId to options
    assignedBy: options.assignedBy,
    completedBy: options.completedBy,
    reassignedBy: options.reassignedBy,
    renderAsCard: true,
  };

  // Format: <!--META:{"type":"task_assignment",...}-->Human readable text
  return `<!--META:${JSON.stringify(metadata)}-->${humanReadable}`;
}
```

**Option B: Store in separate database column (requires migration)**

This is cleaner but requires a database migration to add `metadata JSONB` to the `messages` table.

**Recommendation:** Start with Option A (no migration needed), migrate to Option B later if needed.

---

## Phase 5: Testing & Polish

### Testing Checklist

#### Accessibility Testing
- [ ] Screen reader announces card without emoji names
- [ ] Card is keyboard navigable (Tab to reach, Enter to activate)
- [ ] Focus ring is visible in both light and dark mode
- [ ] "View Task" button has proper aria-label
- [ ] Subtask completion status is announced by screen reader

#### Functional Testing
- [ ] Card renders for task assignment notifications
- [ ] Card renders for task completion notifications
- [ ] Card renders for task reassignment notifications
- [ ] Clicking card opens the linked task
- [ ] "View Task" button opens the linked task
- [ ] Fallback to text message when todo data is unavailable
- [ ] Card shows correct priority color bar
- [ ] Overdue tasks show warning styling
- [ ] Subtasks truncate at 3 with "+N more" indicator
- [ ] Notes truncate with ellipsis (2 lines)

#### Visual Testing
- [ ] Card matches TodoItem visual style
- [ ] Dark mode styling is correct
- [ ] Card is responsive (full width mobile, max-width desktop)
- [ ] Priority badge shows for urgent/high only
- [ ] Animation on card appearance is smooth

#### Edge Cases
- [ ] Task with no subtasks renders correctly
- [ ] Task with no notes renders correctly
- [ ] Task with no due date renders correctly
- [ ] Very long task titles truncate appropriately
- [ ] System message without linked todo falls back to text

---

## File Summary

### New Files

| File | Purpose |
|------|---------|
| `src/components/chat/TaskAssignmentCard.tsx` | Visual card component |
| `src/components/chat/index.ts` | Barrel export |

### Modified Files

| File | Changes |
|------|---------|
| `src/types/todo.ts` | Add `SystemNotificationType`, `SystemMessageMetadata`, `isSystemNotification()` |
| `src/components/ChatPanel.tsx` | Import card, add `parseSystemMessage()`, update message rendering |
| `src/lib/taskNotifications.ts` | (Optional) Add metadata to messages |

### No Changes Required

| File | Reason |
|------|--------|
| Database schema | Uses existing `related_todo_id` field |
| `messages` table | No migration needed (text parsing approach) |

---

## Implementation Order

```
1. Phase 1: Type Definitions (15 min)
   └── Add types to todo.ts

2. Phase 2: TaskAssignmentCard (2-3 hrs)
   └── Create component with full accessibility

3. Phase 3: ChatPanel Integration (1-2 hrs)
   ├── Import component
   ├── Add parsing helper
   ├── Update message rendering
   └── Ensure todos data is available

4. Phase 4: (Optional) Notification Updates (1 hr)
   └── Add metadata to messages for cleaner parsing

5. Phase 5: Testing (1 hr)
   └── Run through all checklist items
```

---

## Rollback Plan

If issues are discovered:

1. **Quick fix:** In ChatPanel, change the condition to always use fallback:
   ```typescript
   if (false && systemMeta && linkedTodo) { // Disabled
   ```

2. **Full rollback:** Revert the ChatPanel changes, keep the component for later

No database changes = easy rollback.

---

## Success Metrics

After implementation, verify:

| Metric | Target |
|--------|--------|
| Accessibility score (axe-core) | 0 violations |
| Card render time | <16ms (60fps) |
| Screen reader test | No emoji announcements |
| User comprehension | Can identify task priority at a glance |

---

## Notes for Tech Lead

1. **ChatPanel is large (~2000 lines)** - The message rendering logic is complex. Take time to understand the existing patterns before modifying.

2. **Todos data access** - ChatPanel may not currently have access to the full todos list. Check if it's passed as a prop or available via context. If not, you'll need to add it.

3. **Real-time updates** - When a task is updated after the notification is sent, the card should reflect the current state. This works automatically if we're rendering from the live `todos` data.

4. **Backward compatibility** - Old messages (before this change) will still work because we fall back to text rendering when card rendering fails.

5. **Reusability** - The `TaskAssignmentCard` component could be reused in:
   - Activity feed
   - Email notifications (as HTML template)
   - Push notification previews

---

## Appendix: Component API Reference

### TaskAssignmentCard Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `todo` | `Todo` | Yes | The task to display |
| `notificationType` | `SystemNotificationType` | Yes | Type of notification |
| `actionBy` | `string` | Yes | User who triggered notification |
| `previousAssignee` | `string` | No | For reassignments, the previous owner |
| `onViewTask` | `() => void` | Yes | Callback when card/button is clicked |
| `isOwnMessage` | `boolean` | No | Affects alignment (default: false) |

### Usage Example

```tsx
<TaskAssignmentCard
  todo={myTodo}
  notificationType="task_assignment"
  actionBy="Derrick"
  onViewTask={() => scrollToTask(myTodo.id)}
/>
```

---

**Document Prepared By:** UX Engineer
**Ready for:** Tech Lead Implementation
**Estimated Total Time:** 4-6 hours
