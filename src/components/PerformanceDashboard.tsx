'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Cpu,
  Zap,
  Network,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePerformanceMonitor, type PerformanceMetrics } from '@/hooks/usePerformanceMonitor';

/**
 * PerformanceDashboard Component
 * Sprint 3 Issue #43: Performance Monitoring Dashboard
 *
 * Real-time performance metrics dashboard.
 * Shows FPS, memory usage, network latency, and render performance.
 *
 * Usage:
 * ```tsx
 * <PerformanceDashboard />
 * ```
 */

interface PerformanceDashboardProps {
  className?: string;
}

export function PerformanceDashboard({ className = '' }: PerformanceDashboardProps) {
  const {
    metrics,
    history,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetMetrics,
  } = usePerformanceMonitor(1000);

  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'charts'>('overview');

  useEffect(() => {
    // Auto-start monitoring when component mounts
    startMonitoring();

    return () => {
      stopMonitoring();
    };
  }, [startMonitoring, stopMonitoring]);

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600 dark:text-green-400';
    if (value >= thresholds.warning) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getLatencyStatusColor = (value: number) => {
    if (value < 100) return 'text-green-600 dark:text-green-400';
    if (value < 300) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getMemoryStatusColor = (percent?: number) => {
    if (!percent) return 'text-gray-600 dark:text-gray-400';
    if (percent < 50) return 'text-green-600 dark:text-green-400';
    if (percent < 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getTrend = (current: number, avg: number) => {
    if (current > avg * 1.1) return 'up';
    if (current < avg * 0.9) return 'down';
    return 'stable';
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Performance Monitor
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Real-time application metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View selector */}
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
            <button
              onClick={() => setSelectedView('overview')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                selectedView === 'overview'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedView('charts')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                selectedView === 'charts'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Charts
            </button>
          </div>

          {/* Controls */}
          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={isMonitoring ? 'Pause monitoring' : 'Start monitoring'}
          >
            {isMonitoring ? (
              <Pause className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <Play className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          <button
            onClick={resetMetrics}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Reset metrics"
          >
            <RotateCcw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {selectedView === 'overview' && (
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* FPS */}
                <MetricCard
                  icon={<Zap className="w-5 h-5" />}
                  label="FPS"
                  value={metrics.fps}
                  unit="fps"
                  trend={getTrend(metrics.fps, metrics.avgFps)}
                  statusColor={getStatusColor(metrics.fps, { good: 55, warning: 30 })}
                  details={[
                    { label: 'Min', value: `${metrics.minFps}` },
                    { label: 'Max', value: `${metrics.maxFps}` },
                    { label: 'Avg', value: `${metrics.avgFps}` },
                  ]}
                />

                {/* API Latency */}
                <MetricCard
                  icon={<Network className="w-5 h-5" />}
                  label="API Latency"
                  value={metrics.apiLatency}
                  unit="ms"
                  trend={getTrend(metrics.avgLatency, metrics.apiLatency)}
                  statusColor={getLatencyStatusColor(metrics.apiLatency)}
                  details={[
                    { label: 'Min', value: `${metrics.minLatency}ms` },
                    { label: 'Max', value: `${metrics.maxLatency}ms` },
                    { label: 'Avg', value: `${metrics.avgLatency}ms` },
                  ]}
                />

                {/* Memory */}
                {metrics.memoryUsagePercent !== undefined && (
                  <MetricCard
                    icon={<Cpu className="w-5 h-5" />}
                    label="Memory Usage"
                    value={metrics.memoryUsagePercent}
                    unit="%"
                    statusColor={getMemoryStatusColor(metrics.memoryUsagePercent)}
                    details={[
                      { label: 'Used', value: formatBytes(metrics.usedJSHeapSize) },
                      { label: 'Total', value: formatBytes(metrics.totalJSHeapSize) },
                      { label: 'Limit', value: formatBytes(metrics.jsHeapSizeLimit) },
                    ]}
                  />
                )}

                {/* Render Performance */}
                <MetricCard
                  icon={<Clock className="w-5 h-5" />}
                  label="Render Time"
                  value={metrics.avgRenderTime}
                  unit="ms"
                  statusColor={getStatusColor(16 - metrics.avgRenderTime, { good: 10, warning: 5 })}
                  details={[
                    { label: 'Renders', value: `${metrics.componentRenderCount}` },
                    { label: 'Slow', value: `${metrics.slowRenders}` },
                    { label: 'Target', value: '<16ms' },
                  ]}
                />

                {/* Connection Status */}
                <MetricCard
                  icon={<Activity className="w-5 h-5" />}
                  label="Real-time"
                  value={metrics.realtimeLatency}
                  unit="ms"
                  statusColor={
                    metrics.connectionStatus === 'connected'
                      ? 'text-green-600 dark:text-green-400'
                      : metrics.connectionStatus === 'connecting'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                  }
                  details={[
                    { label: 'Status', value: metrics.connectionStatus },
                    { label: 'Latency', value: `${metrics.realtimeLatency}ms` },
                  ]}
                />

                {/* Page Load Metrics */}
                {metrics.domContentLoaded && (
                  <MetricCard
                    icon={<Clock className="w-5 h-5" />}
                    label="Page Load"
                    value={metrics.domContentLoaded}
                    unit="ms"
                    statusColor={getLatencyStatusColor(metrics.domContentLoaded)}
                    details={[
                      { label: 'DOM', value: `${metrics.domContentLoaded}ms` },
                      { label: 'Load', value: `${metrics.loadComplete}ms` },
                      { label: 'FCP', value: `${metrics.firstContentfulPaint}ms` },
                    ]}
                  />
                )}
              </div>
            )}

            {selectedView === 'charts' && (
              <div className="p-4 space-y-4">
                {/* FPS Chart */}
                <ChartCard
                  title="FPS Over Time"
                  data={history.map(h => ({ x: h.timestamp, y: h.metrics.fps }))}
                  color="rgb(59, 130, 246)"
                  threshold={55}
                  unit="fps"
                />

                {/* Latency Chart */}
                <ChartCard
                  title="API Latency Over Time"
                  data={history.map(h => ({ x: h.timestamp, y: h.metrics.apiLatency }))}
                  color="rgb(34, 197, 94)"
                  threshold={100}
                  unit="ms"
                />

                {/* Memory Chart */}
                {metrics.memoryUsagePercent !== undefined && (
                  <ChartCard
                    title="Memory Usage Over Time"
                    data={history.map(h => ({ x: h.timestamp, y: h.metrics.memoryUsagePercent || 0 }))}
                    color="rgb(168, 85, 247)"
                    threshold={80}
                    unit="%"
                  />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * MetricCard Component
 */
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  statusColor: string;
  details?: Array<{ label: string; value: string }>;
}

function MetricCard({ icon, label, value, unit, trend, statusColor, details }: MetricCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 cursor-pointer"
      onClick={() => setShowDetails(!showDetails)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg bg-opacity-10 ${statusColor}`}>
          <div className={statusColor}>{icon}</div>
        </div>

        {trend && (
          <div>
            {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />}
            {trend === 'stable' && <Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${statusColor}`}>
          {value}
          <span className="text-sm ml-1">{unit}</span>
        </p>
      </div>

      {/* Details */}
      <AnimatePresence>
        {showDetails && details && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1"
          >
            {details.map((detail, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">{detail.label}:</span>
                <span className="text-gray-900 dark:text-white font-medium">{detail.value}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * ChartCard Component
 */
interface ChartCardProps {
  title: string;
  data: Array<{ x: number; y: number }>;
  color: string;
  threshold?: number;
  unit: string;
}

function ChartCard({ title, data, color, threshold, unit }: ChartCardProps) {
  if (data.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{title}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">No data yet...</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.y), threshold || 0);
  const minValue = Math.min(...data.map(d => d.y));
  const range = maxValue - minValue || 1;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((d.y - minValue) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
          <span>Min: {minValue.toFixed(0)}{unit}</span>
          <span>Max: {maxValue.toFixed(0)}{unit}</span>
          <span>Current: {data[data.length - 1]?.y.toFixed(0)}{unit}</span>
        </div>
      </div>

      <div className="relative w-full h-32 bg-gray-100 dark:bg-gray-900 rounded">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          {/* Threshold line */}
          {threshold && (
            <line
              x1="0"
              y1={100 - ((threshold - minValue) / range) * 100}
              x2="100"
              y2={100 - ((threshold - minValue) / range) * 100}
              stroke="rgba(239, 68, 68, 0.3)"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
          )}

          {/* Chart line */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
          />
        </svg>
      </div>
    </div>
  );
}

/**
 * Compact Performance Badge
 * Shows current FPS in a small badge (for use in header/toolbar)
 */
export function PerformanceBadge({ className = '' }: { className?: string }) {
  const { metrics, isMonitoring } = usePerformanceMonitor(1000);

  if (!isMonitoring) return null;

  const statusColor =
    metrics.fps >= 55
      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
      : metrics.fps >= 30
      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
      : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg ${statusColor} ${className}`}>
      <Activity className="w-3 h-3" />
      <span className="text-xs font-medium">{metrics.fps} FPS</span>
    </div>
  );
}
