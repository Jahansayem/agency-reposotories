# Product Requirements Document: Frontend Improvements
## Bealer Agency Todo List - Performance & UX Optimization Roadmap

**Version:** 1.0
**Created:** 2026-01-29
**Product Owner:** Derrick Bealer
**Target Completion:** Q2 2026
**Document Type:** Engineering-Focused PRD

---

## Executive Summary

This PRD outlines a prioritized roadmap to address critical frontend technical debt and UX issues identified during a comprehensive code review. The improvements are organized by business impact, user segment affected, and effort required.

### Key Metrics to Improve

| Metric | Current | Target | Impact |
|--------|---------|--------|--------|
| Time to Interactive | 2-3 seconds | < 1.5 seconds | User retention +15% |
| Initial bundle size | ~400KB+ | < 250KB | Mobile conversion +10% |
| Component render efficiency | 9 filter passes | 1 pass | CPU usage -60% |
| Mobile task completion rate | Est. 70% | 90% | Productivity +25% |
| Form abandonment rate | Unknown | < 10% | Data integrity improved |

---

## Business Impact Assessment

### Revenue & Retention Impact

| Issue Category | Business Impact | Affected Revenue Stream |
|----------------|-----------------|------------------------|
| **Mobile UX Issues** | High | 40% of users on mobile; poor UX = reduced adoption |
| **Performance Issues** | High | Slow loads = user frustration = churn risk |
| **Form Issues** | Medium | Lost data = repeated work = productivity loss |
| **Inconsistent UI** | Medium | Perceived quality affects trust in product |
| **Architecture Debt** | Low (internal) | Slower feature development, higher bug rate |

### User Satisfaction Impact

```
Issue Type              Impact on Satisfaction (1-10)
────────────────────────────────────────────────────
Mobile touch targets         9  [Critical]
Loading performance          8  [High]
Form validation feedback     7  [Medium-High]
Button/UI consistency        6  [Medium]
Chat mobile responsiveness   7  [Medium-High]
Priority badge visibility    5  [Medium]
```

---

## User Segments Affected

### Segment Analysis Matrix

| Segment | Size | Issues Affecting Them | Priority |
|---------|------|----------------------|----------|
| **Mobile Users** | 40% | Touch targets, chat panel, performance | P0 |
| **Power Users (Derrick)** | 10% | Keyboard shortcuts, bulk actions, Kanban | P1 |
| **New Users** | Variable | Form validation, loading states, onboarding | P1 |
| **Desktop Users** | 60% | Performance, consistency, state management | P2 |
| **Team Members** | 90% | All above (except owner-only features) | P0-P2 |

### User Journey Impact Map

```
User Journey Stage    Issues                              Severity
─────────────────────────────────────────────────────────────────
Login                 None identified                     OK
Dashboard Load        2-3s TTI, duplicate API calls       HIGH
Task Creation         Missing validation, no dirty state  MEDIUM
Task Management       9x filter passes, Date recreation   HIGH
Kanban Usage          27 props, poor memoization          MEDIUM
Chat (Mobile)         < 640px broken, touch targets       CRITICAL
Chat (Desktop)        1,129 lines monolith                LOW
Settings/Prefs        None identified                     OK
```

---

## Effort vs Impact Quadrant Analysis

```
                    HIGH IMPACT
                        │
     ┌──────────────────┼──────────────────┐
     │                  │                  │
     │  QUICK WINS      │  STRATEGIC       │
     │  (Do First)      │  (Plan Sprints)  │
     │                  │                  │
     │  • Bundle        │  • Component     │
     │    splitting     │    refactoring   │
     │  • Date memos    │  • State mgmt    │
     │  • React.memo    │  • Schema        │
     │  • Touch targets │    normalization │
LOW  │                  │                  │  HIGH
EFFORT ──────────────────┼────────────────── EFFORT
     │                  │                  │
     │  FILL-INS        │  AVOID/DEFER     │
     │  (Backlog)       │  (Reassess)      │
     │                  │                  │
     │  • Badge colors  │  • Full PWA      │
     │  • Error msgs    │  • Offline mode  │
     │  • Skeleton      │  • Full rewrite  │
     │    consistency   │                  │
     │                  │                  │
     └──────────────────┼──────────────────┘
                        │
                   LOW IMPACT
```

