'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useAppShell } from './layout/AppShell';
import { ChatPanelSkeleton } from './LoadingSkeletons';
import { AuthUser, ChatConversation } from '@/types/todo';
import { logger } from '@/lib/logger';
import { useAgency } from '@/contexts/AgencyContext';
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
  const { currentAgencyId, isMultiTenancyEnabled } = useAgency();
  const bulkBarVisible = useTodoStore((s) => s.bulkActions.selectedTodos.size > 0);

  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  // Fetch unread message count
  useEffect(() => {
    if (!isSupabaseConfigured() || !currentUser.name) return;

    const fetchUnreadCount = async () => {
      try {
        // Get messages not read by current user
        // We need to fetch recipient and created_by to filter properly
        let query = supabase
          .from('messages')
          .select('id, read_by, recipient, created_by')
          .not('created_by', 'eq', currentUser.name)
          .is('deleted_at', null);

        if (isMultiTenancyEnabled && currentAgencyId) {
          query = query.eq('agency_id', currentAgencyId);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Determine what conversation will be shown when chat opens
        // If we have a persisted conversation, don't count those messages as unread
        const persistedConversationType = lastConversation?.type;
        const persistedDmUser = persistedConversationType === 'dm' ? lastConversation?.userName : null;

        // Get list of valid user names (users we can actually show conversations for)
        const validUserNames = new Set(users.map(u => u.name));

        // Count messages where:
        // 1. Current user is not in read_by array
        // 2. Message is either a team message (no recipient) OR a DM to the current user
        // 3. Message is NOT from the persisted conversation (which will be shown immediately)
        // 4. For DMs, the sender must be a valid user (so we can show their conversation)
        const unread = data?.filter((msg) => {
          // Skip if already read
          if (msg.read_by?.includes(currentUser.name)) return false;

          // Team message (no recipient)
          if (!msg.recipient) {
            // Skip if team chat is the persisted conversation
            if (persistedConversationType === 'team') return false;
            return true;
          }

          // DM to current user
          if (msg.recipient === currentUser.name) {
            // Skip if sender is not in the users list (e.g., "System" messages)
            // These can't be viewed in the UI so shouldn't show as unread
            if (!validUserNames.has(msg.created_by)) return false;
            // Skip if this DM is from the persisted conversation user
            if (persistedDmUser && msg.created_by === persistedDmUser) return false;
            return true;
          }

          // DM between other users - don't count it
          return false;
        }).length || 0;

        setUnreadCount(unread);
      } catch (err) {
        logger.error('Error fetching unread count', err as Error, { component: 'FloatingChatButton', action: 'fetchUnreadCount', userName: currentUser.name });
      }
    };

    fetchUnreadCount();

    const channelName = isMultiTenancyEnabled && currentAgencyId
      ? `floating-chat-messages-${currentAgencyId}`
      : 'floating-chat-messages';

    const subscriptionConfig: {
      event: '*';
      schema: 'public';
      table: 'messages';
      filter?: string;
    } = {
      event: '*',
      schema: 'public',
      table: 'messages',
    };

    if (isMultiTenancyEnabled && currentAgencyId) {
      subscriptionConfig.filter = `agency_id=eq.${currentAgencyId}`;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        subscriptionConfig,
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.name, lastConversation, currentAgencyId, isMultiTenancyEnabled, users]);

  // Clear unread count when opening chat
  useEffect(() => {
    if (isOpen) {
      // Delay to allow chat to mark messages as read
      const timer = setTimeout(() => {
        setUnreadCount(0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
      </motion.button>

      {/* Chat Popup - Google Chat style */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Light backdrop - click to close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[200]"
              onClick={() => setIsOpen(false)}
            />

            {/* Chat Popup Window - z-index MUST be above backdrop */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className={`
                fixed ${bulkBarVisible ? 'bottom-32' : 'bottom-24'} right-6 z-[201]
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
          </>
        )}
      </AnimatePresence>
    </>
  );
}
