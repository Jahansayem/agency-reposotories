'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, X, Minimize2, Maximize2, Users,
  ChevronLeft, Wifi, WifiOff, Bell, BellOff,
  Search, Moon, Pin
} from 'lucide-react';
import { ChatConversation, ChatMessage, PresenceStatus } from '@/types/todo';

// Presence status config
const PRESENCE_CONFIG: Record<PresenceStatus, { color: string; label: string }> = {
  online: { color: 'var(--success-vivid)', label: 'Online' },
  away: { color: 'var(--warning)', label: 'Away' },
  dnd: { color: 'var(--danger)', label: 'Do Not Disturb' },
  offline: { color: 'var(--text-muted)', label: 'Offline' },
};

interface ChatPanelHeaderProps {
  showConversationList: boolean;
  conversation: ChatConversation | null;
  connected: boolean;
  isMinimized: boolean;
  showSearch: boolean;
  showPinnedMessages: boolean;
  pinnedMessages: ChatMessage[];
  notificationsEnabled: boolean;
  isDndMode: boolean;
  searchInput: string;
  filteredMessagesCount: number;
  userPresence: Record<string, PresenceStatus>;
  onBack: () => void;
  onToggleSearch: () => void;
  onTogglePinnedMessages: () => void;
  onToggleDndMode: () => void;
  onToggleNotifications: () => void;
  onToggleMinimize: () => void;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  getUserColor: (userName: string) => string;
  getInitials: (name: string) => string;
  getConversationTitle: () => string;
}

