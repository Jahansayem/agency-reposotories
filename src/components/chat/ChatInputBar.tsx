'use client';

import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Smile, AtSign, X, Reply, Edit3 } from 'lucide-react';
import { ChatMessage, ChatConversation } from '@/types/todo';
import { CHAT_LIMITS } from '@/lib/chatUtils';

// Expanded emoji picker with categories
const EMOJI_CATEGORIES = {
  recent: ['\ud83d\ude00', '\ud83d\ude02', '\u2764\ufe0f', '\ud83d\udc4d', '\ud83c\udf89', '\ud83d\udd25'],
  smileys: ['\ud83d\ude00', '\ud83d\ude03', '\ud83d\ude04', '\ud83d\ude01', '\ud83d\ude05', '\ud83d\ude02', '\ud83e\udd23', '\ud83d\ude0a', '\ud83d\ude07', '\ud83d\ude42', '\ud83d\ude09', '\ud83d\ude0c'],
  gestures: ['\ud83d\udc4d', '\ud83d\udc4e', '\ud83d\udc4f', '\ud83d\ude4c', '\ud83e\udd1d', '\ud83d\ude4f', '\ud83d\udcaa', '\u270c\ufe0f', '\ud83e\udd1e', '\ud83e\udd19', '\ud83d\udc4b', '\u270b'],
  symbols: ['\u2764\ufe0f', '\ud83e\udde1', '\ud83d\udc9b', '\ud83d\udc9a', '\ud83d\udc99', '\ud83d\udc9c', '\ud83d\udcaf', '\u2728', '\ud83d\udd25', '\u2b50', '\ud83d\udcab', '\ud83c\udf89'],
};

// Mention autocomplete component
const MentionAutocomplete = memo(function MentionAutocomplete({
  users,
  filter,
  onSelect,
  position
}: {
  users: { name: string; color: string }[];
  filter: string;
  onSelect: (name: string) => void;
  position: { top: number; left: number };
}) {
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(filter.toLowerCase())
  ).slice(0, 5);

  if (filteredUsers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.95 }}
      className="absolute z-30 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden min-w-[180px] backdrop-blur-xl"
      style={{ bottom: position.top, left: position.left }}
    >
      {filteredUsers.map((user) => (
        <button
          key={user.name}
          onClick={() => onSelect(user.name)}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.06] transition-all duration-200 text-left group"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg ring-1 ring-white/10 group-hover:ring-white/20 transition-all"
            style={{ backgroundColor: user.color }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-white/80 group-hover:text-white transition-colors">{user.name}</span>
        </button>
      ))}
    </motion.div>
  );
});

interface ChatInputBarProps {
  conversation: ChatConversation | null;
  users: { name: string; color: string }[];
  currentUserName: string;
  onSend: (text: string, mentions: string[]) => void;
  onTyping: () => void;
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
  editingMessage: ChatMessage | null;
  onSaveEdit: (text: string) => void;
  onCancelEdit: () => void;
  disabled?: boolean;
  rateLimitWarning?: string | null;
}

