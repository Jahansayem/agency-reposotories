'use client';

import { memo } from 'react';
import {
  LayoutList, LayoutGrid, Sun, Moon, BarChart2, Activity, Target, Home, Archive
} from 'lucide-react';
import { AuthUser, OWNER_USERNAME, ViewMode } from '@/types/todo';
import UserSwitcher from '../UserSwitcher';
import { useTheme } from '@/contexts/ThemeContext';

interface TodoHeaderProps {
  currentUser: AuthUser;
  onUserChange: (user: AuthUser | null) => void;
  onOpenDashboard?: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  stats: {
    active: number;
    dueToday: number;
    overdue: number;
  };
  canViewArchive: boolean;
  setShowActivityFeed: (show: boolean) => void;
  setShowArchiveView: (show: boolean) => void;
  setShowStrategicDashboard: (show: boolean) => void;
  setShowWeeklyChart: (show: boolean) => void;
}

function TodoHeader({
  currentUser,
  onUserChange,
  onOpenDashboard,
  viewMode,
  setViewMode,
  stats,
  canViewArchive,
  setShowActivityFeed,
  setShowArchiveView,
  setShowStrategicDashboard,
  setShowWeeklyChart,
}: TodoHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === 'dark';
  const userName = currentUser.name;

  return (
    <header className={`sticky top-0 z-40 shadow-[var(--shadow-lg)] border-b ${
      darkMode
        ? 'bg-[var(--gradient-hero)] border-white/5'
        : 'bg-white border-[var(--border)]'
    }`}>
      <div className={`mx-auto px-4 sm:px-6 py-4 ${viewMode === 'kanban' ? 'max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px]' : 'max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl'}`}>
        <div className="flex items-center justify-between gap-3">
          {/* Logo & Context Info */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Dashboard button */}
            {onOpenDashboard && (
              <button
                onClick={onOpenDashboard}
                className={`p-2 rounded-xl transition-all flex-shrink-0 ${
                  darkMode
                    ? 'hover:bg-white/10 text-white/70 hover:text-white'
                    : 'hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--foreground)]'
                }`}
                title="Daily Summary"
              >
                <Home className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-sky)] flex items-center justify-center flex-shrink-0 shadow-lg" style={{ boxShadow: '0 4px 12px rgba(0, 51, 160, 0.35)' }}>
              <span className="text-white font-bold text-base">B</span>
            </div>
            <div className="min-w-0">
              <h1 className={`text-base font-bold truncate tracking-tight ${darkMode ? 'text-white' : 'text-[var(--brand-navy)]'}`}>Bealer Agency</h1>
              <p className={`text-xs truncate ${darkMode ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>
                {stats.active} active{stats.dueToday > 0 && ` • ${stats.dueToday} due today`}{stats.overdue > 0 && ` • ${stats.overdue} overdue`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* View toggle with labels */}
            <div className={`flex backdrop-blur-sm rounded-xl p-1 border ${
              darkMode
                ? 'bg-white/8 border-white/10'
                : 'bg-[var(--surface-2)] border-[var(--border)]'
            }`}>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-[var(--brand-sky)] text-[var(--brand-navy)] shadow-md'
                    : darkMode
                      ? 'text-white/70 hover:text-white hover:bg-white/10'
                      : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-3)]'
                }`}
                aria-pressed={viewMode === 'list'}
                aria-label="List view"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  viewMode === 'kanban'
                    ? 'bg-[var(--brand-sky)] text-[var(--brand-navy)] shadow-md'
                    : darkMode
                      ? 'text-white/70 hover:text-white hover:bg-white/10'
                      : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-3)]'
                }`}
                aria-pressed={viewMode === 'kanban'}
                aria-label="Board view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Board</span>
              </button>
            </div>

            {/* Activity Feed - accessible to all users */}
            <button
              onClick={() => setShowActivityFeed(true)}
              className={`p-2 rounded-xl transition-all duration-200 ${
                darkMode
                  ? 'text-white/60 hover:text-white hover:bg-white/10'
                  : 'text-[var(--text-muted)] hover:text-[var(--brand-blue)] hover:bg-[var(--surface-2)]'
              }`}
              aria-label="View activity feed"
            >
              <Activity className="w-4 h-4" />
            </button>

            {canViewArchive && (
              <button
                onClick={() => setShowArchiveView(true)}
                className={`p-2 rounded-xl transition-all duration-200 ${
                  darkMode
                    ? 'text-white/60 hover:text-white hover:bg-white/10'
                    : 'text-[var(--text-muted)] hover:text-[var(--brand-blue)] hover:bg-[var(--surface-2)]'
                }`}
                aria-label="View archive"
                title="Archived tasks"
              >
                <Archive className="w-4 h-4" />
              </button>
            )}

            {/* Strategic Dashboard - Owner only */}
            {userName === OWNER_USERNAME && (
              <button
                onClick={() => setShowStrategicDashboard(true)}
                className={`p-2 rounded-xl transition-all duration-200 ${
                  darkMode
                    ? 'text-white/60 hover:text-white hover:bg-white/10'
                    : 'text-[var(--text-muted)] hover:text-[var(--brand-blue)] hover:bg-[var(--surface-2)]'
                }`}
                aria-label="Strategic Goals Dashboard"
                title="Strategic Goals"
              >
                <Target className="w-4 h-4" />
              </button>
            )}

            {/* Weekly progress chart */}
            <button
              onClick={() => setShowWeeklyChart(true)}
              className={`p-2 rounded-xl transition-all duration-200 ${
                darkMode
                  ? 'text-white/60 hover:text-white hover:bg-white/10'
                  : 'text-[var(--text-muted)] hover:text-[var(--brand-blue)] hover:bg-[var(--surface-2)]'
              }`}
              aria-label="View weekly progress"
            >
              <BarChart2 className="w-4 h-4" />
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-all duration-200 ${
                darkMode
                  ? 'text-white/60 hover:text-white hover:bg-white/10'
                  : 'text-[var(--text-muted)] hover:text-[var(--brand-blue)] hover:bg-[var(--surface-2)]'
              }`}
              aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <UserSwitcher currentUser={currentUser} onUserChange={onUserChange} />
          </div>
        </div>
      </div>
    </header>
  );
}

export default memo(TodoHeader);
