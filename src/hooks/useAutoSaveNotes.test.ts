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
