/**
 * 2026 Organic Growth Plan
 * Strategic roadmap for increasing organic business (referrals, retention, cross-sell)
 * V2.0: Dark mode compliant, polished animations, professional Executive Intelligence theme
 */

import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  Target,
  Heart,
  Zap,
  CheckCircle2,
  ArrowRight,
  DollarSign,
  Calendar,
  Sparkles
} from 'lucide-react';

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
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

const cardHoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

export default function OrganicGrowthPlan2026() {
  return (
    <motion.div
      className="max-w-7xl mx-auto space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600/20 via-sky-700/10 to-teal-600/10 p-8 sm:p-12 border border-sky-500/20"
      >
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full text-sm font-medium mb-4 backdrop-blur-sm">
            <Calendar className="w-4 h-4" />
            2026 Strategic Plan
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Organic Growth Plan
          </h1>
          <p className="text-xl text-slate-300 mb-6 max-w-2xl leading-relaxed">
            Build sustainable, profitable growth through referrals, retention, and cross-sell -
            reducing dependency on expensive paid leads.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-slate-200">
              <CheckCircle2 className="w-5 h-5 text-teal-400" />
              <span className="font-medium">Lower CAC</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <CheckCircle2 className="w-5 h-5 text-teal-400" />
              <span className="font-medium">Higher Retention</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <CheckCircle2 className="w-5 h-5 text-teal-400" />
              <span className="font-medium">Better LTV</span>
            </div>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl"></div>
      </motion.div>

      {/* Three Pillars */}
      <motion.div
        variants={containerVariants}
        className="grid md:grid-cols-3 gap-6"
      >
        {/* Pillar 1: Referrals */}
        <motion.div
          variants={itemVariants}
          initial="rest"
          whileHover="hover"
          className="card-hover p-6 bg-slate-900/70 border border-slate-800/50 rounded-xl backdrop-blur-sm"
        >
          <motion.div variants={cardHoverVariants}>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-4">
              <Heart className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Pillar 1: Referrals</h3>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
              Turn happy customers into your best sales team
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">Implement referral incentive program</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">Automate ask at renewal + life events</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">Track & reward top referrers</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">Target 15% of new business from referrals</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">2026 Goal</span>
                <span className="text-lg font-bold text-blue-400 font-data">12 autos/month</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Pillar 2: Retention */}
        <motion.div
          variants={itemVariants}
          initial="rest"
          whileHover="hover"
          className="card-hover p-6 bg-slate-900/70 border border-slate-800/50 rounded-xl backdrop-blur-sm"
        >
          <motion.div variants={cardHoverVariants}>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500/20 to-teal-600/10 border border-teal-500/20 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-teal-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Pillar 2: Retention</h3>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
              Keep more customers, grow more value
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">Proactive renewal outreach (90-day)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">Quarterly check-ins for VIP customers</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">Win-back campaigns for lapsed</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">Target 85%+ retention rate</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Impact</span>
                <span className="text-lg font-bold text-teal-400 font-data">+$180K/year</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Pillar 3: Cross-Sell */}
        <motion.div
          variants={itemVariants}
          initial="rest"
          whileHover="hover"
          className="card-hover p-6 bg-slate-900/70 border border-slate-800/50 rounded-xl backdrop-blur-sm"
        >
          <motion.div variants={cardHoverVariants}>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20 flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Pillar 3: Cross-Sell</h3>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
              Maximize value per customer relationship
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">AI-powered cross-sell targeting</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">Life events trigger (marriage, home purchase)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">Bundle discount communication</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">Target 1.8+ policies per customer</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Opportunity</span>
                <span className="text-lg font-bold text-purple-400 font-data">327 customers</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* 12-Month Roadmap */}
      <motion.div
        variants={itemVariants}
        className="bg-slate-900/70 border border-slate-800/50 rounded-xl p-6 sm:p-8 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">12-Month Roadmap</h2>
            <p className="text-slate-400 text-sm">Quarterly milestones for 2026</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Q1 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="border border-blue-500/20 rounded-lg p-5 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-blue-400 bg-blue-500/20 px-2 py-1 rounded border border-blue-500/30">Q1 2026</span>
              <span className="text-xs text-slate-500">Jan-Mar</span>
            </div>
            <h4 className="font-semibold text-white mb-2">Foundation</h4>
            <ul className="space-y-1.5 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span>Launch V7.0 cross-sell outreach (DONE ✓)</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span>Segment customer base by opportunity</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span>Design referral incentive program</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span>Build 90-day renewal outreach system</span>
              </li>
            </ul>
          </motion.div>

          {/* Q2 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="border border-teal-500/20 rounded-lg p-5 bg-gradient-to-br from-teal-500/10 to-transparent backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-teal-400 bg-teal-500/20 px-2 py-1 rounded border border-teal-500/30">Q2 2026</span>
              <span className="text-xs text-slate-500">Apr-Jun</span>
            </div>
            <h4 className="font-semibold text-white mb-2">Activation</h4>
            <ul className="space-y-1.5 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <span>Launch referral program to top 100 customers</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <span>Execute cross-sell on 72 HOT opportunities</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <span>Track retention metrics monthly</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <span>Goal: 3 organic autos/month</span>
              </li>
            </ul>
          </motion.div>

          {/* Q3 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="border border-purple-500/20 rounded-lg p-5 bg-gradient-to-br from-purple-500/10 to-transparent backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-purple-400 bg-purple-500/20 px-2 py-1 rounded border border-purple-500/30">Q3 2026</span>
              <span className="text-xs text-slate-500">Jul-Sep</span>
            </div>
            <h4 className="font-semibold text-white mb-2">Scale</h4>
            <ul className="space-y-1.5 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <span>Expand referral program agency-wide</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <span>Automate cross-sell triggers (life events)</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <span>Launch VIP quarterly check-in program</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <span>Goal: 6 organic autos/month</span>
              </li>
            </ul>
          </motion.div>

          {/* Q4 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="border border-orange-500/20 rounded-lg p-5 bg-gradient-to-br from-orange-500/10 to-transparent backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-orange-400 bg-orange-500/20 px-2 py-1 rounded border border-orange-500/30">Q4 2026</span>
              <span className="text-xs text-slate-500">Oct-Dec</span>
            </div>
            <h4 className="font-semibold text-white mb-2">Optimize</h4>
            <ul className="space-y-1.5 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                <span>Analyze & optimize best-performing channels</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                <span>Win-back campaigns for lapsed customers</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                <span>Measure full-year ROI vs paid leads</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                <span>Goal: 12 organic autos/month sustained</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </motion.div>

      {/* Success Metrics */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-800 rounded-xl p-6 sm:p-8 border border-slate-700/50"
      >
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">2026 Success Metrics</h2>
            <p className="text-slate-400 text-sm">What we're tracking to measure success</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          <motion.div
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50 hover:border-blue-500/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-slate-400">Organic Autos</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1 font-data">12/month</div>
            <div className="text-xs text-slate-500">vs 0 currently</div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50 hover:border-teal-500/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-teal-400" />
              <span className="text-sm font-medium text-slate-400">Retention Rate</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1 font-data">85%+</div>
            <div className="text-xs text-slate-500">from 73% baseline</div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50 hover:border-purple-500/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium text-slate-400">Policies/Customer</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1 font-data">1.8+</div>
            <div className="text-xs text-slate-500">from 1.63 currently</div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50 hover:border-amber-500/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-medium text-slate-400">Organic Revenue</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1 font-data">$220K</div>
            <div className="text-xs text-slate-500">annual new business</div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg relative z-10"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-white mb-1">Why This Matters</h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                At $55/lead for paid acquisition, 12 organic autos/month saves <strong className="text-white font-semibold">$7,920/month</strong> in
                lead costs while delivering higher quality, more profitable customers with better retention.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Decorative background gradient */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
      </motion.div>

      {/* Next Steps CTA */}
      <motion.div
        variants={itemVariants}
        whileHover={{ scale: 1.01 }}
        className="relative overflow-hidden bg-gradient-to-r from-sky-600/90 to-teal-600/90 rounded-xl p-6 sm:p-8 text-center border border-sky-500/30 backdrop-blur-sm cursor-pointer group"
      >
        <div className="relative z-10">
          <h3 className="text-2xl font-bold text-white mb-3">Ready to Get Started?</h3>
          <p className="text-sky-100 mb-6 max-w-2xl mx-auto leading-relaxed">
            Start with the Cross-Sell Dashboard to target your 72 HOT opportunities -
            these are customers whose renewals are coming up and need additional coverage now.
          </p>
          <a
            href="#crosssell"
            onClick={(e) => {
              e.preventDefault();
              // Trigger tab change to cross-sell
              const event = new CustomEvent('changeTab', { detail: 'crosssell' });
              window.dispatchEvent(event);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-sky-700 rounded-lg font-semibold hover:bg-sky-50 transition-all shadow-lg hover:shadow-xl group-hover:scale-105"
          >
            Go to Cross-Sell Dashboard
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      </motion.div>
    </motion.div>
  );
}
