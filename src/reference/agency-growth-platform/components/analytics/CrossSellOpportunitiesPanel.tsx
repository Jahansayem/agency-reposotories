'use client';

/**
 * Cross-Sell Opportunities Panel
 *
 * Displays cross-sell opportunities from Allstate data analysis.
 * Can be embedded in dashboard or calendar views.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  Mail,
  Calendar,
  DollarSign,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  ListTodo,
  Filter,
  RefreshCw,
  TrendingUp,
  Flame,
  Zap,
} from 'lucide-react';
import { useCrossSellData, type CrossSellFilters } from '@/hooks/useCrossSellData';
import { PRIORITY_TIER_CONFIG, type CrossSellOpportunity, type CrossSellPriorityTier } from '@/types/allstate-analytics';

interface CrossSellOpportunitiesPanelProps {
  agencyId?: string;
  maxItems?: number;
  showFilters?: boolean;
  showActions?: boolean;
  currentUser?: string;
  onCreateTask?: (opportunity: CrossSellOpportunity) => void;
  className?: string;
}

export function CrossSellOpportunitiesPanel({
  agencyId,
  maxItems = 10,
  showFilters = true,
  showActions = true,
  currentUser,
  onCreateTask,
  className = '',
}: CrossSellOpportunitiesPanelProps) {
  const [selectedTiers, setSelectedTiers] = useState<CrossSellPriorityTier[]>(['HOT', 'HIGH']);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const {
    opportunities,
    loading,
    error,
    summary,
    totalCount,
    refetch,
    markContacted,
    dismiss,
    updateOutcome,
    generateTasks,
    filters,
    setFilters,
  } = useCrossSellData({
    agencyId,
    initialFilters: { tiers: selectedTiers },
    pageSize: maxItems,
  });

  // Toggle tier filter
  const toggleTier = useCallback(
    (tier: CrossSellPriorityTier) => {
      const newTiers = selectedTiers.includes(tier)
        ? selectedTiers.filter((t) => t !== tier)
        : [...selectedTiers, tier];

      setSelectedTiers(newTiers);
      setFilters({ ...filters, tiers: newTiers.length > 0 ? newTiers : undefined });
    },
    [selectedTiers, filters, setFilters]
  );

  // Handle contact action
  const handleContact = useCallback(
    async (opp: CrossSellOpportunity) => {
      if (!currentUser) return;

      setActionLoading(opp.id);
      try {
        await markContacted(opp.id, currentUser);
      } finally {
        setActionLoading(null);
      }
    },
    [currentUser, markContacted]
  );

  // Handle dismiss action
  const handleDismiss = useCallback(
    async (opp: CrossSellOpportunity, reason: string) => {
      setActionLoading(opp.id);
      try {
        await dismiss(opp.id, reason);
      } finally {
        setActionLoading(null);
      }
    },
    [dismiss]
  );

  // Handle create task
  const handleCreateTask = useCallback(
    async (opp: CrossSellOpportunity) => {
      if (onCreateTask) {
        onCreateTask(opp);
        return;
      }

      setActionLoading(opp.id);
      try {
        await generateTasks([opp.id], currentUser);
        // Refresh to show updated task_id
        await refetch();
      } finally {
        setActionLoading(null);
      }
    },
    [currentUser, generateTasks, onCreateTask, refetch]
  );

  // Get tier icon
  const getTierIcon = (tier: CrossSellPriorityTier) => {
    switch (tier) {
      case 'HOT':
        return <Flame className="w-4 h-4" />;
      case 'HIGH':
        return <Zap className="w-4 h-4" />;
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Cross-Sell Opportunities
            </h3>
            {summary && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({summary.hot_count + summary.high_count} priority)
              </span>
            )}
          </div>
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tier filters */}
        {showFilters && (
          <div className="flex gap-2 flex-wrap">
            {(['HOT', 'HIGH', 'MEDIUM', 'LOW'] as CrossSellPriorityTier[]).map((tier) => {
              const config = PRIORITY_TIER_CONFIG[tier];
              const isSelected = selectedTiers.includes(tier);
              const count =
                tier === 'HOT'
                  ? summary?.hot_count
                  : tier === 'HIGH'
                  ? summary?.high_count
                  : tier === 'MEDIUM'
                  ? summary?.medium_count
                  : summary?.low_count;

              return (
                <button
                  key={tier}
                  onClick={() => toggleTier(tier)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? 'ring-2 ring-offset-2 dark:ring-offset-gray-800'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: config.bgColor,
                    color: config.color,
                    ...(isSelected ? { ringColor: config.color } : {}),
                  }}
                >
                  {getTierIcon(tier)}
                  {tier === 'HOT' ? 'HOT' : config.label}
                  {count !== undefined && <span className="ml-1">({count})</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700/50 max-h-[500px] overflow-y-auto">
        {loading && opportunities.length === 0 ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading opportunities...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <XCircle className="w-8 h-8 mx-auto text-red-400" />
            <p className="text-sm text-red-500 mt-2">{error}</p>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-8 h-8 mx-auto text-green-400" />
            <p className="text-gray-600 dark:text-gray-300 font-medium mt-2">
              No opportunities in selected tiers
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload new data or adjust filters
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {opportunities.map((opp) => {
              const config = PRIORITY_TIER_CONFIG[opp.priority_tier];
              const isExpanded = expandedId === opp.id;
              const isLoading = actionLoading === opp.id;

              return (
                <motion.div
                  key={opp.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative"
                >
                  {/* Priority indicator stripe */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: config.color }}
                  />

                  <div className="pl-4">
                    {/* Main row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : opp.id)}
                      className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Customer name and tier */}
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: config.bgColor,
                                color: config.color,
                              }}
                            >
                              {config.icon} {opp.priority_tier}
                            </span>
                            {opp.contacted_at && (
                              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Contacted
                              </span>
                            )}
                            {opp.task_id && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <ListTodo className="w-3 h-3" /> Has Task
                              </span>
                            )}
                          </div>

                          {/* Customer name */}
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            {opp.customer_name}
                          </h4>

                          {/* Recommendation */}
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                            Recommend: <span className="font-medium">{opp.recommended_product}</span>
                          </p>

                          {/* Key stats */}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {opp.renewal_date
                                ? new Date(opp.renewal_date).toLocaleDateString()
                                : 'No date'}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              ${opp.potential_premium_add?.toLocaleString() || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {opp.tenure_years} yrs
                            </span>
                          </div>
                        </div>

                        <ChevronRight
                          className={`w-5 h-5 text-gray-400 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3">
                            {/* Contact info */}
                            <div className="flex gap-4">
                              {opp.phone && (
                                <a
                                  href={`tel:${opp.phone}`}
                                  className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  <Phone className="w-4 h-4" />
                                  {opp.phone}
                                </a>
                              )}
                              {opp.email && (
                                <a
                                  href={`mailto:${opp.email}`}
                                  className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  <Mail className="w-4 h-4" />
                                  {opp.email}
                                </a>
                              )}
                            </div>

                            {/* Talking points */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                Talking Points
                              </p>
                              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                {opp.talking_point_1 && (
                                  <li className="flex items-start gap-2">
                                    <span className="text-blue-500">1.</span>
                                    {opp.talking_point_1}
                                  </li>
                                )}
                                {opp.talking_point_2 && (
                                  <li className="flex items-start gap-2">
                                    <span className="text-blue-500">2.</span>
                                    {opp.talking_point_2}
                                  </li>
                                )}
                                {opp.talking_point_3 && (
                                  <li className="flex items-start gap-2">
                                    <span className="text-blue-500">3.</span>
                                    {opp.talking_point_3}
                                  </li>
                                )}
                              </ul>
                            </div>

                            {/* Actions */}
                            {showActions && (
                              <div className="flex gap-2">
                                {!opp.contacted_at && (
                                  <button
                                    onClick={() => handleContact(opp)}
                                    disabled={isLoading}
                                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                                  >
                                    {isLoading ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Phone className="w-4 h-4" />
                                        Mark Contacted
                                      </>
                                    )}
                                  </button>
                                )}
                                {!opp.task_id && (
                                  <button
                                    onClick={() => handleCreateTask(opp)}
                                    disabled={isLoading}
                                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                                  >
                                    {isLoading ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <>
                                        <ListTodo className="w-4 h-4" />
                                        Create Task
                                      </>
                                    )}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDismiss(opp, 'Not interested')}
                                  disabled={isLoading}
                                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer with totals */}
      {summary && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {totalCount} total opportunities
            </span>
            <span className="font-medium text-green-600 dark:text-green-400">
              ${summary.total_potential_premium.toLocaleString()} potential
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default CrossSellOpportunitiesPanel;
