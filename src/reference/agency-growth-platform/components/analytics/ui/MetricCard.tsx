import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'gradient' | 'bordered' | 'compact';
  colorScheme?: 'default' | 'teal' | 'amber' | 'purple' | 'rose' | 'blue';
  className?: string;
}

const colorSchemes = {
  default: {
    icon: 'text-slate-400',
    value: 'text-white',
    border: 'border-white/10',
    gradient: 'from-slate-800/50 to-slate-900/50',
  },
  teal: {
    icon: 'text-teal-400',
    value: 'text-teal-400',
    border: 'border-teal-500/30',
    gradient: 'from-teal-500/10 to-teal-600/5',
  },
  amber: {
    icon: 'text-amber-400',
    value: 'text-amber-400',
    border: 'border-amber-500/30',
    gradient: 'from-amber-500/10 to-amber-600/5',
  },
  purple: {
    icon: 'text-purple-400',
    value: 'text-purple-400',
    border: 'border-purple-500/30',
    gradient: 'from-purple-500/10 to-purple-600/5',
  },
  rose: {
    icon: 'text-rose-400',
    value: 'text-rose-400',
    border: 'border-rose-500/30',
    gradient: 'from-rose-500/10 to-rose-600/5',
  },
  blue: {
    icon: 'text-blue-400',
    value: 'text-blue-400',
    border: 'border-blue-500/30',
    gradient: 'from-blue-500/10 to-blue-600/5',
  },
};

export function MetricCard({
  label,
  value,
  subValue,
  trend,
  trendValue,
  icon,
  variant = 'default',
  colorScheme = 'default',
  className,
}: MetricCardProps) {
  const colors = colorSchemes[colorScheme];

  const baseStyles = cn(
    'rounded-2xl p-4 md:p-5 transition-all duration-200',
    variant === 'default' && 'bg-slate-900/50 border border-white/10',
    variant === 'gradient' && `bg-gradient-to-br ${colors.gradient} border ${colors.border}`,
    variant === 'bordered' && `bg-slate-900/30 border-2 ${colors.border}`,
    variant === 'compact' && 'bg-slate-900/50 border border-white/10 p-3',
    className
  );

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={baseStyles}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm font-medium text-slate-400 uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className={cn('text-2xl md:text-3xl font-bold truncate', colors.value)}>
            {value}
          </p>
          {subValue && (
            <p className="text-xs md:text-sm text-slate-500 mt-1">{subValue}</p>
          )}
          {trend && trendValue && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-xs font-medium',
              trend === 'up' && 'text-teal-400',
              trend === 'down' && 'text-rose-400',
              trend === 'neutral' && 'text-slate-400'
            )}>
              <TrendIcon className="w-3 h-3" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('flex-shrink-0', colors.icon)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// Compact version for dashboards with many metrics
export function MetricCardCompact({
  label,
  value,
  colorScheme = 'default',
  className,
}: Pick<MetricCardProps, 'label' | 'value' | 'colorScheme' | 'className'>) {
  const colors = colorSchemes[colorScheme];

  return (
    <div className={cn(
      'bg-slate-900/50 border border-white/10 rounded-xl p-3 text-center',
      className
    )}>
      <p className={cn('text-xl md:text-2xl font-bold', colors.value)}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

// Row of metric cards with consistent spacing
export function MetricCardRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      'grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4',
      className
    )}>
      {children}
    </div>
  );
}
