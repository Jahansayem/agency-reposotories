'use client';

/**
 * Customer Segmentation Dashboard
 *
 * Visualizes customer segments using the segmentation API.
 * Shows Elite, Premium, Standard, and Entry tier distributions
 * with LTV analysis and marketing allocation recommendations.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Crown,
  Star,
  Shield,
  Target,
  DollarSign,
  TrendingUp,
  PieChart,
  BarChart3,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useSegmentation, type CustomerSegment } from '../hooks';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

// Segment configuration
const SEGMENT_CONFIG = {
  elite: {
    icon: Crown,
    color: 'amber',
    gradient: 'from-amber-500/20 to-amber-500/5',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    description: 'High-value customers with 4+ products',
    avgLtv: 18000,
    targetCac: 1200,
  },
  premium: {
    icon: Star,
    color: 'purple',
    gradient: 'from-purple-500/20 to-purple-500/5',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    description: 'Multi-product bundled customers',
    avgLtv: 9000,
    targetCac: 700,
  },
  standard: {
    icon: Shield,
    color: 'blue',
    gradient: 'from-blue-500/20 to-blue-500/5',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    description: 'Single or dual product customers',
    avgLtv: 4500,
    targetCac: 400,
  },
  entry: {
    icon: Users,
    color: 'sky',
    gradient: 'from-sky-500/20 to-sky-500/5',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
    description: 'New or low-premium customers',
    avgLtv: 1800,
    targetCac: 200,
  },
};

// Demo data (used when API is not available)
const DEMO_SEGMENTS: CustomerSegment[] = [
  { segment: 'elite', count: 112, percentage: 12.8, avgLtv: 18000, characteristics: ['4+ policies', 'High retention', 'Referral source'] },
  { segment: 'premium', count: 52, percentage: 5.9, avgLtv: 9000, characteristics: ['2-3 policies', 'Bundled', 'Auto + Home'] },
  { segment: 'standard', count: 152, percentage: 17.4, avgLtv: 4500, characteristics: ['1-2 policies', 'Mid-tenure', 'Growth potential'] },
  { segment: 'entry', count: 560, percentage: 63.9, avgLtv: 1800, characteristics: ['Single policy', 'New customer', 'Conversion target'] },
];

export function CustomerSegmentationDashboard() {
  const segmentation = useSegmentation();
  const [segments, setSegments] = useState<CustomerSegment[]>(DEMO_SEGMENTS);
  const [isLiveData, setIsLiveData] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

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
    const config = SEGMENT_CONFIG[s.segment as keyof typeof SEGMENT_CONFIG];
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
              onClick={() => setShowMethodology(!showMethodology)}
              className="p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
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
          className="glass-card p-6 bg-blue-500/10 border-blue-500/30"
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
          const config = SEGMENT_CONFIG[segment.segment as keyof typeof SEGMENT_CONFIG];
          if (!config) return null;

          return (
            <motion.div
              key={segment.segment}
              variants={itemVariants}
              className={`glass-card p-6 bg-gradient-to-br ${config.gradient} ${config.border} border`}
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
                  className={`h-full bg-${config.color}-500 rounded-full`}
                  style={{ backgroundColor: `var(--${config.color}-500, currentColor)` }}
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
            </motion.div>
          );
        })}
      </div>

      {/* Marketing Allocation */}
      <motion.div variants={itemVariants} className="glass-card-elevated p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-sky-500/20 border-sky-500/30">
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
            const config = SEGMENT_CONFIG[alloc.segment as keyof typeof SEGMENT_CONFIG];
            if (!config) return null;

            return (
              <div
                key={alloc.segment}
                className={`p-4 rounded-lg bg-gradient-to-br ${config.gradient} ${config.border} border text-center`}
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
    sky: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
    gold: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  };

  return (
    <div className={`glass-card p-4 ${colorClasses[color]} text-center lg:text-left`}>
      <div className="flex items-center gap-2 justify-center lg:justify-start mb-1">
        <Icon className={`w-4 h-4 ${colorClasses[color].split(' ')[2]}`} />
        <span className="text-xs text-white/50">{label}</span>
      </div>
      <p className={`text-xl font-bold font-mono ${colorClasses[color].split(' ')[2]}`}>
        {value}
      </p>
    </div>
  );
}

export default CustomerSegmentationDashboard;
