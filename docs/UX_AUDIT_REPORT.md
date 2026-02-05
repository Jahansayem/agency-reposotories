# UX/UI Audit Report - Dashboard & Navigation
**Date:** 2026-02-04
**Auditor:** Claude Code (Automated UX Testing)
**App Version:** Current Development Build

---

## Executive Summary

This audit systematically tested all clickable elements, navigation flows, and user paths through the dashboard and main app views. **28 console errors** were logged during testing, primarily related to API failures. Several UX issues were identified ranging from critical bugs to minor improvements.

---

## Critical Issues (P0 - Fix Immediately)

### 1. Agency Metrics API Failure
**Location:** Dashboard view
**Severity:** Critical
**Frequency:** Every page load

**Description:**
The dashboard repeatedly fails to fetch agency metrics, causing console errors and potentially displaying incorrect data.

**Error Details:**
```
[ERROR] Failed to fetch agency metrics
Source: src/hooks/useAgencyMetrics.ts:110:14
```

**User Impact:**
- Users see "$0" for Premium MTD, Policies, Pipeline
- Error notification "1 Issue" appears in bottom-left
- Dashboard displays incomplete/inaccurate data

**Recommendation:**
1. Fix the `fetchMetrics` function in `useAgencyMetrics.ts`
2. Add graceful error handling with user-friendly message
3. Implement retry logic with exponential backoff

---

### 2. Strategic Goals Modal Blocks Navigation
**Location:** Sidebar → Strategic Goals
**Severity:** Critical

**Description:**
Clicking "Strategic Goals" opens a full-screen modal overlay that covers the entire sidebar navigation. Users cannot access other navigation items without first closing this modal.

**Steps to Reproduce:**
1. Click "Strategic Goals" in sidebar
2. Observe that Archive, Weekly Progress, etc. are now inaccessible
3. User must press Escape or click small X to close

**User Impact:**
- Confusing navigation - user gets "stuck" in Goals view
- Small X button is easy to miss
- Breaks expected navigation pattern

**Recommendation:**
1. Make Strategic Goals a regular view (not modal) OR
2. Add visible "Close" button at top OR
3. Allow clicking outside modal to close

---

## High Priority Issues (P1)

### 3. Inconsistent "View All Quotes" Behavior
**Location:** Dashboard → Pipeline Health → "View All Quotes"
**Severity:** High

**Description:**
Clicking "View All Quotes" navigates to Tasks view with filters applied, but this is not clear to the user. Expected behavior would be either:
- Opening a dedicated Quotes view/modal
- Showing a filtered task list with clear "Quotes" context

**Recommendation:**
Add visual indication that user has navigated to filtered task view, or create dedicated quotes panel.

---

### 4. Team Production - Display Bug
**Location:** Dashboard → Team Production panel
**Severity:** High

**Description:**
One team member (Sefra) shows "11s" instead of expected task count or time value. This appears to be a data formatting or display bug.

**Screenshot Reference:** `04-dashboard-view.png`

**Recommendation:**
Investigate data source for Team Production panel and fix formatting.

---

### 5. Floating Chat Button Overlap
**Location:** All views (bottom-right corner)
**Severity:** Medium-High

**Description:**
The floating chat button can overlap with content in certain scroll positions, making underlying content difficult to interact with.

**Recommendation:**
Add margin/padding to content areas to prevent overlap, or make button draggable/minimizable.

---

## Medium Priority Issues (P2)

### 6. Task Quick Edit Expands Unexpectedly
**Location:** Tasks view
**Severity:** Medium

**Description:**
Clicking anywhere on a task row can trigger the quick edit form (showing date picker, assignee, priority), even when user just wants to view the task.

**Screenshot Reference:** `05-view-quotes-click.png`

**Recommendation:**
1. Make quick edit only trigger on specific edit icon
2. Add clear visual affordance for "click to edit" vs "click to view"

---

### 7. Empty State Messaging
**Location:** Dashboard → Pipeline Health, Renewals panels
**Severity:** Medium

**Description:**
Multiple panels show "0" values without context:
- Pipeline Health: All zeros with no helpful message
- Renewals: "No renewals in the next 30 days" (better)

**Recommendation:**
Add helpful empty state messages like:
- "No quotes in progress - click 'New Task' to start"
- "Pipeline is clear - great job!"

---

### 8. Error Notification Location
**Location:** Bottom-left corner
**Severity:** Medium

**Description:**
The "1 Issue" error notification appears in bottom-left but clicking it shows developer-focused error details (stack traces) rather than user-friendly information.

**Recommendation:**
1. Move to more visible location (top bar?)
2. Show user-friendly error message
3. Keep technical details in expandable section

