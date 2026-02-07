/**
 * AddGoalModal - Modal for creating new strategic goals
 *
 * Extracted from StrategicDashboard.tsx to improve maintainability.
 * Provides form for entering goal details.
 */

'use client';

import { motion } from 'framer-motion';
import { X, Zap } from 'lucide-react';
import {
  GoalCategory,
  GoalPriority,
  GOAL_PRIORITY_CONFIG,
} from '@/types/todo';

interface AddGoalModalProps {
  categories: GoalCategory[];
  darkMode: boolean;
  isMobile?: boolean;
  newGoal: {
    title: string;
    description: string;
    priority: GoalPriority;
    target_date: string;
    target_value: string;
    category_id: string;
  };
  setNewGoal: React.Dispatch<React.SetStateAction<{
    title: string;
    description: string;
    priority: GoalPriority;
    target_date: string;
    target_value: string;
    category_id: string;
  }>>;
  onClose: () => void;
  onCreate: () => void;
}

export function AddGoalModal({ categories, darkMode, isMobile = false, newGoal, setNewGoal, onClose, onCreate }: AddGoalModalProps) {
  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] ${isMobile ? 'p-0' : 'p-4'}`}>
      <motion.div
        initial={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? 20 : 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? 20 : 20 }}
        className={`w-full ${isMobile ? 'h-full' : 'max-w-lg'} ${isMobile ? '' : 'rounded-2xl'} shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-900' : 'bg-white'}`}
      >
        <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#0033A0] to-[#0033A0]/70">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>New Goal</h2>
          </div>
          <button onClick={onClose} aria-label="Close new goal form" className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <input
            type="text"
            value={newGoal.title}
            onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
            placeholder="What's your goal?"
            className={`w-full px-4 py-3 rounded-xl text-lg font-medium ${
              darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
            } border-2 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]`}
            autoFocus
          />

          <textarea
            value={newGoal.description}
            onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Add a description..."
            rows={3}
            className={`w-full px-4 py-3 rounded-xl text-sm resize-none ${
              darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
            } border focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30`}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Category</label>
              <select
                value={newGoal.category_id}
                onChange={(e) => setNewGoal(prev => ({ ...prev, category_id: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg text-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} border focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30`}
              >
                <option value="">No Category</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Priority</label>
              <select
                value={newGoal.priority}
                onChange={(e) => setNewGoal(prev => ({ ...prev, priority: e.target.value as GoalPriority }))}
                className={`w-full px-3 py-2 rounded-lg text-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} border focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30`}
              >
                {(Object.keys(GOAL_PRIORITY_CONFIG) as GoalPriority[]).map(priority => (
                  <option key={priority} value={priority}>{GOAL_PRIORITY_CONFIG[priority].label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Target Date</label>
              <input
                type="date"
                value={newGoal.target_date}
                onChange={(e) => setNewGoal(prev => ({ ...prev, target_date: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg text-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} border focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30`}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Target Value</label>
              <input
                type="text"
                value={newGoal.target_value}
                onChange={(e) => setNewGoal(prev => ({ ...prev, target_value: e.target.value }))}
                placeholder="e.g., $1M revenue"
                className={`w-full px-3 py-2 rounded-lg text-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'} border focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30`}
              />
            </div>
          </div>
        </div>

        <div className={`px-6 py-4 border-t flex items-center justify-end gap-3 ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'}`}>
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={!newGoal.title.trim()}
            className="px-4 py-2 bg-[#0033A0] text-white text-sm font-medium rounded-lg hover:bg-[#002878] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#0033A0]/20"
          >
            Create Goal
          </button>
        </div>
      </motion.div>
    </div>
  );
}
