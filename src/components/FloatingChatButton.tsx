'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAppShell } from './layout/AppShell';
import { ChatPanelSkeleton } from './LoadingSkeletons';
import { AuthUser, ChatConversation } from '@/types/todo';
import { useUnreadCount } from '@/contexts/UnreadCountContext';
import { useTodoStore } from '@/store/todoStore';

const CHAT_STATE_KEY = 'floating_chat_last_conversation';

/**
 * Runtime validation for ChatConversation type
 * Ensures parsed JSON matches expected structure before casting
 */
function isValidChatConversation(value: unknown): value is ChatConversation {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;

  // Validate 'team' conversation type
  if (obj.type === 'team') {
    return true;
  }

  // Validate 'dm' conversation type
  if (obj.type === 'dm' && typeof obj.userName === 'string' && obj.userName.length > 0) {
    return true;
  }

  return false;
}

// Lazy load ChatPanel for better performance
const ChatPanel = dynamic(() => import('./ChatPanel'), {
  ssr: false,
  loading: () => <ChatPanelSkeleton />,
});

interface FloatingChatButtonProps {
  currentUser: AuthUser;
  users: Array<{ name: string; color: string }>;
  onTaskLinkClick?: (taskId: string) => void;
}

export default function FloatingChatButton({
  currentUser,
  users,
  onTaskLinkClick,
}: FloatingChatButtonProps) {
  const { activeView } = useAppShell();
  const bulkBarVisible = useTodoStore((s) => s.bulkActions.selectedTodos.size > 0);
  // Use shared unread count context instead of a separate Supabase subscription.
  // This avoids a duplicate real-time channel and keeps the count consistent
  // with NavigationSidebar and EnhancedBottomNav.
  const { unreadCount } = useUnreadCount();

  const [isOpen, setIsOpen] = useState(false);

  // Restore last conversation from localStorage
  const [lastConversation, setLastConversation] = useState<ChatConversation | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(CHAT_STATE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate the structure with runtime type checking
        if (parsed && parsed.conversation && isValidChatConversation(parsed.conversation)) {
          return parsed.conversation;
        }
      }
    } catch {
      // Invalid stored data, ignore
    }
    return null;
  });

  // Callback to persist conversation state
  const handleConversationChange = useCallback((conversation: ChatConversation | null, showList: boolean) => {
    // Only persist if we have a selected conversation (not showing list)
    if (conversation && !showList) {
      setLastConversation(conversation);
      try {
        localStorage.setItem(CHAT_STATE_KEY, JSON.stringify({ conversation }));
      } catch {
        // localStorage might be full or disabled
      }
    }
  }, []);

  // Don't show button when already on chat view
  const shouldShow = activeView !== 'chat';

  if (!shouldShow) return null;

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={`
          fixed right-6 z-[100]
          w-14 h-14 rounded-full
          flex items-center justify-center
          shadow-lg hover:shadow-xl
          transition-[bottom] duration-200
          bg-[var(--accent)] hover:bg-[var(--accent)]/90
          ${bulkBarVisible ? 'bottom-20' : 'bottom-6'}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={`Open chat${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <MessageCircle className="w-6 h-6 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </motion.button>

      {/* Chat Popup - Standard modal pattern: backdrop WRAPS popup.
          Clicking backdrop closes chat. Popup stops propagation so
          clicks inside it (including back button) never reach the backdrop. */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200]"
            onClick={() => setIsOpen(false)}
          >
            {/* Chat Popup Window — stops propagation so no click reaches backdrop */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              onClick={(e) => e.stopPropagation()}
              className={`
                fixed ${bulkBarVisible ? 'bottom-32' : 'bottom-24'} right-6
                w-[360px] sm:w-[400px] h-[500px] max-h-[70vh]
                flex flex-col
                rounded-[var(--radius-xl)] overflow-hidden
                bg-[var(--surface-dark)]
                shadow-2xl
              `}
            >
              {/* DockedChatPanel provides its own header with back, title, search, and close */}
              <div className="flex-1 overflow-hidden">
                <ChatPanel
                  currentUser={currentUser}
                  users={users}
                  docked={true}
                  embedded={true}
                  initialConversation={lastConversation}
                  onConversationChange={handleConversationChange}
                  onClose={() => setIsOpen(false)}
                  onTaskLinkClick={(taskId) => {
                    onTaskLinkClick?.(taskId);
                    setIsOpen(false);
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
