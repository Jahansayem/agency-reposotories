'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { ChatMessage, PresenceStatus } from '@/types/todo';
import { logger } from '@/lib/logger';
import { parseChatMessage } from '@/lib/validators';

interface UseChatSubscriptionOptions {
  currentUserName: string;
  isDndMode: boolean;
  onNewMessage?: (message: ChatMessage) => void;
  onTypingUpdate?: (user: string, isTyping: boolean) => void;
  onPresenceUpdate?: (user: string, status: PresenceStatus) => void;
}

interface UseChatSubscriptionReturn {
  connected: boolean;
  tableExists: boolean;
  typingChannelRef: React.RefObject<ReturnType<typeof supabase.channel> | null>;
  presenceChannelRef: React.RefObject<ReturnType<typeof supabase.channel> | null>;
  broadcastTyping: (conversationKey: string | null) => void;
  sendPresenceUpdate: () => void;
}

const PRESENCE_TIMEOUT_MS = 60000; // Mark offline after 60 seconds without presence

/**
 * Hook for managing chat real-time subscriptions
 * Handles messages, typing indicators, and presence
 */
export function useChatSubscription({
  currentUserName,
  isDndMode,
  onNewMessage,
  onTypingUpdate,
  onPresenceUpdate,
}: UseChatSubscriptionOptions): UseChatSubscriptionReturn {
  const [connected, setConnected] = useState(false);
  const [tableExists, setTableExists] = useState(true);

  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastTypingBroadcastRef = useRef<number>(0);
  const lastPresenceTimestamps = useRef<Map<string, number>>(new Map());
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track refs for callbacks to avoid stale closures
  const onNewMessageRef = useRef(onNewMessage);
  const onTypingUpdateRef = useRef(onTypingUpdate);
  const onPresenceUpdateRef = useRef(onPresenceUpdate);

  useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);
  useEffect(() => { onTypingUpdateRef.current = onTypingUpdate; }, [onTypingUpdate]);
  useEffect(() => { onPresenceUpdateRef.current = onPresenceUpdate; }, [onPresenceUpdate]);

  // Broadcast typing indicator (throttled)
  const broadcastTyping = useCallback((conversationKey: string | null) => {
    const now = Date.now();
    if (now - lastTypingBroadcastRef.current > 2000 && typingChannelRef.current) {
      lastTypingBroadcastRef.current = now;
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user: currentUserName, conversation: conversationKey }
      });
    }
  }, [currentUserName]);

  // Send presence update
  const sendPresenceUpdate = useCallback(() => {
    if (presenceChannelRef.current) {
      presenceChannelRef.current.send({
        type: 'broadcast',
        event: 'presence',
        payload: {
          user: currentUserName,
          status: isDndMode ? 'dnd' : 'online',
          timestamp: Date.now()
        }
      });
    }
  }, [currentUserName, isDndMode]);

  // Update presence periodically
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    presenceIntervalRef.current = setInterval(sendPresenceUpdate, 30000);

    return () => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
    };
  }, [sendPresenceUpdate]);

  // Check for stale presence and mark users offline after timeout
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const checkStalePresence = () => {
      const now = Date.now();
      const staleUsers: string[] = [];

      lastPresenceTimestamps.current.forEach((timestamp, userName) => {
        if (now - timestamp > PRESENCE_TIMEOUT_MS) {
          staleUsers.push(userName);
        }
      });

      if (staleUsers.length > 0) {
        staleUsers.forEach(user => {
          onPresenceUpdateRef.current?.(user, 'offline');
        });
      }
    };

    const presenceCheckInterval = setInterval(checkStalePresence, 15000);

    return () => {
      clearInterval(presenceCheckInterval);
    };
  }, []);

  // Real-time subscription for messages, typing, and presence
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const messagesChannel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // BUGFIX TYPE-002: Validate payload instead of dangerous cast
            const newMsg = parseChatMessage(payload.new);
            if (!newMsg) {
              logger.warn('Invalid chat message payload received', { payload: payload.new, component: 'useChatSubscription' });
              return;
            }
            onNewMessageRef.current?.(newMsg);

            // Clear typing indicator for sender
            onTypingUpdateRef.current?.(newMsg.created_by, false);
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
        if (status === 'CHANNEL_ERROR') {
          setTableExists(false);
        }
      });

    // Typing indicator channel
    const typingChannel = supabase
      .channel('typing-channel')
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user !== currentUserName) {
          onTypingUpdateRef.current?.(payload.user, true);

          // Clear any existing timeout for this user
          const existingTimeout = typingTimeoutsRef.current.get(payload.user);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          // Set new timeout and store reference
          const timeout = setTimeout(() => {
            onTypingUpdateRef.current?.(payload.user, false);
            typingTimeoutsRef.current.delete(payload.user);
          }, 3000);
          typingTimeoutsRef.current.set(payload.user, timeout);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          typingChannelRef.current = typingChannel;
        }
      });

    // Presence channel
    const presenceChannel = supabase
      .channel('presence-channel')
      .on('broadcast', { event: 'presence' }, ({ payload }) => {
        if (payload.user !== currentUserName) {
          onPresenceUpdateRef.current?.(payload.user, payload.status);
          lastPresenceTimestamps.current.set(payload.user, payload.timestamp || Date.now());
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          presenceChannelRef.current = presenceChannel;
          // Send initial presence
          presenceChannel.send({
            type: 'broadcast',
            event: 'presence',
            payload: {
              user: currentUserName,
              status: isDndMode ? 'dnd' : 'online',
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
      // Clean up all typing timeouts
      typingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
    };
  }, [currentUserName, isDndMode]);

  return {
    connected,
    tableExists,
    typingChannelRef,
    presenceChannelRef,
    broadcastTyping,
    sendPresenceUpdate,
  };
}