export const ChatInputBar = memo(function ChatInputBar({
  conversation,
  users,
  currentUserName,
  onSend,
  onTyping,
  replyingTo,
  onCancelReply,
  editingMessage,
  onSaveEdit,
  onCancelEdit,
  disabled = false,
  rateLimitWarning,
}: ChatInputBarProps) {
  const [newMessage, setNewMessage] = useState('');
  const [editText, setEditText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<keyof typeof EMOJI_CATEGORIES>('recent');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionCursorPos, setMentionCursorPos] = useState(0);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Update edit text when editing message changes
  useEffect(() => {
    if (editingMessage) {
      setEditText(editingMessage.text);
    } else {
      setEditText('');
    }
  }, [editingMessage]);

  // Other users (excluding current user)
  const otherUsers = users.filter(u => u.name !== currentUserName);

  // Extract mentions from message text
  const extractMentions = useCallback((text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const userName = match[1];
      if (users.some(u => u.name.toLowerCase() === userName.toLowerCase())) {
        mentions.push(userName);
      }
    }
    return mentions;
  }, [users]);

  // Handle mention detection in input
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setNewMessage(value);

    // Detect @mention
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentions(true);
      setMentionFilter(mentionMatch[1]);
      setMentionCursorPos(cursorPos);
    } else {
      setShowMentions(false);
    }

    if (value.trim()) {
      onTyping();
    }
  }, [onTyping]);

  const insertMention = useCallback((userName: string) => {
    const textBeforeMention = newMessage.slice(0, mentionCursorPos).replace(/@\w*$/, '');
    const textAfterCursor = newMessage.slice(mentionCursorPos);
    setNewMessage(`${textBeforeMention}@${userName} ${textAfterCursor}`);
    setShowMentions(false);
    inputRef.current?.focus();
  }, [newMessage, mentionCursorPos]);

  const addEmoji = useCallback((emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const text = newMessage.trim();
    if (!text || !conversation) return;

    const mentions = extractMentions(text);
    onSend(text, mentions);
    setNewMessage('');
  }, [newMessage, conversation, extractMentions, onSend]);

  const handleSaveEditClick = useCallback(() => {
    if (!editText.trim()) return;
    onSaveEdit(editText.trim());
  }, [editText, onSaveEdit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessage) {
        handleSaveEditClick();
      } else {
        handleSend();
      }
    }
    if (e.key === 'Escape') {
      if (replyingTo) onCancelReply();
      if (editingMessage) onCancelEdit();
      setShowMentions(false);
      setShowEmojiPicker(false);
    }
  }, [editingMessage, replyingTo, handleSend, handleSaveEditClick, onCancelReply, onCancelEdit]);

  // Handle click outside emoji picker
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get placeholder text based on conversation
  const getPlaceholder = () => {
    if (disabled) return 'Chat not available';
    if (!conversation) return 'Select a conversation';
    if (conversation.type === 'team') return 'Message team...';
    return `Message ${conversation.userName}...`;
  };

  // Edit mode UI
  if (editingMessage) {
    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="border-t border-white/[0.06] bg-[var(--accent)]/10 px-4 py-3"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm">
            <Edit3 className="w-4 h-4 text-[var(--accent)]" />
            <span className="font-semibold text-white">Editing message</span>
          </div>
          <button
            onClick={onCancelEdit}
            className="p-1.5 hover:bg-white/[0.08] rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-4 py-3 rounded-xl border border-white/[0.1] bg-white/[0.04] text-white text-sm focus:outline-none focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
            autoFocus
          />
          <motion.button
            onClick={handleSaveEditClick}
            disabled={!editText.trim()}
            className="px-5 py-3 bg-[var(--accent)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--accent)]/90 disabled:opacity-50 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Save
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      {/* Reply preview bar */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/[0.06] bg-[var(--accent)]/5 px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Reply className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-white/50">Replying to</span>
                <span className="font-semibold text-white">{replyingTo.created_by}</span>
              </div>
              <button
                onClick={onCancelReply}
                className="p-1.5 hover:bg-white/[0.08] rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
            <p className="text-sm text-white/40 truncate mt-1 pl-6">
              {replyingTo.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rate Limit Warning */}
      {rateLimitWarning && (
        <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 text-amber-400 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {rateLimitWarning}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-white/[0.08] bg-[var(--surface-dark)] relative">
        {/* Mention autocomplete */}
        <AnimatePresence>
          {showMentions && (
            <MentionAutocomplete
              users={otherUsers}
              filter={mentionFilter}
              onSelect={insertMention}
              position={{ top: 60, left: 50 }}
            />
          )}
        </AnimatePresence>

        {/* Emoji Picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              ref={emojiPickerRef}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="mb-3 bg-[var(--surface-dark)] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex border-b border-white/[0.06]">
                {(Object.keys(EMOJI_CATEGORIES) as (keyof typeof EMOJI_CATEGORIES)[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setEmojiCategory(cat)}
                    className={`flex-1 py-3 text-xs font-semibold capitalize transition-all duration-200 ${
                      emojiCategory === cat
                        ? 'bg-[var(--accent)]/20 text-[var(--accent)] border-b-2 border-[var(--accent)]'
                        : 'text-white/40 hover:bg-white/[0.04] hover:text-white/60'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="p-3">
                <div className="grid grid-cols-6 gap-1">
                  {EMOJI_CATEGORIES[emojiCategory].map((emoji, i) => (
                    <motion.button
                      key={`${emoji}-${i}`}
                      onClick={() => addEmoji(emoji)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/[0.08] transition-all text-xl"
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2">
          <motion.button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            className={`p-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              showEmojiPicker ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'hover:bg-white/[0.06] text-white/40 hover:text-white/70'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Smile className="w-5 h-5" />
          </motion.button>

          {/* Mention button */}
          <motion.button
            onClick={() => {
              setNewMessage(prev => prev + '@');
              setShowMentions(true);
              setMentionFilter('');
              inputRef.current?.focus();
            }}
            disabled={disabled}
            className="p-3 rounded-xl transition-all duration-200 hover:bg-white/[0.06] text-white/40 hover:text-white/70 disabled:opacity-50"
            title="Mention someone"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <AtSign className="w-5 h-5" />
          </motion.button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              maxLength={CHAT_LIMITS.MAX_MESSAGE_LENGTH}
              placeholder={getPlaceholder()}
              disabled={disabled}
              rows={1}
              aria-label={conversation ? `Message input for ${conversation.type === 'team' ? 'team chat' : conversation.userName}` : 'Message input'}
              aria-describedby="char-counter"
              className="w-full px-5 py-3 rounded-2xl border border-white/[0.1] bg-white/[0.04] text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 resize-none max-h-28 transition-all text-[15px] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                height: 'auto',
                minHeight: '48px',
                maxHeight: '112px'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 112) + 'px';
              }}
            />
            {/* Character counter - shows when approaching limit */}
            {newMessage.length > CHAT_LIMITS.MAX_MESSAGE_LENGTH * 0.8 && (
              <span
                id="char-counter"
                className={`absolute bottom-1 right-2 text-xs ${
                  newMessage.length > CHAT_LIMITS.MAX_MESSAGE_LENGTH * 0.95
                    ? 'text-red-400'
                    : 'text-white/40'
                }`}
              >
                {newMessage.length}/{CHAT_LIMITS.MAX_MESSAGE_LENGTH}
              </span>
            )}
          </div>
          <motion.button
            onClick={handleSend}
            disabled={!newMessage.trim() || disabled}
            className="p-3 rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </>
  );
});

export default ChatInputBar;
