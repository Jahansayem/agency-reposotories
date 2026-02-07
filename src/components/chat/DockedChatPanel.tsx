'use client';

import { useCallback, useEffect, RefObject, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Users, ChevronLeft, X, Search, Bell,
  BellOff, Moon, Pin, ChevronDown
} from 'lucide-react';
import { AuthUser, ChatConversation, ChatMessage, Todo, TapbackType } from '@/types/todo';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { ChatMessageList } from './ChatMessageList';
import { ChatInputBar } from './ChatInputBar';
import { ChatConversationList } from './ChatConversationList';
import { useChatMessages } from '@/hooks/useChatMessages';

interface DockedChatPanelProps {
  currentUser: AuthUser;
  users: { name: string; color: string }[];
  conversation: ChatConversation | null;
  showConversationList: boolean;
  connected: boolean;
  filteredMessages: ChatMessage[];
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: (text: string, mentions: string[]) => void;
  onSelectConversation: (conv: ChatConversation) => void;
  onShowConversationList: () => void;
  onTyping: () => void;
  getUserColor: (userName: string) => string;
  getInitials: (name: string) => string;
  getConversationTitle: () => string;
  extractMentions: (text: string, userNames: string[]) => string[];

  // Additional props for feature parity with floating mode
  addReaction?: (messageId: string, reaction: TapbackType) => void;
  editMessage?: (messageId: string, newText: string) => void;
  deleteMessage?: (messageId: string) => void;
  togglePin?: (message: ChatMessage) => void;
  onCreateTask?: (text: string, assignedTo?: string) => void;
  onTaskLinkClick?: (todoId: string) => void;
  todosMap?: Map<string, Todo>;
  markMessagesAsRead?: (messageIds: string[]) => void;

  /** Callback to close the chat panel (used in mobile/tablet overlay modes) */
  onClose?: () => void;
}

