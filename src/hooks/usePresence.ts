'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * usePresence Hook
 * Sprint 3 Issue #37: Real-Time Presence Indicators
 *
 * Tracks which users are currently online and viewing the app
 * Uses Supabase Realtime Presence for distributed state management
 *
 * Features:
 * - Real-time online/offline status
 * - Automatic heartbeat to maintain presence
 * - Graceful cleanup on disconnect
 * - User location tracking (which view they're on)
 */

export interface PresenceState {
  user: string;
  userId: string;
  color: string;
  online_at: string;
  location?: string; // 'dashboard' | 'tasks' | 'chat' | 'activity' | 'goals'
}

export interface OnlineUser {
  user: string;
  userId: string;
  color: string;
  onlineAt: Date;
  location?: string;
}

export function usePresence(currentUser?: { name: string; id: string; color: string }, location?: string) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    // Create presence channel
    const presenceChannel = supabase.channel('online-users', {
      config: {
        presence: {
          key: currentUser.id, // Use user ID as unique key
        },
      },
    });

    // Track presence changes
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();

        // Convert presence state to array of online users
        const users: OnlineUser[] = [];

        Object.keys(state).forEach((userId) => {
          const presences = state[userId] as unknown as PresenceState[];
          if (presences && presences.length > 0) {
            // Take the most recent presence
            const presence = presences[0];
            users.push({
              user: presence.user,
              userId: presence.userId,
              color: presence.color,
              onlineAt: new Date(presence.online_at),
              location: presence.location,
            });
          }
        });

        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track this user's presence
          await presenceChannel.track({
            user: currentUser.name,
            userId: currentUser.id,
            color: currentUser.color,
            online_at: new Date().toISOString(),
            location: location || 'tasks',
          });
        }
      });

    setChannel(presenceChannel);

    // Cleanup
    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
    };
  }, [currentUser?.id, currentUser?.name, currentUser?.color, location]);

  // Update location when it changes
  useEffect(() => {
    if (!channel || !currentUser) return;

    channel.track({
      user: currentUser.name,
      userId: currentUser.id,
      color: currentUser.color,
      online_at: new Date().toISOString(),
      location: location || 'tasks',
    });
  }, [location, channel, currentUser]);

  return {
    onlineUsers,
    onlineCount: onlineUsers.length,
  };
}
