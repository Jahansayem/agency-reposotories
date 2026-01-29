'use client';

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { buttonHoverVariants, iconButtonVariants, prefersReducedMotion } from '@/lib/animations';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Core button variants (consolidated from 8 to 4)
 *
 * Migration guide:
 * - `brand`   -> use `primary` (same gradient)
 * - `outline` -> use `secondary` (outlined style)
 * - `warning` -> use `danger` with different label text
 * - `success` -> use `primary` with className override for green color
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'brand';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant - determines visual style */
  variant?: ButtonVariant;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Show loading spinner */
  loading?: boolean;
  /** Icon to show before text */
  leftIcon?: ReactNode;
  /** Icon to show after text */
  rightIcon?: ReactNode;
  /** Make button full width */
  fullWidth?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// STANDARDIZED STYLES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Consolidated variant styles with standardized hover/active states:
 *
 * Hover:  brightness-105, -translate-y-px, shadow-lg
 * Active: scale-[0.98], translate-y-px, shadow-sm
 * Transition: all duration-150 ease-out (applied in component className)
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-blue-light)]
    text-white font-semibold
    shadow-[var(--shadow-md)]
    hover:brightness-105 hover:-translate-y-px hover:shadow-[var(--shadow-lg)]
    active:scale-[0.98] active:translate-y-px active:shadow-[var(--shadow-sm)]
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:hover:translate-y-0 disabled:hover:shadow-[var(--shadow-md)]
  `,
  secondary: `
    bg-[var(--surface-2)] text-[var(--foreground)]
    border border-[var(--border)]
    hover:bg-[var(--surface-3)] hover:border-[var(--border-hover)] hover:brightness-105 hover:-translate-y-px hover:shadow-[var(--shadow-lg)]
    active:scale-[0.98] active:translate-y-px active:shadow-[var(--shadow-sm)]
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--surface-2)] disabled:hover:translate-y-0
  `,
  danger: `
    bg-[var(--danger)] text-white font-semibold
    shadow-[var(--shadow-md)]
    hover:brightness-105 hover:-translate-y-px hover:shadow-[var(--shadow-lg)]
    active:scale-[0.98] active:translate-y-px active:shadow-[var(--shadow-sm)]
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:hover:translate-y-0
  `,
  ghost: `
    text-[var(--foreground)]
    hover:bg-[var(--surface-2)] hover:brightness-105 hover:-translate-y-px hover:shadow-[var(--shadow-lg)]
    active:scale-[0.98] active:translate-y-px active:shadow-[var(--shadow-sm)]
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:translate-y-0
  `,
  brand: `
    bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-blue-light)]
    text-white font-semibold
    shadow-[var(--shadow-md)]
    hover:brightness-105 hover:-translate-y-px hover:shadow-[var(--shadow-lg)]
    active:scale-[0.98] active:translate-y-px active:shadow-[var(--shadow-sm)]
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:hover:translate-y-0 disabled:hover:shadow-[var(--shadow-md)]
  `,
};

const sizeClasses = {
  sm: 'px-3 py-2 text-sm min-h-[36px] rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm min-h-[44px] rounded-xl gap-2',
  lg: 'px-6 py-3 text-base min-h-[52px] rounded-xl gap-2.5',
};

// ═══════════════════════════════════════════════════════════════════════════
// BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Standardized Button Component
 *
 * Features:
 * - 4 core variants: primary, secondary, danger, ghost
 * - Consistent sizing with minimum touch targets (44px+)
 * - Standardized hover/active states across all variants
 * - Loading state with spinner
 * - Support for left/right icons
 * - Accessible with proper focus states
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center
          font-medium
          transition-all duration-150 ease-out
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2
          touch-manipulation
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin" />
        )}
        {!loading && leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ═══════════════════════════════════════════════════════════════════════════
// ICON BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Icon Button variant for icon-only buttons
 */
export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  /** Icon to display */
  icon: ReactNode;
  /** Accessible label (required for icon-only buttons) */
  'aria-label': string;
}

const iconSizeClasses = {
  sm: 'w-9 h-9 min-h-[36px] min-w-[36px]',
  md: 'w-11 h-11 min-h-[44px] min-w-[44px]',
  lg: 'w-13 h-13 min-h-[52px] min-w-[52px]',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'ghost',
      size = 'md',
      loading = false,
      icon,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center
          rounded-xl
          transition-all duration-150 ease-out
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2
          touch-manipulation
          ${variantClasses[variant]}
          ${iconSizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

// ═══════════════════════════════════════════════════════════════════════════
// MOTION-ENHANCED BUTTON
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Motion-enhanced Button with Framer Motion animations
 * Use this for primary CTAs where polished hover effects are desired
 */
export interface MotionButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref' | 'children'> {
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Show loading spinner */
  loading?: boolean;
  /** Icon to show before text */
  leftIcon?: ReactNode;
  /** Icon to show after text */
  rightIcon?: ReactNode;
  /** Make button full width */
  fullWidth?: boolean;
  /** Button content */
  children?: ReactNode;
}

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const reducedMotion = prefersReducedMotion();

    return (
      <motion.button
        ref={ref}
        disabled={isDisabled}
        variants={reducedMotion ? undefined : buttonHoverVariants}
        initial="idle"
        whileHover={isDisabled ? undefined : 'hover'}
        whileTap={isDisabled ? undefined : 'tap'}
        className={`
          inline-flex items-center justify-center
          font-medium
          transition-colors duration-150 ease-out
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2
          touch-manipulation
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin" />
        )}
        {!loading && leftIcon}
        {children}
        {!loading && rightIcon}
      </motion.button>
    );
  }
);

MotionButton.displayName = 'MotionButton';

// ═══════════════════════════════════════════════════════════════════════════
// MOTION-ENHANCED ICON BUTTON
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Motion-enhanced Icon Button with Framer Motion animations
 */
export interface MotionIconButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  /** Icon to display */
  icon: ReactNode;
  /** Accessible label (required for icon-only buttons) */
  'aria-label': string;
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Show loading spinner */
  loading?: boolean;
}

export const MotionIconButton = forwardRef<HTMLButtonElement, MotionIconButtonProps>(
  (
    {
      variant = 'ghost',
      size = 'md',
      loading = false,
      icon,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const reducedMotion = prefersReducedMotion();

    return (
      <motion.button
        ref={ref}
        disabled={isDisabled}
        variants={reducedMotion ? undefined : iconButtonVariants}
        initial="idle"
        whileHover={isDisabled ? undefined : 'hover'}
        whileTap={isDisabled ? undefined : 'tap'}
        className={`
          inline-flex items-center justify-center
          rounded-xl
          transition-colors duration-150 ease-out
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2
          touch-manipulation
          ${variantClasses[variant]}
          ${iconSizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
      </motion.button>
    );
  }
);

MotionIconButton.displayName = 'MotionIconButton';

export default Button;
