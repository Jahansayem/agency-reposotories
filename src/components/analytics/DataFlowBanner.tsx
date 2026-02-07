'use client';

/**
 * Data Flow Banner
 *
 * Shows a visual representation of the data pipeline from import to dashboards.
 * Displays customer count, last import time, and number of active dashboards.
 * Clicking expands to show the full flow diagram.
 */

import { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  Database,
  ChevronDown,
  Upload,
  Users,
  ArrowRight,
  BarChart2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DataFlowBannerProps {
  customerCount: number;
  lastImportDate?: Date | null;
  dashboardCount: number;
}

const containerVariants: Variants = {
  initial: { opacity: 0, y: -10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

const detailsVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    marginTop: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    marginTop: 12,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

const chevronVariants: Variants = {
  collapsed: { rotate: 0 },
  expanded: { rotate: 180 },
};

export function DataFlowBanner({ customerCount, lastImportDate, dashboardCount }: DataFlowBannerProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="glass-card px-4 py-3 bg-gradient-to-r from-sky-500/10 to-purple-500/10 border border-sky-500/20"
    >
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity group"
        aria-expanded={showDetails}
        aria-label="Toggle data flow details"
      >
        <Database className="w-5 h-5 text-sky-400 flex-shrink-0" />

        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-white/70">
              Data Pipeline:
              <span className="font-semibold text-white ml-1">
                {customerCount.toLocaleString()}
              </span>
              <span className="hidden sm:inline"> customers</span>
              <span className="mx-2 text-white/40">→</span>
              <span className="font-semibold text-white">
                {dashboardCount}
              </span>
              <span className="hidden sm:inline"> dashboards</span>
            </span>

            {lastImportDate && (
              <span className="text-xs text-white/50 whitespace-nowrap">
                Last import: {formatDistanceToNow(lastImportDate, { addSuffix: true })}
              </span>
            )}
          </div>
        </div>

        <motion.div
          variants={chevronVariants}
          animate={showDetails ? 'expanded' : 'collapsed'}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors flex-shrink-0" />
        </motion.div>
      </button>

      <motion.div
        variants={detailsVariants}
        initial="collapsed"
        animate={showDetails ? 'expanded' : 'collapsed'}
        className="overflow-hidden"
      >
        <div className="pt-3 border-t border-white/10 text-sm text-white/70">
          {/* Desktop Flow Diagram */}
          <div className="hidden sm:flex items-center justify-center gap-3">
            <FlowStep icon={Upload} label="Import CSV/Excel" color="sky" />
            <ArrowRight className="w-4 h-4 text-white/30 flex-shrink-0" />
            <FlowStep icon={Users} label={`${customerCount.toLocaleString()} customers`} color="purple" />
            <ArrowRight className="w-4 h-4 text-white/30 flex-shrink-0" />
            <FlowStep icon={BarChart2} label={`${dashboardCount} dashboards`} color="sky" />
          </div>

          {/* Mobile Stacked Flow */}
          <div className="sm:hidden flex flex-col items-center gap-2">
            <FlowStep icon={Upload} label="Import CSV/Excel" color="sky" mobile />
            <ArrowRight className="w-4 h-4 text-white/30 rotate-90" />
            <FlowStep icon={Users} label={`${customerCount.toLocaleString()} customers`} color="purple" mobile />
            <ArrowRight className="w-4 h-4 text-white/30 rotate-90" />
            <FlowStep icon={BarChart2} label={`${dashboardCount} dashboards`} color="sky" mobile />
          </div>

          {/* Help Text */}
          <p className="text-xs text-white/50 mt-3 text-center">
            Data flows from uploaded files through customer segmentation to interactive dashboards
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface FlowStepProps {
  icon: typeof Upload;
  label: string;
  color: 'sky' | 'purple';
  mobile?: boolean;
}

function FlowStep({ icon: Icon, label, color, mobile }: FlowStepProps) {
  const colorClasses = {
    sky: 'bg-sky-500/20 border-sky-500/30 text-sky-400',
    purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colorClasses[color]} ${
        mobile ? 'w-full justify-center' : ''
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-xs font-medium whitespace-nowrap">{label}</span>
    </div>
  );
}

export default DataFlowBanner;
