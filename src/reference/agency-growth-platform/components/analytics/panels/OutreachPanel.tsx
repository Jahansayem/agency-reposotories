/**
 * Outreach Panel Component
 * V8.0: REDESIGNED - Professional dark theme, 10x better UX
 *
 * Features:
 * - Full dark theme compliance with Executive Intelligence Design System v4.0
 * - Professional icon-based interface
 * - Enhanced visual hierarchy and spacing
 * - Smooth animations with Framer Motion
 * - Better mobile responsiveness
 * - Improved copy/action buttons
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  ChevronUp,
  Shield,
  Clock,
  Send,
  Star,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import {
  generateOutreach,
  getRecommendedChannel,
  isOutreachCompliant
} from '../utils/outreachGenerator';
import type { OutreachChannel, GeneratedOutreach, ContactConsent, EnrichedCustomerData } from '../types/outreach';
import customersData from '../data/customers.json';

// Customer data interface matching customers.json
interface CustomerRecord {
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

interface Opportunity {
  customerName: string;
  segment: string;
  priorityTier: string;
  currentProducts: string;
  recommendedProduct: string;
  currentPremium: number;
  potentialPremiumAdd: number;
  daysUntilRenewal: number;
  renewalDate: string;
  balanceDue: number;
  tenureYears: number;
  ezpayStatus: string;
  talkingPoint1: string;
  talkingPoint2: string;
  talkingPoint3: string;
  phone: string;
  email: string;
  city: string;
}

interface OutreachPanelProps {
  opportunity: Opportunity;
  consent?: ContactConsent;
  onClose?: () => void;
}

const CHANNEL_CONFIG = {
  call: {
    icon: Phone,
    label: 'Call Script',
    color: 'blue',
    gradient: 'from-blue-500/20 to-blue-500/5',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    hoverBg: 'hover:bg-blue-500/10'
  },
  email: {
    icon: Mail,
    label: 'Email',
    color: 'sky',
    gradient: 'from-sky-500/20 to-sky-500/5',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
    hoverBg: 'hover:bg-sky-500/10'
  },
  sms: {
    icon: MessageSquare,
    label: 'SMS',
    color: 'purple',
    gradient: 'from-purple-500/20 to-purple-500/5',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    hoverBg: 'hover:bg-purple-500/10'
  },
  mail: {
    icon: FileText,
    label: 'Letter',
    color: 'amber',
    gradient: 'from-amber-500/20 to-amber-500/5',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    hoverBg: 'hover:bg-amber-500/10'
  }
};

// Look up customer data by name
function findCustomerData(customerName: string): CustomerRecord | null {
  const normalizedSearch = customerName.toUpperCase().trim();
  return (customersData as CustomerRecord[]).find(c => {
    const normalizedName = c.name.toUpperCase().trim();
    return normalizedName === normalizedSearch ||
           normalizedName.includes(normalizedSearch) ||
           normalizedSearch.includes(normalizedName);
  }) || null;
}

// Convert CustomerRecord to EnrichedCustomerData
function toEnrichedData(customer: CustomerRecord | null): EnrichedCustomerData | undefined {
  if (!customer) return undefined;
  return {
    totalPremium: customer.totalPremium,
    policyCount: customer.policyCount,
    products: customer.products,
    claimCount: customer.claimCount,
    maritalStatus: customer.maritalStatus,
    gender: customer.gender,
    tenure: customer.tenure
  };
}

export default function OutreachPanel({ opportunity, consent, onClose }: OutreachPanelProps) {
  const recommendedChannel = getRecommendedChannel(opportunity);
  const [selectedChannel, setSelectedChannel] = useState<OutreachChannel>(recommendedChannel);
  const [generatedMessage, setGeneratedMessage] = useState<GeneratedOutreach | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTalkingPoints, setShowTalkingPoints] = useState(false);

  // V7.0: Look up full customer data
  const customerData = useMemo(() => findCustomerData(opportunity.customerName), [opportunity.customerName]);
  const enrichedData = useMemo(() => toEnrichedData(customerData), [customerData]);

  // Calculate customer profile summary for UI
  const customerProfile = useMemo(() => {
    if (!customerData) return null;
    return {
      isVIP: customerData.totalPremium >= 10000,
      isClaimsFree: customerData.claimCount === 0,
      isMarried: customerData.maritalStatus === 'Married',
      isMultiPolicy: customerData.policyCount >= 4,
      vipTier: customerData.totalPremium >= 15000 ? 'platinum' : customerData.totalPremium >= 10000 ? 'gold' : customerData.totalPremium >= 5000 ? 'silver' : null
    };
  }, [customerData]);

  // Check consent compliance
  const complianceCheck = isOutreachCompliant(selectedChannel, consent);

  // Generate message with enriched data
  const handleGenerate = () => {
    const outreach = generateOutreach(selectedChannel, opportunity, enrichedData);
    setGeneratedMessage(outreach);
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (!generatedMessage) return;

    let textToCopy = '';
    if (generatedMessage.subject) {
      textToCopy += `Subject: ${generatedMessage.subject}\n\n`;
    }
    textToCopy += generatedMessage.message;

    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Open email client
  const handleOpenEmail = () => {
    if (!generatedMessage || selectedChannel !== 'email') return;
    const subject = encodeURIComponent(generatedMessage.subject || '');
    const body = encodeURIComponent(generatedMessage.message);
    window.location.href = `mailto:${opportunity.email}?subject=${subject}&body=${body}`;
  };

  const firstName = opportunity.customerName.split(' ')[0];
  const firstNameFormatted = firstName.charAt(0) + firstName.slice(1).toLowerCase();

  const channelConfig = CHANNEL_CONFIG[selectedChannel];
  const ChannelIcon = channelConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-slate-700/50 bg-slate-900/70 backdrop-blur-sm overflow-hidden shadow-xl"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600/90 to-teal-600/90 px-4 py-4 sm:px-6 sm:py-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">AI Outreach Generator</h3>
              <p className="text-sm text-sky-100">
                Hyper-personalized message for {firstNameFormatted}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Close outreach generator"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* V7.0: Customer Profile Badges */}
        {customerProfile && (
          <div className="flex flex-wrap gap-2 mt-4">
            {customerProfile.vipTier === 'platinum' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-yellow-400/30 text-yellow-100 rounded-full border border-yellow-400/20">
                <Star className="w-3.5 h-3.5" />
                Platinum VIP
              </span>
            )}
            {customerProfile.vipTier === 'gold' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-yellow-500/30 text-yellow-100 rounded-full border border-yellow-500/20">
                <Star className="w-3.5 h-3.5" />
                Gold VIP
              </span>
            )}
            {customerProfile.vipTier === 'silver' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-slate-400/30 text-slate-200 rounded-full border border-slate-400/20">
                <Star className="w-3.5 h-3.5" />
                Silver
              </span>
            )}
            {customerProfile.isClaimsFree && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-green-400/30 text-green-100 rounded-full border border-green-400/20">
                <Shield className="w-3.5 h-3.5" />
                Claims-Free
              </span>
            )}
            {customerProfile.isMarried && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-pink-400/30 text-pink-100 rounded-full border border-pink-400/20">
                Married
              </span>
            )}
            {customerProfile.isMultiPolicy && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-blue-400/30 text-blue-100 rounded-full border border-blue-400/20">
                {customerData?.policyCount} Policies
              </span>
            )}
          </div>
        )}
      </div>

      {/* Channel Selection */}
      <div className="px-4 py-4 sm:px-6 border-b border-slate-800/50 bg-slate-800/30">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-slate-300">Select Channel:</span>
          {selectedChannel === recommendedChannel && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-sky-500/20 text-sky-300 rounded-full border border-sky-500/30">
              <Check className="w-3 h-3" />
              Recommended
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(CHANNEL_CONFIG) as OutreachChannel[]).map((channel) => {
            const config = CHANNEL_CONFIG[channel];
            const Icon = config.icon;
            const isSelected = selectedChannel === channel;
            const channelCompliance = isOutreachCompliant(channel, consent);

            return (
              <button
                key={channel}
                onClick={() => {
                  setSelectedChannel(channel);
                  setGeneratedMessage(null);
                }}
                disabled={!channelCompliance.compliant}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isSelected
                    ? `bg-gradient-to-br ${config.gradient} ${config.text} border ${config.border} ring-2 ring-${config.color}-500/30 ring-offset-2 ring-offset-slate-900`
                    : channelCompliance.compliant
                    ? `bg-slate-800/50 border border-slate-700/50 text-slate-400 ${config.hoverBg} hover:border-slate-600/50`
                    : 'bg-slate-800/30 text-slate-600 cursor-not-allowed border border-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{config.label}</span>
                {!channelCompliance.compliant && (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Compliance Warning */}
      <AnimatePresence>
        {!complianceCheck.compliant && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-4 sm:mx-6 mt-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-300">Contact Restricted</p>
                  <p className="text-sm text-rose-400 mt-1">{complianceCheck.reason}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate Button */}
      {!generatedMessage && complianceCheck.compliant && (
        <div className="p-4 sm:p-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerate}
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r ${channelConfig.gradient} ${channelConfig.text} border ${channelConfig.border} rounded-xl font-semibold hover:shadow-lg transition-all`}
          >
            <ChannelIcon className="w-5 h-5" />
            <span>Generate {channelConfig.label}</span>
            <Sparkles className="w-5 h-5" />
          </motion.button>
          <p className="mt-3 text-xs text-center text-slate-400 leading-relaxed">
            {enrichedData ? (
              <>
                Uses <span className="font-medium text-sky-400">{customerData?.policyCount} policies</span>,{' '}
                <span className="font-medium text-green-400">{customerData?.claimCount === 0 ? 'claims-free status' : `${customerData?.claimCount} claims`}</span>,{' '}
                <span className="font-medium text-amber-400">${Math.round(customerData?.totalPremium || 0).toLocaleString()} premium</span>
              </>
            ) : (
              'Creates a personalized, compliant message based on customer profile'
            )}
          </p>
        </div>
      )}

      {/* Generated Message */}
      <AnimatePresence>
        {generatedMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 sm:p-6 space-y-4"
          >
            {/* Subject (for email) */}
            {generatedMessage.subject && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Subject Line
                </label>
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 text-sm text-white">
                  {generatedMessage.subject}
                </div>
              </div>
            )}

            {/* Message Body */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {selectedChannel === 'call' ? 'Call Script' : 'Message'}
                </label>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${
                  generatedMessage.urgency === 'high'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : generatedMessage.urgency === 'medium'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-600/20 text-slate-400 border border-slate-600/30'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {generatedMessage.urgency} priority
                </span>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 text-sm text-slate-200 whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
                {generatedMessage.message}
              </div>
            </div>

            {/* Talking Points */}
            {generatedMessage.talkingPoints && generatedMessage.talkingPoints.length > 0 && (
              <div>
                <button
                  onClick={() => setShowTalkingPoints(!showTalkingPoints)}
                  className="flex items-center gap-2 text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  <span>Talking Points ({generatedMessage.talkingPoints.length})</span>
                  <ChevronUp className={`w-4 h-4 transition-transform ${showTalkingPoints ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showTalkingPoints && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 space-y-2 overflow-hidden"
                    >
                      {generatedMessage.talkingPoints.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold border border-sky-500/30">
                            {idx + 1}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{point}</p>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/50 border border-slate-700/50 text-white rounded-xl font-medium hover:bg-slate-700/50 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-green-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>Copy to Clipboard</span>
                  </>
                )}
              </motion.button>

              {selectedChannel === 'email' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleOpenEmail}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r ${channelConfig.gradient} ${channelConfig.text} border ${channelConfig.border} rounded-xl font-medium hover:shadow-lg transition-all`}
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>Open in Email</span>
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerate}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-xl font-medium hover:bg-slate-700/50 transition-all"
                aria-label="Regenerate message"
              >
                <RotateCcw className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Compliance Notice */}
            {generatedMessage.compliance_notices && (
              <div className="pt-4 border-t border-slate-800/50">
                <p className="text-xs text-slate-500 leading-relaxed">
                  {generatedMessage.compliance_notices}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
