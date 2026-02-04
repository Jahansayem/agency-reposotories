# Frontend Design Improvements Database

**Generated:** 2026-02-03
**Reviewers:** Product & Design Multi-Agent Orchestration
**Total Issues Found:** 85+

---

## Summary by Category

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Visual Consistency | 3 | 5 | 6 | 4 | 18 |
| UX Friction | 5 | 6 | 8 | 5 | 24 |
| Accessibility | 3 | 5 | 4 | 3 | 15 |
| Mobile Responsiveness | 4 | 4 | 5 | 3 | 16 |
| Interaction Patterns | 2 | 4 | 6 | 3 | 15 |

---

## CRITICAL ISSUES (Fix Immediately)

### VIS-001: Design Token vs CSS Variable Conflict
**Category:** Visual Consistency
**Files:** `src/lib/design-tokens.ts`, `src/app/globals.css`
**Description:** Border radius values differ between design tokens and CSS variables:
- Tokens: `6px, 8px, 10px, 12px, 16px`
- CSS vars: `6px, 10px, 14px, 20px, 28px`
**Impact:** Components using different sources render inconsistently
**Fix:** Unify to single source of truth, update all 591 `rounded-*` instances

---

### VIS-002: 100+ Hardcoded Colors
**Category:** Visual Consistency
**Files:** ActivityFeed.tsx, NotificationModal.tsx, DoerDashboard.tsx, PriorityBadge.tsx, Celebration.tsx
**Description:** Action type colors hardcoded instead of using semantic tokens
```typescript
// WRONG: task_created: { color: '#10b981' }
// RIGHT: task_created: { color: SEMANTIC_COLORS.success }
```
**Impact:** Dark mode inconsistencies, theming breaks, maintenance burden
**Fix:** Replace hardcoded hex values with `SEMANTIC_COLORS` from design-tokens.ts

---

### UX-001: No "Unsaved Changes" Warning in Forms
**Category:** UX Friction
**Files:** AddTodo.tsx, TaskDetailModal.tsx, ChatPanel.tsx
**Description:** Complex forms close without warning if user has unsaved input
**Impact:** Users lose work by accidentally closing modals
**Fix:** Track dirty state, show confirmation dialog before discard

---

### UX-002: Error Toasts Auto-Dismiss
**Category:** UX Friction
**File:** `src/components/ui/Toast.tsx` (line 305)
**Description:** Error messages disappear after 5 seconds
**Impact:** Users miss important error information
**Fix:** Make error toasts persist until dismissed, or extend to 10+ seconds

---

### A11Y-001: Missing `lang` Attribute
**Category:** Accessibility (WCAG 3.1.1 - Level A)
**File:** Root layout.tsx
**Description:** `<html>` tag missing `lang="en"` attribute
**Impact:** Screen readers don't know page language
**Fix:** Add `lang="en"` to html tag (5 minutes)

---

### A11Y-002: Chat Text Fails Contrast
**Category:** Accessibility (WCAG 1.4.3 - Level AA)
**File:** `src/app/globals.css` (line 54-58)
**Description:** `--chat-text-secondary: rgba(0, 0, 0, 0.4)` = ~2.5:1 ratio (needs 4.5:1)
**Impact:** Text unreadable for users with low vision
**Fix:** Increase opacity to 0.6 (achieves 4.5:1)

---

### MOB-001: Modal Overflow on 320px Screens
**Category:** Mobile Responsiveness
**File:** `src/components/ui/Modal.tsx` (line 184-190)
**Description:** `max-w-sm` (384px) exceeds iPhone SE width (320px)
**Impact:** Modal content cut off on small phones
**Fix:** Add `px-4` padding wrapper, use `w-full` for narrow screens

---

### MOB-002: Kanban Board Unusable on Mobile
**Category:** Mobile Responsiveness
**File:** `src/components/KanbanBoard.tsx`
**Description:** Columns don't stack on mobile, requires horizontal scroll
**Impact:** Core feature completely broken on phones
**Fix:** Stack columns vertically on `< md:` breakpoint, add status filter tabs

---

### INT-001: Task Checkbox Has No Animation
**Category:** Interaction Patterns
**File:** `src/components/TodoItem.tsx` (line 68)
**Description:** Most common interaction has no visual feedback
**Impact:** App feels unresponsive on task completion
**Fix:** Apply `checkboxVariants` from animations.ts

---

---

## HIGH PRIORITY ISSUES