export function ChatPanelHeader({
  showConversationList,
  conversation,
  connected,
  isMinimized,
  showSearch,
  showPinnedMessages,
  pinnedMessages,
  notificationsEnabled,
  isDndMode,
  searchInput,
  filteredMessagesCount,
  userPresence,
  onBack,
  onToggleSearch,
  onTogglePinnedMessages,
  onToggleDndMode,
  onToggleNotifications,
  onToggleMinimize,
  onClose,
  onSearchChange,
  onClearSearch,
  getUserColor,
  getInitials,
  getConversationTitle,
}: ChatPanelHeaderProps) {
  return (
    <>
      {/* Header */}
      <div className="relative flex items-center justify-between px-5 py-4 border-b border-[var(--chat-border)]">
        <div className="flex items-center gap-3 relative z-10">
          {showConversationList ? (
            <>
              <div className="w-9 h-9 rounded-[var(--radius-xl)] bg-[var(--accent)] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-white text-lg tracking-tight">Messages</span>
            </>
          ) : (
            <>
              <motion.button
                onClick={onBack}
                className="p-2 hover:bg-[var(--chat-surface-hover)] rounded-[var(--radius-xl)] transition-all duration-200 -ml-1"
                aria-label="Back to conversations"
                whileHover={{ x: -2 }}
              >
                <ChevronLeft className="w-5 h-5 text-white/70" />
              </motion.button>
              {conversation?.type === 'team' ? (
                <div className="w-9 h-9 rounded-[var(--radius-xl)] bg-[#2563EB] flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
              ) : conversation?.type === 'dm' ? (
                <div className="relative">
                  <div
                    className="w-9 h-9 rounded-[var(--radius-xl)] flex items-center justify-center text-xs font-bold text-white shadow-lg ring-2 ring-white/10"
                    style={{ backgroundColor: getUserColor(conversation.userName) }}
                  >
                    {getInitials(conversation.userName)}
                  </div>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--surface-dark)]"
                    style={{ backgroundColor: PRESENCE_CONFIG[userPresence[conversation.userName] || 'offline'].color }}
                    title={PRESENCE_CONFIG[userPresence[conversation.userName] || 'offline'].label}
                  />
                </div>
              ) : (
                <MessageSquare className="w-5 h-5 text-[var(--accent)]" />
              )}
              <span className="font-bold text-white text-lg tracking-tight">{getConversationTitle()}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 relative z-10">
          {!showConversationList && (
            <motion.button
              onClick={onToggleSearch}
              className={`p-2 rounded-[var(--radius-xl)] transition-all duration-200 ${
                showSearch ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'hover:bg-[var(--chat-surface-hover)] text-[var(--chat-text-secondary)] hover:text-white'
              }`}
              title="Search messages"
              aria-label="Search messages"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Search className="w-4 h-4" />
            </motion.button>
          )}

          {!showConversationList && pinnedMessages.length > 0 && (
            <motion.button
              onClick={onTogglePinnedMessages}
              className={`p-2 rounded-[var(--radius-xl)] transition-all duration-200 relative ${
                showPinnedMessages ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'hover:bg-[var(--chat-surface-hover)] text-[var(--chat-text-secondary)] hover:text-white'
              }`}
              title="Pinned messages"
              aria-label="Pinned messages"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Pin className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent)] rounded-full text-[9px] flex items-center justify-center text-white font-bold">
                {pinnedMessages.length}
              </span>
            </motion.button>
          )}

          <motion.button
            onClick={onToggleDndMode}
            className={`p-2 rounded-[var(--radius-xl)] transition-all duration-200 ${
              isDndMode ? 'bg-red-500/20 text-red-400' : 'hover:bg-[var(--chat-surface-hover)] text-[var(--chat-text-secondary)] hover:text-white'
            }`}
            title={isDndMode ? 'Do Not Disturb (ON)' : 'Do Not Disturb (OFF)'}
            aria-label={isDndMode ? 'Disable Do Not Disturb' : 'Enable Do Not Disturb'}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Moon className="w-4 h-4" />
          </motion.button>

          <motion.button
            onClick={onToggleNotifications}
            className={`p-2 rounded-[var(--radius-xl)] transition-all duration-200 ${
              notificationsEnabled ? 'bg-green-500/20 text-green-400' : 'hover:bg-[var(--chat-surface-hover)] text-[var(--chat-text-secondary)]'
            }`}
            title={notificationsEnabled ? 'Click to disable notifications' : 'Click to enable notifications'}
            aria-label={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </motion.button>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-xl)] text-xs font-medium ${
              connected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}
            title={connected ? 'Connected' : 'Disconnected'}
            role="status"
            aria-label={connected ? 'Connected' : 'Disconnected'}
          >
            {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          </div>

          <motion.button
            onClick={onToggleMinimize}
            aria-label={isMinimized ? 'Maximize chat' : 'Minimize chat'}
            className="p-2 hover:bg-[var(--chat-surface-hover)] rounded-[var(--radius-xl)] transition-all duration-200 text-[var(--chat-text-secondary)] hover:text-white"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </motion.button>
          <motion.button
            onClick={onClose}
            aria-label="Close chat"
            className="p-2 hover:bg-[var(--chat-surface-hover)] rounded-[var(--radius-xl)] transition-all duration-200 text-[var(--chat-text-secondary)] hover:text-white"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && !showConversationList && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-[var(--chat-surface-hover)] bg-[var(--chat-surface)]"
          >
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--chat-text-muted)]" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full pl-11 pr-10 py-3 rounded-[var(--radius-xl)] border border-[var(--chat-border)] bg-[var(--chat-surface)] text-white placeholder:text-[var(--chat-text-muted)] text-sm focus:outline-none focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 transition-all duration-200"
                  autoFocus
                />
                {searchInput && (
                  <button
                    onClick={onClearSearch}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--chat-border)] rounded-[var(--radius-lg)] transition-colors"
                  >
                    <X className="w-4 h-4 text-[var(--chat-text-secondary)]" />
                  </button>
                )}
              </div>
              {searchInput && (
                <div className="mt-2 text-xs text-[var(--chat-text-secondary)] px-1">
                  {filteredMessagesCount} result{filteredMessagesCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned messages panel */}
      <AnimatePresence>
        {showPinnedMessages && !showConversationList && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-[var(--chat-surface-hover)] bg-[var(--accent)]/5 max-h-36 overflow-y-auto"
          >
            <div className="p-3">
              <div className="flex items-center gap-2 text-xs text-[var(--accent)]/70 mb-2 font-medium">
                <Pin className="w-3.5 h-3.5" />
                <span>Pinned Messages</span>
              </div>
              {pinnedMessages.map(msg => (
                <div
                  key={msg.id}
                  className="text-sm p-3 rounded-[var(--radius-xl)] bg-[var(--chat-surface)] border border-[var(--chat-surface-hover)] mb-2 cursor-pointer hover:bg-[var(--chat-surface-hover)] transition-colors"
                  onClick={onTogglePinnedMessages}
                >
                  <span className="font-medium text-white">{msg.created_by}: </span>
                  <span className="text-white/60">
                    {msg.text.slice(0, 50)}{msg.text.length > 50 ? '...' : ''}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
