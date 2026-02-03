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
    <div className="flex items-center py-2 gap-3">
      <span className="text-label text-[var(--text-muted)]">Reminder</span>
      <ReminderPicker
        value={reminderAt}
        dueDate={dueDate}
        onChange={(time) => onSetReminder(time)}
        compact
      />
    </div>
  );
}
