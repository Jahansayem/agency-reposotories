'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { format, addDays, isWithinInterval } from 'date-fns';
import { Todo, RenewalStatus } from '@/types/todo';

interface RenewalsCalendarPanelProps {
  todos: Todo[];
  onViewCalendar: () => void;
  onRenewalClick: (todo: Todo) => void;
}

// Status configuration for renewal_status
const RENEWAL_STATUS_CONFIG: Record<
  RenewalStatus,
  {
    label: string;
    icon: typeof CheckCircle;
    colorClass: string;
    bgClass: string;
  }
> = {
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  contacted: {
    label: 'Contacted',
    icon: CheckCircle,
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
  },
  pending: {
    label: 'No contact',
    icon: AlertTriangle,
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-900/20',
  },
  'at-risk': {
    label: 'At risk',
    icon: XCircle,
    colorClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-900/20',
  },
};

export default function RenewalsCalendarPanel({
  todos,
  onViewCalendar,
  onRenewalClick,
}: RenewalsCalendarPanelProps) {
  // Filter and sort renewals for the next 30 days
  const { upcomingRenewals, stats } = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const thirtyDaysFromNow = addDays(today, 30);

    // Filter for renewal tasks in the next 30 days
    const renewals = todos.filter((t) => {
      if (t.category !== 'renewal' || t.completed) return false;
      if (!t.due_date) return false;

      const dueDate = new Date(t.due_date);
      return isWithinInterval(dueDate, {
        start: today,
        end: thirtyDaysFromNow,
      });
    });

    // Sort by due_date ascending
    renewals.sort((a, b) => {
      const dateA = new Date(a.due_date!);
      const dateB = new Date(b.due_date!);
      return dateA.getTime() - dateB.getTime();
    });

    // Calculate summary stats
    const totalRenewals = renewals.length;
    const totalPremium = renewals.reduce(
      (sum, t) => sum + (t.premium_amount || 0),
      0
    );
    const atRiskCount = renewals.filter(
      (t) => t.renewal_status === 'at-risk'
    ).length;
    const noContactCount = renewals.filter(
      (t) => t.renewal_status === 'pending'
    ).length;

    return {
      upcomingRenewals: renewals.slice(0, 5), // Only show first 5
      stats: {
        totalRenewals,
        totalPremium,
        atRiskCount,
        noContactCount,
      },
    };
  }, [todos]);

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2 rounded-lg bg-[var(--brand-blue)]/10 dark:bg-[var(--accent)]/20">
          <RefreshCw className="w-5 h-5 text-[var(--brand-blue)] dark:text-[var(--accent)]" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Renewals - Next 30 Days
        </h3>
      </div>

      {/* Renewals List */}
      <div className="space-y-2 mb-4">
        {upcomingRenewals.length === 0 ? (
          <div className="text-center py-6 text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No renewals in the next 30 days</p>
          </div>
        ) : (
          upcomingRenewals.map((renewal, index) => {
            const status = renewal.renewal_status || 'pending';
            const config = RENEWAL_STATUS_CONFIG[status];
            const StatusIcon = config.icon;
            const dueDate = new Date(renewal.due_date!);
            const customerName =
              renewal.customer_name ||
              renewal.text.slice(0, 20) +
                (renewal.text.length > 20 ? '...' : '');

            return (
              <motion.button
                key={renewal.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                onClick={() => onRenewalClick(renewal)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left group"
              >
                {/* Date */}
                <div className="w-14 flex-shrink-0 text-center">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {format(dueDate, 'MMM d')}
                  </div>
                </div>

                {/* Customer Name */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {customerName}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <StatusIcon className={`w-4 h-4 ${config.colorClass}`} />
                  <span
                    className={`text-xs font-medium ${config.colorClass} hidden sm:inline`}
                  >
                    {config.label}
                  </span>
                </div>

                {/* Premium */}
                <div className="w-16 flex-shrink-0 text-right">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {renewal.premium_amount
                      ? formatCurrency(renewal.premium_amount)
                      : '-'}
                  </span>
                </div>

                {/* Hover indicator */}
                <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </motion.button>
            );
          })
        )}
      </div>

      {/* Summary Row */}
      {stats.totalRenewals > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-sm mb-4"
        >
          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-900 dark:text-white">
              {stats.totalRenewals}
            </span>
            <span className="text-slate-600 dark:text-slate-400">renewals</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-[var(--brand-blue)] dark:text-[var(--accent)]">
              {formatCurrency(stats.totalPremium)}
            </span>
          </div>
          {stats.atRiskCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-slate-600 dark:text-slate-400">
                At Risk:
              </span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {stats.atRiskCount}
              </span>
            </div>
          )}
          {stats.noContactCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-slate-600 dark:text-slate-400">
                No Contact:
              </span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {stats.noContactCount}
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* View Full Calendar Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onViewCalendar}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--brand-blue)] hover:bg-[var(--accent-hover)] dark:bg-[var(--accent)] dark:hover:bg-[var(--accent-hover)] text-white font-medium transition-colors"
      >
        View Full Calendar
        <ChevronRight className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
}