### Quadrant Details

#### Quick Wins (High Impact, Low Effort) - Sprint 1-2
1. **Icon Bundle Optimization** - 50-100KB savings
2. **Date Object Memoization** - Prevent re-renders
3. **React.memo Implementation** - Reduce re-renders by 40%
4. **Mobile Touch Targets** - Fix 48px minimum compliance
5. **Duplicate API Call Fix** - Eliminate double fetch

#### Strategic Projects (High Impact, High Effort) - Sprint 3-6
1. **Component Refactoring** - Break 2,887-line TodoList into modules
2. **State Management** - Implement Zustand consistently
3. **Form System** - Unified validation and dirty state tracking
4. **Chat Mobile Redesign** - Full mobile-responsive chat

#### Fill-Ins (Low Impact, Low Effort) - Sprint 7+
1. **Priority Badge Visual Weight** - Color/size adjustments
2. **Error Message Improvements** - More specific feedback
3. **Skeleton Pattern Unification** - Consistent loading states

#### Defer/Avoid (Low Impact, High Effort)
1. **Full PWA Implementation** - Consider after core issues resolved
2. **Offline Mode** - Complex, low user demand currently
3. **Complete Architecture Rewrite** - Use incremental approach instead

---

## Sprint Planning Recommendation

### Sprint 1-2: Performance Foundation (Weeks 1-4)

**Theme:** Quick Wins + Performance Critical Path
**Goal:** Reduce TTI from 2-3s to < 2s

#### Sprint 1: Bundle & Render Optimization

| Task | Effort | Impact | Owner |
|------|--------|--------|-------|
| Implement tree-shaken icon imports | 2 points | High | Frontend |
| Add React.memo to 15 key components | 3 points | High | Frontend |
| Memoize Date calculations in formatDueDate | 1 point | Medium | Frontend |
| Fix duplicate todos API call | 1 point | High | Frontend |
| Add bundle analyzer to CI | 2 points | Medium | DevOps |

**Sprint 1 Acceptance Criteria:**
- [ ] Bundle size reduced by 50KB+
- [ ] No duplicate API calls in network tab
- [ ] React DevTools shows < 5 re-renders per user action

#### Sprint 2: Mobile Touch & Filter Optimization

| Task | Effort | Impact | Owner |
|------|--------|--------|-------|
| Audit and fix touch targets < 48px | 3 points | Critical | Frontend |
| Consolidate 9 filter passes into 1 | 3 points | High | Frontend |
| Fix chat panel mobile layout | 5 points | Critical | Frontend |
| Add touch-action CSS properties | 1 point | Medium | Frontend |
| Mobile viewport meta optimization | 1 point | Medium | Frontend |

**Sprint 2 Acceptance Criteria:**
- [ ] All interactive elements meet 48px minimum
- [ ] Single filter pass in useMemo
- [ ] Chat usable on 320px viewport

---

### Sprint 3-4: Component Architecture (Weeks 5-8)

**Theme:** Technical Debt Reduction
**Goal:** Reduce largest component from 2,887 to < 500 lines each

#### Sprint 3: TodoList Decomposition

| Task | Effort | Impact | Owner |
|------|--------|--------|-------|
| Extract TodoFilters component | 3 points | Medium | Frontend |
| Extract TodoActions component | 3 points | Medium | Frontend |
| Create useTodoFiltering hook | 5 points | High | Frontend |
| Create useTodoSubscription hook | 3 points | Medium | Frontend |
| Add feature flag for new components | 1 point | Low | Frontend |

**Sprint 3 Acceptance Criteria:**
- [ ] TodoList.tsx < 1,000 lines
- [ ] New components have unit tests
- [ ] Feature flag allows rollback

