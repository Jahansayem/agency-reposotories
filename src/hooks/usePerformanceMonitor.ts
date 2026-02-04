'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * usePerformanceMonitor Hook
 * Sprint 3 Issue #43: Performance Monitoring Dashboard
 *
 * Tracks application performance metrics in real-time.
 * Monitors FPS, memory usage, network latency, and component render times.
 *
 * Usage:
 * ```tsx
 * const { metrics, startMonitoring, stopMonitoring } = usePerformanceMonitor();
 * ```
 */

export interface PerformanceMetrics {
  // Frame rate
  fps: number;
  minFps: number;
  maxFps: number;
  avgFps: number;

  // Memory (if available)
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
  memoryUsagePercent?: number;

  // Network
  apiLatency: number;
  minLatency: number;
  maxLatency: number;
  avgLatency: number;
  requestCount: number;

  // Render performance
  componentRenderCount: number;
  avgRenderTime: number;
  slowRenders: number; // Renders > 16ms

  // Page load
  domContentLoaded?: number;
  loadComplete?: number;
  firstContentfulPaint?: number;
  timeToInteractive?: number;

  // Real-time sync
  realtimeLatency: number;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

interface PerformanceHistory {
  timestamp: number;
  metrics: PerformanceMetrics;
}

const HISTORY_SIZE = 60; // Keep 60 data points (1 minute at 1 second intervals)

export function usePerformanceMonitor(interval: number = 1000) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    minFps: Infinity,
    maxFps: 0,
    avgFps: 0,
    apiLatency: 0,
    minLatency: Infinity,
    maxLatency: 0,
    avgLatency: 0,
    requestCount: 0,
    componentRenderCount: 0,
    avgRenderTime: 0,
    slowRenders: 0,
    realtimeLatency: 0,
    connectionStatus: 'disconnected',
  });

  const [history, setHistory] = useState<PerformanceHistory[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // FPS tracking
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const fpsHistoryRef = useRef<number[]>([]);

  // Latency tracking
  const latencyHistoryRef = useRef<number[]>([]);

  // Render tracking
  const renderTimesRef = useRef<number[]>([]);

  // Animation frame ID
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Monitor interval ID
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  /**
   * Measure FPS
   */
  const measureFPS = useCallback(function measureFPSFn() {
    frameCountRef.current++;
    const now = performance.now();
    const elapsed = now - lastFrameTimeRef.current;

    if (elapsed >= 1000) {
      const fps = Math.round((frameCountRef.current / elapsed) * 1000);
      fpsHistoryRef.current.push(fps);

      // Keep only last 60 seconds
      if (fpsHistoryRef.current.length > HISTORY_SIZE) {
        fpsHistoryRef.current.shift();
      }

      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }

    if (isMonitoring) {
      animationFrameRef.current = requestAnimationFrame(measureFPSFn);
    }
  }, [isMonitoring]);

  /**
   * Get memory usage
   */
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        memoryUsagePercent: Math.round(
          (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        ),
      };
    }
    return {};
  }, []);

  /**
   * Get page load metrics
   */
  const getPageLoadMetrics = useCallback(() => {
    if (typeof window === 'undefined') return {};

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    const fcp = paint.find((entry) => entry.name === 'first-contentful-paint');

    return {
      domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart) : undefined,
      loadComplete: navigation ? Math.round(navigation.loadEventEnd - navigation.fetchStart) : undefined,
      firstContentfulPaint: fcp ? Math.round(fcp.startTime) : undefined,
      // timeToInteractive would require a library like web-vitals
    };
  }, []);

  /**
   * Calculate metrics
   */
  const calculateMetrics = useCallback(() => {
    const fpsHistory = fpsHistoryRef.current;
    const latencyHistory = latencyHistoryRef.current;
    const renderTimes = renderTimesRef.current;

    const memory = getMemoryUsage();
    const pageLoad = getPageLoadMetrics();

    const newMetrics: PerformanceMetrics = {
      // FPS
      fps: fpsHistory.length > 0 ? fpsHistory[fpsHistory.length - 1] : 0,
      minFps: fpsHistory.length > 0 ? Math.min(...fpsHistory) : 0,
      maxFps: fpsHistory.length > 0 ? Math.max(...fpsHistory) : 0,
      avgFps: fpsHistory.length > 0
        ? Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length)
        : 0,

      // Memory
      ...memory,

      // Network
      apiLatency: latencyHistory.length > 0 ? latencyHistory[latencyHistory.length - 1] : 0,
      minLatency: latencyHistory.length > 0 ? Math.min(...latencyHistory) : 0,
      maxLatency: latencyHistory.length > 0 ? Math.max(...latencyHistory) : 0,
      avgLatency: latencyHistory.length > 0
        ? Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length)
        : 0,
      requestCount: latencyHistory.length,

      // Render
      componentRenderCount: renderTimes.length,
      avgRenderTime: renderTimes.length > 0
        ? Math.round(renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length)
        : 0,
      slowRenders: renderTimes.filter(t => t > 16).length,

      // Page load
      ...pageLoad,

      // Real-time (mock for now - would be set by actual real-time monitoring)
      realtimeLatency: metrics.realtimeLatency,
      connectionStatus: metrics.connectionStatus,
    };

    setMetrics(newMetrics);

    // Add to history
    setHistory(prev => {
      const newHistory = [
        ...prev,
        {
          timestamp: Date.now(),
          metrics: newMetrics,
        },
      ];

      // Keep only last HISTORY_SIZE entries
      if (newHistory.length > HISTORY_SIZE) {
        return newHistory.slice(-HISTORY_SIZE);
      }

      return newHistory;
    });
  }, [getMemoryUsage, getPageLoadMetrics, metrics.realtimeLatency, metrics.connectionStatus]);

  /**
   * Track API request latency
   */
  const trackApiRequest = useCallback((latency: number) => {
    latencyHistoryRef.current.push(latency);

    // Keep only last 100 requests
    if (latencyHistoryRef.current.length > 100) {
      latencyHistoryRef.current.shift();
    }
  }, []);

  /**
   * Track component render time
   */
  const trackRender = useCallback((renderTime: number) => {
    renderTimesRef.current.push(renderTime);

    // Keep only last 100 renders
    if (renderTimesRef.current.length > 100) {
      renderTimesRef.current.shift();
    }
  }, []);

  /**
   * Set real-time connection status
   */
  const setConnectionStatus = useCallback((status: 'connected' | 'disconnected' | 'connecting') => {
    setMetrics(prev => ({ ...prev, connectionStatus: status }));
  }, []);

  /**
   * Track real-time latency
   */
  const trackRealtimeLatency = useCallback((latency: number) => {
    setMetrics(prev => ({ ...prev, realtimeLatency: latency }));
  }, []);

  /**
   * Start monitoring
   */
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);

    // Start FPS monitoring
    animationFrameRef.current = requestAnimationFrame(measureFPS);

    // Start metrics calculation interval
    intervalRef.current = setInterval(() => {
      calculateMetrics();
    }, interval);

    console.log('🚀 Performance monitoring started');
  }, [isMonitoring, measureFPS, calculateMetrics, interval]);

  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    setIsMonitoring(false);

    // Stop FPS monitoring
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Stop metrics calculation
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    console.log('🛑 Performance monitoring stopped');
  }, [isMonitoring]);

  /**
   * Reset metrics
   */
  const resetMetrics = useCallback(() => {
    fpsHistoryRef.current = [];
    latencyHistoryRef.current = [];
    renderTimesRef.current = [];
    frameCountRef.current = 0;
    lastFrameTimeRef.current = performance.now();
    setHistory([]);
    setMetrics({
      fps: 0,
      minFps: Infinity,
      maxFps: 0,
      avgFps: 0,
      apiLatency: 0,
      minLatency: Infinity,
      maxLatency: 0,
      avgLatency: 0,
      requestCount: 0,
      componentRenderCount: 0,
      avgRenderTime: 0,
      slowRenders: 0,
      realtimeLatency: 0,
      connectionStatus: 'disconnected',
    });
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    /** Current performance metrics */
    metrics,

    /** Historical metrics (last 60 data points) */
    history,

    /** Whether monitoring is active */
    isMonitoring,

    /** Start monitoring performance */
    startMonitoring,

    /** Stop monitoring performance */
    stopMonitoring,

    /** Reset all metrics */
    resetMetrics,

    /** Track an API request latency (ms) */
    trackApiRequest,

    /** Track a component render time (ms) */
    trackRender,

    /** Set real-time connection status */
    setConnectionStatus,

    /** Track real-time sync latency (ms) */
    trackRealtimeLatency,
  };
}

/**
 * useRenderMonitor Hook
 * Monitors render performance of a specific component
 */
export function useRenderMonitor(componentName: string, onRender?: (time: number) => void) {
  const renderStartRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    renderStartRef.current = performance.now();
  });

  useEffect(() => {
    if (renderStartRef.current) {
      const renderTime = performance.now() - renderStartRef.current;

      if (renderTime > 16) {
        console.warn(`⚠️ Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }

      if (onRender) {
        onRender(renderTime);
      }
    }
  });
}
