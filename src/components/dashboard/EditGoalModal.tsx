/**
 * EditGoalModal - Modal for editing existing strategic goals
 *
 * Extracted from StrategicDashboard.tsx to improve maintainability.
 * Provides comprehensive form with tabs for details and milestones.
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Circle, CheckCircle2, Clock } from 'lucide-react';
import {
  StrategicGoal,
  GoalCategory,
  GoalMilestone,
  GoalStatus,
  GoalPriority,
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

interface EditGoalModalProps {
  goal: StrategicGoal;
  categories: GoalCategory[];
  darkMode: boolean;
  isMobile?: boolean;
  onClose: () => void;
  onSave: (updates: Partial<StrategicGoal>) => void;
  onToggleMilestone: (milestone: GoalMilestone) => void;
  onAddMilestone: (goalId: string, title: string) => void;
}

export function EditGoalModal({ goal, categories, darkMode, isMobile = false, onClose, onSave, onToggleMilestone, onAddMilestone }: EditGoalModalProps) {
  const [formData, setFormData] = useState({
    title: goal.title,
    description: goal.description || '',
    category_id: goal.category_id || '',
    status: goal.status,
    priority: goal.priority,
    target_date: goal.target_date?.split('T')[0] || '',
    target_value: goal.target_value || '',
    current_value: goal.current_value || '',
    notes: goal.notes || '',
  });
  const [newMilestone, setNewMilestone] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'milestones'>('details');

  const milestones = goal.milestones || [];
  const completedMilestones = milestones.filter(m => m.completed).length;

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] ${isMobile ? 'p-0' : 'p-4'}`}>
      <motion.div
        initial={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? 20 : 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? 20 : 20 }}
        className={`w-full ${isMobile ? 'h-full' : 'max-w-2xl max-h-[85vh]'} ${isMobile ? '' : 'rounded-2xl'} shadow-2xl overflow-hidden flex flex-col ${darkMode ? 'bg-slate-900' : 'bg-white'}`}
      >
        <div className={`px-6 py-4 border-b flex-shrink-0 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{ backgroundColor: GOAL_STATUS_CONFIG[formData.status].bgColor, color: GOAL_STATUS_CONFIG[formData.status].color }}
              >
                {statusIcons[formData.status]}
              </button>
              <div>
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Edit Goal</h2>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Last updated {new Date(goal.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close goal details" className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-1 mt-4">
            {[
              { id: 'details' as const, label: 'Details' },
              { id: 'milestones' as const, label: `Milestones (${completedMilestones}/${milestones.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? darkMode ? 'bg-slate-800 text-white' : 'bg-[#0033A0]/10 text-[#0033A0]'
                    : darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' ? (
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl text-lg font-medium ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} border focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30`}
                />
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl text-sm resize-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'} border focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    className={`w-full px-3 py-2.5 rounded-lg text-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} border focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30`}
                  >
                    <option value="">No Category</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as GoalStatus }))}
                    className={`w-full px-3 py-2.5 rounded-lg text-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} border focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30`}
                  >
                    {(Object.keys(GOAL_STATUS_CONFIG) as GoalStatus[]).map(status => (
                      <option key={status} value={status}>{GOAL_STATUS_CONFIG[status].label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as GoalPriority }))}
                    className={`w-full px-3 py-2.5 rounded-lg text-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} border focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30`}
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
                    value={formData.target_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                    className={`w-full px-3 py-2.5 rounded-lg text-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} border focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Target Value</label>
                  <input
                    type="text"
                    value={formData.target_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_value: e.target.value }))}
                    placeholder="e.g., $1M revenue"
                    className={`w-full px-3 py-2.5 rounded-lg text-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'} border focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Current Value</label>
                  <input
                    type="text"
                    value={formData.current_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, current_value: e.target.value }))}
                    placeholder="e.g., $500K"
                    className={`w-full px-3 py-2.5 rounded-lg text-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'} border focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Additional notes..."
                  className={`w-full px-4 py-3 rounded-xl text-sm resize-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'} border focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30`}
                />
              </div>
            </div>
          ) : (
            <div className="p-6">
              {milestones.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>Progress</span>
                    <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {completedMilestones} of {milestones.length} complete
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-[#0033A0] to-[#D4A853]"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {milestones.map(milestone => (
                  <motion.div
                    key={milestone.id}
                    layout
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${darkMode ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'}`}
                  >
                    <button
                      onClick={() => onToggleMilestone(milestone)}
                      className={`flex-shrink-0 transition-all ${
                        milestone.completed ? 'text-green-500 hover:text-green-400' : darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {milestone.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                    <span className={`flex-1 text-sm ${milestone.completed ? 'line-through opacity-60' : darkMode ? 'text-white' : 'text-slate-800'}`}>
                      {milestone.title}
                    </span>
                  </motion.div>
                ))}

                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="text"
                    value={newMilestone}
                    onChange={(e) => setNewMilestone(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newMilestone.trim()) {
                        onAddMilestone(goal.id, newMilestone.trim());
                        setNewMilestone('');
                      }
                    }}
                    placeholder="Add a milestone..."
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'} border focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30`}
                  />
                  <button
                    onClick={() => {
                      if (newMilestone.trim()) {
                        onAddMilestone(goal.id, newMilestone.trim());
                        setNewMilestone('');
                      }
                    }}
                    disabled={!newMilestone.trim()}
                    className="p-2.5 bg-[#0033A0] text-white rounded-xl hover:bg-[#002878] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`px-6 py-4 border-t flex items-center justify-end gap-3 flex-shrink-0 ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'}`}>
            Cancel
          </button>
          <button
            onClick={() => {
              onSave({
                title: formData.title,
                description: formData.description || null,
                category_id: formData.category_id || null,
                status: formData.status,
                priority: formData.priority,
                target_date: formData.target_date || null,
                target_value: formData.target_value || null,
                current_value: formData.current_value || null,
                notes: formData.notes || null,
              } as Partial<StrategicGoal>);
            }}
            className="px-4 py-2 bg-[#0033A0] text-white text-sm font-medium rounded-lg hover:bg-[#002878] transition-all shadow-lg shadow-[#0033A0]/20"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
