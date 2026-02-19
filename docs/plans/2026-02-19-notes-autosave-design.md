# Notes Auto-save with Manual Override Design

**Date:** 2026-02-19
**Status:** Implemented
**Owner:** Adrian Stier

## Problem Statement

Users currently add notes to tasks without clear feedback that their notes are being saved. The current implementation uses `onBlur` (save when clicking away from textarea), which:
- Provides no visual confirmation that notes were saved
- Creates uncertainty about whether notes will persist
- Could lead to data loss if user closes modal before blur event fires
- Lacks user control for forcing an immediate save

**User feedback:** "when i add notes to a task after it's created there's not button to make sure it's added"

## Solution: Debounced Auto-save with Manual Override

Implement a combination pattern that provides both automatic saving and user control:
- **Auto-save:** Trigger save automatically after 1.5 seconds of no typing activity
- **Manual save button:** Always-visible button to force immediate save
- **Visual feedback:** Clear status indicators showing "Saving...", "Saved ✓", or "Error saving"

This balances safety (no data loss) with efficiency (fewer API calls than keystroke-level saving).

## Architecture

### Core Pattern

**Three-layer architecture:**
1. **Hook layer** (`useAutoSaveNotes`) - Manages debounce timing, save state, and orchestration
2. **UI layer** (`NotesSection`) - Renders textarea, status indicator, and save button
3. **Parent layer** (`TaskDetailModal`) - Owns API calls and task state (unchanged)

### State Management

```typescript
// Hook state
interface UseAutoSaveNotesReturn {
  value: string;                    // Local controlled state for textarea
  saveStatus: SaveStatus;           // 'idle' | 'saving' | 'saved' | 'error'
  handleChange: (value: string) => void;     // Updates local state, triggers debounce
  handleManualSave: () => void;              // Immediate save, bypasses debounce
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
```

### Component Hierarchy

```
NotesSection (modified)
├── textarea (controlled by hook's value)
├── SaveStatusIndicator (inline component)
│   ├── "Saving..." with spinner
│   ├── "Saved ✓" with checkmark (fades after 2s)
│   └── "Error saving" with retry button
├── ManualSaveButton (bottom-right corner)
└── character count (existing, preserved)
```

### Key Design Decisions

1. **Reusable hook:** `useAutoSaveNotes` can be used in other components (e.g., ExpandedPanel notes)
2. **Existing API preserved:** Hook calls existing `onSaveNotes` callback, doesn't bypass parent's save logic
3. **Debounce timing:** 1.5s balances responsiveness with API efficiency
4. **Status lifecycle:** idle → saving → saved → (2s fade) → idle

## Components

### Modified: NotesSection.tsx

**Changes:**
- Add `useAutoSaveNotes` hook to manage local state and debouncing
- Remove `onBlur={onSaveNotes}` from textarea
- Replace `value={notes}` with `value={value}` from hook
- Replace `onChange={onNotesChange}` with `onChange={handleChange}` from hook
- Add `<SaveStatusIndicator saveStatus={saveStatus} onRetry={handleManualSave} />` below textarea
- Add `<ManualSaveButton onClick={handleManualSave} disabled={saveStatus === 'saving'} />` in textarea container

**Props interface (unchanged):**
```typescript
interface NotesSectionProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  onSaveNotes: () => void;
  transcription?: string;
  canEdit?: boolean;
}
```

### New: useAutoSaveNotes.ts

**Location:** `src/hooks/useAutoSaveNotes.ts`

**Purpose:** Encapsulate debounce logic, save status tracking, and save orchestration

**Interface:**
```typescript
interface UseAutoSaveNotesOptions {
  initialValue: string;              // Initial notes from task
  onSave: () => void;                // Callback to parent's save function
  onChange: (value: string) => void; // Callback to update parent's state
  debounceMs?: number;               // Default 1500ms
  enabled?: boolean;                 // Respects canEdit prop
}

interface UseAutoSaveNotesReturn {
  value: string;
  saveStatus: SaveStatus;
  handleChange: (newValue: string) => void;
  handleManualSave: () => void;
}
```

