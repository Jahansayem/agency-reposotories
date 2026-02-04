'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { ChatMessage, AuthUser, ChatConversation, PresenceStatus, Todo, ChatAttachment } from '@/types/todo';
import { v4 as uuidv4 } from 'uuid';
import { MessageSquare, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@/lib/logger';
import {
  sanitizeHTML,
  validateMessage,
  extractAndValidateMentions,
  checkRateLimit,
  recordMessageSend,
  CHAT_LIMITS,
  truncateText,
} from '@/lib/chatUtils';
import { fetchWithCsrf } from '@/lib/csrf';
import {
  ChatMessageList,
  ChatInputBar,
  ChatConversationList,
  ChatPanelHeader,
  DockedChatPanel,
} from './chat';
import { useChatMessages } from '@/hooks/useChatMessages';
import ConfirmDialog from './ConfirmDialog';
import { useAgency } from '@/contexts/AgencyContext';

// Notification sound URL
const NOTIFICATION_SOUND_URL = '/sounds/notification-chime.wav';
const NOTIFICATION_SOUND_FALLBACK = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleTs1WpbOzq1fMUJFk8zSrGg/V0Bml8jRzaZ4g2pqmaW4zc7Mu7/Fz8q9rZ2WnqWyxdLOv62WiaOxyb6kkXuNqL+2pJZ7cn2ftLaylnuFjJmnq52Xjn5/gI+dn6OZj4KGjJGVl5qakIuIhYaHiYuOkJGQj42Lh4OCgoKEhoeIiIiHhoWDgoGBgYGCg4SEhISDgoGAgICAgIGBgoKCgoKBgYCAgICAgICBgYGBgYGBgICAgICAgICAgYGBgYGBgYCAgICAgA==';

// Track permission request
let permissionRequestInProgress = false;

// Constants for resizable panel
const CHAT_PANEL_MIN_WIDTH = 280;
const CHAT_PANEL_MAX_WIDTH = 600;
const CHAT_PANEL_DEFAULT_WIDTH = 420;
const CHAT_PANEL_WIDTH_KEY = 'chat_panel_width';

// Helper to request notification permission
async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  if (permissionRequestInProgress) return false;

  try {
    permissionRequestInProgress = true;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  } finally {
    permissionRequestInProgress = false;
  }
}

// Helper to show browser notification
function showBrowserNotification(title: string, body: string, onClick?: () => void) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'chat-message',
      requireInteraction: false,
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        try { notification.close(); } catch { /* noop */ }
      };
    }

    setTimeout(() => {
      try { notification.close(); } catch { /* noop */ }
    }, 5000);
  } catch { /* noop */ }
}

