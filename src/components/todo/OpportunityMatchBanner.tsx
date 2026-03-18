'use client';
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Check, UserCheck } from 'lucide-react';
import { useOpportunityMatcher } from '@/hooks/useOpportunityMatcher';
import type { MatchedCustomer } from '@/hooks/useOpportunityMatcher';

interface OpportunityMatchBannerProps {
  taskId: string;
  taskText: string;
  agencyId: string;
  existingCustomerId: string | null;
  onConfirm: (customer: MatchedCustomer) => Promise<void>;
}

const TIER_CONFIG = {
  HOT: { label: '🔥 HOT', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  HIGH: { label: '⚡ HIGH', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  MEDIUM: { label: 'MEDIUM', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  LOW: { label: 'LOW', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
} as const;

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function OpportunityMatchBanner({
  taskId,
  taskText,
  agencyId,
  existingCustomerId,
  onConfirm,
}: OpportunityMatchBannerProps) {
  const { state, customer, opportunity, confirm, dismiss } = useOpportunityMatcher({
    taskId,
    taskText,
    agencyId,
    existingCustomerId,
    onConfirm,
  });

  // Auto-dismiss after 15s
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (state === 'matched') {
      timerRef.current = setTimeout(dismiss, 15000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state, dismiss]);

  const isVisible = state === 'matched' && !!customer && !!opportunity;
  const tierConfig =
    opportunity
      ? (TIER_CONFIG[opportunity.priorityTier as keyof typeof TIER_CONFIG] ?? TIER_CONFIG.MEDIUM)
      : TIER_CONFIG.MEDIUM;

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    dismiss();
  };

  const handleConfirm = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await confirm();
  };

  return (
    <AnimatePresence>
      {isVisible && customer && opportunity && (
        <motion.div
          key="opportunity-match-banner"
          role="alert"
          aria-live="polite"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[600] w-full max-w-md rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${tierConfig.bg}`}
        >
          <div className="flex items-start gap-3">
            <UserCheck
              className="w-5 h-5 mt-0.5 text-[var(--text-muted)] flex-shrink-0"
              aria-hidden
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)] leading-snug">
                Looks like this is for{' '}
                <span className="font-semibold">{customer.name}</span>
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                <span className={`font-semibold ${tierConfig.color}`}>{tierConfig.label}</span>
                {' '}opportunity: {opportunity.recommendedProduct}
                {' · '}
                <span className="text-green-400">
                  +{formatCurrency(opportunity.potentialPremiumAdd)}/yr
                </span>
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded hover:bg-white/10 text-[var(--text-muted)] flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent)]/90 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Link {customer.name.split(' ')[0]}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors"
            >
              Not them
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