### VIS-003: Mixed Dark Mode Approaches
**Category:** Visual Consistency
**Files:** Badge.tsx, TodoItem.tsx, FileImporter.tsx
**Description:** Three different dark mode patterns:
1. Tailwind `dark:` classes
2. CSS variables `var(--surface)`
3. Hardcoded `dark:bg-[#162236]`
**Fix:** Standardize on CSS variables approach

---

### VIS-004: Typography Token Mismatches
**Category:** Visual Consistency
**Description:** Design tokens define 28px display, but components use Tailwind's `text-3xl` (30px)
**Files:** LoginScreen.tsx, Dashboard.tsx
**Fix:** Create semantic typography classes: `.text-task-title`, `.text-metadata`

---

### VIS-005: Arbitrary Spacing Values
**Category:** Visual Consistency
**Description:** 50+ instances of non-token values: `p-2.5`, `gap-1.5`, `py-3.5`
**Impact:** Visual inconsistencies across components
**Fix:** Use only token-based spacing values (4px, 8px, 12px, 16px, 24px)

---

### UX-003: Empty States Missing Action Buttons
**Category:** UX Friction
**File:** `src/components/EmptyState.tsx`
**Description:** "no-due-today" and "no-overdue" variants have no action button
**Impact:** User stares at empty state with nowhere to go
**Fix:** Add "View All Tasks" or "Create Task" button to all empty states

---

### UX-004: No Network Offline Banner
**Category:** UX Friction
**Description:** While ConnectionStatus component exists, no visible offline indicator
**Impact:** Users don't know when disconnected
**Fix:** Add persistent offline banner with "X actions pending sync"

---

### UX-005: File Upload No Progress
**Category:** UX Friction
**File:** AttachmentUpload components
**Description:** Large file uploads show only spinner, no progress %
**Impact:** Users don't know if upload is working
**Fix:** Add progress bar with percentage

---

### A11Y-003: Decorative Icons Missing `aria-hidden`
**Category:** Accessibility (WCAG 1.1.1)
**Files:** TodoItem.tsx (15+ instances), Badge.tsx, PriorityBadge.tsx
**Description:** Icons lack `aria-hidden="true"`
**Impact:** Screen readers read decorative icon names
**Fix:** Add `aria-hidden="true"` to all decorative icons

---

### A11Y-004: Missing Heading Hierarchy
**Category:** Accessibility (WCAG 1.3.1)
**Files:** TodoList.tsx, Dashboard.tsx
**Description:** No semantic `<h1>`, `<h2>`, `<h3>` structure
**Impact:** Screen reader users can't navigate by headings
**Fix:** Add proper heading hierarchy to all views

---

### A11Y-005: SearchInput Missing aria-label
**Category:** Accessibility (WCAG 3.3.2)
**File:** `src/components/ui/Input.tsx` (lines 256-278)
**Description:** Search input has no visible label or aria-label
**Fix:** Add `aria-label="Search tasks"`

---

### MOB-003: Subtask Checkbox Sizing Wrong
**Category:** Mobile Responsiveness
**File:** `src/components/TodoItem.tsx` (line 68)
**Description:** `w-6 h-6 sm:w-5 sm:h-5` makes mobile smaller (backwards!)
**Fix:** Reverse to `w-5 h-5 sm:w-6 sm:h-6`

---

### MOB-004: Tab Labels Below WCAG Minimum
**Category:** Mobile Responsiveness
**File:** `src/components/BottomTabs.tsx` (line 146)
**Description:** `text-tab-label` (11px) is below 12px WCAG minimum
**Fix:** Use `text-xs` (12px) minimum

---

### INT-002: Haptic Feedback Not Used
**Category:** Interaction Patterns
**Files:** TodoItem.tsx, KanbanBoard.tsx
**Description:** `triggerHaptic()` exists but rarely called
**Impact:** Mobile users miss tactile feedback
**Fix:** Add haptic calls to task completion, drag drop, delete actions

---

### INT-003: Inconsistent Transition Durations
**Category:** Interaction Patterns
**Description:** 688 inline `transition-*` classes with mixed 150ms/200ms values
**Fix:** Use design token `var(--duration-normal)` consistently

---

---

## MEDIUM PRIORITY ISSUES

### VIS-006: FileImporter No Dark Mode
**Category:** Visual Consistency
**File:** `src/components/FileImporter.tsx`
**Description:** 30+ color classes without dark mode variants
**Fix:** Convert to CSS variable-based colors

---

### VIS-007: Badge Contrast Issues
**Category:** Visual Consistency
**File:** `src/components/ui/Badge.tsx`
**Description:** LOW priority badge may fail WCAG AA in dark mode
**Fix:** Verify all badge variant contrast ratios

---

