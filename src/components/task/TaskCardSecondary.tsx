/**
 * TaskCardSecondary
 *
 * Secondary metadata icons (notes, voicemail, attachments, chat)
 * Implements progressive disclosure - hidden by default, revealed on hover
 */

'use client';

import { Todo } from '@/types/todo';
import { MessageSquare, Paperclip, FileText, Mic } from 'lucide-react';
import { ICON_SIZE } from '@/lib/design-tokens';

interface TaskCardSecondaryProps {
  todo: Todo;
  isVisible: boolean;
  onChatClick?: () => void;
}

export function TaskCardSecondary({ todo, isVisible, onChatClick }: TaskCardSecondaryProps) {
  const indicators = [];

  // Notes indicator
  if (todo.notes && todo.notes.trim()) {
    indicators.push({
      key: 'notes',
      icon: FileText,
      label: 'Has notes',
      color: 'var(--text-muted)',
    });
  }

  // Voicemail/transcription indicator
  if (todo.transcription && todo.transcription.trim()) {
    indicators.push({
      key: 'voicemail',
      icon: Mic,
      label: 'Has voicemail',
      color: 'var(--brand-sky)',
    });
  }

  // Attachments indicator
  if (todo.attachments && todo.attachments.length > 0) {
    indicators.push({
      key: 'attachments',
      icon: Paperclip,
      label: `${todo.attachments.length} attachment${todo.attachments.length > 1 ? 's' : ''}`,
      count: todo.attachments.length,
      color: 'var(--warning)',
    });
  }

  // Chat indicator (if passed handler)
  if (onChatClick) {
    indicators.push({
      key: 'chat',
      icon: MessageSquare,
      label: 'Task chat',
      color: 'var(--accent)',
      onClick: onChatClick,
    });
  }

  if (indicators.length === 0) return null;

  return (
    <div
      className={`flex items-center gap-2 transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden={!isVisible}
    >
      {indicators.map(({ key, icon: Icon, label, count, color, onClick }) => (
        <button
          key={key}
          onClick={onClick}
          className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[var(--surface-2)] transition-colors"
          aria-label={label}
          type="button"
        >
          <Icon
            size={ICON_SIZE.sm}
            style={{ color }}
            strokeWidth={2}
          />
          {count !== undefined && (
            <span
              className="text-xs font-medium"
              style={{ color }}
            >
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
