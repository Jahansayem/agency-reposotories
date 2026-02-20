'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { ChatMessage, ChatConversation, AuthUser, TapbackType, MessageReaction } from '@/types/todo';
import { logger } from '@/lib/logger';
import { useAgency } from '@/contexts/AgencyContext';

interface UseChatMessagesOptions {
  currentUser: AuthUser;
  conversation: ChatConversation | null;
  searchQuery: string;
}

interface UseChatMessagesReturn {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  filteredMessages: ChatMessage[];
  groupedMessages: (ChatMessage & { isGrouped: boolean })[];
  pinnedMessages: ChatMessage[];
  loading: boolean;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  fetchMessages: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  addReaction: (messageId: string, reaction: TapbackType) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  togglePin: (message: ChatMessage) => Promise<void>;
  markMessagesAsRead: (messageIds: string[]) => Promise<void>;
  markMessageAsUnread: (messageId: string) => Promise<void>;
  handleNewMessage: (message: ChatMessage) => void;
  handleMessageUpdate: (message: ChatMessage) => void;
  handleMessageDelete: (messageId: string) => void;
  messagesRef: React.RefObject<ChatMessage[]>;
}

const MESSAGES_PER_PAGE = 50;

/**
 * Hook for managing chat messages state and operations
 */
export function useChatMessages({
  currentUser,
  conversation,
  searchQuery,
}: UseChatMessagesOptions): UseChatMessagesReturn {
  const { currentAgencyId, isMultiTenancyEnabled, isLoading: agencyLoading } = useAgency();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch version counter to prevent race conditions when switching conversations rapidly.
  // Each fetchMessages call increments this; stale responses are discarded.
  const fetchVersionRef = useRef(0);

  const messagesRef = useRef<ChatMessage[]>(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Fetch initial messages filtered by current conversation
  const fetchMessages = useCallback(async () => {
    if (!isSupabaseConfigured() || !conversation) return;

    // FIX: Wait for agency context to be ready when multi-tenancy is enabled
    if (isMultiTenancyEnabled && agencyLoading) {
      return;
    }

    // Increment fetch version to detect stale responses from rapid conversation switches
    const thisVersion = ++fetchVersionRef.current;

    setLoading(true);

    let query = supabase
      .from('messages')
      .select('*');

    // Add agency filter if multi-tenancy is enabled
    if (isMultiTenancyEnabled && currentAgencyId) {
      query = query.eq('agency_id', currentAgencyId);
    }

    // Filter by conversation type to avoid fetching all messages from the database
    if (conversation.type === 'team') {
      // Team chat: messages with no recipient (not DMs)
      query = query.is('recipient', null);
    } else {
      // DM conversation: messages between current user and the other user
      const otherUser = conversation.userName;
      query = query.or(
        `and(created_by.eq.${currentUser.name},recipient.eq.${otherUser}),and(created_by.eq.${otherUser},recipient.eq.${currentUser.name})`
      );
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PER_PAGE);

    // Discard result if a newer fetch was started while this one was in flight
    if (fetchVersionRef.current !== thisVersion) return;

    if (error) {
      logger.error('Error fetching messages', error, { component: 'useChatMessages' });
    } else {
      const fetchedMessages = (data || []).reverse();
      setMessages(fetchedMessages);
      setHasMoreMessages(data?.length === MESSAGES_PER_PAGE);
    }
    setLoading(false);
  }, [conversation, currentUser.name, isMultiTenancyEnabled, currentAgencyId, agencyLoading]);

  // Load more (older) messages filtered by current conversation
  const loadMoreMessages = useCallback(async () => {
    const currentMessages = messagesRef.current;
    if (!isSupabaseConfigured() || isLoadingMore || !hasMoreMessages || currentMessages.length === 0 || !conversation) return;

    // FIX: Wait for agency context to be ready when multi-tenancy is enabled
    if (isMultiTenancyEnabled && agencyLoading) {
      return;
    }

    setIsLoadingMore(true);
    const oldestMessage = currentMessages[0];

    // Use composite cursor (created_at + id) to handle tie-breaking for same-timestamp messages
    let query = supabase
      .from('messages')
      .select('*')
      .or(`created_at.lt.${oldestMessage.created_at},and(created_at.eq.${oldestMessage.created_at},id.lt.${oldestMessage.id})`);

    // Add agency filter if multi-tenancy is enabled
    if (isMultiTenancyEnabled && currentAgencyId) {
      query = query.eq('agency_id', currentAgencyId);
    }

    // Filter by conversation type to avoid fetching all messages from the database
    if (conversation.type === 'team') {
      query = query.is('recipient', null);
    } else {
      const otherUser = conversation.userName;
      query = query.or(
        `and(created_by.eq.${currentUser.name},recipient.eq.${otherUser}),and(created_by.eq.${otherUser},recipient.eq.${currentUser.name})`
      );
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PER_PAGE);

    if (error) {
      logger.error('Error loading more messages', error, { component: 'useChatMessages' });
    } else {
      const olderMessages = (data || []).reverse();
      if (olderMessages.length > 0) {
        setMessages(prev => [...olderMessages, ...prev]);
      }
      setHasMoreMessages(data?.length === MESSAGES_PER_PAGE);
    }
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMoreMessages, conversation, currentUser.name, isMultiTenancyEnabled, currentAgencyId, agencyLoading]);

  // Filter messages for current conversation
  const filteredMessages = useMemo(() => {
    if (!conversation) return [];
    let msgs = messages.filter(m => !m.deleted_at);

    if (conversation.type === 'team') {
      msgs = msgs.filter(m => !m.recipient);
    } else {
      const otherUser = conversation.userName;
      msgs = msgs.filter(m =>
        (m.created_by === currentUser.name && m.recipient === otherUser) ||
        (m.created_by === otherUser && m.recipient === currentUser.name)
      );
    }

    // Apply search filter if active
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      msgs = msgs.filter(m =>
        m.text.toLowerCase().includes(query) ||
        m.created_by.toLowerCase().includes(query)
      );
    }

    return msgs;
  }, [messages, conversation, currentUser.name, searchQuery]);

  // Pinned messages for current conversation
  const pinnedMessages = useMemo(() => {
    return filteredMessages.filter(m => m.is_pinned);
  }, [filteredMessages]);

  // Group messages by sender and time
  const groupedMessages = useMemo(() => {
    return filteredMessages.map((msg, idx) => {
      const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null;
      const isGrouped = !!(prevMsg && prevMsg.created_by === msg.created_by &&
        new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 60000 &&
        !msg.reply_to_id);

      return { ...msg, isGrouped };
    });
  }, [filteredMessages]);

  // Handle new message from subscription
  const handleNewMessage = useCallback((newMsg: ChatMessage) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === newMsg.id);
      if (exists) return prev;
      return [...prev, newMsg];
    });
  }, []);

  // Handle message update from subscription
  const handleMessageUpdate = useCallback((updatedMsg: ChatMessage) => {
    setMessages((prev) => prev.map(m =>
      m.id === updatedMsg.id ? updatedMsg : m
    ));
  }, []);

  // Handle message delete from subscription
  const handleMessageDelete = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  // Add reaction to message
  const addReaction = useCallback(async (messageId: string, reaction: TapbackType) => {
    const message = messagesRef.current.find(m => m.id === messageId);
    if (!message) return;

    const currentReactions = message.reactions || [];
    const existingReaction = currentReactions.find(r => r.user === currentUser.name);

    let newReactions: MessageReaction[];

    if (existingReaction?.reaction === reaction) {
      // Remove reaction if clicking same one
      newReactions = currentReactions.filter(r => r.user !== currentUser.name);
    } else if (existingReaction) {
      // Replace existing reaction
      newReactions = currentReactions.map(r =>
        r.user === currentUser.name
          ? { user: currentUser.name, reaction, created_at: new Date().toISOString() }
          : r
      );
    } else {
      // Add new reaction
      newReactions = [...currentReactions, {
        user: currentUser.name,
        reaction,
        created_at: new Date().toISOString()
      }];
    }

    // Optimistic update
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, reactions: newReactions } : m
    ));

    const { error } = await supabase
      .from('messages')
      .update({ reactions: newReactions })
      .eq('id', messageId);

    if (error) {
      logger.error('Error updating reaction', error, { component: 'useChatMessages' });
      // Only rollback the current user's reaction, preserving concurrent changes by others
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        const reactions = (m.reactions || []).filter(r => r.user !== currentUser.name);
        // Re-add the original reaction if the user had one before
        if (existingReaction) {
          reactions.push(existingReaction);
        }
        return { ...m, reactions };
      }));
    }
  }, [currentUser.name]);

  // Edit message
  const editMessage = useCallback(async (messageId: string, newText: string) => {
    const originalMessage = messagesRef.current.find(m => m.id === messageId);
    if (!originalMessage || !newText.trim()) return;

    const updatedMessage = {
      ...originalMessage,
      text: newText.trim(),
      edited_at: new Date().toISOString(),
    };

    // Optimistic update
    setMessages(prev => prev.map(m =>
      m.id === messageId ? updatedMessage : m
    ));

    const { error } = await supabase
      .from('messages')
      .update({ text: newText.trim(), edited_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      logger.error('Error editing message', error, { component: 'useChatMessages' });
      // Rollback
      setMessages(prev => prev.map(m =>
        m.id === messageId ? originalMessage : m
      ));
    }
  }, []);

  // Delete message (soft delete)
  const deleteMessage = useCallback(async (messageId: string) => {
    const originalMessage = messagesRef.current.find(m => m.id === messageId);

    // Optimistic update
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, deleted_at: new Date().toISOString() } : m
    ));

    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      logger.error('Error deleting message', error, { component: 'useChatMessages' });
      // Rollback
      if (originalMessage) {
        setMessages(prev => prev.map(m =>
          m.id === messageId ? originalMessage : m
        ));
      }
    }
  }, []);

  // Toggle pin on message
  const togglePin = useCallback(async (message: ChatMessage) => {
    const isPinned = !message.is_pinned;
    const originalPinState = {
      is_pinned: message.is_pinned,
      pinned_by: message.pinned_by,
      pinned_at: message.pinned_at
    };

    // Optimistic update
    setMessages(prev => prev.map(m =>
      m.id === message.id ? {
        ...m,
        is_pinned: isPinned,
        pinned_by: isPinned ? currentUser.name : null,
        pinned_at: isPinned ? new Date().toISOString() : null
      } : m
    ));

    const { error } = await supabase
      .from('messages')
      .update({
        is_pinned: isPinned,
        pinned_by: isPinned ? currentUser.name : null,
        pinned_at: isPinned ? new Date().toISOString() : null
      })
      .eq('id', message.id);

    if (error) {
      logger.error('Error pinning message', error, { component: 'useChatMessages' });
      // Rollback
      setMessages(prev => prev.map(m =>
        m.id === message.id ? { ...m, ...originalPinState } : m
      ));
    }
  }, [currentUser.name]);

  // Mark messages as read (batched into a single parallel operation)
  const markMessagesAsRead = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    // Filter to only unread messages not created by current user
    // Capture read_by arrays at filter time to avoid race conditions in fallback path
    const unreadEntries = messageIds.map(id => {
      const msg = messagesRef.current.find(m => m.id === id);
      if (!msg || msg.created_by === currentUser.name || (msg.read_by || []).includes(currentUser.name)) {
        return null;
      }
      return { id, readBy: msg.read_by || [] };
    }).filter((entry): entry is { id: string; readBy: string[] } => entry !== null);

    if (unreadEntries.length === 0) return;
    const unreadIds = unreadEntries.map(e => e.id);

    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (unreadIds.includes(m.id)) {
        const readBy = m.read_by || [];
        if (!readBy.includes(currentUser.name)) {
          return { ...m, read_by: [...readBy, currentUser.name] };
        }
      }
      return m;
    }));

    // Batch update: fire all RPC calls in parallel
    try {
      const results = await Promise.all(
        unreadIds.map(messageId =>
          supabase.rpc('mark_message_read', {
            p_message_id: messageId,
            p_user_name: currentUser.name
          })
        )
      );

      // Collect indices of failed RPC calls to fall back for those specific messages
      const failedIndices: number[] = [];
      for (let i = 0; i < results.length; i++) {
        if (results[i]?.error) {
          failedIndices.push(i);
        }
      }

      // Fall back to direct update only for messages whose RPC calls failed
      if (failedIndices.length > 0) {
        const failedEntries = failedIndices.map(i => unreadEntries[i]);
        await Promise.all(
          failedEntries.map(({ id, readBy }) =>
            supabase
              .from('messages')
              .update({ read_by: [...readBy, currentUser.name] })
              .eq('id', id)
          )
        );
      }
    } catch (err) {
      logger.error('Error in markMessagesAsRead', err, { component: 'useChatMessages' });
    }
  }, [currentUser.name]);

  // Mark a single message as unread (remove current user from read_by)
  const markMessageAsUnread = useCallback(async (messageId: string) => {
    const message = messagesRef.current.find(m => m.id === messageId);
    if (!message) return;

    const currentReadBy = message.read_by || [];
    if (!currentReadBy.includes(currentUser.name)) return; // Already unread

    const newReadBy = currentReadBy.filter(name => name !== currentUser.name);

    // Optimistic update
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, read_by: newReadBy } : m
    ));

    // Database update
    const { error } = await supabase
      .from('messages')
      .update({ read_by: newReadBy })
      .eq('id', messageId);

    if (error) {
      logger.error('Error marking message as unread', error, { component: 'useChatMessages' });
      // Rollback
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, read_by: currentReadBy } : m
      ));
    }
  }, [currentUser.name]);

  return {
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
    markMessageAsUnread,
    handleNewMessage,
    handleMessageUpdate,
    handleMessageDelete,
    messagesRef,
  };
}
