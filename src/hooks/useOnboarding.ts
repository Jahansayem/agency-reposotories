/**
 * useOnboarding - Hook for managing AI onboarding tutorial state
 *
 * Tracks:
 * - Current step in the tutorial
 * - Completed steps
 * - Dismissed/skipped state
 * - Whether to show onboarding
 *
 * Persists state to localStorage
 */

import { useState, useEffect, useCallback } from 'react';

const ONBOARDING_STORAGE_KEY = 'ai_onboarding_state';

export interface OnboardingState {
  currentStep: number;
  completedSteps: number[];
  dismissed: boolean;
  lastShown: string | null;
}

const DEFAULT_STATE: OnboardingState = {
  currentStep: 0,
  completedSteps: [],
  dismissed: false,
  lastShown: null,
};

const TOTAL_STEPS = 6; // Total number of onboarding steps

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(() => {
    if (typeof window === 'undefined') return DEFAULT_STATE;

    try {
      const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_STATE, ...parsed };
      }
    } catch {
      // If parsing fails, use default state
    }
    return DEFAULT_STATE;
  });

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Silently fail if localStorage is not available
    }
  }, [state]);

  // Determine if we should show onboarding
  const shouldShowOnboarding = useCallback(() => {
    if (state.dismissed) return false;
    if (state.completedSteps.length === TOTAL_STEPS) return false;

    // Show on first visit (lastShown is null)
    if (!state.lastShown) return true;

    // Don't show again if user has seen it recently (within 7 days)
    const lastShownDate = new Date(state.lastShown);
    const daysSinceLastShown = (Date.now() - lastShownDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastShown < 7) return false;

    return true;
  }, [state]);

  // Start the onboarding flow
  const startOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: 0,
      lastShown: new Date().toISOString(),
    }));
  }, []);

  // Go to next step
  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS - 1),
      completedSteps: [...new Set([...prev.completedSteps, prev.currentStep])],
    }));
  }, []);

  // Go to previous step
  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }));
  }, []);

  // Skip to a specific step
  const goToStep = useCallback((step: number) => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(0, Math.min(step, TOTAL_STEPS - 1)),
    }));
  }, []);

  // Mark current step as completed and advance
  const completeStep = useCallback(() => {
    setState(prev => {
      const newCompletedSteps = [...new Set([...prev.completedSteps, prev.currentStep])];
      const nextStep = prev.currentStep + 1;

      return {
        ...prev,
        completedSteps: newCompletedSteps,
        currentStep: nextStep < TOTAL_STEPS ? nextStep : prev.currentStep,
      };
    });
  }, []);

  // Dismiss onboarding (don't show again)
  const dismissOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      dismissed: true,
      lastShown: new Date().toISOString(),
    }));
  }, []);

  // Skip onboarding for now (can show again later)
  const skipOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      lastShown: new Date().toISOString(),
    }));
  }, []);

  // Reset onboarding state (for testing/debugging)
  const resetOnboarding = useCallback(() => {
    setState(DEFAULT_STATE);
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      // Silently fail
    }
  }, []);

  const progress = Math.round((state.completedSteps.length / TOTAL_STEPS) * 100);
  const isComplete = state.completedSteps.length === TOTAL_STEPS;
  const isLastStep = state.currentStep === TOTAL_STEPS - 1;

  return {
    // State
    currentStep: state.currentStep,
    completedSteps: state.completedSteps,
    dismissed: state.dismissed,
    lastShown: state.lastShown,
    progress,
    isComplete,
    isLastStep,
    totalSteps: TOTAL_STEPS,

    // Actions
    shouldShowOnboarding,
    startOnboarding,
    nextStep,
    prevStep,
    goToStep,
    completeStep,
    dismissOnboarding,
    skipOnboarding,
    resetOnboarding,
  };
}
