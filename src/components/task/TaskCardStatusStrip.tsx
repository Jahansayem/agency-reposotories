/**
 * TaskCardStatusStrip
 *
 * Visual status indicator (4-6px left strip) for task state
 * ONLY shows for overdue/due soon - implements "one signal" rule
 */

'use client';

interface TaskCardStatusStripProps {
  stripColor: string | null;
}

export function TaskCardStatusStrip({ stripColor }: TaskCardStatusStripProps) {
  if (!stripColor) return null;

  return (
    <div
      className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${stripColor}`}
      aria-hidden="true"
    />
  );
}
