'use client';

import { useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Target,
  Brain,
  Users,
  FileText,
  Phone,
  DollarSign,
  Shield,
  Car,
  Clock,
  TrendingUp,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { Todo, AuthUser, ActivityLogEntry } from '@/types/todo';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppShell } from '../layout';
import {
  generateDashboardAIData,
  NeglectedTask,
} from '@/lib/aiDashboardInsights';
import {
  generateManagerDashboardData,
} from '@/lib/managerDashboardInsights';
import {
  getInsuranceWorkloadSummary,
  InsuranceTaskCategory,
} from '@/lib/orchestratorIntegration';

interface ManagerDashboardProps {
  currentUser: AuthUser;
  todos: Todo[];
  activityLog?: ActivityLogEntry[];
  users: string[];
  onNavigateToTasks?: () => void;
  onFilterOverdue?: () => void;
  onFilterDueToday?: () => void;
}

export default function ManagerDashboard({
  currentUser,
  todos,
  activityLog = [],
  users,
  onNavigateToTasks,
  onFilterOverdue,
  onFilterDueToday,
}: ManagerDashboardProps) {
  const { theme } = useTheme();
  const darkMode = theme === 'dark';
  const { setActiveView } = useAppShell();
  const [showAllTeamMembers, setShowAllTeamMembers] = useState(false);

  // Generate manager/team insights
  const managerData = useMemo(() => {
    return generateManagerDashboardData(todos, currentUser.name, users);
  }, [todos, currentUser.name, users]);

  // Generate insurance workload summary
  const insuranceWorkload = useMemo(() => {
    return getInsuranceWorkloadSummary(todos);
  }, [todos]);

  // My personal tasks
  const myTodos = useMemo(() => {
    return todos.filter(t =>
      t.assigned_to === currentUser.name ||
      (!t.assigned_to && t.created_by === currentUser.name)
    );
  }, [todos, currentUser.name]);

  // AI insights for personal tasks
  const aiData = useMemo(() => {
    return generateDashboardAIData(myTodos, activityLog, currentUser.name);
  }, [myTodos, activityLog, currentUser.name]);

  // Personal stats
  const myStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const activeTodos = myTodos.filter(t => !t.completed);

    const overdue = activeTodos.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(23, 59, 59, 999);
      return dueDate < today;
    });

    const dueToday = activeTodos.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate >= today && dueDate <= todayEnd;
    });

    return {
      totalActive: activeTodos.length,
      overdue: overdue.length,
      overdueList: overdue,
      dueToday: dueToday.length,
      dueTodayTasks: dueToday,
    };
  }, [myTodos]);

  // Team stats
  const teamStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allActive = todos.filter(t => !t.completed);
    const teamOverdue = allActive.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(23, 59, 59, 999);
      return dueDate < today;
    });

    return {
      totalActive: allActive.length,
      totalOverdue: teamOverdue.length,
    };
  }, [todos]);

  const handleNavigateToTasks = useCallback(() => {
    if (onNavigateToTasks) {
      onNavigateToTasks();
    } else {
      setActiveView('tasks');
    }
  }, [onNavigateToTasks, setActiveView]);

  const handleFilterOverdue = useCallback(() => {
    if (onFilterOverdue) {
      onFilterOverdue();
    } else {
      setActiveView('tasks');
    }
  }, [onFilterOverdue, setActiveView]);

  const handleFilterDueToday = useCallback(() => {
    if (onFilterDueToday) {
      onFilterDueToday();
    } else {
      setActiveView('tasks');
    }
  }, [onFilterDueToday, setActiveView]);

  const getUrgencyBadge = (urgency: NeglectedTask['urgencyLevel']) => {
    switch (urgency) {
      case 'critical': return { bg: 'bg-red-500', text: 'text-white' };
      case 'warning': return { bg: 'bg-amber-500', text: 'text-white' };
      case 'notice': return { bg: 'bg-blue-500', text: 'text-white' };
    }
  };

  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`rounded-2xl p-5 ${
      darkMode
        ? 'bg-[var(--surface)] border border-white/10'
        : 'bg-white border border-[var(--border)] shadow-sm'
    } ${className}`}>
      {children}
    </div>
  );

  const SectionTitle = ({ icon: Icon, title, badge }: { icon: React.ComponentType<{ className?: string }>; title: string; badge?: number }) => (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`w-5 h-5 ${darkMode ? 'text-[var(--accent)]' : 'text-[#0033A0]'}`} />
      <h2 className={`text-sm font-semibold uppercase tracking-wide ${
        darkMode ? 'text-white/70' : 'text-slate-600'
      }`}>
        {title}
      </h2>
      {badge !== undefined && badge > 0 && (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
          {badge}
        </span>
      )}
    </div>
  );

  // Get members who need attention (overdue or overloaded)
  const membersNeedingAttention = managerData.memberStats.filter(
    m => m.overdueTasks > 0 || m.workloadLevel === 'overloaded'
  );

  return (
    <div className="space-y-6">
      {/* Team Alert Banner - Show if team has overdue items */}
      {teamStats.totalOverdue > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={handleFilterOverdue}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-colors group ${
              darkMode
                ? 'bg-red-500/15 hover:bg-red-500/20 border border-red-500/30'
                : 'bg-red-50 hover:bg-red-100 border border-red-200'
            }`}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1 text-left">
              <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {teamStats.totalOverdue} team task{teamStats.totalOverdue > 1 ? 's' : ''} overdue
              </p>
              <p className={`text-sm ${darkMode ? 'text-white/60' : 'text-slate-500'}`}>
                {myStats.overdue > 0 ? `${myStats.overdue} are yours` : 'Click to view and delegate'}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-red-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </button>
        </motion.div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
        {/* Left Column - Team Health */}
        <div className="lg:col-span-3 space-y-6">

          {/* Team Health Overview */}
          <Card>
            <SectionTitle icon={Users} title="Team Health" />

            {/* Traffic Light Stats */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {users.length}
                </p>
                <p className={`text-[10px] uppercase tracking-wide ${darkMode ? 'text-white/50' : 'text-slate-400'}`}>
                  Team Size
                </p>
              </div>
              <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {managerData.teamOverview.totalActive}
                </p>
                <p className={`text-[10px] uppercase tracking-wide ${darkMode ? 'text-white/50' : 'text-slate-400'}`}>
                  Active Tasks
                </p>
              </div>
              <div className={`text-center p-3 rounded-xl ${
                teamStats.totalOverdue > 0
                  ? darkMode ? 'bg-red-500/10' : 'bg-red-50'
                  : darkMode ? 'bg-white/5' : 'bg-slate-50'
              }`}>
                <p className={`text-2xl font-bold ${teamStats.totalOverdue > 0 ? 'text-red-500' : darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {teamStats.totalOverdue}
                </p>
                <p className={`text-[10px] uppercase tracking-wide ${darkMode ? 'text-white/50' : 'text-slate-400'}`}>
                  Overdue
                </p>
              </div>
              <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                <p className={`text-2xl font-bold text-emerald-500`}>
                  {managerData.teamOverview.weeklyTeamCompleted}
                </p>
                <p className={`text-[10px] uppercase tracking-wide ${darkMode ? 'text-white/50' : 'text-slate-400'}`}>
                  Done/Week
                </p>
              </div>
            </div>

            {/* Needs Attention Section */}
            {membersNeedingAttention.length > 0 && (
              <div className="mb-5">
                <div className={`text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2 ${darkMode ? 'text-white/50' : 'text-slate-400'}`}>
                  <AlertCircle className="w-3.5 h-3.5" />
                  Needs Attention
                </div>
                <div className="space-y-2">
                  {membersNeedingAttention.slice(0, 3).map((member) => (
                    <div
                      key={member.name}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        member.workloadLevel === 'overloaded'
                          ? darkMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
                          : darkMode ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        member.workloadLevel === 'overloaded'
                          ? 'bg-red-500/20 text-red-500'
                          : 'bg-amber-500/20 text-amber-500'
                      }`}>
                        {member.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {member.name}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-white/60' : 'text-slate-500'}`}>
                          {member.overdueTasks > 0 && `${member.overdueTasks} overdue`}
                          {member.overdueTasks > 0 && member.workloadLevel === 'overloaded' && ' · '}
                          {member.workloadLevel === 'overloaded' && `${member.activeTasks} tasks (overloaded)`}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${darkMode ? 'text-white/30' : 'text-slate-300'}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Team Workload Distribution */}
            <div>
              <button
                onClick={() => setShowAllTeamMembers(!showAllTeamMembers)}
                className={`w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wide mb-3 ${darkMode ? 'text-white/50' : 'text-slate-400'}`}
              >
                <span>Team Workload</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAllTeamMembers ? 'rotate-180' : ''}`} />
              </button>
              <div className="space-y-2">
                {managerData.memberStats
                  .slice(0, showAllTeamMembers ? undefined : 5)
                  .map((member) => (
                    <div key={member.name} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        darkMode ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {member.name.charAt(0)}
                      </div>
                      <span className={`w-24 text-sm truncate ${darkMode ? 'text-white/70' : 'text-slate-600'}`}>
                        {member.name.split(' ')[0]}
                      </span>
                      <div className={`flex-1 h-2 rounded-full ${darkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                        <div
                          className={`h-full rounded-full transition-all ${
                            member.workloadLevel === 'overloaded' ? 'bg-red-500' :
                            member.workloadLevel === 'heavy' ? 'bg-amber-500' :
                            member.workloadLevel === 'normal' ? 'bg-[#0033A0]' :
                            'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(member.activeTasks / 15 * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-2 w-16 justify-end">
                        {member.overdueTasks > 0 && (
                          <span className="text-xs text-red-500 font-medium">{member.overdueTasks}!</span>
                        )}
                        <span className={`text-xs ${darkMode ? 'text-white/50' : 'text-slate-400'}`}>
                          {member.activeTasks}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
              {managerData.memberStats.length > 5 && !showAllTeamMembers && (
                <button
                  onClick={() => setShowAllTeamMembers(true)}
                  className={`w-full text-center py-2 mt-2 text-xs font-medium ${
                    darkMode ? 'text-[#72B5E8]' : 'text-[#0033A0]'
                  } hover:underline`}
                >
                  Show all {managerData.memberStats.length} team members
                </button>
              )}
            </div>
          </Card>

          {/* Insurance Workload Summary */}
          <Card>
            <SectionTitle icon={Shield} title="Insurance Tasks" badge={insuranceWorkload.claim.overdue + insuranceWorkload.follow_up.overdue + insuranceWorkload.payment.overdue} />

            {(() => {
              const categories = [
                { key: 'claim' as InsuranceTaskCategory, label: 'Claims', icon: FileText, color: 'text-red-500', bgColor: 'bg-red-500/10' },
                { key: 'follow_up' as InsuranceTaskCategory, label: 'Follow-ups', icon: Phone, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
                { key: 'payment' as InsuranceTaskCategory, label: 'Payments', icon: DollarSign, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
                { key: 'vehicle_add' as InsuranceTaskCategory, label: 'Vehicle Adds', icon: Car, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
                { key: 'policy_review' as InsuranceTaskCategory, label: 'Policy Reviews', icon: Shield, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
              ];

              // Show categories with overdue first, then by active count
              const sortedCategories = [...categories].sort((a, b) => {
                const aOverdue = insuranceWorkload[a.key].overdue;
                const bOverdue = insuranceWorkload[b.key].overdue;
                if (aOverdue !== bOverdue) return bOverdue - aOverdue;
                return insuranceWorkload[b.key].active - insuranceWorkload[a.key].active;
              });

              const hasAnyWork = sortedCategories.some(c => insuranceWorkload[c.key].active > 0);

              if (!hasAnyWork) {
                return (
                  <div className={`text-center py-6 ${darkMode ? 'text-white/40' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">All insurance tasks completed</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sortedCategories.map(({ key, label, icon: Icon, color, bgColor }) => {
                    const data = insuranceWorkload[key];
                    if (data.active === 0 && data.overdue === 0) return null;

                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-xl ${
                          data.overdue > 0
                            ? darkMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-100'
                            : darkMode ? 'bg-white/5' : 'bg-slate-50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgColor}`}>
                          <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{label}</p>
                          <div className="flex items-center gap-2 text-xs">
                            {data.overdue > 0 && (
                              <span className="text-red-500 font-medium">{data.overdue} overdue</span>
                            )}
                            <span className={`${darkMode ? 'text-white/50' : 'text-slate-400'}`}>
                              {data.active} active
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Card>
        </div>

        {/* Right Column - My Tasks */}
        <div className="lg:col-span-2 space-y-6">

          {/* My Tasks Section */}
          <Card>
            <SectionTitle icon={UserCheck} title="Your Tasks" badge={myStats.overdue} />

            {/* Personal overdue alert */}
            {myStats.overdue > 0 && (
              <button
                onClick={handleFilterOverdue}
                className={`w-full flex items-center gap-3 p-3 rounded-xl mb-4 ${
                  darkMode ? 'bg-red-500/10 hover:bg-red-500/15' : 'bg-red-50 hover:bg-red-100'
                } transition-colors`}
              >
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {myStats.overdue} task{myStats.overdue > 1 ? 's' : ''} overdue
                </span>
                <ArrowRight className="w-4 h-4 text-red-500 ml-auto" />
              </button>
            )}

            {/* Due Today */}
            {myStats.dueToday > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-white/50' : 'text-slate-400'}`}>
                    Due Today
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {myStats.dueToday}
                  </span>
                </div>
                {myStats.dueTodayTasks.slice(0, 4).map((task) => (
                  <button
                    key={task.id}
                    onClick={handleNavigateToTasks}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      task.priority === 'urgent' ? 'bg-red-500' :
                      task.priority === 'high' ? 'bg-orange-500' :
                      'bg-[#0033A0]'
                    }`} />
                    <span className={`flex-1 text-sm truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {task.text}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className={`flex items-center gap-3 py-3 px-3 rounded-xl ${
                darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'
              }`}>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className={`text-sm ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  No tasks due today
                </span>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-white/10">
              <div className={`text-center p-2 rounded-lg ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {myStats.totalActive}
                </p>
                <p className={`text-[10px] uppercase ${darkMode ? 'text-white/50' : 'text-slate-400'}`}>Your Active</p>
              </div>
              <div className={`text-center p-2 rounded-lg ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                <p className={`text-xl font-bold text-emerald-500`}>
                  {managerData.memberStats.find(m => m.name === currentUser.name)?.weeklyCompleted || 0}
                </p>
                <p className={`text-[10px] uppercase ${darkMode ? 'text-white/50' : 'text-slate-400'}`}>Done/Week</p>
              </div>
            </div>
          </Card>

          {/* Stalled Tasks (personal) */}
          {aiData.neglectedTasks.length > 0 && (
            <Card>
              <SectionTitle icon={Clock} title="Stalled Tasks" />
              <div className="space-y-2">
                {aiData.neglectedTasks.slice(0, 3).map((item) => {
                  const badge = getUrgencyBadge(item.urgencyLevel);
                  return (
                    <div
                      key={item.todo.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl ${
                        darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100'
                      } transition-colors cursor-pointer`}
                      onClick={handleNavigateToTasks}
                    >
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                        {item.daysSinceActivity}d
                      </span>
                      <span className={`flex-1 truncate text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {item.todo.text}
                      </span>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-white/30' : 'text-slate-300'}`} />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Team Bottlenecks */}
          {managerData.bottlenecks.length > 0 && (
            <Card>
              <SectionTitle icon={AlertCircle} title="Bottlenecks" />
              <div className="space-y-2">
                {managerData.bottlenecks.slice(0, 3).map((bottleneck, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-xl ${
                      bottleneck.severity === 'critical'
                        ? darkMode ? 'bg-red-500/10' : 'bg-red-50'
                        : darkMode ? 'bg-amber-500/10' : 'bg-amber-50'
                    }`}
                  >
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      bottleneck.severity === 'critical' ? 'text-red-500' : 'text-amber-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {bottleneck.title}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-white/60' : 'text-slate-500'}`}>
                        {bottleneck.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
