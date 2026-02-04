/**
 * Design System Tokens
 * Single source of truth for spacing, typography, and semantic colors
 * Enforces consistent design language across all components
 */

// ============================================================================
// SPACING SCALE (8pt system with 4pt substeps)
// ============================================================================
export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
} as const;

export type SpacingToken = keyof typeof SPACING;

// ============================================================================
// TYPOGRAPHY SCALE
// ============================================================================
export const TYPOGRAPHY = {
  // Hero/display text - for major headings
  display: {
    size: '28px',
    weight: '700',
    lineHeight: '1.2',
    letterSpacing: '-0.02em',
  },
  // Page titles - main page headings
  pageTitle: {
    size: '22px',
    weight: '600',
    lineHeight: '1.3',
    letterSpacing: '-0.01em',
  },
  // Section headers - uppercase labels
  sectionHeader: {
    size: '12px',
    weight: '600',
    lineHeight: '1.3',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },
  // Task titles - primary item text
  taskTitle: {
    size: '15px',
    weight: '500',
    lineHeight: '1.4',
    letterSpacing: '-0.005em',
  },
  // Body text - standard readable content
  body: {
    size: '14px',
    weight: '400',
    lineHeight: '1.5',
    letterSpacing: '0',
  },
  // Metadata - secondary info like timestamps, assignees
  metadata: {
    size: '13px',
    weight: '400',
    lineHeight: '1.4',
    letterSpacing: '0',
  },
  // Helper text - form hints, supporting text
  helper: {
    size: '12px',
    weight: '400',
    lineHeight: '1.5',
    letterSpacing: '0',
  },
  // Caption - smallest readable text (WCAG AA minimum)
  caption: {
    size: '12px',
    weight: '500',
    lineHeight: '1.4',
    letterSpacing: '0.01em',
  },
  // Form labels - uppercase field labels
  label: {
    size: '11px',
    weight: '600',
    lineHeight: '1.3',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  },
  // Badge text - notification counters, status badges (decorative, not primary content)
  badge: {
    size: '10px',
    weight: '700',
    lineHeight: '1',
    letterSpacing: '0',
  },
  // Tab labels - bottom navigation labels
  tabLabel: {
    size: '11px',
    weight: '500',
    lineHeight: '1.2',
    letterSpacing: '0.01em',
  },
} as const;

export type TypographyToken = keyof typeof TYPOGRAPHY;

// ============================================================================
// SEMANTIC COLORS (state-based, not arbitrary)
// ============================================================================
export const SEMANTIC_COLORS = {
  // Task states
  overdue: 'var(--state-overdue)',
  dueSoon: 'var(--state-due-soon)',
  onTrack: 'var(--state-on-track)',
  completed: 'var(--state-completed)',

  // Contextual
  primary: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--brand-sky)',

  // Text hierarchy
  textPrimary: 'var(--foreground)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
  textInverse: 'var(--text-inverse)',

  // Surfaces
  bgBase: 'var(--background)',
  bgSurface: 'var(--surface)',
  bgSurface2: 'var(--surface-2)',
  bgSurface3: 'var(--surface-3)',

  // Borders
  borderSubtle: 'var(--border-subtle)',
  border: 'var(--border)',
  borderHover: 'var(--border-hover)',
} as const;

export type SemanticColorToken = keyof typeof SEMANTIC_COLORS;

// ============================================================================
// ACTION COLORS (activity feed, notifications - consistent semantic mapping)
// ============================================================================
/**
 * Action colors for activity feed and notifications.
 * Maps action types to semantic colors for consistent visual language.
 * These use CSS variables to respect light/dark mode.
 */
export const ACTION_COLORS = {
  // Creation actions - success green
  created: 'var(--success-vivid)',       // #10B981 light, #34D399 dark
  added: 'var(--success-vivid)',
  completed: 'var(--success-vivid)',

  // Update actions - primary blue
  updated: 'var(--accent-vivid)',        // #2563EB light, #60A5FA dark
  assigned: 'var(--accent-vivid)',
  reordered: 'var(--accent-vivid)',
  used: 'var(--accent-vivid)',           // template used

  // Delete/remove actions - danger red
  deleted: 'var(--danger)',              // #DC2626 light, #F87171 dark
  removed: 'var(--danger)',

  // Warning/change actions - warning amber
  reopened: 'var(--warning)',            // #D97706 light, #FBBF24 dark
  priorityChanged: 'var(--warning)',
  overdue: 'var(--danger)',

  // Neutral/info actions - purple for special states
  statusChanged: 'var(--state-info)',     // Uses purple accent
  notesUpdated: 'var(--state-info)',
  reminderAdded: 'var(--state-info)',
  waiting: 'var(--state-info)',

  // Merge action - brand color
  merged: 'var(--accent)',               // Brand blue
} as const;

