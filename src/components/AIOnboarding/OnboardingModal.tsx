'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, Sparkles, MessageSquare,
  Mail, Mic, ListChecks, Zap, Check
} from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useTheme } from '@/contexts/ThemeContext';

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  example?: string;
  ctaText?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    icon: <Sparkles className="w-12 h-12" />,
    title: 'Welcome to AI-Powered Task Management',
    description: 'Let us show you how our AI features can save you hours of work and help you stay organized effortlessly.',
    ctaText: 'Get Started',
  },
  {
    icon: <MessageSquare className="w-12 h-12" />,
    title: 'Smart Parse - Natural Language Tasks',
    description: 'Just type naturally! AI understands your intent and creates tasks with the right priority, assignee, and due date automatically.',
    example: '"Call John about his policy renewal by Friday" → Task with high priority, assigned to you, due Friday',
  },
  {
    icon: <Mic className="w-12 h-12" />,
    title: 'Voice Transcription',
    description: 'Record voicemails, meetings, or quick notes. AI transcribes and converts them into actionable tasks instantly.',
    example: 'Voice recording → Transcribed text → Organized tasks with subtasks',
  },
  {
    icon: <ListChecks className="w-12 h-12" />,
    title: 'Automatic Subtask Breakdown',
    description: 'Complex tasks? AI analyzes your task and generates detailed subtasks with time estimates, so you know exactly what to do.',
    example: '"Onboard new client" → 10 detailed subtasks: collect documents, assess coverage, prepare quote, etc.',
  },
  {
    icon: <Mail className="w-12 h-12" />,
    title: 'Professional Email Generation',
    description: 'Generate customer-ready emails from your completed tasks. AI writes in your agency\'s professional tone with all the right details.',
    example: 'Task completion + notes → Professional email with policy details, next steps, and courteous tone',
  },
  {
    icon: <Zap className="w-12 h-12" />,
    title: 'Smart Defaults & Enhancement',
    description: 'AI suggests the best priority, assignee, and category for every task. It even enhances unclear tasks to be more actionable.',
    example: '"thing for john" → "Follow up with John Smith regarding policy renewal" with smart defaults',
    ctaText: 'Start Using AI',
  },
];

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { theme } = useTheme();
  const {
    currentStep,
    totalSteps,
    progress,
    isLastStep,
    nextStep,
    prevStep,
    completeStep,
    dismissOnboarding,
    skipOnboarding,
  } = useOnboarding();

  const isDark = theme === 'dark';
  const step = ONBOARDING_STEPS[currentStep];

  const handleNext = () => {
    if (isLastStep) {
      completeStep();
      onClose();
    } else {
      nextStep();
    }
  };

  const handleSkip = () => {
    skipOnboarding();
    onClose();
  };

  const handleDismiss = () => {
    dismissOnboarding();
    onClose();
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
            onClick={handleSkip}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={`
              fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101]
              w-[90vw] max-w-2xl max-h-[85vh] overflow-hidden
              rounded-[28px] shadow-2xl
              ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`
              relative px-6 py-4 border-b
              ${isDark ? 'border-slate-700' : 'border-slate-200'}
            `}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-[#0033A0] to-[#72B5E8]">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      AI Feature Tour
                    </h2>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Step {currentStep + 1} of {totalSteps}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSkip}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}
                  `}
                  aria-label="Skip tour"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress bar */}
              <div className={`
                mt-4 h-1.5 rounded-full overflow-hidden
                ${isDark ? 'bg-slate-800' : 'bg-slate-100'}
              `}>
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#0033A0] to-[#72B5E8]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Content */}
            <div className="p-8 min-h-[400px] flex flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex flex-col"
                >
                  {/* Icon */}
                  <div className={`
                    w-20 h-20 rounded-[var(--radius-2xl)] mb-6
                    flex items-center justify-center
                    bg-gradient-to-br from-[#0033A0]/10 to-[#72B5E8]/10
                    ${isDark ? 'text-[#72B5E8]' : 'text-[#0033A0]'}
                  `}>
                    {step.icon}
                  </div>

                  {/* Title */}
                  <h3 className={`
                    text-2xl font-bold mb-4
                    ${isDark ? 'text-white' : 'text-slate-800'}
                  `}>
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className={`
                    text-base leading-relaxed mb-6
                    ${isDark ? 'text-slate-300' : 'text-slate-600'}
                  `}>
                    {step.description}
                  </p>

                  {/* Example */}
                  {step.example && (
                    <div className={`
                      mt-auto p-4 rounded-xl border
                      ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}
                    `}>
                      <div className="flex items-start gap-3">
                        <div className={`
                          mt-0.5 p-1.5 rounded-lg
                          ${isDark ? 'bg-slate-700' : 'bg-slate-200'}
                        `}>
                          <Zap className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Example:
                          </p>
                          <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            {step.example}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className={`
              px-6 py-4 border-t flex items-center justify-between
              ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}
            `}>
              <div className="flex items-center gap-2">
                {/* Step indicators */}
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div
                    key={i}
                    className={`
                      w-2 h-2 rounded-full transition-all
                      ${i === currentStep
                        ? 'w-6 bg-[#0033A0]'
                        : i < currentStep
                        ? 'bg-[#0033A0]/50'
                        : isDark ? 'bg-slate-700' : 'bg-slate-300'
                      }
                    `}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                {/* Don't show again */}
                {currentStep === 0 && (
                  <button
                    onClick={handleDismiss}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'}
                    `}
                  >
                    Don't show again
                  </button>
                )}

                {/* Previous */}
                {currentStep > 0 && (
                  <button
                    onClick={prevStep}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                      ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'}
                    `}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                )}

                {/* Skip / Next */}
                <button
                  onClick={handleNext}
                  className="
                    px-5 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-lg
                    hover:bg-[#002878] transition-all shadow-lg shadow-[#0033A0]/20
                    flex items-center gap-2
                  "
                >
                  {isLastStep ? (
                    <>
                      <Check className="w-4 h-4" />
                      {step.ctaText || 'Finish'}
                    </>
                  ) : (
                    <>
                      {step.ctaText || 'Next'}
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
