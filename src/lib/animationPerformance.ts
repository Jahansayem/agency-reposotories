/**
 * Animation Performance Utilities
 * Sprint 3 Issue #42: Animation Polish
 *
 * Optimizations for smooth 60fps animations.
 * Includes GPU acceleration hints, will-change management,
 * and reduced motion detection.
 */

import { ANIMATION_THROTTLE, FRAME_TIME_60FPS } from './constants';

/**
 * Properties that can be GPU-accelerated
 */
export const GPU_ACCELERATED_PROPS = [
  'transform',
  'opacity',
  'filter',
] as const;

/**
 * Properties that should avoid GPU acceleration (expensive)
 */
export const EXPENSIVE_PROPS = [
  'width',
  'height',
  'top',
  'left',
  'margin',
  'padding',
] as const;

/**
 * Add will-change hint for specific properties
 * Call before animation starts, remove after animation ends
 */
export function addWillChange(element: HTMLElement, properties: string[]) {
  if (!element) return;
  element.style.willChange = properties.join(', ');
}

/**
 * Remove will-change hint
 * Important: Always clean up will-change to avoid memory issues
 */
export function removeWillChange(element: HTMLElement) {
  if (!element) return;
  element.style.willChange = 'auto';
}

/**
 * Force GPU acceleration for an element
 * Use sparingly - only for elements that will animate frequently
 */
export function forceGPUAcceleration(element: HTMLElement) {
  if (!element) return;
  element.style.transform = element.style.transform || 'translateZ(0)';
}

/**
 * Check if device supports smooth animations
 * Based on:
 * - User's reduced motion preference
 * - Device performance (battery saver, low-end device)
 * - Browser support for GPU acceleration
 *
 * Note: Battery check is async and cannot affect the synchronous return value.
 * For battery-aware animation control, use shouldUseReducedMotionAsync() instead.
 */
export function shouldUseReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return true;

  return false;
}

/**
 * Async version of shouldUseReducedMotion that includes battery status check.
 * Use this when you can await the result before starting animations.
 */
export async function shouldUseReducedMotionAsync(): Promise<boolean> {
  if (typeof window === 'undefined') return true;

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return true;

  // Check if battery saver is enabled (experimental)
  const navigator = window.navigator as any;
  if (navigator.getBattery) {
    try {
      const battery = await navigator.getBattery();
      if (battery.charging === false && battery.level < 0.2) {
        return true; // Low battery, reduce animations
      }
    } catch {
      // Battery API not available or failed - continue with animations
    }
  }

  return false;
}

/**
 * Get optimal animation duration based on device performance
 */
export function getOptimalDuration(baseDuration: number): number {
  if (shouldUseReducedMotion()) {
    return 0; // Instant for reduced motion
  }

  // Check device performance hints
  if (typeof window !== 'undefined' && 'deviceMemory' in navigator) {
    const memory = (navigator as any).deviceMemory;
    if (memory < 4) {
      // Low-end device, reduce animation duration
      return baseDuration * 0.7;
    }
  }

  return baseDuration;
}

/**
 * Throttle animations during heavy computation
 */
let isThrottling = false;

export function throttleAnimations(callback: () => void, duration: number = ANIMATION_THROTTLE) {
  if (isThrottling) return;

  isThrottling = true;
  callback();

  setTimeout(() => {
    isThrottling = false;
  }, duration);
}

/**
 * Request animation frame with fallback
 */
export const requestFrame = typeof window !== 'undefined'
  ? window.requestAnimationFrame || ((cb) => setTimeout(cb, 16))
  : (cb: FrameRequestCallback) => setTimeout(cb, 16);

/**
 * Cancel animation frame with fallback
 */
export const cancelFrame = typeof window !== 'undefined'
  ? window.cancelAnimationFrame || clearTimeout
  : clearTimeout;

/**
 * Schedule callback on next idle period
 * Use for non-critical animations or cleanup
 */
export function onIdle(callback: () => void) {
  if (typeof window === 'undefined') {
    callback();
    return;
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback);
  } else {
    // Fallback: run after current animations
    setTimeout(callback, 100);
  }
}

/**
 * Batch DOM reads to avoid layout thrashing
 */
const readQueue: Array<() => void> = [];
let isReadScheduled = false;

export function scheduleRead(callback: () => void) {
  readQueue.push(callback);

  if (!isReadScheduled) {
    isReadScheduled = true;
    requestFrame(() => {
      readQueue.forEach(cb => cb());
      readQueue.length = 0;
      isReadScheduled = false;
    });
  }
}