### UX-006: Date Picker Poor Mobile UX
**Category:** UX Friction
**File:** AddTodo.tsx (line 758)
**Description:** Native `<input type="date">` is clunky on iOS
**Fix:** Custom date picker with quick options ("Tomorrow", "Next Week")

---

### UX-007: Deep Modal Nesting
**Category:** UX Friction
**Description:** SmartParseModal opens from AddTodo modal
**Impact:** User gets lost in modal layers
**Fix:** Add breadcrumb trail or "Step 2 of 3" indicator

---

### UX-008: Optimistic Updates No Rollback UI
**Category:** UX Friction
**Description:** If save fails after optimistic update, user sees wrong state
**Fix:** Show "Reverting..." toast and re-fetch on failure

---

### A11Y-006: Live Regions Underutilized
**Category:** Accessibility (WCAG 4.1.3)
**Description:** LiveRegion component exists but only used in TodoList.tsx
**Fix:** Announce task completion, bulk actions, filter changes

---

### A11Y-007: Focus States Missing on Custom Elements
**Category:** Accessibility
**Description:** Many custom buttons lack visible `focus-visible` styles
**Fix:** Audit all interactive elements for focus indicators

---

### MOB-005: Chat Bubbles Missing word-break
**Category:** Mobile Responsiveness
**File:** ChatPanel.tsx, ChatMessageList.tsx
**Description:** Long URLs cause horizontal overflow
**Fix:** Add `break-words` or `overflow-wrap: break-word`

---

### MOB-006: Modal Content Overflow
**Category:** Mobile Responsiveness
**File:** `src/components/ui/Modal.tsx` (line 263)
**Description:** `overflow-hidden` prevents scrolling in modal content
**Fix:** Change to `overflow-y-auto` on content area

---

### INT-004: Disabled States Inconsistent
**Category:** Interaction Patterns
**Description:** Only 86 `disabled:` class instances across 36 files
**Fix:** Add disabled styling to ALL interactive elements

---

### INT-005: List Deletion Animation Jarring
**Category:** Interaction Patterns
**File:** `src/lib/animations.ts` (lines 154-166)
**Description:** Opacity and height animate at different rates
**Fix:** Use stagger pattern with slight overlap

---

### INT-006: No View Transitions
**Category:** Interaction Patterns
**File:** EnhancedBottomNav.tsx
**Description:** Switching between Dashboard/Tasks/Chat is instant
**Fix:** Add crossfade with `contentTransitionVariants`

---

---

## LOW PRIORITY ISSUES

### VIS-008: Agency Icon Colors Not Customizable
**Category:** Visual Consistency
**File:** `src/components/AgencySwitcher.tsx` (line 219)
**Description:** All agency icons use hardcoded `#0033A0`
**Fix:** Store agency colors in database, allow customization

---

### VIS-009: CreateAgencyModal User Colors Local
**Category:** Visual Consistency
**File:** `src/components/CreateAgencyModal.tsx` (lines 40-47)
**Description:** 8 user colors defined locally instead of design system
**Fix:** Centralize in design-tokens.ts

---

### UX-009: No Keyboard Shortcuts in Tooltips
**Category:** UX Friction
**Description:** Keyboard shortcuts only shown in dedicated modal
**Fix:** Add shortcut hints to button tooltips

---

### UX-010: Bulk Actions Missing Confirmation
**Category:** UX Friction
**File:** BulkActionBar.tsx
**Description:** Bulk delete doesn't confirm
**Fix:** Show "Delete X tasks?" dialog

---

### A11Y-008: No Animation Disable Toggle
**Category:** Accessibility
**Description:** System `prefers-reduced-motion` respected, but no app setting
**Fix:** Add "Disable animations" toggle in user settings

---

### A11Y-009: Task Lists Not Using Semantic Elements
**Category:** Accessibility
**Description:** Task lists use divs instead of `<ul>`/`<li>`
**Fix:** Convert to semantic list markup

---

### MOB-007: No Pull-to-Refresh on Task List
**Category:** Mobile Responsiveness
**File:** TodoList.tsx
**Description:** Chat has pull-to-refresh, task list doesn't
**Fix:** Add consistent pull-to-refresh support

---

### MOB-008: Long-Press Context Menu Missing
**Category:** Mobile Responsiveness
**Description:** No long-press to open context menu (common mobile pattern)
**Fix:** Add long-press detector for task actions

---

### INT-007: Undo Pattern Missing
**Category:** Interaction Patterns
**Description:** Delete actions immediate with no undo
**Fix:** Use Toast with "Undo" action button

---

### INT-008: Filter Chips No Animation
**Category:** Interaction Patterns
**Description:** Filter selection is instant color change
**Fix:** Add slide indicator + scale pulse animation

