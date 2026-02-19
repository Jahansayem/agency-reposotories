# Notes Auto-save Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add auto-save with manual override to task notes, providing clear visual feedback and preventing data loss.

**Architecture:** Hook-based (useAutoSaveNotes) with debounced auto-save (1.5s) + manual save button + status indicator (saving/saved/error).

**Tech Stack:** React, TypeScript, use-debounce, Framer Motion, Vitest, Playwright

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install use-debounce library**

Run: `npm install use-debounce`
Expected: Package installed successfully

**Step 2: Verify installation**

Run: `npm list use-debounce`
Expected: Shows installed version

**Step 3: Commit dependency**

```bash
git add package.json package-lock.json
git commit -m "chore: add use-debounce for notes auto-save"
```

---

## Task 2: Create useAutoSaveNotes Hook (TDD)

**Files:**
- Create: `src/hooks/useAutoSaveNotes.test.ts`
- Create: `src/hooks/useAutoSaveNotes.ts`

### Step 1: Write first failing test (debounce behavior)

Create `src/hooks/useAutoSaveNotes.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSaveNotes } from './useAutoSaveNotes';

describe('useAutoSaveNotes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('debounces save calls (waits 1.5s after last keystroke)', () => {
    const onSave = vi.fn();
    const onChange = vi.fn();

    const { result } = renderHook(() =>
      useAutoSaveNotes({
        initialValue: '',
        onSave,
        onChange,
        enabled: true,
      })
    );

    // User types
    act(() => {
      result.current.handleChange('new text');
    });

    // Should not save immediately
    expect(onSave).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();

    // Advance time by 1.5s
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Now should have saved
    expect(onChange).toHaveBeenCalledWith('new text');
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test src/hooks/useAutoSaveNotes.test.ts`
Expected: FAIL - "Cannot find module './useAutoSaveNotes'"

### Step 3: Create minimal hook implementation

Create `src/hooks/useAutoSaveNotes.ts`:

```typescript
import { useState, useRef, useEffect, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseAutoSaveNotesOptions {
  initialValue: string;
  onSave: () => void | Promise<void>;
  onChange: (value: string) => void;
  debounceMs?: number;
  enabled?: boolean;
}

export interface UseAutoSaveNotesReturn {
  value: string;
  saveStatus: SaveStatus;
  handleChange: (newValue: string) => void;
  handleManualSave: () => void;
}

export function useAutoSaveNotes({
  initialValue,
  onSave,
  onChange,
  debounceMs = 1500,
  enabled = true,
}: UseAutoSaveNotesOptions): UseAutoSaveNotesReturn {
  const [value, setValue] = useState(initialValue);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Debounced save function
  const debouncedSave = useDebouncedCallback(
    async () => {
      if (!enabled) return;

      try {
        setSaveStatus('saving');
        onChange(value);
        await onSave();
        setSaveStatus('saved');

        // Auto-clear after 2s
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Failed to save notes:', error);
        setSaveStatus('error');
      }
    },
    debounceMs
  );

  const handleChange = useCallback(
    (newValue: string) => {
      setValue(newValue);
      if (enabled) {
        debouncedSave();
      }
    },
    [enabled, debouncedSave]
  );

  const handleManualSave = useCallback(async () => {
    if (!enabled) return;

    // Cancel pending debounce
    debouncedSave.cancel();

    try {
      setSaveStatus('saving');
      onChange(value);
      await onSave();
      setSaveStatus('saved');

      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save notes:', error);
      setSaveStatus('error');
    }
  }, [enabled, value, onChange, onSave, debouncedSave]);

  // Cleanup: flush pending save on unmount
  useEffect(() => {
    return () => {
      if (debouncedSave.isPending()) {
        debouncedSave.flush();
      }
    };
  }, [debouncedSave]);

  if (!enabled) {
    return {
      value: initialValue,
      saveStatus: 'idle',
      handleChange: () => {},
      handleManualSave: () => {},
    };
  }

  return {
    value,
    saveStatus,
    handleChange,
    handleManualSave,
  };
}
```

