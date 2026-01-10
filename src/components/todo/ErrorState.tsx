'use client';

import { memo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  error: string;
}

function ErrorState({ error }: ErrorStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)]">
      <div className="p-8 rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] border border-[var(--border)] bg-[var(--surface)] max-w-md w-full text-center">
        <div className="w-16 h-16 bg-[var(--danger-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-[var(--danger)]" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-[var(--foreground)]">Setup Required</h2>
        <p className="text-sm mb-4 text-[var(--text-muted)]">{error}</p>
        <p className="text-xs text-[var(--text-light)]">See SETUP.md for instructions</p>
      </div>
    </div>
  );
}

export default memo(ErrorState);
