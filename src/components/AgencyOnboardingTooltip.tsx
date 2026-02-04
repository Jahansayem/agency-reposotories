'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, X, Sparkles } from 'lucide-react';

interface AgencyOnboardingTooltipProps {
  /** Whether to show the tooltip */
  show: boolean;
  /** Callback when tooltip is dismissed */
  onDismiss: () => void;
  /** How long to show tooltip before auto-dismiss (ms) */
  autoHideDuration?: number;
}

/**
 * Onboarding tooltip that appears next to the AgencySwitcher
 * after the user dismisses the welcome modal for the first time.
 *
 * Helps users discover the new multi-agency feature.
 */
export function AgencyOnboardingTooltip({
  show,
  onDismiss,
  autoHideDuration = 8000,
}: AgencyOnboardingTooltipProps) {
  useEffect(() => {
    if (!show) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, autoHideDuration);

    return () => clearTimeout(timer);
  }, [show, onDismiss, autoHideDuration]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="absolute left-full ml-3 top-0 z-50 w-64"
        >
          {/* Pointer triangle */}
          <div className="absolute -left-2 top-4 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-blue-500" />

          {/* Tooltip card */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 pt-3 pb-2 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-white/20 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-white font-semibold text-sm">New Feature</h3>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                </div>
              </div>
              <button
                onClick={onDismiss}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Dismiss tooltip"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-4 pb-3">
              <p className="text-white/95 text-sm leading-relaxed">
                Switch between agencies with ease! Click here to manage multiple Allstate agencies from one dashboard.
              </p>
            </div>

            {/* Dismiss button */}
            <div className="px-4 pb-3">
              <button
                onClick={onDismiss}
                className="w-full py-1.5 px-3 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>

          {/* Pulsing glow effect */}
          <div className="absolute inset-0 -z-10 blur-xl opacity-50 animate-pulse">
            <div className="w-full h-full bg-blue-500 rounded-lg" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to manage onboarding tooltip state
 * Coordinates with welcome modal dismissal
 */
export function useAgencyOnboarding() {
  const [showTooltip, setShowTooltip] = useState(false);

  // Check if user has seen the tooltip before
  useEffect(() => {
    const seen = localStorage.getItem('agency-onboarding-seen');
    if (seen === 'true') {
      setShowTooltip(false);
    }
  }, []);

  const triggerOnboarding = () => {
    const seen = localStorage.getItem('agency-onboarding-seen');
    if (seen !== 'true') {
      setShowTooltip(true);
    }
  };

  const dismissTooltip = () => {
    setShowTooltip(false);
    localStorage.setItem('agency-onboarding-seen', 'true');
  };

  return {
    showTooltip,
    triggerOnboarding,
    dismissTooltip,
  };
}