#### Sprint 4: KanbanBoard & TodoItem Refactoring

| Task | Effort | Impact | Owner |
|------|--------|--------|-------|
| Reduce KanbanBoard props (27 → 8 via context) | 5 points | High | Frontend |
| Extract KanbanColumn component | 3 points | Medium | Frontend |
| Extract KanbanCard component | 3 points | Medium | Frontend |
| Refactor TodoItem (1,601 lines) | 5 points | Medium | Frontend |
| Create TodoItemActions sub-component | 2 points | Low | Frontend |

**Sprint 4 Acceptance Criteria:**
- [ ] KanbanBoard props < 10
- [ ] KanbanBoard.tsx < 600 lines
- [ ] TodoItem.tsx < 600 lines

---

### Sprint 5-6: Form System & UI Consistency (Weeks 9-12)

**Theme:** UX Polish & Data Integrity
**Goal:** Zero form data loss, consistent UI

#### Sprint 5: Form System Implementation

| Task | Effort | Impact | Owner |
|------|--------|--------|-------|
| Create useForm hook with validation | 5 points | High | Frontend |
| Implement dirty state tracking | 3 points | High | Frontend |
| Add email/phone validation patterns | 2 points | Medium | Frontend |
| Create FormField wrapper component | 3 points | Medium | Frontend |
| Add unsaved changes warning | 2 points | High | Frontend |

**Sprint 5 Acceptance Criteria:**
- [ ] All forms use useForm hook
- [ ] Browser warns on unsaved changes
- [ ] Email/phone validation works

#### Sprint 6: UI Component Library Consistency

| Task | Effort | Impact | Owner |
|------|--------|--------|-------|
| Audit all button variants in use | 1 point | Low | Frontend |
| Migrate inline buttons to Button component | 3 points | Medium | Frontend |
| Unify loading skeleton patterns | 2 points | Low | Frontend |
| Standardize priority badge styling | 2 points | Medium | Frontend |
| Document component usage in Storybook | 3 points | Low | Frontend |

**Sprint 6 Acceptance Criteria:**
- [ ] 90% of buttons use Button component
- [ ] One skeleton pattern throughout
- [ ] Priority badges have clear visual hierarchy

---

## Success Metrics by Improvement

### Performance Metrics

| Improvement | Metric | Baseline | Target | Measurement |
|-------------|--------|----------|--------|-------------|
| Icon bundling | Bundle size | ~400KB | < 300KB | Webpack analyzer |
| React.memo | Re-renders | ~50/action | < 10/action | React DevTools |
| Filter consolidation | CPU time | ~15ms | < 5ms | Performance profiler |
| API deduplication | Network calls | 2x/load | 1x/load | Network tab |
| Date memoization | GC pressure | High | Low | Memory profiler |

### UX Metrics

| Improvement | Metric | Baseline | Target | Measurement |
|-------------|--------|----------|--------|-------------|
| Touch targets | Tap accuracy | Unknown | > 95% | User testing |
| Chat mobile | Task completion | Est. 70% | > 90% | Analytics |
| Form validation | Submission errors | Unknown | < 5% | Error tracking |
| Loading states | Perceived speed | Poor | Good | User survey |
| UI consistency | Design system compliance | ~50% | > 90% | Design audit |

### Business Metrics

| Improvement | Metric | Baseline | Target | Measurement |
|-------------|--------|----------|--------|-------------|
| Overall | Daily Active Users | Current | +10% | Analytics |
| Mobile | Mobile session duration | Current | +20% | Analytics |
| Performance | Bounce rate | Current | -15% | Analytics |
| Forms | Form completion rate | Unknown | > 95% | Analytics |

---

## Technical Implementation Details

### 1. Icon Bundle Optimization

**Current State:**
```typescript
// BAD: Imports entire icon library (~100KB)
import { Search, AlertTriangle, ArrowUpDown, User, ... } from 'lucide-react';
```

