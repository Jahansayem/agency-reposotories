'use client';

import { memo } from 'react';
import { AlertTriangle, WifiOff, ServerCrash, RefreshCw } from 'lucide-react';

type ErrorVariant = 'setup' | 'network' | 'api' | 'auth' | 'permission';

interface ErrorStateProps {
  error: string;
  variant?: ErrorVariant;
  onRetry?: () => void;
}

const variantConfig = {
  setup: {
    icon: AlertTriangle,
    title: 'Setup Required',
    actionLabel: null,
    helpText: 'See SETUP.md for instructions',
  },
  network: {
    icon: WifiOff,
    title: 'Connection Lost',
    actionLabel: 'Retry',
    helpText: 'Check your internet connection and try again',
  },
  api: {
    icon: ServerCrash,
    title: 'Server Error',
    actionLabel: 'Retry',
    helpText: 'The server encountered an error. Please try again.',
  },
  auth: {
    icon: AlertTriangle,
    title: 'Authentication Failed',
    actionLabel: null,
    helpText: 'Please sign in again to continue',
  },
  permission: {
    icon: AlertTriangle,
    title: 'Access Denied',
    actionLabel: null,
    helpText: 'You do not have permission to access this resource',
  },
};

function ErrorState({ error, variant = 'setup', onRetry }: ErrorStateProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)]">
      <div className="p-8 rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] border border-[var(--border)] bg-[var(--surface)] max-w-md w-full text-center">
        <div className="w-16 h-16 bg-[var(--danger-light)] rounded-[var(--radius-2xl)] flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-[var(--danger)]" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-[var(--foreground)]">{config.title}</h2>
        <p className="text-sm mb-4 text-[var(--text-muted)]">{error}</p>
        {config.helpText && (
          <p className="text-xs text-[var(--text-light)] mb-4">{config.helpText}</p>
        )}
        {config.actionLabel && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] bg-[var(--accent)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" />
            {config.actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(ErrorState);
