'use client';

import type { Todo, WaitingContactType } from '@/types/todo';
import { WaitingStatusBadge } from '../WaitingStatusBadge';

interface WaitingRowProps {
  todo: Todo;
  onMarkWaiting: (contactType: WaitingContactType, followUpHours?: number) => Promise<void>;
  onClearWaiting: () => Promise<void>;
}

export default function WaitingRow({
  todo,
  onMarkWaiting,
  onClearWaiting,
}: WaitingRowProps) {
  if (todo.completed) {
    return null;
  }

  return (
    <div className="flex items-center py-2 gap-3">
      <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] shrink-0">
        Customer Response
      </span>
      <WaitingStatusBadge
        todo={todo}
        onMarkWaiting={onMarkWaiting}
        onClearWaiting={onClearWaiting}
      />
    </div>
  );
}