// Typing indicator component
function TypingIndicator({ userName }: { userName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 px-4 py-2"
    >
      <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-2xl)] bg-[var(--chat-surface-hover)] border border-[var(--chat-border)]">
        <span className="text-sm text-[var(--chat-text-secondary)]">{userName}</span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
              animate={{
                y: [0, -4, 0],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut'
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

interface ChatPanelProps {
  currentUser: AuthUser;
  users: { name: string; color: string }[];
  onCreateTask?: (text: string, assignedTo?: string) => void;
  onTaskLinkClick?: (todoId: string) => void;
  todosMap?: Map<string, Todo>;
  docked?: boolean;
  initialConversation?: ChatConversation | null;
  onConversationChange?: (conversation: ChatConversation | null, showList: boolean) => void;
}

export default function ChatPanel({
  currentUser,
  users,
  onCreateTask,
  onTaskLinkClick,
  todosMap,
  docked = false,
  initialConversation,
  onConversationChange
}: ChatPanelProps) {
  // Agency context for multi-tenancy
  const { currentAgencyId, isMultiTenancyEnabled } = useAgency();

  // Panel visibility state
  const [isOpen, setIsOpen] = useState(docked);
  const [isMinimized, setIsMinimized] = useState(false);

  // Conversation state
  const [conversation, setConversation] = useState<ChatConversation | null>(initialConversation ?? null);
  const [showConversationList, setShowConversationList] = useState(initialConversation ? false : true);

  // Resizable panel state
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return CHAT_PANEL_DEFAULT_WIDTH;
    try {
      const stored = localStorage.getItem(CHAT_PANEL_WIDTH_KEY);
      if (stored) {
        const width = parseInt(stored, 10);
        if (!isNaN(width) && width >= CHAT_PANEL_MIN_WIDTH && width <= CHAT_PANEL_MAX_WIDTH) {
          return width;
        }
      }
    } catch { /* noop */ }
    return CHAT_PANEL_DEFAULT_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(CHAT_PANEL_DEFAULT_WIDTH);

  // Connection and UI state
  const [connected, setConnected] = useState(false);
  const [tableExists, setTableExists] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [userPresence, setUserPresence] = useState<Record<string, PresenceStatus>>({});

  // UI feature state
  const [showSearch, setShowSearch] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskFromMessage, setTaskFromMessage] = useState<ChatMessage | null>(null);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  const [dockedInputValue, setDockedInputValue] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ messageId: string; messageText: string } | null>(null);

  // Notification state
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  });
  const [mutedConversations, setMutedConversations] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('chat_muted_conversations');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [isDndMode, setIsDndMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('chat_dnd_mode') === 'true';
  });

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolled = useRef<string | null>(null);
  const lastTypingBroadcastRef = useRef<number>(0);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastPresenceTimestamps = useRef<Map<string, number>>(new Map());

  // Use the chat messages hook
  const {
    messages,
    setMessages,
    filteredMessages,
    groupedMessages,
    pinnedMessages,
    loading,
    hasMoreMessages,
    isLoadingMore,
    fetchMessages,
    loadMoreMessages,
    addReaction,
    editMessage,
    deleteMessage,
    togglePin,
    markMessagesAsRead,
    handleNewMessage,
    handleMessageUpdate,
    handleMessageDelete,
  } = useChatMessages({
    currentUser,
    conversation,
    searchQuery,
  });

  // Computed values
  const otherUsers = useMemo(() =>
    users.filter(u => u.name !== currentUser.name),
    [users, currentUser.name]
  );

  const getUserColor = useCallback((userName: string) => {
    const user = users.find(u => u.name === userName);
    return user?.color || 'var(--accent)';
  }, [users]);

  const getConversationKey = useCallback((conv: ChatConversation) => {
    return conv.type === 'team' ? 'team' : conv.userName;
  }, []);

  const totalUnreadCount = useMemo(() => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  }, [unreadCounts]);

  // Get conversations sorted by most recent activity
  const sortedConversations = useMemo(() => {
    const conversations: { conv: ChatConversation; lastMessage: ChatMessage | null; lastActivity: number }[] = [];

    const teamMessages = messages.filter(m => !m.recipient && !m.deleted_at);
    const lastTeamMsg = teamMessages.length > 0 ? teamMessages[teamMessages.length - 1] : null;
    conversations.push({
      conv: { type: 'team' },
      lastMessage: lastTeamMsg,
      lastActivity: lastTeamMsg ? new Date(lastTeamMsg.created_at).getTime() : 0
    });

    otherUsers.forEach(user => {
      const dmMessages = messages.filter(m =>
        !m.deleted_at &&
        ((m.created_by === currentUser.name && m.recipient === user.name) ||
        (m.created_by === user.name && m.recipient === currentUser.name))
      );
      const lastMsg = dmMessages.length > 0 ? dmMessages[dmMessages.length - 1] : null;
      conversations.push({
        conv: { type: 'dm', userName: user.name },
        lastMessage: lastMsg,
        lastActivity: lastMsg ? new Date(lastMsg.created_at).getTime() : 0
      });
    });

    return conversations.sort((a, b) => {
      if (a.lastActivity === 0 && b.lastActivity === 0) return 0;
      if (a.lastActivity === 0) return 1;
      if (b.lastActivity === 0) return -1;
      return b.lastActivity - a.lastActivity;
    });
  }, [messages, otherUsers, currentUser.name]);

  const mostRecentConversation = useMemo((): ChatConversation => {
    if (sortedConversations.length > 0 && sortedConversations[0].lastActivity > 0) {
      return sortedConversations[0].conv;
    }
    return { type: 'team' };
  }, [sortedConversations]);

  const activeTypingUsers = useMemo(() => {
    if (!conversation) return [];
    return Object.entries(typingUsers)
      .filter(([user, isTyping]) => isTyping && user !== currentUser.name)
      .map(([user]) => user);
  }, [typingUsers, conversation, currentUser.name]);

  // Utility functions
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const getInitials = useCallback((name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }, []);

  const formatRelativeTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }, []);

  const getConversationTitle = useCallback(() => {
    if (!conversation) return 'Messages';
    if (conversation.type === 'team') return 'Team Chat';
    return conversation.userName;
  }, [conversation]);

  // Notification sound
  // BUGFIX SILENT-001: Log audio playback errors instead of silently swallowing
  const playNotificationSound = useCallback(() => {
    if (isDndMode) return;
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        // Only log if it's not an AbortError (which happens when audio is interrupted by another play)
        if (error.name !== 'AbortError') {
          logger.warn('Failed to play notification sound', { component: 'ChatPanel', error: error.message });
        }
      });
    }
  }, [isDndMode]);

  // Toggle notifications
  const toggleNotifications = useCallback(async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
    } else {
      const granted = await requestNotificationPermission();
      setNotificationsEnabled(granted);
    }
  }, [notificationsEnabled]);

  // Toggle mute for conversation
  const toggleMute = useCallback((convKey: string) => {
    setMutedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(convKey)) {
        newSet.delete(convKey);
      } else {
        newSet.add(convKey);
      }
      return newSet;
    });
  }, []);

  // Handle conversation selection
  const selectConversation = useCallback((conv: ChatConversation) => {
    setConversation(conv);
    setShowConversationList(false);
    const key = getConversationKey(conv);
    setUnreadCounts(prev => ({ ...prev, [key]: 0 }));
    hasInitialScrolled.current = null;
  }, [getConversationKey]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(isBottom);

    if (scrollTop < 100 && hasMoreMessages && !isLoadingMore) {
      loadMoreMessages();
    }

    if (isBottom && isOpen && conversation) {
      const key = getConversationKey(conversation);
      setUnreadCounts(prev => ({ ...prev, [key]: 0 }));
    }
  }, [isOpen, conversation, getConversationKey, hasMoreMessages, isLoadingMore, loadMoreMessages]);

  // Broadcast typing indicator
  const broadcastTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingBroadcastRef.current > 2000 && typingChannelRef.current) {
      lastTypingBroadcastRef.current = now;
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user: currentUser.name, conversation: conversation ? getConversationKey(conversation) : null }
      });
    }
  }, [currentUser.name, conversation, getConversationKey]);

  // Send message
  const sendMessage = useCallback(async (text: string, mentions: string[], attachments?: ChatAttachment[]) => {
    // Allow sending if there's text OR attachments
    if (!text.trim() && (!attachments || attachments.length === 0)) return;
    if (!conversation) return;

    const rateLimitStatus = checkRateLimit(currentUser.id);
    if (rateLimitStatus.isLimited) {
      const waitSeconds = Math.ceil(rateLimitStatus.remainingMs / 1000);
      setRateLimitWarning(`Slow down! You can send another message in ${waitSeconds}s`);
      return;
    }

    const userNames = users.map(u => u.name);
    const validation = validateMessage(text || '', [], userNames);

    if (text && !validation.isValid) {
      logger.warn('Message validation failed', { errors: validation.errors, component: 'ChatPanel' });
      return;
    }

    recordMessageSend(currentUser.id);

    const message: ChatMessage = {
      id: uuidv4(),
      text: validation.sanitizedText || text || '',
      created_by: currentUser.name,
      created_at: new Date().toISOString(),
      recipient: conversation.type === 'dm' ? conversation.userName : null,
      reply_to_id: replyingTo?.id || null,
      reply_to_text: replyingTo ? truncateText(sanitizeHTML(replyingTo.text), 100) : null,
      reply_to_user: replyingTo?.created_by || null,
      // Only include mentions/attachments if they have values to avoid Supabase 400 errors
      // when these columns may not exist in older database schemas
      ...(mentions.length > 0 && { mentions }),
      ...(attachments && attachments.length > 0 && { attachments }),
    };

    setMessages((prev) => [...prev, message]);
    setReplyingTo(null);
    scrollToBottom();

    const { error } = await supabase.from('messages').insert([message]);

    if (error) {
      logger.error('Error sending message', error, { component: 'ChatPanel' });
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
    } else {
      const recipientsToNotify: string[] = [];

      if (conversation.type === 'dm' && conversation.userName) {
        if (conversation.userName !== currentUser.name) {
          recipientsToNotify.push(conversation.userName);
        }
      } else if (mentions.length > 0) {
        mentions.forEach(mention => {
          if (mention !== currentUser.name) {
            recipientsToNotify.push(mention);
          }
        });
      }

      if (recipientsToNotify.length > 0) {
        fetchWithCsrf('/api/push-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'message',
            payload: {
              senderName: currentUser.name,
              messageText: text,
              isDm: conversation.type === 'dm',
            },
            userNames: recipientsToNotify,
          }),
        }).catch(err => {
          logger.warn('Failed to send push notification for message', { error: err, component: 'ChatPanel' });
        });
      }
    }
  }, [conversation, currentUser, users, replyingTo, setMessages, scrollToBottom]);

  // Handle save edit
  const handleSaveEdit = useCallback((text: string) => {
    if (editingMessage && text.trim()) {
      editMessage(editingMessage.id, text);
      setEditingMessage(null);
    }
  }, [editingMessage, editMessage]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
  }, []);

  // Create task from message
  const createTaskFromMessage = useCallback((message: ChatMessage) => {
    setTaskFromMessage(message);
    setShowCreateTaskModal(true);
  }, []);

  const handleCreateTask = useCallback(() => {
    if (taskFromMessage && onCreateTask) {
      onCreateTask(taskFromMessage.text, taskFromMessage.created_by);
    }
    setShowCreateTaskModal(false);
    setTaskFromMessage(null);
  }, [taskFromMessage, onCreateTask]);

  // Delete confirmation handlers
  const handleDeleteMessageRequest = useCallback((messageId: string, messageText: string) => {
    setDeleteConfirmation({ messageId, messageText });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmation) {
      deleteMessage(deleteConfirmation.messageId);
      setDeleteConfirmation(null);
    }
  }, [deleteConfirmation, deleteMessage]);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmation(null);
  }, []);

  // Track refs for real-time subscription callbacks
  const isOpenRef = useRef(isOpen);
  const isAtBottomRef = useRef(isAtBottom);
  const conversationRef = useRef(conversation);
  const showConversationListRef = useRef(showConversationList);
  const playNotificationSoundRef = useRef(playNotificationSound);
  const mutedConversationsRef = useRef(mutedConversations);
  const isDndModeRef = useRef(isDndMode);
  // BUGFIX REACT-005: Store fetchMessages in ref to avoid subscription teardown on conversation change
  const fetchMessagesRef = useRef(fetchMessages);

  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
  useEffect(() => { isAtBottomRef.current = isAtBottom; }, [isAtBottom]);
  useEffect(() => { conversationRef.current = conversation; }, [conversation]);
  useEffect(() => { showConversationListRef.current = showConversationList; }, [showConversationList]);
  useEffect(() => { playNotificationSoundRef.current = playNotificationSound; }, [playNotificationSound]);
  useEffect(() => { mutedConversationsRef.current = mutedConversations; }, [mutedConversations]);
  useEffect(() => { isDndModeRef.current = isDndMode; }, [isDndMode]);
  useEffect(() => { fetchMessagesRef.current = fetchMessages; }, [fetchMessages]);

  // Initialize audio
  // BUGFIX REACT-002: Clear onerror handler to prevent closure memory leak
  useEffect(() => {
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 0.5;
    audio.onerror = () => {
      audio.src = NOTIFICATION_SOUND_FALLBACK;
    };
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        // Clear event handler to break closure reference
        audioRef.current.onerror = null;
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // Persist muted conversations
  useEffect(() => {
    localStorage.setItem('chat_muted_conversations', JSON.stringify([...mutedConversations]));
  }, [mutedConversations]);

  // Persist DND mode
  useEffect(() => {
    localStorage.setItem('chat_dnd_mode', isDndMode.toString());
  }, [isDndMode]);

  // Persist panel width
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_PANEL_WIDTH_KEY, panelWidth.toString());
    } catch { /* noop */ }
  }, [panelWidth]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, CHAT_LIMITS.DEBOUNCE_TYPING_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Auto-clear rate limit warning
  useEffect(() => {
    if (rateLimitWarning) {
      const timer = setTimeout(() => setRateLimitWarning(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [rateLimitWarning]);

  // Notify parent when conversation changes
  useEffect(() => {
    onConversationChange?.(conversation, showConversationList);
  }, [conversation, showConversationList, onConversationChange]);

  // Handle resize
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = panelWidth;
  }, [panelWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = resizeStartX.current - e.clientX;
      const newWidth = Math.min(
        CHAT_PANEL_MAX_WIDTH,
        Math.max(CHAT_PANEL_MIN_WIDTH, resizeStartWidth.current + delta)
      );
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Update presence periodically
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const updatePresence = () => {
      if (presenceChannelRef.current) {
        presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'presence',
          payload: {
            user: currentUser.name,
            status: isDndMode ? 'dnd' : 'online',
            timestamp: Date.now()
          }
        });
      }
    };

    presenceIntervalRef.current = setInterval(updatePresence, 30000);

    return () => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
    };
  }, [currentUser.name, isDndMode]);

  // Check for stale presence
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const PRESENCE_TIMEOUT_MS = 60000;

    const checkStalePresence = () => {
      const now = Date.now();
      const staleUsers: string[] = [];

      lastPresenceTimestamps.current.forEach((timestamp, userName) => {
        if (now - timestamp > PRESENCE_TIMEOUT_MS) {
          staleUsers.push(userName);
        }
      });

      if (staleUsers.length > 0) {
        setUserPresence(prev => {
          const updated = { ...prev };
          staleUsers.forEach(user => {
            if (updated[user] !== 'offline') {
              updated[user] = 'offline';
            }
          });
          return updated;
        });
      }
    };

    const presenceCheckInterval = setInterval(checkStalePresence, 15000);
    return () => clearInterval(presenceCheckInterval);
  }, []);

  // Real-time subscription for messages, typing, and presence
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    // BUGFIX REACT-005: Use ref to call fetchMessages to avoid subscription teardown
    // when fetchMessages identity changes due to conversation changes
    fetchMessagesRef.current();

    // Build channel name and filter based on multi-tenancy status
    const messagesChannelName = isMultiTenancyEnabled && currentAgencyId
      ? `messages-${currentAgencyId}`
      : 'messages-all';

    const messagesSubscriptionConfig: {
      event: '*';
      schema: 'public';
      table: 'messages';
      filter?: string;
    } = {
      event: '*',
      schema: 'public',
      table: 'messages',
    };

    // Add agency filter if multi-tenancy is enabled
    if (isMultiTenancyEnabled && currentAgencyId) {
      messagesSubscriptionConfig.filter = `agency_id=eq.${currentAgencyId}`;
    }

    const messagesChannel = supabase
      .channel(messagesChannelName)
      .on(
        'postgres_changes',
        messagesSubscriptionConfig,
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as ChatMessage;
            handleNewMessage(newMsg);
            setTypingUsers(prev => ({ ...prev, [newMsg.created_by]: false }));

            if (newMsg.created_by === currentUser.name) return;

            const readBy = newMsg.read_by || [];
            if (readBy.includes(currentUser.name)) return;

            let msgConvKey: string | null = null;
            if (!newMsg.recipient) {
              msgConvKey = 'team';
            } else if (newMsg.recipient === currentUser.name) {
              msgConvKey = newMsg.created_by;
            }

            if (!msgConvKey) return;
            if (mutedConversationsRef.current.has(msgConvKey)) return;

            const currentConv = conversationRef.current;
            const currentKey = currentConv ? (currentConv.type === 'team' ? 'team' : currentConv.userName) : null;
            const isPanelOpen = isOpenRef.current;
            const isViewingConversation = !showConversationListRef.current;
            const isViewingThisConv = currentKey === msgConvKey;
            const isAtBottomOfChat = isAtBottomRef.current;

            const shouldMarkUnread = !isPanelOpen || !isViewingConversation || !isViewingThisConv || !isAtBottomOfChat;

            if (shouldMarkUnread) {
              setUnreadCounts(prev => ({
                ...prev,
                [msgConvKey]: (prev[msgConvKey] || 0) + 1
              }));

              if (!isDndModeRef.current) {
                playNotificationSoundRef.current();

                if (document.hidden) {
                  const title = newMsg.recipient
                    ? `Message from ${newMsg.created_by}`
                    : `${newMsg.created_by} in Team Chat`;
                  const body = newMsg.text.length > 100
                    ? newMsg.text.slice(0, 100) + '...'
                    : newMsg.text;
                  showBrowserNotification(title, body);
                }
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            handleMessageUpdate(payload.new as ChatMessage);
          } else if (payload.eventType === 'DELETE') {
            handleMessageDelete(payload.old.id);
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    // REACT-006: Track typing timeouts properly to prevent memory leaks
    const typingChannel = supabase
      .channel('typing-channel')
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user !== currentUser.name) {
          setTypingUsers(prev => ({ ...prev, [payload.user]: true }));
          // Clear existing timeout before creating new one
          const existingTimeout = typingTimeoutsRef.current.get(payload.user);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            typingTimeoutsRef.current.delete(payload.user);
          }
          const timeout = setTimeout(() => {
            // Guard against unmounted component - only update if ref map still has this timeout
            if (typingTimeoutsRef.current.has(payload.user)) {
              setTypingUsers(prev => ({ ...prev, [payload.user]: false }));
              typingTimeoutsRef.current.delete(payload.user);
            }
          }, 3000);
          typingTimeoutsRef.current.set(payload.user, timeout);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          typingChannelRef.current = typingChannel;
        }
      });

    const presenceChannel = supabase
      .channel('presence-channel')
      .on('broadcast', { event: 'presence' }, ({ payload }) => {
        if (payload.user !== currentUser.name) {
          setUserPresence(prev => ({ ...prev, [payload.user]: payload.status }));
          lastPresenceTimestamps.current.set(payload.user, payload.timestamp || Date.now());
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          presenceChannelRef.current = presenceChannel;
          presenceChannel.send({
            type: 'broadcast',
            event: 'presence',
            payload: {
              user: currentUser.name,
              status: isDndModeRef.current ? 'dnd' : 'online',
              timestamp: Date.now()
            }
          });
        }
      });

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(typingChannel);
      supabase.removeChannel(presenceChannel);
      typingChannelRef.current = null;
      presenceChannelRef.current = null;
      typingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
    };
  // BUGFIX REACT-005: Removed fetchMessages from deps - using fetchMessagesRef instead
  // to prevent subscription teardown on every conversation change
  }, [currentUser.name, handleNewMessage, handleMessageUpdate, handleMessageDelete, currentAgencyId, isMultiTenancyEnabled]);

  // BUGFIX REACT-005: Separate effect to refetch messages when conversation changes
  // This ensures messages are refetched without tearing down the realtime subscriptions
  useEffect(() => {
    if (!isSupabaseConfigured() || !conversation) return;
    fetchMessagesRef.current();
  }, [conversation]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isAtBottom && isOpen && !showConversationList) {
      scrollToBottom();
    }
  }, [filteredMessages, isAtBottom, isOpen, scrollToBottom, showConversationList]);

  // Initial scroll to bottom when loading conversation
  useEffect(() => {
    if (!loading && isOpen && conversation && !showConversationList && filteredMessages.length > 0) {
      const convKey = getConversationKey(conversation);
      if (hasInitialScrolled.current !== convKey) {
        hasInitialScrolled.current = convKey;
        setTimeout(() => scrollToBottom('instant'), 50);
      }
    }
  }, [loading, isOpen, conversation, showConversationList, filteredMessages.length, getConversationKey, scrollToBottom]);

  // Focus and clear unread when opening conversation
  useEffect(() => {
    if (isOpen && !isMinimized && !showConversationList && conversation && !loading) {
      setTimeout(() => scrollToBottom('instant'), 50);
      const key = getConversationKey(conversation);
      setUnreadCounts(prev => ({ ...prev, [key]: 0 }));
    }
  }, [isOpen, isMinimized, showConversationList, conversation, loading, getConversationKey, scrollToBottom]);

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (isOpen && !showConversationList && conversation && filteredMessages.length > 0) {
      const unreadMessageIds = filteredMessages
        .filter(m => m.created_by !== currentUser.name && !(m.read_by || []).includes(currentUser.name))
        .map(m => m.id);

      if (unreadMessageIds.length > 0) {
        markMessagesAsRead(unreadMessageIds);
      }
    }
  }, [isOpen, showConversationList, conversation, filteredMessages, currentUser.name, markMessagesAsRead]);

  // For docked mode, use the DockedChatPanel component
  if (docked) {
    return (
      <DockedChatPanel
        currentUser={currentUser}
        users={users}
        conversation={conversation}
        showConversationList={showConversationList}
        connected={connected}
        filteredMessages={filteredMessages}
        messagesContainerRef={messagesContainerRef}
        inputValue={dockedInputValue}
        onInputChange={setDockedInputValue}
        onSendMessage={sendMessage}
        onSelectConversation={selectConversation}
        onShowConversationList={() => setShowConversationList(true)}
        onTyping={broadcastTyping}
        getUserColor={getUserColor}
        getInitials={getInitials}
        getConversationTitle={getConversationTitle}
        extractMentions={extractAndValidateMentions}
      />
    );
  }

  // Original floating chat panel
  return (
    <>
      {/* Chat Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              setIsOpen(true);
              if (messages.length > 0) {
                setConversation(mostRecentConversation);
                setShowConversationList(false);
              } else {
                setShowConversationList(true);
              }
            }}
            className="fixed bottom-6 right-6 z-50 group"
            aria-label={`Open chat${totalUnreadCount > 0 ? `, ${totalUnreadCount} unread messages` : ''}`}
          >
            <div className="w-14 h-14 rounded-[var(--radius-2xl)] bg-[var(--accent)] flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:bg-[var(--accent)]/90">
              <MessageSquare className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            {totalUnreadCount > 0 && (
              <div className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-lg animate-pulse">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </div>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? 'auto' : 'min(650px, 85vh)'
            }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: isResizing ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-50 max-w-[calc(100vw-2rem)] flex flex-col"
            style={{ width: `${panelWidth}px` }}
            role="dialog"
            aria-label="Chat panel"
          >
            {/* Resize handle */}
            <div
              onMouseDown={handleResizeMouseDown}
              className={`absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize z-10 group/resize transition-colors duration-150 ${
                isResizing ? 'bg-[var(--accent)]/50' : 'bg-transparent hover:bg-white/20'
              }`}
              style={{ borderRadius: '28px 0 0 28px' }}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize chat panel"
            >
              <div
                className={`absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-12 rounded-full transition-all duration-150 ${
                  isResizing ? 'bg-[var(--accent)] h-16' : 'bg-white/20 group-hover/resize:bg-white/40 group-hover/resize:h-16'
                }`}
              />
            </div>

            {/* Main container */}
            <div className="relative bg-[var(--surface-dark)] rounded-[28px] border border-[var(--chat-border)] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-full">
              {/* Header */}
              <ChatPanelHeader
                showConversationList={showConversationList}
                conversation={conversation}
                connected={connected}
                isMinimized={isMinimized}
                showSearch={showSearch}
                showPinnedMessages={showPinnedMessages}
                pinnedMessages={pinnedMessages}
                notificationsEnabled={notificationsEnabled}
                isDndMode={isDndMode}
                searchInput={searchInput}
                filteredMessagesCount={filteredMessages.length}
                userPresence={userPresence}
                onBack={() => setShowConversationList(true)}
                onToggleSearch={() => setShowSearch(!showSearch)}
                onTogglePinnedMessages={() => setShowPinnedMessages(!showPinnedMessages)}
                onToggleDndMode={() => setIsDndMode(!isDndMode)}
                onToggleNotifications={toggleNotifications}
                onToggleMinimize={() => setIsMinimized(!isMinimized)}
                onClose={() => setIsOpen(false)}
                onSearchChange={setSearchInput}
                onClearSearch={() => { setSearchInput(''); setSearchQuery(''); }}
                getUserColor={getUserColor}
                getInitials={getInitials}
                getConversationTitle={getConversationTitle}
              />

              {/* Content */}
              {!isMinimized && (
                <>
                  {showConversationList ? (
                    <ChatConversationList
                      conversations={sortedConversations}
                      currentUserName={currentUser.name}
                      unreadCounts={unreadCounts}
                      mutedConversations={mutedConversations}
                      userPresence={userPresence}
                      onSelectConversation={selectConversation}
                      onToggleMute={toggleMute}
                      getUserColor={getUserColor}
                      formatRelativeTime={formatRelativeTime}
                      getInitials={getInitials}
                    />
                  ) : (
                    <>
                      <div
                        ref={messagesContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
                      >
                        {!tableExists ? (
                          <div className="flex flex-col items-center justify-center h-full text-center px-6">
                            <div className="w-20 h-20 rounded-[var(--radius-2xl)] bg-[var(--chat-surface)] border border-[var(--chat-border)] flex items-center justify-center mb-5">
                              <MessageSquare className="w-10 h-10 text-white/20" />
                            </div>
                            <p className="font-semibold text-white text-lg">Chat Setup Required</p>
                            <p className="text-sm mt-2 text-[var(--chat-text-secondary)]">Run the messages migration in Supabase to enable chat.</p>
                          </div>
                        ) : (
                          <>
                            <ChatMessageList
                              messages={groupedMessages}
                              currentUser={currentUser}
                              users={users}
                              conversation={conversation}
                              onReact={addReaction}
                              onReply={setReplyingTo}
                              onEdit={setEditingMessage}
                              onDelete={handleDeleteMessageRequest}
                              onPin={togglePin}
                              onCreateTask={onCreateTask ? createTaskFromMessage : undefined}
                              onTaskLinkClick={onTaskLinkClick}
                              todosMap={todosMap}
                              firstUnreadId={firstUnreadId}
                              loading={loading}
                              hasMoreMessages={hasMoreMessages}
                              isLoadingMore={isLoadingMore}
                              onLoadMore={loadMoreMessages}
                              searchQuery={searchQuery}
                            />

                            {/* Typing indicator */}
                            <AnimatePresence>
                              {activeTypingUsers.length > 0 && (
                                <TypingIndicator userName={activeTypingUsers[0]} />
                              )}
                            </AnimatePresence>
                          </>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Scroll to bottom button */}
                      <AnimatePresence>
                        {!isAtBottom && filteredMessages.length > 0 && (
                          <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            onClick={() => scrollToBottom()}
                            className="absolute bottom-[130px] left-1/2 -translate-x-1/2 bg-[var(--surface-dark)] border border-[var(--chat-border)] rounded-full px-4 py-2 shadow-xl flex items-center gap-2 text-sm text-white hover:bg-[var(--chat-surface-hover)] transition-all"
                          >
                            <ChevronDown className="w-4 h-4" />
                            <span>New messages</span>
                          </motion.button>
                        )}
                      </AnimatePresence>

                      {/* Input bar */}
                      <ChatInputBar
                        conversation={conversation}
                        users={users}
                        currentUserName={currentUser.name}
                        onSend={sendMessage}
                        onTyping={broadcastTyping}
                        replyingTo={replyingTo}
                        onCancelReply={() => setReplyingTo(null)}
                        editingMessage={editingMessage}
                        onSaveEdit={handleSaveEdit}
                        onCancelEdit={handleCancelEdit}
                        disabled={!tableExists}
                        rateLimitWarning={rateLimitWarning}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreateTaskModal && taskFromMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowCreateTaskModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--surface-dark)] border border-[var(--chat-border)] rounded-[var(--radius-2xl)] shadow-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-white mb-5">Create Task from Message</h3>
              <div className="p-4 bg-[var(--chat-surface)] border border-[var(--chat-border)] rounded-[var(--radius-xl)] mb-5">
                <p className="text-sm text-[var(--chat-text-secondary)] mb-1">From {taskFromMessage.created_by}:</p>
                <p className="text-white">{taskFromMessage.text}</p>
              </div>
              <div className="flex justify-end gap-3">
                <motion.button
                  onClick={() => setShowCreateTaskModal(false)}
                  className="px-5 py-3 rounded-[var(--radius-xl)] border border-[var(--chat-border)] text-white/70 hover:bg-[var(--chat-surface)] transition-all font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleCreateTask}
                  className="px-5 py-3 rounded-[var(--radius-xl)] bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent)]/90 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Create Task
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmation !== null}
        title="Delete Message?"
        message={`Are you sure you want to delete this message? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}
