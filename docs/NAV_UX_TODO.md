# Navigation UX/UI Fix — Todo List

## Priority 1: Accessibility Criticals (Legal/Compliance Risk)

- [x] **A1** — `UserMenu.tsx`: Add arrow-key navigation to dropdown (`role="menu"` + `menuitem` children need `onKeyDown` handler for ArrowUp/Down/Home/End/Escape)
- [x] **A2** — `AgencySwitcher.tsx`: Add arrow-key navigation to dropdown (`role="listbox"` + `option` children need ArrowUp/Down/Home/End)
- [x] **A3** — `NotificationModal.tsx`: Add focus trap + `aria-modal="true"` (use existing `useFocusTrap` hook from `src/hooks/useFocusTrap.ts`)
- [x] **A4** — `NavigationSidebar.tsx`: Add `aria-label` to all collapsed icon buttons (screen readers can't identify them currently)

## Priority 2: Z-Index System (Layout Stability)

- [x] **Z1** — Create `src/lib/z-index.ts` with formal z-index scale (e.g., `base: 0, dropdown: 100, sticky: 200, overlay: 300, modal: 400, popover: 500, toast: 600`)
- [x] **Z2** — `UnifiedAppBar.tsx`: Bump from `z-10` to use the new scale (dropdowns/modals currently render behind)
- [x] **Z3** — `NavigationSidebar.tsx`: Add z-index (currently has NONE — can render behind content)
- [x] **Z4** — Project-wide audit: replace all `z-50` usages (~30 components) with named tokens from scale

## Priority 3: Deduplication (UX Clarity)

- [x] **D1** — Remove "New Task" button from 2 of 3 locations (keep in sidebar or top bar, remove from the other + mobile FAB, or consolidate strategy)
- [x] **D2** — Remove duplicate Logout (keep in UserMenu dropdown, remove from sidebar footer)

## Priority 4: Mobile Parity

- [x] **M1** — `AppShell.tsx` `MobileMenuContent`: Add missing views (currently only shows 4 of 10+ views)

## Priority 5: Polish

- [x] **P1** — `NavigationSidebar.tsx`: Add tooltips on collapsed sidebar icons (no labels currently)
- [x] **P2** — `UserMenu.tsx`: Fix keyboard shortcut display (`Cmd+K` shown for shortcuts, should be `?`)
- [x] **P3** — `UnifiedAppBar.tsx`: Add `aria-live="polite"` to notification badge for screen reader announcement
- [x] **P4** — Project-wide: Respect `prefers-reduced-motion` — wrap all Framer Motion in `useReducedMotion()` hook (already exists at `src/hooks/useReducedMotion.ts`)
- [x] **P5** — Delete dead code `src/components/layout/AppHeader.tsx` (not imported anywhere)
- [x] **P6** — `EnhancedBottomNav.tsx`: Fix `role="tab"` items — need proper `role="tablist"` container
- [x] **P7** — Fix duplicate `aria-label="Main navigation"` on both sidebar and bottom nav (use distinct labels)
- [x] **P8** — `NavigationSidebar.tsx`: Keep collapse toggle visible when sidebar is collapsed
- [x] **P9** — `NavigationSidebar.tsx`: Add scroll indicator when items overflow
- [x] **P10** — `NavigationSidebar.tsx`: Improve active state affordance (currently opacity only — add left border or background)
- [x] **P11** — `UnifiedAppBar.tsx`: Add content to left side on non-task views (currently sparse/empty)
