'use client';

import { memo, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Check, CheckCheck, Reply, MoreHorizontal,
  Edit3, Trash2, Pin, Plus, ExternalLink, Sparkles, X, Smile
} from 'lucide-react';
import { ChatMessage, AuthUser, TapbackType, MessageReaction, ChatConversation, Todo } from '@/types/todo';
import { getReactionAriaLabel } from '@/lib/chatUtils';
import { TaskAssignmentCard, SystemNotificationType } from './TaskAssignmentCard';
import { haptics } from '@/lib/haptics';
import { SkeletonChatPanel } from '@/components/SkeletonLoader';

// Tapback emoji mapping
const TAPBACK_EMOJIS: Record<TapbackType, string> = {
  heart: '\u2764\ufe0f',
  thumbsup: '\ud83d\udc4d',
  thumbsdown: '\ud83d\udc4e',
  haha: '\ud83d\ude02',
  exclamation: '\u2757',
  question: '\u2753',
};

interface ChatMessageListProps {
  messages: (ChatMessage & { isGrouped: boolean })[];
  currentUser: AuthUser;
  users: { name: string; color: string }[];
  conversation: ChatConversation | null;
  onReact: (messageId: string, reaction: TapbackType) => void;
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (messageId: string, messageText: string) => void;
  onPin: (message: ChatMessage) => void;
  onCreateTask?: (message: ChatMessage) => void;
  onTaskLinkClick?: (todoId: string) => void;
  todosMap?: Map<string, Todo>;
  firstUnreadId: string | null;
  loading?: boolean;
  hasMoreMessages?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  searchQuery?: string;
}

// Helper to check if a message is a system notification
function isSystemNotificationMessage(message: ChatMessage): boolean {
  return message.created_by === 'System' && !!message.related_todo_id;
}

// Parse system message to extract notification type
function parseSystemMessage(message: ChatMessage): {
  notificationType: SystemNotificationType;
  actionBy: string;
  previousAssignee?: string;
} | null {
  if (!isSystemNotificationMessage(message)) return null;

  const text = message.text;

  if (text.includes('New Task Assigned') || text.includes('Task Reassigned to You')) {
    const fromMatch = text.match(/From:\s*(\w+)/);
    const byMatch = text.match(/By:\s*(\w+)/);
    const actionBy = fromMatch?.[1] || byMatch?.[1] || 'Unknown';

    if (text.includes('Reassigned')) {
      return { notificationType: 'task_reassignment', actionBy };
    }
    return { notificationType: 'task_assignment', actionBy };
  }

  if (text.includes('Task Completed')) {
    const byMatch = text.match(/By:\s*(\w+)/);
    return { notificationType: 'task_completion', actionBy: byMatch?.[1] || 'Unknown' };
  }

  if (text.includes('Task Reassigned')) {
    const byMatch = text.match(/by\s+(\w+)/);
    return { notificationType: 'task_reassignment', actionBy: byMatch?.[1] || 'Unknown' };
  }

  return null;
}

