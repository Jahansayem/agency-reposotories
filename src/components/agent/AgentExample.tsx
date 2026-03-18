'use client';

import { useState } from 'react';
import { AgentPanel } from './AgentPanel';
import { AgentToggleButton } from './AgentToggleButton';
import { useAgent } from '@/hooks/useAgent';

/**
 * Example integration of Agent UI components
 *
 * Usage:
 * ```tsx
 * import { AgentExample } from '@/components/agent/AgentExample';
 *
 * function MyApp() {
 *   return <AgentExample />;
 * }
 * ```
 */
export function AgentExample() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { usage } = useAgent();

  return (
    <>
      <AgentToggleButton
        onClick={() => setIsPanelOpen(true)}
        usage={usage}
      />

      <AgentPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onMinimize={() => setIsPanelOpen(false)}
      />
    </>
  );
}
