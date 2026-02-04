'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  Flame,
  ChevronRight,
  FileText,
  Calendar,
} from 'lucide-react';
import { Todo } from '@/types/todo';

interface PipelineHealthPanelProps {
  todos: Todo[];
  onViewQuotes: () => void;
}

export default function PipelineHealthPanel({
  todos,
  onViewQuotes,
}: PipelineHealthPanelProps) {
  // Calculate pipeline stats
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const endOfWeek = new Date(today);
    // Calculate days until end of week (Sunday)
    const daysUntilSunday = 7 - today.getDay();
    endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Open quotes (category='quote', not completed)
    const openQuotes = todos.filter(
      t => t.category === 'quote' && !t.completed
    );

    // Total premium value of open quotes
    const totalPremiumValue = openQuotes.reduce(
      (sum, t) => sum + (t.premium_amount || 0),
      0
    );

    // Overdue follow-ups (category='follow-up', not completed, due_date < now)
    const overdueFollowUps = todos.filter(t => {
      if (t.category !== 'follow-up' || t.completed) return false;
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate < now;
    });

    // Quotes closing this week (quotes with due_date within this week)
    const closingThisWeek = openQuotes.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate >= today && dueDate <= endOfWeek;
    });

    // Stale quotes (quotes over 7 days old based on created_at)
    const staleQuotes = openQuotes.filter(t => {
      const createdAt = new Date(t.created_at);
      return createdAt < sevenDaysAgo;
    });

    // Hot leads (high/urgent priority quotes due today or tomorrow)
    const hotLeads = openQuotes.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const isHighPriority = t.priority === 'high' || t.priority === 'urgent';
      const isDueSoon = dueDate >= today && dueDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
      return isHighPriority && isDueSoon;
    });

    return {
      quotesCount: openQuotes.length,
      totalPremiumValue,
      overdueFollowUpsCount: overdueFollowUps.length,
      closingThisWeekCount: closingThisWeek.length,
      staleQuotesCount: staleQuotes.length,
      hotLeadsCount: hotLeads.length,
    };
  }, [todos]);

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
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
        <div className="p-2 rounded-lg bg-[#0033A0]/10 dark:bg-[#72B5E8]/20">
          <TrendingUp className="w-5 h-5 text-[#0033A0] dark:text-[#72B5E8]" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Pipeline Health
        </h3>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {/* Quotes */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50"
        >
          <div className="flex items-center justify-center mb-2">
            <FileText className="w-4 h-4 text-[#0033A0] dark:text-[#72B5E8] mr-1" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats.quotesCount}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Quotes
          </div>
          <div className="text-sm font-semibold text-[#0033A0] dark:text-[#72B5E8] mt-1">
            {formatCurrency(stats.totalPremiumValue)}
          </div>
        </motion.div>

        {/* Overdue Follow-ups */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className={`text-center p-4 rounded-lg ${
            stats.overdueFollowUpsCount > 0
              ? 'bg-amber-50 dark:bg-amber-900/20'
              : 'bg-slate-50 dark:bg-slate-700/50'
          }`}
        >
          <div className="flex items-center justify-center mb-2">
            <Clock className={`w-4 h-4 mr-1 ${
              stats.overdueFollowUpsCount > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-500 dark:text-slate-400'
            }`} />
          </div>
          <div className={`text-2xl font-bold ${
            stats.overdueFollowUpsCount > 0
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-900 dark:text-white'
          }`}>
            {stats.overdueFollowUpsCount}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Follow Up
          </div>
          <div className={`text-xs mt-1 ${
            stats.overdueFollowUpsCount > 0
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}>
            overdue
          </div>
        </motion.div>

        {/* Closing This Week */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className={`text-center p-4 rounded-lg ${
            stats.closingThisWeekCount > 0
              ? 'bg-emerald-50 dark:bg-emerald-900/20'
              : 'bg-slate-50 dark:bg-slate-700/50'
          }`}
        >
          <div className="flex items-center justify-center mb-2">
            <Calendar className={`w-4 h-4 mr-1 ${
              stats.closingThisWeekCount > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400'
            }`} />
          </div>
          <div className={`text-2xl font-bold ${
            stats.closingThisWeekCount > 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-900 dark:text-white'
          }`}>
            {stats.closingThisWeekCount}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Closing
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            this week
          </div>
        </motion.div>
      </div>

      {/* Alert Banners */}
      <div className="space-y-2 mb-5">
        {/* Stale Quotes Warning */}
        {stats.staleQuotesCount > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-sm text-amber-700 dark:text-amber-300">
              {stats.staleQuotesCount} {stats.staleQuotesCount === 1 ? 'quote' : 'quotes'} over 7 days old
            </span>
          </motion.div>
        )}

        {/* Hot Leads Warning */}
        {stats.hotLeadsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          >
            <Flame className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-300">
              {stats.hotLeadsCount} hot {stats.hotLeadsCount === 1 ? 'lead needs' : 'leads need'} callback today
            </span>
          </motion.div>
        )}
      </div>

      {/* View All Quotes Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onViewQuotes}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0033A0] hover:bg-[#002580] dark:bg-[#72B5E8] dark:hover:bg-[#5DA3D6] text-white font-medium transition-colors"
      >
        View All Quotes
        <ChevronRight className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
}
