'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@/lib/logger';
import { zClass } from '@/lib/z-index';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Target,
  Archive,
  ChevronLeft,
  ChevronRight,
  Inbox,
  BarChart2,
  Keyboard,
  Users,
  Flame,
  MessageCircle,
} from 'lucide-react';
import { AuthUser } from '@/types/todo';
import { usePermission } from '@/hooks/usePermission';
import { useAppShell, ActiveView } from './AppShell';
import { useAgency } from '@/contexts/AgencyContext';
import { useUnreadCount } from '@/contexts/UnreadCountContext';
import { AgencySwitcher } from '@/components/AgencySwitcher';
import { AgencyOnboardingTooltip, useAgencyOnboarding } from '@/components/AgencyOnboardingTooltip';
import { CreateAgencyModal } from '@/components/CreateAgencyModal';
import { AgencyMembersModal } from '@/components/AgencyMembersModal';
import { Tooltip } from '@/components/ui/Tooltip';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION SIDEBAR
// A refined, collapsible navigation with clear visual hierarchy
// Inspired by Linear, Notion, and Figma's elegant sidebar patterns
// ═══════════════════════════════════════════════════════════════════════════

interface NavigationSidebarProps {
  currentUser: AuthUser;
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
  { id: 'chat', label: 'Messages', icon: MessageCircle },
  { id: 'opportunities', label: 'Opportunities', icon: Flame },
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
  onShowWeeklyChart,
  onShowShortcuts,
}: NavigationSidebarProps) {
  const {
    activeView,
    setActiveView,
    sidebarCollapsed,
    toggleSidebar,
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

  // Shared unread chat message count
  const { unreadCount: chatUnreadCount } = useUnreadCount();

  // Agency onboarding tooltip
  const { showTooltip, dismissTooltip } = useAgencyOnboarding();

  // Create agency modal state
  const [showCreateAgencyModal, setShowCreateAgencyModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  const [hovering, setHovering] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Scroll shadow for nav overflow
  const navRef = useRef<HTMLElement>(null);
  const [showScrollShadow, setShowScrollShadow] = useState(false);

  const handleNavScroll = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    const hasOverflow = el.scrollHeight > el.clientHeight;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 2;
    setShowScrollShadow(hasOverflow && !atBottom);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    handleNavScroll();
    const observer = new ResizeObserver(handleNavScroll);
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleNavScroll]);

  // Determine if the sidebar should be expanded (collapsed=false OR hovering while collapsed)
  const isExpanded = !sidebarCollapsed || hovering;

  const navItemClass = (isActive: boolean) => `
    group relative flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-xl)]
    font-medium text-sm transition-all duration-150 cursor-pointer border-l-[3px]
    ${isActive
      ? 'bg-[var(--accent-light)] text-[var(--accent)] font-semibold border-l-[var(--accent)] rounded-l-none'
      : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] border-l-transparent'
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
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      onMouseEnter={() => sidebarCollapsed && setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`hidden lg:flex flex-col flex-shrink-0 overflow-hidden border-r transition-colors bg-[var(--surface)] border-[var(--border)] ${zClass.sticky}`}
      aria-label="Sidebar navigation"
    >
      {/* ─── Header ─── */}
      <div className="relative flex items-center justify-between px-4 h-16 border-b border-[var(--border-subtle)]">
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="expanded"
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
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
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
              className="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center mx-auto"
              style={{ backgroundColor: currentAgency?.primary_color || 'var(--brand-blue)' }}
            >
              <span className="text-white font-bold text-sm">
                {currentAgency?.name?.charAt(0) || 'B'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse toggle — always visible */}
        {isExpanded ? (
          <div className="flex items-center gap-1">
            <button
              onClick={toggleSidebar}
              className={`
                p-1.5 rounded-[var(--radius-lg)] transition-colors
                text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]
              `}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={toggleSidebar}
            className="absolute top-4 right-1 p-1 rounded-[var(--radius-md)] transition-colors text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ─── Primary Navigation ─── */}
      <div className="relative flex-1 min-h-0">
      <nav ref={navRef} onScroll={handleNavScroll} className="px-3 py-2 space-y-1 overflow-y-auto h-full" aria-label="Primary">
        {primaryNavItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const badgeCount = item.id === 'chat' ? chatUnreadCount : (item.badge || 0);

          return (
            <Tooltip key={item.id} content={item.label} position="right" disabled={isExpanded}>
              <button
                onClick={() => setActiveView(item.id)}
                className={navItemClass(isActive)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={!isExpanded ? item.label : undefined}
              >
                <div className="relative flex-shrink-0">
                  <Icon className={iconClass(isActive)} />
                  {/* Collapsed: show red dot when there are unread messages */}
                  {!isExpanded && badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--danger)] border-2 border-[var(--surface)]" />
                  )}
                </div>
                {isExpanded && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {badgeCount > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-xs font-medium bg-[var(--danger)] text-white">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </>
                )}
              </button>
            </Tooltip>
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
              <Tooltip key={item.id} content={item.label} position="right" disabled={isExpanded}>
                <button
                  onClick={() => setActiveView(item.id)}
                  className={navItemClass(isActive)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={!isExpanded ? item.label : undefined}
                >
                  <Icon className={iconClass(isActive)} />
                  {isExpanded && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                </button>
              </Tooltip>
            );
          })}

        {/* ─── Utility Actions (integrated into nav) ─── */}
        {(onShowWeeklyChart || onShowShortcuts) && (
          <>
            {/* Divider before utility actions */}
            <div className="my-3 border-t border-[var(--border)]" />

            {/* Weekly Progress */}
            {onShowWeeklyChart && (
              <Tooltip content="Weekly Progress" position="right" disabled={isExpanded}>
                <button
                  onClick={onShowWeeklyChart}
                  aria-label={!isExpanded ? 'Weekly Progress' : undefined}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-xl)]
                    font-medium text-sm transition-all duration-150
                    text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]
                  `}
                >
                  <BarChart2 className="w-5 h-5 flex-shrink-0 text-[var(--text-muted)]" />
                  {isExpanded && <span>Weekly Progress</span>}
                </button>
              </Tooltip>
            )}

            {/* Keyboard Shortcuts */}
            {onShowShortcuts && (
              <Tooltip content="Shortcuts" position="right" disabled={isExpanded}>
                <button
                  onClick={onShowShortcuts}
                  aria-label={!isExpanded ? 'Keyboard Shortcuts' : undefined}
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
              </Tooltip>
            )}
          </>
        )}
      </nav>
      {/* Scroll shadow gradient */}
      {showScrollShadow && (
        <div
          className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--surface)] to-transparent pointer-events-none"
          aria-hidden="true"
        />
      )}
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