**Key behaviors:**
- Uses `useDebouncedCallback` from `use-debounce` library
- Tracks save status with state machine
- Cancels debounce timer on manual save
- Flushes pending changes on unmount (cleanup)
- Prevents double-saves with in-flight tracking ref
- No-op when `enabled === false`

### New: SaveStatusIndicator (inline component)

**Location:** Inline in `NotesSection.tsx` (not separate file - too small)

**Rendering logic:**
```typescript
{saveStatus === 'saving' && (
  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
    <Loader2 className="w-3.5 h-3.5 animate-spin" />
    Saving...
  </div>
)}

{saveStatus === 'saved' && (
  <motion.div
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="flex items-center gap-1.5 text-sm text-green-600"
  >
    <Check className="w-3.5 h-3.5" />
    Saved
  </motion.div>
)}

{saveStatus === 'error' && (
  <div className="flex items-center gap-2 text-sm text-red-600">
    <AlertCircle className="w-3.5 h-3.5" />
    Error saving
    <button onClick={onRetry} className="underline">Retry</button>
  </div>
)}
```

**Behavior:**
- "Saved" state auto-transitions to "idle" after 2s using `setTimeout`
- Uses Framer Motion `AnimatePresence` for smooth transitions
- Positioned below textarea, left-aligned

### New: ManualSaveButton

**Location:** Inline in `NotesSection.tsx` or separate if reused elsewhere

**Props:**
```typescript
interface ManualSaveButtonProps {
  onClick: () => void;
  disabled: boolean;
}
```

**Design:**
- Icon: `Save` from lucide-react
- Position: Absolute bottom-right of textarea container (next to character count)
- States: Normal, hover, disabled (during save)
- Tooltip: "Save" on hover
- Compact size: 24px × 24px icon button

**Styling:**
```tsx
<button
  onClick={onClick}
  disabled={disabled}
  className="absolute bottom-2 right-10 p-1.5 rounded hover:bg-accent transition-colors disabled:opacity-50"
  title="Save notes"
>
  <Save className="w-4 h-4" />
</button>
```

## Data Flow

### Auto-save Flow

```
1. User types in textarea
   ↓
2. handleChange(newValue) called
   ↓
3. Update local value state immediately (responsive UI)
   ↓
4. Start/reset debounce timer (1.5s)
   ↓
5. After 1.5s of no typing → debounced function fires
   ↓
6. Set saveStatus = 'saving'
   ↓
7. Call onChange(value) to update parent state
   ↓
8. Call onSaveNotes() to trigger API save
   ↓
9. On success: saveStatus = 'saved'
   ↓
10. After 2s: saveStatus = 'idle' (fade out indicator)
```

### Manual Save Flow

```
1. User clicks save button
   ↓
2. handleManualSave() called
   ↓
3. Cancel pending debounce timer (if any)
   ↓
4. Set saveStatus = 'saving'
   ↓
5. Call onChange(value) and onSaveNotes() immediately
   ↓
6. Same success flow as auto-save (steps 9-10)
```

### Error Flow

```
1. onSaveNotes() throws error or returns rejected promise
   ↓
2. Catch error in hook
   ↓
3. Set saveStatus = 'error'
   ↓
4. Show "Error saving" with retry button
   ↓
5. Keep local state intact (user's typing preserved)
   ↓
6. User clicks retry → calls handleManualSave()
```

### Sequence Diagram

```
┌──────┐     ┌─────────────┐     ┌─────────────────┐     ┌──────────────┐     ┌─────┐
│ User │     │ NotesSection│     │useAutoSaveNotes │     │TaskDetailModal│     │ API │
└──┬───┘     └──────┬──────┘     └────────┬────────┘     └──────┬───────┘     └──┬──┘
   │                │                     │                      │                │
   │─type─────────>│                     │                      │                │
   │                │──handleChange()───>│                      │                │
   │                │                     │──update state       │                │
   │                │                     │──start debounce     │                │
   │                │                     │                     │                │
   │              [1.5s passes]           │                     │                │
   │                │                     │                     │                │
   │                │                     │──onChange(value)──>│                │
   │                │                     │──onSaveNotes()────>│                │
   │                │                     │                     │──save────────>│
   │                │                     │                     │<─success──────│
   │                │<──saveStatus='saved'│                     │                │
   │<─"Saved ✓"────│                     │                     │                │
```

