'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@/lib/logger';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Target,
  Archive,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Plus,
  Inbox,
  BarChart2,
  Keyboard,
  Users,
} from 'lucide-react';
import { AuthUser } from '@/types/todo';
import { usePermission } from '@/hooks/usePermission';
import { useAppShell, ActiveView } from './AppShell';
import { useAgency } from '@/contexts/AgencyContext';
import { AgencySwitcher } from '@/components/AgencySwitcher';
import { AgencyOnboardingTooltip, useAgencyOnboarding } from '@/components/AgencyOnboardingTooltip';
import { CreateAgencyModal } from '@/components/CreateAgencyModal';
import { AgencyMembersModal } from '@/components/AgencyMembersModal';

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION SIDEBAR
// A refined, collapsible navigation with clear visual hierarchy
// Inspired by Linear, Notion, and Figma's elegant sidebar patterns
// ═══════════════════════════════════════════════════════════════════════════

interface NavigationSidebarProps {
  currentUser: AuthUser;
  onUserChange?: (user: AuthUser | null) => void;
  onShowWeeklyChart?: () => void;
  onShowShortcuts?: () => void;
}

interface NavItem {
  id: ActiveView;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
  badgeColor?: string;
  permission?: 'can_view_strategic_goals' | 'can_view_archive' | 'can_view_dashboard' | 'can_view_activity_feed';
}

const primaryNavItems: NavItem[] = [
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'ai_inbox', label: 'AI Inbox', icon: Inbox },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
];

const secondaryNavItems: NavItem[] = [
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'goals', label: 'Strategic Goals', icon: Target, permission: 'can_view_strategic_goals' },
  { id: 'archive', label: 'Archive', icon: Archive, permission: 'can_view_archive' },
];