---

---

## Implementation Priority Matrix

### Sprint 1: Critical Fixes (Week 1-2)
**Estimated Effort:** 40 hours

1. **VIS-001** - Unify design tokens and CSS variables (8 hrs)
2. **VIS-002** - Replace hardcoded colors with semantic tokens (12 hrs)
3. **A11Y-001** - Add lang attribute (0.5 hr)
4. **A11Y-002** - Fix chat text contrast (0.5 hr)
5. **MOB-001** - Fix modal overflow on small screens (2 hrs)
6. **MOB-002** - Make Kanban mobile-friendly (8 hrs)
7. **UX-001** - Add unsaved changes warnings (4 hrs)
8. **UX-002** - Make error toasts persist (1 hr)
9. **INT-001** - Add task checkbox animation (2 hrs)

### Sprint 2: High Priority (Week 3-4)
**Estimated Effort:** 50 hours

1. **VIS-003 to VIS-005** - Standardize styling patterns (16 hrs)
2. **UX-003 to UX-005** - Fix UX friction points (12 hrs)
3. **A11Y-003 to A11Y-005** - Accessibility fixes (8 hrs)
4. **MOB-003 to MOB-004** - Mobile fixes (4 hrs)
5. **INT-002 to INT-003** - Interaction consistency (10 hrs)

### Sprint 3: Medium Priority (Week 5-6)
**Estimated Effort:** 45 hours

1. **VIS-006 to VIS-007** - Dark mode polish (6 hrs)
2. **UX-006 to UX-008** - UX enhancements (12 hrs)
3. **A11Y-006 to A11Y-007** - A11y polish (6 hrs)
4. **MOB-005 to MOB-006** - Mobile polish (8 hrs)
5. **INT-004 to INT-006** - Animation polish (13 hrs)

### Backlog: Low Priority
**Estimated Effort:** 30 hours

All remaining VIS-008+, UX-009+, A11Y-008+, MOB-007+, INT-007+ items

---

## Files Most Needing Attention

| File | Issue Count | Categories |
|------|-------------|------------|
| `ActivityFeed.tsx` | 18+ | VIS, A11Y |
| `NotificationModal.tsx` | 18+ | VIS (duplicate of ActivityFeed) |
| `DoerDashboard.tsx` | 12+ | VIS, Mobile |
| `TodoItem.tsx` | 15+ | A11Y, INT, Mobile |
| `Modal.tsx` | 8+ | Mobile, A11Y |
| `FileImporter.tsx` | 30+ | VIS (no dark mode) |
| `Button.tsx` | - | Template for fixes |
| `globals.css` | 5+ | VIS, A11Y |
| `design-tokens.ts` | 3+ | VIS (conflicts) |
| `KanbanBoard.tsx` | 3+ | Mobile, INT |

---

## Design System Recommendations

### 1. Create Semantic Color Tokens for Actions
```typescript
// Add to design-tokens.ts
export const ACTION_COLORS = {
  created: SEMANTIC_COLORS.success,
  updated: SEMANTIC_COLORS.primary,
  deleted: SEMANTIC_COLORS.danger,
  completed: SEMANTIC_COLORS.completed,
  reopened: SEMANTIC_COLORS.warning,
  // ... 10+ more actions
};
```

### 2. Add Transition Duration Tokens
```css
/* Add to globals.css */
:root {
  --duration-instant: 100ms;
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
}
```

### 3. Create Semantic Typography Classes
```css
.text-page-title { @apply text-2xl font-bold; } /* 24px */
.text-section-title { @apply text-xl font-semibold; } /* 20px */
.text-task-title { @apply text-[15px] font-medium; }
.text-body { @apply text-sm; } /* 14px */
.text-caption { @apply text-xs; } /* 12px - minimum */
```

### 4. Mobile-First Component Patterns
```css
/* Recommended touch targets */
:root {
  --touch-target-min: 44px;
  --touch-spacing-min: 8px;
}
```

---

## Testing Recommendations

### Automated Tools
- **Axe DevTools** - WCAG scanning
- **Lighthouse** - Performance + A11y
- **Playwright** - Cross-browser testing

### Manual Testing Checklist
- [ ] Test all modals on iPhone SE (320px)
- [ ] Verify Kanban on mobile
- [ ] Navigate with keyboard only
- [ ] Test with VoiceOver/NVDA
- [ ] Enable reduced motion
- [ ] Check dark mode consistency
- [ ] Verify all color contrast ratios

---

**Last Updated:** 2026-02-03
**Reviewed By:** Product & Design Multi-Agent Orchestration
