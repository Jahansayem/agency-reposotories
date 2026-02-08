/**
 * Customer Lookup Dashboard
 * Executive Intelligence Design System v3.0 - Premium Dark Theme
 * Search for customers to do deep-dive analysis for cross-sell, upsell, and retention opportunities
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  User,
  Star,
  TrendingUp,
  AlertTriangle,
  Shield,
  Home,
  Car,
  Umbrella,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Target,
  ChevronRight,
  ChevronDown,
  Award,
  Heart,
  Zap,
  Info,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Lightbulb,
  Users,
  Calendar,
  Sparkles,
  X
} from 'lucide-react';

// Import customer data
import customersData from '../data/customers.json';
import crossSellData from '../data/crossSellOpportunities.json';

// Type for cross-sell opportunity from JSON
interface CrossSellOpportunity {
  priorityRank: number;
  priorityTier: string;
  priorityScore: number;
  customerName: string;
  phone: string;
  email: string;
  renewalDate: string;
  daysUntilRenewal: number;
  currentProducts: string;
  recommendedProduct: string;
  segment: string;
  potentialPremiumAdd: number;
  expectedConversionPct: number;
  talkingPoint1: string;
  talkingPoint2: string;
  talkingPoint3: string;
  balanceDue: number;
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
  visible: { opacity: 1, y: 0 }
};

// Types
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

// Scoring algorithm
function calculateCustomerScore(customer: Customer): {
  overall: number;
  retention: number;
  growth: number;
  referral: number;
  risk: number;
} {
  let retention = 50;
  if (customer.policyCount >= 3) retention += 20;
  else if (customer.policyCount >= 2) retention += 10;
  else retention -= 15;

  if (customer.ezpay) retention += 15;
  if (customer.tenure >= 10) retention += 15;
  else if (customer.tenure >= 5) retention += 10;
  else if (customer.tenure < 2) retention -= 10;

  if (customer.claimCount === 0) retention += 5;
  else if (customer.claimCount >= 3) retention -= 10;

  retention = Math.max(0, Math.min(100, retention));

  let growth = 30;
  const hasAuto = customer.products.some(p => p.toLowerCase().includes('auto'));
  const hasHome = customer.products.some(p => p.toLowerCase().includes('home'));
  const hasUmbrella = customer.products.some(p => p.toLowerCase().includes('umbrella'));
  const hasLife = customer.products.some(p => p.toLowerCase().includes('life'));

  if (hasAuto && !hasHome) growth += 25;
  if (hasHome && !hasAuto) growth += 25;
  if ((hasAuto || hasHome) && !hasUmbrella) growth += 20;
  if (!hasLife) growth += 10;
  if (customer.totalPremium >= 5000) growth += 10;
  if (customer.totalPremium >= 10000) growth += 5;

  growth = Math.max(0, Math.min(100, growth));

  let referral = 20;
  if (customer.tenure >= 10) referral += 30;
  else if (customer.tenure >= 5) referral += 15;
  if (customer.policyCount >= 2) referral += 20;
  if (customer.totalPremium >= 3000) referral += 15;
  if (customer.claimCount === 0) referral += 10;
  if (customer.ezpay) referral += 5;

  referral = Math.max(0, Math.min(100, referral));

  let risk = 20;
  if (customer.policyCount === 1) risk += 30;
  if (!customer.ezpay) risk += 20;
  if (customer.tenure < 2) risk += 15;
  if (customer.claimCount >= 2) risk += 15;

  risk = Math.max(0, Math.min(100, risk));

  const overall = Math.round(
    (retention * 0.3) + (growth * 0.25) + (referral * 0.25) + ((100 - risk) * 0.2)
  );

  return { overall, retention, growth, referral, risk };
}

// Get sales opportunities
function getSalesOpportunities(customer: Customer): Array<{
  type: string;
  title: string;
  description: string;
  potentialPremium: number;
  priority: 'high' | 'medium' | 'low';
  action: string;
  talkingPoints: string[];
  objectionHandlers: string[];
}> {
  const opportunities = [];

  const hasAuto = customer.products.some(p => p.toLowerCase().includes('auto'));
  const hasHome = customer.products.some(p => p.toLowerCase().includes('home'));
  const hasUmbrella = customer.products.some(p => p.toLowerCase().includes('umbrella'));
  const hasLife = customer.products.some(p => p.toLowerCase().includes('life'));
  const hasRenters = customer.products.some(p => p.toLowerCase().includes('renter'));
  const hasCondo = customer.products.some(p => p.toLowerCase().includes('condo'));

  if (hasAuto && !hasHome && !hasRenters && !hasCondo) {
    opportunities.push({
      type: 'bundle',
      title: 'Add Homeowners Policy',
      description: 'Bundle with auto for 95% retention and multi-policy discount',
      potentialPremium: 1800,
      priority: 'high' as const,
      action: 'Call to discuss home insurance needs',
      talkingPoints: [
        `"I noticed you have your auto with us but not your home. Did you know bundling saves you ${customer.totalPremium >= 2000 ? '15-20%' : '10-15%'} on both?"`,
        '"Our bundled customers have a 95% retention rate because the value is so strong."',
        '"When was your home policy last reviewed? I can do a quick comparison."'
      ],
      objectionHandlers: [
        '"I\'m happy with my current provider" → "Would you be open to a quick comparison? Many customers are surprised to find they\'re overpaying by $300-500/year."',
        '"It\'s too much hassle to switch" → "We handle all the paperwork. Most customers say it was much easier than expected."'
      ]
    });
  }

  if (hasHome && !hasAuto) {
    opportunities.push({
      type: 'bundle',
      title: 'Add Auto Policy',
      description: 'Complete the bundle for maximum retention',
      potentialPremium: 1400,
      priority: 'high' as const,
      action: 'Review current auto coverage',
      talkingPoints: [
        '"You\'re already getting great coverage on your home. Let me show you how much you could save by bundling your auto."',
        '"When does your current auto policy renew? Let\'s get a quote ready so you can compare."'
      ],
      objectionHandlers: [
        '"My auto rate is really good" → "Let me run a quick quote - you might be surprised. Even if rates are similar, the bundle benefits add up."'
      ]
    });
  }

  if ((hasAuto || hasHome) && !hasUmbrella && customer.totalPremium >= 2000) {
    opportunities.push({
      type: 'upsell',
      title: 'Personal Umbrella Policy',
      description: 'Extra liability protection - great for customers with assets',
      potentialPremium: 250,
      priority: customer.totalPremium >= 5000 ? 'high' as const : 'medium' as const,
      action: 'Explain umbrella benefits and coverage gaps',
      talkingPoints: [
        `"With your ${customer.policyCount} policies totaling $${customer.totalPremium.toLocaleString()}, you clearly have assets worth protecting. An umbrella policy gives you an extra $1M+ in liability for about $200-300/year."`,
        '"If someone gets injured and sues for more than your policy limit, you could lose your savings, home equity, and future wages."'
      ],
      objectionHandlers: [
        '"I don\'t have that many assets" → "It\'s not just about current assets. A lawsuit can garnish your wages for years. It\'s about protecting your future."'
      ]
    });
  }

  if (!hasLife && (customer.maritalStatus === 'Married' || customer.gender === 'Couple')) {
    opportunities.push({
      type: 'cross-sell',
      title: 'Life Insurance',
      description: 'Protect family with term or whole life coverage',
      potentialPremium: 1200,
      priority: 'medium' as const,
      action: 'Schedule life insurance needs analysis',
      talkingPoints: [
        '"I see you\'re married. Have you thought about what would happen to your spouse\'s lifestyle if something happened to you?"',
        '"Term life is very affordable - a healthy 35-year-old can get $500K coverage for about $30/month."'
      ],
      objectionHandlers: [
        '"I have it through work" → "That\'s great as a base, but it usually only covers 1-2x salary and disappears if you change jobs."'
      ]
    });
  }

  if (!customer.ezpay) {
    opportunities.push({
      type: 'retention',
      title: 'Enroll in EZPay',
      description: 'Automatic payments reduce lapse risk by 60%',
      potentialPremium: 0,
      priority: customer.policyCount === 1 ? 'high' as const : 'medium' as const,
      action: 'Explain EZPay benefits and set up',
      talkingPoints: [
        '"I want to make sure you never accidentally miss a payment and lose coverage. Can we set up EZPay?"',
        '"It\'s the most convenient option - you\'ll never have to remember to mail a check or log in to pay."'
      ],
      objectionHandlers: [
        '"I like to control when I pay" → "You\'re still in control - you can choose your payment date, and we always send reminders."'
      ]
    });
  }

  if (hasRenters && customer.tenure >= 2) {
    opportunities.push({
      type: 'upgrade',
      title: 'Homeowners Upgrade',
      description: 'Long-term renter may be ready for home purchase',
      potentialPremium: 1500,
      priority: 'medium' as const,
      action: 'Ask about homeownership plans',
      talkingPoints: [
        `"You've been a great customer for ${customer.tenure} years. Any plans to buy a home? I'd love to help you get pre-approved quotes."`,
        '"First-time buyer? I can explain the insurance side and connect you with mortgage contacts."'
      ],
      objectionHandlers: [
        '"The market is too expensive" → "I hear you. Let me know when you\'re ready - I\'ll be here to help."'
      ]
    });
  }

  if (customer.tenure >= 10 && customer.policyCount >= 2 && customer.claimCount === 0) {
    opportunities.push({
      type: 'referral',
      title: 'Request Referrals',
      description: 'Loyal customer - ideal for referral program',
      potentialPremium: 2500,
      priority: 'medium' as const,
      action: 'Ask for friends/family referrals',
      talkingPoints: [
        `"You've been with us ${customer.tenure} years and we really appreciate your loyalty. Do you know anyone who might benefit from the same great coverage?"`,
        '"We offer referral rewards - $50 for each friend who gets a quote."'
      ],
      objectionHandlers: [
        '"I can\'t think of anyone" → "No pressure! If anyone mentions insurance, keep us in mind."'
      ]
    });
  }

  if (customer.claimCount > 0 && customer.policyCount === 1) {
    opportunities.push({
      type: 'retention',
      title: 'Post-Claim Check-in',
      description: 'Single-policy claimant at HIGH risk - needs immediate attention',
      potentialPremium: 0,
      priority: 'high' as const,
      action: 'Call to review coverage and offer bundle discount',
      talkingPoints: [
        '"I wanted to follow up on your recent claim and make sure everything was resolved to your satisfaction."',
        '"Claims can sometimes make people shop around. I\'d love to show you how bundling could offset any rate increase."'
      ],
      objectionHandlers: [
        '"My rate went up" → "Let me review your policy - there may be discounts we haven\'t applied. Bundling often saves more than the increase."'
      ]
    });
  }

  return opportunities.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// Find cross-sell opportunities from JSON data for a customer
function findCrossSellOpportunities(customerName: string): CrossSellOpportunity[] {
  // Normalize name for matching (handle case differences)
  const normalizedSearch = customerName.toUpperCase().trim();

  return (crossSellData as CrossSellOpportunity[]).filter(opp => {
    const normalizedOpp = opp.customerName.toUpperCase().trim();
    // Match by exact name or partial match
    return normalizedOpp === normalizedSearch ||
           normalizedOpp.includes(normalizedSearch) ||
           normalizedSearch.includes(normalizedOpp);
  });
}

// Tier config for cross-sell display - STANDARDIZED COLORS
// HOT = Orange (action needed), not red (which implies error)
const TIER_COLORS = {
  HOT: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' },
  HIGH: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/50' },
  MEDIUM: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' },
  LOW: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/50' }
};

// Priority colors for opportunities - STANDARDIZED
const PRIORITY_COLORS = {
  high: { border: 'border-amber-500/50', bg: 'bg-amber-500/10', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400' },
  medium: { border: 'border-blue-500/50', bg: 'bg-blue-500/10', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400' },
  low: { border: 'border-slate-500/50', bg: 'bg-slate-500/10', text: 'text-slate-400', badge: 'bg-slate-500/20 text-slate-400' }
};

// Score Gauge Component
const ScoreGauge = ({ label, score, color, description }: { label: string; score: number; color: string; description: string }) => {
  return (
    <motion.div
      variants={itemVariants}
      className="text-center"
    >
      <div className="relative w-20 h-20 mx-auto mb-3">
        <svg className="w-20 h-20 transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r="34"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="6"
            fill="none"
          />
          <motion.circle
            cx="40"
            cy="40"
            r="34"
            stroke={color}
            strokeWidth="6"
            fill="none"
            initial={{ strokeDasharray: "0 214" }}
            animate={{ strokeDasharray: `${(score / 100) * 214} 214` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white font-mono">
          {score}
        </span>
      </div>
      <p className="text-sm font-medium text-white">{label}</p>
      <p className="text-xs text-white/50">{description}</p>
    </motion.div>
  );
};

// Opportunity Card
const OpportunityCard = ({
  opportunity,
  isExpanded,
  onToggle
}: {
  opportunity: {
    type: string;
    title: string;
    description: string;
    potentialPremium: number;
    priority: 'high' | 'medium' | 'low';
    action: string;
    talkingPoints: string[];
    objectionHandlers: string[];
  };
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const config = PRIORITY_COLORS[opportunity.priority];

  return (
    <motion.div
      variants={itemVariants}
      className={`glass-card ${config.bg} ${config.border} border-l-4 overflow-hidden`}
    >
      <button
        onClick={onToggle}
        className="w-full p-5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${config.badge}`}>
              {opportunity.priority.toUpperCase()}
            </span>
            <span className="text-xs text-white/50">{opportunity.type}</span>
          </div>
          <div className="flex items-center gap-3">
            {opportunity.potentialPremium > 0 && (
              <span className="text-sm font-bold text-sky-400 font-mono">
                +${opportunity.potentialPremium.toLocaleString()}/yr
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
        <h5 className="font-semibold text-white">{opportunity.title}</h5>
        <p className="text-sm text-white/60 mt-1">{opportunity.description}</p>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-5 pb-5 space-y-4"
          >
            <div className="flex items-center text-sm glass-card p-3 bg-white/5">
              <Award className="w-4 h-4 mr-2 text-purple-400" />
              <span className="text-white"><strong className="text-purple-400">Action:</strong> {opportunity.action}</span>
            </div>

            <div className="glass-card p-4 bg-white/5">
              <h6 className="text-sm font-medium text-white mb-3 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-blue-400" />
                Talking Points
              </h6>
              <ul className="space-y-2">
                {opportunity.talkingPoints.map((point, j) => (
                  <li key={j} className="text-sm text-white/70 pl-4 border-l-2 border-blue-500/30">
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {opportunity.objectionHandlers.length > 0 && (
              <div className="glass-card p-4 bg-white/5">
                <h6 className="text-sm font-medium text-white mb-3 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-amber-400" />
                  Objection Handlers
                </h6>
                <ul className="space-y-2">
                  {opportunity.objectionHandlers.map((handler, j) => (
                    <li key={j} className="text-sm text-white/70 pl-4 border-l-2 border-amber-500/30">
                      {handler}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Example customer
const EXAMPLE_CUSTOMER: Customer = {
  name: "Example: Sarah Johnson",
  totalPremium: 2400,
  policyCount: 1,
  zipCode: "93101",
  email: "sarah.johnson@example.com",
  phone: "(805) 555-0123",
  tenure: 3,
  ezpay: false,
  products: ["Auto - Full Coverage"],
  gender: "Female",
  maritalStatus: "Married",
  claimCount: 0
};

export default function CustomerLookupDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(EXAMPLE_CUSTOMER);
  const [showInstructions, setShowInstructions] = useState(true);
  const [expandedOpportunity, setExpandedOpportunity] = useState<number | null>(null);

  const customers = customersData as Customer[];

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return customers
      .filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.zipCode.includes(query) ||
        c.phone.includes(query)
      )
      .slice(0, 10);
  }, [searchQuery, customers]);

  const scores = selectedCustomer ? calculateCustomerScore(selectedCustomer) : null;
  const opportunities = selectedCustomer ? getSalesOpportunities(selectedCustomer) : [];
  const crossSellOpps = selectedCustomer ? findCrossSellOpportunities(selectedCustomer.name) : [];

  const customerLTV = selectedCustomer ? {
    annual: selectedCustomer.totalPremium * 0.12,
    projected: selectedCustomer.totalPremium * 0.12 * (scores ? (scores.retention / 100) * 10 : 5),
    withOpportunities: (selectedCustomer.totalPremium + opportunities.reduce((sum, o) => sum + o.potentialPremium, 0)) * 0.12 * 10
  } : null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-6"
    >
      {/* Hero Header */}
      <motion.div variants={itemVariants} className="relative overflow-hidden">
        <div className="glass-card-elevated p-8 relative">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl animate-pulse delay-1000" />

          <div className="relative z-10">
            <div className="flex items-start gap-4 mb-4">
              <div className="icon-container-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30">
                <Search className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h1 className="heading-1 text-white">Customer Deep-Dive Tool</h1>
                <p className="body-lg text-white/60">Find opportunities to grow revenue and improve retention</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Instructions */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card-elevated p-6 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/30"
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className="icon-container bg-blue-500/20 border-blue-500/30">
                  <Info className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-4">How to Use This Tool</h3>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    {[
                      { num: 1, text: 'Search by name, phone, or ZIP' },
                      { num: 2, text: 'Review scores - Retention, Growth, Referral, Risk' },
                      { num: 3, text: 'Use opportunities with talking points' },
                      { num: 4, text: 'Take action - Call HIGH priority first' }
                    ].map((step) => (
                      <div key={step.num} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                          {step.num}
                        </span>
                        <span className="text-white/70">{step.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-4 rounded-lg bg-white/5">
                    <h4 className="text-sm font-semibold text-blue-300 mb-2 flex items-center">
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Why This Matters
                    </h4>
                    <ul className="text-xs text-white/60 space-y-1">
                      <li>• <strong className="text-white">Single-policy</strong> = 40% churn vs 5% bundled</li>
                      <li>• <strong className="text-white">EZPay</strong> = 60% less likely to lapse</li>
                      <li>• <strong className="text-white">Each policy</strong> = +15-20% retention</li>
                    </ul>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showInstructions && (
        <button
          onClick={() => setShowInstructions(true)}
          className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2"
        >
          <Info className="w-4 h-4" />
          Show instructions
        </button>
      )}

      {/* Search Box */}
      <motion.div variants={itemVariants} className="glass-card-elevated p-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, phone, or ZIP code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 text-lg transition-all"
          />
        </div>

        {filteredCustomers.length > 0 && (
          <div className="mt-4 glass-card divide-y divide-white/10 max-h-80 overflow-y-auto">
            {filteredCustomers.map((customer, i) => {
              const customerScores = calculateCustomerScore(customer);
              return (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setSearchQuery('');
                    setExpandedOpportunity(null);
                  }}
                  className="w-full p-4 text-left hover:bg-white/5 flex items-center justify-between transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{customer.name}</p>
                      {customer.policyCount === 1 && (
                        <span className="text-xs px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded">Single Policy</span>
                      )}
                      {!customer.ezpay && (
                        <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">No EZPay</span>
                      )}
                    </div>
                    <p className="text-sm text-white/50">
                      {customer.policyCount} policies • ${customer.totalPremium.toLocaleString()} • {customer.tenure}yr tenure
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className={`text-lg font-bold font-mono ${
                        customerScores.overall >= 70 ? 'text-sky-400' :
                        customerScores.overall >= 50 ? 'text-amber-400' :
                        'text-rose-400'
                      }`}>
                        {customerScores.overall}
                      </span>
                      <p className="text-xs text-white/50">Score</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/30" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {searchQuery && filteredCustomers.length === 0 && (
          <p className="mt-4 text-center text-white/50">No customers found matching "{searchQuery}"</p>
        )}
      </motion.div>

      {/* Selected Customer Details */}
      {selectedCustomer && scores && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          {/* Example Banner */}
          {selectedCustomer.name.startsWith('Example:') && (
            <motion.div variants={itemVariants} className="glass-card p-5 bg-amber-500/10 border-amber-500/30">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-300">This is an example customer</h4>
                    <p className="text-sm text-amber-200/70 mt-1">
                      Sarah represents a typical <strong className="text-amber-200">high-risk, high-opportunity</strong> customer: single policy, no EZPay, married but no home or life insurance.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-amber-400 hover:text-amber-300 text-sm font-medium"
                >
                  Clear
                </button>
              </div>
            </motion.div>
          )}

          {/* Customer Header */}
          <motion.div variants={itemVariants} className="glass-card-elevated p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="heading-2 text-white">{selectedCustomer.name}</h3>
                  {scores.risk >= 60 && (
                    <span className="badge-danger flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      At Risk
                    </span>
                  )}
                  {selectedCustomer.policyCount === 1 && (
                    <span className="badge-warning">Single Policy</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                  {selectedCustomer.phone && (
                    <a href={`tel:${selectedCustomer.phone}`} className="flex items-center hover:text-purple-400 transition-colors">
                      <Phone className="w-4 h-4 mr-1" />
                      {selectedCustomer.phone}
                    </a>
                  )}
                  {selectedCustomer.email && (
                    <a href={`mailto:${selectedCustomer.email}`} className="flex items-center hover:text-purple-400 transition-colors">
                      <Mail className="w-4 h-4 mr-1" />
                      {selectedCustomer.email}
                    </a>
                  )}
                  <span className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {selectedCustomer.zipCode}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold font-mono ${
                  scores.overall >= 70 ? 'text-sky-400' :
                  scores.overall >= 50 ? 'text-amber-400' :
                  'text-rose-400'
                }`}>
                  {scores.overall}
                </div>
                <p className="text-sm text-white/50">Overall Score</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="glass-card p-4 text-center bg-white/5">
                <p className="text-xl font-bold text-white font-mono">${selectedCustomer.totalPremium.toLocaleString()}</p>
                <p className="text-xs text-white/50">Total Premium</p>
              </div>
              <div className="glass-card p-4 text-center bg-white/5">
                <p className="text-xl font-bold text-white font-mono">{selectedCustomer.policyCount}</p>
                <p className="text-xs text-white/50">Policies</p>
              </div>
              <div className="glass-card p-4 text-center bg-white/5">
                <p className="text-xl font-bold text-white font-mono">{selectedCustomer.tenure} yr</p>
                <p className="text-xs text-white/50">Tenure</p>
              </div>
              <div className="glass-card p-4 text-center bg-white/5">
                <p className="text-xl font-bold text-white font-mono">{selectedCustomer.claimCount}</p>
                <p className="text-xs text-white/50">Claims</p>
              </div>
              <div className={`glass-card p-4 text-center ${selectedCustomer.ezpay ? 'bg-sky-500/10 border-sky-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                <p className={`text-xl font-bold ${selectedCustomer.ezpay ? 'text-sky-400' : 'text-rose-400'}`}>
                  {selectedCustomer.ezpay ? <CheckCircle className="w-6 h-6 mx-auto" /> : <XCircle className="w-6 h-6 mx-auto" />}
                </p>
                <p className="text-xs text-white/50">EZPay</p>
              </div>
            </div>

            {/* LTV Analysis */}
            {customerLTV && (
              <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
                <h4 className="text-sm font-semibold text-purple-300 mb-4 flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Customer Value Analysis
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-purple-400 font-mono">${customerLTV.annual.toLocaleString()}</p>
                    <p className="text-xs text-purple-300/70">Annual Commission</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-purple-400 font-mono">${Math.round(customerLTV.projected).toLocaleString()}</p>
                    <p className="text-xs text-purple-300/70">Projected 10yr LTV</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-sky-400 font-mono">${Math.round(customerLTV.withOpportunities).toLocaleString()}</p>
                    <p className="text-xs text-sky-300/70">Potential 10yr LTV</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Scores */}
          <motion.div variants={itemVariants} className="glass-card-elevated p-6">
            <h4 className="font-semibold text-white mb-6 flex items-center">
              <Star className="w-5 h-5 mr-2 text-amber-400" />
              Customer Scores
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <ScoreGauge label="Retention" score={scores.retention} color="#10B981" description="Likelihood to stay" />
              <ScoreGauge label="Growth" score={scores.growth} color="#8B5CF6" description="Upsell potential" />
              <ScoreGauge label="Referral" score={scores.referral} color="#EC4899" description="Advocacy likelihood" />
              <ScoreGauge label="Risk" score={scores.risk} color="#EF4444" description="Churn probability" />
            </div>

            {/* Score Insights */}
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              {scores.retention >= 70 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
                  <Shield className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-sky-300">Strong retention profile</span>
                    <p className="text-xs text-sky-200/70 mt-0.5">Focus on growth and referrals</p>
                  </div>
                </div>
              )}
              {scores.growth >= 60 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <TrendingUp className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-purple-300">High growth potential</span>
                    <p className="text-xs text-purple-200/70 mt-0.5">Missing products they likely need</p>
                  </div>
                </div>
              )}
              {scores.referral >= 70 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
                  <Heart className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-pink-300">Ideal referral candidate</span>
                    <p className="text-xs text-pink-200/70 mt-0.5">Ask for introductions</p>
                  </div>
                </div>
              )}
              {scores.risk >= 60 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-rose-300">Elevated churn risk</span>
                    <p className="text-xs text-rose-200/70 mt-0.5">Take immediate action</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Products */}
          <motion.div variants={itemVariants} className="glass-card-elevated p-6">
            <h4 className="font-semibold text-white mb-4">Current Products</h4>
            <div className="flex flex-wrap gap-2">
              {selectedCustomer.products.map((product, i) => (
                <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm bg-white/10 text-white border border-white/10">
                  {product.toLowerCase().includes('auto') && <Car className="w-4 h-4 mr-2 text-blue-400" />}
                  {product.toLowerCase().includes('home') && <Home className="w-4 h-4 mr-2 text-sky-400" />}
                  {product.toLowerCase().includes('umbrella') && <Umbrella className="w-4 h-4 mr-2 text-cyan-400" />}
                  {product}
                </span>
              ))}
            </div>

            {scores.growth >= 40 && (
              <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm font-medium text-amber-300 mb-2">Missing Products:</p>
                <div className="flex flex-wrap gap-2">
                  {!selectedCustomer.products.some(p => p.toLowerCase().includes('auto')) && (
                    <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-300 rounded">Auto</span>
                  )}
                  {!selectedCustomer.products.some(p => p.toLowerCase().includes('home')) &&
                   !selectedCustomer.products.some(p => p.toLowerCase().includes('renter')) && (
                    <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-300 rounded">Home/Renters</span>
                  )}
                  {!selectedCustomer.products.some(p => p.toLowerCase().includes('umbrella')) && (
                    <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-300 rounded">Umbrella</span>
                  )}
                  {!selectedCustomer.products.some(p => p.toLowerCase().includes('life')) && (
                    <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-300 rounded">Life</span>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className={`flex items-center ${selectedCustomer.ezpay ? 'text-sky-400' : 'text-rose-400'}`}>
                <Zap className="w-4 h-4 mr-1" />
                {selectedCustomer.ezpay ? 'EZPay Active' : 'No EZPay - HIGH PRIORITY'}
              </span>
              {selectedCustomer.maritalStatus && (
                <span className="text-white/60">{selectedCustomer.maritalStatus}</span>
              )}
            </div>
          </motion.div>

          {/* Opportunities */}
          <motion.div variants={itemVariants} className="glass-card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-semibold text-white flex items-center">
                <Target className="w-5 h-5 mr-2 text-purple-400" />
                Action Items & Opportunities
              </h4>
              <span className="text-sm text-white/50">
                {opportunities.filter(o => o.priority === 'high').length} high priority
              </span>
            </div>

            {opportunities.length > 0 ? (
              <div className="space-y-4">
                {opportunities.map((opp, i) => (
                  <OpportunityCard
                    key={i}
                    opportunity={opp}
                    isExpanded={expandedOpportunity === i}
                    onToggle={() => setExpandedOpportunity(expandedOpportunity === i ? null : i)}
                  />
                ))}

                <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium text-purple-300">Total Potential Premium</span>
                      <p className="text-xs text-purple-200/70">Estimated annual increase if all opportunities converted</p>
                    </div>
                    <span className="text-2xl font-bold text-purple-400 font-mono">
                      ${opportunities.reduce((sum, o) => sum + o.potentialPremium, 0).toLocaleString()}/yr
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Award className="w-12 h-12 mx-auto mb-3 text-white/20" />
                <p className="font-medium text-white/60">This customer has all recommended products.</p>
                <p className="text-sm text-white/40 mt-1">Focus on retention and referrals.</p>
              </div>
            )}
          </motion.div>

          {/* Cross-Sell Renewal Opportunities */}
          {crossSellOpps.length > 0 && (
            <motion.div variants={itemVariants} className="glass-card-elevated p-6 border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-rose-500/5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-white flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-amber-400" />
                  Upcoming Renewal Opportunities
                </h4>
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm font-medium">
                  {crossSellOpps.length} found
                </span>
              </div>

              <div className="space-y-3">
                {crossSellOpps.map((opp, i) => {
                  const tierColors = TIER_COLORS[opp.priorityTier as keyof typeof TIER_COLORS] || TIER_COLORS.LOW;
                  const isUrgent = opp.daysUntilRenewal <= 7;
                  const isPastDue = opp.daysUntilRenewal < 0;

                  return (
                    <div key={i} className={`p-4 rounded-xl border ${tierColors.border} ${tierColors.bg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${tierColors.bg} ${tierColors.text}`}>
                            {opp.priorityTier}
                          </span>
                          <span className="font-medium text-white">{opp.recommendedProduct}</span>
                          <span className="text-white/50">→</span>
                          <span className="text-sky-400 font-mono">${opp.potentialPremiumAdd.toLocaleString()}/yr</span>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${isPastDue ? 'text-rose-400' : isUrgent ? 'text-amber-400' : 'text-white/80'}`}>
                            {opp.renewalDate}
                          </div>
                          <div className={`text-xs ${isPastDue ? 'text-rose-400' : isUrgent ? 'text-amber-300' : 'text-white/50'}`}>
                            {isPastDue ? `${Math.abs(opp.daysUntilRenewal)} days ago` :
                             opp.daysUntilRenewal === 0 ? '🔥 TODAY' :
                             opp.daysUntilRenewal === 1 ? 'Tomorrow' :
                             `${opp.daysUntilRenewal} days`}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1">
                        <p className="text-sm text-white/70">{opp.talkingPoint1}</p>
                        {opp.talkingPoint2 && <p className="text-sm text-white/60">{opp.talkingPoint2}</p>}
                      </div>

                      {opp.balanceDue > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-rose-400 text-sm">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Balance due: ${opp.balanceDue.toFixed(2)} - address first</span>
                        </div>
                      )}

                      <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
                        <span>Conversion: {opp.expectedConversionPct}%</span>
                        <span>•</span>
                        <span>Segment: {opp.segment.split(':')[1]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="glass-card-elevated p-6">
            <h4 className="font-semibold text-white mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-amber-400" />
              Quick Actions
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <a
                href={`tel:${selectedCustomer.phone}`}
                className="flex flex-col items-center p-4 glass-card bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/20 transition-colors"
              >
                <Phone className="w-6 h-6 text-sky-400 mb-2" />
                <span className="text-xs text-sky-300">Call Now</span>
              </a>
              <a
                href={`mailto:${selectedCustomer.email}`}
                className="flex flex-col items-center p-4 glass-card bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 transition-colors"
              >
                <Mail className="w-6 h-6 text-blue-400 mb-2" />
                <span className="text-xs text-blue-300">Send Email</span>
              </a>
              <button className="flex flex-col items-center p-4 glass-card bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20 transition-colors">
                <Calendar className="w-6 h-6 text-purple-400 mb-2" />
                <span className="text-xs text-purple-300">Schedule</span>
              </button>
              <button className="flex flex-col items-center p-4 glass-card bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 transition-colors">
                <Users className="w-6 h-6 text-amber-400 mb-2" />
                <span className="text-xs text-amber-300">Add Note</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Empty State */}
      {!selectedCustomer && !searchQuery && (
        <motion.div variants={itemVariants} className="glass-card-elevated p-12 text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-white/20" />
          <h3 className="text-xl font-medium text-white mb-2">Search for a Customer</h3>
          <p className="text-white/50 max-w-md mx-auto mb-6">
            Enter a customer's name, phone number, or ZIP code to view their profile, scores, and personalized sales opportunities.
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-white/50">
              <Target className="w-4 h-4 text-purple-400" />
              Find cross-sell opportunities
            </div>
            <div className="flex items-center gap-2 text-white/50">
              <Shield className="w-4 h-4 text-sky-400" />
              Identify retention risks
            </div>
            <div className="flex items-center gap-2 text-white/50">
              <Heart className="w-4 h-4 text-pink-400" />
              Spot referral candidates
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