## Error Handling

### API Failure Handling

**Strategy:** Graceful degradation with retry capability

```typescript
try {
  setSaveStatus('saving');
  onChange(value);      // Update parent state
  await onSaveNotes();  // Trigger API call
  setSaveStatus('saved');

  // Auto-clear after 2s
  setTimeout(() => setSaveStatus('idle'), 2000);
} catch (error) {
  console.error('Failed to save notes:', error);
  setSaveStatus('error');
  // Keep local state - user doesn't lose typing
}
```

**User recovery:**
- Retry button calls `handleManualSave()` again
- Optional: Add exponential backoff for repeated failures

### Race Conditions

**Problem:** User clicks save while auto-save is in flight

**Solution:** Track in-flight save with ref
```typescript
const savingRef = useRef(false);

const performSave = async () => {
  if (savingRef.current) return; // Ignore if already saving

  savingRef.current = true;
  try {
    // ... save logic
  } finally {
    savingRef.current = false;
  }
};
```

### Edge Cases

#### 1. User navigates away during debounce

**Problem:** Notes typed but not yet saved (still in 1.5s debounce window)

**Solution:** Flush pending save on unmount
```typescript
useEffect(() => {
  return () => {
    // Cleanup: save if there are unsaved changes
    if (debouncedSave.isPending()) {
      debouncedSave.flush();
    }
  };
}, [debouncedSave]);
```

#### 2. Component unmounts while saving

**Problem:** setState on unmounted component warning

**Solution:** Track mounted state
```typescript
const mountedRef = useRef(true);

useEffect(() => {
  return () => {
    mountedRef.current = false;
  };
}, []);

// In save handler
if (!mountedRef.current) return;
setSaveStatus('saved');
```

#### 3. Rapid manual saves

**Problem:** User mashes save button, triggering multiple API calls

**Solution:** Disable button during save
```tsx
<ManualSaveButton
  onClick={handleManualSave}
  disabled={saveStatus === 'saving'}
/>
```

#### 4. Read-only mode (`canEdit = false`)

**Problem:** Hook should not save in read-only mode

**Solution:** Pass `enabled` flag, return no-op functions
```typescript
const useAutoSaveNotes = ({ enabled, ... }) => {
  if (!enabled) {
    return {
      value: initialValue,
      saveStatus: 'idle',
      handleChange: () => {},
      handleManualSave: () => {},
    };
  }
  // ... normal implementation
};
```

#### 5. Initial load with existing notes

**Problem:** Don't trigger save on mount

**Solution:** Only save on value changes, not initial value
```typescript
const isFirstRender = useRef(true);

useEffect(() => {
  if (isFirstRender.current) {
    isFirstRender.current = false;
    return;
  }

  // Only debounce on subsequent changes
  debouncedSave();
}, [value]);
```

### Network Issues

**Handling strategies:**
- Timeout for save operations (10s default)
- Clear error message: "Unable to save. Check your connection."
- Auto-retry on next edit (debounce timer restarts)
- Consider offline detection and warning

## Testing Strategy

### Unit Tests (Vitest)

**File:** `src/hooks/useAutoSaveNotes.test.ts`

