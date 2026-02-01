'use client';

/**
 * SkipLink Component
 *
 * WCAG 2.1 Level A requirement (Success Criterion 2.4.1: Bypass Blocks)
 *
 * Provides keyboard users a way to skip repetitive navigation and jump
 * directly to the main content. The link is visually hidden by default
 * and only appears when it receives keyboard focus.
 *
 * Usage:
 * - Place at the very top of the page (first focusable element)
 * - Ensure target element has matching id and tabIndex={-1}
 *
 * Accessibility:
 * - Meets WCAG 2.1 Level A
 * - Visible on keyboard focus (sr-only -> focus:not-sr-only)
 * - High contrast focus ring (4.5:1 minimum)
 * - Clear, descriptive text
 */

export default function SkipLink() {
  const handleSkip = (e: React.MouseEvent<HTMLAnchorElement> | React.KeyboardEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      // Focus the main content area
      mainContent.focus();

      // Smooth scroll into view
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href="#main-content"
      onClick={handleSkip}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleSkip(e);
        }
      }}
      className="
        sr-only
        focus:not-sr-only
        focus:absolute
        focus:top-4
        focus:left-4
        focus:z-[100]
        focus:px-6
        focus:py-3
        focus:bg-[var(--primary)]
        focus:text-white
        focus:font-medium
        focus:rounded-[var(--radius-xl)]
        focus:shadow-2xl
        focus:outline-none
        focus:ring-4
        focus:ring-[var(--primary)]/30
        transition-all
        duration-200
      "
      aria-label="Skip to main content"
    >
      Skip to main content
    </a>
  );
}