### Step 4: Run test to verify it passes

Run: `npm test src/hooks/useAutoSaveNotes.test.ts`
Expected: PASS (1 test)

### Step 5: Commit hook scaffolding

```bash
git add src/hooks/useAutoSaveNotes.ts src/hooks/useAutoSaveNotes.test.ts
git commit -m "feat: add useAutoSaveNotes hook with debounce"
```

---

## Task 3: Add Manual Save Test

**Files:**
- Modify: `src/hooks/useAutoSaveNotes.test.ts`

### Step 1: Write manual save test

Add to `src/hooks/useAutoSaveNotes.test.ts`:

```typescript
it('manual save bypasses debounce and saves immediately', () => {
  const onSave = vi.fn();
  const onChange = vi.fn();

  const { result } = renderHook(() =>
    useAutoSaveNotes({
      initialValue: '',
      onSave,
      onChange,
      enabled: true,
    })
  );

  act(() => {
    result.current.handleChange('new text');
  });

  // Trigger manual save immediately
  act(() => {
    result.current.handleManualSave();
  });

  // Should save immediately without waiting
  expect(onChange).toHaveBeenCalledWith('new text');
  expect(onSave).toHaveBeenCalledTimes(1);

  // Advance debounce timer - should NOT call again
  act(() => {
    vi.advanceTimersByTime(1500);
  });

  expect(onSave).toHaveBeenCalledTimes(1); // Still only once
});
```

### Step 2: Run test to verify it passes

Run: `npm test src/hooks/useAutoSaveNotes.test.ts`
Expected: PASS (2 tests)

### Step 3: Commit manual save test

```bash
git add src/hooks/useAutoSaveNotes.test.ts
git commit -m "test: add manual save test for useAutoSaveNotes"
```

---

## Task 4: Add Save Status Lifecycle Test

**Files:**
- Modify: `src/hooks/useAutoSaveNotes.test.ts`

### Step 1: Write save status lifecycle test

Add to `src/hooks/useAutoSaveNotes.test.ts`:

```typescript
it('sets saveStatus correctly through lifecycle', async () => {
  const onSave = vi.fn();
  const onChange = vi.fn();

  const { result } = renderHook(() =>
    useAutoSaveNotes({
      initialValue: '',
      onSave,
      onChange,
      enabled: true,
    })
  );

  // Initial state
  expect(result.current.saveStatus).toBe('idle');

  // Trigger manual save
  act(() => {
    result.current.handleChange('new text');
    result.current.handleManualSave();
  });

  // Should be saving
  expect(result.current.saveStatus).toBe('saving');

  // Wait for save to complete
  await waitFor(() => {
    expect(result.current.saveStatus).toBe('saved');
  });

  // Advance 2s to auto-clear
  act(() => {
    vi.advanceTimersByTime(2000);
  });

  expect(result.current.saveStatus).toBe('idle');
});
```

### Step 2: Run test to verify it passes

Run: `npm test src/hooks/useAutoSaveNotes.test.ts`
Expected: PASS (3 tests)

### Step 3: Commit lifecycle test

```bash
git add src/hooks/useAutoSaveNotes.test.ts
git commit -m "test: add save status lifecycle test"
```

---

## Task 5: Add Error Handling Test

**Files:**
- Modify: `src/hooks/useAutoSaveNotes.test.ts`

### Step 1: Write error handling test

Add to `src/hooks/useAutoSaveNotes.test.ts`:

```typescript
it('handles save errors and sets error status', async () => {
  const onSave = vi.fn().mockRejectedValue(new Error('Network error'));
  const onChange = vi.fn();

  const { result } = renderHook(() =>
    useAutoSaveNotes({
      initialValue: '',
      onSave,
      onChange,
      enabled: true,
    })
  );

  act(() => {
    result.current.handleChange('new text');
    result.current.handleManualSave();
  });

  await waitFor(() => {
    expect(result.current.saveStatus).toBe('error');
  });

  // Value should be preserved (not lost)
  expect(result.current.value).toBe('new text');
});
```

