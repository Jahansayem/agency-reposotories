import { cn } from '../../lib/utils';

export interface ScoreCircleProps {
  value: number;
  maxValue?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  colorScheme?: 'auto' | 'teal' | 'amber' | 'purple' | 'rose' | 'blue';
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { size: 48, stroke: 4, fontSize: 'text-sm', labelSize: 'text-[9px]' },
  md: { size: 64, stroke: 5, fontSize: 'text-lg', labelSize: 'text-[10px]' },
  lg: { size: 80, stroke: 6, fontSize: 'text-xl', labelSize: 'text-xs' },
};

const colorConfig = {
  teal: { stroke: '#14b8a6', text: 'text-teal-400', bg: 'rgba(20, 184, 166, 0.1)' },
  amber: { stroke: '#f59e0b', text: 'text-amber-400', bg: 'rgba(245, 158, 11, 0.1)' },
  purple: { stroke: '#a855f7', text: 'text-purple-400', bg: 'rgba(168, 85, 247, 0.1)' },
  rose: { stroke: '#f43f5e', text: 'text-rose-400', bg: 'rgba(244, 63, 94, 0.1)' },
  blue: { stroke: '#3b82f6', text: 'text-blue-400', bg: 'rgba(59, 130, 246, 0.1)' },
};

function getAutoColor(value: number, maxValue: number) {
  const percentage = (value / maxValue) * 100;
  if (percentage >= 70) return 'teal';
  if (percentage >= 40) return 'amber';
  return 'rose';
}

export function ScoreCircle({
  value,
  maxValue = 100,
  label,
  size = 'md',
  colorScheme = 'auto',
  showLabel = true,
  className,
}: ScoreCircleProps) {
  const config = sizeConfig[size];
  const resolvedColor = colorScheme === 'auto' ? getAutoColor(value, maxValue) : colorScheme;
  const colors = colorConfig[resolvedColor];

  const radius = (config.size - config.stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((value / maxValue) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div
        className="relative"
        style={{ width: config.size, height: config.size }}
      >
        <svg
          width={config.size}
          height={config.size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill={colors.bg}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={config.stroke}
          />
          {/* Progress circle */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="transparent"
            stroke={colors.stroke}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {/* Value text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold', config.fontSize, colors.text)}>
            {value}
          </span>
        </div>
      </div>
      {showLabel && label && (
        <span className={cn('text-slate-400 font-medium uppercase tracking-wide', config.labelSize)}>
          {label}
        </span>
      )}
    </div>
  );
}

// Row of score circles with labels
export function ScoreCircleRow({
  scores,
  size = 'md',
  className,
}: {
  scores: Array<{ value: number; label: string; colorScheme?: ScoreCircleProps['colorScheme'] }>;
  size?: ScoreCircleProps['size'];
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-around gap-4', className)}>
      {scores.map((score, index) => (
        <ScoreCircle
          key={index}
          value={score.value}
          label={score.label}
          size={size}
          colorScheme={score.colorScheme}
        />
      ))}
    </div>
  );
}
