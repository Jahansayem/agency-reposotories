'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@/types/todo';
import { logger } from '@/lib/logger';

/**
 * useReadReceipts Hook
 * Sprint 3 Issue #39: Read Receipts
 *
 * Tracks which users have read which messages.
 * Syncs read status in real-time across all clients.
 *
 * Usage:
 * ```tsx
 * const { markAsRead, getReadBy, isReadByUser } = useReadReceipts(currentUser);
 * ```
 */

interface ReadReceipt {
  message_id: string;
  user_id: string;
  user_name: string;
  read_at: string;
}

interface ReadStatus {
  readBy: string[]; // User names who have read the message
  readCount: number;
  readAt: Record<string, string>; // user_name -> timestamp
}

export function useReadReceipts(currentUser?: User) {
  const [readReceipts, setReadReceipts] = useState<Map<string, ReadStatus>>(new Map());
  const channelRef = useRef<any>(null);

  /**
   * Mark a message as read by current user
   */
  const markAsRead = useCallback(
    async (messageId: string) => {
      if (!currentUser) return;

      try {
        // Check if already marked as read
        const existing = readReceipts.get(messageId);
        if (existing?.readBy.includes(currentUser.name)) {
          return; // Already read
        }

        // Insert read receipt
        const { error } = await supabase.from('message_read_receipts').insert({
          message_id: messageId,
          user_id: currentUser.id,
          user_name: currentUser.name,
          read_at: new Date().toISOString(),
        });

        if (error && !error.message.includes('duplicate')) {
          throw error;
        }

        // Update local state
        setReadReceipts((prev) => {
          const newMap = new Map(prev);
          const current = newMap.get(messageId) || {
            readBy: [],
            readCount: 0,
            readAt: {},
          };

          newMap.set(messageId, {
            readBy: [...current.readBy, currentUser.name],
            readCount: current.readCount + 1,
            readAt: {
              ...current.readAt,
              [currentUser.name]: new Date().toISOString(),
            },
          });

          return newMap;
        });

        // Broadcast read event
        if (channelRef.current) {
          await channelRef.current.send({
            type: 'broadcast',
            event: 'message_read',
            payload: {
              message_id: messageId,
              user_id: currentUser.id,
              user_name: currentUser.name,
              read_at: new Date().toISOString(),
            },
          });
        }
      } catch (error) {
        logger.error('Failed to mark message as read', error as Error, { component: 'useReadReceipts', action: 'markAsRead', messageId });
      }
    },
    [currentUser, readReceipts]
  );

  /**
   * Mark multiple messages as read (batch operation)
   */
  const markMultipleAsRead = useCallback(
    async (messageIds: string[]) => {
      if (!currentUser || messageIds.length === 0) return;

      try {
        // Filter out already-read messages
        const unreadIds = messageIds.filter((id) => {
          const status = readReceipts.get(id);
          return !status?.readBy.includes(currentUser.name);
        });

        if (unreadIds.length === 0) return;

        // Batch insert
        const receipts = unreadIds.map((id) => ({
          message_id: id,
          user_id: currentUser.id,
          user_name: currentUser.name,
          read_at: new Date().toISOString(),
        }));

        const { error } = await supabase.from('message_read_receipts').insert(receipts);

        if (error && !error.message.includes('duplicate')) {
          throw error;
        }

        // Update local state
        setReadReceipts((prev) => {
          const newMap = new Map(prev);

          unreadIds.forEach((id) => {
            const current = newMap.get(id) || {
              readBy: [],
              readCount: 0,
              readAt: {},
            };

            newMap.set(id, {
              readBy: [...current.readBy, currentUser.name],
              readCount: current.readCount + 1,
              readAt: {
                ...current.readAt,
                [currentUser.name]: new Date().toISOString(),
              },
            });
          });

          return newMap;
        });

        // Broadcast batch read event
        if (channelRef.current) {
          await channelRef.current.send({
            type: 'broadcast',
            event: 'messages_read',
            payload: {
              message_ids: unreadIds,
              user_id: currentUser.id,
              user_name: currentUser.name,
              read_at: new Date().toISOString(),
            },
          });
        }
      } catch (error) {
        logger.error('Failed to mark messages as read', error as Error, { component: 'useReadReceipts', action: 'markMultipleAsRead', messageCount: messageIds.length });
      }
    },
    [currentUser, readReceipts]
  );

  /**
   * Get read status for a message
   */
  const getReadStatus = useCallback(
    (messageId: string): ReadStatus => {
      return readReceipts.get(messageId) || {
        readBy: [],
        readCount: 0,
        readAt: {},
      };
    },
    [readReceipts]
  );

  /**
   * Check if a specific user has read a message
   */
  const isReadByUser = useCallback(
    (messageId: string, userName: string): boolean => {
      const status = readReceipts.get(messageId);
      return status?.readBy.includes(userName) || false;
    },
    [readReceipts]
  );

  /**
   * Get total read count for a message
   */
  const getReadCount = useCallback(
    (messageId: string): number => {
      const status = readReceipts.get(messageId);
      return status?.readCount || 0;
    },
    [readReceipts]
  );

  /**
   * Load read receipts from database
   */
  const loadReadReceipts = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('message_read_receipts')
        .select('*')
        .in('message_id', messageIds);

      if (error) throw error;

      // Group by message_id
      const grouped = new Map<string, ReadStatus>();

      (data || []).forEach((receipt: ReadReceipt) => {
        const current = grouped.get(receipt.message_id) || {
          readBy: [],
          readCount: 0,
          readAt: {},
        };

        current.readBy.push(receipt.user_name);
        current.readCount++;
        current.readAt[receipt.user_name] = receipt.read_at;

        grouped.set(receipt.message_id, current);
      });

      setReadReceipts(grouped);
    } catch (error) {
      logger.error('Failed to load read receipts', error as Error, { component: 'useReadReceipts', action: 'loadReadReceipts', messageCount: messageIds.length });
    }
  }, []);

  /**
   * Setup Realtime channel for read receipt broadcasts
   */
  useEffect(() => {
    if (!currentUser) return;

    const readReceiptsChannel = supabase.channel('read-receipts');

    readReceiptsChannel
      .on('broadcast', { event: 'message_read' }, (payload: { payload: ReadReceipt }) => {
        const { message_id, user_name, read_at } = payload.payload;

        // Update local state
        setReadReceipts((prev) => {
          const newMap = new Map(prev);
          const current = newMap.get(message_id) || {
            readBy: [],
            readCount: 0,
            readAt: {},
          };

          // Avoid duplicates
          if (current.readBy.includes(user_name)) {
            return prev;
          }

          newMap.set(message_id, {
            readBy: [...current.readBy, user_name],
            readCount: current.readCount + 1,
            readAt: {
              ...current.readAt,
              [user_name]: read_at,
            },
          });

          return newMap;
        });
      })
      .on('broadcast', { event: 'messages_read' }, (payload: { payload: { message_ids: string[]; user_name: string; read_at: string } }) => {
        const { message_ids, user_name, read_at } = payload.payload;

        // Update local state for multiple messages
        setReadReceipts((prev) => {
          const newMap = new Map(prev);

          message_ids.forEach((message_id) => {
            const current = newMap.get(message_id) || {
              readBy: [],
              readCount: 0,
              readAt: {},
            };

            // Avoid duplicates
            if (current.readBy.includes(user_name)) {
              return;
            }

            newMap.set(message_id, {
              readBy: [...current.readBy, user_name],
              readCount: current.readCount + 1,
              readAt: {
                ...current.readAt,
                [user_name]: read_at,
              },
            });
          });

          return newMap;
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📬 Subscribed to read receipts');
        }
      });

    channelRef.current = readReceiptsChannel;

    return () => {
      supabase.removeChannel(readReceiptsChannel);
      channelRef.current = null;
    };
  // BUGFIX: Use currentUser?.id instead of entire object to prevent infinite re-subscriptions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  return {
    /**
     * Mark a message as read by current user
     */
    markAsRead,

    /**
     * Mark multiple messages as read (batch)
     */
    markMultipleAsRead,

    /**
     * Get read status for a message
     */
    getReadStatus,

    /**
     * Check if a specific user has read a message
     */
    isReadByUser,

    /**
     * Get total read count for a message
     */
    getReadCount,

    /**
     * Load read receipts from database for given message IDs
     */
    loadReadReceipts,

    /**
     * All read receipts (Map of message_id -> ReadStatus)
     */
    readReceipts,
  };
}