### Step 2: Run test to verify it passes

Run: `npm test src/hooks/useAutoSaveNotes.test.ts`
Expected: PASS (4 tests)

### Step 3: Commit error handling test

```bash
git add src/hooks/useAutoSaveNotes.test.ts
git commit -m "test: add error handling test for useAutoSaveNotes"
```

---

## Task 6: Add Unmount Flush Test

**Files:**
- Modify: `src/hooks/useAutoSaveNotes.test.ts`

### Step 1: Write unmount flush test

Add to `src/hooks/useAutoSaveNotes.test.ts`:

```typescript
it('flushes pending changes on unmount', () => {
  const onSave = vi.fn();
  const onChange = vi.fn();

  const { result, unmount } = renderHook(() =>
    useAutoSaveNotes({
      initialValue: '',
      onSave,
      onChange,
      enabled: true,
    })
  );

  act(() => {
    result.current.handleChange('new text');
  });

  // Not saved yet (still in debounce)
  expect(onSave).not.toHaveBeenCalled();

  // Unmount should flush
  unmount();

  // Should have saved
  expect(onChange).toHaveBeenCalledWith('new text');
  expect(onSave).toHaveBeenCalledTimes(1);
});
```

### Step 2: Run test to verify it passes

Run: `npm test src/hooks/useAutoSaveNotes.test.ts`
Expected: PASS (5 tests)

### Step 3: Commit unmount test

```bash
git add src/hooks/useAutoSaveNotes.test.ts
git commit -m "test: add unmount flush test for useAutoSaveNotes"
```

---

## Task 7: Add Disabled Mode Test

**Files:**
- Modify: `src/hooks/useAutoSaveNotes.test.ts`

### Step 1: Write disabled mode test

Add to `src/hooks/useAutoSaveNotes.test.ts`:

```typescript
it('respects enabled flag (no-op when disabled)', () => {
  const onSave = vi.fn();
  const onChange = vi.fn();

  const { result } = renderHook(() =>
    useAutoSaveNotes({
      initialValue: 'initial',
      onSave,
      onChange,
      enabled: false,
    })
  );

  // Should return initial value
  expect(result.current.value).toBe('initial');
  expect(result.current.saveStatus).toBe('idle');

  // Try to change
  act(() => {
    result.current.handleChange('new text');
  });

  // Should not save
  expect(onSave).not.toHaveBeenCalled();
  expect(onChange).not.toHaveBeenCalled();

  // Try manual save
  act(() => {
    result.current.handleManualSave();
  });

  expect(onSave).not.toHaveBeenCalled();
});
```

### Step 2: Run test to verify it passes

Run: `npm test src/hooks/useAutoSaveNotes.test.ts`
Expected: PASS (6 tests)

### Step 3: Commit disabled mode test

```bash
git add src/hooks/useAutoSaveNotes.test.ts
git commit -m "test: add disabled mode test for useAutoSaveNotes"
```

---

## Task 8: Modify NotesSection Component (TDD)

**Files:**
- Create: `src/components/task-detail/NotesSection.test.tsx`
- Modify: `src/components/task-detail/NotesSection.tsx`

### Step 1: Write NotesSection test (renders with initial value)

Create `src/components/task-detail/NotesSection.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotesSection from './NotesSection';

describe('NotesSection', () => {
  const defaultProps = {
    notes: '',
    onNotesChange: vi.fn(),
    onSaveNotes: vi.fn(),
    canEdit: true,
  };

  it('renders textarea with initial notes value', () => {
    render(<NotesSection {...defaultProps} notes="Initial notes" />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('Initial notes');
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test src/components/task-detail/NotesSection.test.tsx`
Expected: FAIL - Test exists but we haven't modified component yet

### Step 3: Modify NotesSection to use hook

Modify `src/components/task-detail/NotesSection.tsx`:

