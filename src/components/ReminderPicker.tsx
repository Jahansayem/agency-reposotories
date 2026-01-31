'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellOff, Clock, X, Check } from 'lucide-react';
import { format, addMinutes, addHours, addDays, startOfDay, setHours, setMinutes } from 'date-fns';
import type { ReminderPreset, ReminderType } from '@/types/todo';

interface ReminderPickerProps {
  value?: string; // ISO timestamp of current reminder
  dueDate?: string; // ISO timestamp of task due date
  onChange: (reminderTime: string | null, reminderType?: ReminderType) => void;
  compact?: boolean; // Compact mode for inline display
  className?: string;
}

interface QuickOption {
  id: ReminderPreset;
  label: string;
  icon: string;
  getTime: (dueDate?: Date) => Date | null;
}

// Options relative to the due date (only shown when due date exists)
const RELATIVE_OPTIONS: QuickOption[] = [
  {
    id: '5_min_before',
    label: '5 min before',
    icon: '⚡',
    getTime: (dueDate) => (dueDate ? addMinutes(dueDate, -5) : null),
  },
  {
    id: '15_min_before',
    label: '15 min before',
    icon: '🔔',
    getTime: (dueDate) => (dueDate ? addMinutes(dueDate, -15) : null),
  },
  {
    id: '30_min_before',
    label: '30 min before',
    icon: '⏱️',
    getTime: (dueDate) => (dueDate ? addMinutes(dueDate, -30) : null),
  },
  {
    id: '1_hour_before',
    label: '1 hour before',
    icon: '🕐',
    getTime: (dueDate) => (dueDate ? addHours(dueDate, -1) : null),
  },
  {
    id: '1_day_before',
    label: '1 day before',
    icon: '📅',
    getTime: (dueDate) => (dueDate ? addDays(dueDate, -1) : null),
  },
  {
    id: 'morning_of',
    label: '9 AM day of',
    icon: '🌅',
    getTime: (dueDate) => {
      if (!dueDate) return null;
      return setMinutes(setHours(startOfDay(dueDate), 9), 0);
    },
  },
];

// Absolute-time options (always available, regardless of due date)
const ABSOLUTE_OPTIONS: QuickOption[] = [
  {
    id: 'at_time',
    label: 'In 30 minutes',
    icon: '⏱️',
    getTime: () => addMinutes(new Date(), 30),
  },
  {
    id: 'at_time',
    label: 'In 1 hour',
    icon: '🕐',
    getTime: () => addHours(new Date(), 1),
  },
  {
    id: 'at_time',
    label: 'Tomorrow 9 AM',
    icon: '🌅',
    getTime: () => setMinutes(setHours(addDays(startOfDay(new Date()), 1), 9), 0),
  },
];

const QUICK_OPTIONS: QuickOption[] = RELATIVE_OPTIONS;