export default function NavigationSidebar({
  currentUser,
  onUserChange,
  onShowWeeklyChart,
  onShowShortcuts,
}: NavigationSidebarProps) {
  const {
    activeView,
    setActiveView,
    sidebarCollapsed,
    toggleSidebar,
    openCommandPalette,
    openRightPanel,
    triggerNewTask,
  } = useAppShell();

  // Permission checks for gated nav items
  // Note: These hooks must be called unconditionally at the top level
  const canViewStrategicGoals = usePermission('can_view_strategic_goals');
  const canViewArchive = usePermission('can_view_archive');

  // Map permission keys to their resolved values for filtering
  const permissionMap: Record<string, boolean> = {
    can_view_strategic_goals: canViewStrategicGoals,
    can_view_archive: canViewArchive,
  };

  // Helper to check if user has permission for a nav item
  const hasNavPermission = (item: NavItem): boolean => {
    if (!item.permission) return true; // No permission required
    return permissionMap[item.permission] === true;
  };

  // Multi-tenancy context
  const { currentAgency, isMultiTenancyEnabled } = useAgency();

  // Agency onboarding tooltip
  const { showTooltip, dismissTooltip } = useAgencyOnboarding();

  // Create agency modal state
  const [showCreateAgencyModal, setShowCreateAgencyModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  const [hovering, setHovering] = useState(false);

  // Determine if the sidebar should be expanded (collapsed=false OR hovering while collapsed)
  const isExpanded = !sidebarCollapsed || hovering;

  // Keyboard shortcut hint
  const shortcutKey = typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl';

  const handleLogout = () => {
    if (onUserChange) {
      localStorage.removeItem('todoSession');
      onUserChange(null);
    }
  };

  const navItemClass = (isActive: boolean) => `
    group relative flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-xl)]
    font-medium text-sm transition-all duration-150 cursor-pointer
    \${isActive
      ? 'bg-[var(--accent-light)] text-[var(--accent)]'
      : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]'
    }
  `;

  const iconClass = (isActive: boolean) => `
    w-5 h-5 flex-shrink-0 transition-colors
    ${isActive
      ? 'text-[var(--accent)]'
      : 'text-[var(--text-muted)] group-hover:text-[var(--foreground)]'
    }
  `;

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isExpanded ? 260 : 72,
      }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      onMouseEnter={() => sidebarCollapsed && setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="hidden lg:flex flex-col flex-shrink-0 overflow-hidden border-r transition-colors bg-[var(--surface)] border-[var(--border)]"
      aria-label="Main navigation"
    >
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-[var(--border-subtle)]">
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 flex-1"
            >
              {/* Show AgencySwitcher when multi-tenancy is enabled */}
              {isMultiTenancyEnabled ? (
                <div className="relative flex-1">
                  <AgencySwitcher
                    size="md"
                    showRole={false}
                    onCreateAgency={() => setShowCreateAgencyModal(true)}
                    onManageMembers={() => setShowMembersModal(true)}
                  />
                  <AgencyOnboardingTooltip
                    show={showTooltip && isMultiTenancyEnabled}
                    onDismiss={dismissTooltip}
                  />
                </div>
              ) : (
                <>
                  {/* Logo/Brand - fallback when multi-tenancy disabled */}
                  <div
                    className="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: currentAgency?.primary_color || 'var(--brand-blue)' }}
                  >
                    <span className="text-white font-bold text-sm">
                      {currentAgency?.name?.charAt(0) || 'B'}
                    </span>
                  </div>
                  <div className="overflow-hidden">
                    <h1 className="font-semibold text-sm truncate text-[var(--foreground)]">
                      {currentAgency?.name || 'Bealer Agency'}
                    </h1>
                    <p className="text-xs truncate text-[var(--text-muted)]">
                      Task Manager
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center mx-auto"
              style={{ backgroundColor: currentAgency?.primary_color || 'var(--brand-blue)' }}
            >
              <span className="text-white font-bold text-sm">
                {currentAgency?.name?.charAt(0) || 'B'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse toggle - only visible when expanded */}
        {isExpanded && (
          <button
            onClick={toggleSidebar}
            className={`
              p-1.5 rounded-[var(--radius-lg)] transition-colors
              text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]
            `}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* ─── Quick Add Button ─── */}
      <div className="px-3 py-3">
        <button
          onClick={triggerNewTask}
          aria-label="Create new task"
          className={`
            w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[var(--radius-xl)]
            font-medium text-sm transition-all
            bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-light)]
            text-white shadow-md hover:shadow-lg hover:brightness-110
          `}
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          {isExpanded && <span>New Task</span>}
        </button>
      </div>

      {/* ─── Primary Navigation ─── */}
      <nav className="px-3 py-2 space-y-1 overflow-y-auto" aria-label="Primary">
        {primaryNavItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={navItemClass(isActive)}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={iconClass(isActive)} />
              {isExpanded && (
                <span className="flex-1 text-left truncate">{item.label}</span>
              )}
            </button>
          );
        })}

        {/* Divider */}
        <div className="my-3 border-t border-[var(--border)]" />

        {/* Section label */}
        {isExpanded && (
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-light)]">
            More
          </p>
        )}

        {/* Secondary Navigation - filtered by permission */}
        {secondaryNavItems
          .filter(hasNavPermission)
          .map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={navItemClass(isActive)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={iconClass(isActive)} />
                {isExpanded && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}
              </button>
            );
          })}

        {/* ─── Utility Actions (integrated into nav) ─── */}
        {(onShowWeeklyChart || onShowShortcuts) && (
          <>
            {/* Divider before utility actions */}
            <div className="my-3 border-t border-[var(--border)]" />

            {/* Weekly Progress */}
            {onShowWeeklyChart && (
              <button
                onClick={onShowWeeklyChart}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-xl)]
                  font-medium text-sm transition-all duration-150
                  text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]
                `}
              >
                <BarChart2 className="w-5 h-5 flex-shrink-0 text-[var(--text-muted)]" />
                {isExpanded && <span>Weekly Progress</span>}
              </button>
            )}

            {/* Keyboard Shortcuts */}
            {onShowShortcuts && (
              <button
                onClick={onShowShortcuts}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-xl)]
                  font-medium text-sm transition-all duration-150
                  text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]
                `}
              >
                <Keyboard className="w-5 h-5 flex-shrink-0 text-[var(--text-muted)]" />
                {isExpanded && (
                  <>
                    <span className="flex-1 text-left">Shortcuts</span>
                    <span className="text-xs text-[var(--text-light)]">?</span>
                  </>
                )}
              </button>
            )}
          </>
        )}
      </nav>

      {/* ─── Footer / Logout ─── */}
      <div className="mt-auto border-t px-3 py-3 border-[var(--border)]">
        <button
          onClick={handleLogout}
          className={`
            w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-lg)]
            transition-colors
            text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]
          `}
          aria-label="Log out"
        >
          <LogOut className="w-4 h-4" />
          {isExpanded && <span className="text-sm">Log out</span>}
        </button>
      </div>

      {/* Create Agency Modal */}
      <CreateAgencyModal
        isOpen={showCreateAgencyModal}
        onClose={() => setShowCreateAgencyModal(false)}
        onSuccess={(agency) => {
          // Successfully created agency - the AgencyContext will auto-refresh
          logger.info('Agency created successfully', { component: 'NavigationSidebar', action: 'onCreateAgency' });
          setShowCreateAgencyModal(false);
          // Optional: Show success toast notification here
        }}
        currentUserName={currentUser.name}
      />

      {/* Members Management Modal */}
      <AgencyMembersModal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        currentUserName={currentUser.name}
      />
    </motion.aside>
  );
}
