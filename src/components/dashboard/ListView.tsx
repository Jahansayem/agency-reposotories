/**
 * ListView - List view component for Strategic Goals
 *
 * Extracted from StrategicDashboard.tsx to improve maintainability.
 * Displays goals in a list format with status indicators, category tags,
 * and progress bars.
 */

'use client';

import { motion } from 'framer-motion';
import {
  Edit3,
  Trash2,
  Calendar,
  Flag,
  Hash,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Circle,
  Clock,
  Pause,
  XCircle,
} from 'lucide-react';
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

interface ListViewProps {
  goals: StrategicGoal[];
  categories: GoalCategory[];
  darkMode: boolean;
  hoveredGoal: string | null;
  setHoveredGoal: (id: string | null) => void;
  onEdit?: (goal: StrategicGoal) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: GoalStatus) => void;
  categoryIcons: Record<string, React.ReactNode>;
}

export function ListView({
  goals,
  categories,
  darkMode,
  hoveredGoal,
  setHoveredGoal,
  onEdit,
  onDelete,
  onStatusChange,
  categoryIcons,
}: ListViewProps) {
  return (
    <div className="space-y-2">
      {goals.map(goal => {
        const category = categories.find(c => c.id === goal.category_id);
        const statusConfig = GOAL_STATUS_CONFIG[goal.status];
        const priorityConfig = GOAL_PRIORITY_CONFIG[goal.priority];
        const isHovered = hoveredGoal === goal.id;

        return (
          <motion.div
            key={goal.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onMouseEnter={() => setHoveredGoal(goal.id)}
            onMouseLeave={() => setHoveredGoal(null)}
            className={`group relative rounded-xl border transition-all ${
              darkMode
                ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div className="p-4">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => {
                    const statuses: GoalStatus[] = ['not_started', 'in_progress', 'on_hold', 'completed', 'cancelled'];
                    const currentIndex = statuses.indexOf(goal.status);
                    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                    onStatusChange?.(goal.id, nextStatus);
                  }}
                  disabled={!onStatusChange}
                  className={`p-2 rounded-lg transition-all ${onStatusChange ? 'hover:scale-110' : 'cursor-default'}`}
                  style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
                  title={`Status: ${statusConfig.label}`}
                >
                  {statusIcons[goal.status]}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        goal.status === 'completed'
                          ? 'line-through opacity-60'
                          : darkMode ? 'text-white' : 'text-slate-800'
                      }`}>
                        {goal.title}
                      </h3>
                      {goal.description && (
                        <p className={`text-sm mt-1 line-clamp-2 ${
                          darkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {goal.description}
                        </p>
                      )}
                    </div>

                    <div className={`flex items-center gap-1 transition-opacity ${
                      isHovered && (onEdit || onDelete) ? 'opacity-100' : 'opacity-0'
                    }`}>
                      {onEdit && (
                        <button
                          onClick={() => onEdit(goal)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            darkMode
                              ? 'hover:bg-slate-700 text-slate-400 hover:text-white'
                              : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(goal.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            darkMode
                              ? 'hover:bg-red-900/30 text-slate-400 hover:text-red-400'
                              : 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {category && (
                      <span
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
                        style={{ backgroundColor: category.color + '15', color: category.color }}
                      >
                        {categoryIcons[category.icon] || <Hash className="w-3 h-3" />}
                        {category.name}
                      </span>
                    )}

                    <span
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                      style={{ backgroundColor: priorityConfig.bgColor, color: priorityConfig.color }}
                    >
                      <Flag className="w-3 h-3" />
                      {priorityConfig.label}
                    </span>

                    {goal.target_date && (
                      <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
                        new Date(goal.target_date) < new Date() && goal.status !== 'completed'
                          ? 'bg-red-500/10 text-red-500'
                          : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Calendar className="w-3 h-3" />
                        {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}

                    {goal.target_value && (
                      <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
                        darkMode ? 'bg-[#D4A853]/10 text-[#D4A853]' : 'bg-[#0033A0]/10 text-[#0033A0]'
                      }`}>
                        <ArrowUpRight className="w-3 h-3" />
                        {goal.target_value}
                      </span>
                    )}

                    {goal.progress_percent > 0 && (
                      <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
                        darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <BarChart3 className="w-3 h-3" />
                        {goal.progress_percent}%
                      </span>
                    )}

                    {goal.milestones && goal.milestones.length > 0 && (
                      <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
                        darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        {goal.milestones.filter(m => m.completed).length}/{goal.milestones.length}
                      </span>
                    )}
                  </div>

                  {goal.progress_percent > 0 && (
                    <div className="mt-3">
                      <div className={`h-1.5 rounded-full overflow-hidden ${
                        darkMode ? 'bg-slate-700' : 'bg-slate-200'
                      }`}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${goal.progress_percent}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-[#0033A0] to-[#D4A853]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
