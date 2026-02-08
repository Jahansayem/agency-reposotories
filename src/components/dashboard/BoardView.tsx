/**
 * BoardView - Kanban board view component for Strategic Goals
 *
 * Extracted from StrategicDashboard.tsx to improve maintainability.
 * Displays goals in a Kanban board format with status columns.
 */

'use client';

import { motion } from 'framer-motion';
import { Circle, Clock, CheckCircle2 } from 'lucide-react';
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
  on_hold: <Circle className="w-4 h-4" />,
  completed: <CheckCircle2 className="w-4 h-4" />,
  cancelled: <Circle className="w-4 h-4" />,
};

interface BoardViewProps {
  goalsByStatus: Record<GoalStatus, StrategicGoal[]>;
  categories: GoalCategory[];
  darkMode: boolean;
  onEdit?: (goal: StrategicGoal) => void;
  onStatusChange?: (id: string, status: GoalStatus) => void;
}

export function BoardView({ goalsByStatus, categories, darkMode, onEdit }: BoardViewProps) {
  const visibleStatuses: GoalStatus[] = ['not_started', 'in_progress', 'completed'];

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {visibleStatuses.map(status => {
        const config = GOAL_STATUS_CONFIG[status];
        const goals = goalsByStatus[status];

        return (
          <div
            key={status}
            className={`flex-shrink-0 w-80 flex flex-col rounded-xl ${
              darkMode ? 'bg-slate-800/30' : 'bg-slate-50'
            }`}
          >
            <div className={`p-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <span style={{ color: config.color }}>{statusIcons[status]}</span>
                <h3 className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  {config.label}
                </h3>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                  darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
                }`}>
                  {goals.length}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {goals.map(goal => {
                const category = categories.find(c => c.id === goal.category_id);
                const priorityConfig = GOAL_PRIORITY_CONFIG[goal.priority];

                return (
                  <motion.div
                    key={goal.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`group p-3 rounded-lg border cursor-pointer transition-all ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 hover:border-slate-600'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                    onClick={() => onEdit?.(goal)}
                  >
                    <h4 className={`font-medium text-sm mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      {goal.title}
                    </h4>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {category && (
                        <span
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{ backgroundColor: category.color + '15', color: category.color }}
                        >
                          {category.name}
                        </span>
                      )}
                      <span
                        className="px-1.5 py-0.5 rounded text-xs"
                        style={{ backgroundColor: priorityConfig.bgColor, color: priorityConfig.color }}
                      >
                        {priorityConfig.label}
                      </span>
                      {goal.target_date && (
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>

                    {goal.progress_percent > 0 && (
                      <div className="mt-2">
                        <div className={`h-1 rounded-full overflow-hidden ${
                          darkMode ? 'bg-slate-700' : 'bg-slate-200'
                        }`}>
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#0033A0] to-[#D4A853]"
                            style={{ width: `${goal.progress_percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
