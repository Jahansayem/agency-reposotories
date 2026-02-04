# Sprint 2 Implementation Plan
**Priority 1 (High) Issues - Medium Priority**
**Date:** January 31, 2026
**Estimated Time:** 60 hours (2-3 weeks)
**Status:** Ready to begin

---

## Executive Summary

Sprint 2 addresses **23 P1 issues** identified in the comprehensive UX/UI audit. These are high-priority improvements that significantly enhance user experience but are not blocking issues. The sprint focuses on:

1. **Accessibility Compliance** (WCAG 2.1 AA)
2. **Mobile Touch Gestures**
3. **Keyboard Navigation Enhancements**
4. **Form Validation Improvements**
5. **Screen Reader Compatibility**

All Sprint 1 (P0) issues have been completed (8/8 = 100%).

---

## Sprint 2 Issues Breakdown

### Category 1: Accessibility - Skip Link & ARIA (8 hours)

#### Issue #9: Missing Skip Link (P1)
**Priority:** High
**Component:** `src/app/layout.tsx` or `src/app/page.tsx`
**Estimated Time:** 2 hours
**WCAG:** Level A requirement (critical for keyboard users)

**Problem:**
- No skip link to bypass navigation
- Keyboard users must tab through entire header/nav before reaching main content
- Violates WCAG 2.1 Success Criterion 2.4.1 (Bypass Blocks)

**Solution:**
```tsx
// Add to layout.tsx or page.tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--primary)] focus:text-white focus:rounded-lg"
>
  Skip to main content
</a>

<main id="main-content" tabIndex={-1}>
  {/* App content */}
</main>
```

**Test Cases:**
- Tab after page load → skip link appears
- Press Enter → focus moves to main content
- Verify with screen reader (VoiceOver/NVDA)

---

#### Issue #10: ARIA Live Regions for Dynamic Content (P1)
**Priority:** High
**Components:** `TodoList.tsx`, `ChatPanel.tsx`, `Dashboard.tsx`
**Estimated Time:** 3 hours

**Problem:**
- Task creation/completion not announced to screen readers
- Chat messages not announced when received
- Status changes (priority, assignment) are silent

**Solution:**
```tsx
// Create LiveRegion component
export function LiveRegion({ message, politeness = 'polite' }) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// Usage in TodoList.tsx
const [announcement, setAnnouncement] = useState('');

const handleCompleteTask = async (id: string) => {
  // ... complete logic
  setAnnouncement(`Task "${taskText}" marked as completed`);
  setTimeout(() => setAnnouncement(''), 1000);
};

return (
  <>
    <LiveRegion message={announcement} />
    {/* Task list */}
  </>
);
```

**Announcements Needed:**
- Task created: "New task added: [task text]"
- Task completed: "Task marked as complete: [task text]"
- Task deleted: "Task deleted: [task text]"
- Chat message received: "New message from [user]"
- Status changed: "Task priority changed to [priority]"

**Test Cases:**
- Enable VoiceOver (Mac) or NVDA (Windows)
- Complete task → hear announcement
- Receive chat message → hear announcement

---

#### Issue #11: Form Validation ARIA Announcements (P1)
**Priority:** High
**Components:** `AddTodo.tsx`, `LoginScreen.tsx`, `RegisterModal.tsx`
**Estimated Time:** 2 hours

**Problem:**
- Error messages visible but not announced
- Screen reader users don't know validation failed
- No `aria-invalid` or `aria-describedby` attributes

**Solution:**
```tsx
// AddTodo.tsx
<div>
  <label htmlFor="task-input" className="...">
    Task
  </label>
  <input
    id="task-input"
    aria-invalid={error ? 'true' : 'false'}
    aria-describedby={error ? 'task-input-error' : undefined}
    // ... other props
  />
  {error && (
    <div
      id="task-input-error"
      role="alert"
      className="text-red-500 text-sm mt-1"
    >
      {error}
    </div>
  )}
</div>
```

