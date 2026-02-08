'use client';

/**
 * Book of Business Dashboard Component
 * Executive Intelligence Design System v3.0 - Premium Dark Theme
 * Comprehensive analytics for Derrick's insurance agency book of business
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  MapPin,
  Package,
  AlertTriangle,
  Target,
  DollarSign,
  PieChart,
  BarChart3,
  Shield,
  Home,
  Car,
  Umbrella,
  RefreshCw,
  ArrowUpRight,
  ChevronRight,
  TrendingUp,
  Heart,
  Zap,
  Calendar,
  FileWarning,
  Building,
  Crown,
  Sparkles,
  Activity,
  ChevronDown,
  Plus,
  CheckCircle
} from 'lucide-react';

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
  visible: { opacity: 1, y: 0 }
};

// Book of Business Data from All Purpose Audit (Nov 14, 2025)
export const bookOfBusinessData = {
  overview: {
    totalPolicies: 1424,
    uniqueCustomers: 876,
    totalPremium: 4218886,
    avgPremiumPerPolicy: 2963,
    avgPremiumPerCustomer: 4816,
    writtenPremium: 4218886,
    portfolioGrowthRate: 0.2987
  },
  productMix: {
    "Auto": { count: 585, percentage: 41.1, premium: 1637100, color: "blue" },
    "Homeowners": { count: 369, percentage: 25.9, premium: 1093347, color: "teal" },
    "Renters": { count: 168, percentage: 11.8, premium: 29400, color: "amber" },
    "Condominiums": { count: 124, percentage: 8.7, premium: 92504, color: "purple" },
    "Personal Umbrella": { count: 74, percentage: 5.2, premium: 54760, color: "cyan" },
    "Landlords": { count: 60, percentage: 4.2, premium: 71880, color: "indigo" },
    "Specialty Auto": { count: 35, percentage: 2.5, premium: 19460, color: "orange" },
    "Boat": { count: 9, percentage: 0.6, premium: 1422, color: "teal" }
  },
  geography: {
    "SANTA BARBARA": { count: 215, percentage: 43.2 },
    "GOLETA": { count: 145, percentage: 29.1 },
    "LOMPOC": { count: 20, percentage: 4.0 },
    "SOLVANG": { count: 11, percentage: 2.2 },
    "CARPINTERIA": { count: 9, percentage: 1.8 },
    "OTHER": { count: 98, percentage: 19.7 }
  },
  demographics: {
    ageDistribution: {
      "Under 25": { count: 28, percentage: 3.2 },
      "25-34": { count: 70, percentage: 8.0 },
      "35-44": { count: 94, percentage: 10.8 },
      "45-54": { count: 108, percentage: 12.4 },
      "55-64": { count: 180, percentage: 20.6 },
      "65+": { count: 394, percentage: 45.1 }
    },
    avgAge: 60.2,
    medianAge: 62.0,
    avgTenure: 16.9,
    genderDistribution: {
      "Couple": { count: 423, percentage: 48.3 },
      "Female": { count: 228, percentage: 26.0 },
      "Male": { count: 220, percentage: 25.1 },
      "Unknown": { count: 5, percentage: 0.6 }
    },
    maritalStatus: {
      "Married": { count: 466, percentage: 53.2 },
      "Single": { count: 297, percentage: 33.9 },
      "Divorced": { count: 54, percentage: 6.2 },
      "Widowed": { count: 50, percentage: 5.7 },
      "Separated": { count: 6, percentage: 0.7 }
    },
    tenureDistribution: {
      "New (< 1 year)": { count: 67, percentage: 7.6 },
      "1-2 years": { count: 80, percentage: 9.1 },
      "3-5 years": { count: 125, percentage: 14.3 },
      "6-10 years": { count: 108, percentage: 12.3 },
      "10+ years": { count: 496, percentage: 56.6 }
    },
    ezPayEnrollment: 31.4,
    myAccountRegistration: 100.0
  },
  bundling: {
    singlePolicy: 523,
    twoPolicy: 200,
    threePolicy: 100,
    fourPlus: 53,
    bundleRate: 40.3,
    policiesPerCustomer: 1.63
  },
  crossSellOpportunities: {
    autoOnlyNeedHome: 337,
    homeOnlyNeedAuto: 171,
    needUmbrella: 137,
    rentersToHome: 158,
    singlePolicy: 523,
    totalOpportunities: 803,
    estimatedPremiumPotential: 775725
  },
  crossSellTargets: {
    autoOnlyTopTargets: [
      { name: "EUNJU YOO", premium: 7633, tenure: 5, zip: "93111" },
      { name: "CHERLYN CHRISTIN OLIVE-JONES", premium: 7574, tenure: 35, zip: "93110" },
      { name: "APOLINAR PEREZ", premium: 7256, tenure: 12, zip: "93117" },
      { name: "JOSE RAMIREZ", premium: 7213, tenure: 27, zip: "93111" },
      { name: "VICTOR HUGO O BANOS", premium: 6981, tenure: 3, zip: "93254" }
    ],
    umbrellaTopTargets: [
      { name: "EZZY A POZZATO", premium: 17725, tenure: 38, products: "Auto, Home" },
      { name: "LINDA SMITH", premium: 13493, tenure: 39, products: "Auto, Home" },
      { name: "MARK W FOSS", premium: 11281, tenure: 57, products: "Home, Auto" },
      { name: "CHARLES A RIHARB", premium: 11148, tenure: 41, products: "Auto, Condo, Home" },
      { name: "GARY MAXWELL", premium: 10992, tenure: 52, products: "Home, Auto, Landlord" }
    ],
    atRiskHighValue: [
      { name: "EUNJU YOO", premium: 7633, tenure: 5, product: "Auto" },
      { name: "APOLINAR PEREZ", premium: 7256, tenure: 12, product: "Auto" },
      { name: "JOSE RAMIREZ", premium: 7213, tenure: 27, product: "Auto" },
      { name: "VICTOR HUGO O BANOS", premium: 6981, tenure: 3, product: "Auto" },
      { name: "CYNTHIA HOFMANN", premium: 5853, tenure: 24, product: "Home" }
    ]
  },
  customerSegments: {
    entry: { count: 184, percentage: 44.4, label: "Entry (<$1.5K)" },
    standard: { count: 152, percentage: 36.7, label: "Standard ($1.5-3K)" },
    premium: { count: 52, percentage: 12.6, label: "Premium ($3-5K)" },
    highValue: { count: 23, percentage: 5.6, label: "High Value ($5-10K)" },
    elite: { count: 112, percentage: 12.8, label: "Elite (4+ products)" }
  },
  retention: {
    renewalTaken: 245,
    renewalNotTaken: 253,
    renewalRate: 49.2,
    singlePolicyChurnRisk: 523,
    atRiskHighValue: 157,
    notOnEzPay: 601,
    highPremiumIncrease: 309
  },
  retentionRisk: {
    distribution: {
      "0": { count: 67, avgPremium: 1377, label: "Minimal Risk" },
      "1": { count: 274, avgPremium: 4762, label: "Low Risk" },
      "2": { count: 12, avgPremium: 2915, label: "Moderate Low" },
      "3": { count: 254, avgPremium: 1006, label: "Moderate" },
      "4": { count: 234, avgPremium: 2056, label: "Elevated" },
      "5": { count: 35, avgPremium: 2983, label: "High Risk" }
    },
    highRiskCount: 35,
    revenueAtRisk: 104412,
    highRiskCustomers: [
      { name: "VICTOR HUGO O BANOS", premium: 6981, policyCount: 1, tenure: 3.0, ezpay: true },
      { name: "ZAIDA PASCUAL", premium: 4838, policyCount: 1, tenure: 1.0, ezpay: true },
      { name: "PAUL BRICE", premium: 4635, policyCount: 1, tenure: 3.0, ezpay: true },
      { name: "MARCUS S GUNTER", premium: 4219, policyCount: 1, tenure: 1.0, ezpay: true },
      { name: "PLACIDO ORGANISTA", premium: 4087, policyCount: 1, tenure: 2.0, ezpay: true }
    ]
  },
  referralPotential: {
    totalCandidates: 179,
    topCandidates: [
      { name: "GUY S CLARK", premium: 24154, tenure: 36, policyCount: 6 },
      { name: "CRAIG DROESE", premium: 18743, tenure: 44, policyCount: 8 },
      { name: "EZZY A POZZATO", premium: 17725, tenure: 38, policyCount: 2 },
      { name: "FREDERICK MONTGOMERY", premium: 17110, tenure: 32, policyCount: 5 },
      { name: "JOHN G CHAPPLE", premium: 17096, tenure: 56, policyCount: 3 }
    ]
  }
};

// Premium Progress Bar
const PremiumProgressBar = ({
  value,
  max,
  label,
  color = 'sky'
}: {
  value: number;
  max: number;
  label: string;
  color?: string;
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const colorMap: Record<string, string> = {
    sky: 'bg-sky-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    purple: 'bg-purple-500'
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-white/70">{label}</span>
        <span className="text-sm font-mono text-white">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full ${colorMap[color]} rounded-full`}
        />
      </div>
    </div>
  );
};

// Metric Card
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
  icon: React.ElementType;
  color?: 'sky' | 'gold' | 'sapphire' | 'rose';
  trend?: 'up' | 'down';
  trendValue?: string;
}) => {
  const colorClasses = {
    sky: 'from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-400',
    gold: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400',
    sapphire: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
    rose: 'from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-400'
  };

  return (
    <motion.div
      variants={itemVariants}
      className={`glass-card p-5 bg-gradient-to-br ${colorClasses[color]} relative overflow-hidden group`}
    >
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/5 blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg bg-white/10`}>
            <Icon className={`w-5 h-5 ${colorClasses[color].split(' ')[3]}`} />
          </div>
          {trend && (
            <span className={`text-xs font-medium flex items-center gap-1 ${trend === 'up' ? 'text-sky-400' : 'text-rose-400'}`}>
              {trendValue}
              <ArrowUpRight className={`w-3 h-3 ${trend === 'down' ? 'rotate-90' : ''}`} />
            </span>
          )}
        </div>
        <p className="text-sm text-white/60 mb-1">{title}</p>
        <p className={`text-2xl font-bold font-mono ${colorClasses[color].split(' ')[3]}`}>{value}</p>
        {subtitle && <p className="text-xs text-white/50 mt-1">{subtitle}</p>}
      </div>
    </motion.div>
  );
};

// Opportunity Card
const OpportunityCard = ({
  title,
  count,
  action,
  potentialPremium,
  priority,
  icon: Icon
}: {
  title: string;
  count: number;
  action: string;
  potentialPremium: number;
  priority: 'high' | 'medium' | 'low';
  icon: React.ElementType;
}) => {
  const priorityConfig = {
    high: { border: 'border-rose-500/50', bg: 'bg-rose-500/10', badge: 'badge-danger', text: 'text-rose-400' },
    medium: { border: 'border-amber-500/50', bg: 'bg-amber-500/10', badge: 'badge-warning', text: 'text-amber-400' },
    low: { border: 'border-sky-500/50', bg: 'bg-sky-500/10', badge: 'badge-success', text: 'text-sky-400' }
  };

  const config = priorityConfig[priority];

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02 }}
      className={`glass-card p-5 ${config.bg} ${config.border} border-l-4 group cursor-pointer`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white/10 ${config.text}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-white">{title}</h4>
            <p className="text-xs text-white/50">{action}</p>
          </div>
        </div>
        <span className={`text-3xl font-bold font-mono ${config.text}`}>{count}</span>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <span className="text-sm text-white/60">Est. Premium</span>
        <span className="font-mono text-white">${potentialPremium.toLocaleString()}</span>
      </div>
    </motion.div>
  );
};

// Tab Button
const TabButton = ({
  active,
  onClick,
  icon: Icon,
  label,
  shortLabel
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  shortLabel: string;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
      active
        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
        : 'text-white/60 hover:text-white hover:bg-white/5'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span className="hidden sm:inline">{label}</span>
    <span className="sm:hidden">{shortLabel}</span>
  </button>
);

// Product Card Component
const ProductCard = ({
  product,
  count,
  percentage,
  premium,
  color
}: {
  product: string;
  count: number;
  percentage: number;
  premium: number;
  color: string;
}) => {
  const iconMap: Record<string, React.ElementType> = {
    "Auto": Car,
    "Homeowners": Home,
    "Renters": Building,
    "Condominiums": Building,
    "Personal Umbrella": Umbrella,
    "Landlords": Home,
    "Specialty Auto": Car,
    "Boat": Shield
  };

  const colorMap: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
    sky: 'from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400',
    indigo: 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/30 text-indigo-400',
    orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-400',
    teal: 'from-teal-500/20 to-teal-500/5 border-teal-500/30 text-teal-400'
  };

  const Icon = iconMap[product] || Shield;
  const colorClass = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -4 }}
      className={`glass-card p-5 bg-gradient-to-br ${colorClass} group cursor-pointer`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg bg-white/10`}>
          <Icon className={`w-5 h-5 ${colorClass.split(' ')[3]}`} />
        </div>
        <span className="text-xs font-medium text-white/50">{percentage}%</span>
      </div>
      <h4 className="font-semibold text-white text-sm mb-1">{product}</h4>
      <p className={`text-2xl font-bold font-mono ${colorClass.split(' ')[3]}`}>{count}</p>
      <p className="text-xs text-white/50 mt-1 font-mono">${premium.toLocaleString()}</p>
    </motion.div>
  );
};

// Customer Target Row with inline task creation
const TargetRow = ({
  name,
  premium,
  tenure,
  detail,
  variant = 'default',
  category,
  onCreateTask,
  isCreating = false,
  hasTask = false
}: {
  name: string;
  premium: number;
  tenure?: number;
  detail?: string;
  variant?: 'default' | 'danger' | 'success';
  category?: string;
  onCreateTask?: () => void;
  isCreating?: boolean;
  hasTask?: boolean;
}) => {
  const variantClasses = {
    default: 'bg-white/5 hover:bg-white/10',
    danger: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20',
    success: 'bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/20'
  };

  const premiumClasses = {
    default: 'text-sky-400',
    danger: 'text-rose-400',
    success: 'text-sky-400'
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border border-white/5 transition-colors ${variantClasses[variant]}`}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm truncate">{name}</p>
        <p className="text-xs text-white/50">
          {tenure !== undefined && `${tenure}yr tenure`}
          {detail && (tenure ? ` • ${detail}` : detail)}
        </p>
      </div>
      <div className="flex items-center gap-3 ml-3">
        <span className={`font-bold font-mono ${premiumClasses[variant]}`}>
          ${premium.toLocaleString()}
        </span>
        {onCreateTask && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateTask();
            }}
            disabled={isCreating || hasTask}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              hasTask
                ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                : isCreating
                ? 'bg-sky-500/20 text-sky-400 cursor-wait'
                : 'bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30'
            }`}
            title={hasTask ? 'Task already created' : 'Create task for this customer'}
          >
            {isCreating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : hasTask ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {hasTask ? 'Done' : isCreating ? '...' : 'Task'}
          </button>
        )}
      </div>
    </div>
  );
};

export function BookOfBusinessDashboard() {
  const [activeSection, setActiveSection] = useState<'overview' | 'products' | 'crosssell' | 'retention' | 'analysis'>('overview');
  const [creatingTaskFor, setCreatingTaskFor] = useState<string | null>(null);
  const [createdTasks, setCreatedTasks] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const data = bookOfBusinessData;

  // Handle inline task creation for customer targets
  const handleCreateTask = async (customerName: string, category: string, premium: number, detail?: string) => {
    const taskKey = `${customerName}-${category}`;
    setCreatingTaskFor(taskKey);

    try {
      // Create task directly via todos API since these are static targets without opportunity IDs
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Cross-sell: Contact ${customerName} - ${category}`,
          priority: category.includes('Risk') ? 'urgent' : 'high',
          assigned_to: 'Derrick',
          created_by: 'System',
          notes: `**Cross-sell Target from Book of Business**\n\n**Customer:** ${customerName}\n**Category:** ${category}\n**Current Premium:** $${premium.toLocaleString()}\n${detail ? `**Details:** ${detail}` : ''}\n\nThis task was auto-generated from the Book of Business dashboard.`,
          status: 'todo',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      setCreatedTasks(prev => new Set(prev).add(taskKey));
      setToastMessage({ type: 'success', message: `Task created for ${customerName}` });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to create task:', err);
      setToastMessage({ type: 'error', message: 'Failed to create task. Please try again.' });
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setCreatingTaskFor(null);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-6"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          toastMessage.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toastMessage.message}
        </div>
      )}

      {/* Hero Header */}
      <motion.div variants={itemVariants} className="relative overflow-hidden">
        <div className="glass-card-elevated p-8 relative">
          {/* Animated background */}
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl animate-pulse delay-1000" />

          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="icon-container-lg bg-gradient-to-br from-sky-500/20 to-blue-500/20 border border-sky-500/30">
                  <BarChart3 className="w-6 h-6 text-sky-400" />
                </div>
                <div>
                  <h1 className="heading-1 text-white">Book of Business Analytics</h1>
                  <p className="body-lg text-white/60">Portfolio analysis - Santa Barbara County</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge-success">Live Data</span>
                <span className="text-xs text-white/50">Updated Nov 14, 2025</span>
              </div>
            </div>

            {/* Hero Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-4 bg-sky-500/10 border-sky-500/20 text-center lg:text-left">
                <p className="text-xs text-sky-300 uppercase tracking-wider mb-1">Total Premium</p>
                <p className="text-3xl font-bold text-sky-400 font-mono">${(data.overview.writtenPremium / 1000000).toFixed(1)}M</p>
              </div>
              <div className="glass-card p-4 bg-blue-500/10 border-blue-500/20 text-center lg:text-left">
                <p className="text-xs text-blue-300 uppercase tracking-wider mb-1">Customers</p>
                <p className="text-3xl font-bold text-blue-400 font-mono">{data.overview.uniqueCustomers}</p>
              </div>
              <div className="glass-card p-4 bg-purple-500/10 border-purple-500/20 text-center lg:text-left">
                <p className="text-xs text-purple-300 uppercase tracking-wider mb-1">Policies</p>
                <p className="text-3xl font-bold text-purple-400 font-mono">{data.overview.totalPolicies}</p>
              </div>
              <div className="glass-card p-4 bg-amber-500/10 border-amber-500/20 text-center lg:text-left">
                <p className="text-xs text-amber-300 uppercase tracking-wider mb-1">Avg Premium</p>
                <p className="text-3xl font-bold text-amber-400 font-mono">${data.overview.avgPremiumPerCustomer.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div variants={itemVariants} className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6">
        <TabButton active={activeSection === 'overview'} onClick={() => setActiveSection('overview')} icon={PieChart} label="Overview" shortLabel="Overview" />
        <TabButton active={activeSection === 'products'} onClick={() => setActiveSection('products')} icon={Package} label="Products" shortLabel="Products" />
        <TabButton active={activeSection === 'crosssell'} onClick={() => setActiveSection('crosssell')} icon={Target} label="Cross-Sell" shortLabel="X-Sell" />
        <TabButton active={activeSection === 'retention'} onClick={() => setActiveSection('retention')} icon={RefreshCw} label="Retention" shortLabel="Retain" />
        <TabButton active={activeSection === 'analysis'} onClick={() => setActiveSection('analysis')} icon={Zap} label="Analysis" shortLabel="Analyze" />
      </motion.div>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Bundle Rate" value={`${data.bundling.bundleRate}%`} subtitle="2+ policies" icon={Package} color="sky" trend="up" trendValue="+5.2%" />
            <MetricCard title="Policies/Customer" value={data.bundling.policiesPerCustomer.toFixed(2)} subtitle="Industry avg: 1.8" icon={BarChart3} color="sapphire" />
            <MetricCard title="Avg Tenure" value={`${data.demographics.avgTenure} yrs`} subtitle="Customer loyalty" icon={Users} color="gold" />
            <MetricCard title="Cross-Sell Opps" value={data.crossSellOpportunities.totalOpportunities} subtitle="Actionable leads" icon={Target} color="rose" trend="up" />
          </div>

          {/* Demographics Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Age Distribution */}
            <motion.div variants={itemVariants} className="glass-card-elevated p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="icon-container bg-blue-500/20 border-blue-500/30">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="heading-4 text-white">Age Distribution</h3>
              </div>
              <div className="space-y-4">
                {Object.entries(data.demographics.ageDistribution).map(([bracket, { percentage }]) => (
                  <PremiumProgressBar key={bracket} value={percentage} max={50} label={bracket} color={percentage > 30 ? 'blue' : 'sky'} />
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-white/50">Average Age</p>
                  <p className="text-lg font-bold text-white font-mono">{data.demographics.avgAge} yrs</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Median Age</p>
                  <p className="text-lg font-bold text-white font-mono">{data.demographics.medianAge} yrs</p>
                </div>
              </div>
            </motion.div>

            {/* Gender & Marital */}
            <motion.div variants={itemVariants} className="glass-card-elevated p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="icon-container bg-purple-500/20 border-purple-500/30">
                  <Heart className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="heading-4 text-white">Demographics</h3>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-3">Gender</p>
                  <div className="space-y-2">
                    {Object.entries(data.demographics.genderDistribution).slice(0, 3).map(([gender, { percentage }]) => (
                      <div key={gender} className="flex justify-between items-center">
                        <span className="text-sm text-white/70">{gender}</span>
                        <span className="font-mono text-white">{percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-3">Marital</p>
                  <div className="space-y-2">
                    {Object.entries(data.demographics.maritalStatus).slice(0, 3).map(([status, { percentage }]) => (
                      <div key={status} className="flex justify-between items-center">
                        <span className="text-sm text-white/70">{status}</span>
                        <span className="font-mono text-white">{percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-sm text-purple-300">
                  <Sparkles className="w-4 h-4 inline mr-2" />
                  48% couples + 53% married = ideal for multi-policy bundling
                </p>
              </div>
            </motion.div>
          </div>

          {/* Tenure & Geography */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Tenure */}
            <motion.div variants={itemVariants} className="glass-card-elevated p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="icon-container bg-indigo-500/20 border-indigo-500/30">
                  <RefreshCw className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="heading-4 text-white">Customer Tenure</h3>
              </div>
              <div className="space-y-4">
                {Object.entries(data.demographics.tenureDistribution).map(([bracket, { percentage }]) => (
                  <PremiumProgressBar key={bracket} value={percentage} max={60} label={bracket} color={bracket.includes('10+') ? 'sky' : 'blue'} />
                ))}
              </div>
              <div className="mt-6 p-4 rounded-lg bg-sky-500/10 border border-sky-500/20">
                <p className="text-sm text-sky-300">
                  <Crown className="w-4 h-4 inline mr-2" />
                  57% are 10+ year customers - strong loyalty base
                </p>
              </div>
            </motion.div>

            {/* Geography */}
            <motion.div variants={itemVariants} className="glass-card-elevated p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="icon-container bg-sky-500/20 border-sky-500/30">
                  <MapPin className="w-5 h-5 text-sky-400" />
                </div>
                <h3 className="heading-4 text-white">Geographic Distribution</h3>
              </div>
              <div className="space-y-4">
                {Object.entries(data.geography).map(([city, { percentage }]) => (
                  <PremiumProgressBar key={city} value={percentage} max={50} label={city} color={city === 'SANTA BARBARA' ? 'sky' : 'blue'} />
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-sm text-white/60">
                  Primary Market: <span className="text-sky-400 font-semibold">Santa Barbara & Goleta</span> ({(data.geography["SANTA BARBARA"].percentage + data.geography["GOLETA"].percentage).toFixed(1)}%)
                </p>
              </div>
            </motion.div>
          </div>

          {/* Digital Engagement */}
          <motion.div variants={itemVariants} className="glass-card-elevated p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-container bg-cyan-500/20 border-cyan-500/30">
                <Activity className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="heading-4 text-white">Digital Engagement</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-4 text-center bg-amber-500/10 border-amber-500/20">
                <p className="text-3xl font-bold text-amber-400 font-mono">{data.demographics.ezPayEnrollment}%</p>
                <p className="text-xs text-white/50 mt-1">EZPay Enrolled</p>
                <p className="text-xs text-rose-400 mt-1">69% at lapse risk</p>
              </div>
              <div className="glass-card p-4 text-center bg-sky-500/10 border-sky-500/20">
                <p className="text-3xl font-bold text-sky-400 font-mono">100%</p>
                <p className="text-xs text-white/50 mt-1">My Account Active</p>
              </div>
              <div className="glass-card p-4 text-center bg-rose-500/10 border-rose-500/20">
                <p className="text-3xl font-bold text-rose-400 font-mono">{data.retention.notOnEzPay}</p>
                <p className="text-xs text-white/50 mt-1">Not on EZPay</p>
                <p className="text-xs text-amber-400 mt-1">Retention opportunity</p>
              </div>
              <div className="glass-card p-4 text-center bg-blue-500/10 border-blue-500/20">
                <p className="text-3xl font-bold text-blue-400 font-mono">50.5%</p>
                <p className="text-xs text-white/50 mt-1">Multi-Policy Discount</p>
              </div>
            </div>
          </motion.div>

          {/* Customer Segments */}
          <motion.div variants={itemVariants} className="glass-card-elevated p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-container bg-amber-500/20 border-amber-500/30">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="heading-4 text-white">Customer Value Segments</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {Object.entries(data.customerSegments).map(([key, segment]) => (
                <div key={key} className="glass-card p-4 text-center bg-white/5 hover:bg-white/10 transition-colors">
                  <p className="text-2xl font-bold text-white font-mono">{segment.count}</p>
                  <p className="text-xs text-white/50 mt-1">{segment.label}</p>
                  <p className="text-xs text-amber-400 mt-1">{segment.percentage}%</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Products Section */}
      {activeSection === 'products' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          {/* Product Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(data.productMix).map(([product, info]) => (
              <ProductCard key={product} product={product} count={info.count} percentage={info.percentage} premium={info.premium} color={info.color} />
            ))}
          </div>

          {/* Key Insights */}
          <motion.div variants={itemVariants} className="glass-card-elevated p-6">
            <h3 className="heading-4 text-white mb-6">Product Mix Strategic Insights</h3>
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="glass-card p-5 bg-rose-500/10 border-rose-500/30 border-l-4">
                <h4 className="font-semibold text-rose-400 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Critical EZPay Gaps
                </h4>
                <ul className="space-y-1 text-sm text-white/70">
                  <li>• Homeowners: Only 14.1% on EZPay (vs 40.9% Auto)</li>
                  <li>• Landlords: Only 16.7% on EZPay</li>
                  <li>• 25+ yr avg tenure customers at payment lapse risk</li>
                </ul>
              </div>
              <div className="glass-card p-5 bg-blue-500/10 border-blue-500/30 border-l-4">
                <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Aging Book Opportunity
                </h4>
                <ul className="space-y-1 text-sm text-white/70">
                  <li>• Homeowners: 78% are 65+ (succession planning)</li>
                  <li>• Umbrella: 77% are 65+ with 66% married</li>
                  <li>• Target adult children for policy transitions</li>
                </ul>
              </div>
              <div className="glass-card p-5 bg-sky-500/10 border-sky-500/30 border-l-4">
                <h4 className="font-semibold text-sky-400 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Growth Pipeline
                </h4>
                <ul className="space-y-1 text-sm text-white/70">
                  <li>• Renters: 22% under 35, avg 6.9yr tenure</li>
                  <li>• 168 renters as future homeowner pipeline</li>
                  <li>• Track life events for conversion triggers</li>
                </ul>
              </div>
              <div className="glass-card p-5 bg-amber-500/10 border-amber-500/30 border-l-4">
                <h4 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
                  <Umbrella className="w-4 h-4" />
                  Umbrella Expansion
                </h4>
                <ul className="space-y-1 text-sm text-white/70">
                  <li>• Current: Only 74 policies (5.2% penetration)</li>
                  <li>• Target: 40% of bundled = ~350 opportunities</li>
                  <li>• Ideal: 65+, married couples</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Cross-Sell Section */}
      {activeSection === 'crosssell' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          {/* Revenue Opportunity Hero */}
          <motion.div variants={itemVariants} className="relative overflow-hidden">
            <div className="glass-card-elevated p-8 bg-gradient-to-r from-sky-500/10 to-cyan-500/10 border-sky-500/30">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-sky-500/10 blur-3xl" />
              <div className="relative z-10">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div>
                    <h3 className="heading-2 text-white mb-2">Cross-Sell Revenue Opportunity</h3>
                    <p className="text-white/60">Based on All Purpose Audit analysis</p>
                  </div>
                  <div className="text-right">
                    <p className="text-5xl font-bold text-sky-400 font-mono">${(data.crossSellOpportunities.estimatedPremiumPotential / 1000).toFixed(0)}K</p>
                    <p className="text-sky-300 text-sm">Potential Annual Premium</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white font-mono">{data.crossSellOpportunities.totalOpportunities}</p>
                    <p className="text-xs text-white/60 mt-1">Total Opportunities</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white font-mono">{data.crossSellOpportunities.singlePolicy}</p>
                    <p className="text-xs text-white/60 mt-1">Single-Policy (60%)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white font-mono">15-25%</p>
                    <p className="text-xs text-white/60 mt-1">Avg Conversion Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white font-mono">$1,500</p>
                    <p className="text-xs text-white/60 mt-1">Avg Additional Premium</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Opportunity Cards */}
          <div className="grid lg:grid-cols-2 gap-4">
            <OpportunityCard title="Auto-Only → Add Home/Renters" count={data.crossSellOpportunities.autoOnlyNeedHome} action="Bundle with homeowners or renters" potentialPremium={505500} priority="high" icon={Home} />
            <OpportunityCard title="Home-Only → Add Auto" count={data.crossSellOpportunities.homeOnlyNeedAuto} action="Bundle with auto insurance" potentialPremium={239400} priority="high" icon={Car} />
            <OpportunityCard title="Bundled → Add Umbrella" count={data.crossSellOpportunities.needUmbrella} action="Add personal umbrella coverage" potentialPremium={30825} priority="medium" icon={Umbrella} />
            <OpportunityCard title="Renters → Homeowners" count={data.crossSellOpportunities.rentersToHome} action="Future homeowner conversion" potentialPremium={237000} priority="low" icon={Building} />
          </div>

          {/* Top Targets */}
          <div className="grid lg:grid-cols-2 gap-6">
            <motion.div variants={itemVariants} className="glass-card-elevated p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="icon-container bg-blue-500/20 border-blue-500/30">
                  <Car className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="heading-4 text-white">Top Auto-Only Targets</h3>
              </div>
              <div className="space-y-3">
                {data.crossSellTargets.autoOnlyTopTargets.map((target, i) => {
                  const taskKey = `${target.name}-Auto-Only Add Home`;
                  return (
                    <TargetRow
                      key={i}
                      name={target.name}
                      premium={target.premium}
                      tenure={target.tenure}
                      detail={target.zip}
                      category="Auto-Only Add Home"
                      onCreateTask={() => handleCreateTask(target.name, 'Auto-Only Add Home', target.premium, target.zip)}
                      isCreating={creatingTaskFor === taskKey}
                      hasTask={createdTasks.has(taskKey)}
                    />
                  );
                })}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-card-elevated p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="icon-container bg-cyan-500/20 border-cyan-500/30">
                  <Umbrella className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="heading-4 text-white">Top Umbrella Targets</h3>
              </div>
              <div className="space-y-3">
                {data.crossSellTargets.umbrellaTopTargets.map((target, i) => {
                  const taskKey = `${target.name}-Add Umbrella`;
                  return (
                    <TargetRow
                      key={i}
                      name={target.name}
                      premium={target.premium}
                      tenure={target.tenure}
                      detail={target.products}
                      category="Add Umbrella"
                      onCreateTask={() => handleCreateTask(target.name, 'Add Umbrella', target.premium, target.products)}
                      isCreating={creatingTaskFor === taskKey}
                      hasTask={createdTasks.has(taskKey)}
                    />
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* At-Risk High Value */}
          <motion.div variants={itemVariants} className="glass-card-elevated p-6 bg-rose-500/5 border-rose-500/30">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-container bg-rose-500/20 border-rose-500/30">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="heading-4 text-white">At-Risk High Value Customers</h3>
                <p className="text-sm text-rose-300">157 customers at high churn risk - single policy, $2K+ premium</p>
              </div>
            </div>
            <div className="grid lg:grid-cols-5 gap-3">
              {data.crossSellTargets.atRiskHighValue.map((target, i) => (
                <div key={i} className="glass-card p-4 text-center bg-rose-500/10 border-rose-500/20">
                  <p className="font-bold text-rose-400 font-mono">${target.premium.toLocaleString()}</p>
                  <p className="text-xs text-white truncate mt-1">{target.name}</p>
                  <p className="text-xs text-white/50">{target.product} • {target.tenure}yr</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Retention Section */}
      {activeSection === 'retention' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          {/* Retention Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Renewal Rate" value={`${data.retention.renewalRate}%`} subtitle="Year to date" icon={RefreshCw} color="sapphire" />
            <MetricCard title="Single Policy Risk" value={data.retention.singlePolicyChurnRisk} subtitle="60% of customers" icon={AlertTriangle} color="rose" />
            <MetricCard title="Not on EZPay" value={data.retention.notOnEzPay} subtitle="Payment lapse risk" icon={FileWarning} color="gold" />
            <MetricCard title="High Value at Risk" value={data.retention.atRiskHighValue} subtitle="$2K+ premium" icon={Shield} color="rose" />
          </div>

          {/* Risk Distribution */}
          <motion.div variants={itemVariants} className="glass-card-elevated p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-container bg-rose-500/20 border-rose-500/30">
                <Activity className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="heading-4 text-white">Retention Risk Distribution</h3>
                <p className="text-sm text-white/60">${data.retentionRisk.revenueAtRisk.toLocaleString()} revenue at high risk</p>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {Object.entries(data.retentionRisk.distribution).map(([score, info]) => {
                const riskColors: Record<string, string> = {
                  "0": "bg-sky-500/10 border-sky-500/20 text-sky-400",
                  "1": "bg-sky-500/10 border-sky-500/20 text-sky-400",
                  "2": "bg-blue-500/10 border-blue-500/20 text-blue-400",
                  "3": "bg-amber-500/10 border-amber-500/20 text-amber-400",
                  "4": "bg-orange-500/10 border-orange-500/20 text-orange-400",
                  "5": "bg-rose-500/10 border-rose-500/20 text-rose-400"
                };
                return (
                  <div key={score} className={`glass-card p-4 text-center ${riskColors[score]}`}>
                    <p className={`text-2xl font-bold font-mono ${riskColors[score].split(' ')[2]}`}>{info.count}</p>
                    <p className="text-xs text-white/50 mt-1">{info.label}</p>
                    <p className="text-xs text-white/40 mt-1">${info.avgPremium.toLocaleString()} avg</p>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* High Risk Customers */}
          <motion.div variants={itemVariants} className="glass-card-elevated p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-container bg-rose-500/20 border-rose-500/30">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="heading-4 text-white">High Risk Customers (Score 5)</h3>
            </div>
            <div className="space-y-3">
              {data.retentionRisk.highRiskCustomers.map((customer, i) => {
                const taskKey = `${customer.name}-High Retention Risk`;
                return (
                  <TargetRow
                    key={i}
                    name={customer.name}
                    premium={customer.premium}
                    tenure={customer.tenure}
                    detail={`${customer.policyCount} policy ${customer.ezpay ? 'EZPay' : 'No EZPay'}`}
                    variant="danger"
                    category="High Retention Risk"
                    onCreateTask={() => handleCreateTask(customer.name, 'High Retention Risk', customer.premium, `${customer.policyCount} policy, ${customer.ezpay ? 'EZPay enrolled' : 'Not on EZPay'}`)}
                    isCreating={creatingTaskFor === taskKey}
                    hasTask={createdTasks.has(taskKey)}
                  />
                );
              })}
            </div>
          </motion.div>

          {/* Referral Potential */}
          <motion.div variants={itemVariants} className="glass-card-elevated p-6 bg-gradient-to-br from-sky-500/10 to-cyan-500/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-container bg-sky-500/20 border-sky-500/30">
                <Crown className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h3 className="heading-4 text-white">Top Referral Candidates</h3>
                <p className="text-sm text-white/60">{data.referralPotential.totalCandidates} high-value loyal customers</p>
              </div>
            </div>
            <div className="space-y-3">
              {data.referralPotential.topCandidates.map((candidate, i) => {
                const taskKey = `${candidate.name}-Referral Outreach`;
                return (
                  <TargetRow
                    key={i}
                    name={candidate.name}
                    premium={candidate.premium}
                    tenure={candidate.tenure}
                    detail={`${candidate.policyCount} policies`}
                    variant="success"
                    category="Referral Outreach"
                    onCreateTask={() => handleCreateTask(candidate.name, 'Referral Outreach', candidate.premium, `${candidate.policyCount} policies, ${candidate.tenure}yr tenure`)}
                    isCreating={creatingTaskFor === taskKey}
                    hasTask={createdTasks.has(taskKey)}
                  />
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Analysis Section */}
      {activeSection === 'analysis' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          {/* Key Insights */}
          <motion.div variants={itemVariants} className="glass-card-elevated p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-container-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="heading-2 text-white">Strategic Analysis</h2>
                <p className="body text-white/60">Key insights from All Purpose Audit</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Growth Opportunities */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-sky-400 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Growth Opportunities
                </h3>
                <div className="glass-card p-4 bg-sky-500/10 border-sky-500/20">
                  <p className="text-3xl font-bold text-sky-400 font-mono">$775K</p>
                  <p className="text-sm text-white/60">Cross-sell premium potential</p>
                </div>
                <ul className="space-y-2 text-sm text-white/70">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                    337 auto-only customers need home
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                    137 bundled customers need umbrella
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                    158 renters as future homeowners
                  </li>
                </ul>
              </div>

              {/* Risk Factors */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Risk Factors
                </h3>
                <div className="glass-card p-4 bg-rose-500/10 border-rose-500/20">
                  <p className="text-3xl font-bold text-rose-400 font-mono">$104K</p>
                  <p className="text-sm text-white/60">Revenue at high risk</p>
                </div>
                <ul className="space-y-2 text-sm text-white/70">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                    523 single-policy customers (60%)
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                    601 not on EZPay (payment lapse risk)
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                    Aging book: 78% homeowners are 65+
                  </li>
                </ul>
              </div>

              {/* Strengths */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Portfolio Strengths
                </h3>
                <div className="glass-card p-4 bg-blue-500/10 border-blue-500/20">
                  <p className="text-3xl font-bold text-blue-400 font-mono">16.9 yrs</p>
                  <p className="text-sm text-white/60">Average customer tenure</p>
                </div>
                <ul className="space-y-2 text-sm text-white/70">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    57% are 10+ year customers
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    40.3% bundle rate (room to grow)
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    179 high-value referral candidates
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Action Plan */}
          <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-600" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />

            <div className="relative p-8">
              <h3 className="text-2xl font-bold text-white mb-6 font-display">Recommended Action Plan</h3>
              <div className="grid lg:grid-cols-3 gap-6">
                <div>
                  <div className="text-sky-200 text-sm mb-2 uppercase tracking-wider">Week 1-2</div>
                  <div className="text-xl font-bold text-white mb-2">EZPay Campaign</div>
                  <p className="text-sky-100 text-sm">Enroll 601 non-EZPay customers to reduce payment lapse risk</p>
                </div>
                <div>
                  <div className="text-cyan-200 text-sm mb-2 uppercase tracking-wider">Week 3-4</div>
                  <div className="text-xl font-bold text-white mb-2">Bundle Push</div>
                  <p className="text-cyan-100 text-sm">Target 337 auto-only + 171 home-only for cross-sell</p>
                </div>
                <div>
                  <div className="text-blue-200 text-sm mb-2 uppercase tracking-wider">Ongoing</div>
                  <div className="text-xl font-bold text-white mb-2">Referral Program</div>
                  <p className="text-blue-100 text-sm">Activate 179 high-value loyal customers for referrals</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default BookOfBusinessDashboard;
