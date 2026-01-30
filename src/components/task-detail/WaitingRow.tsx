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
    <div className="flex items-center py-2.5 border-b border-[var(--border-subtle)]">
      <span className="w-28 text-sm text-[var(--text-muted)] shrink-0">
        Customer Response
      </span>
      <div className="flex-1">
        <WaitingStatusBadge
          todo={todo}
          onMarkWaiting={onMarkWaiting}
          onClearWaiting={onClearWaiting}
        />
      </div>
    </div>
  );
}