**Forms to Fix:**
- Task creation (AddTodo.tsx)
- Login PIN entry (LoginScreen.tsx)
- Registration flow (RegisterModal.tsx)
- Task edit modal (TodoItem.tsx)

**Test Cases:**
- Submit empty task → error announced
- Invalid PIN → error announced
- Name too short → error announced

---

#### Issue #12: Semantic Landmark Regions (P1)
**Priority:** High
**Components:** `MainApp.tsx`
**Estimated Time:** 1 hour

**Problem:**
- No `<nav>`, `<main>`, `<aside>` elements
- Everything in generic `<div>` containers
- Screen reader landmarks navigation doesn't work

**Solution:**
```tsx
// MainApp.tsx
<div className="app-container">
  <nav aria-label="Main navigation">
    {/* Bottom tabs or sidebar */}
  </nav>

  <main>
    {view === 'dashboard' && <Dashboard />}
    {view === 'tasks' && <TodoList />}
    {/* ... other views */}
  </main>

  <aside aria-label="Chat panel">
    <ChatPanel />
  </aside>
</div>
```

**Test Cases:**
- VoiceOver rotor → landmarks should appear
- Press Control+Option+U (Mac) → see landmarks list

---

### Category 2: Keyboard Navigation (6 hours)

#### Issue #13: Arrow Key Navigation in Task Lists (P1)
**Priority:** High
**Component:** `TodoList.tsx`
**Estimated Time:** 3 hours

**Problem:**
- Only Tab key navigation works
- Arrow keys don't move between tasks
- Missing roving tabindex pattern

**Solution:**
```tsx
// Implement roving tabindex pattern
const [focusedIndex, setFocusedIndex] = useState(0);
const todoRefs = useRef<(HTMLElement | null)[]>([]);

const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const nextIndex = Math.min(index + 1, todos.length - 1);
    setFocusedIndex(nextIndex);
    todoRefs.current[nextIndex]?.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prevIndex = Math.max(index - 1, 0);
    setFocusedIndex(prevIndex);
    todoRefs.current[prevIndex]?.focus();
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    // Toggle completion
    handleToggleComplete(todos[index].id);
  }
};

return todos.map((todo, index) => (
  <div
    key={todo.id}
    ref={(el) => { todoRefs.current[index] = el; }}
    tabIndex={index === focusedIndex ? 0 : -1}
    onKeyDown={(e) => handleKeyDown(e, index)}
    role="button"
    aria-label={`Task: ${todo.text}`}
  >
    {/* Task content */}
  </div>
));
```

**Test Cases:**
- Tab to task list
- ArrowDown → focus moves to next task
- ArrowUp → focus moves to previous task
- Enter/Space → toggles completion
- Home → focus first task
- End → focus last task

---

#### Issue #14: Keyboard Shortcuts for Modals (P1)
**Priority:** High
**Components:** `ConfirmDialog.tsx`, `TaskBottomSheet.tsx`, `SmartParseModal.tsx`
**Estimated Time:** 2 hours

**Problem:**
- Escape key works, but no other shortcuts
- No Cmd/Ctrl+Enter to confirm
- No Cmd/Ctrl+Down to dismiss bottom sheet

**Solution:**
```tsx
// ConfirmDialog.tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
    }
  };

  if (isOpen) {
    document.addEventListener('keydown', handleKeyDown);
  }

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}, [isOpen, onConfirm, onCancel]);

// TaskBottomSheet.tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown') {
      e.preventDefault();
      onClose();
    }
  };

  if (isOpen) {
    document.addEventListener('keydown', handleKeyDown);
  }

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}, [isOpen, onClose]);
```

**Shortcuts to Add:**
- `Escape` → Cancel/Close (already works)
- `Cmd/Ctrl+Enter` → Confirm action
- `Cmd/Ctrl+Down` → Dismiss bottom sheet
- `Cmd/Ctrl+K` → Focus search (future)

**Test Cases:**
- Open dialog → Cmd+Enter confirms
- Open bottom sheet → Cmd+Down dismisses
- Verify focus returns to trigger element

