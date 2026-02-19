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
  const valueRef = useRef(initialValue);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced save function
  const debouncedSave = useDebouncedCallback(
    async () => {
      if (!enabled) return;

      const currentValue = valueRef.current;
      try {
        setSaveStatus('saving');
        onChange(currentValue);
        await onSave();
        setSaveStatus('saved');

        // Auto-clear after 2s
        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
        statusTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
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
      valueRef.current = newValue;
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

    const currentValue = valueRef.current;
    try {
      setSaveStatus('saving');
      onChange(currentValue);
      await onSave();
      setSaveStatus('saved');

      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save notes:', error);
      setSaveStatus('error');
    }
  }, [enabled, onChange, onSave, debouncedSave]);

  // Cleanup: flush pending save and clear timeout on unmount
  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
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
