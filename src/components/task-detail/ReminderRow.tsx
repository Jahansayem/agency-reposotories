'use client';

import ReminderPicker from '../ReminderPicker';

interface ReminderRowProps {
  reminderAt?: string;
  dueDate?: string;
  completed: boolean;
  onSetReminder: (time: string | null) => void;
}

export default function ReminderRow({
  reminderAt,
  dueDate,
  completed,
  onSetReminder,
}: ReminderRowProps) {
  if (completed) {
    return null;
  }

  return (
    <div className="flex items-center py-2.5 border-b border-[var(--border-subtle)]">
      <span className="text-sm text-[var(--text-muted)] w-28 flex-shrink-0">Reminder</span>
      <div className="flex-1">
        <ReminderPicker
          value={reminderAt}
          dueDate={dueDate}
          onChange={(time) => onSetReminder(time)}
          compact
        />
      </div>
    </div>
  );
}
