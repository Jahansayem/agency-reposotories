'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, MessageSquare, Mail, Mic, ListChecks,
  Zap, Calendar, Check, ChevronRight, Info
} from 'lucide-react';
import { useAIPreferences } from '@/hooks/useAIPreferences';
import { useTheme } from '@/contexts/ThemeContext';
import { useState } from 'react';

interface AIPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Feature configuration with descriptions
const FEATURE_CONFIG = {
  smartParse: {
    icon: <MessageSquare className="w-5 h-5" />,
    title: 'Smart Parse',
    description: 'Convert natural language into structured tasks with automatic priority, assignee, and due dates.',
    example: '"Call John about renewal Friday" → Task with details',
  },
  voiceTranscription: {
    icon: <Mic className="w-5 h-5" />,
    title: 'Voice Transcription',
    description: 'Record audio and convert it to text and tasks using AI speech recognition.',
    example: 'Voice memo → Transcribed task',
  },
  emailGeneration: {
    icon: <Mail className="w-5 h-5" />,
    title: 'Email Generation',
    description: 'Generate professional customer-ready emails from completed tasks.',
    example: 'Task completion → Professional email draft',
  },
  taskEnhancement: {
    icon: <Sparkles className="w-5 h-5" />,
    title: 'Task Enhancement',
    description: 'AI improves vague task descriptions to be clearer and more actionable.',
    example: '"thing for john" → "Follow up with John Smith"',
  },
  subtaskBreakdown: {
    icon: <ListChecks className="w-5 h-5" />,
    title: 'Subtask Breakdown',
    description: 'Automatically generate detailed subtasks for complex tasks.',
    example: '"Onboard client" → 10 detailed steps',
  },
  smartDefaults: {
    icon: <Zap className="w-5 h-5" />,
    title: 'Smart Defaults',
    description: 'AI suggests the best priority, assignee, and category for new tasks.',
    example: 'Auto-filled priority and assignee',
  },
  dailyDigest: {
    icon: <Calendar className="w-5 h-5" />,
    title: 'Daily Digest',
    description: 'Receive an AI-generated summary of your tasks and priorities each morning.',
    example: 'Morning briefing with insights',
  },
};

