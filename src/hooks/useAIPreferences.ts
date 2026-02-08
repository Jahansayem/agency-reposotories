/**
 * useAIPreferences - Hook for managing AI feature preferences
 *
 * Tracks user preferences for AI features:
 * - Enable/disable specific features
 * - Email tone preference
 * - Suggestion frequency
 * - Auto-enhancement
 * - Smart defaults
 * - Daily digest
 *
 * Persists preferences to localStorage
 */

import { useState, useEffect, useCallback } from 'react';

const AI_PREFERENCES_STORAGE_KEY = 'ai_preferences';

export interface AIPreferences {
  // Feature toggles
  smartParse: boolean;
  voiceTranscription: boolean;
  emailGeneration: boolean;
  taskEnhancement: boolean;
  subtaskBreakdown: boolean;
  smartDefaults: boolean;
  dailyDigest: boolean;

  // Email generation settings
  emailTone: 'formal' | 'friendly' | 'brief';

  // Suggestion settings
  suggestionFrequency: 'always' | 'sometimes' | 'never';

  // Enhancement settings
  autoEnhance: boolean; // Automatically enhance tasks on creation
  showAISuggestions: boolean; // Show AI suggestions in UI
}

const DEFAULT_PREFERENCES: AIPreferences = {
  // All features enabled by default
  smartParse: true,
  voiceTranscription: true,
  emailGeneration: true,
  taskEnhancement: true,
  subtaskBreakdown: true,
  smartDefaults: true,
  dailyDigest: true,

  // Friendly tone by default (insurance-friendly)
  emailTone: 'friendly',

  // Show suggestions sometimes (not overwhelming)
  suggestionFrequency: 'sometimes',

  // Auto-enhance disabled by default (user should opt-in)
  autoEnhance: false,
  showAISuggestions: true,
};

export function useAIPreferences() {
  const [preferences, setPreferences] = useState<AIPreferences>(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

    try {
      const stored = localStorage.getItem(AI_PREFERENCES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure new preferences are added
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch {
      // If parsing fails, use default preferences
    }
    return DEFAULT_PREFERENCES;
  });

  // Persist preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(AI_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Silently fail if localStorage is not available
    }
  }, [preferences]);

  // Update a single preference
  const updatePreference = useCallback(<K extends keyof AIPreferences>(
    key: K,
    value: AIPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  // Update multiple preferences at once
  const updatePreferences = useCallback((updates: Partial<AIPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset to default preferences
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(AI_PREFERENCES_STORAGE_KEY);
    } catch {
      // Silently fail
    }
  }, []);

  // Enable all features
  const enableAllFeatures = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      smartParse: true,
      voiceTranscription: true,
      emailGeneration: true,
      taskEnhancement: true,
      subtaskBreakdown: true,
      smartDefaults: true,
      dailyDigest: true,
    }));
  }, []);

  // Disable all features
  const disableAllFeatures = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      smartParse: false,
      voiceTranscription: false,
      emailGeneration: false,
      taskEnhancement: false,
      subtaskBreakdown: false,
      smartDefaults: false,
      dailyDigest: false,
    }));
  }, []);

  // Check if a specific feature is enabled
  const isFeatureEnabled = useCallback((feature: keyof AIPreferences): boolean => {
    return preferences[feature] === true;
  }, [preferences]);

  // Count of enabled features
  const enabledFeaturesCount = [
    preferences.smartParse,
    preferences.voiceTranscription,
    preferences.emailGeneration,
    preferences.taskEnhancement,
    preferences.subtaskBreakdown,
    preferences.smartDefaults,
    preferences.dailyDigest,
  ].filter(Boolean).length;

  const totalFeatures = 7;
  const allFeaturesEnabled = enabledFeaturesCount === totalFeatures;
  const noFeaturesEnabled = enabledFeaturesCount === 0;

  return {
    // State
    preferences,
    enabledFeaturesCount,
    totalFeatures,
    allFeaturesEnabled,
    noFeaturesEnabled,

    // Actions
    updatePreference,
    updatePreferences,
    resetPreferences,
    enableAllFeatures,
    disableAllFeatures,
    isFeatureEnabled,
  };
}
