/**
 * Haptic Feedback Utility
 *
 * Provides consistent haptic feedback patterns across the app using the Vibration API.
 * Implements iOS Taptic Engine and Android vibration motor patterns.
 *
 * Issue #21: Haptic Feedback API Integration
 *
 * Browser Support:
 * - iOS Safari: Supported (Taptic Engine)
 * - Android Chrome: Supported (Vibration Motor)
 * - Desktop browsers: Feature-detected, fails gracefully
 *
 * WCAG Considerations:
 * - Haptic feedback is supplementary to visual/auditory feedback
 * - Never use haptics as the sole indicator of an action
 * - Users can disable vibration at OS level (respects user preferences)
 */

/**
 * Check if vibration API is supported
 */
function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Haptic feedback patterns following iOS Human Interface Guidelines
 * and Android Material Design haptics
 */
export const haptics = {
  /**
   * Light haptic feedback (10ms)
   * Use for: Selection changes, UI state changes
   * iOS equivalent: UIImpactFeedbackGenerator.light
   */
  light: (): void => {
    if (isVibrationSupported()) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium haptic feedback (20ms)
   * Use for: Button presses, toggles, confirmations
   * iOS equivalent: UIImpactFeedbackGenerator.medium
   */
  medium: (): void => {
    if (isVibrationSupported()) {
      navigator.vibrate(20);
    }
  },

  /**
   * Heavy haptic feedback (50ms)
   * Use for: Destructive actions, long-press activations, important state changes
   * iOS equivalent: UIImpactFeedbackGenerator.heavy
   */
  heavy: (): void => {
    if (isVibrationSupported()) {
      navigator.vibrate(50);
    }
  },

  /**
   * Success haptic pattern (10ms, 50ms pause, 10ms)
   * Use for: Task completion, successful operations
   * iOS equivalent: UINotificationFeedbackGenerator.success
   */
  success: (): void => {
    if (isVibrationSupported()) {
      navigator.vibrate([10, 50, 10]);
    }
  },

  /**
   * Error haptic pattern (50ms, 100ms pause, 50ms)
   * Use for: Failed operations, validation errors, destructive confirmations
   * iOS equivalent: UINotificationFeedbackGenerator.error
   */
  error: (): void => {
    if (isVibrationSupported()) {
      navigator.vibrate([50, 100, 50]);
    }
  },

  /**
   * Warning haptic pattern (20ms, 80ms pause, 20ms, 80ms pause, 20ms)
   * Use for: Warnings, alerts, important notifications
   * iOS equivalent: UINotificationFeedbackGenerator.warning
   */
  warning: (): void => {
    if (isVibrationSupported()) {
      navigator.vibrate([20, 80, 20, 80, 20]);
    }
  },

  /**
   * Selection haptic feedback (5ms)
   * Use for: Picker/slider value changes, swipe gestures
   * iOS equivalent: UISelectionFeedbackGenerator
   */
  selection: (): void => {
    if (isVibrationSupported()) {
      navigator.vibrate(5);
    }
  },

  /**
   * Reply pattern (30ms, 20ms pause, 30ms)
   * Use for: Swipe-to-reply, message actions
   * Custom pattern for messaging interactions
   */
  reply: (): void => {
    if (isVibrationSupported()) {
      navigator.vibrate([30, 20, 30]);
    }
  },

  /**
   * Cancel all ongoing vibrations
   * Use when user dismisses a modal or cancels an action
   */
  cancel: (): void => {
    if (isVibrationSupported()) {
      navigator.vibrate(0);
    }
  },
};

/**
 * Haptic feedback hook for React components
 * Provides memoized haptic functions to avoid recreating on every render
 */
export function useHaptics() {
  return haptics;
}

/**
 * Check if device supports haptic feedback
 * Useful for conditional UI hints (e.g., "Long press to open menu")
 */
export function hasHapticSupport(): boolean {
  return isVibrationSupported();
}

export default haptics;
