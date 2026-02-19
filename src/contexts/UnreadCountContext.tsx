'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useAgency } from '@/contexts/AgencyContext';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

interface UnreadCountContextType {
  /** Number of unread chat messages */
  unreadCount: number;
  /** Manually refresh the unread count */
  refreshUnreadCount: () => void;
}

const UnreadCountContext = createContext<UnreadCountContextType | undefined>(undefined);

// ============================================
// Provider Component
// ============================================

interface UnreadCountProviderProps {
  children: ReactNode;
  currentUserName: string;
}

export function UnreadCountProvider({ children, currentUserName }: UnreadCountProviderProps) {
  const { currentAgencyId, isMultiTenancyEnabled } = useAgency();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!isSupabaseConfigured() || !currentUserName) return;

    try {
      // Only count messages from the last 7 days to avoid inflating count
      // with historical messages that predate read-tracking
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      let query = supabase
        .from('messages')
        .select('id, read_by, recipient, created_by')
        .not('created_by', 'eq', currentUserName)
        .is('deleted_at', null)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (isMultiTenancyEnabled && currentAgencyId) {
        query = query.eq('agency_id', currentAgencyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const unread = data?.filter((msg) => {
        if (msg.read_by?.includes(currentUserName)) return false;
        // Team message (no recipient)
        if (!msg.recipient) return true;
        // DM to current user
        if (msg.recipient === currentUserName) return true;
        return false;
      }).length || 0;

      setUnreadCount(unread);
    } catch (err) {
      logger.error('Error fetching unread count', err as Error, {
        component: 'UnreadCountContext',
        action: 'fetchUnreadCount',
        userName: currentUserName,
      });
    }
  }, [currentUserName, currentAgencyId, isMultiTenancyEnabled]);

  const refreshUnreadCount = useCallback(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Fetch initial count and set up real-time subscription
  useEffect(() => {
    if (!isSupabaseConfigured() || !currentUserName) return;

    fetchUnreadCount();

    const channelName = isMultiTenancyEnabled && currentAgencyId
      ? `unread-count-messages-${currentAgencyId}`
      : 'unread-count-messages';

    const subscriptionConfig: {
      event: '*';
      schema: 'public';
      table: 'messages';
      filter?: string;
    } = {
      event: '*',
      schema: 'public',
      table: 'messages',
    };

    if (isMultiTenancyEnabled && currentAgencyId) {
      subscriptionConfig.filter = `agency_id=eq.${currentAgencyId}`;
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', subscriptionConfig, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserName, currentAgencyId, isMultiTenancyEnabled, fetchUnreadCount]);

  return (
    <UnreadCountContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </UnreadCountContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useUnreadCount(): UnreadCountContextType {
  const context = useContext(UnreadCountContext);
  if (context === undefined) {
    throw new Error('useUnreadCount must be used within an UnreadCountProvider');
  }
  return context;
}
