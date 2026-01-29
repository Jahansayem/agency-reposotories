'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Check, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

type SyncStatus = 'connected' | 'connecting' | 'disconnected' | 'syncing';

interface SyncStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export default function SyncStatusIndicator({ className = '', showLabel = false }: SyncStatusIndicatorProps) {
  const [status, setStatus] = useState<SyncStatus>('connecting');
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setStatus('disconnected');
      return;
    }

    // Create a presence channel to track connection status
    const channel = supabase.channel('sync-status-indicator');

    channel
      .on('presence', { event: 'sync' }, () => {
        setStatus('connected');
      })
      .subscribe(async (state) => {
        if (state === 'SUBSCRIBED') {
          setStatus('connected');
          // Track presence to verify connection is active
          await channel.track({ online: true });
        } else if (state === 'CHANNEL_ERROR') {
          setStatus('disconnected');
        } else if (state === 'CLOSED') {
          setStatus('disconnected');
        } else {
          setStatus('connecting');
        }
      });

    // Show indicator briefly on mount to confirm sync is active
    setShowIndicator(true);
    const hideTimer = setTimeout(() => {
      setShowIndicator(false);
    }, 3000);

    // Cleanup
    return () => {
      clearTimeout(hideTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  // Show indicator on hover or when there's an issue
  const handleMouseEnter = () => setShowIndicator(true);
  const handleMouseLeave = () => {
    // Keep showing if disconnected
    if (status === 'connected') {
      setShowIndicator(false);
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: showIndicator ? <Wifi className="w-3.5 h-3.5" /> : <Check className="w-3 h-3" />,
          color: 'var(--success)',
          bgColor: 'var(--success-light)',
          label: 'Live',
          dotColor: 'bg-green-500',
        };
      case 'connecting':
        return {
          icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
          color: 'var(--warning)',
          bgColor: 'var(--warning-light)',
          label: 'Connecting...',
          dotColor: 'bg-yellow-500',
        };
      case 'syncing':
        return {
          icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
          color: 'var(--accent)',
          bgColor: 'var(--accent-light)',
          label: 'Syncing...',
          dotColor: 'bg-blue-500',
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="w-3.5 h-3.5" />,
          color: 'var(--danger)',
          bgColor: 'var(--danger-light)',
          label: 'Offline',
          dotColor: 'bg-red-500',
        };
    }
  };

  const config = getStatusConfig();

  // Always visible dot for connected status, expanded on hover/issue
  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AnimatePresence mode="wait">
        {showIndicator || status !== 'connected' ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.8, width: 24 }}
            animate={{ opacity: 1, scale: 1, width: 'auto' }}
            exit={{ opacity: 0, scale: 0.8, width: 24 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: config.bgColor,
              color: config.color,
            }}
          >
            {config.icon}
            {showLabel && (
              <span className="whitespace-nowrap">{config.label}</span>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="dot"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className={`w-2 h-2 rounded-full ${config.dotColor}`}
            title={config.label}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
