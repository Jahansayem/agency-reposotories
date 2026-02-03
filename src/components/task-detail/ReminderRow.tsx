'use client';

import ReminderPicker from '../ReminderPicker';

interface ReminderRowProps {
  reminderAt?: string;
  dueDate?: string;
  completed: boolean;
  onSetReminder: (time: string | null) => void;
  /** Whether user can edit the task (has permission or owns the task) */
  canEdit?: boolean;
}

export default function ReminderRow({
  reminderAt,
  dueDate,
  completed,
  onSetReminder,
  canEdit = true,
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
        disabled={!canEdit}
      />
    </div>
  );
}
