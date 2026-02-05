/**
 * Allstate 2026 Compensation Dashboard
 *
 * A comprehensive, executive-grade dashboard for the 2026 Agency Compensation Program.
 * Features the Executive Intelligence Design System v3.0 premium dark theme.
 *
 * Key Features:
 * - Two-component bonus structure (Auto/Home/AFS 3% + Other PL 1%)
 * - California-specific handling (4% Auto+AFS only)
 * - Quarterly advance payout tracker
 * - State-specific variable compensation tables
 * - Interactive portfolio growth calculator
 * - Loss ratio qualification display
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  Award,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Info,
  Zap,
  Target,
  Shield,
  Clock,
  ChevronDown,
  ChevronRight,
  Percent,
  Users,
  Car,
  Home,
  Umbrella,
  BarChart3,
  Gift,
  MapPin,
  Calculator,
  Sparkles,
  Lock,
  Unlock,
  AlertTriangle,
  Check,
  X,
  Star,
  ArrowUpRight,
  Timer,
  Wallet,
  PiggyBank,
  Layers
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import {
  compensation2026,
  getAgencyTier,
  getNBVariableCompRate,
  getRenewalVariableCompRate,
  qualifiesForQuarterlyAdvance,
  calculateQuarterlyAdvance,
  calculatePortfolioGrowthPoints,
  type AAPLevel,
  type BundlingStatus
} from '../config/compensation2026';
import { ELIGIBLE_PREMIUM_FACTOR } from '../config/modelConstants';

// ============================================================================
// TYPES
// ============================================================================

interface Compensation2026DashboardProps {
  currentPIF?: number;
  currentPG?: number;
  writtenPremium?: number;
  lossRatio?: number;
  onPaceBPS?: number;
  aapLevel?: AAPLevel;
  isOptedInQuarterly?: boolean;
  state?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const KEY_DATES_2026 = [
  { date: 'Jan 1, 2026', event: 'Renewal VC rates effective', icon: Calendar, color: 'sky' },
  { date: 'Mid-Jan 2026', event: 'Quarterly advance opt-in opens', icon: Lock, color: 'gold' },
  { date: 'Jan 31, 2026', event: 'Quarterly advance opt-in closes', icon: Clock, color: 'rose' },
  { date: 'Feb 1, 2026', event: 'NB variable comp rates effective', icon: DollarSign, color: 'sky' },
  { date: 'Feb 2026', event: 'Contingency Plan starts (CW)', icon: Shield, color: 'sapphire' },
  { date: 'Mar 2026', event: 'Contingency Plan starts (NJ/NY)', icon: Shield, color: 'sapphire' },
  { date: 'Apr 2026', event: 'Q1 quarterly advance payout', icon: Wallet, color: 'gold' },
  { date: 'Jul 2026', event: 'Q2 quarterly advance payout', icon: Wallet, color: 'gold' },
  { date: 'Oct 2026', event: 'Q3 quarterly advance payout', icon: Wallet, color: 'gold' },
  { date: 'Dec 31, 2026', event: 'Year-end measurement', icon: Target, color: 'sky' },
];

const QUARTER_PAYOUTS = [
  { quarter: 'Q1', percent: 15, cumulative: 15, month: 'April' },
  { quarter: 'Q2', percent: 15, cumulative: 30, month: 'July' },
  { quarter: 'Q3', percent: 20, cumulative: 50, month: 'October' },
  { quarter: 'Q4/YE', percent: 50, cumulative: 100, month: 'Year-End' },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  badge,
  accentColor = 'sky'
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  accentColor?: 'sky' | 'gold' | 'sapphire' | 'rose';
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const colorClasses = {
    sky: 'text-sky-400 bg-sky-500/20',
    gold: 'text-gold-400 bg-gold-500/20',
    sapphire: 'text-sapphire-400 bg-sapphire-500/20',
    rose: 'text-rose-400 bg-rose-500/20',
  };

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 hover:bg-obsidian-800/30 transition-colors duration-200"
      >
        <div className="flex items-center gap-4">
          <div className={`icon-container-md ${colorClasses[accentColor]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="heading-4">{title}</h3>
          {badge && (
            <span className={`badge ${accentColor === 'gold' ? 'badge-warning' : accentColor === 'rose' ? 'badge-danger' : 'badge-primary'}`}>
              {badge}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-obsidian-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="p-5 pt-0 border-t border-obsidian-800/60">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  color = 'sky',
  delay = 0
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  trend?: { value: string; positive: boolean };
  color?: 'sky' | 'gold' | 'sapphire' | 'rose';
  delay?: number;
}) {
  const gradients = {
    sky: 'from-sky-500/20 via-transparent to-transparent',
    gold: 'from-gold-500/20 via-transparent to-transparent',
    sapphire: 'from-sapphire-500/20 via-transparent to-transparent',
    rose: 'from-rose-500/20 via-transparent to-transparent',
  };

  const iconColors = {
    sky: 'text-sky-400',
    gold: 'text-gold-400',
    sapphire: 'text-sapphire-400',
    rose: 'text-rose-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      className="metric-card relative overflow-hidden group"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradients[color]} opacity-50`} />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <span className="metric-label">{label}</span>
          <Icon className={`w-5 h-5 ${iconColors[color]}`} />
        </div>
        <div className="metric-value font-data">{value}</div>
        {subtext && (
          <p className="text-xs text-obsidian-400 mt-2">{subtext}</p>
        )}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trend.positive ? 'text-sky-400' : 'text-rose-400'}`}>
            <ArrowUpRight className={`w-3 h-3 ${!trend.positive && 'rotate-180'}`} />
            {trend.value}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ProgressRing({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  color = 'sky',
  label,
  sublabel
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: 'sky' | 'gold' | 'sapphire';
  label?: string;
  sublabel?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = Math.min(value / max, 1);
  const offset = circumference - percent * circumference;

  const colors = {
    sky: '#0ea5e9',
    gold: '#f59e0b',
    sapphire: '#3b82f6',
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-obsidian-800"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors[color]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white font-data">{(percent * 100).toFixed(0)}%</span>
        {label && <span className="text-xs text-obsidian-400 mt-1">{label}</span>}
        {sublabel && <span className="text-[10px] text-obsidian-500">{sublabel}</span>}
      </div>
    </div>
  );
}

function QualifierBadge({
  qualified,
  label,
  requirement
}: {
  qualified: boolean;
  label: string;
  requirement: string;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${
      qualified
        ? 'bg-sky-500/10 border border-sky-500/30'
        : 'bg-rose-500/10 border border-rose-500/30'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        qualified ? 'bg-sky-500/20' : 'bg-rose-500/20'
      }`}>
        {qualified ? (
          <Check className="w-4 h-4 text-sky-400" />
        ) : (
          <X className="w-4 h-4 text-rose-400" />
        )}
      </div>
      <div>
        <p className={`text-sm font-medium ${qualified ? 'text-sky-300' : 'text-rose-300'}`}>
          {label}
        </p>
        <p className="text-xs text-obsidian-400">{requirement}</p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Compensation2026Dashboard({
  currentPIF = 1424,
  currentPG = 117,
  writtenPremium = 4218886,
  lossRatio = 65.5,
  onPaceBPS = 285,
  aapLevel = 'Pro',
  isOptedInQuarterly = false,
  state = 'CA'
}: Compensation2026DashboardProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'bonus' | 'quarterly' | 'rates' | 'timeline'>('overview');
  const [portfolioGrowthInput, setPortfolioGrowthInput] = useState(200);
  const [estimatedBonus, setEstimatedBonus] = useState(50000);

  // Derived state
  const agencyTier = getAgencyTier(currentPIF);
  const isCaliforniaAgent = state === 'CA';
  const lossRatioQualifier = isCaliforniaAgent ? 73.0 : 68.0;
  const meetsLossRatioQualifier = lossRatio <= lossRatioQualifier;

  // Calculate quarterly qualification
  const quarterlyQualifiers = [1, 2, 3].map(q => ({
    quarter: q,
    qualified: qualifiesForQuarterlyAdvance(q as 1 | 2 | 3, state, lossRatio, onPaceBPS)
  }));

  // Calculate bonus projections
  const eligiblePremium = writtenPremium * ELIGIBLE_PREMIUM_FACTOR;

  const bonusProjection = useMemo(() => {
    const pgTiers = compensation2026.agencyBonus.portfolioGrowth.tiers;
    const data = [];

    for (let pg = 0; pg <= 500; pg += 25) {
      const tier = pgTiers.find((t, i) => {
        const nextTier = pgTiers[i + 1];
        return pg >= t.threshold && (!nextTier || pg < nextTier.threshold);
      });

      const bonusPercent = tier?.bonusPercent || 0;
      const bonus = eligiblePremium * (bonusPercent / 100);

      data.push({
        pg,
        bonus,
        bonusPercent,
        tier: tier?.label || 'None'
      });
    }

    return data;
  }, [eligiblePremium]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  const formatPercent = (value: number, decimals = 1) => `${value.toFixed(decimals)}%`;

  // Get current bonus projection
  const currentBonusTier = compensation2026.agencyBonus.portfolioGrowth.tiers.find((t, i) => {
    const nextTier = compensation2026.agencyBonus.portfolioGrowth.tiers[i + 1];
    return currentPG >= t.threshold && (!nextTier || currentPG < nextTier.threshold);
  });
  const currentBonusPercent = currentBonusTier?.bonusPercent || 0;
  const currentBonus = eligiblePremium * (currentBonusPercent / 100);

  return (
    <div className="min-h-screen bg-obsidian-950">
      {/* ═══════════════════════════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden">
        {/* Background gradient mesh */}
        <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-obsidian-950" />

        {/* Animated glow orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: '1s' }} />

        <div className="relative container-wide px-6 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-gold-500/20 rounded-full border border-gold-500/30">
                <Sparkles className="w-4 h-4 text-gold-400" />
                <span className="text-sm font-semibold text-gold-300">2026 PROGRAM</span>
              </div>
              <span className="text-obsidian-500">•</span>
              <span className="text-sm text-obsidian-400">Effective January 1, 2026</span>
            </div>

            <h1 className="heading-1 text-gradient-premium mb-4">
              Agency Compensation Program
            </h1>
            <p className="body-lg text-obsidian-300 max-w-2xl">
              Streamlined bonus structure with Portfolio Growth focus, quarterly advance payouts,
              and enhanced variable compensation for bundled policies.
            </p>
          </motion.div>

          {/* Key Changes Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="glass-card-elevated p-6 mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-5 h-5 text-gold-400" />
              <h2 className="heading-4 text-gold-300">Key Changes from 2025</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Bonus Metric', from: 'PBR + Portfolio Growth', to: 'Portfolio Growth Only', icon: Target },
                { label: 'Max Bonus', from: '~5% combined', to: '4% (3% + 1%)', icon: Percent },
                { label: 'Loss Ratio', from: 'Not required', to: `≤${isCaliforniaAgent ? '73' : '68'}% qualifier`, icon: Shield },
                { label: 'Quarterly Advances', from: 'Available', to: '15/15/20/50% split', icon: Calendar },
              ].map((change, i) => (
                <div key={i} className="bg-obsidian-800/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <change.icon className="w-4 h-4 text-obsidian-400" />
                    <span className="text-xs font-semibold text-obsidian-400 uppercase tracking-wider">{change.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-obsidian-500 line-through">{change.from}</span>
                    <ArrowRight className="w-3 h-3 text-sky-400" />
                    <span className="text-sm font-semibold text-sky-300">{change.to}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Agency Status Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="Your State"
              value={state}
              subtext={isCaliforniaAgent ? 'Restricted state - flat rates' : 'Bundling rates apply'}
              icon={MapPin}
              color="sapphire"
              delay={0.3}
            />
            <StatCard
              label="Agency Tier"
              value={`${agencyTier?.tier || '1'} - ${agencyTier?.subTier || 'Larger'}`}
              subtext={`${currentPIF.toLocaleString()} PIF`}
              icon={Users}
              color="sky"
              delay={0.35}
            />
            <StatCard
              label="AAP Level"
              value={aapLevel}
              subtext={aapLevel === 'Elite' ? 'Highest renewal rates' : 'Standard rates'}
              icon={Award}
              color={aapLevel === 'Elite' ? 'gold' : 'sky'}
              delay={0.4}
            />
            <StatCard
              label="Loss Ratio"
              value={formatPercent(lossRatio)}
              subtext={meetsLossRatioQualifier ? '✓ Qualifies for bonus' : '✗ Above threshold'}
              icon={Shield}
              color={meetsLossRatioQualifier ? 'sky' : 'rose'}
              delay={0.45}
            />
            <StatCard
              label="On-Pace BPS"
              value={onPaceBPS}
              subtext={onPaceBPS >= 250 ? '✓ Qualifies for Q advances' : 'Need ≥250 for Q advances'}
              icon={TrendingUp}
              color={onPaceBPS >= 250 ? 'sky' : 'gold'}
              delay={0.5}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          TAB NAVIGATION
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-40 bg-obsidian-950/95 backdrop-blur-xl border-b border-obsidian-800/60">
        <div className="container-wide px-6">
          <div className="flex gap-1 py-2 overflow-x-auto scrollbar-hide">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'bonus', label: 'Bonus Calculator', icon: Calculator },
              { id: 'quarterly', label: 'Quarterly Advances', icon: Wallet },
              { id: 'rates', label: 'Variable Comp Rates', icon: Percent },
              { id: 'timeline', label: 'Key Dates', icon: Calendar },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as typeof selectedTab)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  selectedTab === tab.id
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-obsidian-400 hover:text-obsidian-200 hover:bg-obsidian-800/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="container-wide px-6 py-8">
        <AnimatePresence mode="wait">
          {/* ═══════════════════════════════════════════════════════════════
              OVERVIEW TAB
              ═══════════════════════════════════════════════════════════════ */}
          {selectedTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Two-Component Bonus Structure */}
              <div className="glass-card-elevated p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="icon-container-lg icon-primary">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="heading-3">2026 Agency Bonus Structure</h2>
                    <p className="body-sm text-obsidian-400">
                      Two-component system based on Portfolio Growth
                    </p>
                  </div>
                </div>

                {isCaliforniaAgent ? (
                  /* California-specific single component */
                  <div className="bg-gradient-to-br from-gold-500/10 via-obsidian-900/50 to-obsidian-900/50 rounded-2xl p-6 border border-gold-500/20">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gold-500/20 flex items-center justify-center">
                        <Star className="w-6 h-6 text-gold-400" />
                      </div>
                      <div>
                        <h3 className="heading-4 text-gold-300">California Only</h3>
                        <p className="text-sm text-obsidian-400 mt-1">
                          Single component structure for CA agents
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-5xl font-bold text-gold-400 font-data mb-2">4%</div>
                        <p className="text-sm text-obsidian-300 font-medium">Maximum Bonus</p>
                        <p className="text-xs text-obsidian-500 mt-1">Standard Auto + AFS</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-obsidian-300 mb-3">Eligible Products</h4>
                        <div className="flex flex-wrap gap-2">
                          {compensation2026.agencyBonus2026.californiaOnly.eligibleProducts.slice(0, 5).map((product, i) => (
                            <span key={i} className="px-2 py-1 bg-obsidian-800/60 rounded text-xs text-obsidian-300">
                              {product}
                            </span>
                          ))}
                          <span className="px-2 py-1 bg-obsidian-800/60 rounded text-xs text-obsidian-400">
                            +{compensation2026.agencyBonus2026.californiaOnly.eligibleProducts.length - 5} more
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-obsidian-900/60 rounded-xl">
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-gold-400" />
                        <span className="text-obsidian-300">
                          <strong className="text-gold-300">Note:</strong> Homeowners not included in CA bonus structure.
                          Loss ratio qualifier: ≤73.00%
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Countrywide two-component structure */
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Component 1: Auto/Home/AFS */}
                    <div className="bg-gradient-to-br from-sky-500/10 via-obsidian-900/50 to-obsidian-900/50 rounded-2xl p-6 border border-sky-500/20">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
                            <Car className="w-5 h-5 text-sky-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">Auto/Home/AFS</h3>
                            <p className="text-xs text-obsidian-400">Component 1</p>
                          </div>
                        </div>
                        <div className="text-3xl font-bold text-sky-400 font-data">3%</div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <p className="text-xs font-semibold text-obsidian-400 uppercase tracking-wider">Eligible Products</p>
                        <div className="flex flex-wrap gap-1.5">
                          {['Standard Auto', 'Homeowners', 'Life Insurance', 'Annuities'].map((product, i) => (
                            <span key={i} className="px-2 py-1 bg-sky-500/10 border border-sky-500/20 rounded text-xs text-sky-300">
                              {product}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="h-2 bg-obsidian-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-sky-600 to-sky-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(currentBonusPercent / 4) * 100}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                        />
                      </div>
                      <p className="text-xs text-obsidian-500 mt-2">
                        Current: {Math.min(currentBonusPercent, 3)}% of 3% max
                      </p>
                    </div>

                    {/* Component 2: Other Personal Lines */}
                    <div className="bg-gradient-to-br from-sapphire-500/10 via-obsidian-900/50 to-obsidian-900/50 rounded-2xl p-6 border border-sapphire-500/20">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sapphire-500/20 flex items-center justify-center">
                            <Umbrella className="w-5 h-5 text-sapphire-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">Other Personal Lines</h3>
                            <p className="text-xs text-obsidian-400">Component 2</p>
                          </div>
                        </div>
                        <div className="text-3xl font-bold text-sapphire-400 font-data">1%</div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <p className="text-xs font-semibold text-obsidian-400 uppercase tracking-wider">Eligible Products</p>
                        <div className="flex flex-wrap gap-1.5">
                          {['Condo', 'Renters', 'PUP', 'Specialty Auto', 'Boat'].map((product, i) => (
                            <span key={i} className="px-2 py-1 bg-sapphire-500/10 border border-sapphire-500/20 rounded text-xs text-sapphire-300">
                              {product}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="h-2 bg-obsidian-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-sapphire-600 to-sapphire-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((currentBonusPercent - 3) / 1, 1) * 100}%` }}
                          transition={{ duration: 1, delay: 0.7 }}
                        />
                      </div>
                      <p className="text-xs text-obsidian-500 mt-2">
                        Current: {Math.max(0, Math.min(currentBonusPercent - 3, 1)).toFixed(1)}% of 1% max
                      </p>
                    </div>
                  </div>
                )}

                {/* Loss Ratio Qualifier */}
                <div className="mt-6 p-4 bg-obsidian-800/40 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className={`w-5 h-5 ${meetsLossRatioQualifier ? 'text-sky-400' : 'text-rose-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-white">Loss Ratio Qualifier</p>
                        <p className="text-xs text-obsidian-400">
                          Standard Auto Only Capped Paid Loss Ratio (better of 12MM and 24MM)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold font-data ${meetsLossRatioQualifier ? 'text-sky-400' : 'text-rose-400'}`}>
                        {formatPercent(lossRatio)}
                      </p>
                      <p className="text-xs text-obsidian-400">
                        Requirement: ≤{formatPercent(lossRatioQualifier)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Bonus Projection */}
              <div className="glass-card p-6">
                <h3 className="heading-4 mb-4">Your Current Bonus Projection</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-obsidian-800/40 rounded-xl p-5">
                    <p className="text-xs font-semibold text-obsidian-400 uppercase tracking-wider mb-2">Portfolio Growth</p>
                    <p className="text-3xl font-bold text-sky-400 font-data">+{currentPG}</p>
                    <p className="text-xs text-obsidian-500 mt-1">
                      Tier: {currentBonusTier?.label || 'None'}
                    </p>
                  </div>
                  <div className="bg-obsidian-800/40 rounded-xl p-5">
                    <p className="text-xs font-semibold text-obsidian-400 uppercase tracking-wider mb-2">Bonus Rate</p>
                    <p className="text-3xl font-bold text-gold-400 font-data">{currentBonusPercent}%</p>
                    <p className="text-xs text-obsidian-500 mt-1">
                      of eligible premium
                    </p>
                  </div>
                  <div className="bg-obsidian-800/40 rounded-xl p-5">
                    <p className="text-xs font-semibold text-obsidian-400 uppercase tracking-wider mb-2">Estimated Bonus</p>
                    <p className="text-3xl font-bold text-white font-data">{formatCurrency(currentBonus)}</p>
                    <p className="text-xs text-obsidian-500 mt-1">
                      Based on {formatCurrency(eligiblePremium)} eligible
                    </p>
                  </div>
                </div>
              </div>

              {/* Portfolio Growth Points */}
              <CollapsibleSection
                title="Portfolio Growth Point Values"
                icon={TrendingUp}
                badge="Reference"
                accentColor="sky"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-obsidian-800/60">
                        <th className="text-left py-3 px-4 text-obsidian-400 font-semibold">Product Line</th>
                        <th className="text-center py-3 px-4 text-obsidian-400 font-semibold">Points</th>
                        <th className="text-center py-3 px-4 text-obsidian-400 font-semibold">Category</th>
                        <th className="text-center py-3 px-4 text-obsidian-400 font-semibold">Bonus Eligible</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compensation2026.portfolioGrowthPoints.map((item, i) => (
                        <tr key={i} className={`border-b border-obsidian-800/30 ${i % 2 === 0 ? 'bg-obsidian-900/30' : ''}`}>
                          <td className="py-3 px-4 text-obsidian-200">{item.productLine}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-data font-bold text-sky-400">{item.points}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`badge ${item.category === 'AutoHomeAFS' ? 'badge-primary' : 'badge-info'}`}>
                              {item.category === 'AutoHomeAFS' ? 'Auto/Home/AFS' : 'Other PL'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.eligibleForBonus ? (
                              <Check className="w-4 h-4 text-sky-400 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-obsidian-500 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleSection>

              {/* Contingency Plan */}
              <CollapsibleSection
                title="Contingency Plan"
                icon={Shield}
                badge="New for 2026"
                accentColor="sapphire"
              >
                <div className="space-y-4">
                  <p className="text-obsidian-300">
                    {compensation2026.contingencyPlan.description}
                  </p>

                  <div className="bg-sapphire-500/10 border border-sapphire-500/20 rounded-xl p-4">
                    <h4 className="font-semibold text-sapphire-300 mb-3">Requirements to Qualify:</h4>
                    <ul className="space-y-2">
                      {compensation2026.contingencyPlan.requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-obsidian-300">
                          <CheckCircle2 className="w-4 h-4 text-sapphire-400 mt-0.5 flex-shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-obsidian-800/40 rounded-xl p-4">
                      <p className="text-xs text-obsidian-400 mb-1">Countrywide Effective</p>
                      <p className="font-semibold text-white">{compensation2026.contingencyPlan.effectiveDate}</p>
                    </div>
                    <div className="bg-obsidian-800/40 rounded-xl p-4">
                      <p className="text-xs text-obsidian-400 mb-1">NJ/NY Effective</p>
                      <p className="font-semibold text-white">{compensation2026.contingencyPlan.njNyEffectiveDate}</p>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              BONUS CALCULATOR TAB
              ═══════════════════════════════════════════════════════════════ */}
          {selectedTab === 'bonus' && (
            <motion.div
              key="bonus"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="glass-card-elevated p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="icon-container-lg icon-success">
                    <Calculator className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="heading-3">Interactive Bonus Calculator</h2>
                    <p className="body-sm text-obsidian-400">
                      Adjust Portfolio Growth to see your projected bonus
                    </p>
                  </div>
                </div>

                {/* Portfolio Growth Slider */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-obsidian-300">Portfolio Growth (BPS)</label>
                    <span className="text-2xl font-bold text-sky-400 font-data">{portfolioGrowthInput}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="10"
                    value={portfolioGrowthInput}
                    onChange={(e) => setPortfolioGrowthInput(parseInt(e.target.value))}
                    className="slider w-full"
                  />
                  <div className="flex justify-between text-xs text-obsidian-500 mt-2">
                    <span>0</span>
                    <span>100</span>
                    <span>200</span>
                    <span>300</span>
                    <span>400+</span>
                  </div>
                </div>

                {/* Bonus Tiers Visual */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                  {compensation2026.agencyBonus.portfolioGrowth.tiers.map((tier, i) => {
                    const isActive = portfolioGrowthInput >= tier.threshold &&
                      (i === compensation2026.agencyBonus.portfolioGrowth.tiers.length - 1 ||
                       portfolioGrowthInput < compensation2026.agencyBonus.portfolioGrowth.tiers[i + 1]?.threshold);

                    return (
                      <div
                        key={tier.id}
                        className={`p-4 rounded-xl transition-all duration-300 ${
                          isActive
                            ? 'bg-sky-500/20 border-2 border-sky-500/60 scale-105'
                            : 'bg-obsidian-800/40 border border-obsidian-700/40'
                        }`}
                      >
                        <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                          isActive ? 'text-sky-300' : 'text-obsidian-500'
                        }`}>
                          {tier.label}
                        </p>
                        <p className={`text-2xl font-bold font-data ${
                          isActive ? 'text-sky-400' : 'text-obsidian-400'
                        }`}>
                          {tier.bonusPercent}%
                        </p>
                        <p className="text-xs text-obsidian-500 mt-1">
                          ≥{tier.threshold} BPS
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Projected Bonus */}
                <div className="bg-gradient-to-r from-sky-500/10 via-gold-500/10 to-sky-500/10 rounded-2xl p-6 border border-sky-500/20">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-xs font-semibold text-obsidian-400 uppercase tracking-wider mb-2">Eligible Premium</p>
                      <p className="text-2xl font-bold text-white font-data">{formatCurrency(eligiblePremium)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-obsidian-400 uppercase tracking-wider mb-2">Bonus Rate</p>
                      <p className="text-2xl font-bold text-gold-400 font-data">
                        {bonusProjection.find(d => d.pg <= portfolioGrowthInput)?.bonusPercent || 0}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-obsidian-400 uppercase tracking-wider mb-2">Projected Bonus</p>
                      <p className="text-3xl font-bold text-sky-400 font-data">
                        {formatCurrency(eligiblePremium * ((bonusProjection.find((d, i) => {
                          const next = bonusProjection[i + 1];
                          return portfolioGrowthInput >= d.pg && (!next || portfolioGrowthInput < next.pg);
                        })?.bonusPercent || 0) / 100))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bonus Curve Chart */}
                <div className="mt-8">
                  <h3 className="heading-4 mb-4">Bonus Growth Curve</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={bonusProjection}>
                        <defs>
                          <linearGradient id="bonusGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" />
                        <XAxis
                          dataKey="pg"
                          stroke="#6b7280"
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          label={{ value: 'Portfolio Growth (BPS)', position: 'insideBottom', offset: -5, fill: '#6b7280' }}
                        />
                        <YAxis
                          stroke="#6b7280"
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          tickFormatter={(v) => formatCurrency(v)}
                          label={{ value: 'Bonus ($)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1a1a1f',
                            border: '1px solid #2a2a30',
                            borderRadius: '12px'
                          }}
                          formatter={(value: number) => [formatCurrency(value), 'Projected Bonus']}
                          labelFormatter={(label) => `${label} BPS`}
                        />
                        <Area
                          type="stepAfter"
                          dataKey="bonus"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill="url(#bonusGradient)"
                        />
                        <ReferenceLine
                          x={portfolioGrowthInput}
                          stroke="#f59e0b"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          label={{ value: 'Your Target', position: 'top', fill: '#f59e0b' }}
                        />
                        <ReferenceLine
                          x={currentPG}
                          stroke="#3b82f6"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          label={{ value: 'Current', position: 'top', fill: '#3b82f6' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-sky-500/60" />
                      <span className="text-obsidian-400">Bonus Curve</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-gold-500" style={{ borderStyle: 'dashed', borderWidth: '2px' }} />
                      <span className="text-obsidian-400">Your Target</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-sapphire-500" style={{ borderStyle: 'dashed', borderWidth: '2px' }} />
                      <span className="text-obsidian-400">Current Position</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              QUARTERLY ADVANCES TAB
              ═══════════════════════════════════════════════════════════════ */}
          {selectedTab === 'quarterly' && (
            <motion.div
              key="quarterly"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="glass-card-elevated p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="icon-container-lg icon-warning">
                      <PiggyBank className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="heading-3">Quarterly Advance Payouts</h2>
                      <p className="body-sm text-obsidian-400">
                        Elite/Pro agents only • Auto/Home/AFS component
                      </p>
                    </div>
                  </div>
                  <div className={`badge ${isOptedInQuarterly ? 'badge-success' : 'badge-warning'}`}>
                    {isOptedInQuarterly ? 'Opted In' : 'Not Opted In'}
                  </div>
                </div>

                {/* Eligibility Requirements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <QualifierBadge
                    qualified={aapLevel === 'Elite' || aapLevel === 'Pro'}
                    label="AAP Level"
                    requirement={`Must be Elite or Pro (Current: ${aapLevel})`}
                  />
                  <QualifierBadge
                    qualified={isOptedInQuarterly}
                    label="Opt-In Status"
                    requirement="Must opt in by Jan 31, 2026"
                  />
                </div>

                {/* Quarterly Timeline */}
                <div className="relative">
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-obsidian-700" />

                  {QUARTER_PAYOUTS.map((quarter, i) => {
                    const isQualified = i < 3 ? quarterlyQualifiers[i]?.qualified : meetsLossRatioQualifier;
                    const advanceAmount = calculateQuarterlyAdvance(
                      i < 3 ? (i + 1) as 1 | 2 | 3 : 3,
                      currentBonus
                    );

                    return (
                      <motion.div
                        key={quarter.quarter}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1, duration: 0.4 }}
                        className="relative flex items-start gap-6 mb-6 last:mb-0"
                      >
                        <div className={`relative z-10 w-16 h-16 rounded-2xl flex flex-col items-center justify-center ${
                          isQualified
                            ? 'bg-sky-500/20 border border-sky-500/40'
                            : 'bg-obsidian-800 border border-obsidian-700'
                        }`}>
                          <span className={`text-xl font-bold font-data ${isQualified ? 'text-sky-400' : 'text-obsidian-500'}`}>
                            {quarter.percent}%
                          </span>
                        </div>

                        <div className="flex-1 bg-obsidian-800/40 rounded-xl p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-white">{quarter.quarter} Advance</h4>
                              <p className="text-xs text-obsidian-500">{quarter.month} payout</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gold-400 font-data">
                                {formatCurrency(advanceAmount)}
                              </p>
                              <p className="text-xs text-obsidian-500">
                                {quarter.cumulative}% cumulative
                              </p>
                            </div>
                          </div>

                          {i < 3 && (
                            <div className="flex items-center gap-4 text-xs">
                              <div className={`flex items-center gap-1 ${
                                lossRatio <= (isCaliforniaAgent ? 71 : 66) ? 'text-sky-400' : 'text-obsidian-500'
                              }`}>
                                <Shield className="w-3 h-3" />
                                LR ≤{isCaliforniaAgent ? '71' : '66'}%
                              </div>
                              <div className={`flex items-center gap-1 ${
                                onPaceBPS >= (isCaliforniaAgent ? 250 : 200) ? 'text-sky-400' : 'text-obsidian-500'
                              }`}>
                                <TrendingUp className="w-3 h-3" />
                                BPS ≥{isCaliforniaAgent ? '250' : '200'}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Important Notes */}
                <div className="mt-8 p-4 bg-gold-500/10 border border-gold-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-gold-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gold-200">
                      <p className="font-semibold mb-2">Important Notes:</p>
                      <ul className="space-y-1 text-gold-300/80">
                        <li>• Advances are <strong>not clawed back</strong> if you don't qualify at year-end</li>
                        <li>• Decision to opt in applies to the <strong>full year</strong> (no mid-year changes)</li>
                        <li>• Only the <strong>Auto/Home/AFS component</strong> is eligible for advances</li>
                        <li>• Opt-in period: <strong>Mid-January to January 31, 2026</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quarterly Requirements Reference */}
              <CollapsibleSection
                title="Quarterly Qualifier Requirements"
                icon={Target}
                accentColor="gold"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-obsidian-800/60">
                        <th className="text-left py-3 px-4 text-obsidian-400 font-semibold">Region</th>
                        <th className="text-center py-3 px-4 text-obsidian-400 font-semibold">Loss Ratio</th>
                        <th className="text-center py-3 px-4 text-obsidian-400 font-semibold">On-Pace BPS</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-obsidian-800/30">
                        <td className="py-3 px-4 text-obsidian-200">Countrywide</td>
                        <td className="py-3 px-4 text-center font-data text-sky-400">≤66.00%</td>
                        <td className="py-3 px-4 text-center font-data text-sky-400">≥200</td>
                      </tr>
                      <tr className="border-b border-obsidian-800/30 bg-obsidian-900/30">
                        <td className="py-3 px-4 text-obsidian-200">California</td>
                        <td className="py-3 px-4 text-center font-data text-gold-400">≤71.00%</td>
                        <td className="py-3 px-4 text-center font-data text-gold-400">≥250</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-obsidian-200">NJ/NY</td>
                        <td className="py-3 px-4 text-center font-data text-gold-400">≤71.00%</td>
                        <td className="py-3 px-4 text-center font-data text-sky-400">≥200</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CollapsibleSection>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              VARIABLE COMP RATES TAB
              ═══════════════════════════════════════════════════════════════ */}
          {selectedTab === 'rates' && (
            <motion.div
              key="rates"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* New Business Rates */}
              <div className="glass-card-elevated p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="icon-container-lg icon-primary">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="heading-3">New Business Variable Compensation</h2>
                    <p className="body-sm text-obsidian-400">
                      Effective February 1, 2026 • Base commission: 9%
                    </p>
                  </div>
                </div>

                {isCaliforniaAgent ? (
                  /* California flat rates */
                  <div className="bg-gold-500/10 border border-gold-500/20 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <MapPin className="w-5 h-5 text-gold-400" />
                      <h3 className="font-semibold text-gold-300">California (Restricted State)</h3>
                    </div>
                    <p className="text-sm text-obsidian-300 mb-4">
                      Bundling status does not apply - flat 11% rate for all products.
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      {['Standard Auto', 'Homeowners/Condo', 'Other PL'].map((product) => (
                        <div key={product} className="bg-obsidian-900/60 rounded-xl p-4 text-center">
                          <p className="text-xs text-obsidian-400 mb-2">{product}</p>
                          <p className="text-3xl font-bold text-gold-400 font-data">11%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Standard rates with bundling */
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-obsidian-800/60">
                          <th className="text-left py-3 px-4 text-obsidian-400 font-semibold">Product</th>
                          <th className="text-center py-3 px-4 text-sky-400 font-semibold">
                            <div className="flex items-center justify-center gap-2">
                              <Star className="w-4 h-4" />
                              Preferred Bundle
                            </div>
                          </th>
                          <th className="text-center py-3 px-4 text-sapphire-400 font-semibold">Bundled</th>
                          <th className="text-center py-3 px-4 text-obsidian-400 font-semibold">Monoline</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { product: 'Standard Auto', rates: { preferredBundle: 16, bundled: 11, monoline: 6 } },
                          { product: 'Homeowners/Condo', rates: { preferredBundle: 20, bundled: 16, monoline: 7 } },
                          { product: 'Other Personal Lines', rates: { preferredBundle: 17, bundled: 12, monoline: 6 } },
                        ].map((row, i) => (
                          <tr key={i} className={`border-b border-obsidian-800/30 ${i % 2 === 0 ? 'bg-obsidian-900/30' : ''}`}>
                            <td className="py-4 px-4 text-obsidian-200 font-medium">{row.product}</td>
                            <td className="py-4 px-4 text-center">
                              <span className="text-lg font-bold text-sky-400 font-data">{row.rates.preferredBundle}%</span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="text-lg font-bold text-sapphire-400 font-data">{row.rates.bundled}%</span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="text-lg font-bold text-obsidian-400 font-data">{row.rates.monoline}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Renewal Rates */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="icon-container-lg icon-warning">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="heading-3">Renewal Variable Compensation</h2>
                    <p className="body-sm text-obsidian-400">
                      Effective January 1, 2026 • Based on AAP level
                    </p>
                  </div>
                </div>

                {isCaliforniaAgent ? (
                  /* California renewal rates */
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-obsidian-800/60">
                          <th className="text-left py-3 px-4 text-obsidian-400 font-semibold">AAP Level</th>
                          <th className="text-center py-3 px-4 text-obsidian-400 font-semibold">Standard Auto</th>
                          <th className="text-center py-3 px-4 text-obsidian-400 font-semibold">HO/Condo</th>
                          <th className="text-center py-3 px-4 text-obsidian-400 font-semibold">Other PL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { level: 'Elite', auto: 5, ho: 2, other: 2, color: 'gold' },
                          { level: 'Pro', auto: 4, ho: 1, other: 1, color: 'sky' },
                          { level: 'Emerging', auto: 2, ho: 0, other: 0, color: 'obsidian' },
                        ].map((row, i) => (
                          <tr key={i} className={`border-b border-obsidian-800/30 ${row.level === aapLevel ? 'bg-sky-500/10' : ''}`}>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                {row.level === 'Elite' && <Star className="w-4 h-4 text-gold-400" />}
                                <span className={`font-medium ${row.level === aapLevel ? 'text-sky-300' : 'text-obsidian-200'}`}>
                                  {row.level}
                                </span>
                                {row.level === aapLevel && (
                                  <span className="badge badge-success">Current</span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`text-lg font-bold font-data text-${row.color}-400`}>{row.auto}%</span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`text-lg font-bold font-data text-${row.color}-400`}>{row.ho}%</span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`text-lg font-bold font-data text-${row.color}-400`}>{row.other}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Countrywide renewal rates with bundling */
                  <div className="space-y-4">
                    {(['Elite', 'Pro', 'Emerging'] as const).map((level) => (
                      <CollapsibleSection
                        key={level}
                        title={`${level} Level`}
                        icon={level === 'Elite' ? Star : level === 'Pro' ? Award : Users}
                        defaultOpen={level === aapLevel}
                        badge={level === aapLevel ? 'Current' : undefined}
                        accentColor={level === 'Elite' ? 'gold' : level === 'Pro' ? 'sky' : 'sapphire'}
                      >
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { product: 'Standard Auto', pb: level === 'Elite' ? 3.5 : 3.0, b: level === 'Elite' ? 2.5 : 2.0 },
                            { product: 'HO/Condo', pb: level === 'Elite' ? 3.5 : level === 'Pro' ? 3.0 : 2.0, b: level === 'Elite' ? 2.5 : level === 'Pro' ? 2.0 : 1.0 },
                            { product: 'Other PL', pb: level === 'Emerging' ? 2.0 : 3.0, b: level === 'Emerging' ? 1.0 : 2.0 },
                          ].map((row) => (
                            <div key={row.product} className="bg-obsidian-800/40 rounded-xl p-4">
                              <p className="text-xs text-obsidian-400 mb-3">{row.product}</p>
                              <div className="flex justify-between">
                                <div>
                                  <p className="text-xs text-sky-400 mb-1">Preferred</p>
                                  <p className="text-lg font-bold text-sky-400 font-data">{row.pb}%</p>
                                </div>
                                <div>
                                  <p className="text-xs text-sapphire-400 mb-1">Bundled</p>
                                  <p className="text-lg font-bold text-sapphire-400 font-data">{row.b}%</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleSection>
                    ))}
                  </div>
                )}
              </div>

              {/* Bundling Definitions */}
              <CollapsibleSection
                title="Bundling Definitions"
                icon={Layers}
                accentColor="sapphire"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-sky-400" />
                      <h4 className="font-semibold text-sky-300">Preferred Bundle</h4>
                    </div>
                    <p className="text-sm text-obsidian-300">
                      Household with Auto + Home OR Auto + Condo
                    </p>
                  </div>
                  <div className="bg-sapphire-500/10 border border-sapphire-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-4 h-4 text-sapphire-400" />
                      <h4 className="font-semibold text-sapphire-300">Bundled</h4>
                    </div>
                    <p className="text-sm text-obsidian-300">
                      Household with 2+ recognized products (not Preferred Bundle)
                    </p>
                  </div>
                  <div className="bg-obsidian-700/40 border border-obsidian-600/40 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-obsidian-400" />
                      <h4 className="font-semibold text-obsidian-300">Monoline</h4>
                    </div>
                    <p className="text-sm text-obsidian-400">
                      Single product household
                    </p>
                  </div>
                </div>
              </CollapsibleSection>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              KEY DATES TIMELINE TAB
              ═══════════════════════════════════════════════════════════════ */}
          {selectedTab === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="glass-card-elevated p-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="icon-container-lg icon-info">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="heading-3">2026 Key Dates</h2>
                    <p className="body-sm text-obsidian-400">
                      Important deadlines and effective dates
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-sky-500 via-gold-500 to-sky-500" />

                  {KEY_DATES_2026.map((item, i) => {
                    const colorClasses = {
                      sky: { bg: 'bg-sky-500/20', border: 'border-sky-500/40', text: 'text-sky-400' },
                      gold: { bg: 'bg-gold-500/20', border: 'border-gold-500/40', text: 'text-gold-400' },
                      rose: { bg: 'bg-rose-500/20', border: 'border-rose-500/40', text: 'text-rose-400' },
                      sapphire: { bg: 'bg-sapphire-500/20', border: 'border-sapphire-500/40', text: 'text-sapphire-400' },
                    };
                    const colors = colorClasses[item.color as keyof typeof colorClasses];

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.4 }}
                        className="relative flex items-center gap-6 mb-6 last:mb-0"
                      >
                        <div className={`relative z-10 w-16 h-16 rounded-2xl ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                          <item.icon className={`w-6 h-6 ${colors.text}`} />
                        </div>

                        <div className="flex-1 bg-obsidian-800/40 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`text-sm font-semibold ${colors.text}`}>{item.date}</p>
                              <p className="text-obsidian-200 mt-1">{item.event}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-obsidian-500" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-obsidian-800/60 mt-12">
        <div className="container-wide px-6 py-6">
          <div className="flex items-center justify-between text-xs text-obsidian-500">
            <div className="flex items-center gap-2">
              <Info className="w-3 h-3" />
              <span>Based on 2026 Agency Compensation Program FAQ (December 17, 2025)</span>
            </div>
            <span>Version {compensation2026.version} • Updated {compensation2026.lastUpdated}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
