'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  FileText,
  Shield,
  TrendingUp,
  Plus,
} from 'lucide-react';
import { useAgencyMetrics } from '@/hooks/useAgencyMetrics';
import { LogSaleModal } from './LogSaleModal';
import type { Todo } from '@/types/todo';

// ============================================
// Types
// ============================================

interface QuickStatsBarProps {
  /** Current user's display name */
  userName: string;
  /** All todos for the agency */
  todos: Todo[];
  /** Callback when a sale is logged */
  onSaleLogged: () => void;
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtext?: string;
  delay?: number;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get time-based greeting
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

/**
 * Format percentage for display
 */
function formatPercentage(value: number | undefined | null): string {
  if (value === undefined || value === null) return '--';
  return `${value.toFixed(0)}%`;
}

// ============================================
// Stat Card Component
// ============================================

function StatCard({ icon: Icon, label, value, subtext, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-white/10 backdrop-blur-sm rounded-xl p-4 min-w-[140px]"
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-white/70" />
        <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold text-white tabular-nums">
        {value}
      </div>
      {subtext && (
        <div className="text-xs text-white/60 mt-1">
          {subtext}
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// Main Component
// ============================================

export function QuickStatsBar({ userName, todos, onSaleLogged }: QuickStatsBarProps) {
  const [isLogSaleOpen, setIsLogSaleOpen] = useState(false);

  const {
    metrics,
    calculatePipelineValue,
    calculatePoliciesThisWeek,
    calculatePremiumMTD,
  } = useAgencyMetrics();

  // Calculate stats from todos
  const stats = useMemo(() => {
    const premiumMTD = calculatePremiumMTD(todos);
    const policiesThisWeek = calculatePoliciesThisWeek(todos);
    const pipeline = calculatePipelineValue(todos);
    const retentionRate = metrics?.retention_rate;

    return {
      premiumMTD,
      policiesThisWeek,
      retentionRate,
      pipelineValue: pipeline.value,
      pipelineCount: pipeline.count,
    };
  }, [todos, metrics, calculatePremiumMTD, calculatePoliciesThisWeek, calculatePipelineValue]);

  const greeting = getGreeting();
  const firstName = userName.split(' ')[0];

  const handleSaleLogged = () => {
    setIsLogSaleOpen(false);
    onSaleLogged();
  };

  return (
    <>
      {/* Gradient Header Bar */}
      <div className="bg-gradient-to-r from-[#0033A0] to-[#003D7A] rounded-2xl p-6 mb-6 shadow-lg">
        {/* Top Row: Greeting + Log Sale Button */}
        <div className="flex items-center justify-between mb-6">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-2xl font-bold text-white">
              {greeting}, {firstName}
            </h1>
            <p className="text-white/70 text-sm mt-1">
              Here&apos;s your agency performance at a glance
            </p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsLogSaleOpen(true)}
            className="
              flex items-center gap-2 px-5 py-2.5
              bg-white/20 hover:bg-white/30
              text-white font-semibold text-sm
              rounded-xl
              transition-colors duration-200
              backdrop-blur-sm
              border border-white/20
              shadow-sm
            "
          >
            <Plus className="w-4 h-4" />
            Log Sale
          </motion.button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={DollarSign}
            label="Premium MTD"
            value={formatCurrency(stats.premiumMTD)}
            delay={0.15}
          />
          <StatCard
            icon={FileText}
            label="Policies This Week"
            value={stats.policiesThisWeek}
            delay={0.2}
          />
          <StatCard
            icon={Shield}
            label="Retention"
            value={formatPercentage(stats.retentionRate)}
            delay={0.25}
          />
          <StatCard
            icon={TrendingUp}
            label="Pipeline"
            value={formatCurrency(stats.pipelineValue)}
            subtext={`${stats.pipelineCount} open quote${stats.pipelineCount !== 1 ? 's' : ''}`}
            delay={0.3}
          />
        </div>
      </div>

      {/* Log Sale Modal */}
      <LogSaleModal
        isOpen={isLogSaleOpen}
        onClose={() => setIsLogSaleOpen(false)}
        onSaleLogged={handleSaleLogged}
      />
    </>
  );
}

export default QuickStatsBar;