**Test cases:**
```typescript
describe('useAutoSaveNotes', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('debounces save calls (waits 1.5s after last keystroke)', () => {
    const onSave = jest.fn();
    const { result } = renderHook(() => useAutoSaveNotes({...}));

    act(() => result.current.handleChange('new text'));
    expect(onSave).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1500));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('manual save bypasses debounce and saves immediately', () => {
    const onSave = jest.fn();
    const { result } = renderHook(() => useAutoSaveNotes({...}));

    act(() => result.current.handleChange('new text'));
    act(() => result.current.handleManualSave());

    expect(onSave).toHaveBeenCalledTimes(1);
    // Should not call again after debounce
    act(() => jest.advanceTimersByTime(1500));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('sets saveStatus correctly through lifecycle', async () => {
    const { result } = renderHook(() => useAutoSaveNotes({...}));

    expect(result.current.saveStatus).toBe('idle');

    act(() => result.current.handleManualSave());
    expect(result.current.saveStatus).toBe('saving');

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('saved');
    });

    act(() => jest.advanceTimersByTime(2000));
    expect(result.current.saveStatus).toBe('idle');
  });

  it('handles save errors and sets error status', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useAutoSaveNotes({ onSave, ... }));

    act(() => result.current.handleManualSave());

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('error');
    });
  });

  it('flushes pending changes on unmount', () => {
    const onSave = jest.fn();
    const { result, unmount } = renderHook(() => useAutoSaveNotes({ onSave, ... }));

    act(() => result.current.handleChange('new text'));
    unmount();

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('respects enabled flag (no-op when disabled)', () => {
    const onSave = jest.fn();
    const { result } = renderHook(() => useAutoSaveNotes({
      enabled: false,
      onSave,
      ...
    }));

    act(() => result.current.handleChange('new text'));
    act(() => result.current.handleManualSave());

    expect(onSave).not.toHaveBeenCalled();
  });
});
```

**File:** `src/components/task-detail/NotesSection.test.tsx`

**Test cases:**
```typescript
describe('NotesSection', () => {
  it('renders textarea with initial notes value', () => {
    render(<NotesSection notes="Initial notes" {...props} />);
    expect(screen.getByRole('textbox')).toHaveValue('Initial notes');
  });

  it('shows SaveStatusIndicator with correct status', async () => {
    render(<NotesSection {...props} />);

    const textarea = screen.getByRole('textbox');
    userEvent.type(textarea, 'New notes');

    await waitFor(() => {
      expect(screen.getByText(/Saving.../)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Saved/)).toBeInTheDocument();
    });
  });

  it('shows/hides ManualSaveButton based on canEdit prop', () => {
    const { rerender } = render(<NotesSection canEdit={true} {...props} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();

    rerender(<NotesSection canEdit={false} {...props} />);
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('manual save button disabled during save', async () => {
    render(<NotesSection {...props} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    const textarea = screen.getByRole('textbox');

    userEvent.type(textarea, 'New notes');
    userEvent.click(saveButton);

    expect(saveButton).toBeDisabled();

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('character count still displays correctly', () => {
    render(<NotesSection notes="Hello" {...props} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
```

### Integration Tests (Playwright)

**File:** `tests/notes-autosave.spec.ts`

**Test cases:**

```typescript
test('auto-save flow: saves notes after 1.5s of inactivity', async ({ page }) => {
  await page.goto('/');
  await login(page);

  // Open task
  await page.click('[data-testid="task-item"]');

  // Type notes
  const textarea = page.locator('textarea[placeholder*="Add notes"]');
  await textarea.fill('Important meeting notes');

  // Wait for auto-save (1.5s + buffer)
  await page.waitForSelector('text=Saving...', { timeout: 2000 });
  await page.waitForSelector('text=Saved', { timeout: 3000 });

  // Close and reopen task
  await page.click('[data-testid="close-modal"]');
  await page.click('[data-testid="task-item"]');

  // Verify notes persisted
  await expect(textarea).toHaveValue('Important meeting notes');
});

test('manual save flow: saves immediately when clicking save button', async ({ page }) => {
  await page.goto('/');
  await login(page);

  await page.click('[data-testid="task-item"]');

  // Type notes quickly
  const textarea = page.locator('textarea[placeholder*="Add notes"]');
  await textarea.fill('Quick note');

  // Click save immediately (before 1.5s debounce)
  await page.click('button[title="Save notes"]');

  // Should see "Saving..." almost immediately
  await expect(page.locator('text=Saving...')).toBeVisible({ timeout: 500 });
  await expect(page.locator('text=Saved')).toBeVisible({ timeout: 2000 });

  // Verify persisted
  await page.click('[data-testid="close-modal"]');
  await page.click('[data-testid="task-item"]');
  await expect(textarea).toHaveValue('Quick note');
});

test('error recovery: shows error and allows retry', async ({ page }) => {
  await page.goto('/');
  await login(page);

  // Intercept API and force failure
  await page.route('**/api/todos', route => route.abort());

  await page.click('[data-testid="task-item"]');
  const textarea = page.locator('textarea[placeholder*="Add notes"]');
  await textarea.fill('Notes that will fail');

  // Trigger manual save
  await page.click('button[title="Save notes"]');

  // Should show error
  await expect(page.locator('text=Error saving')).toBeVisible();
  await expect(page.locator('button:has-text("Retry")')).toBeVisible();

  // Remove route intercept and retry
  await page.unroute('**/api/todos');
  await page.click('button:has-text("Retry")');

  // Should succeed now
  await expect(page.locator('text=Saved')).toBeVisible();
});

test('navigation edge case: flushes pending save on close', async ({ page }) => {
  await page.goto('/');
  await login(page);

  await page.click('[data-testid="task-item"]');

  // Type notes
  const textarea = page.locator('textarea[placeholder*="Add notes"]');
  await textarea.fill('Quick exit test');

  // Close immediately (before debounce completes)
  await page.click('[data-testid="close-modal"]');

  // Wait a moment for flush
  await page.waitForTimeout(500);

  // Reopen and verify notes were saved
  await page.click('[data-testid="task-item"]');
  await expect(textarea).toHaveValue('Quick exit test');
});

test('read-only mode: no save button or auto-save', async ({ page }) => {
  // Login as user without edit permission
  await page.goto('/');
  await loginAsViewer(page);

  await page.click('[data-testid="task-item"]');

  // Should not show save button
  await expect(page.locator('button[title="Save notes"]')).not.toBeVisible();

  // Textarea should be read-only
  const textarea = page.locator('textarea[placeholder*="Add notes"]');
  await expect(textarea).toHaveAttribute('readonly');
});
```

