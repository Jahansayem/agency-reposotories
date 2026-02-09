'use client';

/**
 * Today's Opportunities Panel
 *
 * Displays TODAY's top priority cross-sell opportunities with:
 * - Auto-filtered by current date (daysUntilRenewal = 0)
 * - One-click calling
 * - Quick contact logging with 8 detailed outcomes for model training
 * - Real-time updates via API
 *
 * Design System: Executive Intelligence Design v3.0 - Premium Dark Theme
 * Matches BookOfBusinessDashboard and CustomerSegmentationDashboard styling
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTodayOpportunities, type ContactRequest, type TodayOpportunity } from '../hooks/useTodayOpportunities';
import { CONTACT_OUTCOME_CONFIG, type ContactOutcome } from '@/types/allstate-analytics';
import { CustomerDetailPanel } from '@/components/customer/CustomerDetailPanel';
import { useCurrentUser } from '@/contexts/UserContext';
import { logger } from '@/lib/logger';
import {
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Plus,
  ListTodo,
  ThumbsUp,
  ThumbsDown,
  Calendar as CalendarIcon,
  Voicemail,
  PhoneMissed,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  DollarSign,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

// Animation variants matching other analytics components
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

// Icon mapping for contact outcomes
const OUTCOME_ICONS: Record<ContactOutcome, React.ComponentType<{ className?: string }>> = {
  contacted_interested: ThumbsUp,
  contacted_not_interested: ThumbsDown,
  contacted_callback_scheduled: CalendarIcon,
  contacted_wrong_timing: Clock,
  left_voicemail: Voicemail,
  no_answer: PhoneMissed,
  invalid_contact: AlertCircle,
  declined_permanently: XCircle,
};

interface TodayOpportunitiesPanelProps {
  onNavigateToAllOpportunities?: () => void;
  onTaskClick?: (taskId: string) => void;
}

export function TodayOpportunitiesPanel({ onNavigateToAllOpportunities, onTaskClick }: TodayOpportunitiesPanelProps = {}) {
  const currentUser = useCurrentUser();

  const {
    opportunities,
    meta,
    loading,
    error,
    refresh,
    logContactAttempt
  } = useTodayOpportunities(10);

  const [loggingContact, setLoggingContact] = useState<string | null>(null);
  const [creatingTask, setCreatingTask] = useState<string | null>(null);
  const [createdTaskIds, setCreatedTaskIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  // Track which opportunities have the outcome selector expanded
  const [expandedOutcomes, setExpandedOutcomes] = useState<Set<string>>(new Set());
  // Track selected customer for detail panel
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Toggle outcome selector visibility
  const toggleOutcomeSelector = (oppId: string) => {
    setExpandedOutcomes(prev => {
      const next = new Set(prev);
      if (next.has(oppId)) {
        next.delete(oppId);
      } else {
        next.add(oppId);
      }
      return next;
    });
  };

  // Handle contact logging with the new outcome types
  const handleLogContact = async (
    opportunityId: string,
    outcome: ContactOutcome,
    notes?: string
  ) => {
    setLoggingContact(opportunityId);

    try {
      const request: ContactRequest = {
        contactMethod: 'phone',
        outcome,
        notes: notes || `Contact logged via Today panel: ${CONTACT_OUTCOME_CONFIG[outcome].label}`,
      };

      const response = await fetch(`/api/opportunities/${opportunityId}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          contact_method: request.contactMethod,
          contact_outcome: request.outcome,
          notes: request.notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to log contact');
      }

      setToastMessage({ type: 'success', message: `Contact logged: ${CONTACT_OUTCOME_CONFIG[outcome].label}` });
      // Close the outcome selector after logging
      setExpandedOutcomes(prev => {
        const next = new Set(prev);
        next.delete(opportunityId);
        return next;
      });
      // Refresh the list
      refresh();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      logger.error('Failed to log contact', err instanceof Error ? err : new Error(String(err)), {
        component: 'TodayOpportunitiesPanel',
        action: 'logContact',
        opportunityId,
      });
      setToastMessage({ type: 'error', message: 'Failed to log contact. Please try again.' });
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setLoggingContact(null);
    }
  };

  // Map priority tier to task priority
  const mapTierToPriority = (tier: string): string => {
    switch (tier) {
      case 'HOT': return 'urgent';
      case 'HIGH': return 'high';
      case 'MEDIUM': return 'medium';
      default: return 'medium';
    }
  };

  // Handle inline task creation — creates via API then navigates to the new task
  const handleQuickCreateTask = async (opp: TodayOpportunity) => {
    setCreatingTask(opp.id);

    try {
      const response = await fetch('/api/opportunities/create-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: opp.id,
          assignedTo: currentUser.name,
          createdBy: currentUser.name,
          priority: mapTierToPriority(opp.priorityTier),
          customText: `Cross-sell: ${opp.customerName} - ${opp.recommendedProduct}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // Task already exists — navigate to it
          setCreatedTaskIds(prev => new Set(prev).add(opp.id));
          setToastMessage({ type: 'success', message: 'Task already exists — opening it now' });
          if (data.taskId && onTaskClick) {
            onTaskClick(data.taskId);
          }
        } else {
          throw new Error(data.error || 'Failed to create task');
        }
      } else {
        setCreatedTaskIds(prev => new Set(prev).add(opp.id));
        setToastMessage({ type: 'success', message: `Task created for ${opp.customerName}` });
        // Navigate to the newly created task
        if (data.taskId && onTaskClick) {
          onTaskClick(data.taskId);
        }
      }
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      logger.error('Failed to create task', err instanceof Error ? err : new Error(String(err)), {
        component: 'TodayOpportunitiesPanel',
        action: 'createTask',
        opportunityId: opp.id,
      });
      setToastMessage({ type: 'error', message: 'Failed to create task. Please try again.' });
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setCreatingTask(null);
    }
  };

  // Build a mailto: link with a pre-crafted email using opportunity talking points
  const buildEmailLink = (opp: TodayOpportunity): string => {
    const firstName = opp.customerName.split(' ')[0];
    const agentName = currentUser.name || 'Your Allstate Agent';

    const subject = `${firstName}, let's make sure you're fully protected before your renewal`;

    const body = [
      `Hi ${firstName},`,
      ``,
      `I hope this message finds you well! I'm reaching out because your policy is coming up for renewal, and I wanted to make sure you have the best coverage for your needs.`,
      ``,
      `After reviewing your account, I noticed a few things that could really benefit you:`,
      ``,
      `• ${opp.talkingPoint1}`,
      `• ${opp.talkingPoint2}`,
      `• ${opp.talkingPoint3}`,
      ``,
      `You currently have ${opp.currentProducts}, and adding ${opp.recommendedProduct} could give you more comprehensive protection — and in many cases, bundling policies can actually save you money.`,
      ``,
      `I'd love to walk you through your options. Would you have a few minutes this week for a quick call? I'm happy to work around your schedule.`,
      ``,
      `You can reach me directly at this email or give me a call anytime.`,
      ``,
      `Looking forward to hearing from you!`,
      ``,
      `Best regards,`,
      `${agentName}`,
      `Your Local Allstate Agent`,
    ].join('\n');

    return `mailto:${encodeURIComponent(opp.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="glass-card-elevated p-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400"></div>
        <span className="ml-4 text-white/60">Loading today's priorities...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="glass-card p-6 bg-gradient-to-br from-rose-500/20 to-rose-500/5 border border-rose-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-rose-500/20">
            <XCircle className="h-6 w-6 text-rose-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Error Loading Opportunities</h3>
        </div>
        <p className="text-rose-300 mb-4">{error.message}</p>
        <button
          onClick={() => refresh()}
          className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (opportunities.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card-elevated p-8 text-center bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30"
      >
        <div className="p-4 rounded-full bg-emerald-500/20 w-fit mx-auto mb-4">
          <CheckCircle className="h-12 w-12 text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          All Caught Up!
        </h3>
        <p className="text-emerald-300">
          No opportunities renewing today. Great job! 🎉
        </p>
        {meta && meta.urgentCount > 0 && (
          <p className="text-emerald-300/70 mt-2">
            You have {meta.urgentCount} opportunities renewing in the next 7 days.
          </p>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm ${
          toastMessage.type === 'success'
            ? 'bg-emerald-500/90 text-white'
            : 'bg-rose-500/90 text-white'
        }`}>
          {toastMessage.message}
        </div>
      )}

      {/* Hero Header */}
      <motion.div variants={itemVariants} className="relative overflow-hidden">
        <div className="glass-card-elevated p-8 relative">
          {/* Animated background */}
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-rose-500/10 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl animate-pulse delay-1000" />

          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30">
                  <Target className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Today's Top Opportunities</h1>
                  <p className="text-white/60">
                    Policies renewing TODAY - {new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => refresh()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Summary Stats */}
      {meta && (
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
          <div className="glass-card p-4 bg-gradient-to-br from-rose-500/20 to-rose-500/5 border border-rose-500/30 text-center lg:text-left">
            <div className="flex items-center gap-2 justify-center lg:justify-start mb-1">
              <Sparkles className="w-4 h-4 text-rose-400" />
              <span className="text-xs text-white/50">Renewing TODAY</span>
            </div>
            <p className="text-3xl font-bold text-rose-400 font-mono">{meta.todayCount}</p>
          </div>

          <div className="glass-card p-4 bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 text-center lg:text-left">
            <div className="flex items-center gap-2 justify-center lg:justify-start mb-1">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-white/50">Next 7 Days</span>
            </div>
            <p className="text-3xl font-bold text-amber-400 font-mono">{meta.urgentCount}</p>
          </div>

          <div className="glass-card p-4 bg-gradient-to-br from-sky-500/20 to-sky-500/5 border border-sky-500/30 text-center lg:text-left">
            <div className="flex items-center gap-2 justify-center lg:justify-start mb-1">
              <DollarSign className="w-4 h-4 text-sky-400" />
              <span className="text-xs text-white/50">Next 30 Days</span>
            </div>
            <p className="text-3xl font-bold text-sky-400 font-mono">{meta.upcomingCount}</p>
          </div>
        </motion.div>
      )}

      {/* Opportunities List */}
      <div className="space-y-4">
        {opportunities.map((opp, index) => (
          <motion.div
            key={opp.id}
            variants={itemVariants}
            whileHover={{ scale: 1.01 }}
            className="glass-card-elevated p-6 bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-sky-500/30 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <button
                    onClick={() => setSelectedCustomerId(opp.customerInsightId || opp.id)}
                    className="text-xl font-bold text-white hover:text-sky-400 hover:underline transition-colors cursor-pointer text-left flex items-center gap-2 group"
                  >
                    {opp.customerName}
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  {/* Priority Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      opp.priorityTier === 'HOT'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : opp.priorityTier === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}
                  >
                    {opp.priorityTier} - {opp.priorityScore}
                  </span>

                  {/* TODAY Badge */}
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500 text-white animate-pulse">
                    🔥 RENEWS TODAY
                  </span>
                </div>

                <p className="text-white/70 font-medium">
                  {opp.currentProducts} → <span className="text-sky-400">{opp.recommendedProduct}</span>
                </p>

                <p className="text-sm text-white/50 mt-1">
                  {opp.segment}
                </p>
              </div>

              <div className="text-right">
                <div className="text-3xl font-bold text-emerald-400 font-mono">
                  +${opp.potentialPremiumAdd.toLocaleString()}
                </div>
                <div className="text-sm text-white/50">
                  Current: <span className="font-mono">${opp.currentPremium.toLocaleString()}</span>
                </div>
                <div className="text-xs text-white/40 mt-1">
                  {opp.expectedConversionPct}% conversion rate
                </div>
              </div>
            </div>

            {/* Talking Points */}
            <div className="glass-card p-4 mb-4 bg-sky-500/10 border border-sky-500/20">
              <h4 className="font-semibold text-sky-400 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Talking Points
              </h4>
              <ul className="space-y-1 text-sm text-white/70">
                <li>• {opp.talkingPoint1}</li>
                <li>• {opp.talkingPoint2}</li>
                <li>• {opp.talkingPoint3}</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Primary Action: Create Task - Always visible inline */}
              <button
                onClick={() => handleQuickCreateTask(opp)}
                disabled={creatingTask === opp.id}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  createdTaskIds.has(opp.id)
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 cursor-pointer'
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25'
                }`}
              >
                {creatingTask === opp.id ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Creating Task...
                  </>
                ) : createdTaskIds.has(opp.id) ? (
                  <>
                    <ListTodo className="h-5 w-5" />
                    View Task
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    Create Task
                  </>
                )}
              </button>

              {/* Contact Actions Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Call Button */}
                <a
                  href={`tel:${opp.phone}`}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors font-medium"
                >
                  <Phone className="h-5 w-5" />
                  Call {opp.phone}
                </a>

                {/* Email Button — opens pre-crafted email with talking points */}
                <a
                  href={buildEmailLink(opp)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg hover:bg-sky-500/30 transition-colors font-medium"
                >
                  <Mail className="h-5 w-5" />
                  Email
                </a>
              </div>

              {/* Log Contact Outcome Button - Expands to show all options */}
              <div className="glass-card overflow-hidden border border-white/10">
                <button
                  onClick={() => toggleOutcomeSelector(opp.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors font-medium text-white/70"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-white/50" />
                    Log Contact Outcome
                  </span>
                  {expandedOutcomes.has(opp.id) ? (
                    <ChevronUp className="h-5 w-5 text-white/50" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-white/50" />
                  )}
                </button>

                {/* Expanded Outcome Options */}
                {expandedOutcomes.has(opp.id) && (
                  <div className="p-3 bg-white/5 border-t border-white/10">
                    <p className="text-xs text-white/50 mb-3 px-1">
                      Select the outcome of your contact attempt:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(CONTACT_OUTCOME_CONFIG) as ContactOutcome[]).map((outcome) => {
                        const config = CONTACT_OUTCOME_CONFIG[outcome];
                        const Icon = OUTCOME_ICONS[outcome];
                        // Map colors to glass-card compatible colors
                        const colorMap: Record<string, string> = {
                          '#166534': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                          '#991b1b': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
                          '#1e40af': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                          '#92400e': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                          '#7c2d12': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                          '#374151': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
                          '#6b7280': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
                        };
                        const glassStyle = colorMap[config.color] || 'bg-sky-500/20 text-sky-400 border-sky-500/30';
                        return (
                          <button
                            key={outcome}
                            onClick={() => handleLogContact(opp.id, outcome)}
                            disabled={loggingContact === opp.id}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${glassStyle} border`}
                            title={config.description}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{config.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {loggingContact === opp.id && (
                      <div className="mt-3 flex items-center justify-center gap-2 text-sm text-white/50">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Logging contact...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Details (Expandable) */}
            <details className="mt-4 group">
              <summary className="cursor-pointer text-sm text-white/50 hover:text-white font-medium transition-colors">
                View Customer Details
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm glass-card p-4 bg-white/5 border border-white/10">
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-wider">Address</span>
                  <p className="font-medium text-white">{opp.address}, {opp.city} {opp.zipCode}</p>
                </div>
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-wider">Tenure</span>
                  <p className="font-medium text-white font-mono">{opp.tenureYears} years</p>
                </div>
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-wider">Policy Count</span>
                  <p className="font-medium text-white font-mono">{opp.policyCount} policies</p>
                </div>
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-wider">EZ-Pay</span>
                  <p className="font-medium text-white">{opp.ezpayStatus}</p>
                </div>
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-wider">Balance Due</span>
                  <p className="font-medium text-white font-mono">${opp.balanceDue.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-wider">Renewal Status</span>
                  <p className="font-medium text-white">{opp.renewalStatus}</p>
                </div>
              </div>
            </details>
          </motion.div>
        ))}
      </div>

      {/* Footer with View All Button */}
      <motion.div variants={itemVariants} className="space-y-4">
        {/* Stats line */}
        <div className="text-center text-white/50 text-sm">
          Showing {opportunities.length} of {meta?.todayCount} opportunities renewing today
        </div>

        {/* View All Opportunities Button */}
        {onNavigateToAllOpportunities && (
          <div className="pt-4 border-t border-white/10 text-center">
            <button
              onClick={onNavigateToAllOpportunities}
              className="flex items-center gap-2 mx-auto px-6 py-3 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 font-medium transition-all hover:scale-[1.02] border border-sky-500/30"
            >
              <TrendingUp className="w-5 h-5" />
              View All Opportunities
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-white/40 mt-2">
              Browse all {meta?.urgentCount} opportunities in the next 7 days
            </p>
          </div>
        )}
      </motion.div>

      {/* Customer Detail Panel Modal */}
      <AnimatePresence>
        {selectedCustomerId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedCustomerId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--surface-1)] rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-[var(--surface-1)] border-b border-[var(--border)] p-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-[var(--text)]">Customer Details</h2>
                <button
                  onClick={() => setSelectedCustomerId(null)}
                  className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <XCircle className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              </div>
              <div className="p-6">
                <CustomerDetailPanel
                  customerId={selectedCustomerId}
                  currentUser={currentUser.name}
                  onCreateTask={(taskId) => {
                    logger.info('Task created from customer detail panel', {
                      component: 'TodayOpportunitiesPanel',
                      action: 'createTaskFromDetail',
                      taskId,
                      customerId: selectedCustomerId,
                    });
                    setToastMessage({ type: 'success', message: 'Task created successfully' });
                    setTimeout(() => setToastMessage(null), 3000);
                  }}
                  onViewTask={(taskId) => {
                    logger.info('Viewing task from customer detail panel', {
                      component: 'TodayOpportunitiesPanel',
                      action: 'viewTaskFromDetail',
                      taskId,
                      customerId: selectedCustomerId,
                    });
                    if (onTaskClick) {
                      setSelectedCustomerId(null);
                      onTaskClick(taskId);
                    }
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
