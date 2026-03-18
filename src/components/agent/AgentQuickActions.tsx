'use client';

import { PlusCircle, Users, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AgentQuickActionsProps {
  onActionClick: (prompt: string) => void;
}

export function AgentQuickActions({ onActionClick }: AgentQuickActionsProps) {
  const actions = [
    {
      icon: <PlusCircle className="h-4 w-4" />,
      label: 'Create Task',
      prompt: 'Create a task for ',
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: 'Find Customers',
      prompt: 'Find customers who ',
    },
    {
      icon: <BarChart3 className="h-4 w-4" />,
      label: 'Team Workload',
      prompt: 'Show team workload and task distribution',
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(action => (
        <Button
          key={action.label}
          variant="secondary"
          size="sm"
          onClick={() => onActionClick(action.prompt)}
          className="flex items-center gap-1.5 text-xs"
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
    </div>
  );
}
