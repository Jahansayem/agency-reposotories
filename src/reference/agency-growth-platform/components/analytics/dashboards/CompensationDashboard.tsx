/**
 * Compensation Dashboard (V7.0)
 * Executive Intelligence Design System v3.0 - Premium Dark Theme
 *
 * Agency compensation structure, bonus tiers, and performance tracking.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  TrendingUp,
  DollarSign,
  Award,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Info,
  Zap,
  BarChart3,
  Users,
  Shield,
  Car,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Layers,
  Clock
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import {
  activeCompensation,
  ACTIVE_YEAR,
  is2026Config
} from '../config/compensationConfig';
import {
  findCurrentTier,
  findNextTier,
  calculateBonus
} from '../config/compensation2025';
import type { CompensationConfig } from '../config/compensation2025';
import type { Compensation2026Config } from '../config/compensation2026';
import {
  ELIGIBLE_PREMIUM_FACTOR,
  AGENCY_AUDIT_DATA,
  COMMISSION_RATES,
} from '../config/modelConstants';

interface CompensationDashboardProps {
  currentPBR?: number;
  currentPG?: number;
  writtenPremium?: number;
  isElite?: boolean;
  onTargetUpdate?: () => void;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

// Metric Card Component
const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'sky',
  trend,
  trendValue
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'sky' | 'amber' | 'blue' | 'purple' | 'rose';
  trend?: 'up' | 'down';
  trendValue?: string;
}) => {
  const colorClasses = {
    sky: 'from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400',
    rose: 'from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-400'
  };

  return (
    <motion.div
      variants={itemVariants}
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 ${colorClasses[color]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/60 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-white/50 mt-1">{subtitle}</p>}
          {trend && trendValue && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trend === 'up' ? 'text-sky-400' : 'text-rose-400'}`}>
              <ArrowUpRight className={`w-3 h-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
              {trendValue}
            </div>
          )}
        </div>
        <div className={`p-2 rounded-xl bg-white/5 ${colorClasses[color].split(' ').pop()}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
};

// Tab Button Component
const TabButton = ({
  id,
  label,
  icon: Icon,
  isActive,
  onClick
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
      isActive
        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
        : 'text-white/60 hover:text-white hover:bg-white/5'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

// Auto Sales Impact Calculator Component
interface AutoSalesImpactCalculatorProps {
  currentPBR: number;
  currentPG: number;
  writtenPremium: number;
  config: CompensationConfig | Compensation2026Config;
}

function AutoSalesImpactCalculator({ currentPBR, currentPG, writtenPremium, config }: AutoSalesImpactCalculatorProps) {
  const [monthlyAutos, setMonthlyAutos] = useState(10);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  const projectionData = useMemo(() => {
    const data = [];
    const avgAutoPremium = 2800;
    const avgHomePremium = 2963;
    const bundleRate = 0.70;
    const monthlyChurn = AGENCY_AUDIT_DATA.overallRetention > 0
      ? Math.round(AGENCY_AUDIT_DATA.totalPolicies * (1 - AGENCY_AUDIT_DATA.overallRetention) / 12)
      : 3;

    for (let autos = 0; autos <= 30; autos += 2) {
      const annualAutos = autos * 12;
      const annualHomes = Math.round(annualAutos * bundleRate);
      const totalNewPolicies = annualAutos + annualHomes;
      const annualChurn = monthlyChurn * 12;
      const netGrowth = totalNewPolicies - annualChurn;

      const newAutoPremium = annualAutos * avgAutoPremium;
      const newHomePremium = annualHomes * avgHomePremium;
      const totalNewPremium = newAutoPremium + newHomePremium;
      const yearEndPremium = writtenPremium + totalNewPremium;

      const currentBundles = (currentPBR / 100) * 1424;
      const newBundles = annualHomes;
      const totalBundles = currentBundles + newBundles;
      const yearEndPolicies = 1424 + netGrowth;
      const newPBR = Math.min(100, (totalBundles / yearEndPolicies) * 100);
      const yearEndPG = currentPG + netGrowth;

      const eligibleCurrentPremium = writtenPremium * ELIGIBLE_PREMIUM_FACTOR;
      const eligibleYearEndPremium = yearEndPremium * ELIGIBLE_PREMIUM_FACTOR;

      let currentBonus: { pbrBonus: number; pgBonus: number; totalBonus: number };
      let yearEndBonus: { pbrBonus: number; pgBonus: number; totalBonus: number };

      if (is2026Config(config)) {
        const currentPGTier = findCurrentTier(config.agencyBonus.portfolioGrowth, currentPG);
        const yearEndPGTier = findCurrentTier(config.agencyBonus.portfolioGrowth, yearEndPG);
        currentBonus = {
          pbrBonus: 0,
          pgBonus: currentPGTier ? (eligibleCurrentPremium * currentPGTier.bonusPercent / 100) : 0,
          totalBonus: currentPGTier ? (eligibleCurrentPremium * currentPGTier.bonusPercent / 100) : 0
        };
        yearEndBonus = {
          pbrBonus: 0,
          pgBonus: yearEndPGTier ? (eligibleYearEndPremium * yearEndPGTier.bonusPercent / 100) : 0,
          totalBonus: yearEndPGTier ? (eligibleYearEndPremium * yearEndPGTier.bonusPercent / 100) : 0
        };
      } else {
        currentBonus = calculateBonus(eligibleCurrentPremium, currentPBR, currentPG, config as CompensationConfig);
        yearEndBonus = calculateBonus(eligibleYearEndPremium, newPBR, yearEndPG, config as CompensationConfig);
      }

      const autoNBRate = COMMISSION_RATES.newBusiness.auto * 100;
      const homeNBRate = COMMISSION_RATES.newBusiness.homeowners * 100;
      const nbCommission = (newAutoPremium * (autoNBRate / 100)) + (newHomePremium * (homeNBRate / 100));

      const totalCompensation = yearEndBonus.totalBonus + nbCommission;
      const currentTotal = currentBonus.totalBonus;
      const bonusIncrease = totalCompensation - currentTotal;

      data.push({
        autos,
        totalCompensation,
        bonusIncrease,
        agencyBonus: yearEndBonus.totalBonus,
        nbCommission,
        yearEndPG: yearEndPG,
        yearEndPBR: newPBR,
        netGrowth
      });
    }
    return data;
  }, [currentPBR, currentPG, writtenPremium, config]);

  const selectedData = projectionData.find(d => d.autos === monthlyAutos) || projectionData[5];

  return (
    <motion.div variants={itemVariants} className="glass-card-elevated p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 rounded-xl bg-blue-500/20">
          <Car className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="heading-3 text-white">Auto Sales Impact Calculator</h3>
          <p className="body text-white/60 mt-1">
            See how monthly auto sales affect your year-end bonus and total compensation
          </p>
        </div>
      </div>

      {/* Slider Control */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="font-medium text-white">Average Autos Per Month</label>
          <span className="text-3xl font-bold text-blue-400 font-mono">{monthlyAutos}</span>
        </div>
        <input
          type="range"
          min="0"
          max="30"
          step="2"
          value={monthlyAutos}
          onChange={(e) => setMonthlyAutos(parseInt(e.target.value))}
          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-white/40 mt-2">
          <span>0</span>
          <span>10 (current avg)</span>
          <span>20</span>
          <span>30</span>
        </div>
      </div>

      {/* Results Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4">
          <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Year-End Agency Bonus</div>
          <div className="text-xl font-bold text-blue-400">{formatCurrency(selectedData.agencyBonus)}</div>
          <div className="text-xs text-white/40 mt-1">
            PBR: {selectedData.yearEndPBR.toFixed(1)}% • PG: {selectedData.yearEndPG >= 0 ? '+' : ''}{selectedData.yearEndPG}
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="text-xs text-white/50 uppercase tracking-wide mb-1">NB Commission</div>
          <div className="text-xl font-bold text-sky-400">{formatCurrency(selectedData.nbCommission)}</div>
          <div className="text-xs text-white/40 mt-1">
            {monthlyAutos * 12} autos + {Math.round(monthlyAutos * 12 * 0.7)} homes
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Total Compensation</div>
          <div className="text-xl font-bold text-purple-400">{formatCurrency(selectedData.totalCompensation)}</div>
          <div className="text-xs text-white/40 mt-1">Bonus + NB Commission</div>
        </div>

        <div className="glass-card p-4">
          <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Increase vs. Current</div>
          <div className={`text-xl font-bold ${selectedData.bonusIncrease >= 0 ? 'text-sky-400' : 'text-rose-400'}`}>
            {selectedData.bonusIncrease >= 0 ? '+' : ''}{formatCurrency(selectedData.bonusIncrease)}
          </div>
          <div className={`text-xs ${selectedData.bonusIncrease >= 0 ? 'text-sky-400/60' : 'text-rose-400/60'} mt-1`}>
            {selectedData.bonusIncrease >= 0 ? '↑' : '↓'} {Math.abs((selectedData.bonusIncrease / selectedData.totalCompensation) * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Interactive Chart */}
      <div className="glass-card p-4">
        <h4 className="font-semibold text-white mb-4">Compensation Growth Curve</h4>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData}>
              <defs>
                <linearGradient id="colorTotalDark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorBonusDark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorNBDark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="autos"
                label={{ value: 'Autos Per Month', position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.5)' }}
                stroke="rgba(255,255,255,0.3)"
                tick={{ fill: 'rgba(255,255,255,0.5)' }}
              />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                stroke="rgba(255,255,255,0.3)"
                tick={{ fill: 'rgba(255,255,255,0.5)' }}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const labels: { [key: string]: string } = {
                    totalCompensation: 'Total',
                    agencyBonus: 'Agency Bonus',
                    nbCommission: 'NB Commission'
                  };
                  return [formatCurrency(value), labels[name] || name];
                }}
                labelFormatter={(label) => `${label} autos/month`}
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: 'white'
                }}
              />
              <Area
                type="monotone"
                dataKey="totalCompensation"
                stroke="#a855f7"
                strokeWidth={2}
                fill="url(#colorTotalDark)"
              />
              <Area
                type="monotone"
                dataKey="agencyBonus"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorBonusDark)"
              />
              <Area
                type="monotone"
                dataKey="nbCommission"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorNBDark)"
              />
              <ReferenceLine
                x={monthlyAutos}
                stroke="#f43f5e"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-white/60">Total Compensation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-white/60">Agency Bonus</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-sky-500"></div>
            <span className="text-white/60">NB Commission</span>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-4 glass-card p-4 border-l-4 border-blue-500">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-white/80">
            <strong className="text-white">Key Insight:</strong> Each additional auto per month generates approximately{' '}
            <strong className="text-sky-400">{formatCurrency(monthlyAutos !== 10
              ? (selectedData.totalCompensation - projectionData[5].totalCompensation) / (monthlyAutos - 10)
              : (projectionData[6].totalCompensation - projectionData[5].totalCompensation) / 2)}</strong>{' '}
            in annual compensation. Net growth of{' '}
            <strong className="text-white">{selectedData.netGrowth >= 0 ? '+' : ''}{selectedData.netGrowth} policies</strong> improves both PBR and PG tiers.
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function CompensationDashboard({
  currentPBR = 38.5,
  currentPG = 117,
  writtenPremium = 4218886,
  isElite = false
}: CompensationDashboardProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'tiers' | 'targets' | 'kpis'>('overview');
  const [projectedPBR, setProjectedPBR] = useState(currentPBR);
  const [projectedPG, setProjectedPG] = useState(currentPG);

  const config = activeCompensation;
  const is2026 = is2026Config(config);

  const currentBonus = useMemo(() => {
    const eligiblePremium = writtenPremium * ELIGIBLE_PREMIUM_FACTOR;
    if (is2026) {
      const pgTier = findCurrentTier(config.agencyBonus.portfolioGrowth, currentPG);
      const pgBonus = pgTier ? (eligiblePremium * pgTier.bonusPercent / 100) : 0;
      return { pbrBonus: 0, pgBonus, totalBonus: pgBonus };
    }
    return calculateBonus(eligiblePremium, currentPBR, currentPG, config as CompensationConfig);
  }, [writtenPremium, currentPBR, currentPG, config, is2026]);

  const projectedBonus = useMemo(() => {
    const eligiblePremium = writtenPremium * ELIGIBLE_PREMIUM_FACTOR;
    if (is2026) {
      const pgTier = findCurrentTier(config.agencyBonus.portfolioGrowth, projectedPG);
      const pgBonus = pgTier ? (eligiblePremium * pgTier.bonusPercent / 100) : 0;
      return { pbrBonus: 0, pgBonus, totalBonus: pgBonus };
    }
    return calculateBonus(eligiblePremium, projectedPBR, projectedPG, config as CompensationConfig);
  }, [writtenPremium, projectedPBR, projectedPG, config, is2026]);

  const currentPBRTier = !is2026 ? findCurrentTier(config.agencyBonus.policyBundleRate, currentPBR) : null;
  const currentPGTier = findCurrentTier(config.agencyBonus.portfolioGrowth, currentPG);
  const nextPBRTier = !is2026 ? findNextTier(config.agencyBonus.policyBundleRate, currentPBR) : null;
  const nextPGTier = findNextTier(config.agencyBonus.portfolioGrowth, currentPG);

  const pbrChartData = config.agencyBonus.policyBundleRate.tiers.map(tier => ({
    name: tier.label,
    bonus: tier.bonusPercent,
    threshold: typeof tier.threshold === 'number' ? tier.threshold : parseFloat(tier.threshold),
    isCurrent: tier.id === currentPBRTier?.id
  }));

  const pgChartData = config.agencyBonus.portfolioGrowth.tiers.map(tier => ({
    name: tier.label,
    bonus: tier.bonusPercent,
    threshold: typeof tier.threshold === 'number' ? tier.threshold : parseFloat(tier.threshold),
    isCurrent: tier.id === currentPGTier?.id
  }));

  const pbrGap = nextPBRTier
    ? (typeof nextPBRTier.threshold === 'number' ? nextPBRTier.threshold : parseFloat(nextPBRTier.threshold)) - currentPBR
    : 0;

  const pgGap = nextPGTier
    ? (typeof nextPGTier.threshold === 'number' ? nextPGTier.threshold : parseFloat(nextPGTier.threshold)) - currentPG
    : 0;

  const totalMonthlyTarget = config.monthlyTargets.reduce((sum, t) => sum + t.target, 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-sky-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-amber-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {/* Hero Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="heading-1 text-white mb-2">{ACTIVE_YEAR} Compensation Structure</h1>
              <p className="body-lg text-white/60">
                Version {config.version} • Last updated: {config.lastUpdated}
              </p>
            </div>
            {isElite && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
                <Award className="w-5 h-5 text-amber-400" />
                <span className="font-medium text-amber-400">Elite Status Active</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Current Bonus"
            value={formatCurrency(currentBonus.totalBonus)}
            subtitle={is2026 ? `PG: ${currentPGTier?.label || 'No tier'}` : `${currentPBRTier?.label || 'No tier'} + ${currentPGTier?.label || 'No tier'}`}
            icon={DollarSign}
            color="sky"
          />
          {is2026 ? (
            <MetricCard
              title="Loss Ratio Qualifier"
              value="≤68%"
              subtitle="Standard Auto Only (CA/NJ/NY: ≤73%)"
              icon={Shield}
              color="blue"
            />
          ) : (
            <MetricCard
              title="PBR Rate"
              value={`${currentPBR.toFixed(1)}%`}
              subtitle={pbrGap > 0 ? `${pbrGap.toFixed(1)}% to next tier` : 'Max tier reached'}
              icon={Layers}
              color="blue"
            />
          )}
          <MetricCard
            title="Portfolio Growth"
            value={`${currentPG >= 0 ? '+' : ''}${currentPG}`}
            subtitle={pgGap > 0 ? `${pgGap} to next tier` : 'Max tier reached'}
            icon={TrendingUp}
            color="purple"
          />
          <MetricCard
            title="Written Premium"
            value={formatCurrency(writtenPremium)}
            subtitle="YTD total"
            icon={BarChart3}
            color="amber"
          />
        </motion.div>

        {/* Key Goal Card */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="glass-card-elevated p-6 border-l-4 border-sky-500">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-sky-500/20">
                <Target className="w-6 h-6 text-sky-400" />
              </div>
              <div>
                <h3 className="heading-3 text-white mb-2">The Goal: Maximize Your Compensation</h3>
                {is2026 ? (
                  <p className="body text-white/70 leading-relaxed">
                    Your 2026 Agency Bonus is driven by <span className="text-sky-400 font-semibold">Portfolio Growth</span> (up to 4% of eligible premium).
                    Two components: <span className="text-blue-400 font-semibold">Auto/Home/AFS (up to 3%)</span> and <span className="text-purple-400 font-semibold">Other Personal Lines (up to 1%)</span>.
                    Meet the <span className="text-amber-400 font-semibold">Standard Auto Only Loss Ratio qualifier</span> (≤68% or ≤73% for CA/NJ/NY).
                  </p>
                ) : (
                  <p className="body text-white/70 leading-relaxed">
                    Your compensation is driven by <span className="text-blue-400 font-semibold">Policy Bundle Rate (PBR)</span> and <span className="text-sky-400 font-semibold">Portfolio Growth (PG)</span>.
                    Higher tiers = higher bonus percentage. Strategy: <span className="text-amber-400 font-semibold">bundle every household</span>, add 3rd lines, and protect bundles at renewal.
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Key Terms */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="glass-card p-6">
            <h3 className="heading-4 text-white mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-400" />
              Key Terms
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {[
                { term: 'PBR', desc: 'Policy Bundle Rate. % of policies bundled (Auto + HO/Condo together).' },
                { term: 'PG', desc: 'Portfolio Growth. Net new items (policies added minus policies lost).' },
                { term: 'NB', desc: 'New Business. First-time policy sales to new customers.' },
                { term: 'Baseline', desc: 'Monthly minimum NB items (Auto + HO + Condo) to unlock variable comp.' },
                { term: 'Preferred Bundle', desc: 'Household with both Auto AND Home/Condo policies.' },
                { term: '3rd Line', desc: 'Additional policy beyond Auto + HO (umbrella, renters, etc.).' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="font-semibold text-sky-400">{item.term}</span>
                  <span className="text-white/60">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div variants={itemVariants} className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'tiers', label: 'Bonus Tiers', icon: TrendingUp },
            { id: 'targets', label: 'Monthly Targets', icon: Target },
            { id: 'kpis', label: 'KPIs', icon: CheckCircle2 }
          ].map(tab => (
            <TabButton
              key={tab.id}
              id={tab.id}
              label={tab.label}
              icon={tab.icon}
              isActive={selectedTab === tab.id}
              onClick={() => setSelectedTab(tab.id as typeof selectedTab)}
            />
          ))}
        </motion.div>

        {/* Overview Tab */}
        <AnimatePresence mode="wait">
          {selectedTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Performance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div variants={itemVariants} className="glass-card p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-400">Policy Bundle Rate</span>
                    <Shield className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{currentPBR.toFixed(1)}%</div>
                  <div className="text-sm text-white/50 mt-1">
                    {currentPBRTier?.label} • {formatPercent(currentPBRTier?.bonusPercent || 0)} bonus
                  </div>
                  {nextPBRTier && (
                    <div className="text-xs text-blue-400 mt-2 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      {pbrGap.toFixed(1)}% to {nextPBRTier.label}
                    </div>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="glass-card p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-sky-400">Portfolio Growth</span>
                    <TrendingUp className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {currentPG >= 0 ? '+' : ''}{currentPG} items
                  </div>
                  <div className="text-sm text-white/50 mt-1">
                    {currentPGTier?.label} • {formatPercent(currentPGTier?.bonusPercent || 0)} bonus
                  </div>
                  {nextPGTier && (
                    <div className="text-xs text-sky-400 mt-2 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      {pgGap} items to {nextPGTier.label}
                    </div>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="glass-card p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-400">Current Bonus</span>
                    <DollarSign className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(currentBonus.totalBonus)}
                  </div>
                  <div className="text-xs text-white/50 mt-1">
                    PBR: {formatCurrency(currentBonus.pbrBonus)}
                  </div>
                  <div className="text-xs text-white/50">
                    PG: {formatCurrency(currentBonus.pgBonus)}
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="glass-card p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-amber-400">Written Premium</span>
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(writtenPremium)}
                  </div>
                  <div className="text-sm text-white/50 mt-1">YTD Total</div>
                </motion.div>
              </div>

              {/* The Big Five */}
              <motion.div variants={itemVariants} className="glass-card p-6">
                <h3 className="heading-4 text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  The Big Five for Max Payout
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {[
                    { num: 1, title: "Hit Monthly Baseline", desc: "By the 20th each month", color: 'sky' },
                    { num: 2, title: "Preferred Bundle", desc: "Auto + HO every household", color: 'blue' },
                    { num: 3, title: "Bigger Bundle Bonus", desc: "$50/$25 per 3rd+ line", color: 'purple' },
                    { num: 4, title: "Maintain Bundles", desc: "Protect at renewal", color: 'amber' },
                    { num: 5, title: "Achieve Elite", desc: "Higher renewal rates", color: 'rose' }
                  ].map(item => {
                    const colorClasses = {
                      sky: 'from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-400',
                      blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
                      purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400',
                      amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400',
                      rose: 'from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-400'
                    };
                    return (
                      <div key={item.num} className={`rounded-xl border bg-gradient-to-br p-4 ${colorClasses[item.color as keyof typeof colorClasses]}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold text-white">
                            {item.num}
                          </span>
                          <span className="font-medium text-white text-sm">{item.title}</span>
                        </div>
                        <p className="text-xs text-white/50">{item.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Auto Sales Impact Calculator */}
              <AutoSalesImpactCalculator
                currentPBR={currentPBR}
                currentPG={currentPG}
                writtenPremium={writtenPremium}
                config={config}
              />

              {/* NB Variable Comp Table */}
              <motion.div variants={itemVariants} className="glass-card-elevated p-6">
                <h3 className="heading-4 text-white mb-4">New Business Variable Compensation</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left p-3 font-medium text-white/60">Line</th>
                        <th className="text-right p-3 font-medium text-white/60">NB Rate</th>
                        <th className="text-right p-3 font-medium text-white/60">Renewal</th>
                        <th className="text-right p-3 font-medium text-white/60">Elite Renewal</th>
                        <th className="text-left p-3 font-medium text-white/60">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {config.nbVariableComp.map((item, idx) => (
                        <tr key={item.line} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-3 font-medium text-white">{item.line}</td>
                          <td className="p-3 text-right text-sky-400 font-semibold">{item.newBusinessRate}%</td>
                          <td className="p-3 text-right text-white/60">{item.renewalRate}%</td>
                          <td className="p-3 text-right text-amber-400 font-semibold">{item.renewalRateElite}%</td>
                          <td className="p-3 text-white/40 text-xs">{item.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Tiers Tab */}
          {selectedTab === 'tiers' && (
            <motion.div
              key="tiers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* PBR Tiers */}
              <motion.div variants={itemVariants} className="glass-card-elevated p-6">
                <h3 className="heading-4 text-white mb-4">Policy Bundle Rate Tiers</h3>
                <div className="h-64 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pbrChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis type="number" domain={[0, 1.2]} tickFormatter={(v) => `${v}%`} stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                      <YAxis dataKey="name" type="category" width={80} stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                      <Tooltip
                        formatter={(value: number) => [`${value}%`, 'Bonus']}
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}
                      />
                      <Bar dataKey="bonus" radius={[0, 4, 4, 0]}>
                        {pbrChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.isCurrent ? '#3b82f6' : 'rgba(59, 130, 246, 0.3)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {config.agencyBonus.policyBundleRate.tiers.map(tier => (
                    <div
                      key={tier.id}
                      className={`p-4 rounded-xl ${
                        tier.id === currentPBRTier?.id
                          ? 'bg-blue-500/20 border-2 border-blue-500'
                          : 'glass-card'
                      }`}
                    >
                      <div className="font-medium text-white">{tier.label}</div>
                      <div className="text-xs text-white/50">
                        {typeof tier.threshold === 'number' ? `≥${tier.threshold}%` : tier.threshold}
                      </div>
                      <div className="text-lg font-bold text-blue-400 mt-1">{tier.bonusPercent}%</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* PG Tiers */}
              <motion.div variants={itemVariants} className="glass-card-elevated p-6">
                <h3 className="heading-4 text-white mb-4">Portfolio Growth Tiers</h3>
                <div className="h-72 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pgChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis type="number" domain={[0, 5]} tickFormatter={(v) => `${v}%`} stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                      <YAxis dataKey="name" type="category" width={80} stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                      <Tooltip
                        formatter={(value: number) => [`${value}%`, 'Bonus']}
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}
                      />
                      <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />
                      <Bar dataKey="bonus" radius={[0, 4, 4, 0]}>
                        {pgChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.isCurrent ? '#10b981' : 'rgba(16, 185, 129, 0.3)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {config.agencyBonus.portfolioGrowth.tiers.map(tier => (
                    <div
                      key={tier.id}
                      className={`p-4 rounded-xl ${
                        tier.id === currentPGTier?.id
                          ? 'bg-sky-500/20 border-2 border-sky-500'
                          : 'glass-card'
                      }`}
                    >
                      <div className="font-medium text-white">{tier.label}</div>
                      <div className="text-xs text-white/50">
                        {typeof tier.threshold === 'number' ? `${tier.threshold >= 0 ? '≥' : ''}${tier.threshold} items` : tier.threshold}
                      </div>
                      <div className="text-lg font-bold text-sky-400 mt-1">{tier.bonusPercent}%</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Bonus Calculator */}
              <motion.div variants={itemVariants} className="glass-card-elevated p-6">
                <h3 className="heading-4 text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-sky-400" />
                  Bonus Projection Calculator
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">Projected PBR (%)</label>
                    <input
                      type="number"
                      value={projectedPBR}
                      onChange={(e) => setProjectedPBR(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">Projected PG (items)</label>
                    <input
                      type="number"
                      value={projectedPG}
                      onChange={(e) => setProjectedPG(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="text-sm text-white/50">Projected Total Bonus</div>
                    <div className="text-3xl font-bold text-sky-400">
                      {formatCurrency(projectedBonus.totalBonus)}
                    </div>
                    <div className="text-xs text-white/40">
                      vs Current: <span className={projectedBonus.totalBonus - currentBonus.totalBonus >= 0 ? 'text-sky-400' : 'text-rose-400'}>
                        {formatCurrency(projectedBonus.totalBonus - currentBonus.totalBonus)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Targets Tab */}
          {selectedTab === 'targets' && (
            <motion.div
              key="targets"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Monthly Baseline Info */}
              <motion.div variants={itemVariants} className="glass-card p-5 border-l-4 border-blue-500">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-white">Monthly NB Baseline</h4>
                    <p className="text-sm text-white/60 mt-1">{config.monthlyBaseline.description}</p>
                    <p className="text-sm text-blue-400 mt-1">
                      Eligible lines: {config.monthlyBaseline.eligibleLines.join(', ')}
                    </p>
                    <p className="text-sm text-blue-400">
                      Target date: {config.monthlyBaseline.targetDate}th of each month
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Monthly Targets Table */}
              <motion.div variants={itemVariants} className="glass-card-elevated p-6">
                <h3 className="heading-4 text-white mb-4">
                  Recommended Monthly Targets (Total: {totalMonthlyTarget} items)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left p-3 font-medium text-white/60">Line</th>
                        <th className="text-right p-3 font-medium text-white/60">Monthly Target</th>
                        <th className="text-right p-3 font-medium text-white/60">Weekly</th>
                        <th className="text-left p-3 font-medium text-white/60">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {config.monthlyTargets.map((target, idx) => (
                        <tr key={target.line} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-3 font-medium text-white">{target.line}</td>
                          <td className="p-3 text-right font-bold text-sky-400">{target.target}</td>
                          <td className="p-3 text-right text-white/60">{(target.target / 4).toFixed(1)}</td>
                          <td className="p-3 text-white/40 text-xs">{target.role}</td>
                        </tr>
                      ))}
                      <tr className="bg-sky-500/10">
                        <td className="p-3 font-bold text-white">Total</td>
                        <td className="p-3 text-right font-bold text-sky-400">{totalMonthlyTarget}</td>
                        <td className="p-3 text-right font-bold text-sky-400">{(totalMonthlyTarget / 4).toFixed(1)}</td>
                        <td className="p-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* Bigger Bundle Bonus */}
              <motion.div variants={itemVariants} className="glass-card p-6 border-l-4 border-sky-500">
                <h3 className="heading-4 text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-sky-400" />
                  Bigger Bundle Bonus
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-white/70">
                      <span className="text-4xl font-bold text-sky-400">${config.biggerBundleBonus.amount}</span>
                      <span className="text-white/50"> per 3rd+ line</span>
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      (${config.biggerBundleBonus.amount - 25} if no Auto/HO)
                    </p>
                    <p className="text-xs text-white/40 mt-2">
                      Starts: {config.biggerBundleBonus.startDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-2">Eligible Lines:</p>
                    <div className="flex flex-wrap gap-2">
                      {config.biggerBundleBonus.eligibleLines.map(line => (
                        <span key={line} className="px-2 py-1 bg-sky-500/20 text-sky-400 rounded-lg text-xs">
                          {line}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-white/70 mt-4">
                  <strong className="text-white">Target:</strong> 15-20 Bigger Bundle Bonuses per month = ${15 * config.biggerBundleBonus.amount} - ${20 * config.biggerBundleBonus.amount}
                </p>
              </motion.div>

              {/* Elite Qualification */}
              <motion.div variants={itemVariants} className="glass-card p-6 border-l-4 border-amber-500">
                <h3 className="heading-4 text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  Elite Qualification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-3">Criteria:</p>
                    <ul className="space-y-2">
                      {config.eliteQualification.criteria.map((criterion, idx) => (
                        <li key={idx} className="text-sm text-white/70 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                          {criterion}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-3">Benefits:</p>
                    <ul className="space-y-2">
                      {config.eliteQualification.benefits.map((benefit, idx) => (
                        <li key={idx} className="text-sm text-white/70 flex items-start gap-2">
                          <Zap className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* KPIs Tab */}
          {selectedTab === 'kpis' && (
            <motion.div
              key="kpis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Daily KPIs */}
              <motion.div variants={itemVariants} className="glass-card-elevated p-6">
                <h3 className="heading-4 text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Daily KPIs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {config.kpis.daily.map((kpi, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-4 glass-card rounded-xl hover:bg-white/5 transition-colors">
                      <input type="checkbox" className="w-5 h-5 rounded bg-white/5 border-white/20 text-sky-500 focus:ring-sky-500/50" />
                      <span className="text-sm text-white/80">{kpi}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Weekly KPIs */}
              <motion.div variants={itemVariants} className="glass-card-elevated p-6">
                <h3 className="heading-4 text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-sky-400" />
                  Weekly KPIs (Monday Review)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {config.kpis.weekly.map((kpi, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-4 glass-card rounded-xl hover:bg-white/5 transition-colors">
                      <input type="checkbox" className="w-5 h-5 rounded bg-white/5 border-white/20 text-sky-500 focus:ring-sky-500/50" />
                      <span className="text-sm text-white/80">{kpi}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Coaching Focus */}
              <motion.div variants={itemVariants} className="glass-card p-6 border-l-4 border-purple-500">
                <h3 className="heading-4 text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Weekly Coaching Focus
                </h3>
                <ul className="space-y-3">
                  {[
                    "Are we on NB baseline pace?",
                    "How many preferred bundles this week? (Target: 40-50%)",
                    "How many 3rd+ line sales? (Target: 4-5/week)",
                    "What renewals might break bundles?",
                    "Which staff needs script reinforcement?",
                    "Pipeline for HO with Auto quotes?"
                  ].map((item, idx) => (
                    <li key={idx} className="text-sm text-white/70 flex items-start gap-3">
                      <span className="w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {idx + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div variants={itemVariants} className="mt-8 pt-6 border-t border-white/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3" />
              Compensation data sourced from Allstate {ACTIVE_YEAR} guidelines
            </span>
            <span>
              To update for {ACTIVE_YEAR + 1}, modify config/compensation{ACTIVE_YEAR + 1}.ts
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
