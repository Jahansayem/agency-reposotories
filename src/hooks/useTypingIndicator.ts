'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@/types/todo';
import { logger } from '@/lib/logger';

/**
 * useTypingIndicator Hook
 * Sprint 3 Issue #38: Enhanced Typing Indicators
 *
 * Tracks and broadcasts typing status in real-time using Supabase Realtime.
 * Shows "User is typing..." indicators with debouncing to reduce broadcasts.
 *
 * Usage:
 * ```tsx
 * const { typingUsers, setTyping } = useTypingIndicator(currentUser, 'chat');
 * ```
 */

interface TypingState {
  user: string;
  userId: string;
  color: string;
  channel: string; // 'chat' | 'task:{id}' | 'dm:{userId}'
  timestamp: number;
}

interface UseTypingIndicatorOptions {
  channel?: string; // Typing channel (default: 'chat')
  debounceMs?: number; // Debounce time (default: 300ms)
  timeoutMs?: number; // Clear typing after (default: 3000ms)
}

export function useTypingIndicator(
  currentUser?: User,
  options: UseTypingIndicatorOptions = {}
) {
  const {
    channel = 'chat',
    debounceMs = 300,
    timeoutMs = 3000,
  } = options;

  const [typingUsers, setTypingUsers] = useState<TypingState[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  /**
   * Broadcast typing status
   */
  const broadcastTyping = useCallback(
    async (typing: boolean) => {
      if (!currentUser || !channelRef.current) return;

      try {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            user: currentUser.name,
            userId: currentUser.id,
            color: currentUser.color,
            channel,
            typing,
            timestamp: Date.now(),
          },
        });
      } catch (error) {
        logger.error('Failed to broadcast typing status', error as Error, { component: 'useTypingIndicator', action: 'broadcastTyping', channel, typing });
      }
    },
    [currentUser, channel]
  );

  /**
   * Set typing status (debounced)
   * Call this when user types in input field
   */
  const setTyping = useCallback(
    (typing: boolean) => {
      // Clear existing timers
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      setIsTyping(typing);

      if (typing) {
        // Debounce typing broadcast (don't spam on every keystroke)
        debounceTimerRef.current = setTimeout(() => {
          broadcastTyping(true);

          // Auto-clear typing after timeout
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            broadcastTyping(false);
          }, timeoutMs);
        }, debounceMs);
      } else {
        // Immediately stop typing
        broadcastTyping(false);
      }
    },
    [broadcastTyping, debounceMs, timeoutMs]
  );

  /**
   * Setup Realtime channel for typing indicators
   */
  useEffect(() => {
    if (!currentUser) return;

    const typingChannel = supabase.channel(`typing:${channel}`);

    typingChannel
      .on('broadcast', { event: 'typing' }, (payload: { payload: TypingState & { typing: boolean } }) => {
        const { user, userId, color, typing, timestamp } = payload.payload;

        // Ignore own typing broadcasts
        if (userId === currentUser.id) return;

        setTypingUsers((prev) => {
          if (typing) {
            // Add or update typing user
            const existing = prev.find((u) => u.userId === userId);
            if (existing) {
              return prev.map((u) =>
                u.userId === userId ? { ...u, timestamp } : u
              );
            } else {
              return [
                ...prev,
                { user, userId, color, channel, timestamp },
              ];
            }
          } else {
            // Remove user from typing
            return prev.filter((u) => u.userId !== userId);
          }
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📝 Subscribed to typing indicators:', channel);
        }
      });

    channelRef.current = typingChannel;

    // Cleanup stale typing indicators (users who stopped typing without broadcast)
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) =>
        prev.filter((u) => now - u.timestamp < timeoutMs + 1000)
      );
    }, 1000);

    return () => {
      // Stop typing on unmount
      if (isTyping) {
        broadcastTyping(false);
      }

      // Clear timers
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      clearInterval(cleanupInterval);

      // Unsubscribe from channel
      supabase.removeChannel(typingChannel);
      channelRef.current = null;
    };
  }, [currentUser, channel, timeoutMs, isTyping, broadcastTyping]);

  return {
    /**
     * Users currently typing (excluding current user)
     */
    typingUsers,

    /**
     * Current user's typing status
     */
    isTyping,

    /**
     * Set typing status
     * Call with true when user starts typing, false when stops
     */
    setTyping,
  };
}