### Coverage Goals

- **useAutoSaveNotes hook:** >95% coverage (critical business logic)
- **NotesSection component:** >90% coverage
- **Integration tests:** Cover all user-facing flows (auto-save, manual save, errors, navigation)

### Test Environment

- **Unit tests:** Vitest with React Testing Library
- **Mocks:** jest.useFakeTimers() for debounce testing
- **Integration tests:** Playwright with real API (or mocked routes for error scenarios)
- **CI:** Run on every PR, block merge on failures

## Success Criteria

### User Experience

✅ User receives clear visual feedback when notes are saving
✅ User sees "Saved ✓" confirmation after successful save
✅ User can force immediate save with manual save button
✅ Notes never lost due to early navigation (flush on unmount)
✅ Error states are clear and recoverable (retry button)
✅ No performance degradation (debouncing prevents excessive API calls)

### Technical Requirements

✅ Auto-save triggers after 1.5s of no typing activity
✅ Manual save bypasses debounce and saves immediately
✅ Save status indicator shows: idle, saving, saved, error states
✅ Hook is reusable for other components (e.g., ExpandedPanel)
✅ No breaking changes to existing NotesSection API
✅ Read-only mode respected (no saves when `canEdit = false`)
✅ All tests pass (unit + integration)
✅ >90% code coverage on new/modified code

### Performance

✅ Debouncing reduces API calls by >80% vs. keystroke-level saving
✅ No UI jank during typing or save operations
✅ Status indicator animations are smooth (60fps)
✅ Cleanup properly handles unmount during save

### Accessibility

✅ Save button has proper aria-label and keyboard access
✅ Status indicator uses aria-live region for screen readers
✅ Error state is announced to assistive technology
✅ Keyboard shortcuts work (Cmd+S could trigger manual save - future enhancement)

## Future Enhancements

(Not in scope for initial implementation)

- **Keyboard shortcut:** Cmd+S / Ctrl+S to trigger manual save
- **Offline support:** Queue saves when offline, sync when back online
- **Conflict resolution:** Handle concurrent edits from multiple users
- **Save history:** "Saved 5 minutes ago" timestamp in status indicator
- **Undo/redo:** Integrate with browser undo stack or custom implementation
- **Rich text editing:** Replace textarea with rich text editor (Tiptap, Lexical)

## Implementation Plan

See separate implementation plan document: `docs/plans/2026-02-19-notes-autosave-implementation.md`

Created by invoking `superpowers:writing-plans` skill after this design is approved.
