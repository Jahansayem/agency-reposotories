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
      <div className="relative flex items-center justify-between px-5 py-4 border-b border-[var(--chat-border)]" role="banner">
        <div className="flex items-center gap-3 relative z-10">
          {showConversationList ? (
            <>
              <div className="w-9 h-9 rounded-[var(--radius-xl)] bg-[var(--accent)] flex items-center justify-center" aria-hidden="true">
                <MessageSquare className="w-5 h-5 text-[var(--text-inverse)]" strokeWidth={2.5} />
              </div>
              <h2 className="font-bold text-[var(--foreground)] text-lg tracking-tight">Messages</h2>
            </>
          ) : (
            <>
              <motion.button
                onClick={onBack}
                className="p-2 hover:bg-[var(--chat-surface-hover)] rounded-[var(--radius-xl)] transition-all duration-200 -ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                aria-label="Back to conversations"
                whileHover={{ x: -2 }}
              >
                <ChevronLeft className="w-5 h-5 text-[var(--text-muted)]" aria-hidden="true" />
              </motion.button>
              {conversation?.type === 'team' ? (
                <div className="w-9 h-9 rounded-[var(--radius-xl)] bg-[var(--accent)] flex items-center justify-center" aria-hidden="true">
                  <Users className="w-5 h-5 text-[var(--text-inverse)]" />
                </div>
              ) : conversation?.type === 'dm' ? (
                <div className="relative">
                  <div
                    className="w-9 h-9 rounded-[var(--radius-xl)] flex items-center justify-center text-xs font-bold text-[var(--text-inverse)] shadow-lg ring-2 ring-[var(--border-subtle)]"
                    style={{ backgroundColor: getUserColor(conversation.userName) }}
                    aria-hidden="true"
                  >
                    {getInitials(conversation.userName)}
                  </div>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--surface)]"
                    style={{ backgroundColor: PRESENCE_CONFIG[userPresence[conversation.userName] || 'offline'].color }}
                    role="img"
                    aria-label={`${conversation.userName} is ${PRESENCE_CONFIG[userPresence[conversation.userName] || 'offline'].label.toLowerCase()}`}
                  />
                </div>
              ) : (
                <MessageSquare className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
              )}
              <h2 className="font-bold text-[var(--foreground)] text-lg tracking-tight">{getConversationTitle()}</h2>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 relative z-10" role="toolbar" aria-label="Chat actions">
          {!showConversationList && (
            <motion.button
              onClick={onToggleSearch}
              className={`p-2 rounded-[var(--radius-xl)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
                showSearch ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'hover:bg-[var(--chat-surface-hover)] text-[var(--chat-text-secondary)] hover:text-[var(--foreground)]'
              }`}
              aria-label={showSearch ? 'Close search' : 'Search messages'}
              aria-pressed={showSearch}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Search className="w-4 h-4" aria-hidden="true" />
            </motion.button>
          )}

          {!showConversationList && pinnedMessages.length > 0 && (
            <motion.button
              onClick={onTogglePinnedMessages}
              className={`p-2 rounded-[var(--radius-xl)] transition-all duration-200 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
                showPinnedMessages ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'hover:bg-[var(--chat-surface-hover)] text-[var(--chat-text-secondary)] hover:text-[var(--foreground)]'
              }`}
              aria-label={`${showPinnedMessages ? 'Hide' : 'Show'} ${pinnedMessages.length} pinned message${pinnedMessages.length !== 1 ? 's' : ''}`}
              aria-pressed={showPinnedMessages}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Pin className="w-4 h-4" aria-hidden="true" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent)] rounded-full text-badge flex items-center justify-center text-[var(--text-inverse)]" aria-hidden="true">
                {pinnedMessages.length}
              </span>
            </motion.button>
          )}

          <motion.button
            onClick={onToggleDndMode}
            className={`p-2 rounded-[var(--radius-xl)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
              isDndMode ? 'bg-[var(--danger-light)] text-[var(--danger)]' : 'hover:bg-[var(--chat-surface-hover)] text-[var(--chat-text-secondary)] hover:text-[var(--foreground)]'
            }`}
            aria-label={isDndMode ? 'Disable Do Not Disturb' : 'Enable Do Not Disturb'}
            aria-pressed={isDndMode}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Moon className="w-4 h-4" aria-hidden="true" />
          </motion.button>

          <motion.button
            onClick={onToggleNotifications}
            className={`p-2 rounded-[var(--radius-xl)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
              notificationsEnabled ? 'bg-[var(--success-light)] text-[var(--success)]' : 'hover:bg-[var(--chat-surface-hover)] text-[var(--chat-text-secondary)]'
            }`}
            aria-label={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
            aria-pressed={notificationsEnabled}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" aria-hidden="true" /> : <BellOff className="w-4 h-4" aria-hidden="true" />}
          </motion.button>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-xl)] text-xs font-medium ${
              connected ? 'bg-[var(--success-light)] text-[var(--success)]' : 'bg-[var(--danger-light)] text-[var(--danger)]'
            }`}
            role="status"
            aria-live="polite"
            aria-label={connected ? 'Chat connected' : 'Chat disconnected'}
          >
            {connected ? <Wifi className="w-3.5 h-3.5" aria-hidden="true" /> : <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />}
            <span className="sr-only">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>

          <motion.button
            onClick={onToggleMinimize}
            aria-label={isMinimized ? 'Maximize chat' : 'Minimize chat'}
            className="p-2 hover:bg-[var(--chat-surface-hover)] rounded-[var(--radius-xl)] transition-all duration-200 text-[var(--chat-text-secondary)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" aria-hidden="true" /> : <Minimize2 className="w-4 h-4" aria-hidden="true" />}
          </motion.button>
          <motion.button
            onClick={onClose}
            aria-label="Close chat"
            className="p-2 hover:bg-[var(--chat-surface-hover)] rounded-[var(--radius-xl)] transition-all duration-200 text-[var(--chat-text-secondary)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-4 h-4" aria-hidden="true" />
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
            role="search"
            aria-label="Search messages"
          >
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--chat-text-muted)]" aria-hidden="true" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search messages..."
                  aria-label="Search messages"
                  className="w-full pl-11 pr-10 py-3 rounded-[var(--radius-xl)] border border-[var(--chat-border)] bg-[var(--chat-surface)] text-[var(--foreground)] placeholder:text-[var(--chat-text-muted)] text-sm focus:outline-none focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 transition-all duration-200"
                  autoFocus
                />
                {searchInput && (
                  <button
                    onClick={onClearSearch}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--chat-border)] rounded-[var(--radius-lg)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <X className="w-4 h-4 text-[var(--chat-text-secondary)]" aria-hidden="true" />
                  </button>
                )}
              </div>
              {searchInput && (
                <div className="mt-2 text-xs text-[var(--chat-text-secondary)] px-1" role="status" aria-live="polite">
                  {filteredMessagesCount} result{filteredMessagesCount !== 1 ? 's' : ''} found
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
            role="region"
            aria-label="Pinned messages"
          >
            <div className="p-3">
              <div className="flex items-center gap-2 text-xs text-[var(--accent)]/70 mb-2 font-medium">
                <Pin className="w-3.5 h-3.5" aria-hidden="true" />
                <h3>Pinned Messages</h3>
              </div>
              <ul role="list" aria-label="Pinned messages list">
                {pinnedMessages.map(msg => (
                  <li key={msg.id}>
                    <button
                      className="w-full text-left text-sm p-3 rounded-[var(--radius-xl)] bg-[var(--chat-surface)] border border-[var(--chat-surface-hover)] mb-2 cursor-pointer hover:bg-[var(--chat-surface-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      onClick={onTogglePinnedMessages}
                      aria-label={`Pinned message from ${msg.created_by}: ${msg.text.slice(0, 50)}${msg.text.length > 50 ? '...' : ''}`}
                    >
                      <span className="font-medium text-[var(--foreground)]">{msg.created_by}: </span>
                      <span className="text-[var(--chat-text-secondary)]">
                        {msg.text.slice(0, 50)}{msg.text.length > 50 ? '...' : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
