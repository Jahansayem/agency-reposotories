'use client';

import { memo } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  connected: boolean;
}

function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div className="fixed bottom-6 right-6 z-30">
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-[var(--shadow-md)] backdrop-blur-sm ${
        connected
          ? 'bg-[var(--success-light)] text-[var(--success)] border border-[var(--success)]/20'
          : 'bg-[var(--danger-light)] text-[var(--danger)] border border-[var(--danger)]/20'
      }`}>
        {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {connected ? 'Live' : 'Offline'}
      </div>
    </div>
  );
}

export default memo(ConnectionStatus);