export default function ReminderPicker({
  value,
  dueDate,
  onChange,
  compact = false,
  className = '',
}: ReminderPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('09:00');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  const parsedDueDate = useMemo(() => {
    if (!dueDate) return undefined;
    const date = new Date(dueDate);
    return isNaN(date.getTime()) ? undefined : date;
  }, [dueDate]);

  const parsedValue = useMemo(() => {
    if (!value) return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }, [value]);

  const formatReminderDisplay = useCallback((date: Date): string => {
    const now = new Date();
    const today = startOfDay(now);
    const reminderDay = startOfDay(date);
    const diffDays = Math.round(
      (reminderDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (diffDays === 1) {
      return `Tomorrow at ${format(date, 'h:mm a')}`;
    } else if (diffDays < 7) {
      return format(date, "EEEE 'at' h:mm a");
    } else {
      return format(date, "MMM d 'at' h:mm a");
    }
  }, []);

  const handleQuickOption = useCallback(
    (option: QuickOption) => {
      const time = option.getTime(parsedDueDate);
      if (time && time > new Date()) {
        onChange(time.toISOString(), 'both');
        setIsOpen(false);
        setShowCustom(false);
      }
    },
    [parsedDueDate, onChange]
  );

  const handleCustomSubmit = useCallback(() => {
    if (!customDate || !customTime) return;

    const [hours, minutes] = customTime.split(':').map(Number);
    const date = new Date(customDate);
    date.setHours(hours, minutes, 0, 0);

    if (date > new Date()) {
      onChange(date.toISOString(), 'both');
      setIsOpen(false);
      setShowCustom(false);
      setCustomDate('');
      setCustomTime('09:00');
    }
  }, [customDate, customTime, onChange]);

  const handleClear = useCallback(() => {
    onChange(null);
    setIsOpen(false);
    setShowCustom(false);
  }, [onChange]);

  // Filter options to only show those that result in future times
  const availableOptions = useMemo(() => {
    const now = new Date();
    // Use relative options when due date exists, absolute options otherwise
    const options = parsedDueDate ? RELATIVE_OPTIONS : ABSOLUTE_OPTIONS;
    return options.filter((option) => {
      const time = option.getTime(parsedDueDate);
      return time && time > now;
    });
  }, [parsedDueDate]);

  // Calculate position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const width = 256; // w-64
      let left = rect.left;
      let top = rect.bottom + 8;

      // Adjust if goes off screen
      if (left + width > window.innerWidth) {
        left = window.innerWidth - width - 16;
      }
      if (top + 300 > window.innerHeight) { // Approximate height
        top = rect.top - 300 - 8;
      }

      setDropdownPosition({ top, left });
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (buttonRef.current && buttonRef.current.contains(e.target as Node)) return;
      const dropdown = document.getElementById('reminder-dropdown');
      if (dropdown && !dropdown.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  if (compact) {
    // Compact mode: pill button that matches other options
    return (
      <>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all hover:shadow-sm ${
            parsedValue
              ? 'border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
              : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-hover)] text-[var(--text-muted)]'
          }`}
        >
          <Bell className={`w-3.5 h-3.5 flex-shrink-0 ${parsedValue ? 'text-amber-500' : 'text-[var(--text-muted)]'}`} />
          {parsedValue ? (
            <span className="text-xs font-medium truncate max-w-[100px] text-amber-600 dark:text-amber-400">
              {formatReminderDisplay(parsedValue)}
            </span>
          ) : (
            <span className="text-xs font-medium text-[var(--text-muted)]">Reminder</span>
          )}
        </button>

        {isOpen && dropdownPosition && typeof document !== 'undefined' && createPortal(
          <div
            id="reminder-dropdown"
            className="fixed z-[9999] w-64 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] overflow-hidden"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
          >
              <div className="p-2 space-y-1">
                {/* Quick options */}
                {availableOptions.length > 0 ? (
                  availableOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleQuickOption(option)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-lg)] text-left hover:bg-[var(--surface-2)] transition-colors"
                    >
                      <span className="text-base">{option.icon}</span>
                      <span className="text-sm text-[var(--foreground)]">
                        {option.label}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-[var(--text-muted)]">
                    All preset options are in the past
                  </p>
                )}

                {/* Divider */}
                <div className="border-t border-[var(--border)] my-1" />

                {/* Custom option */}
                <button
                  type="button"
                  onClick={() => setShowCustom(!showCustom)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-lg)] text-left hover:bg-[var(--surface-2)] transition-colors"
                >
                  <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--foreground)]">
                    Custom time
                  </span>
                </button>

                {/* Custom inputs */}
                {showCustom && (
                  <div className="px-3 py-2 space-y-2">
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full px-3 py-2 text-sm rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:border-[var(--accent)]"
                    />
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      type="button"
                      onClick={handleCustomSubmit}
                      disabled={!customDate || !customTime}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-lg)] bg-[var(--accent)] text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="w-4 h-4" />
                      Set Reminder
                    </button>
                  </div>
                )}

                {/* Clear option (if reminder is set) */}
                {parsedValue && (
                  <>
                    <div className="border-t border-[var(--border)] my-1" />
                    <button
                      type="button"
                      onClick={handleClear}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-lg)] text-left hover:bg-[var(--danger-light)] transition-colors text-[var(--danger)]"
                    >
                      <BellOff className="w-4 h-4" />
                      <span className="text-sm">Remove reminder</span>
                    </button>
                  </>
                )}
              </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  // Full mode: expanded view with all options visible
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-sm font-medium text-[var(--foreground)]">
            Reminder
          </span>
        </div>
        {parsedValue && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
            title="Remove reminder"
            aria-label="Remove reminder"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Current reminder display */}
      {parsedValue && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-lg)] bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30">
          <Bell className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
            {formatReminderDisplay(parsedValue)}
          </span>
        </div>
      )}

      {/* Quick options grid */}
      <div className="grid grid-cols-2 gap-2">
        {(parsedDueDate ? RELATIVE_OPTIONS : ABSOLUTE_OPTIONS).map((option) => {
          const time = option.getTime(parsedDueDate);
          const isAvailable = time && time > new Date();
          const isSelected =
            parsedValue && time && Math.abs(parsedValue.getTime() - time.getTime()) < 60000;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => isAvailable && handleQuickOption(option)}
              disabled={!isAvailable}
              className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-lg)] border text-sm transition-colors ${
                isSelected
                  ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : isAvailable
                    ? 'border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-2)]'
                    : 'border-[var(--border)] opacity-50 cursor-not-allowed'
              }`}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      {/* Custom time picker */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
          min={format(new Date(), 'yyyy-MM-dd')}
          placeholder="Custom date"
          className="flex-1 px-3 py-2 text-sm rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:border-[var(--accent)]"
        />
        <input
          type="time"
          value={customTime}
          onChange={(e) => setCustomTime(e.target.value)}
          className="w-24 px-3 py-2 text-sm rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:border-[var(--accent)]"
        />
        <button
          type="button"
          onClick={handleCustomSubmit}
          disabled={!customDate || !customTime}
          className="p-2 rounded-[var(--radius-lg)] bg-[var(--accent)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          title="Set custom reminder"
          aria-label="Set custom reminder"
        >
          <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}