**Target State:**
```typescript
// GOOD: Tree-shaken imports (~5KB per icon used)
import Search from 'lucide-react/icons/search';
import AlertTriangle from 'lucide-react/icons/alert-triangle';
```

**Or use dynamic imports:**
```typescript
// Alternative: Dynamic icon loading
const iconComponents = {
  Search: dynamic(() => import('lucide-react/icons/search')),
  AlertTriangle: dynamic(() => import('lucide-react/icons/alert-triangle')),
};
```

### 2. React.memo Implementation Plan

**Components to Memoize (Priority Order):**

1. `SortableTodoItem` - Rendered many times, rarely changes
2. `KanbanCard` - Rendered in lists, only changes on task update
3. `ChatMessageItem` - Many instances, rarely updated after render
4. `ActivityFeedItem` - Read-only after render
5. `DashboardStatCard` - Only updates on data change
6. `TodoFiltersBar` - Rarely changes
7. `SubtaskItem` - Many instances per task
8. `AttachmentItem` - Static after render
9. `UserAvatar` - Static, rendered many times
10. `PriorityBadge` - Static after render

**Implementation Pattern:**
```typescript
// Before
export function TodoItem({ todo, onUpdate }: Props) { ... }

// After
export const TodoItem = React.memo(function TodoItem({ todo, onUpdate }: Props) {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return prevProps.todo.id === nextProps.todo.id &&
         prevProps.todo.updated_at === nextProps.todo.updated_at;
});
```

### 3. Filter Consolidation

**Current State (9 passes):**
```typescript
const filtered = todos
  .filter(t => !t.completed)          // Pass 1
  .filter(t => matchesSearch(t))      // Pass 2
  .filter(t => matchesPriority(t))    // Pass 3
  .filter(t => matchesAssignee(t))    // Pass 4
  .filter(t => matchesDueDate(t))     // Pass 5
  .filter(t => matchesStatus(t))      // Pass 6
  .filter(t => matchesQuickFilter(t)) // Pass 7
  .filter(t => !isArchived(t))        // Pass 8
  .filter(t => matchesTags(t));       // Pass 9
```

**Target State (1 pass):**
```typescript
const filtered = useMemo(() => {
  return todos.filter(todo => {
    // Single pass with all conditions
    if (todo.completed && !showCompleted) return false;
    if (searchQuery && !matchesSearch(todo, searchQuery)) return false;
    if (priorityFilter && todo.priority !== priorityFilter) return false;
    if (assigneeFilter && todo.assigned_to !== assigneeFilter) return false;
    if (dueDateFilter && !matchesDueDate(todo, dueDateFilter)) return false;
    if (statusFilter && todo.status !== statusFilter) return false;
    if (quickFilter && !matchesQuickFilter(todo, quickFilter)) return false;
    if (todo.archived_at) return false;
    if (tagsFilter.length && !matchesTags(todo, tagsFilter)) return false;
    return true;
  });
}, [todos, showCompleted, searchQuery, priorityFilter, assigneeFilter,
    dueDateFilter, statusFilter, quickFilter, tagsFilter]);
```

### 4. Date Memoization

**Current State (recreates on every render):**
```typescript
const formatDueDate = (date: string) => {
  const d = new Date(date);
  const today = new Date();       // New object every call
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); // Another new object
  // ...
};
```

**Target State (memoized):**
```typescript
// Cached date boundaries, refreshed daily
const getDateBoundaries = (() => {
  let cached: { today: Date; tomorrow: Date; lastRefresh: number } | null = null;

  return () => {
    const now = Date.now();
    const ONE_MINUTE = 60000;

    if (!cached || now - cached.lastRefresh > ONE_MINUTE) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      cached = { today, tomorrow, lastRefresh: now };
    }

    return cached;
  };
})();

const formatDueDate = (date: string) => {
  const { today, tomorrow } = getDateBoundaries();
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
```

### 5. Mobile Touch Target Fixes

