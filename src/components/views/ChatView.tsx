'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AuthUser, Todo } from '@/types/todo';
import { useTodoStore } from '@/store/todoStore';
import { SkeletonChatPanel } from '../SkeletonLoader';

// Lazy load ChatPanel (1185 lines) - only load when ChatView is opened
const ChatPanel = dynamic(() => import('../ChatPanel'), {
  ssr: false,
  loading: () => (
    <div className="p-4">
      <SkeletonChatPanel />
    </div>
  ),
});

interface ChatViewProps {
  currentUser: AuthUser;
  users: { name: string; color: string }[];
  onBack?: () => void;
  onTaskLinkClick?: (todoId: string) => void;
}

export default function ChatView({
  currentUser,
  users,
  onTaskLinkClick,
}: ChatViewProps) {
  const todos = useTodoStore((state) => state.todos);

  // Create a map of todos for task linking
  const todosMap = useMemo(() => new Map(todos.map(t => [t.id, t])), [todos]);

  const handleTaskLinkClick = (taskId: string) => {
    if (onTaskLinkClick) {
      onTaskLinkClick(taskId);
    } else {
      const taskElement = document.getElementById(`todo-${taskId}`);
      if (taskElement) {
        taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        taskElement.classList.add('notification-highlight');
        setTimeout(() => {
          taskElement.classList.remove('notification-highlight');
        }, 3000);
      }
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-[var(--background)]" role="region" aria-label="Chat">
      {/* Screen reader announcement region for new messages */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="sr-only"
        role="log"
        aria-label="New message notifications"
      />

      {/* Chat Content - Full height, DockedChatPanel provides its own header */}
      <div className="flex-1 overflow-hidden">
        <ChatPanel
          currentUser={currentUser}
          users={users}
          todosMap={todosMap}
          docked={true}
          onTaskLinkClick={handleTaskLinkClick}
        />
      </div>
    </div>
  );
}
