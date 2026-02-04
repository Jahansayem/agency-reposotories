/**
 * Centralized Constants
 *
 * Single source of truth for magic numbers and commonly used values.
 * Prevents duplication and ensures consistency across the codebase.
 */

// ============================================================================
// TIME CONSTANTS (in milliseconds)
// ============================================================================

/**
 * Time-related constants for session management, timeouts, etc.
 */
export const TIME = {
  /** One second in milliseconds */
  SECOND: 1000,
  /** One minute in milliseconds */
  MINUTE: 60 * 1000,
  /** One hour in milliseconds */
  HOUR: 60 * 60 * 1000,
  /** One day in milliseconds */
  DAY: 24 * 60 * 60 * 1000,
  /** One week in milliseconds */
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Session timeout configuration
 */
export const SESSION_TIMEOUTS = {
  /** 30 minutes idle timeout */
  IDLE_TIMEOUT: 30 * TIME.MINUTE,
  /** 8 hours max session age */
  MAX_AGE: 8 * TIME.HOUR,
} as const;

/**
 * Lockout configuration
 */
export const LOCKOUT_CONFIG = {
  /** Maximum login attempts before lockout */
  MAX_ATTEMPTS: 5,
  /** 15 minutes lockout duration */
  LOCKOUT_DURATION: 15 * TIME.MINUTE,
} as const;

// ============================================================================
// REMINDER TIME OFFSETS (for calculateReminderTime)
// ============================================================================

export const REMINDER_OFFSETS = {
  '5_min_before': 5 * TIME.MINUTE,
  '15_min_before': 15 * TIME.MINUTE,
  '30_min_before': 30 * TIME.MINUTE,
  '1_hour_before': TIME.HOUR,
  '1_day_before': TIME.DAY,
} as const;

// ============================================================================
// USER COLORS (Allstate brand palette)
// ============================================================================

/**
 * Color palette for user avatars.
 * Based on Allstate brand colors.
 */
export const USER_COLORS = [
  '#0033A0', // Allstate Blue
  '#059669', // Green
  '#7c3aed', // Purple
  '#dc2626', // Red
  '#ea580c', // Orange
  '#0891b2', // Cyan
  '#be185d', // Pink
  '#4f46e5', // Indigo
] as const;

export type UserColor = typeof USER_COLORS[number];

/**
 * Get a random color from the user color palette
 */
export function getRandomUserColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

// ============================================================================
// USER/AUTH UTILITIES
// ============================================================================

/**
 * Get user initials for avatar display
 * @param name - User's display name
 * @returns 1-2 character initials
 */
export function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Validate PIN format (4 digits)
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

// ============================================================================
// PRIORITY CONFIGURATION
// ============================================================================

export const PRIORITY_CONFIG = {
  low: { label: 'Low', emoji: '🟢', color: 'bg-slate-400' },
  medium: { label: 'Medium', emoji: '🟡', color: 'bg-[var(--brand-blue)]' },
  high: { label: 'High', emoji: '🟠', color: 'bg-orange-500' },
  urgent: { label: 'Urgent', emoji: '🔴', color: 'bg-red-500' },
} as const;

export type Priority = keyof typeof PRIORITY_CONFIG;

/**
 * Get priority emoji
 */
export function getPriorityEmoji(priority: Priority): string {
  return PRIORITY_CONFIG[priority]?.emoji || '🟡';
}

/**
 * Get priority color class for Tailwind
 */
export function getPriorityColor(priority: string): string {
  const config = PRIORITY_CONFIG[priority as Priority];
  return config?.color || 'bg-[var(--brand-blue)]';
}

// ============================================================================
// ANIMATION TIMING
// ============================================================================

/**
 * Animation durations in seconds (for Framer Motion)
 */
export const ANIMATION_DURATION = {
  fast: 0.15,
  normal: 0.2,
  medium: 0.25,
  slow: 0.35,
} as const;

/**
 * Animation throttle duration in milliseconds
 */
export const ANIMATION_THROTTLE = 100;

/**
 * Frame time for 60fps target (in milliseconds)
 */
export const FRAME_TIME_60FPS = 16;

// ============================================================================
// STRING TRUNCATION LIMITS
// ============================================================================

export const TRUNCATION_LIMITS = {
  /** Task text preview */
  TASK_PREVIEW: 50,
  /** Notes preview */
  NOTES_PREVIEW: 100,
  /** Log string max length */
  LOG_STRING_MAX: 1000,
  /** Log array max items */
  LOG_ARRAY_MAX: 100,
  /** Log recursion depth */
  LOG_MAX_DEPTH: 10,
} as const;

// ============================================================================
// VALIDATION LIMITS
// ============================================================================

export const VALIDATION_LIMITS = {
  /** Minimum username length */
  USERNAME_MIN: 2,
  /** Maximum username length */
  USERNAME_MAX: 30,
  /** Maximum name length for API validation */
  NAME_MAX: 100,
  /** Minimum phone digits */
  PHONE_MIN_DIGITS: 10,
  /** Maximum phone digits */
  PHONE_MAX_DIGITS: 15,
} as const;

// ============================================================================
// HTTP STATUS CODES
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;

// ============================================================================
// DATE FORMATTING THRESHOLDS
// ============================================================================

export const DATE_THRESHOLDS = {
  /** Days before due date to show "due soon" warning */
  DUE_SOON_DAYS: 2,
  /** Days to show relative date instead of absolute */
  RELATIVE_DATE_MAX_DAYS: 7,
} as const;
