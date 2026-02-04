'use client';

import type { Todo, WaitingContactType } from '@/types/todo';
import { WaitingStatusBadge } from '../WaitingStatusBadge';

interface WaitingRowProps {
  todo: Todo;
  onMarkWaiting: (contactType: WaitingContactType, followUpHours?: number) => Promise<void>;
  onClearWaiting: () => Promise<void>;
  /** Whether user can edit the task (has permission or owns the task) */
  canEdit?: boolean;
}

export default function WaitingRow({
  todo,
  onMarkWaiting,
  onClearWaiting,
  canEdit = true,
}: WaitingRowProps) {
  if (todo.completed) {
    return null;
  }

  return (
    <div className="flex items-center py-2 gap-3">
      <span className="text-label text-[var(--text-muted)] shrink-0">
        Customer Response
      </span>
      <WaitingStatusBadge
        todo={todo}
        onMarkWaiting={onMarkWaiting}
        onClearWaiting={onClearWaiting}
        disabled={!canEdit}
      />
    </div>
  );
}
