'use client';

import { motion } from 'framer-motion';
import { Users, VolumeX, Volume2, Plus } from 'lucide-react';
import { ChatConversation, ChatMessage, PresenceStatus } from '@/types/todo';

// Presence status config
const PRESENCE_CONFIG: Record<PresenceStatus, { color: string; label: string }> = {
  online: { color: 'var(--success-vivid)', label: 'Online' },
  away: { color: 'var(--warning)', label: 'Away' },
  dnd: { color: 'var(--danger)', label: 'Do Not Disturb' },
  offline: { color: 'var(--text-muted)', label: 'Offline' },
};

interface ConversationListItem {
  conv: ChatConversation;
  lastMessage: ChatMessage | null;
  lastActivity: number;
}

interface ChatConversationListProps {
  conversations: ConversationListItem[];
  currentUserName: string;
  unreadCounts: Record<string, number>;
  mutedConversations: Set<string>;
  userPresence: Record<string, PresenceStatus>;
  onSelectConversation: (conv: ChatConversation) => void;
  onToggleMute: (convKey: string) => void;
  getUserColor: (userName: string) => string;
  formatRelativeTime: (dateString: string) => string;
  getInitials: (name: string) => string;
}

export function ChatConversationList({
  conversations,
  currentUserName,
  unreadCounts,
  mutedConversations,
  userPresence,
  onSelectConversation,
  onToggleMute,
  getUserColor,
  formatRelativeTime,
  getInitials,
}: ChatConversationListProps) {
  const hasOtherUsers = conversations.some(c => c.conv.type === 'dm');

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map(({ conv, lastMessage }, index) => {
        const isTeam = conv.type === 'team';
        const userName = conv.type === 'dm' ? conv.userName : '';
        const userColor = isTeam ? 'var(--accent)' : getUserColor(userName);
        const convKey = isTeam ? 'team' : userName;
        const unreadCount = unreadCounts[convKey] || 0;
        const isMuted = mutedConversations.has(convKey);
        const presence = isTeam ? null : userPresence[userName];

        return (
          <motion.div
            key={convKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={`px-4 py-4 flex items-center gap-4 transition-all duration-200 border-b border-[var(--chat-surface)] hover:bg-[var(--chat-surface)] ${unreadCount > 0 && !isMuted ? 'bg-[var(--accent)]/5' : ''}`}
          >
            <button
              onClick={() => onSelectConversation(conv)}
              className="flex-1 flex items-center gap-4"
            >
              <div className="relative flex-shrink-0">
                <motion.div
                  className="w-12 h-12 rounded-[var(--radius-xl)] flex items-center justify-center text-white font-bold shadow-lg ring-1 ring-white/10"
                  style={{ backgroundColor: userColor }}
                  whileHover={{ scale: 1.05 }}
                >
                  {isTeam ? <Users className="w-5 h-5" /> : getInitials(userName)}
                </motion.div>
                {!isTeam && (
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[var(--surface-dark)]"
                    style={{ backgroundColor: PRESENCE_CONFIG[presence || 'offline'].color }}
                    title={PRESENCE_CONFIG[presence || 'offline'].label}
                  />
                )}
                {unreadCount > 0 && !isMuted && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1.5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white shadow-lg border border-[var(--surface-dark)]"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </motion.span>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-semibold text-white truncate ${unreadCount > 0 && !isMuted ? 'text-[var(--accent)]' : ''}`}>
                    {isTeam ? 'Team Chat' : userName}
                  </span>
                  {lastMessage && (
                    <span className={`text-xs flex-shrink-0 ${unreadCount > 0 && !isMuted ? 'text-[var(--accent)] font-medium' : 'text-[var(--chat-text-secondary)]'}`}>
                      {formatRelativeTime(lastMessage.created_at)}
                    </span>
                  )}
                </div>
                <div className={`text-sm truncate mt-1 ${unreadCount > 0 && !isMuted ? 'text-white/80 font-medium' : 'text-[var(--chat-text-secondary)]'}`}>
                  {lastMessage ? (
                    <>
                      {lastMessage.created_by === currentUserName ? 'You: ' : `${lastMessage.created_by}: `}
                      {lastMessage.text.slice(0, 35)}{lastMessage.text.length > 35 ? '...' : ''}
                    </>
                  ) : (
                    <span className="italic text-[var(--chat-text-muted)]">No messages yet</span>
                  )}
                </div>
              </div>
            </button>
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onToggleMute(convKey);
              }}
              className={`p-2 rounded-[var(--radius-xl)] transition-all duration-200 ${isMuted ? 'bg-[var(--chat-surface-hover)] text-[var(--chat-text-secondary)]' : 'hover:bg-[var(--chat-surface-hover)] text-[var(--chat-text-muted)] hover:text-white/60'}`}
              title={isMuted ? 'Unmute' : 'Mute'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </motion.button>
          </motion.div>
        );
      })}

      {!hasOtherUsers && (
        <div className="px-6 py-12 text-center">
          <motion.div
            className="w-16 h-16 mx-auto mb-4 rounded-[var(--radius-2xl)] bg-[var(--chat-surface)] border border-[var(--chat-border)] flex items-center justify-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Users className="w-8 h-8 text-[var(--accent)]/50" />
          </motion.div>
          <p className="font-semibold text-white/90 text-lg">No teammates yet</p>
          <p className="text-sm mt-2 text-[var(--chat-text-secondary)] max-w-[200px] mx-auto">
            Invite your team members to collaborate and chat in real-time
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-5 px-5 py-2.5 rounded-[var(--radius-xl)] bg-[var(--accent)] text-white text-sm font-medium shadow-lg shadow-[var(--accent)]/20"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Invite Team
            </span>
          </motion.button>
        </div>
      )}
    </div>
  );
}