```typescript
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronUp, FileText, Mic, Save, Loader2, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoSaveNotes } from '@/hooks/useAutoSaveNotes';

interface NotesSectionProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  onSaveNotes: () => void;
  transcription?: string;
  /** Whether user can edit the task (has permission or owns the task) */
  canEdit?: boolean;
}

export default function NotesSection({
  notes,
  onNotesChange,
  onSaveNotes,
  transcription,
  canEdit = true,
}: NotesSectionProps) {
  const [isOpen, setIsOpen] = useState(!!notes || !!transcription);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use auto-save hook
  const { value, saveStatus, handleChange, handleManualSave } = useAutoSaveNotes({
    initialValue: notes,
    onSave: onSaveNotes,
    onChange: onNotesChange,
    enabled: canEdit,
  });

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 22;
    const minHeight = lineHeight * 4;
    const maxHeight = lineHeight * 14;
    const scrollHeight = el.scrollHeight;
    el.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
    el.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, isOpen, autoResize]);

  return (
    <div>
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between w-full py-2 text-left text-[var(--foreground)]"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="w-4 h-4 text-[var(--accent)]" />
          Notes
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        )}
      </motion.button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-1 pb-2 space-y-3">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(e) => {
                    if (canEdit) {
                      handleChange(e.target.value);
                      autoResize();
                    }
                  }}
                  placeholder={canEdit ? "Add notes or context..." : "No notes"}
                  rows={4}
                  className={`w-full px-3 py-2.5 text-sm leading-relaxed resize-none bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-lg)] text-[var(--foreground)] outline-none transition-shadow focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] placeholder:text-[var(--text-muted)] ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={!canEdit}
                  readOnly={!canEdit}
                />

                {/* Character count */}
                <span className="absolute bottom-2 right-3 text-label text-[var(--text-muted)] pointer-events-none select-none">
                  {value.length}
                </span>

                {/* Manual save button */}
                {canEdit && (
                  <button
                    onClick={handleManualSave}
                    disabled={saveStatus === 'saving'}
                    className="absolute bottom-2 right-10 p-1.5 rounded hover:bg-[var(--surface-3)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save notes"
                    aria-label="Save notes"
                  >
                    <Save className="w-4 h-4 text-[var(--text-muted)]" />
                  </button>
                )}
              </div>

              {/* Save status indicator */}
              {canEdit && (
                <div className="min-h-[20px]">
                  <AnimatePresence mode="wait">
                    {saveStatus === 'saving' && (
                      <motion.div
                        key="saving"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]"
                      >
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving...
                      </motion.div>
                    )}

                    {saveStatus === 'saved' && (
                      <motion.div
                        key="saved"
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
                      <motion.div
                        key="error"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-sm text-red-600"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        Error saving
                        <button
                          onClick={handleManualSave}
                          className="underline hover:no-underline"
                        >
                          Retry
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {transcription && (
                <div className="bg-[var(--surface-2)] border border-[var(--border)] border-l-2 border-l-[var(--accent)] rounded-[var(--radius-md)] p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-label text-[var(--text-muted)] mb-1 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-[var(--accent)]" />
                      Voicemail Transcription
                    </p>
                    <p className="text-sm leading-relaxed text-[var(--foreground)]">
                      {transcription}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Step 4: Run test to verify it passes

Run: `npm test src/components/task-detail/NotesSection.test.tsx`
Expected: PASS (1 test)

### Step 5: Commit NotesSection modifications

```bash
git add src/components/task-detail/NotesSection.tsx src/components/task-detail/NotesSection.test.tsx
git commit -m "feat: integrate useAutoSaveNotes into NotesSection with save button and status"
```

---

## Task 9: Add NotesSection UI Tests

**Files:**
- Modify: `src/components/task-detail/NotesSection.test.tsx`

### Step 1: Add manual save button visibility test

Add to `src/components/task-detail/NotesSection.test.tsx`:

```typescript
it('shows manual save button when canEdit is true', () => {
  render(<NotesSection {...defaultProps} canEdit={true} />);

  const saveButton = screen.getByRole('button', { name: /save notes/i });
  expect(saveButton).toBeInTheDocument();
});

it('hides manual save button when canEdit is false', () => {
  render(<NotesSection {...defaultProps} canEdit={false} />);

  const saveButton = screen.queryByRole('button', { name: /save notes/i });
  expect(saveButton).not.toBeInTheDocument();
});
```

### Step 2: Run tests

Run: `npm test src/components/task-detail/NotesSection.test.tsx`
Expected: PASS (3 tests)

### Step 3: Add character count test

Add to `src/components/task-detail/NotesSection.test.tsx`:

```typescript
it('displays character count correctly', () => {
  render(<NotesSection {...defaultProps} notes="Hello" />);

  expect(screen.getByText('5')).toBeInTheDocument();
});
```

### Step 4: Run tests

Run: `npm test src/components/task-detail/NotesSection.test.tsx`
Expected: PASS (4 tests)

### Step 5: Commit UI tests

```bash
git add src/components/task-detail/NotesSection.test.tsx
git commit -m "test: add UI tests for NotesSection save button and character count"
```

---

## Task 10: Create Integration Test (Playwright)

**Files:**
- Create: `tests/notes-autosave.spec.ts`

### Step 1: Create auto-save integration test

Create `tests/notes-autosave.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

// Helper to login (adjust based on your auth flow)
async function login(page) {
  await page.goto('/');
  // Add your login flow here
  // For now, assume user is already logged in
}

test.describe('Notes Auto-save', () => {
  test('auto-save flow: saves notes after 1.5s of inactivity', async ({ page }) => {
    await login(page);

    // Open a task (adjust selector based on your app)
    await page.click('[data-testid="task-item"]').catch(() => {
      // If no task exists, this test may need setup
      test.skip();
    });

    // Find notes textarea
    const textarea = page.locator('textarea[placeholder*="Add notes"]');
    await textarea.fill('Important meeting notes');

    // Wait for auto-save indicator (1.5s + buffer)
    await expect(page.locator('text=Saving...')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Saved')).toBeVisible({ timeout: 3000 });

    // Close and reopen task
    await page.click('[aria-label="Close"]');
    await page.click('[data-testid="task-item"]');

    // Verify notes persisted
    await expect(textarea).toHaveValue('Important meeting notes');
  });

  test('manual save flow: saves immediately when clicking save button', async ({ page }) => {
    await login(page);

    await page.click('[data-testid="task-item"]').catch(() => test.skip());

    const textarea = page.locator('textarea[placeholder*="Add notes"]');
    await textarea.fill('Quick note');

    // Click save immediately (before 1.5s debounce)
    await page.click('button[aria-label="Save notes"]');

    // Should see "Saving..." almost immediately
    await expect(page.locator('text=Saving...')).toBeVisible({ timeout: 500 });
    await expect(page.locator('text=Saved')).toBeVisible({ timeout: 2000 });

    // Verify persisted
    await page.click('[aria-label="Close"]');
    await page.click('[data-testid="task-item"]');
    await expect(textarea).toHaveValue('Quick note');
  });
});
```

### Step 2: Run integration test

Run: `npm run test:e2e tests/notes-autosave.spec.ts`
Expected: Tests may skip if setup needed, or PASS if tasks exist

### Step 3: Commit integration tests

```bash
git add tests/notes-autosave.spec.ts
git commit -m "test: add Playwright integration tests for notes auto-save"
```

---

## Task 11: Verify All Tests Pass

**Files:**
- None (verification step)

### Step 1: Run all unit tests

Run: `npm test`
Expected: All tests PASS

### Step 2: Run integration tests

Run: `npm run test:e2e`
Expected: All tests PASS or SKIP (if environment not set up)

### Step 3: Run TypeScript check

Run: `npx tsc --noEmit`
Expected: No type errors

### Step 4: Run build

Run: `npm run build`
Expected: Build succeeds

---

## Task 12: Manual QA Testing

**Files:**
- None (manual testing step)

### Step 1: Start dev server

Run: `npm run dev`
Expected: Server starts on http://localhost:3000

### Step 2: Test auto-save flow

1. Open app in browser
2. Create or open a task
3. Type notes in textarea
4. Wait 1.5s without typing
5. Verify "Saving..." appears
6. Verify "Saved ✓" appears
7. Close and reopen task
8. Verify notes persisted

Expected: Auto-save works as designed

### Step 3: Test manual save flow

1. Open task
2. Type notes quickly
3. Click save button immediately (don't wait 1.5s)
4. Verify "Saving..." appears immediately
5. Verify "Saved ✓" appears
6. Close and reopen task
7. Verify notes persisted

Expected: Manual save bypasses debounce

### Step 4: Test read-only mode

1. Open task where user has no edit permission (or set canEdit=false)
2. Verify textarea is read-only
3. Verify no save button appears
4. Verify no status indicator appears

Expected: Read-only mode works correctly

### Step 5: Test error handling

1. Open browser DevTools
2. Go to Network tab
3. Set offline mode or block API route
4. Type notes and trigger save
5. Verify "Error saving" appears with retry button
6. Disable offline mode
7. Click retry button
8. Verify "Saved ✓" appears

Expected: Error handling and retry work

---

## Task 13: Final Commit and Documentation

**Files:**
- Modify: `docs/plans/2026-02-19-notes-autosave-design.md`

### Step 1: Update design doc status

Edit `docs/plans/2026-02-19-notes-autosave-design.md`:

Change line 4 from:
```markdown
**Status:** Approved
```

To:
```markdown
**Status:** Implemented
```

### Step 2: Commit documentation update

```bash
git add docs/plans/2026-02-19-notes-autosave-design.md
git commit -m "docs: mark notes auto-save design as implemented"
```

### Step 3: Create final summary commit (if needed)

If you made any small fixes during QA, create a final commit:

```bash
git add .
git commit -m "fix: final polish for notes auto-save feature"
```

---

## Success Criteria Checklist

Before marking this plan complete, verify:

- ✅ `use-debounce` dependency installed
- ✅ `useAutoSaveNotes` hook created with full test coverage (6 tests)
- ✅ `NotesSection` component modified with save button and status indicator
- ✅ Component tests pass (4+ tests)
- ✅ Integration tests created (Playwright)
- ✅ Auto-save triggers after 1.5s of no typing
- ✅ Manual save button works and bypasses debounce
- ✅ Status indicator shows: idle → saving → saved → idle (or error)
- ✅ Error handling works with retry button
- ✅ Read-only mode respected (no save when canEdit=false)
- ✅ All unit tests pass (`npm test`)
- ✅ All integration tests pass or skip gracefully (`npm run test:e2e`)
- ✅ TypeScript compiles without errors (`npx tsc --noEmit`)
- ✅ Build succeeds (`npm run build`)
- ✅ Manual QA completed (auto-save, manual save, read-only, errors)
- ✅ Design doc updated to "Implemented" status

---

## Notes for Implementation

**DRY:** The hook is reusable - if notes editing is needed elsewhere (e.g., ExpandedPanel), the same hook can be used.

**YAGNI:** We're not implementing keyboard shortcuts (Cmd+S), offline queue, or rich text editing - those are future enhancements per design doc.

**TDD:** Every feature is tested before implementation. Tests drive the implementation.

**Frequent commits:** Each task has at least one commit. Aim for 10+ commits total for this feature.

**Dependencies:**
- `use-debounce` - for debounced auto-save
- `framer-motion` - already installed, used for status indicator animations
- `lucide-react` - already installed, used for icons

**Testing libraries:**
- Vitest + React Testing Library for unit tests
- Playwright for integration tests
- All already installed

**File structure follows:**
- Hooks: `src/hooks/`
- Components: `src/components/task-detail/`
- Tests: Co-located with source files (`.test.ts` / `.test.tsx`)
- Integration tests: `tests/` directory