export function DockedChatPanel({
  currentUser,
  users,
  conversation,
  showConversationList,
  connected,
  filteredMessages,
  messagesContainerRef,
  inputValue,
  onInputChange,
  onSendMessage,
  onSelectConversation,
  onShowConversationList,
  onTyping,
  getUserColor,
  getInitials,
  getConversationTitle,
  extractMentions,
  addReaction,
  editMessage,
  deleteMessage,
  togglePin,
  onCreateTask,
  onTaskLinkClick,
  todosMap,
  markMessagesAsRead,
  onClose,
}: DockedChatPanelProps) {
  // Responsive breakpoints: mobile (<640px), tablet (640-1024px), desktop (>1024px)
  const isMobile = useIsMobile(640);
  const isTablet = useIsMobile(1024);

  // Detect keyboard visibility on mobile
  const isKeyboardVisible = useKeyboardVisible();

  // Enhanced state for feature parity
  const [showSearch, setShowSearch] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isDndMode, setIsDndMode] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Use chat messages hook for advanced features
  const {
    groupedMessages,
    pinnedMessages,
    loading,
    hasMoreMessages,
    isLoadingMore,
    loadMoreMessages,
  } = useChatMessages({
    currentUser,
    conversation,
    searchQuery,
  });

  // Lock body scroll when mobile overlay is open
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isMobile]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(isBottom);

    if (scrollTop < 100 && hasMoreMessages && !isLoadingMore) {
      loadMoreMessages();
    }
  }, [hasMoreMessages, isLoadingMore, loadMoreMessages, messagesContainerRef]);

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior,
    });
  }, [messagesContainerRef]);

  // Handle message actions
  const handleReply = useCallback((message: ChatMessage) => {
    setReplyingTo(message);
  }, []);

  const handleEdit = useCallback((message: ChatMessage) => {
    setEditingMessage(message);
  }, []);

  const handleSaveEdit = useCallback((text: string) => {
    if (editingMessage && text.trim() && editMessage) {
      editMessage(editingMessage.id, text);
      setEditingMessage(null);
    }
  }, [editingMessage, editMessage]);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
  }, []);

  const handleDelete = useCallback((messageId: string, messageText: string) => {
    if (deleteMessage && confirm(`Delete message: "${messageText}"?`)) {
      deleteMessage(messageId);
    }
  }, [deleteMessage]);

  const createTaskFromMessage = useCallback((message: ChatMessage) => {
    if (onCreateTask) {
      onCreateTask(message.text, message.created_by);
    }
  }, [onCreateTask]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (!showConversationList && conversation && filteredMessages.length > 0 && markMessagesAsRead) {
      const unreadIds = filteredMessages
        .filter(m => m.created_by !== currentUser.name && !(m.read_by || []).includes(currentUser.name))
        .map(m => m.id);

      if (unreadIds.length > 0) {
        markMessagesAsRead(unreadIds);
      }
    }
  }, [showConversationList, conversation, filteredMessages, currentUser.name, markMessagesAsRead]);

  // The inner chat content is shared across all viewport sizes
  const chatContent = (
    <div className="h-full flex flex-col bg-[var(--surface-dark)]">
      {/* Enhanced Header */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          {!showConversationList && (
            <button
              onClick={onShowConversationList}
              className="p-1.5 -ml-1 rounded-[var(--radius-lg)] hover:bg-white/10 transition-colors text-white/70 hover:text-white touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Back to conversations"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {showConversationList ? (
            <div className="w-8 h-8 rounded-[var(--radius-xl)] bg-[var(--accent)] flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
          ) : conversation?.type === 'team' ? (
            <div className="w-8 h-8 rounded-[var(--radius-xl)] bg-[#2563EB] flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
          ) : conversation?.type === 'dm' ? (
            <div
              className="w-8 h-8 rounded-[var(--radius-xl)] flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: getUserColor(conversation.userName) }}
            >
              {getInitials(conversation.userName)}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-[var(--radius-xl)] bg-[var(--accent)] flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
          )}
          <div>
            <h2 className="text-white font-semibold text-sm">
              {showConversationList ? 'Messages' : getConversationTitle()}
            </h2>
            <p className="text-white/50 text-xs">
              {connected ? 'Connected' : 'Connecting...'}
            </p>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1">
          {!showConversationList && (
            <>
              {/* Search toggle */}
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-2 rounded-[var(--radius-lg)] transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center ${
                  showSearch ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                aria-label="Search messages"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Pinned messages toggle */}
              {pinnedMessages.length > 0 && (
                <button
                  onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                  className={`p-2 rounded-[var(--radius-lg)] transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center ${
                    showPinnedMessages ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  aria-label={`${pinnedMessages.length} pinned messages`}
                >
                  <Pin className="w-4 h-4" />
                  <span className="ml-1 text-xs">{pinnedMessages.length}</span>
                </button>
              )}

              {/* Notifications toggle */}
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className="p-2 rounded-[var(--radius-lg)] hover:bg-white/10 transition-colors text-white/70 hover:text-white touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
              >
                {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>

              {/* DND toggle */}
              <button
                onClick={() => setIsDndMode(!isDndMode)}
                className={`p-2 rounded-[var(--radius-lg)] transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center ${
                  isDndMode ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                aria-label={isDndMode ? 'Disable do not disturb' : 'Enable do not disturb'}
              >
                <Moon className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Close button for mobile/tablet overlay */}
          {(isMobile || (isTablet && !isMobile)) && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-[var(--radius-lg)] hover:bg-white/10 transition-colors text-white/70 hover:text-white touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && !showConversationList && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-white/10 overflow-hidden"
          >
            <div className="p-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full px-4 py-2 pl-10 rounded-[var(--radius-xl)] bg-white/10 text-white placeholder-white/40 text-sm border border-white/10 focus:border-[var(--accent)]/50 focus:outline-none"
                  autoFocus
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput('');
                      setSearchQuery('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10"
                  >
                    <X className="w-3 h-3 text-white/60" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-xs text-white/50 mt-2">
                  {filteredMessages.length} {filteredMessages.length === 1 ? 'message' : 'messages'} found
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned messages */}
      <AnimatePresence>
        {showPinnedMessages && !showConversationList && pinnedMessages.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-white/10 overflow-hidden"
          >
            <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
              {pinnedMessages.map((msg) => (
                <div key={msg.id} className="p-2 rounded-[var(--radius-lg)] bg-white/5 text-sm">
                  <p className="text-white/70 text-xs mb-1">{msg.created_by}</p>
                  <p className="text-white">{msg.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversation List or Chat Content */}
      <div className="flex-1 overflow-hidden">
        {showConversationList ? (
          <ChatConversationList
            conversations={[
              { conv: { type: 'team' }, lastMessage: null, lastActivity: 0 },
              ...users
                .filter(u => u.name !== currentUser.name)
                .map(u => ({
                  conv: { type: 'dm' as const, userName: u.name },
                  lastMessage: null,
                  lastActivity: 0
                }))
            ]}
            currentUserName={currentUser.name}
            unreadCounts={{}}
            mutedConversations={new Set()}
            userPresence={{}}
            onSelectConversation={onSelectConversation}
            onToggleMute={() => {}}
            getUserColor={getUserColor}
            formatRelativeTime={() => 'now'}
            getInitials={getInitials}
          />
        ) : (
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-3 py-2"
            >
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <motion.div
                    className="w-14 h-14 rounded-[var(--radius-2xl)] bg-white/[0.06] border border-white/[0.1] flex items-center justify-center mb-4"
                    animate={{ y: [-3, 3, -3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <MessageSquare className="w-7 h-7 text-white/30" />
                  </motion.div>
                  <p className="font-medium text-white/70 text-sm">No messages yet</p>
                  <p className="text-xs mt-1.5 text-white/40">Start the conversation below</p>
                </div>
              ) : (
                <ChatMessageList
                  messages={groupedMessages}
                  currentUser={currentUser}
                  users={users}
                  conversation={conversation}
                  onReact={addReaction || (() => {})}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onPin={togglePin || (() => {})}
                  onCreateTask={onCreateTask ? createTaskFromMessage : undefined}
                  onTaskLinkClick={onTaskLinkClick}
                  todosMap={todosMap}
                  firstUnreadId={null}
                  loading={loading}
                  hasMoreMessages={hasMoreMessages}
                  isLoadingMore={isLoadingMore}
                  onLoadMore={loadMoreMessages}
                  searchQuery={searchQuery}
                />
              )}
            </div>

            {/* Scroll to bottom button */}
            <AnimatePresence>
              {!isAtBottom && filteredMessages.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={() => scrollToBottom()}
                  className="absolute bottom-[80px] left-1/2 -translate-x-1/2 bg-[var(--surface-dark)] border border-white/10 rounded-full px-4 py-2 shadow-xl flex items-center gap-2 text-sm text-white hover:bg-white/5 transition-all z-10"
                >
                  <ChevronDown className="w-4 h-4" />
                  <span>New messages</span>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Input bar */}
            <div
              className="border-t border-white/10"
              style={{
                paddingBottom: isMobile
                  ? (isKeyboardVisible ? '0.5rem' : 'max(0.75rem, env(safe-area-inset-bottom))')
                  : undefined,
                transition: 'padding-bottom 0.2s ease-out'
              }}
            >
              <ChatInputBar
                conversation={conversation}
                users={users}
                currentUserName={currentUser.name}
                onSend={onSendMessage}
                onTyping={onTyping}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
                editingMessage={editingMessage}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                disabled={false}
                rateLimitWarning={null}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Mobile (<640px): Full-screen overlay
  if (isMobile) {
    return (
      <div className="chat-mobile-overlay" role="dialog" aria-label="Chat" aria-modal="true">
        {chatContent}
      </div>
    );
  }

  // Tablet (640-1024px): Slide-in panel with backdrop
  if (isTablet) {
    return (
      <>
        {onClose && (
          <div
            className="chat-mobile-backdrop"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
        <div className="chat-tablet-panel" role="dialog" aria-label="Chat" aria-modal="true">
          {chatContent}
        </div>
      </>
    );
  }

  // Desktop (>1024px): Standard docked behavior (no wrapper needed)
  return chatContent;
}
