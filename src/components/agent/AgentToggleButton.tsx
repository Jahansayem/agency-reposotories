'use client';

import { useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { AgentUsage } from '@/types/agent';

interface AgentToggleButtonProps {
  onClick: () => void;
  usage: AgentUsage;
  budgetLimit?: number;
}

const DEFAULT_BUDGET = 100000; // Default token budget

export function AgentToggleButton({
  onClick,
  usage,
  budgetLimit = DEFAULT_BUDGET,
}: AgentToggleButtonProps) {
  const totalTokens = usage.inputTokens + usage.outputTokens;
  const usagePercent = (totalTokens / budgetLimit) * 100;
  const showWarning = usagePercent > 80;

  // Keyboard shortcut: Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClick]);

  return (
    <div className="fixed bottom-6 right-6 z-30">
      <Button
        onClick={onClick}
        className="relative h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
        aria-label="Open AI Assistant (Cmd+K)"
        title="Open AI Assistant (Cmd+K)"
      >
        <MessageCircle className="h-6 w-6 text-white" />

        {showWarning && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 border-2 border-white animate-pulse" />
        )}
      </Button>

      {/* Keyboard hint tooltip */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
        Cmd+K
      </div>
    </div>
  );
}
