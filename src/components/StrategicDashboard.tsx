'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@/lib/logger';
import {
  Target,
  Plus,
  X,
  Calendar,
  TrendingUp,
  Users,
  Award,
  Settings,
  Megaphone,
  Shield,
  Edit3,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Pause,
  XCircle,
  BarChart3,
  Search,
  Filter,
  LayoutGrid,
  List,
  Table2,
  Sparkles,
  Flag,
  Hash,
  ArrowUpRight,
  Zap,
  Sun,
  Coffee,
  Menu,
} from 'lucide-react';
import {
  StrategicGoal,
  GoalCategory,
  GoalMilestone,
  GoalStatus,
  GoalPriority,
  GOAL_STATUS_CONFIG,
  GOAL_PRIORITY_CONFIG,
} from '@/types/todo';
import { fetchWithCsrf } from '@/lib/csrf';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { usePermission } from '@/hooks/usePermission';
import { useCurrentAgencyId } from '@/contexts/AgencyContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ListView } from './dashboard/ListView';
import { BoardView } from './dashboard/BoardView';
import { TableView } from './dashboard/TableView';
import { AddGoalModal } from './dashboard/AddGoalModal';
import { EditGoalModal } from './dashboard/EditGoalModal';

interface StrategicDashboardProps {
  userName: string;
  darkMode?: boolean;
  onClose: () => void;
}

type ViewMode = 'list' | 'board' | 'table';

const categoryIcons: Record<string, React.ReactNode> = {
  'trending-up': <TrendingUp className="w-4 h-4" />,
  'users': <Users className="w-4 h-4" />,
  'award': <Award className="w-4 h-4" />,
  'settings': <Settings className="w-4 h-4" />,
  'megaphone': <Megaphone className="w-4 h-4" />,
  'shield': <Shield className="w-4 h-4" />,
  'target': <Target className="w-4 h-4" />,
};

const statusIcons: Record<GoalStatus, React.ReactNode> = {
  not_started: <Circle className="w-4 h-4" />,
  in_progress: <Clock className="w-4 h-4" />,
  on_hold: <Pause className="w-4 h-4" />,
  completed: <CheckCircle2 className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />,
};

function getGreeting(): { text: string; icon: React.ReactNode } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', icon: <Coffee className="w-5 h-5" /> };
  if (hour < 17) return { text: 'Good afternoon', icon: <Sun className="w-5 h-5" /> };
  return { text: 'Good evening', icon: <Sparkles className="w-5 h-5" /> };
}

