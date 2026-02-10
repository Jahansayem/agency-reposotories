'use client';

import { DragOverlay } from '@dnd-kit/core';
import { Todo } from '@/types/todo';
import { CATEGORY_COLORS } from './CalendarDayCell';

interface CalendarDragOverlayProps {
  activeTodo: Todo | null;
}

export default function CalendarDragOverlay({ activeTodo }: CalendarDragOverlayProps) {
  const category = activeTodo?.category || 'other';

  return (
    <DragOverlay>
      {activeTodo ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--accent)] shadow-xl cursor-grabbing max-w-[200px]">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${CATEGORY_COLORS[category]}`} />
          <span className="text-sm text-[var(--foreground)] truncate font-medium">
            {activeTodo.customer_name || activeTodo.text}
          </span>
        </div>
      ) : null}
    </DragOverlay>
  );
}
