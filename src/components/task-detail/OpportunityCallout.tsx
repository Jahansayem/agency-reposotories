'use client';
import { useState, useCallback } from 'react';
import { Flame, Zap, TrendingUp, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Opportunity {
  id: string;
  priorityTier: string;
  recommendedProduct: string;
  potentialPremiumAdd: number;
  talkingPoint1: string;
  talkingPoint2: string;
  talkingPoint3: string;
  currentProducts: string;
  tenureYears: number;
  currentPremium: number;
  daysUntilRenewal: number;
}

interface OpportunityCalloutProps {
  opportunity: Opportunity;
  customerName: string;
  taskText: string;
}

const TIER_CONFIG = {
  HOT:    { icon: Flame,      label: 'HOT opportunity',  headerClass: 'border-red-500/30 bg-red-500/5' },
  HIGH:   { icon: Zap,        label: 'HIGH opportunity', headerClass: 'border-orange-500/30 bg-orange-500/5' },
  MEDIUM: { icon: TrendingUp, label: 'Opportunity',      headerClass: 'border-yellow-500/30 bg-yellow-500/5' },
  LOW:    { icon: TrendingUp, label: 'Opportunity',      headerClass: 'border-blue-500/30 bg-blue-500/5' },
} as const;

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function OpportunityCallout({ opportunity, customerName, taskText }: OpportunityCalloutProps) {
  const [expanded, setExpanded] = useState(false);
  const [coachingState, setCoachingState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [coaching, setCoaching] = useState<string | null>(null);

  const tierKey = opportunity.priorityTier as keyof typeof TIER_CONFIG;
  const { icon: Icon, label, headerClass } = TIER_CONFIG[tierKey] ?? TIER_CONFIG.MEDIUM;

  const getCoaching = useCallback(async () => {
    if (coachingState !== 'idle') return;
    setCoachingState('loading');
    try {
      const res = await fetch('/api/ai/opportunity-coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskText,
          customerName,
          recommendedProduct: opportunity.recommendedProduct,
          currentProducts: opportunity.currentProducts,
          tenureYears: opportunity.tenureYears,
          currentPremium: opportunity.currentPremium,
          potentialPremiumAdd: opportunity.potentialPremiumAdd,
          talkingPoint1: opportunity.talkingPoint1,
          talkingPoint2: opportunity.talkingPoint2,
        }),
      });
      const data = await res.json();
      if (data.coaching) {
        setCoaching(data.coaching);
        setCoachingState('ready');
      } else {
        setCoachingState('error');
      }
    } catch {
      setCoachingState('error');
    }
  }, [coachingState, taskText, customerName, opportunity]);

  return (
    <div className={`rounded-xl border p-3 ${headerClass} mb-3`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 flex-shrink-0 text-[var(--text-muted)]" aria-hidden />
          <span className="text-xs font-semibold text-[var(--foreground)]">{label}</span>
          <span className="text-xs text-[var(--text-muted)] truncate">
            {opportunity.recommendedProduct}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold text-green-400">
            +{formatCurrency(opportunity.potentialPremiumAdd)}/yr
          </span>
          {opportunity.daysUntilRenewal <= 30 && (
            <span className="text-[10px] text-[var(--text-muted)] bg-[var(--surface-2)] rounded px-1.5 py-0.5">
              {opportunity.daysUntilRenewal}d renewal
            </span>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-0.5 rounded hover:bg-white/10 text-[var(--text-muted)]"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-2">
              {/* Talking points */}
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">
                  Talking points
                </p>
                <ul className="space-y-1">
                  {[opportunity.talkingPoint1, opportunity.talkingPoint2].filter(Boolean).map((tp, i) => (
                    <li key={i} className="text-xs text-[var(--foreground)] flex gap-1.5">
                      <span className="text-[var(--text-muted)] flex-shrink-0">·</span>
                      <span>{tp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Coaching section */}
              <div className="border-t border-[var(--border-subtle)] pt-2">
                {coachingState === 'idle' && (
                  <button
                    onClick={getCoaching}
                    className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Get pre-call coaching
                  </button>
                )}
                {coachingState === 'loading' && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Getting coaching...
                  </div>
                )}
                {coachingState === 'ready' && coaching && (
                  <div className="text-xs text-[var(--foreground)] bg-[var(--surface-2)]/50 rounded-lg p-2.5 leading-relaxed">
                    {coaching}
                  </div>
                )}
                {coachingState === 'error' && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Coaching unavailable — use the talking points above.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