// Reactions summary tooltip component
const ReactionsSummary = memo(function ReactionsSummary({ reactions }: { reactions: MessageReaction[] }) {
  const groupedByReaction = reactions.reduce((acc, r) => {
    if (!acc[r.reaction]) acc[r.reaction] = [];
    acc[r.reaction].push(r.user);
    return acc;
  }, {} as Record<TapbackType, string[]>);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-2xl p-3 min-w-[140px] backdrop-blur-xl">
      {Object.entries(groupedByReaction).map(([reaction, userNames]) => (
        <div key={reaction} className="flex items-center gap-3 py-1.5">
          <span className="text-lg">{TAPBACK_EMOJIS[reaction as TapbackType]}</span>
          <div className="flex flex-wrap gap-1">
            {userNames.map(name => (
              <span key={name} className="text-xs text-white/70">{name}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

export const ChatMessageList = memo(function ChatMessageList({
  messages,
  currentUser,
  users,
  conversation,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onCreateTask,
  onTaskLinkClick,
  todosMap,
  firstUnreadId,
  loading = false,
  hasMoreMessages = false,
  isLoadingMore = false,
  onLoadMore,
  searchQuery = '',
}: ChatMessageListProps) {
  const [tapbackMessageId, setTapbackMessageId] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const [showReactionsSummary, setShowReactionsSummary] = useState<string | null>(null);
  const [longPressMessageId, setLongPressMessageId] = useState<string | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Swipe-to-reply state (Issue #19)
  const [swipeOffsets, setSwipeOffsets] = useState<Map<string, number>>(new Map());
  const [swipingMessageId, setSwipingMessageId] = useState<string | null>(null);

  const getUserColor = useCallback((userName: string) => {
    const user = users.find(u => u.name === userName);
    return user?.color || 'var(--accent)';
  }, [users]);

  // Long-press handlers for mobile reaction support (P0 Issue #8)
  const handleTouchStart = useCallback((messageId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      // Trigger haptic feedback for long-press activation
      haptics.heavy();
      setTapbackMessageId(messageId);
      setLongPressMessageId(messageId);
    }, 500); // 500ms long-press threshold
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setLongPressMessageId(null);
  }, []);

  // Swipe-to-reply handlers (Issue #19: Mobile Touch Gestures)
  const handleSwipeDrag = useCallback((messageId: string, offsetX: number) => {
    setSwipeOffsets(prev => new Map(prev).set(messageId, offsetX));
    setSwipingMessageId(messageId);
  }, []);

  const handleSwipeDragEnd = useCallback((messageId: string, message: ChatMessage, info: { offset: { x: number }, velocity: { x: number } }) => {
    const { offset, velocity } = info;

    // Swipe right threshold: 50px or fast velocity
    if (offset.x > 50 && velocity.x > 100) {
      // Trigger reply
      onReply(message);

      // Haptic feedback for reply action
      haptics.reply();
    }

    // Reset swipe offset
    setSwipeOffsets(prev => {
      const newMap = new Map(prev);
      newMap.delete(messageId);
      return newMap;
    });
    setSwipingMessageId(null);
  }, [onReply]);

  const getInitials = useCallback((name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }, []);

  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  // Render message text with mentions highlighted
  // NOTE: React automatically escapes text for XSS protection, so we don't need sanitizeHTML here.
  // Manual HTML escaping causes apostrophes to render as &#x27; instead of '
  const renderMessageText = useCallback((text: string) => {
    // Split by mention pattern while keeping mentions in the result
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const userName = part.slice(1);
        const isMentioned = users.some(u => u.name.toLowerCase() === userName.toLowerCase());
        const isMe = userName.toLowerCase() === currentUser.name.toLowerCase();

        if (isMentioned) {
          return (
            <span
              key={i}
              className={`px-1.5 py-0.5 rounded-[var(--radius-md)] font-medium ${
                isMe
                  ? 'bg-[var(--accent)]/30 text-[var(--accent)]'
                  : 'bg-[var(--accent-dark)]/30 text-[var(--accent-dark)] dark:text-[var(--accent)]'
              }`}
              role="mark"
              aria-label={`Mention of ${userName}`}
            >
              {part}
            </span>
          );
        }
      }
      // React automatically escapes plain text for security
      return part;
    });
  }, [users, currentUser.name]);

  // Loading state - Issue #27: Use skeleton loader instead of spinner
  if (loading) {
    return (
      <div className="p-4">
        <SkeletonChatPanel />
      </div>
    );
  }

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <motion.div
          className="w-20 h-20 rounded-[var(--radius-2xl)] bg-[var(--chat-surface)] border border-[var(--chat-border)] flex items-center justify-center mb-5"
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles className="w-10 h-10 text-[var(--accent)]/60" />
        </motion.div>
        <p className="font-semibold text-white text-lg">
          {searchQuery ? 'No messages found' : 'No messages yet'}
        </p>
        <p className="text-sm mt-2 text-[var(--chat-text-secondary)] max-w-xs">
          {searchQuery
            ? 'Try a different search term'
            : conversation?.type === 'team'
            ? 'Be the first to say hello to the team!'
            : conversation?.type === 'dm'
            ? `Start a conversation with ${conversation.userName}`
            : 'Select a conversation to get started'}
        </p>
        {searchQuery && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-5 px-5 py-2.5 rounded-[var(--radius-xl)] bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
          >
            <span className="flex items-center gap-2">
              <X className="w-4 h-4" />
              Clear Search
            </span>
          </motion.button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Load more indicator at top */}
      {hasMoreMessages && (
        <div className="flex justify-center py-3">
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-[var(--chat-text-secondary)] text-xs">
              <motion.div
                className="w-4 h-4 border-2 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <span>Loading older messages...</span>
            </div>
          ) : (
            <button
              onClick={onLoadMore}
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors px-3 py-1.5 rounded-[var(--radius-lg)] hover:bg-[var(--accent)]/10"
            >
              Load earlier messages
            </button>
          )}
        </div>
      )}

      {/* Messages list */}
      {messages.map((msg, msgIndex) => {
        const isOwn = msg.created_by === currentUser.name;
        const userColor = getUserColor(msg.created_by);
        const reactions = msg.reactions || [];
        const readBy = msg.read_by || [];
        const isLastOwnMessage = isOwn && msgIndex === messages.length - 1;
        const showTapbackMenu = tapbackMessageId === msg.id;
        const isHovered = hoveredMessageId === msg.id;
        const isFirstUnread = msg.id === firstUnreadId;

        const reactionCounts = reactions.reduce((acc, r) => {
          acc[r.reaction] = (acc[r.reaction] || 0) + 1;
          return acc;
        }, {} as Record<TapbackType, number>);

        return (
          <div key={msg.id}>
            {/* Unread divider */}
            {isFirstUnread && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-[var(--accent)]/30" />
                <span className="text-xs text-[var(--accent)] font-semibold px-3 py-1 bg-[var(--accent)]/10 rounded-full">New Messages</span>
                <div className="flex-1 h-px bg-[var(--accent)]/30" />
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${msg.isGrouped ? 'mt-0.5' : 'mt-4'} group relative`}
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              <div className={`flex items-end gap-2.5 max-w-[85%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                {!msg.isGrouped ? (
                  <div
                    className="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-lg ring-1 ring-white/10"
                    style={{ backgroundColor: userColor }}
                  >
                    {getInitials(msg.created_by)}
                  </div>
                ) : (
                  <div className="w-8 flex-shrink-0" />
                )}

                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {/* Name and time */}
                  {!msg.isGrouped && (
                    <div className={`flex items-center gap-2 mb-1 text-xs ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <span className="font-semibold text-white/80">
                        {isOwn ? 'You' : msg.created_by}
                      </span>
                      <span className="text-[var(--chat-text-muted)]">
                        {formatTime(msg.created_at)}
                      </span>
                      {msg.edited_at && (
                        <span className="text-[var(--chat-text-muted)] italic">(edited)</span>
                      )}
                      {msg.is_pinned && (
                        <Pin className="w-3 h-3 text-[var(--accent)]" />
                      )}
                    </div>
                  )}

                  {/* Reply preview */}
                  {msg.reply_to_text && (
                    <div className={`text-xs px-3 py-1.5 mb-1.5 rounded-[var(--radius-lg)] border-l-2 border-[var(--accent)] bg-[var(--chat-surface)] text-[var(--chat-text-secondary)] max-w-full truncate`}>
                      <span className="font-medium text-[var(--accent)]">{msg.reply_to_user}: </span>
                      {msg.reply_to_text}
                    </div>
                  )}

                  {/* Message bubble with swipe-to-reply (Issue #19) */}
                  <div className="relative">
                    {(() => {
                      const systemMeta = parseSystemMessage(msg);
                      const linkedTodo = msg.related_todo_id && todosMap?.get(msg.related_todo_id);
                      const currentSwipeOffset = swipeOffsets.get(msg.id) || 0;

                      if (systemMeta && linkedTodo && onTaskLinkClick) {
                        return (
                          <TaskAssignmentCard
                            todo={linkedTodo}
                            notificationType={systemMeta.notificationType}
                            actionBy={systemMeta.actionBy}
                            previousAssignee={systemMeta.previousAssignee}
                            onViewTask={() => onTaskLinkClick(msg.related_todo_id!)}
                            isOwnMessage={isOwn}
                          />
                        );
                      }

                      return (
                        <div className="relative">
                          {/* Reply icon shown during swipe */}
                          {currentSwipeOffset > 20 && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{
                                opacity: Math.min(currentSwipeOffset / 50, 1),
                                scale: Math.min(0.8 + (currentSwipeOffset / 100), 1),
                              }}
                              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-10 pointer-events-none"
                            >
                              <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
                                <Reply className="w-4 h-4 text-[var(--accent)]" />
                              </div>
                            </motion.div>
                          )}

                          <motion.div
                            drag="x"
                            dragConstraints={{ left: 0, right: 100 }}
                            dragElastic={0.2}
                            onDrag={(e, info) => handleSwipeDrag(msg.id, info.offset.x)}
                            onDragEnd={(e, info) => handleSwipeDragEnd(msg.id, msg, info)}
                            onClick={() => setTapbackMessageId(tapbackMessageId === msg.id ? null : msg.id)}
                            onTouchStart={() => handleTouchStart(msg.id)}
                            onTouchEnd={handleTouchEnd}
                            onTouchCancel={handleTouchEnd}
                            className={`px-4 py-2.5 rounded-[var(--radius-2xl)] break-words whitespace-pre-wrap cursor-pointer transition-all duration-200 text-[15px] leading-relaxed ${
                              isOwn
                                ? 'bg-[var(--accent)] text-white rounded-br-md shadow-lg shadow-[var(--accent)]/20'
                                : 'bg-[var(--chat-border)] text-white rounded-bl-md border border-[var(--chat-surface-hover)]'
                            } ${showTapbackMenu ? 'ring-2 ring-[var(--accent)]/50' : ''} ${longPressMessageId === msg.id ? 'ring-2 ring-yellow-400/50' : ''} ${swipingMessageId === msg.id ? 'shadow-2xl' : ''}`}
                            whileHover={{ scale: 1.01 }}
                          >
                            {renderMessageText(msg.text)}

                            {/* Task link button */}
                            {msg.related_todo_id && onTaskLinkClick && !systemMeta && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTaskLinkClick(msg.related_todo_id!);
                                }}
                                className={`mt-2 flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-lg)] text-xs font-medium transition-all ${
                                  isOwn
                                    ? 'bg-white/20 text-white hover:bg-white/30'
                                    : 'bg-[var(--chat-border)] text-white/80 hover:bg-white/[0.15]'
                                }`}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                View Task
                              </button>
                            )}
                          </motion.div>
                        </div>
                      );
                    })()}

                    {/* Action buttons on hover */}
                    {isHovered && !showTapbackMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`absolute top-0 flex gap-0.5 bg-[var(--surface-dark)] border border-[var(--chat-border)] rounded-[var(--radius-xl)] shadow-xl p-1 ${
                          isOwn ? 'right-full mr-2' : 'left-full ml-2'
                        }`}
                      >
                        {/* React button - NEW for P0 Issue #8 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTapbackMessageId(tapbackMessageId === msg.id ? null : msg.id);
                          }}
                          className="p-2 hover:bg-[var(--chat-surface-hover)] rounded-[var(--radius-lg)] transition-colors group"
                          title="Add reaction"
                          aria-label="Add reaction to message"
                        >
                          <Smile className="w-3.5 h-3.5 text-[var(--chat-text-secondary)] group-hover:text-yellow-400 transition-colors" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onReply(msg);
                          }}
                          className="p-2 hover:bg-[var(--chat-surface-hover)] rounded-[var(--radius-lg)] transition-colors"
                          title="Reply"
                        >
                          <Reply className="w-3.5 h-3.5 text-[var(--chat-text-secondary)]" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMessageMenu(showMessageMenu === msg.id ? null : msg.id);
                          }}
                          className="p-2 hover:bg-[var(--chat-surface-hover)] rounded-[var(--radius-lg)] transition-colors"
                          title="More"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5 text-[var(--chat-text-secondary)]" />
                        </button>
                      </motion.div>
                    )}

                    {/* Message menu dropdown */}
                    <AnimatePresence>
                      {showMessageMenu === msg.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 5 }}
                          className={`absolute top-full mt-2 z-30 bg-[var(--surface-dark)] border border-[var(--chat-border)] rounded-[var(--radius-xl)] shadow-2xl overflow-hidden min-w-[160px] backdrop-blur-xl ${
                            isOwn ? 'right-0' : 'left-0'
                          }`}
                        >
                          <button
                            onClick={() => {
                              onReply(msg);
                              setShowMessageMenu(null);
                            }}
                            className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-[var(--chat-surface-hover)] text-white/80 transition-colors"
                          >
                            <Reply className="w-4 h-4" /> Reply
                          </button>
                          <button
                            onClick={() => {
                              onPin(msg);
                              setShowMessageMenu(null);
                            }}
                            className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-[var(--chat-surface-hover)] text-white/80 transition-colors"
                          >
                            <Pin className="w-4 h-4" /> {msg.is_pinned ? 'Unpin' : 'Pin'}
                          </button>
                          {onCreateTask && (
                            <button
                              onClick={() => {
                                onCreateTask(msg);
                                setShowMessageMenu(null);
                              }}
                              className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-[var(--chat-surface-hover)] text-white/80 transition-colors"
                            >
                              <Plus className="w-4 h-4" /> Create Task
                            </button>
                          )}
                          {isOwn && (
                            <>
                              <button
                                onClick={() => {
                                  onEdit(msg);
                                  setShowMessageMenu(null);
                                }}
                                className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-[var(--chat-surface-hover)] text-white/80 transition-colors"
                              >
                                <Edit3 className="w-4 h-4" /> Edit
                              </button>
                              <button
                                onClick={() => {
                                  onDelete(msg.id, msg.text);
                                  setShowMessageMenu(null);
                                }}
                                className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-[var(--chat-surface-hover)] text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Time on hover for grouped messages */}
                    {msg.isGrouped && isHovered && (
                      <div className={`absolute top-1/2 -translate-y-1/2 text-[10px] text-[var(--chat-text-muted)] pointer-events-none whitespace-nowrap ${
                        isOwn ? 'right-full mr-3' : 'left-full ml-3'
                      }`}>
                        {formatTime(msg.created_at)}
                      </div>
                    )}

                    {/* Tapback menu */}
                    <AnimatePresence>
                      {showTapbackMenu && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 8 }}
                          transition={{ duration: 0.15 }}
                          className={`absolute ${isOwn ? 'right-0' : 'left-0'} bottom-full mb-2 z-20 bg-[var(--surface-dark)] border border-[var(--chat-border)] rounded-[var(--radius-2xl)] shadow-2xl px-2 py-1.5 flex gap-1`}
                        >
                          {(Object.keys(TAPBACK_EMOJIS) as TapbackType[]).map((reaction) => {
                            const myReaction = reactions.find(r => r.user === currentUser.name);
                            const isSelected = myReaction?.reaction === reaction;
                            const reactionCount = reactions.filter(r => r.reaction === reaction).length;
                            return (
                              <motion.button
                                key={reaction}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReact(msg.id, reaction);
                                  setTapbackMessageId(null);
                                }}
                                aria-label={getReactionAriaLabel(reaction, reactionCount, isSelected)}
                                aria-pressed={isSelected}
                                className={`w-10 h-10 flex items-center justify-center rounded-[var(--radius-xl)] transition-all duration-200 text-xl ${
                                  isSelected
                                    ? 'bg-[var(--accent)]/30 ring-2 ring-[var(--accent)]'
                                    : 'hover:bg-[var(--chat-surface-hover)]'
                                }`}
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                {TAPBACK_EMOJIS[reaction]}
                              </motion.button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Reactions display */}
                    {Object.keys(reactionCounts).length > 0 && (
                      <div
                        className={`absolute ${isOwn ? '-left-2' : '-right-2'} -bottom-3 z-10`}
                        onMouseEnter={() => setShowReactionsSummary(msg.id)}
                        onMouseLeave={() => setShowReactionsSummary(null)}
                      >
                        <div className="bg-[var(--surface-dark)] border border-[var(--chat-border)] rounded-full px-2 py-1 flex items-center gap-1 shadow-lg cursor-pointer">
                          {(Object.entries(reactionCounts) as [TapbackType, number][]).map(([reaction, count]) => (
                            <span key={reaction} className="flex items-center text-sm">
                              {TAPBACK_EMOJIS[reaction]}
                              {count > 1 && (
                                <span className="text-[10px] ml-0.5 text-[var(--chat-text-secondary)] font-medium">
                                  {count}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                        {/* Reactions summary tooltip */}
                        <AnimatePresence>
                          {showReactionsSummary === msg.id && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              className={`absolute bottom-full mb-2 z-30 ${isOwn ? 'right-0' : 'left-0'}`}
                            >
                              <ReactionsSummary reactions={reactions} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {/* Read receipts */}
                  {isOwn && isLastOwnMessage && (
                    <div className={`flex items-center gap-1.5 mt-1.5 text-[10px] text-[var(--chat-text-secondary)] ${reactions.length > 0 ? 'mt-4' : ''}`}>
                      {readBy.length === 0 ? (
                        <span className="flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Sent
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[var(--accent)]">
                          <CheckCheck className="w-3 h-3" />
                          {conversation?.type === 'dm' ? 'Read' : `Read by ${readBy.length}`}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        );
      })}
    </>
  );
});

export default ChatMessageList;