/**
 * Batch DOM writes to avoid layout thrashing
 */
const writeQueue: Array<() => void> = [];
let isWriteScheduled = false;

export function scheduleWrite(callback: () => void) {
  writeQueue.push(callback);

  if (!isWriteScheduled) {
    isWriteScheduled = true;
    requestFrame(() => {
      requestFrame(() => {
        writeQueue.forEach(cb => cb());
        writeQueue.length = 0;
        isWriteScheduled = false;
      });
    });
  }
}

/**
 * Measure animation performance
 */
export class AnimationMonitor {
  private startTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 60;

  start() {
    this.startTime = performance.now();
    this.frameCount = 0;
    this.measure();
  }

  private measure = () => {
    this.frameCount++;
    const elapsed = performance.now() - this.startTime;

    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount / elapsed) * 1000);
      console.log(`Animation FPS: ${this.fps}`);
      this.startTime = performance.now();
      this.frameCount = 0;
    }

    requestFrame(this.measure);
  };

  getFPS(): number {
    return this.fps;
  }

  stop() {
    // Stop monitoring
    this.frameCount = 0;
  }
}

/**
 * Detect if element is in viewport
 * Use to delay animations for off-screen elements
 */
export function isInViewport(element: HTMLElement): boolean {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Intersection Observer for lazy animations
 */
export function observeElementForAnimation(
  element: HTMLElement,
  onVisible: () => void,
  options?: IntersectionObserverInit
) {
  if (typeof IntersectionObserver === 'undefined') {
    // Fallback: trigger immediately
    onVisible();
    return null;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        onVisible();
        observer.unobserve(element);
      }
    });
  }, {
    threshold: 0.1,
    ...options,
  });

  observer.observe(element);

  return () => observer.disconnect();
}

/**
 * CSS Custom Properties for dynamic animations
 */
export function setAnimationProperty(
  element: HTMLElement,
  property: string,
  value: string | number
) {
  if (!element) return;
  element.style.setProperty(`--${property}`, String(value));
}

/**
 * Get animation property
 */
export function getAnimationProperty(element: HTMLElement, property: string): string {
  if (!element) return '';
  return getComputedStyle(element).getPropertyValue(`--${property}`);
}

/**
 * Preload assets for smoother animations
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

export function preloadImages(srcs: string[]): Promise<void[]> {
  return Promise.all(srcs.map(preloadImage));
}

/**
 * Debounce animation triggers
 */
export function debounceAnimation(
  callback: (...args: any[]) => void,
  delay: number = 150
): (...args: any[]) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), delay);
  };
}

/**
 * CSS containment hints for better performance
 */
export function applyContainment(element: HTMLElement, type: 'layout' | 'paint' | 'strict' = 'layout') {
  if (!element) return;

  const containmentMap = {
    layout: 'layout',
    paint: 'paint',
    strict: 'layout style paint',
  };

  element.style.contain = containmentMap[type];
}

/**
 * Check if hardware acceleration is available
 */
export function supportsHardwareAcceleration(): boolean {
  if (typeof window === 'undefined') return false;

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  return !!gl;
}

/**
 * Animation frame scheduler with priority
 */
type Priority = 'high' | 'normal' | 'low';

interface ScheduledTask {
  callback: () => void;
  priority: Priority;
}

class FrameScheduler {
  private tasks: Map<Priority, ScheduledTask[]> = new Map([
    ['high', []],
    ['normal', []],
    ['low', []],
  ]);
  private isScheduled = false;

  schedule(callback: () => void, priority: Priority = 'normal') {
    const tasks = this.tasks.get(priority)!;
    tasks.push({ callback, priority });

    if (!this.isScheduled) {
      this.isScheduled = true;
      requestFrame(this.processTasks);
    }
  }

  private processTasks = () => {
    const startTime = performance.now();
    const frameTime = FRAME_TIME_60FPS; // ~60fps

    // Process high priority first
    for (const priority of ['high', 'normal', 'low'] as Priority[]) {
      const tasks = this.tasks.get(priority)!;

      while (tasks.length > 0 && (performance.now() - startTime) < frameTime) {
        const task = tasks.shift();
        task?.callback();
      }

      // If we've used up the frame, schedule remaining for next frame
      if ((performance.now() - startTime) >= frameTime) {
        this.isScheduled = true;
        requestFrame(this.processTasks);
        return;
      }
    }

    this.isScheduled = false;
  };
}

export const frameScheduler = new FrameScheduler();
