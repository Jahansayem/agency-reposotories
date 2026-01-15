'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  ClipboardList,
  Car,
  UserPlus,
  AlertTriangle,
  CreditCard,
  DollarSign,
  FileText,
  Phone,
  Pin,
  LucideIcon
} from 'lucide-react';
import { QuickTaskTemplate, TaskPattern, INSURANCE_QUICK_TASKS, TaskCategory } from '@/types/todo';

interface QuickTaskButtonsProps {
  onSelectTemplate: (template: QuickTaskTemplate) => void;
  patterns?: TaskPattern[];
  collapsed?: boolean;
}

// Map categories to Lucide icons with colors
const CATEGORY_ICON_CONFIG: Record<TaskCategory | 'other', { icon: LucideIcon; color: string; bgColor: string }> = {
  policy_review: { icon: ClipboardList, color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  vehicle_add: { icon: Car, color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
  new_client: { icon: UserPlus, color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.15)' },
  claim: { icon: AlertTriangle, color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' },
  payment: { icon: CreditCard, color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' },
  quote: { icon: DollarSign, color: '#06B6D4', bgColor: 'rgba(6, 182, 212, 0.15)' },
  documentation: { icon: FileText, color: '#6366F1', bgColor: 'rgba(99, 102, 241, 0.15)' },
  follow_up: { icon: Phone, color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.15)' },
  other: { icon: Pin, color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)' },
};

export function QuickTaskButtons({
  onSelectTemplate,
  patterns = [],
  collapsed: initialCollapsed = false,
}: QuickTaskButtonsProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [showAll, setShowAll] = useState(false);

  // Combine hardcoded insurance tasks with learned patterns
  const allTemplates: QuickTaskTemplate[] = [
    ...INSURANCE_QUICK_TASKS,
    ...patterns
      .filter(p => p.occurrence_count >= 3) // Only show frequent patterns
      .map(p => ({
        text: p.pattern_text,
        category: p.category,
        defaultPriority: p.avg_priority,
        suggestedSubtasks: p.common_subtasks,
      })),
  ];

  // Show first 4 or all
  const visibleTemplates = showAll ? allTemplates : allTemplates.slice(0, 4);

  if (allTemplates.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      {/* Header with collapse toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-2 group"
      >
        <Sparkles className="w-4 h-4" />
        <span className="font-medium">Quick Add</span>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 opacity-50 group-hover:opacity-100" />
        ) : (
          <ChevronUp className="w-4 h-4 opacity-50 group-hover:opacity-100" />
        )}
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Button grid */}
            <div className="grid grid-cols-2 gap-2">
              {visibleTemplates.map((template, index) => {
                const iconConfig = CATEGORY_ICON_CONFIG[template.category] || CATEGORY_ICON_CONFIG.other;
                const IconComponent = iconConfig.icon;

                return (
                  <motion.button
                    key={`${template.category}-${index}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onSelectTemplate(template)}
                    className="flex items-center gap-3 px-3 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl hover:bg-[var(--surface-3)] hover:border-[var(--border-hover)] transition-all text-left group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: iconConfig.bgColor }}
                    >
                      <IconComponent
                        className="w-4 h-4"
                        style={{ color: iconConfig.color }}
                      />
                    </div>
                    <span className="text-sm text-[var(--foreground)] font-medium truncate">
                      {formatTemplateText(template.text)}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Show more/less toggle */}
            {allTemplates.length > 4 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="mt-2 w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                {showAll ? `Show less` : `Show ${allTemplates.length - 4} more`}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Formats template text for display, removing placeholder brackets
 */
function formatTemplateText(text: string): string {
  // Replace [customer] and similar placeholders with ellipsis
  return text.replace(/\[[\w\s]+\]/g, '...').trim();
}

/**
 * Hook to fetch task patterns from the API
 */
export function useTaskPatterns(): { patterns: TaskPattern[]; loading: boolean } {
  const [patterns, setPatterns] = useState<TaskPattern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPatterns() {
      try {
        const response = await fetch('/api/patterns/suggestions');
        if (response.ok) {
          const data = await response.json();
          // Flatten grouped patterns
          const allPatterns = Object.values(data.patterns || {}).flat() as TaskPattern[];
          setPatterns(allPatterns);
        }
      } catch (error) {
        console.error('Failed to fetch task patterns:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPatterns();
  }, []);

  return { patterns, loading };
}
