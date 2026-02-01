'use client';

/**
 * LiveRegion Component
 *
 * WCAG 2.1 Level AA requirement for dynamic content announcements
 *
 * Provides screen reader announcements for dynamic content changes that
 * would otherwise be silent. Uses ARIA live regions to announce updates
 * without interrupting the user's current focus or workflow.
 *
 * Usage:
 * ```tsx
 * const [announcement, setAnnouncement] = useState('');
 *
 * const handleAction = () => {
 *   // Perform action
 *   setAnnouncement('Task completed successfully');
 *   setTimeout(() => setAnnouncement(''), 1000);
 * };
 *
 * return (
 *   <>
 *     <LiveRegion message={announcement} />
 *     <button onClick={handleAction}>Complete Task</button>
 *   </>
 * );
 * ```
 *
 * Politeness Levels:
 * - 'polite': Wait for user to pause (default, most common)
 * - 'assertive': Interrupt immediately (use sparingly for urgent updates)
 * - 'off': Don't announce (disable announcements)
 *
 * Accessibility:
 * - Meets WCAG 2.1 Level AA (4.1.3 Status Messages)
 * - Screen reader compatible (VoiceOver, NVDA, JAWS)
 * - Visually hidden (does not affect layout)
 * - Non-intrusive (respects user's screen reader settings)
 */

interface LiveRegionProps {
  /** The message to announce to screen readers */
  message: string;

  /** Politeness level for announcements */
  politeness?: 'polite' | 'assertive' | 'off';

  /** Whether to clear previous announcements when announcing new ones */
  atomic?: boolean;

  /** Custom aria-label for the region */
  label?: string;
}

export default function LiveRegion({
  message,
  politeness = 'polite',
  atomic = true,
  label = 'Notifications',
}: LiveRegionProps) {
  // Don't render if no message or announcements are disabled
  if (!message || politeness === 'off') {
    return null;
  }

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      aria-label={label}
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * useAnnouncement Hook
 *
 * Convenience hook for managing live region announcements with automatic cleanup.
 *
 * Usage:
 * ```tsx
 * const announce = useAnnouncement();
 *
 * const handleAction = () => {
 *   // Perform action
 *   announce('Task completed successfully');
 * };
 * ```
 *
 * Features:
 * - Automatic cleanup after 1 second (configurable)
 * - Prevents announcement spam
 * - Easy to use in any component
 */
import { useState, useCallback, useRef, useEffect } from 'react';

export function useAnnouncement(duration: number = 1000) {
  const [announcement, setAnnouncement] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const announce = useCallback((message: string, customDuration?: number) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set the announcement
    setAnnouncement(message);

    // Clear after duration
    timeoutRef.current = setTimeout(() => {
      setAnnouncement('');
    }, customDuration ?? duration);
  }, [duration]);

  return { announcement, announce };
}

/**
 * AnnouncementProvider Context
 *
 * Global announcement system for app-wide notifications.
 * Prevents multiple components from creating conflicting announcements.
 *
 * Usage:
 * ```tsx
 * // In root component
 * <AnnouncementProvider>
 *   <App />
 * </AnnouncementProvider>
 *
 * // In any child component
 * const { announce } = useAnnouncementContext();
 * announce('Task completed');
 * ```
 */
import { createContext, useContext, ReactNode } from 'react';

interface AnnouncementContextType {
  announce: (message: string, politeness?: 'polite' | 'assertive') => void;
}

const AnnouncementContext = createContext<AnnouncementContextType | null>(null);

export function AnnouncementProvider({ children }: { children: ReactNode }) {
  const { announcement, announce: announceInternal } = useAnnouncement();
  const [politeness, setPoliteness] = useState<'polite' | 'assertive'>('polite');

  const announce = useCallback((message: string, level: 'polite' | 'assertive' = 'polite') => {
    setPoliteness(level);
    announceInternal(message);
  }, [announceInternal]);

  return (
    <AnnouncementContext.Provider value={{ announce }}>
      {children}
      <LiveRegion message={announcement} politeness={politeness} />
    </AnnouncementContext.Provider>
  );
}

export function useAnnouncementContext() {
  const context = useContext(AnnouncementContext);
  if (!context) {
    throw new Error('useAnnouncementContext must be used within AnnouncementProvider');
  }
  return context;
}