**Minimum Requirements:**
- All buttons: min 48px x 48px
- All form inputs: min 48px height
- Tap targets: 8px minimum spacing

**CSS Pattern:**
```css
/* Base touch target */
.touch-target {
  min-width: 48px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* For smaller visual elements, use padding */
.icon-button {
  padding: 12px; /* Creates 48px target from 24px icon */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
```

**Components to Fix:**
1. Chat message reaction buttons
2. Subtask checkboxes
3. Kanban card action buttons
4. Filter dropdown triggers
5. Mobile navigation tabs

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Component refactoring breaks features | Medium | High | Feature flags, extensive E2E tests |
| Performance regressions | Low | Medium | Automated Lighthouse CI |
| Mobile layout bugs | Medium | High | Device testing matrix |
| State management migration issues | Medium | Medium | Incremental adoption with dual-write |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| User disruption during rollout | Low | High | Feature flags, staged rollout |
| Extended development time | Medium | Medium | Prioritize quick wins first |
| Scope creep | High | Medium | Strict sprint boundaries |

---

## Dependencies & Prerequisites

### Before Sprint 1

- [ ] Sentry error tracking configured (from REFACTORING_PLAN.md Phase 1)
- [ ] Vitest unit testing framework ready
- [ ] Feature flag system operational
- [ ] Bundle analyzer in CI pipeline

### Before Sprint 3

- [ ] Zustand state management installed
- [ ] Component architecture documented
- [ ] Unit test coverage > 30% on affected components

### Before Sprint 5

- [ ] Form validation library selected (react-hook-form recommended)
- [ ] Design system documentation started
- [ ] User testing recruitment for mobile fixes

---

## Appendix A: Component Size Analysis

| Component | Lines | useEffect | Props | Priority |
|-----------|-------|-----------|-------|----------|
| TodoList.tsx | 2,887 | 12 | 8 | P0 |
| KanbanBoard.tsx | 1,683 | 6 | 27 | P0 |
| TodoItem.tsx | 1,601 | 8 | 18 | P1 |
| StrategicDashboard.tsx | 1,495 | 7 | 3 | P2 |
| DashboardModal.tsx | 1,284 | 5 | 6 | P2 |
| TaskDetailPanel.tsx | 1,193 | 4 | 12 | P1 |
| ChatPanel.tsx | 1,129 | 9 | 5 | P1 |
| TaskBottomSheet.tsx | 1,068 | 4 | 14 | P2 |
| FileImporter.tsx | 1,058 | 3 | 4 | P3 |
| ArchiveView.tsx | 844 | 5 | 3 | P3 |

---

## Appendix B: useEffect Hook Inventory

**Total useEffect hooks across codebase: 166**

**Components with 5+ hooks (refactoring candidates):**
- TodoList.tsx: 12 hooks
- ChatPanel.tsx: 9 hooks
- TodoItem.tsx: 8 hooks
- StrategicDashboard.tsx: 7 hooks
- KanbanBoard.tsx: 6 hooks
- DashboardModal.tsx: 5 hooks
- ArchiveView.tsx: 5 hooks

**Consolidation Target:** Reduce to 80 total hooks via custom hook extraction.

---

## Appendix C: Button Variant Audit

**Standardized Button Component Variants:**
- primary, secondary, danger, warning, ghost, outline, brand, success

**Non-Standard Button Patterns Found (to migrate):**
- Inline styles in TodoItem snooze menu
- OAuthLoginButtons with custom styling
- TaskCompletionSummary with mixed patterns
- Various ad-hoc button styles throughout

**Migration Priority:**
1. High-frequency user paths (task actions)
2. Form submission buttons
3. Navigation buttons
4. Utility/settings buttons

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-29 | Engineering | Initial PRD based on frontend review |

---

**Next Steps:**
1. Review and approve sprint plan with stakeholders
2. Create JIRA/Linear tickets from this PRD
3. Schedule sprint planning meeting
4. Begin Sprint 1 implementation

**Questions?** Contact the Engineering team or Product Owner.
