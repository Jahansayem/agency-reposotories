'use client';

import { motion } from 'framer-motion';

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showTrend?: boolean;
  className?: string;
}

/**
 * MiniSparkline Component
 *
 * A compact sparkline chart for showing trends in a small space.
 * Perfect for inline metrics and dashboard cards.
 */
export default function MiniSparkline({
  data,
  width = 80,
  height = 24,
  color = 'var(--accent)',
  showTrend = true,
  className = '',
}: MiniSparklineProps) {
  if (data.length < 2) {
    return null;
  }

  const maxValue = Math.max(...data, 1);
  const minValue = Math.min(...data, 0);
  const range = maxValue - minValue || 1;

  // Calculate points for the polyline
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - minValue) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  // Calculate trend
  const trend = data.length >= 2
    ? data[data.length - 1] - data[0]
    : 0;

  const trendColor = trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-red-500' : 'text-slate-400';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={width}
        height={height}
        className="overflow-visible"
      >
        {/* Background area fill */}
        <motion.polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill={color}
          fillOpacity={0.1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Line */}
        <motion.polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* End point dot */}
        {data.length > 0 && (
          <motion.circle
            cx={width}
            cy={height - ((data[data.length - 1] - minValue) / range) * (height - 4) - 2}
            r={3}
            fill={color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7, duration: 0.2 }}
          />
        )}
      </svg>

      {/* Trend indicator */}
      {showTrend && (
        <span className={`text-badge font-medium ${trendColor}`}>
          {trend > 0 ? '+' : ''}{trend !== 0 ? trend : '—'}
        </span>
      )}
    </div>
  );
}

/**
 * WeeklySparkline - Preset for weekly task completions
 */
export function WeeklySparkline({
  weekData,
  className = '',
}: {
  weekData: { completed: number }[];
  className?: string;
}) {
  const data = weekData.map(d => d.completed);

  return (
    <MiniSparkline
      data={data}
      width={60}
      height={20}
      color="var(--brand-blue)"
      showTrend={false}
      className={className}
    />
  );
}