export default function StrategicDashboard({
  userName,
  darkMode = true,
  onClose,
}: StrategicDashboardProps) {
  const [categories, setCategories] = useState<GoalCategory[]>([]);
  const [goals, setGoals] = useState<StrategicGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const canManageGoals = usePermission('can_manage_strategic_goals');
  const isMobile = useIsMobile(768); // Mobile breakpoint
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GoalStatus | 'all'>('all');
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<StrategicGoal | null>(null);
  const [hoveredGoal, setHoveredGoal] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    priority: 'medium' as GoalPriority,
    target_date: '',
    target_value: '',
    category_id: '',
  });

  // Get current agency ID to refetch when it changes
  const currentAgencyId = useCurrentAgencyId();

  const greeting = getGreeting();

  // Close on Escape key press
  useEscapeKey(onClose);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Clear old goals immediately to prevent showing stale data during agency switch
      setGoals([]);
      setCategories([]);

      const [categoriesRes, goalsRes] = await Promise.all([
        fetchWithCsrf(`/api/goals/categories?userName=${encodeURIComponent(userName)}`),
        fetchWithCsrf(`/api/goals?userName=${encodeURIComponent(userName)}`),
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (goalsRes.ok) {
        const goalsData = await goalsRes.json();
        setGoals(goalsData);
      }
    } catch (error) {
      logger.error('Error fetching dashboard data', error, { component: 'StrategicDashboard' });
    } finally {
      setLoading(false);
    }
  }, [userName, currentAgencyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredGoals = useMemo(() => {
    return goals.filter(goal => {
      const matchesSearch = !searchQuery ||
        goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        goal.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || goal.category_id === selectedCategory;
      const matchesStatus = statusFilter === 'all' || goal.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [goals, searchQuery, selectedCategory, statusFilter]);

  const stats = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter(g => g.status === 'completed').length;
    const inProgress = goals.filter(g => g.status === 'in_progress').length;
    const overdue = goals.filter(g => {
      if (!g.target_date || g.status === 'completed') return false;
      return new Date(g.target_date) < new Date();
    }).length;
    return { total, completed, inProgress, overdue };
  }, [goals]);

  const goalsByStatus = useMemo(() => {
    const grouped: Record<GoalStatus, StrategicGoal[]> = {
      not_started: [],
      in_progress: [],
      on_hold: [],
      completed: [],
      cancelled: [],
    };
    filteredGoals.forEach(goal => {
      grouped[goal.status].push(goal);
    });
    return grouped;
  }, [filteredGoals]);

  const handleCreateGoal = async () => {
    if (!newGoal.title.trim()) return;

    try {
      const res = await fetchWithCsrf('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGoal,
          category_id: newGoal.category_id || selectedCategory || null,
          created_by: userName,
        }),
      });

      if (res.ok) {
        const goal = await res.json();
        setGoals(prev => [...prev, goal]);
        setNewGoal({
          title: '',
          description: '',
          priority: 'medium',
          target_date: '',
          target_value: '',
          category_id: '',
        });
        setShowAddGoal(false);
      }
    } catch (error) {
      logger.error('Error creating goal', error, { component: 'StrategicDashboard' });
    }
  };

  const handleUpdateGoal = async (goalId: string, updates: Partial<StrategicGoal>) => {
    try {
      const res = await fetchWithCsrf('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: goalId,
          ...updates,
          updated_by: userName,
        }),
      });

      if (res.ok) {
        const updatedGoal = await res.json();
        setGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g));
        setEditingGoal(null);
      }
    } catch (error) {
      logger.error('Error updating goal', error, { component: 'StrategicDashboard' });
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      const res = await fetchWithCsrf(`/api/goals?id=${goalId}&userName=${encodeURIComponent(userName)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setGoals(prev => prev.filter(g => g.id !== goalId));
      }
    } catch (error) {
      logger.error('Error deleting goal', error, { component: 'StrategicDashboard' });
    }
  };

  const handleToggleMilestone = async (milestone: GoalMilestone) => {
    try {
      const res = await fetchWithCsrf('/api/goals/milestones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: milestone.id,
          completed: !milestone.completed,
          userName,
        }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      logger.error('Error toggling milestone', error, { component: 'StrategicDashboard' });
    }
  };

  const handleAddMilestone = async (goalId: string, title: string) => {
    try {
      const res = await fetchWithCsrf('/api/goals/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_id: goalId,
          title,
          userName,
        }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      logger.error('Error adding milestone', error, { component: 'StrategicDashboard' });
    }
  };

  if (loading) {
    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Loading strategic goals"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={(e) => e.stopPropagation()}
          className={`p-8 rounded-2xl ${darkMode ? 'bg-slate-900' : 'bg-white'}`}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-[#0033A0]/20 rounded-full" />
              <div className="absolute inset-0 w-12 h-12 border-4 border-[#0033A0] border-t-transparent rounded-full animate-spin" />
            </div>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Loading your goals...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 overflow-hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Strategic Goals"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full h-full max-w-6xl max-h-[95vh] ${isMobile ? '' : 'my-4 mx-4'} ${isMobile ? '' : 'rounded-2xl'} shadow-2xl overflow-hidden flex ${
          darkMode ? 'bg-slate-900' : 'bg-white'
        }`}
      >
        {/* Sidebar - Desktop or Mobile Drawer */}
        <AnimatePresence>
          {(!isMobile || showMobileMenu) && (
            <motion.div
              initial={isMobile ? { x: -300 } : false}
              animate={isMobile ? { x: 0 } : undefined}
              exit={isMobile ? { x: -300 } : undefined}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={`${isMobile ? 'absolute inset-y-0 left-0 z-50 w-64' : 'w-64 flex-shrink-0'} border-r flex flex-col ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
          <div className={`p-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#0033A0] to-[#0033A0]/70 shadow-lg shadow-[#0033A0]/20">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  Goals
                </h2>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Strategic Planning
                </p>
              </div>
            </div>
          </div>

          <div className={`p-3 mx-3 mt-3 rounded-xl ${darkMode ? 'bg-slate-800/50' : 'bg-white border border-slate-200'}`}>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2">
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  {stats.total}
                </p>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Total</p>
              </div>
              <div className="text-center p-2">
                <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Done</p>
              </div>
              <div className="text-center p-2">
                <p className="text-2xl font-bold text-[#0033A0]">{stats.inProgress}</p>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Active</p>
              </div>
              <div className="text-center p-2">
                <p className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-500' : darkMode ? 'text-slate-600' : 'text-slate-300'}`}>
                  {stats.overdue}
                </p>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Overdue</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="mb-2">
              <p className={`text-xs font-medium uppercase tracking-wider px-2 mb-2 ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Views
              </p>
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  !selectedCategory
                    ? darkMode
                      ? 'bg-slate-800 text-white'
                      : 'bg-[#0033A0]/10 text-[#0033A0]'
                    : darkMode
                      ? 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>All Goals</span>
                <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${
                  darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
                }`}>
                  {goals.length}
                </span>
              </button>
            </div>

            <div className="mb-2">
              <p className={`text-xs font-medium uppercase tracking-wider px-2 mb-2 ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Categories
              </p>
              <div className="space-y-1">
                {categories.map(category => {
                  const count = goals.filter(g => g.category_id === category.id).length;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                        selectedCategory === category.id
                          ? darkMode
                            ? 'bg-slate-800 text-white'
                            : 'bg-[#0033A0]/10 text-[#0033A0]'
                          : darkMode
                            ? 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span style={{ color: category.color }}>
                        {categoryIcons[category.icon] || <Hash className="w-4 h-4" />}
                      </span>
                      <span className="truncate">{category.name}</span>
                      <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${
                        darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className={`text-xs font-medium uppercase tracking-wider px-2 mb-2 ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Status
              </p>
              <div className="space-y-1">
                {(['all', ...Object.keys(GOAL_STATUS_CONFIG)] as (GoalStatus | 'all')[]).map(status => {
                  const config = status === 'all' ? null : GOAL_STATUS_CONFIG[status];
                  const count = status === 'all'
                    ? goals.length
                    : goals.filter(g => g.status === status).length;
                  return (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                        statusFilter === status
                          ? darkMode
                            ? 'bg-slate-800 text-white'
                            : 'bg-[#0033A0]/10 text-[#0033A0]'
                          : darkMode
                            ? 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {status === 'all' ? (
                        <Filter className="w-4 h-4" />
                      ) : (
                        <span style={{ color: config?.color }}>{statusIcons[status]}</span>
                      )}
                      <span className="truncate">
                        {status === 'all' ? 'All Statuses' : config?.label}
                      </span>
                      {count > 0 && (
                        <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${
                          darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {canManageGoals && (
            <div className={`p-3 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => setShowAddGoal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0033A0] text-white text-sm font-medium rounded-xl hover:bg-[#002878] transition-all shadow-lg shadow-[#0033A0]/20"
              >
                <Plus className="w-4 h-4" />
                New Goal
              </button>
            </div>
          )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile backdrop */}
        <AnimatePresence>
          {isMobile && showMobileMenu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`px-6 py-4 border-b flex-shrink-0 ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Mobile hamburger menu */}
                {isMobile && (
                  <button
                    onClick={() => setShowMobileMenu(true)}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                    }`}
                    aria-label="Open menu"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                )}
                <span className={`${darkMode ? 'text-[#D4A853]' : 'text-[#0033A0]'}`}>
                  {greeting.icon}
                </span>
                <div>
                  <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    {greeting.text}, {userName}
                  </h1>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {selectedCategory
                      ? categories.find(c => c.id === selectedCategory)?.name
                      : 'All your strategic goals'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close strategic dashboard"
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  darkMode ? 'text-slate-500' : 'text-slate-400'
                }`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search goals..."
                  className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-100 border-slate-200 text-slate-800 placeholder-slate-400'
                  } border focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30`}
                />
              </div>

              <div className={`flex items-center rounded-lg p-1 ${
                darkMode ? 'bg-slate-800' : 'bg-slate-100'
              }`}>
                {[
                  { mode: 'list' as ViewMode, icon: List, label: 'List' },
                  { mode: 'board' as ViewMode, icon: LayoutGrid, label: 'Board' },
                  { mode: 'table' as ViewMode, icon: Table2, label: 'Table' },
                ].map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                      viewMode === mode
                        ? darkMode
                          ? 'bg-slate-700 text-white'
                          : 'bg-white text-slate-800 shadow-sm'
                        : darkMode
                          ? 'text-slate-400 hover:text-white'
                          : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title={label}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {filteredGoals.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <motion.div
                  className={`p-5 rounded-2xl mb-5 ${
                    darkMode
                      ? 'bg-gradient-to-br from-[#0033A0]/20 to-[#0033A0]/10 border border-[#0033A0]/30'
                      : 'bg-gradient-to-br from-[#0033A0]/10 to-[#0033A0]/5 border border-[#0033A0]/20'
                  }`}
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {searchQuery ? (
                    <Search className={`w-12 h-12 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  ) : (
                    <Target className={`w-12 h-12 ${darkMode ? 'text-[#0033A0]/70' : 'text-[#0033A0]'}`} />
                  )}
                </motion.div>
                <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  {searchQuery ? 'No goals found' : 'Set your strategic goals'}
                </h3>
                <p className={`text-sm mb-5 max-w-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {searchQuery
                    ? 'Try adjusting your search or filters to find what you are looking for'
                    : 'Define your objectives and track progress toward achieving your strategic vision'}
                </p>
                {searchQuery ? (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      darkMode
                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    Clear search
                  </button>
                ) : canManageGoals ? (
                  <button
                    onClick={() => setShowAddGoal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white text-sm font-medium rounded-lg hover:bg-[#002878] transition-colors shadow-lg shadow-[#0033A0]/20"
                  >
                    <Plus className="w-4 h-4" />
                    Create your first goal
                  </button>
                ) : null}
              </div>
            ) : viewMode === 'list' ? (
              <ListView
                goals={filteredGoals}
                categories={categories}
                darkMode={darkMode}
                hoveredGoal={hoveredGoal}
                setHoveredGoal={setHoveredGoal}
                onEdit={canManageGoals ? setEditingGoal : undefined}
                onDelete={canManageGoals ? handleDeleteGoal : undefined}
                onStatusChange={canManageGoals ? (id, status) => handleUpdateGoal(id, { status }) : undefined}
                categoryIcons={categoryIcons}
              />
            ) : viewMode === 'board' ? (
              <BoardView
                goalsByStatus={goalsByStatus}
                categories={categories}
                darkMode={darkMode}
                onEdit={canManageGoals ? setEditingGoal : undefined}
                onStatusChange={canManageGoals ? (id, status) => handleUpdateGoal(id, { status }) : undefined}
              />
            ) : (
              <TableView
                goals={filteredGoals}
                categories={categories}
                darkMode={darkMode}
                onEdit={canManageGoals ? setEditingGoal : undefined}
                onStatusChange={canManageGoals ? (id, status) => handleUpdateGoal(id, { status }) : undefined}
              />
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showAddGoal && (
          <AddGoalModal
            categories={categories}
            darkMode={darkMode}
            isMobile={isMobile}
            newGoal={newGoal}
            setNewGoal={setNewGoal}
            onClose={() => {
              setShowAddGoal(false);
              setNewGoal({
                title: '',
                description: '',
                priority: 'medium',
                target_date: '',
                target_value: '',
                category_id: '',
              });
            }}
            onCreate={handleCreateGoal}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingGoal && (
          <EditGoalModal
            goal={editingGoal}
            categories={categories}
            darkMode={darkMode}
            isMobile={isMobile}
            onClose={() => setEditingGoal(null)}
            onSave={(updates) => handleUpdateGoal(editingGoal.id, updates)}
            onToggleMilestone={handleToggleMilestone}
            onAddMilestone={handleAddMilestone}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
