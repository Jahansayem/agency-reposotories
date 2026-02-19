'use client';

import { useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { MessageCircle, ArrowLeft } from 'lucide-react';
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

/**
 * ChatView - Dedicated full-page chat experience
 *
 * Replaces the floating chat widget with a proper view
 * accessible via the navigation sidebar "Messages" item.
 *
 * Features:
 * - Full-width chat interface
 * - Team chat and DMs
 * - Task linking and mentions
 * - Accessible via navigation
 */

interface ChatViewProps {
  currentUser: AuthUser;
  users: { name: string; color: string }[];
  onBack?: () => void;
  onTaskLinkClick?: (todoId: string) => void;
}

export default function ChatView({
  currentUser,
  users,
  onBack,
  onTaskLinkClick,
}: ChatViewProps) {
  const todos = useTodoStore((state) => state.todos);
  const headerRef = useRef<HTMLElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Create a map of todos for task linking
  const todosMap = useMemo(() => new Map(todos.map(t => [t.id, t])), [todos]);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    }
  }, [onBack]);

  const handleTaskLinkClick = (taskId: string) => {
    if (onTaskLinkClick) {
      onTaskLinkClick(taskId);
    } else {
      // Default behavior: navigate to task (scroll into view)
      const taskElement = document.getElementById(`todo-${taskId}`);
      if (taskElement) {
        taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add animated highlight class
        taskElement.classList.add('notification-highlight');
        // Remove the class after animation completes
        setTimeout(() => {
          taskElement.classList.remove('notification-highlight');
        }, 3000);
      }
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-[var(--background)]" role="region" aria-label="Chat">
      {/* Header */}
      <header
        ref={headerRef}
        className={`
          flex items-center gap-4 px-4 sm:px-6 h-16 border-b flex-shrink-0
          ${'bg-[var(--surface)] border-[var(--border)]'}
        `}
      >
        {/* Back button - for mobile or when onBack is provided */}
        {onBack && (
          <button
            onClick={handleBack}
            className={`
              p-2 rounded-[var(--radius-lg)] transition-colors md:hidden
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2
              ${'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]'}
            `}
            aria-label="Go back to previous view"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
        )}

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-sky)] flex items-center justify-center shadow-md" aria-hidden="true">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`font-semibold text-lg ${'text-[var(--foreground)]'}`}>
              Messages
            </h1>
            <p className={`text-xs ${'text-[var(--text-muted)]'}`}>
              Team chat and direct messages
            </p>
          </div>
        </div>
      </header>

      {/* Screen reader announcement region for new messages */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="sr-only"
        role="log"
        aria-label="New message notifications"
      />

      {/* Chat Content - Full height */}
      <motion.main
        ref={mainContentRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex-1 overflow-hidden"
        aria-label="Chat messages and conversations"
      >
        <ChatPanel
          currentUser={currentUser}
          users={users}
          todosMap={todosMap}
          docked={true}
          onTaskLinkClick={handleTaskLinkClick}
        />
      </motion.main>
    </div>
  );
}