export type ActionColorToken = keyof typeof ACTION_COLORS;

/**
 * Get action color value
 * @example getActionColor('created') // 'var(--success-vivid)'
 */
export function getActionColor(token: ActionColorToken): string {
  return ACTION_COLORS[token];
}

// ============================================================================
// ELEVATION (shadow system)
// ============================================================================
export const ELEVATION = {
  0: 'none',
  1: '0 1px 3px rgba(0, 0, 0, 0.08)',
  2: '0 4px 12px rgba(0, 0, 0, 0.1)',
  3: '0 12px 32px rgba(0, 0, 0, 0.12)',
  4: '0 24px 48px rgba(0, 0, 0, 0.16)',
} as const;

export type ElevationLevel = keyof typeof ELEVATION;

// ============================================================================
// BORDER RADIUS
// ============================================================================
export const RADIUS = {
  sm: '6px',   // Pills, small badges
  md: '8px',   // Inputs, buttons
  lg: '10px',  // Standard cards
  xl: '12px',  // Large cards
  '2xl': '16px', // Modals
  full: '9999px', // Circular
} as const;

export type RadiusToken = keyof typeof RADIUS;

// ============================================================================
// ICON SIZES (standardized across UI)
// ============================================================================
export const ICON_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

export type IconSizeToken = keyof typeof ICON_SIZE;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get spacing value
 * @example getSpacing('md') // '12px'
 */
export function getSpacing(token: SpacingToken): string {
  return SPACING[token];
}

/**
 * Get typography styles as CSS object
 * @example getTypography('taskTitle')
 */
export function getTypography(token: TypographyToken) {
  return TYPOGRAPHY[token];
}

/**
 * Get semantic color value
 * @example getColor('overdue') // 'var(--state-overdue)'
 */
export function getColor(token: SemanticColorToken): string {
  return SEMANTIC_COLORS[token];
}

/**
 * Get elevation shadow value
 * @example getElevation(2)
 */
export function getElevation(level: ElevationLevel): string {
  return ELEVATION[level];
}

/**
 * Get border radius value
 * @example getRadius('lg')
 */
export function getRadius(token: RadiusToken): string {
  return RADIUS[token];
}

/**
 * Get icon size
 * @example getIconSize('md') // 16
 */
export function getIconSize(token: IconSizeToken): number {
  return ICON_SIZE[token];
}

// ============================================================================
// TASK STATUS UTILITIES
// ============================================================================

export interface TaskStatusStyle {
  strip: string | null;
  dueDateText: string | null;
  dueDateColor: string;
  borderColor?: string;
}

/**
 * Calculate task status styling based on due date and completion
 * SINGLE SOURCE OF TRUTH for overdue/due soon styling
 * Rule: ONE strong visual signal per task (no badge soup)
 */
export function getTaskStatusStyle(
  dueDate: string | null,
  completed: boolean
): TaskStatusStyle {
  // Completed tasks - green, no strip needed
  if (completed) {
    return {
      strip: null,
      dueDateText: null,
      dueDateColor: SEMANTIC_COLORS.completed,
    };
  }

  // No due date - neutral
  if (!dueDate) {
    return {
      strip: null,
      dueDateText: 'No due date',
      dueDateColor: SEMANTIC_COLORS.textMuted,
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Overdue - red strip + explicit text
  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      strip: 'bg-[var(--state-overdue)]',
      dueDateText: `Overdue ${overdueDays}d`,
      dueDateColor: SEMANTIC_COLORS.danger,
    };
  }

  // Due soon (≤ 2 days) - orange strip + warning text
  if (diffDays <= 2) {
    return {
      strip: 'bg-[var(--state-due-soon)]',
      dueDateText: diffDays === 0 ? 'Due today' : `Due in ${diffDays}d`,
      dueDateColor: SEMANTIC_COLORS.warning,
    };
  }

  // On track - subtle, no strip
  return {
    strip: null,
    dueDateText: diffDays <= 7 ? `Due in ${diffDays}d` : null,
    dueDateColor: SEMANTIC_COLORS.textSecondary,
  };
}

/**
 * Format due date for display with explicit semantics
 * Never force user to infer meaning
 */
export function formatDueDate(dueDate: string | null, completed: boolean): string {
  if (!dueDate) return 'No due date';

  const date = new Date(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  if (completed) {
    return `Due ${formattedDate}`;
  }

  if (diffDays < 0) {
    return `Due ${formattedDate} • Overdue ${Math.abs(diffDays)}d`;
  }

  if (diffDays === 0) {
    return `Due ${formattedDate} • Today`;
  }

  if (diffDays <= 7) {
    return `Due ${formattedDate} • ${diffDays}d left`;
  }

  return `Due ${formattedDate}`;
}