---

#### Issue #15: Focus Trap Improvements (P1)
**Priority:** High
**Components:** All modals
**Estimated Time:** 1 hour

**Problem:**
- Focus trap works but can be escaped with mouse click
- No visual indication when focus is trapped
- Tab order sometimes unintuitive

**Solution:**
```tsx
// Enhance ConfirmDialog focus trap
useEffect(() => {
  if (!isOpen) return;

  const modal = dialogRef.current;
  if (!modal) return;

  // Get all focusable elements
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  // Focus first element (or cancel button for dangerous actions)
  (variant === 'danger' ? cancelButtonRef.current : firstElement)?.focus();

  const handleTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  // Prevent clicks outside from stealing focus
  const handleClickOutside = (e: MouseEvent) => {
    if (!modal.contains(e.target as Node)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  document.addEventListener('keydown', handleTab);
  document.addEventListener('mousedown', handleClickOutside, true);

  return () => {
    document.removeEventListener('keydown', handleTab);
    document.removeEventListener('mousedown', handleClickOutside, true);
  };
}, [isOpen, variant]);
```

**Test Cases:**
- Open modal → Tab cycles through elements
- Shift+Tab → cycles backward
- Mouse click outside → focus stays in modal
- Escape → modal closes, focus returns to trigger

---

### Category 3: Color Contrast Fixes (3 hours)

#### Issue #16: Light Mode Text Contrast (P1)
**Priority:** High
**Component:** `src/app/globals.css`
**Estimated Time:** 1 hour

**Problem:**
```css
/* Current: 3.0:1 ratio - WCAG Fail */
--text-light: #94A3B8;

/* Minimum required: 4.5:1 for Level AA */
```

**Solution:**
```css
/* src/app/globals.css - Light mode */
:root {
  --text-light: #64748B; /* 4.5:1 ratio - WCAG Pass */
  --text-muted: #475569; /* 7.2:1 ratio for smaller text */
}

/* Dark mode */
[data-theme='dark'] {
  --text-light: #94A3B8; /* 6.8:1 ratio on dark bg */
  --text-muted: #CBD5E1; /* 9.4:1 ratio */
}
```

**Files to Update:**
- `src/app/globals.css` (lines 36, 122)
- Test all components using `--text-light` or `--text-muted`

**Test Cases:**
- Run automated contrast checker (axe-core, Lighthouse)
- Manual test: All text readable at 400% zoom
- Verify secondary text (timestamps, labels)

---

#### Issue #17: Button State Contrast (P1)
**Priority:** High
**Components:** Various buttons
**Estimated Time:** 1 hour

