/**
 * Formal z-index scale for the application.
 *
 * Numeric values for use in inline styles or JS logic.
 * Tailwind class strings for use in className props.
 *
 * Tier guide:
 *   base      (0)   — default stacking
 *   raised    (10)  — slightly above siblings (internal relative stacking)
 *   dropdown  (100) — dropdowns, popovers within components, floating menus
 *   sticky    (200) — app bar, sidebar, bottom nav, bulk action bar
 *   overlay   (300) — modal backdrops, full-screen overlays
 *   modal     (400) — modal content panels, bottom sheets, slide-overs
 *   popover   (500) — popovers/popups that must sit above modals
 *   toast     (600) — toast notifications, banners, offline indicators
 *   tooltip   (700) — tooltips (always on top)
 */

export const Z_INDEX = {
  base: 0,
  raised: 10,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  popover: 500,
  toast: 600,
  tooltip: 700,
} as const;

export const zClass = {
  base: 'z-0',
  raised: 'z-10',
  dropdown: 'z-[100]',
  sticky: 'z-[200]',
  overlay: 'z-[300]',
  modal: 'z-[400]',
  popover: 'z-[500]',
  toast: 'z-[600]',
  tooltip: 'z-[700]',
} as const;
