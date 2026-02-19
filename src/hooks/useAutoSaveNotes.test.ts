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

  it('sets saveStatus correctly through lifecycle', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
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
    await act(async () => {
      result.current.handleChange('new text');
      await result.current.handleManualSave();
    });

    // Should be saved
    expect(result.current.saveStatus).toBe('saved');

    // Advance 2s to auto-clear
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.saveStatus).toBe('idle');
  });

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

    await act(async () => {
      result.current.handleChange('new text');
      await result.current.handleManualSave();
    });

    // Should have error status
    expect(result.current.saveStatus).toBe('error');

    // Value should be preserved (not lost)
    expect(result.current.value).toBe('new text');
  });

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
});