**Problem:**
- Disabled button text too light (#9CA3AF on #E5E7EB = 2.1:1)
- Hover states sometimes lose contrast

**Solution:**
```css
/* Improve disabled button contrast */
.btn-disabled {
  color: #6B7280; /* 4.5:1 on #E5E7EB background */
  background-color: #E5E7EB;
  cursor: not-allowed;
}

/* Ensure hover states maintain contrast */
.btn-primary:hover {
  background-color: var(--primary-hover);
  /* Ensure text remains white or adjust if needed */
}
```

**Test Cases:**
- Check all button states (default, hover, active, disabled, focus)
- Verify focus rings have 3:1 contrast against background

---

#### Issue #18: Chart Colors Accessibility (P1)
**Priority:** High
**Component:** `WeeklyProgressChart.tsx`
**Estimated Time:** 1 hour

**Problem:**
- Chart uses color alone to convey information
- No patterns or labels for colorblind users

**Solution:**
```tsx
// Add patterns to bars
<Bar
  dataKey="completed"
  fill="var(--primary)"
  fillOpacity={0.8}
  // Add pattern for colorblind users
  strokeWidth={2}
  stroke="var(--primary)"
  strokeDasharray="5,5"
/>

// Add data labels
<Bar dataKey="completed" fill="var(--primary)">
  <LabelList
    dataKey="completed"
    position="top"
    fill="var(--foreground)"
    fontSize={12}
  />
</Bar>

// Add legend with shapes
<Legend
  iconType="square"
  wrapperStyle={{ paddingTop: '20px' }}
/>
```

**Test Cases:**
- Simulate colorblindness (Chrome DevTools)
- Verify patterns distinguish data series
- Check data labels are readable

---

### Category 4: Mobile Touch Gestures (12 hours)

#### Issue #19: Swipe-to-Reply in Chat (P1)
**Priority:** High
**Component:** `ChatMessageList.tsx`
**Estimated Time:** 4 hours

**Problem:**
- No swipe-to-reply gesture (industry standard)
- Users must click "Reply" button

**Solution:**
```tsx
// Add swipe handler to message
const [swipeOffset, setSwipeOffset] = useState(0);

const handleSwipe = (event: PanInfo) => {
  const { offset, velocity } = event;

  // Right swipe (50px threshold)
  if (offset.x > 50 && velocity.x > 100) {
    // Trigger reply
    onReply(message.id);
  }

  // Reset
  setSwipeOffset(0);
};

return (
  <motion.div
    drag="x"
    dragConstraints={{ left: 0, right: 100 }}
    dragElastic={0.2}
    onDrag={(e, info) => setSwipeOffset(info.offset.x)}
    onDragEnd={(e, info) => handleSwipe(info)}
    style={{
      x: swipeOffset,
      // Show reply icon as user swipes
      backgroundImage: swipeOffset > 20 ? 'url(/reply-icon.svg)' : 'none',
    }}
  >
    {/* Message content */}
  </motion.div>
);
```

**Test Cases:**
- Swipe right 50px → reply composer opens
- Swipe left → no action (reserved for delete)
- Swipe slowly → resets without action
- Works on both own and others' messages

---

#### Issue #20: Long-Press Context Menus (P1)
**Priority:** High
**Components:** `TodoItem.tsx`, `ChatMessageList.tsx`
**Estimated Time:** 4 hours

**Problem:**
- No long-press context menus
- Users must find "..." button for actions

**Solution:**
```tsx
// Add long-press handler
const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
const [showContextMenu, setShowContextMenu] = useState(false);

const handleTouchStart = (e: React.TouchEvent) => {
  const timer = setTimeout(() => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    // Show context menu
    setShowContextMenu(true);
  }, 500); // 500ms threshold

  setLongPressTimer(timer);
};

const handleTouchEnd = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    setLongPressTimer(null);
  }
};

return (
  <div
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
    onTouchCancel={handleTouchEnd}
  >
    {/* Item content */}

    <AnimatePresence>
      {showContextMenu && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="context-menu"
        >
          <button onClick={handleEdit}>Edit</button>
          <button onClick={handleDuplicate}>Duplicate</button>
          <button onClick={handleDelete}>Delete</button>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
```

**Test Cases:**
- Long-press task → context menu appears
- Long-press message → context menu with reply/edit/delete
- Tap (short press) → no menu
- Haptic feedback triggers on supported devices

---

#### Issue #21: Haptic Feedback API Integration (P1)
**Priority:** High
**Components:** Multiple (swipes, completions, deletions)
**Estimated Time:** 2 hours

**Problem:**
- No haptic feedback for actions
- Native app feel is missing

**Solution:**
```tsx
// Create haptic utility
// src/lib/haptics.ts
export const haptics = {
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },

  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  },

  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  },

  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
  },
};

// Usage
import { haptics } from '@/lib/haptics';

const handleCompleteTask = () => {
  // ... complete logic
  haptics.success();
};

const handleDeleteTask = () => {
  // ... delete logic
  haptics.heavy();
};
```

**Haptic Triggers:**
- Task completed → success pattern
- Task deleted → heavy vibration
- Swipe action → light vibration
- Long-press activated → medium vibration
- Error occurred → error pattern

**Test Cases:**
- Test on iPhone (Taptic Engine)
- Test on Android (vibration motor)
- Verify does not crash on desktop (feature detection)

---

#### Issue #22: Touch Event Handlers for Charts (P1)
**Priority:** High
**Component:** `WeeklyProgressChart.tsx`
**Estimated Time:** 2 hours

**Problem:**
- Charts use hover events (desktop-only)
- Mobile users can't see tooltips

**Solution:**
```tsx
// Add touch handler to chart
const [activeTooltip, setActiveTooltip] = useState<number | null>(null);

const handleBarTouch = (data: any, index: number) => {
  setActiveTooltip(index);

  // Hide after 2 seconds
  setTimeout(() => {
    setActiveTooltip(null);
  }, 2000);
};

<BarChart data={chartData}>
  <Bar
    dataKey="completed"
    fill="var(--primary)"
    onClick={(data, index) => handleBarTouch(data, index)}
  />

  <Tooltip
    active={activeTooltip !== null}
    cursor={false}
    content={<CustomTooltip />}
  />
</BarChart>
```

**Test Cases:**
- Tap bar → tooltip appears
- Tooltip disappears after 2s
- Works on all chart types (bar, line, pie)

---

### Category 5: Error Message Improvements (4 hours)

#### Issue #23: Actionable Error Messages (P1)
**Priority:** High
**Components:** All error states
**Estimated Time:** 2 hours

**Problem:**
```tsx
// Current: Vague
"Failed to load tasks"

// Better: Specific + Actionable
"Failed to load tasks. Check your internet connection and try again."
```

**Solution:**
```tsx
// Create error message utility
// src/lib/errorMessages.ts
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch')) {
      return 'Unable to connect. Please check your internet connection and try again.';
    }

    // Auth errors
    if (error.message.includes('401')) {
      return 'Session expired. Please log in again.';
    }

    // Permission errors
    if (error.message.includes('403')) {
      return 'You don\'t have permission to perform this action.';
    }

    // Validation errors
    if (error.message.includes('validation')) {
      return error.message; // Already specific
    }

    // Generic fallback
    return `Something went wrong: ${error.message}`;
  }

  return 'An unexpected error occurred. Please try again.';
};

// Usage
try {
  await supabase.from('todos').select();
} catch (error) {
  const message = getErrorMessage(error);
  setError(message);

  // Announce to screen readers
  setAnnouncement(`Error: ${message}`);
}
```

**Error Messages to Improve:**
- Failed API calls → network/server distinction
- Validation errors → specific field + rule
- Auth failures → expired session vs wrong credentials
- Permission errors → what permission is needed

**Test Cases:**
- Disconnect network → see clear message
- Invalid input → see specific validation error
- Session expired → see login prompt

---

#### Issue #24: Error Recovery Actions (P1)
**Priority:** High
**Components:** Error toast components
**Estimated Time:** 2 hours

**Problem:**
- Errors show toast but no action buttons
- Users don't know what to do next

**Solution:**
```tsx
// Enhanced error toast
<motion.div
  className="toast toast-error"
  role="alert"
>
  <AlertCircle className="w-5 h-5" />
  <div className="flex-1">
    <p className="font-medium">Failed to save task</p>
    <p className="text-sm text-gray-500">
      Check your internet connection and try again.
    </p>
  </div>
  <div className="flex gap-2">
    <button
      onClick={handleRetry}
      className="btn-sm btn-primary"
    >
      Retry
    </button>
    <button
      onClick={handleDismiss}
      className="btn-sm btn-ghost"
    >
      Dismiss
    </button>
  </div>
</motion.div>
```

**Recovery Actions:**
- Network error → "Retry" button
- Validation error → "Edit" button
- Session expired → "Log in" button
- Permission error → "Contact Admin" link

**Test Cases:**
- Click "Retry" → re-attempt action
- Keyboard navigation to buttons
- Screen reader announces action buttons

---

### Category 6: Inline Image Previews (4 hours)

#### Issue #25: Chat Image Attachments (P1)
**Priority:** High
**Component:** `ChatPanel.tsx`
**Estimated Time:** 2 hours

**Problem:**
- Images show as download links
- No inline preview in chat

**Solution:**
```tsx
// Detect image attachments
const isImage = (filename: string) => {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename);
};

// Render image preview
{message.attachments?.map((attachment) => (
  <div key={attachment.id} className="mt-2">
    {isImage(attachment.file_name) ? (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <img
          src={attachment.url}
          alt={attachment.file_name}
          className="max-w-xs rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
          loading="lazy"
        />
      </a>
    ) : (
      <a
        href={attachment.url}
        download={attachment.file_name}
        className="flex items-center gap-2 p-2 bg-[var(--surface-2)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
      >
        <Paperclip className="w-4 h-4" />
        <span className="text-sm">{attachment.file_name}</span>
      </a>
    )}
  </div>
))}
```

**Test Cases:**
- Upload image → preview appears
- Click preview → opens full size
- Non-image files → show download link
- Lazy loading works (doesn't load offscreen)

---

#### Issue #26: Task Attachment Previews (P1)
**Priority:** High
**Component:** `TodoItem.tsx`, `AttachmentList.tsx`
**Estimated Time:** 2 hours

**Problem:**
- Task attachments are list of links
- No visual preview for images/PDFs

**Solution:**
```tsx
// AttachmentList.tsx
<div className="attachments grid grid-cols-2 gap-2">
  {attachments.map((attachment) => (
    <div
      key={attachment.id}
      className="attachment-card"
    >
      {attachment.file_type === 'image' ? (
        <div className="aspect-video bg-[var(--surface-2)] rounded-lg overflow-hidden">
          <img
            src={attachment.storage_path}
            alt={attachment.file_name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : attachment.file_type === 'pdf' ? (
        <div className="aspect-video bg-[var(--surface-2)] rounded-lg flex items-center justify-center">
          <FileText className="w-12 h-12 text-[var(--text-muted)]" />
        </div>
      ) : (
        <div className="aspect-video bg-[var(--surface-2)] rounded-lg flex items-center justify-center">
          <Paperclip className="w-12 h-12 text-[var(--text-muted)]" />
        </div>
      )}

      <p className="text-xs text-[var(--text-muted)] truncate mt-1">
        {attachment.file_name}
      </p>
    </div>
  ))}
</div>
```

**Test Cases:**
- Image attachments → thumbnail preview
- PDF attachments → document icon
- Other files → generic icon
- Grid layout responsive (1 col mobile, 2 cols desktop)

---

### Category 7: Additional Polish (23 hours remaining from estimate)

#### Issue #27: Loading States Consistency (P1)
**Priority:** Medium
**Components:** Multiple
**Estimated Time:** 3 hours

**Problem:**
- Some components show spinner, others blank
- No skeleton screens

**Solution:**
- Create reusable `SkeletonLoader` component
- Add to Dashboard, TodoList, ChatPanel

---

#### Issue #28: Empty States Improvement (P1)
**Priority:** Medium
**Components:** Multiple
**Estimated Time:** 2 hours

**Problem:**
- Some empty states generic ("No items")
- Missing actionable CTAs

**Solution:**
- Enhance `EmptyState` component with illustrations
- Add specific CTAs ("Create your first task")

---

#### Issue #29-31: Additional improvements per audit
- Performance optimization (3 hours)
- Animation polish (2 hours)
- Documentation updates (2 hours)

---

## Testing Strategy

### Automated Tests (20 E2E tests)

1. **Accessibility Tests** (8 tests)
   - Skip link navigation
   - ARIA live region announcements
   - Form validation announcements
   - Keyboard navigation (arrow keys)

2. **Mobile Gesture Tests** (6 tests)
   - Swipe-to-reply in chat
   - Long-press context menus
   - Haptic feedback triggers
   - Chart touch interactions

3. **Contrast Tests** (3 tests)
   - Light mode text contrast
   - Dark mode text contrast
   - Button state contrast

4. **Error Handling Tests** (3 tests)
   - Network error recovery
   - Validation error display
   - Session expiry handling

### Manual Testing Checklist

- [ ] Screen reader testing (VoiceOver + NVDA)
- [ ] Keyboard-only navigation through all flows
- [ ] Touch gesture testing on real devices
- [ ] Color contrast verification (Lighthouse)
- [ ] Mobile layout on various screen sizes
- [ ] Dark mode vs light mode comparison

---

## Implementation Order

### Week 1 (Days 1-3): Accessibility
1. Issue #9: Skip link (2h)
2. Issue #10: ARIA live regions (3h)
3. Issue #11: Form validation ARIA (2h)
4. Issue #12: Semantic landmarks (1h)

**Total:** 8 hours

### Week 1-2 (Days 4-7): Keyboard Navigation
5. Issue #13: Arrow key navigation (3h)
6. Issue #14: Modal shortcuts (2h)
7. Issue #15: Focus trap improvements (1h)

**Total:** 6 hours

### Week 2 (Days 8-9): Color Contrast
8. Issue #16: Light mode contrast (1h)
9. Issue #17: Button state contrast (1h)
10. Issue #18: Chart colors (1h)

**Total:** 3 hours

### Week 2-3 (Days 10-14): Mobile Gestures
11. Issue #19: Swipe-to-reply (4h)
12. Issue #20: Long-press menus (4h)
13. Issue #21: Haptic feedback (2h)
14. Issue #22: Chart touch handlers (2h)

**Total:** 12 hours

### Week 3 (Days 15-16): Error Messages
15. Issue #23: Actionable errors (2h)
16. Issue #24: Recovery actions (2h)

**Total:** 4 hours

### Week 3 (Days 17-18): Image Previews
17. Issue #25: Chat image previews (2h)
18. Issue #26: Task attachment previews (2h)

**Total:** 4 hours

### Week 3 (Days 19-20): Polish & Testing
- Additional improvements (10h)
- E2E test creation (10h)
- Manual testing (3h)

**Total:** 23 hours

---

## Success Criteria

### Sprint 2 Complete When:
- ✅ All 23 P1 issues resolved
- ✅ 20+ new E2E tests passing
- ✅ WCAG 2.1 AA compliance: 95%+ (up from 82%)
- ✅ Screen reader testing passed
- ✅ Mobile gesture testing passed on real devices
- ✅ All color contrast issues fixed (4.5:1 minimum)
- ✅ Keyboard navigation complete for all components
- ✅ Error messages actionable and helpful

### Metrics to Track:
- **Accessibility Score:** 82% → 95%+
- **Keyboard Navigation Coverage:** 60% → 95%
- **Mobile Gesture Support:** 40% → 90%
- **Error Recovery Rate:** Unknown → 80%+
- **Color Contrast Pass Rate:** 85% → 100%

---

## Risk Assessment

### Low Risk:
- Skip link implementation
- ARIA live regions
- Color contrast fixes
- Semantic landmarks

### Medium Risk:
- Arrow key navigation (complex state management)
- Swipe-to-reply (gesture conflicts)
- Long-press menus (touch event handling)

### Mitigation:
- Thorough testing on multiple devices
- Feature flags for gradual rollout
- Fallback to existing UI if gestures fail
- Clear documentation for testing team

---

## Dependencies

### External:
- None (all features use existing libraries)

### Internal:
- Sprint 1 must be complete (100% ✅)
- Framer Motion for gesture handling
- Existing haptic API (navigator.vibrate)

---

## Rollout Plan

### Phase 1 (Week 1-2): Accessibility
- Deploy skip link + ARIA improvements
- Low risk, high impact for screen reader users

### Phase 2 (Week 2-3): Keyboard + Gestures
- Deploy keyboard navigation + mobile gestures
- Test with beta users first

### Phase 3 (Week 3): Polish
- Deploy error messages + image previews
- Full rollout to all users

---

**Document Status:** Ready for implementation
**Next Step:** Begin Issue #9 (Skip Link)
**Estimated Completion:** February 21, 2026