---

### 9. Overdue Count Mismatch
**Location:** Dashboard
**Severity:** Medium

**Description:**
Dashboard shows multiple overdue counts that may confuse users:
- "16 team tasks overdue" (banner)
- "10 tasks overdue" (Your Stats)
- "10 are yours" (banner detail)

**Recommendation:**
Clarify labeling: "16 team total (10 yours)" or consolidate displays.

---

## Low Priority Issues (P3)

### 10. Mobile Chat Panel Persistence
**Location:** Mobile view
**Severity:** Low

**Description:**
When switching to mobile view, the chat panel remains open and must be manually closed, reducing visible content area.

**Recommendation:**
Auto-close chat panel when viewport resizes to mobile.

---

### 11. Sidebar Collapse State Not Persisted
**Location:** Desktop sidebar
**Severity:** Low

**Description:**
Sidebar collapse/expand state may not persist across page reloads.

**Recommendation:**
Save collapse state to localStorage.

---

### 12. Keyboard Shortcuts Discovery
**Location:** Global
**Severity:** Low

**Description:**
The keyboard shortcuts button shows "?" hint but many users won't discover Cmd+K command palette or other shortcuts.

**Recommendation:**
Add onboarding tooltip or first-time help overlay.

---

## Accessibility Issues

### 13. Color Contrast (Pre-existing)
**Location:** Multiple components
**Severity:** High (WCAG 2.1 AA)

**Description:**
Dark mode button colors have insufficient contrast:
- Sky blue (#72B5E8) on dark backgrounds: 2.21:1 (needs 4.5:1)
- Some badge text contrast ratios are below standards

**Recommendation:**
Use darker accent color for dark mode buttons, or lighter text.

---

### 14. Focus Indicators
**Location:** Multiple buttons
**Severity:** Medium

**Description:**
Some buttons lack visible focus indicators when navigating via keyboard.

**Recommendation:**
Ensure all interactive elements have visible `:focus-visible` styles.

---

## Performance Notes

### Console Errors Logged: 28
- 24 related to agency metrics fetch failures
- 4 related to other API calls

### Page Load Observations
- Fast Refresh cycles frequently during development
- No significant render blocking observed
- Real-time connection shows "Live" status

---

## Positive Findings

1. **Navigation Structure** - Clear sidebar with logical grouping (Primary, More, Utility)
2. **Mobile Responsive** - Bottom navigation works well on mobile
3. **Log Sale Modal** - Clean, focused form design
4. **Chat Integration** - Smooth slide-in panel, shows connected status
5. **Quick Filters** - Task list filter bar is intuitive
6. **Visual Hierarchy** - Dashboard cards have clear sectioning
7. **Real-time Updates** - "Live" indicator provides confidence
8. **Keyboard Support** - Escape key properly closes modals

---

## Recommended Priority Order

1. **CRITICAL**: Fix agency metrics API errors (P0)
2. **CRITICAL**: Fix Strategic Goals modal blocking navigation (P0)
3. **HIGH**: Fix Team Production display bug (P1)
4. **HIGH**: Fix color contrast for accessibility (P1)
5. **MEDIUM**: Improve empty states and error messaging (P2)
6. **LOW**: Polish mobile experience (P3)

---

## Screenshots Reference

All screenshots saved to `.playwright-mcp/` directory:
- `01-login-screen.png` - Initial login
- `04-dashboard-view.png` - Full dashboard (main audit view)
- `05-view-quotes-click.png` - After clicking View All Quotes
- `08-log-sale-modal.png` - Log Sale modal design
- `11-issue-notification-click.png` - Error notification detail
- `12-blocking-modal.png` - Strategic Goals blocking issue
- `14-chat-panel.png` - Chat slide-in panel
- `15-mobile-view.png` - Mobile chat view
- `16-mobile-dashboard.png` - Mobile dashboard layout

---

## Appendix: Test Coverage

### Interactive Elements Tested
- [x] Sidebar navigation (Tasks, AI Inbox, Dashboard, Strategic Goals, Archive)
- [x] Utility buttons (Weekly Progress, Shortcuts)
- [x] Dashboard action buttons (View All Quotes, View Full Team, View Full Calendar)
- [x] Log Sale modal
- [x] Overdue alerts and task cards
- [x] Error notification
- [x] Chat floating button
- [x] Mobile bottom navigation

### Views Tested
- [x] Tasks view
- [x] Dashboard view
- [x] AI Inbox
- [x] Strategic Goals
- [x] Chat panel
- [x] Mobile responsive layout

---

*Report generated automatically via Playwright MCP testing*
