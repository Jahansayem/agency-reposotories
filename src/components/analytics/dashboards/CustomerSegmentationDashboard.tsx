'use client';

/**
 * Customer Segmentation Dashboard
 *
 * Visualizes customer segments using the segmentation API.
 * Shows Elite, Premium, Standard, and Entry tier distributions
 * with LTV analysis and marketing allocation recommendations.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  Users,
  Crown,
  Target,
  DollarSign,
  TrendingUp,
  PieChart,
  BarChart3,
  RefreshCw,
  Info,
} from 'lucide-react';
import { type CustomerSegment } from '../hooks';
import { useCustomerList } from '@/hooks/useCustomers';
import { SEGMENT_CONFIGS, type SegmentConfig as ImportedSegmentConfig } from '@/constants/customerSegments';

// Animation variants (explicitly typed per CLAUDE.md to prevent CI failures)
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

// Note: Segment configurations now imported from @/constants/customerSegments
// This eliminates duplication and ensures consistency across the app

// Demo data (used when API is not available)
const DEMO_SEGMENTS: CustomerSegment[] = [
  { segment: 'elite', count: 112, percentage: 12.8, avgLtv: 18000, characteristics: ['4+ policies', 'High retention', 'Referral source'] },
  { segment: 'premium', count: 52, percentage: 5.9, avgLtv: 9000, characteristics: ['2-3 policies', 'Bundled', 'Auto + Home'] },
  { segment: 'standard', count: 152, percentage: 17.4, avgLtv: 4500, characteristics: ['1-2 policies', 'Mid-tenure', 'Growth potential'] },
  { segment: 'entry', count: 560, percentage: 63.9, avgLtv: 1800, characteristics: ['Single policy', 'New customer', 'Conversion target'] },
];

// Segment name mapping: API uses low_value, dashboard uses entry
const API_TO_DASHBOARD_SEGMENT: Record<string, string> = {
  elite: 'elite',
  premium: 'premium',
  standard: 'standard',
  low_value: 'entry',
};

// Note: Segment characteristics now part of SEGMENT_CONFIGS from @/constants/customerSegments

interface CustomerSegmentationDashboardProps {
  onSegmentClick?: (segment: 'elite' | 'premium' | 'standard' | 'entry') => void;
}

export function CustomerSegmentationDashboard({ onSegmentClick }: CustomerSegmentationDashboardProps = {}) {
  const customerList = useCustomerList({ limit: 1000 }); // Fetch all customers for segmentation
  const [segments, setSegments] = useState<CustomerSegment[]>(DEMO_SEGMENTS);
  const [isLiveData, setIsLiveData] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [segmentationError, setSegmentationError] = useState<string | null>(null);

  // Fetch segmentation data from API
  const fetchSegmentation = useCallback(async (customers: typeof customerList.customers) => {
    if (customers.length === 0) return;

    setIsRefreshing(true);
    setSegmentationError(null);

    try {
      // Transform customers to API format (productCount, annualPremium)
      const customerData = customers.map(c => ({
        customerId: c.id,
        productCount: c.policyCount,  // API expects productCount
        annualPremium: c.totalPremium, // API expects annualPremium
      }));

      // Call segmentation API directly
      const response = await fetch('/api/analytics/segmentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customers: customerData,
          marketingBudget: 50000, // For allocation calculation
          options: { groupBySegment: false },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch segmentation');
      }

      const result = await response.json();

      if (result?.success && result.portfolioAnalysis?.segments) {
        // Transform API response to dashboard format
        const apiSegments = result.portfolioAnalysis.segments;
        const transformedSegments: CustomerSegment[] = Object.entries(apiSegments).map(
          ([apiSegmentName, analysis]) => {
            const segmentAnalysis = analysis as { count: number; percentageOfBook: number; avgLtv: number };
            const dashboardSegment = API_TO_DASHBOARD_SEGMENT[apiSegmentName] || apiSegmentName;
            return {
              segment: dashboardSegment,
              count: segmentAnalysis.count,
              percentage: segmentAnalysis.percentageOfBook,
              avgLtv: Math.round(segmentAnalysis.avgLtv),
              characteristics: SEGMENT_CONFIGS[dashboardSegment as keyof typeof SEGMENT_CONFIGS]?.characteristics || [],
            };
          }
        );

        // Sort by LTV (elite first)
        transformedSegments.sort((a, b) => b.avgLtv - a.avgLtv);

        setSegments(transformedSegments);
        setIsLiveData(true);
      }
    } catch (error) {
      console.error('Failed to fetch segmentation:', error);
      setSegmentationError(error instanceof Error ? error.message : 'Failed to load segmentation');
      // Keep demo data on error
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Fetch segmentation when customers are loaded
  useEffect(() => {
    if (customerList.customers.length > 0 && !customerList.loading) {
      fetchSegmentation(customerList.customers);
    }
  }, [customerList.customers.length, customerList.loading, fetchSegmentation]);

  // Handle refresh button - wait for customer refresh to complete
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    customerList.refresh();
  }, [customerList]);

  // When customer list finishes refreshing, run segmentation
  useEffect(() => {
    if (!customerList.loading && isRefreshing && customerList.customers.length > 0) {
      fetchSegmentation(customerList.customers);
    }
  }, [customerList.loading, customerList.customers, isRefreshing, fetchSegmentation]);

  // Calculate totals
  const totalCustomers = segments.reduce((sum, s) => sum + s.count, 0);
  const totalLtv = segments.reduce((sum, s) => sum + (s.count * s.avgLtv), 0);
  const avgLtv = totalCustomers > 0 ? totalLtv / totalCustomers : 0;
  const highValueCount = segments
    .filter(s => s.segment === 'elite' || s.segment === 'premium')
    .reduce((sum, s) => sum + s.count, 0);

  // Marketing allocation (simplified)
  const marketingBudget = 50000; // Example budget
  const allocations = segments.map(s => {
    const config = SEGMENT_CONFIGS[s.segment as keyof typeof SEGMENT_CONFIGS];
    const weight = s.segment === 'elite' ? 0.1 : s.segment === 'premium' ? 0.2 : s.segment === 'standard' ? 0.35 : 0.35;
    return {
      segment: s.segment,
      allocation: Math.round(marketingBudget * weight),
      percentage: weight * 100,
    };
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="glass-card-elevated p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <PieChart className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Customer Segmentation</h1>
              <p className="text-white/60">LTV-based customer tier analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              isLiveData ? 'bg-sky-500/20 text-sky-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {isLiveData ? '● Live Data' : '○ Demo Data'}
            </span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || customerList.loading}
              className="p-3 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing || customerList.loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              className="p-3 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
              title="Toggle methodology panel"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="Total Customers"
            value={totalCustomers.toLocaleString()}
            icon={Users}
            color="sky"
          />
          <SummaryCard
            label="Total Portfolio LTV"
            value={`$${(totalLtv / 1000000).toFixed(1)}M`}
            icon={DollarSign}
            color="gold"
          />
          <SummaryCard
            label="Avg LTV/Customer"
            value={`$${avgLtv.toLocaleString()}`}
            icon={TrendingUp}
            color="purple"
          />
          <SummaryCard
            label="High-Value Customers"
            value={`${highValueCount} (${((highValueCount / totalCustomers) * 100).toFixed(1)}%)`}
            icon={Crown}
            color="amber"
          />
        </div>
      </motion.div>

      {/* Methodology Panel */}
      {showMethodology && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="glass-card p-6 bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30"
        >
          <h3 className="font-semibold text-blue-400 mb-3">Segmentation Methodology</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-white/70">
            <div>
              <p className="font-medium text-white mb-2">LTV Calculation:</p>
              <code className="block p-2 rounded bg-black/30 text-xs font-mono">
                LTV = (Avg Premium × Tenure Years × Retention Rate) × Product Multiplier
              </code>
            </div>
            <div>
              <p className="font-medium text-white mb-2">Tier Thresholds:</p>
              <ul className="space-y-1">
                <li>• Elite: LTV ≥ $15,000 or 4+ products</li>
                <li>• Premium: LTV $7,000-$15,000 or bundled</li>
                <li>• Standard: LTV $3,000-$7,000</li>
                <li>• Entry: LTV &lt; $3,000</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Segment Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {segments.map((segment) => {
          const config = SEGMENT_CONFIGS[segment.segment as keyof typeof SEGMENT_CONFIGS];
          if (!config) return null;

          const isClickable = !!onSegmentClick && segment.segment !== 'all';
          const segmentKey = segment.segment as 'elite' | 'premium' | 'standard' | 'entry';

          return (
            <motion.button
              key={segment.segment}
              variants={itemVariants}
              onClick={() => isClickable && onSegmentClick(segmentKey)}
              disabled={!isClickable}
              className={`glass-card p-6 bg-gradient-to-br ${config.gradient} border ${config.border} text-left w-full transition-all ${
                isClickable ? 'cursor-pointer hover:scale-105 hover:border-white/30 hover:shadow-xl' : ''
              }`}
              title={isClickable ? `View ${segment.segment} customers` : undefined}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-white/10`}>
                    <config.icon className={`w-5 h-5 ${config.text}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white capitalize">{segment.segment}</h3>
                    <p className="text-xs text-white/50">{config.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold font-mono ${config.text}`}>
                    {segment.count}
                  </p>
                  <p className="text-xs text-white/50">{segment.percentage.toFixed(1)}%</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${segment.percentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    config.color === 'amber' ? 'bg-amber-500' :
                    config.color === 'purple' ? 'bg-purple-500' :
                    config.color === 'blue' ? 'bg-blue-500' :
                    'bg-sky-500'
                  }`}
                />
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded-lg bg-white/5">
                  <p className="text-xs text-white/50">Avg LTV</p>
                  <p className={`font-bold font-mono ${config.text}`}>
                    ${segment.avgLtv.toLocaleString()}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-white/5">
                  <p className="text-xs text-white/50">Target CAC</p>
                  <p className={`font-bold font-mono ${config.text}`}>
                    ${config.targetCac}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-white/5">
                  <p className="text-xs text-white/50">LTV:CAC</p>
                  <p className={`font-bold font-mono ${config.text}`}>
                    {(segment.avgLtv / config.targetCac).toFixed(1)}x
                  </p>
                </div>
              </div>

              {/* Characteristics */}
              <div className="mt-4 flex flex-wrap gap-2">
                {segment.characteristics.map((char, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded-full text-xs bg-white/10 text-white/70"
                  >
                    {char}
                  </span>
                ))}
              </div>

              {/* Click hint for clickable cards */}
              {isClickable && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-white/40 text-center">
                    Click to view customers →
                  </p>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Marketing Allocation */}
      <motion.div variants={itemVariants} className="glass-card-elevated p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-sky-500/20 border border-sky-500/30">
            <Target className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Recommended Marketing Allocation</h3>
            <p className="text-xs text-white/50">
              Based on ${marketingBudget.toLocaleString()} monthly budget
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {allocations.map((alloc) => {
            const config = SEGMENT_CONFIGS[alloc.segment as keyof typeof SEGMENT_CONFIGS];
            if (!config) return null;

            return (
              <div
                key={alloc.segment}
                className={`p-4 rounded-lg bg-gradient-to-br ${config.gradient} border ${config.border} text-center`}
              >
                <p className="text-xs text-white/50 capitalize mb-1">{alloc.segment}</p>
                <p className={`text-xl font-bold font-mono ${config.text}`}>
                  ${alloc.allocation.toLocaleString()}
                </p>
                <p className="text-xs text-white/40">{alloc.percentage}% of budget</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-4 rounded-lg bg-sky-500/10 border border-sky-500/20">
          <p className="text-sm text-sky-300">
            <BarChart3 className="w-4 h-4 inline mr-2" />
            <strong>Strategy:</strong> Focus acquisition spend on Entry/Standard tiers for growth.
            Retention budget concentrated on Premium/Elite for LTV protection.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Helper Components

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  color: 'sky' | 'gold' | 'purple' | 'amber';
}) {
  const colorClasses = {
    sky: { bg: 'from-sky-500/20 to-sky-500/5', border: 'border-sky-500/30', text: 'text-sky-400' },
    gold: { bg: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/30', text: 'text-amber-400' },
    purple: { bg: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/30', text: 'text-purple-400' },
    amber: { bg: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/30', text: 'text-amber-400' },
  };

  const classes = colorClasses[color];

  return (
    <div className={`glass-card p-4 bg-gradient-to-br ${classes.bg} border ${classes.border} text-center lg:text-left`}>
      <div className="flex items-center gap-2 justify-center lg:justify-start mb-1">
        <Icon className={`w-4 h-4 ${classes.text}`} />
        <span className="text-xs text-white/50">{label}</span>
      </div>
      <p className={`text-xl font-bold font-mono ${classes.text}`}>
        {value}
      </p>
    </div>
  );
}

export default CustomerSegmentationDashboard;
