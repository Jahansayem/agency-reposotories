/**
 * TableView - Table view component for Strategic Goals
 *
 * Extracted from StrategicDashboard.tsx to improve maintainability.
 * Displays goals in a table format with sortable columns.
 */

'use client';

import { Circle, Clock, Pause, CheckCircle2, XCircle } from 'lucide-react';
import {
  StrategicGoal,
  GoalCategory,
  GoalStatus,
  GOAL_STATUS_CONFIG,
  GOAL_PRIORITY_CONFIG,
} from '@/types/todo';

// Status icons mapping
const statusIcons: Record<GoalStatus, React.ReactNode> = {
  not_started: <Circle className="w-4 h-4" />,
  in_progress: <Clock className="w-4 h-4" />,
  on_hold: <Pause className="w-4 h-4" />,
  completed: <CheckCircle2 className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />,
};

interface TableViewProps {
  goals: StrategicGoal[];
  categories: GoalCategory[];
  darkMode: boolean;
  onEdit?: (goal: StrategicGoal) => void;
  onStatusChange?: (id: string, status: GoalStatus) => void;
}

export function TableView({ goals, categories, darkMode, onEdit, onStatusChange }: TableViewProps) {
  return (
    <div className={`rounded-xl border overflow-hidden ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
      <table className="w-full">
        <thead>
          <tr className={darkMode ? 'bg-slate-800' : 'bg-slate-50'}>
            <th className={`text-left px-4 py-3 text-xs font-medium uppercase tracking-wider ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>Goal</th>
            <th className={`text-left px-4 py-3 text-xs font-medium uppercase tracking-wider ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>Status</th>
            <th className={`text-left px-4 py-3 text-xs font-medium uppercase tracking-wider ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>Category</th>
            <th className={`text-left px-4 py-3 text-xs font-medium uppercase tracking-wider ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>Priority</th>
            <th className={`text-left px-4 py-3 text-xs font-medium uppercase tracking-wider ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>Due Date</th>
            <th className={`text-left px-4 py-3 text-xs font-medium uppercase tracking-wider ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>Progress</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
          {goals.map(goal => {
            const category = categories.find(c => c.id === goal.category_id);
            const statusConfig = GOAL_STATUS_CONFIG[goal.status];
            const priorityConfig = GOAL_PRIORITY_CONFIG[goal.priority];

            return (
              <tr
                key={goal.id}
                className={`cursor-pointer transition-colors ${
                  darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                }`}
                onClick={() => onEdit?.(goal)}
              >
                <td className="px-4 py-3">
                  <span className={`font-medium ${
                    goal.status === 'completed' ? 'line-through opacity-60' : darkMode ? 'text-white' : 'text-slate-800'
                  }`}>{goal.title}</span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const statuses: GoalStatus[] = ['not_started', 'in_progress', 'on_hold', 'completed', 'cancelled'];
                      const currentIndex = statuses.indexOf(goal.status);
                      const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                      onStatusChange?.(goal.id, nextStatus);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all hover:scale-105"
                    style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
                  >
                    {statusIcons[goal.status]}
                    {statusConfig.label}
                  </button>
                </td>
                <td className="px-4 py-3">
                  {category ? (
                    <span className="px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: category.color + '15', color: category.color }}>
                      {category.name}
                    </span>
                  ) : <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: priorityConfig.bgColor, color: priorityConfig.color }}>
                    {priorityConfig.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {goal.target_date ? (
                    <span className={`text-sm ${
                      new Date(goal.target_date) < new Date() && goal.status !== 'completed'
                        ? 'text-red-500' : darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                      {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  ) : <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-16 h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div className="h-full rounded-full bg-gradient-to-r from-[#0033A0] to-[#D4A853]" style={{ width: `${goal.progress_percent}%` }} />
                    </div>
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{goal.progress_percent}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
