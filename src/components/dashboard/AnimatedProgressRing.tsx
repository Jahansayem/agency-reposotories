'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
  className?: string;
  gradientId?: string;
  /** Optional tooltip content explaining the score */
  tooltip?: ReactNode;
}

export default function AnimatedProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  children,
  className = '',
  gradientId = 'progressGradient',
  tooltip,
}: AnimatedProgressRingProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className} ${tooltip ? 'cursor-help' : ''}`}
      onMouseEnter={() => tooltip && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => tooltip && setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      tabIndex={tooltip ? 0 : undefined}
      role={tooltip ? 'button' : undefined}
      aria-label={tooltip ? `Score: ${progress}. Click for breakdown.` : undefined}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <defs>
          {/* Brand colors: Allstate Blue (#0033A0) to Sky Blue (#72B5E8) */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={'#0033A0'} />
            <stop offset="50%" stopColor={'#0066CC'} />
            <stop offset="100%" stopColor={'#72B5E8'} />
          </linearGradient>
          {/* SVG glow filter (applied via dark: class in CSS if needed) */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
        </defs>

        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={'rgba(0,0,0,0.05)'}
          strokeWidth={strokeWidth}
        />

        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{
            duration: 1,
            ease: [0.25, 0.46, 0.45, 0.94],
            delay: 0.2,
          }}
          filter="url(#glow)"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && showTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-3 pointer-events-none"
          >
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl p-4 min-w-[240px] text-sm">
              {tooltip}
            </div>
            {/* Tooltip arrow */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[var(--surface)] border-l border-t border-[var(--border)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
