/**
 * TaskCardStatusStrip
 *
 * Visual status indicator (4-6px left strip) for task state
 * ONLY shows for overdue/due soon - implements "one signal" rule
 */

'use client';

import { RADIUS } from '@/lib/design-tokens';

interface TaskCardStatusStripProps {
  stripColor: string | null;
}

export function TaskCardStatusStrip({ stripColor }: TaskCardStatusStripProps) {
  if (!stripColor) return null;

  return (
    <div
      className={`absolute left-0 top-0 bottom-0 w-1 ${stripColor}`}
      style={{
        borderTopLeftRadius: RADIUS.lg,
        borderBottomLeftRadius: RADIUS.lg,
      }}
      aria-hidden="true"
    />
  );
}
