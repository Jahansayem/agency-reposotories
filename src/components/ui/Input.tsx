'use client';

import { forwardRef, InputHTMLAttributes, useId, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Search, X } from 'lucide-react';
import { prefersReducedMotion } from '@/lib/animations';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Visual variant */
  variant?: 'default' | 'filled';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the input has an error */
  error?: boolean;
  /** Whether the input is in a success state */
  success?: boolean;
  /** Icon to show on the left */
  leftIcon?: React.ReactNode;
  /** Icon to show on the right */
  rightIcon?: React.ReactNode;
  /** Whether to show a clear button */
  clearable?: boolean;
  /** Callback when clear button is clicked */
  onClear?: () => void;
  /** Full width */
  fullWidth?: boolean;
  /** Additional wrapper class */
  wrapperClassName?: string;
}

const sizeClasses = {
  sm: 'px-3 py-2 text-sm min-h-[36px]',
  md: 'px-3 py-2.5 text-sm min-h-[44px]',
  lg: 'px-4 py-3 text-base min-h-[52px]',
};

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

/**
 * Input Component
 *
 * A styled input with support for:
 * - Error and success states
 * - Icons (left and right)
 * - Clear button
 * - Shake animation on error
 * - Multiple sizes
 *
 * Usage:
 * ```tsx
 * <Input
 *   type="email"
 *   placeholder="Enter email"
 *   error={!!errors.email}
 *   leftIcon={<Mail />}
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'default',
      size = 'md',
      error = false,
      success = false,
      leftIcon,
      rightIcon,
      clearable = false,
      onClear,
      fullWidth = false,
      className = '',
      wrapperClassName = '',
      disabled,
      type = 'text',
      value,
      ...props
    },
    ref
  ) => {
    const id = useId();
    const reducedMotion = prefersReducedMotion();
    const [showPassword, setShowPassword] = useState(false);
    const [hasShaken, setHasShaken] = useState(false);

    // Shake animation when error appears
    const handleShake = useCallback(() => {
      if (error && !hasShaken && !reducedMotion) {
        setHasShaken(true);
        setTimeout(() => setHasShaken(false), 500);
      }
    }, [error, hasShaken, reducedMotion]);

    // Trigger shake on error change
    if (error && !hasShaken) {
      handleShake();
    }

    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    // Determine if we need padding for icons
    const hasLeftIcon = !!leftIcon;
    const hasRightElement = !!rightIcon || clearable || isPassword;

    // Show clear button only when there's a value
    const showClear = clearable && value && !disabled;

    const baseClasses = `
      w-full rounded-[var(--radius-xl)]
      transition-all duration-150 ease-out
      outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
      placeholder:text-[var(--text-muted)]
      ${sizeClasses[size]}
      ${hasLeftIcon ? 'pl-10' : ''}
      ${hasRightElement ? 'pr-10' : ''}
    `;

    const variantClasses = {
      default: `
        bg-[var(--surface)]
        border border-[var(--border)]
        hover:border-[var(--border-hover)]
        focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-light)]
      `,
      filled: `
        bg-[var(--surface-2)]
        border border-transparent
        hover:bg-[var(--surface-3)]
        focus:bg-[var(--surface)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-light)]
      `,
    };

    const stateClasses = error
      ? 'border-[var(--danger)] bg-[var(--danger-light)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/20'
      : success
      ? 'border-[var(--success)] focus:border-[var(--success)] focus:ring-[var(--success)]/20'
      : variantClasses[variant];

    // Shake animation variants
    const shakeVariants = {
      shake: {
        x: [0, -10, 10, -10, 10, -5, 5, -2, 2, 0],
        transition: { duration: 0.4 },
      },
    };

    return (
      <motion.div
        className={`relative ${fullWidth ? 'w-full' : ''} ${wrapperClassName}`}
        animate={hasShaken ? 'shake' : undefined}
        variants={reducedMotion ? undefined : shakeVariants}
      >
        {/* Left icon */}
        {leftIcon && (
          <div
            className={`
              absolute left-3 top-1/2 -translate-y-1/2
              text-[var(--text-muted)]
              pointer-events-none
              ${iconSizeClasses[size]}
            `}
          >
            {leftIcon}
          </div>
        )}

        {/* Input */}
        <input
          ref={ref}
          id={id}
          type={inputType}
          disabled={disabled}
          value={value}
          aria-invalid={error || undefined}
          className={`
            ${baseClasses}
            ${stateClasses}
            ${className}
          `}
          {...props}
        />

        {/* Right elements container */}
        {hasRightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Clear button */}
            {showClear && (
              <button
                type="button"
                onClick={onClear}
                className={`
                  p-1 rounded-[var(--radius-md)]
                  text-[var(--text-muted)] hover:text-[var(--foreground)]
                  hover:bg-[var(--surface-2)]
                  transition-colors
                  ${iconSizeClasses[size]}
                `}
                aria-label="Clear input"
              >
                <X className="w-full h-full" />
              </button>
            )}

            {/* Password toggle */}
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`
                  p-1 rounded-[var(--radius-md)]
                  text-[var(--text-muted)] hover:text-[var(--foreground)]
                  hover:bg-[var(--surface-2)]
                  transition-colors
                  ${iconSizeClasses[size]}
                `}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-full h-full" />
                ) : (
                  <Eye className="w-full h-full" />
                )}
              </button>
            )}

            {/* Custom right icon */}
            {rightIcon && !showClear && !isPassword && (
              <div className={`text-[var(--text-muted)] ${iconSizeClasses[size]}`}>
                {rightIcon}
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  }
);

Input.displayName = 'Input';

/**
 * SearchInput Component
 *
 * Pre-configured input for search functionality
 */
export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  /** Callback when search is submitted */
  onSearch?: (value: string) => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, value, onClear, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch && typeof value === 'string') {
        onSearch(value);
      }
      props.onKeyDown?.(e);
    };

    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={<Search />}
        clearable
        value={value}
        onClear={onClear}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

/**
 * Textarea Component
 *
 * Styled textarea with consistent design
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Visual variant */
  variant?: 'default' | 'filled';
  /** Whether the textarea has an error */
  error?: boolean;
  /** Whether the textarea is in a success state */
  success?: boolean;
  /** Full width */
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      variant = 'default',
      error = false,
      success = false,
      fullWidth = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = `
      w-full rounded-[var(--radius-xl)]
      px-3 py-2.5 text-sm min-h-[100px]
      transition-all duration-150 ease-out
      outline-none resize-y
      disabled:opacity-50 disabled:cursor-not-allowed
      placeholder:text-[var(--text-muted)]
    `;

    const variantClasses = {
      default: `
        bg-[var(--surface)]
        border border-[var(--border)]
        hover:border-[var(--border-hover)]
        focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-light)]
      `,
      filled: `
        bg-[var(--surface-2)]
        border border-transparent
        hover:bg-[var(--surface-3)]
        focus:bg-[var(--surface)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-light)]
      `,
    };

    const stateClasses = error
      ? 'border-[var(--danger)] bg-[var(--danger-light)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/20'
      : success
      ? 'border-[var(--success)] focus:border-[var(--success)] focus:ring-[var(--success)]/20'
      : variantClasses[variant];

    return (
      <textarea
        ref={ref}
        disabled={disabled}
        aria-invalid={error || undefined}
        className={`
          ${baseClasses}
          ${stateClasses}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export default Input;
