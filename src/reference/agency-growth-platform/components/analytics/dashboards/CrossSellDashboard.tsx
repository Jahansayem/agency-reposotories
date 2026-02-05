/**
 * Cross-Sell Opportunity Dashboard (V7.0)
 * Executive Intelligence Design System v3.0 - Premium Dark Theme
 *
 * Displays prioritized cross-sell opportunities from renewal analysis.
 * Shows scoring methodology and actionable call list.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Home,
  Car,
  Umbrella,
  Building2,
  DollarSign,
  AlertTriangle,
  Clock,
  Filter,
  TrendingUp,
  Target,
  Users,
  Info,
  CheckCircle,
  XCircle,
  Search,
  Flame,
  Zap,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Shield,
  BarChart3,
  Percent,
  MapPin,
  ChevronRight
} from 'lucide-react';
import OutreachPanel from './OutreachPanel';
import { useCrossSellOpportunities } from '../hooks/useCrossSellOpportunities';

// Import customer data for enrichment
import customersData from '../data/customers.json';

// Customer type from customers.json
interface Customer {
  name: string;
  totalPremium: number;
  policyCount: number;
  zipCode: string;
  email: string;
  phone: string;
  tenure: number;
  ezpay: boolean;
  products: string[];
  gender: string;
  maritalStatus: string;
  claimCount: number;
}

// Find matching customer from customers.json
function findCustomerData(customerName: string): Customer | null {
  const normalizedSearch = customerName.toUpperCase().trim();
  return (customersData as Customer[]).find(c => {
    const normalizedName = c.name.toUpperCase().trim();
    return normalizedName === normalizedSearch ||
           normalizedName.includes(normalizedSearch) ||
           normalizedSearch.includes(normalizedName);
  }) || null;
}

// Import types from API client
import type { CrossSellOpportunity } from '../lib/api-client';

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

// Tier colors and icons - Dark theme configuration
// UPDATED: HOT uses orange (action needed), not red (which implies error/danger)
const TIER_CONFIG = {
  HOT: {
    gradient: 'from-orange-500/20 to-amber-500/5',
    border: 'border-orange-500/50',
    text: 'text-orange-400',
    badge: 'bg-gradient-to-r from-orange-500/30 to-amber-500/30 text-orange-300 border border-orange-500/50',
    glow: 'shadow-orange-500/20',
    icon: Flame,
    label: 'Hot priority - call today'
  },
  HIGH: {
    gradient: 'from-amber-500/20 to-yellow-500/5',
    border: 'border-amber-500/50',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    glow: 'shadow-amber-500/20',
    icon: Zap,
    label: 'High priority - call this week'
  },
  MEDIUM: {
    gradient: 'from-blue-500/20 to-blue-500/5',
    border: 'border-blue-500/50',
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
    glow: 'shadow-blue-500/20',
    icon: Target,
    label: 'Medium priority - call within 2 weeks'
  },
  LOW: {
    gradient: 'from-slate-500/20 to-slate-500/5',
    border: 'border-slate-500/50',
    text: 'text-slate-400',
    badge: 'bg-slate-500/20 text-slate-300 border border-slate-500/40',
    glow: 'shadow-slate-500/20',
    icon: Clock,
    label: 'Low priority - schedule for later'
  }
};

// Segment icons
const SEGMENT_ICONS = {
  'Segment 1: Auto→Home (Homeowner)': Home,
  'Segment 2: Home→Auto': Car,
  'Segment 3: Auto→Renters': Building2,
  'Segment 4: Bundle→Umbrella': Umbrella
};

const SEGMENT_LABELS = {
  'Segment 1: Auto→Home (Homeowner)': 'Auto → Home',
  'Segment 2: Home→Auto': 'Home → Auto',
  'Segment 3: Auto→Renters': 'Auto → Renters',
  'Segment 4: Bundle→Umbrella': 'Bundle → Umbrella'
};

const SEGMENT_COLORS = {
  'Segment 1: Auto→Home (Homeowner)': { bg: 'from-sky-500/20 to-sky-500/5', border: 'border-sky-500/30', text: 'text-sky-400' },
  'Segment 2: Home→Auto': { bg: 'from-blue-500/20 to-blue-500/5', border: 'border-blue-500/30', text: 'text-blue-400' },
  'Segment 3: Auto→Renters': { bg: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/30', text: 'text-purple-400' },
  'Segment 4: Bundle→Umbrella': { bg: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/30', text: 'text-amber-400' }
};

// Scoring methodology explanation
const SCORING_COMPONENTS = [
  {
    name: 'Gap / Bundle Potential',
    maxPoints: 40,
    color: 'sky',
    icon: Target,
    description: 'Product gaps that create bundling opportunities',
    details: [
      'Auto-only + homeowner signal: +40',
      'Auto-only + renter signal: +30',
      'Home-only + auto need: +35',
      'Already bundled (upsell only): +5'
    ]
  },
  {
    name: 'Timing / Trigger',
    maxPoints: 25,
    color: 'amber',
    icon: Calendar,
    description: 'Renewal timing and recent activity',
    details: [
      'Renewal in 0-45 days: +25',
      'Renewal in 46-90 days: +15',
      'Not yet renewed: +15',
      'Recent activity signals: +10-20'
    ]
  },
  {
    name: 'Value / Premium',
    maxPoints: 20,
    color: 'blue',
    icon: DollarSign,
    description: 'Customer value and premium size',
    details: [
      'Top quartile (>$2,500): +20',
      'Middle quartiles: +10',
      'Bottom quartile (<$1,000): +5',
      'Multi-policy bonus: +5'
    ]
  },
  {
    name: 'Retention Risk',
    maxPoints: 10,
    color: 'rose',
    icon: AlertTriangle,
    description: 'Indicators of potential churn',
    details: [
      'Balance due / late payment: +10',
      'Tenure < 12 months: +5',
      'No EZPay enrollment: +5',
      'Shopping signal: +10'
    ]
  },
  {
    name: 'Contactability',
    maxPoints: 5,
    color: 'purple',
    icon: Phone,
    description: 'Quality of contact information',
    details: [
      'Mobile + email present: +5',
      'One contact method: +2',
      'No contact info: +0'
    ]
  }
];

// Score Gauge Component
const ScoreGauge = ({ score, tier }: { score: number; tier: string }) => {
  const config = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.LOW;
  const circumference = 2 * Math.PI * 28;
  const strokeDasharray = `${(score / 100) * circumference} ${circumference}`;

  const getColor = () => {
    if (tier === 'HOT') return '#f97316'; // orange-500
    if (tier === 'HIGH') return '#f59e0b'; // amber-500
    if (tier === 'MEDIUM') return '#3b82f6'; // blue-500
    return '#64748b'; // slate-500
  };

  return (
    <div className="relative w-16 h-16">
      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="4"
          fill="none"
        />
        <motion.circle
          cx="32"
          cy="32"
          r="28"
          stroke={getColor()}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-white font-mono">{Math.round(score)}</span>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'sky',
  onClick,
  isActive = false
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'sky' | 'amber' | 'rose' | 'blue' | 'purple' | 'orange';
  onClick?: () => void;
  isActive?: boolean;
}) => {
  const colorClasses = {
    sky: 'from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400',
    rose: 'from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400',
    orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-400'
  };

  const Component = onClick ? motion.button : motion.div;

  return (
    <Component
      variants={itemVariants}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all duration-300 ${colorClasses[color]} ${
        onClick ? 'cursor-pointer hover:scale-[1.02]' : ''
      } ${isActive ? 'ring-2 ring-offset-2 ring-offset-[#0a0f1a] ring-white/30' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/60 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-white/50 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-xl bg-white/5 ${colorClasses[color].split(' ').pop()}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Component>
  );
};

// Opportunity Card Component
const OpportunityCard = ({
  opp,
  isExpanded,
  onToggle,
  showOutreach,
  onToggleOutreach
}: {
  opp: CrossSellOpportunity;
  isExpanded: boolean;
  onToggle: () => void;
  showOutreach: boolean;
  onToggleOutreach: () => void;
}) => {
  const tierConfig = TIER_CONFIG[opp.priorityTier as keyof typeof TIER_CONFIG] || TIER_CONFIG.LOW;
  const TierIcon = tierConfig.icon;
  const SegmentIcon = SEGMENT_ICONS[opp.segment as keyof typeof SEGMENT_ICONS] || Target;
  const segmentColors = SEGMENT_COLORS[opp.segment as keyof typeof SEGMENT_COLORS] || { bg: 'from-slate-500/20 to-slate-500/5', border: 'border-slate-500/30', text: 'text-slate-400' };

  return (
    <motion.div
      variants={itemVariants}
      layout
      className={`rounded-2xl border ${tierConfig.border} bg-gradient-to-br ${tierConfig.gradient} overflow-hidden transition-all duration-300 hover:shadow-lg ${tierConfig.glow}`}
    >
      {/* Main Row */}
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-white/5 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-4">
          {/* Priority Score Gauge */}
          <ScoreGauge score={opp.priorityScore} tier={opp.priorityTier} />

          {/* Customer Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-white text-lg">{opp.customerName}</h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${tierConfig.badge}`}>
                <TierIcon className="w-3 h-3" />
                {opp.priorityTier}
              </span>
              {opp.balanceDue > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-rose-500/20 text-rose-400 rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  ${opp.balanceDue.toFixed(0)} due
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-white/60">
              <span className="flex items-center gap-1.5">
                <SegmentIcon className="w-4 h-4" />
                {SEGMENT_LABELS[opp.segment as keyof typeof SEGMENT_LABELS] || opp.segment.split(':')[1]}
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span className="font-medium text-white/80">{opp.renewalDate}</span>
                <span className={opp.daysUntilRenewal <= 0 ? 'text-rose-400 font-semibold' : opp.daysUntilRenewal <= 7 ? 'text-amber-400' : ''}>
                  ({opp.daysUntilRenewal <= 0 ? 'TODAY' : opp.daysUntilRenewal === 1 ? 'tomorrow' : `${opp.daysUntilRenewal} days`})
                </span>
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1">
                <Shield className="w-4 h-4" />
                {opp.currentProducts}
              </span>
            </div>
          </div>

          {/* Premium Info */}
          <div className="hidden md:block text-right">
            <div className="text-lg font-bold text-white">${opp.currentPremium.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-sky-400 text-sm">
              <ArrowUpRight className="w-4 h-4" />
              +${opp.potentialPremiumAdd.toLocaleString()}
            </div>
          </div>

          {/* Expand Icon */}
          <div className="text-white/40">
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </div>
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/10">
              <div className="grid md:grid-cols-3 gap-6 pt-4">
                {/* Contact Info */}
                <div className="glass-card p-4">
                  <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Contact</h4>
                  <div className="space-y-2">
                    {opp.phone && (
                      <a
                        href={`tel:${opp.phone}`}
                        className="flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        {opp.phone}
                      </a>
                    )}
                    {opp.email && (
                      <a
                        href={`mailto:${opp.email}`}
                        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors truncate"
                      >
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        {opp.email}
                      </a>
                    )}
                    <div className="flex items-start gap-2 text-sm text-white/60">
                      <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{opp.address}, {opp.city} {opp.zipCode}</span>
                    </div>
                  </div>
                </div>

                {/* Customer Profile - Enhanced with full data */}
                {(() => {
                  const customer = findCustomerData(opp.customerName);
                  return (
                    <div className="glass-card p-4">
                      <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Full Customer Profile</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/50">Tenure</span>
                          <span className="text-white font-medium">{customer?.tenure || opp.tenureYears} years</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Policies</span>
                          <span className="text-white font-medium">{customer?.policyCount || opp.policyCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Total Premium</span>
                          <span className="text-sky-400 font-bold font-mono">
                            ${(customer?.totalPremium || opp.currentPremium).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">EZPay</span>
                          <span className={customer?.ezpay || opp.ezpayStatus === 'Yes' ? 'text-sky-400' : 'text-rose-400'}>
                            {customer?.ezpay || opp.ezpayStatus === 'Yes' ? (
                              <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Enrolled</span>
                            ) : (
                              <span className="flex items-center gap-1"><XCircle className="w-4 h-4" /> Not enrolled</span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Renewal Status</span>
                          <span className={opp.renewalStatus === 'Taken' ? 'text-sky-400' : 'text-amber-400'}>
                            {opp.renewalStatus}
                          </span>
                        </div>
                        {customer?.claimCount !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-white/50">Claims</span>
                            <span className={`inline-flex items-center gap-1 ${customer.claimCount === 0 ? 'text-green-400' : customer.claimCount >= 2 ? 'text-rose-400' : 'text-amber-400'}`}>
                              {customer.claimCount === 0 && <CheckCircle className="w-4 h-4" />}
                              {customer.claimCount}
                            </span>
                          </div>
                        )}
                        {customer?.maritalStatus && (
                          <div className="flex justify-between">
                            <span className="text-white/50">Status</span>
                            <span className="text-white/80">{customer.maritalStatus}</span>
                          </div>
                        )}

                        {/* Current Products */}
                        {customer?.products && customer.products.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <span className="text-white/50 text-xs uppercase">Current Products</span>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {customer.products.map((prod, i) => (
                                <span key={i} className="px-2 py-1 text-xs rounded-full bg-sky-500/20 text-sky-300">
                                  {prod}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Missing Products - Cross-sell opportunity */}
                        {customer?.products && (
                          <div className="mt-2">
                            <span className="text-white/50 text-xs uppercase">Missing Products</span>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {!customer.products.some(p => p.toLowerCase().includes('auto')) && (
                                <span className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-300">+ Auto</span>
                              )}
                              {!customer.products.some(p => p.toLowerCase().includes('home')) &&
                               !customer.products.some(p => p.toLowerCase().includes('renter')) && (
                                <span className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-300">+ Home/Renters</span>
                              )}
                              {!customer.products.some(p => p.toLowerCase().includes('umbrella')) && (
                                <span className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-300">+ Umbrella</span>
                              )}
                              {!customer.products.some(p => p.toLowerCase().includes('life')) && (
                                <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300">+ Life</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Talking Points */}
                <div className="glass-card p-4">
                  <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Talking Points</h4>
                  <ul className="space-y-2">
                    {[opp.talkingPoint1, opp.talkingPoint2, opp.talkingPoint3]
                      .filter(Boolean)
                      .map((point, idx) => (
                        <li key={idx} className="text-sm text-white/80 flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-medium">
                            {idx + 1}
                          </span>
                          {point}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>

              {/* Opportunity Summary */}
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-white/50">Recommend:</span>
                    <span className="font-semibold text-sky-400">{opp.recommendedProduct}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5">
                    <Percent className="w-4 h-4 text-blue-400" />
                    <span className="text-white/50">Conversion:</span>
                    <span className="font-medium text-white">{opp.expectedConversionPct}%</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5">
                    <TrendingUp className="w-4 h-4 text-sky-400" />
                    <span className="text-white/50">Retention:</span>
                    <span className="font-medium text-sky-400">+{opp.retentionLiftPct}%</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleOutreach();
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                    showOutreach
                      ? 'bg-sky-500 text-white'
                      : 'bg-sky-500/20 text-sky-400 hover:bg-sky-500/30'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  {showOutreach ? 'Hide' : 'Generate'} Outreach
                </button>
              </div>

              {/* Outreach Generator Panel */}
              <AnimatePresence>
                {showOutreach && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 overflow-hidden"
                  >
                    <OutreachPanel
                      opportunity={opp}
                      onClose={onToggleOutreach}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Pagination Component
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
      <div className="text-sm text-white/50">
        Showing {startItem}-{endItem} of {totalItems} opportunities
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm font-medium rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-target"
        >
          Previous
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-10 h-10 text-sm font-medium rounded-lg transition-all ${
                  currentPage === pageNum
                    ? 'bg-sky-500 text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm font-medium rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-target"
        >
          Next
        </button>
      </div>
    </div>
  );
};

// Tier Group Header Component
const TierGroupHeader = ({
  tier,
  count,
  isCollapsed,
  onToggle
}: {
  tier: string;
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
}) => {
  const config = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.LOW;
  const Icon = config.icon;

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between p-4 rounded-xl border ${config.border} bg-gradient-to-r ${config.gradient} hover:bg-white/5 transition-all touch-target`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-white/10 ${config.text}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${config.text}`}>{tier}</span>
            <span className="text-white/50 text-sm">({count} opportunities)</span>
          </div>
          <span className="text-xs text-white/40">{config.label}</span>
        </div>
      </div>
      <motion.div
        animate={{ rotate: isCollapsed ? 0 : 180 }}
        transition={{ duration: 0.2 }}
        className="text-white/40"
      >
        <ChevronDown className="w-5 h-5" />
      </motion.div>
    </button>
  );
};

export default function CrossSellDashboard() {
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMethodology, setShowMethodology] = useState(false);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [showOutreachFor, setShowOutreachFor] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [groupByTier, setGroupByTier] = useState(false);
  const [collapsedTiers, setCollapsedTiers] = useState<Set<string>>(new Set());
  const itemsPerPage = 25;

  // Fetch opportunities from API
  const {
    opportunities: apiOpportunities,
    meta,
    loading,
    error,
    refresh,
    logContactAttempt
  } = useCrossSellOpportunities({
    limit: 500, // Load all opportunities for client-side filtering
    autoFetch: true
  });

  const opportunities = apiOpportunities;

  // Calculate summary stats
  const stats = useMemo(() => {
    const tierCounts = { HOT: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    const segmentCounts: Record<string, number> = {};
    let totalPotentialPremium = 0;
    let withBalanceDue = 0;
    let pendingRenewals = 0;

    opportunities.forEach(opp => {
      tierCounts[opp.priorityTier as keyof typeof tierCounts]++;
      segmentCounts[opp.segment] = (segmentCounts[opp.segment] || 0) + 1;
      totalPotentialPremium += opp.potentialPremiumAdd * (opp.expectedConversionPct / 100);
      if (opp.balanceDue > 0) withBalanceDue++;
      if (opp.renewalStatus === 'Not Taken') pendingRenewals++;
    });

    return { tierCounts, segmentCounts, totalPotentialPremium, withBalanceDue, pendingRenewals };
  }, [opportunities]);

  // Filter opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      if (selectedTier !== 'all' && opp.priorityTier !== selectedTier) return false;
      if (selectedSegment !== 'all' && opp.segment !== selectedSegment) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          opp.customerName.toLowerCase().includes(query) ||
          opp.phone.includes(query) ||
          opp.email.toLowerCase().includes(query) ||
          opp.city.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [opportunities, selectedTier, selectedSegment, searchQuery]);

  // Paginated opportunities
  const totalPages = Math.ceil(filteredOpportunities.length / itemsPerPage);
  const paginatedOpportunities = useMemo(() => {
    if (groupByTier) return filteredOpportunities; // No pagination when grouped
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOpportunities.slice(start, start + itemsPerPage);
  }, [filteredOpportunities, currentPage, itemsPerPage, groupByTier]);

  // Group opportunities by tier
  const groupedOpportunities = useMemo(() => {
    if (!groupByTier) return null;
    const groups: Record<string, CrossSellOpportunity[]> = {
      HOT: [],
      HIGH: [],
      MEDIUM: [],
      LOW: []
    };
    filteredOpportunities.forEach(opp => {
      if (groups[opp.priorityTier]) {
        groups[opp.priorityTier].push(opp);
      }
    });
    return groups;
  }, [filteredOpportunities, groupByTier]);

  // Reset page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Toggle tier collapse
  const toggleTierCollapse = (tier: string) => {
    setCollapsedTiers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tier)) {
        newSet.delete(tier);
      } else {
        newSet.add(tier);
      }
      return newSet;
    });
  };

  // Get unique segments
  const segments = useMemo(() => {
    return [...new Set(opportunities.map(o => o.segment))].sort();
  }, [opportunities]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-sky-500 mb-4"></div>
          <p className="text-white/60 text-lg">Loading cross-sell opportunities...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="h-8 w-8 text-red-400" />
              <h3 className="text-xl font-semibold text-white">Error Loading Data</h3>
            </div>
            <p className="text-red-200/80 mb-6">{error.message}</p>
            <button
              onClick={() => refresh()}
              className="w-full px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-sky-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
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
              <h1 className="heading-1 text-white mb-2">Cross-Sell Opportunities</h1>
              <p className="body-lg text-white/60">
                {opportunities.length} prioritized opportunities from renewal analysis
              </p>
            </div>
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
            >
              <Info className="w-4 h-4 text-blue-400" />
              {showMethodology ? 'Hide' : 'Show'} Scoring Methodology
            </button>
          </div>
        </motion.div>

        {/* Methodology Panel */}
        <AnimatePresence>
          {showMethodology && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="glass-card-elevated p-6">
                <h2 className="heading-3 text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-sky-400" />
                  Priority Score Methodology (0-100 points)
                </h2>
                <p className="body text-white/60 mb-6">
                  Each opportunity is scored across 5 dimensions to prioritize outreach.
                  Higher scores indicate greater expected value and urgency.
                </p>

                {/* Formula */}
                <div className="glass-card p-4 mb-6 font-mono text-sm">
                  <span className="text-white/50">Expected Value = </span>
                  <span className="text-sky-400">P(close)</span>
                  <span className="text-white/50"> × </span>
                  <span className="text-amber-400">Premium</span>
                  <span className="text-white/50"> × </span>
                  <span className="text-blue-400">Retention Lift</span>
                  <span className="text-white/50"> − </span>
                  <span className="text-rose-400">Effort Cost</span>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {SCORING_COMPONENTS.map((component) => {
                    const colorClasses = {
                      sky: 'from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-400',
                      amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400',
                      blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
                      rose: 'from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-400',
                      purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400'
                    };
                    const Icon = component.icon;
                    return (
                      <div key={component.name} className={`rounded-xl border bg-gradient-to-br p-4 ${colorClasses[component.color as keyof typeof colorClasses]}`}>
                        <div className="flex items-center justify-between mb-2">
                          <Icon className="w-5 h-5" />
                          <span className="text-sm font-mono font-bold">0-{component.maxPoints}</span>
                        </div>
                        <h3 className="font-medium text-white text-sm mb-1">{component.name}</h3>
                        <p className="text-xs text-white/50 mb-3">{component.description}</p>
                        <ul className="space-y-1">
                          {component.details.slice(0, 2).map((detail, idx) => (
                            <li key={idx} className="text-xs text-white/40 flex items-start gap-1">
                              <ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                {/* Tier Thresholds */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h3 className="font-medium text-white mb-3">Priority Tiers</h3>
                  <div className="flex flex-wrap gap-4">
                    {(['HOT', 'HIGH', 'MEDIUM', 'LOW'] as const).map((tier) => {
                      const config = TIER_CONFIG[tier];
                      const Icon = config.icon;
                      const thresholds = { HOT: '95+', HIGH: '85-94', MEDIUM: '70-84', LOW: '<70' };
                      return (
                        <div key={tier} className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${config.text}`} />
                          <span className={`text-sm ${config.text}`}>
                            <strong>{tier}</strong> ({thresholds[tier]})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {(['HOT', 'HIGH', 'MEDIUM', 'LOW'] as const).map((tier) => {
            const config = TIER_CONFIG[tier];
            const Icon = config.icon;
            const colorMap = { HOT: 'orange', HIGH: 'amber', MEDIUM: 'blue', LOW: 'purple' } as const;
            return (
              <MetricCard
                key={tier}
                title={tier}
                value={stats.tierCounts[tier]}
                subtitle="opportunities"
                icon={Icon}
                color={colorMap[tier]}
                onClick={() => setSelectedTier(selectedTier === tier ? 'all' : tier)}
                isActive={selectedTier === tier}
              />
            );
          })}
          <MetricCard
            title="Expected Value"
            value={`$${Math.round(stats.totalPotentialPremium / 1000)}K`}
            subtitle="weighted potential"
            icon={DollarSign}
            color="sky"
          />
        </motion.div>

        {/* Segment Summary */}
        <motion.div variants={itemVariants} className="glass-card-elevated p-6 mb-8">
          <h2 className="heading-4 text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Opportunities by Segment
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {segments.map((segment) => {
              const Icon = SEGMENT_ICONS[segment as keyof typeof SEGMENT_ICONS] || Target;
              const label = SEGMENT_LABELS[segment as keyof typeof SEGMENT_LABELS] || segment;
              const count = stats.segmentCounts[segment] || 0;
              const isSelected = selectedSegment === segment;
              const colors = SEGMENT_COLORS[segment as keyof typeof SEGMENT_COLORS] || { bg: 'from-slate-500/20 to-slate-500/5', border: 'border-slate-500/30', text: 'text-slate-400' };

              return (
                <button
                  key={segment}
                  onClick={() => setSelectedSegment(isSelected ? 'all' : segment)}
                  className={`p-4 rounded-xl border transition-all text-left bg-gradient-to-br ${colors.bg} ${colors.border} ${
                    isSelected ? 'ring-2 ring-offset-2 ring-offset-[#0a0f1a] ring-white/30' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white/5 ${colors.text}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{label}</div>
                      <div className="text-sm text-white/50">{count} opportunities</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Search & Filters */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search by name, phone, email, or city..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleFilterChange();
              }}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setGroupByTier(!groupByTier)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl border transition-all touch-target ${
                groupByTier
                  ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Group by Tier
            </button>
            {(selectedTier !== 'all' || selectedSegment !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedTier('all');
                  setSelectedSegment('all');
                  setSearchQuery('');
                  handleFilterChange();
                }}
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-white/70 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all touch-target"
              >
                <XCircle className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </motion.div>

        {/* Results Count & Pagination Info */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div className="text-sm text-white/50">
            {filteredOpportunities.length} opportunities
            {selectedTier !== 'all' && <span className="text-white/70"> • {selectedTier} priority</span>}
            {selectedSegment !== 'all' && <span className="text-white/70"> • {SEGMENT_LABELS[selectedSegment as keyof typeof SEGMENT_LABELS] || selectedSegment}</span>}
          </div>
          {!groupByTier && totalPages > 1 && (
            <div className="text-sm text-white/40">
              Page {currentPage} of {totalPages}
            </div>
          )}
        </motion.div>

        {/* Opportunity List - Grouped View */}
        {groupByTier && groupedOpportunities ? (
          <motion.div variants={containerVariants} className="space-y-6">
            {(['HOT', 'HIGH', 'MEDIUM', 'LOW'] as const).map((tier) => {
              const tierOpps = groupedOpportunities[tier];
              if (tierOpps.length === 0) return null;
              const isCollapsed = collapsedTiers.has(tier);

              return (
                <div key={tier} className="space-y-3">
                  <TierGroupHeader
                    tier={tier}
                    count={tierOpps.length}
                    isCollapsed={isCollapsed}
                    onToggle={() => toggleTierCollapse(tier)}
                  />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-3 overflow-hidden"
                      >
                        {tierOpps.slice(0, 10).map((opp) => (
                          <OpportunityCard
                            key={`${opp.customerName}-${opp.priorityRank}`}
                            opp={opp}
                            isExpanded={expandedCustomer === opp.customerName}
                            onToggle={() => setExpandedCustomer(expandedCustomer === opp.customerName ? null : opp.customerName)}
                            showOutreach={showOutreachFor === opp.customerName}
                            onToggleOutreach={() => setShowOutreachFor(showOutreachFor === opp.customerName ? null : opp.customerName)}
                          />
                        ))}
                        {tierOpps.length > 10 && (
                          <div className="text-center py-3 text-white/40 text-sm">
                            +{tierOpps.length - 10} more {tier.toLowerCase()} opportunities.
                            <button
                              onClick={() => {
                                setSelectedTier(tier);
                                setGroupByTier(false);
                              }}
                              className="ml-2 text-sky-400 hover:text-sky-300"
                            >
                              View all →
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        ) : (
          /* Opportunity List - Paginated View */
          <>
            <motion.div variants={containerVariants} className="space-y-4">
              {paginatedOpportunities.map((opp) => (
                <OpportunityCard
                  key={`${opp.customerName}-${opp.priorityRank}`}
                  opp={opp}
                  isExpanded={expandedCustomer === opp.customerName}
                  onToggle={() => setExpandedCustomer(expandedCustomer === opp.customerName ? null : opp.customerName)}
                  showOutreach={showOutreachFor === opp.customerName}
                  onToggleOutreach={() => setShowOutreachFor(showOutreachFor === opp.customerName ? null : opp.customerName)}
                />
              ))}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div variants={itemVariants} className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredOpportunities.length}
                  itemsPerPage={itemsPerPage}
                />
              </motion.div>
            )}
          </>
        )}

        {/* Empty State */}
        {filteredOpportunities.length === 0 && (
          <motion.div
            variants={itemVariants}
            className="text-center py-16 glass-card rounded-2xl"
          >
            <Filter className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="heading-4 text-white mb-2">No opportunities match your filters</h3>
            <p className="text-white/50">Try adjusting your search or filter criteria</p>
          </motion.div>
        )}

        {/* Retention Statistics */}
        <motion.div
          variants={itemVariants}
          className="mt-8 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-blue-500/5 p-6"
        >
          <h2 className="heading-4 text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Why Cross-Selling Matters
          </h2>
          <div className="grid sm:grid-cols-4 gap-6">
            {[
              { policies: 1, retention: 72, color: 'from-slate-400 to-slate-500' },
              { policies: 2, retention: 91, color: 'from-blue-400 to-blue-500' },
              { policies: 3, retention: 97, color: 'from-sky-400 to-sky-500' },
              { policies: '4+', retention: 98, color: 'from-amber-400 to-amber-500' }
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className={`text-4xl font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                  {item.retention}%
                </div>
                <div className="text-sm text-white/50 mt-1">
                  {item.policies}-policy retention
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-white/60 text-center">
            Each additional product increases retention by 6-19 percentage points.
            Bundle customers are 2.5x more likely to stay long-term.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
