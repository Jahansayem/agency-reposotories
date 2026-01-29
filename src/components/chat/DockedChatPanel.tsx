'use client';

import { useCallback, RefObject } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Users, ChevronLeft } from 'lucide-react';
import { AuthUser, ChatConversation, ChatMessage } from '@/types/todo';
import { sanitizeHTML } from '@/lib/chatUtils';

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
}: DockedChatPanelProps) {
  // Render message text with mentions
  const renderMessageText = useCallback((text: string) => {
    const sanitizedText = sanitizeHTML(text);
    const parts = sanitizedText.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const userName = part.slice(1);
        const isMentioned = users.some(u => u.name.toLowerCase() === userName.toLowerCase());
        const isMe = userName.toLowerCase() === currentUser.name.toLowerCase();

        if (isMentioned) {
          return (
            <span
              key={i}
              className={`px-1.5 py-0.5 rounded-md font-medium ${
                isMe
                  ? 'bg-[var(--accent)]/30 text-[var(--accent)]'
                  : 'bg-[var(--accent-dark)]/30 text-[var(--accent-dark)] dark:text-[var(--accent)]'
              }`}
            >
              {part}
            </span>
          );
        }
      }
      return part;
    });
  }, [users, currentUser.name]);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (text) {
      const mentions = extractMentions(text, users.map(u => u.name));
      onSendMessage(text, mentions);
      onInputChange('');
    }
  }, [inputValue, extractMentions, users, onSendMessage, onInputChange]);

  return (
    <div className="h-full flex flex-col bg-[var(--surface-dark)]">
      {/* Docked Header */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          {!showConversationList && (
            <button
              onClick={onShowConversationList}
              className="p-1.5 -ml-1 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              aria-label="Back to conversations"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {showConversationList ? (
            <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
          ) : conversation?.type === 'team' ? (
            <div className="w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
          ) : conversation?.type === 'dm' ? (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: getUserColor(conversation.userName) }}
            >
              {getInitials(conversation.userName)}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center">
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
      </div>

      {/* Conversation List or Chat Content */}
      <div className="flex-1 overflow-hidden">
        {showConversationList ? (
          <div className="h-full overflow-y-auto p-3 space-y-2">
            <button
              onClick={() => onSelectConversation({ type: 'team' })}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--accent)]/15 flex items-center justify-center">
                <Users className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">Team Chat</p>
                <p className="text-white/40 text-xs truncate">All team messages</p>
              </div>
            </button>

            {users.filter(u => u.name !== currentUser.name).map(user => (
              <button
                key={user.name}
                onClick={() => onSelectConversation({ type: 'dm', userName: user.name })}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{user.name}</p>
                  <p className="text-white/40 text-xs">Direct message</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <button
              onClick={onShowConversationList}
              className="flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white transition-colors text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to conversations
            </button>

            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
            >
              {filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <motion.div
                    className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center mb-4"
                    animate={{ y: [-3, 3, -3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <MessageSquare className="w-7 h-7 text-white/30" />
                  </motion.div>
                  <p className="font-medium text-white/70 text-sm">No messages yet</p>
                  <p className="text-xs mt-1.5 text-white/40">Start the conversation below</p>
                </div>
              ) : (
                filteredMessages.map((message, index) => {
                  const isOwn = message.created_by === currentUser.name;
                  const showAvatar = !isOwn && (index === 0 || filteredMessages[index - 1]?.created_by !== message.created_by);

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isOwn && showAvatar && (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                          style={{ backgroundColor: getUserColor(message.created_by) }}
                        >
                          {message.created_by[0]}
                        </div>
                      )}
                      {!isOwn && !showAvatar && <div className="w-7" />}
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                          isOwn
                            ? 'bg-[var(--accent)] text-white'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        {renderMessageText(message.text)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    onInputChange(e.target.value);
                    if (e.target.value.trim()) onTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white placeholder-white/40 text-sm border border-white/10 focus:border-[var(--accent)]/50 focus:outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="p-2.5 rounded-xl bg-[var(--accent)] text-white disabled:opacity-50 transition-opacity hover:bg-[var(--accent)]/90"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