export function AIPreferencesModal({ isOpen, onClose }: AIPreferencesModalProps) {
  const { theme } = useTheme();
  const {
    preferences,
    updatePreference,
    resetPreferences,
    enableAllFeatures,
    disableAllFeatures,
    enabledFeaturesCount,
    totalFeatures,
    allFeaturesEnabled,
  } = useAIPreferences();

  const [activeSection, setActiveSection] = useState<'features' | 'settings'>('features');
  const isDark = theme === 'dark';

  const handleToggleFeature = (feature: keyof typeof FEATURE_CONFIG) => {
    updatePreference(feature, !preferences[feature]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={`
              fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101]
              w-[90vw] max-w-3xl max-h-[85vh] overflow-hidden
              rounded-[28px] shadow-2xl flex flex-col
              ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`
              px-6 py-4 border-b flex-shrink-0
              ${isDark ? 'border-slate-700' : 'border-slate-200'}
            `}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-[#0033A0] to-[#72B5E8]">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      AI Preferences
                    </h2>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {enabledFeaturesCount} of {totalFeatures} features enabled
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}
                  `}
                  aria-label="Close preferences"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Section tabs */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setActiveSection('features')}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${activeSection === 'features'
                      ? 'bg-[#0033A0] text-white'
                      : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                    }
                  `}
                >
                  Features
                </button>
                <button
                  onClick={() => setActiveSection('settings')}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${activeSection === 'settings'
                      ? 'bg-[#0033A0] text-white'
                      : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                    }
                  `}
                >
                  Settings
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeSection === 'features' ? (
                <div className="space-y-4">
                  {/* Quick actions */}
                  <div className="flex gap-3 mb-6">
                    <button
                      onClick={enableAllFeatures}
                      className={`
                        flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}
                      `}
                    >
                      Enable All
                    </button>
                    <button
                      onClick={disableAllFeatures}
                      className={`
                        flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}
                      `}
                    >
                      Disable All
                    </button>
                  </div>

                  {/* Feature list */}
                  {Object.entries(FEATURE_CONFIG).map(([key, config]) => {
                    const featureKey = key as keyof typeof FEATURE_CONFIG;
                    const isEnabled = preferences[featureKey];

                    return (
                      <div
                        key={key}
                        className={`
                          p-4 rounded-xl border transition-all cursor-pointer
                          ${isEnabled
                            ? isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                            : isDark ? 'bg-slate-800/20 border-slate-700/50' : 'bg-slate-50/50 border-slate-200/50'
                          }
                        `}
                        onClick={() => handleToggleFeature(featureKey)}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`
                            p-2 rounded-lg flex-shrink-0
                            ${isEnabled
                              ? 'bg-gradient-to-br from-[#0033A0]/10 to-[#72B5E8]/10 text-[#0033A0]'
                              : isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400'
                            }
                          `}>
                            {config.icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                {config.title}
                              </h3>
                              {/* Toggle */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFeature(featureKey);
                                }}
                                className={`
                                  relative w-11 h-6 rounded-full transition-colors flex-shrink-0
                                  ${isEnabled ? 'bg-[#0033A0]' : isDark ? 'bg-slate-700' : 'bg-slate-300'}
                                `}
                                role="switch"
                                aria-checked={isEnabled}
                                aria-label={`Toggle ${config.title}`}
                              >
                                <motion.div
                                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                                  animate={{ left: isEnabled ? '24px' : '4px' }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                              </button>
                            </div>
                            <p className={`text-sm mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              {config.description}
                            </p>
                            <div className={`
                              flex items-center gap-2 text-xs px-2 py-1 rounded-md w-fit
                              ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-100 text-slate-500'}
                            `}>
                              <Info className="w-3 h-3" />
                              {config.example}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Email Tone */}
                  <div>
                    <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      Email Tone
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['formal', 'friendly', 'brief'] as const).map((tone) => (
                        <button
                          key={tone}
                          onClick={() => updatePreference('emailTone', tone)}
                          className={`
                            px-4 py-3 rounded-xl text-sm font-medium transition-all
                            ${preferences.emailTone === tone
                              ? 'bg-[#0033A0] text-white shadow-lg shadow-[#0033A0]/20'
                              : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }
                          `}
                        >
                          {tone.charAt(0).toUpperCase() + tone.slice(1)}
                        </button>
                      ))}
                    </div>
                    <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {preferences.emailTone === 'formal' && 'Professional and detailed emails'}
                      {preferences.emailTone === 'friendly' && 'Warm and conversational emails'}
                      {preferences.emailTone === 'brief' && 'Short and concise emails'}
                    </p>
                  </div>

                  {/* Suggestion Frequency */}
                  <div>
                    <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      AI Suggestions Frequency
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['always', 'sometimes', 'never'] as const).map((freq) => (
                        <button
                          key={freq}
                          onClick={() => updatePreference('suggestionFrequency', freq)}
                          className={`
                            px-4 py-3 rounded-xl text-sm font-medium transition-all
                            ${preferences.suggestionFrequency === freq
                              ? 'bg-[#0033A0] text-white shadow-lg shadow-[#0033A0]/20'
                              : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }
                          `}
                        >
                          {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </button>
                      ))}
                    </div>
                    <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {preferences.suggestionFrequency === 'always' && 'Show AI suggestions for every task'}
                      {preferences.suggestionFrequency === 'sometimes' && 'Show AI suggestions occasionally'}
                      {preferences.suggestionFrequency === 'never' && 'Never show AI suggestions automatically'}
                    </p>
                  </div>

                  {/* Auto-enhancement */}
                  <div className={`
                    p-4 rounded-xl border
                    ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}
                  `}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          Auto-Enhance Tasks
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          Automatically improve task descriptions as you type
                        </p>
                      </div>
                      <button
                        onClick={() => updatePreference('autoEnhance', !preferences.autoEnhance)}
                        className={`
                          relative w-11 h-6 rounded-full transition-colors flex-shrink-0
                          ${preferences.autoEnhance ? 'bg-[#0033A0]' : isDark ? 'bg-slate-700' : 'bg-slate-300'}
                        `}
                        role="switch"
                        aria-checked={preferences.autoEnhance}
                        aria-label="Toggle auto-enhance"
                      >
                        <motion.div
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                          animate={{ left: preferences.autoEnhance ? '24px' : '4px' }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Show AI suggestions */}
                  <div className={`
                    p-4 rounded-xl border
                    ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}
                  `}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          Show AI Suggestions
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          Display AI suggestions and recommendations in the UI
                        </p>
                      </div>
                      <button
                        onClick={() => updatePreference('showAISuggestions', !preferences.showAISuggestions)}
                        className={`
                          relative w-11 h-6 rounded-full transition-colors flex-shrink-0
                          ${preferences.showAISuggestions ? 'bg-[#0033A0]' : isDark ? 'bg-slate-700' : 'bg-slate-300'}
                        `}
                        role="switch"
                        aria-checked={preferences.showAISuggestions}
                        aria-label="Toggle AI suggestions"
                      >
                        <motion.div
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                          animate={{ left: preferences.showAISuggestions ? '24px' : '4px' }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`
              px-6 py-4 border-t flex items-center justify-between flex-shrink-0
              ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}
            `}>
              <button
                onClick={resetPreferences}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'}
                `}
              >
                Reset to Defaults
              </button>

              <button
                onClick={onClose}
                className="
                  px-5 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-lg
                  hover:bg-[#002878] transition-all shadow-lg shadow-[#0033A0]/20
                  flex items-center gap-2
                "
              >
                <Check className="w-4 h-4" />
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
