# Claude Code Prompts — Navigation UX Fixes

> **Usage**: Run these as separate Claude Code sessions on git worktrees for parallelism.
> Each prompt is self-contained and follows the project's multi-agent orchestration patterns
> defined in ORCHESTRATOR.md.
>
> **Pipeline Stage**: Implementation → Validation (Stage 3-4)
>
> **Parallel group** (Agents 1-3 run simultaneously on worktrees):
> - Agent 1 (Frontend Engineer): Accessibility (A1-A4)
> - Agent 2 (Frontend Engineer): Z-Index System (Z1-Z4)
> - Agent 3 (Frontend Engineer): Polish batch 1 (P1-P5)
>
> **Sequential** (Agent 4 runs after parallel group merges):
> - Agent 4 (Frontend Engineer): Dedup + Mobile + Polish batch 2 (D1-D2, M1, P6-P11)
>
> **Validation** (Agent 5 runs last):
> - Agent 5 (Code Reviewer): Full nav component review + sign-off

---

## Pipeline Status Tracking

```
Feature: Navigation UX Fixes (21 items)
Status: Complete

┌──────────────────────────────────────────────────────────────┐
│ [✓] Tech Lead          - Architecture: NAV_UX_TODO.md        │
│ [✓] Frontend Engineer  - Agent 1: Accessibility (A1-A4)      │
│ [✓] Frontend Engineer  - Agent 2: Z-Index System (Z1-Z4)     │
│ [✓] Frontend Engineer  - Agent 3: Polish batch 1 (P1-P5)     │
│ [✓] Frontend Engineer  - Agent 4: Dedup+Mobile+Polish (D1-D2,M1,P6-P11) │
│ [✓] Code Reviewer      - Agent 5: Validation + sign-off      │
└──────────────────────────────────────────────────────────────┘

Legend: [✓] Complete  [~] In Progress  [ ] Pending  [!] Blocked
```

---

## Agent 1: Frontend Engineer — Accessibility Criticals (A1-A4)

```
You are the Frontend Engineer agent for this project. Load your required context:

1. Read ORCHESTRATOR.md sections: #critical-constraints, #component-architecture
2. Read docs/NAV_UX_TODO.md for the issue list
3. Read .serena/memories/code_style_conventions.md
4. Read .serena/memories/critical_patterns.md

Then read the implementation files:
- src/components/UserMenu.tsx
- src/components/AgencySwitcher.tsx
- src/components/NotificationModal.tsx
- src/components/layout/NavigationSidebar.tsx
- src/hooks/useFocusTrap.ts (existing hook to reuse)

Use Serena tools where helpful:
- find_symbol to locate dropdown handlers and menu render functions
- find_referencing_symbols to check what imports/uses these components
- get_symbols_overview on each file before editing to understand structure

---

Fix these 4 critical accessibility issues (legal/compliance risks):

A1. UserMenu.tsx — The dropdown uses role="menu" with menuitem children but has NO arrow-key handling. Add an onKeyDown handler:
   - ArrowDown: focus next menuitem
   - ArrowUp: focus previous menuitem
   - Home: focus first menuitem
   - End: focus last menuitem
   - Escape: close menu and return focus to trigger
   - Enter/Space: activate focused item
   Use querySelectorAll('[role="menuitem"]') to collect focusable items.

A2. AgencySwitcher.tsx — The dropdown uses role="listbox" with option children but no arrow-key nav. Same keyboard pattern as A1 but with role="option" selectors. Also add aria-activedescendant management pointing to the currently focused option's id.

A3. NotificationModal.tsx — Has role="dialog" but missing aria-modal="true" and no focus trap. Import and use src/hooks/useFocusTrap.ts. Add aria-modal="true" to the dialog container. Ensure focus returns to the trigger element on close.

A4. NavigationSidebar.tsx — When collapsed, icon buttons have NO accessible name. Add aria-label to every icon button matching the tooltip text (e.g., aria-label="Tasks", aria-label="Dashboard").

---

After implementing, run the task completion checklist from .serena/memories/task_completion_checklist.md:
- npm run lint
- npx tsc --noEmit
- npm run build
- npm run test -- --filter="layout\|UserMenu\|AgencySwitcher\|Notification"

Then write a handoff document to .serena/memories/agent_handoffs.md using this format:

## Handoff: Nav Accessibility Fixes (A1-A4)
- **Date**: [today]
- **From Agent**: Frontend Engineer (Agent 1)
- **To Agent**: Code Reviewer (Agent 5)
- **Status**: Complete

### Completed Work
- [list what was done]

### Files Modified
- [table of files and changes]

### Key Context
- [patterns used, decisions made, anything Agent 5 needs for review]

Commit with message: "fix(a11y): add keyboard nav, focus traps, and accessible names to nav components"
```

---


## Agent 2: Frontend Engineer — Z-Index System (Z1-Z4)

```
You are the Frontend Engineer agent for this project. Load your required context:

1. Read ORCHESTRATOR.md sections: #critical-constraints, #component-architecture
2. Read docs/NAV_UX_TODO.md for the issue list
3. Read .serena/memories/code_style_conventions.md

Use Serena tools for discovery:
- search_for_pattern with regex "z-50|z-\d+" across src/components/ to find ALL z-index usages
- get_symbols_overview on each affected file before editing

---

The project has a broken z-index system: ~30 components all use z-50, the app bar is z-10 (too low), and the sidebar has NO z-index. Fix this with a formal scale.

Step 1: Create src/lib/z-index.ts:

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

Step 2: Fix the three critical nav files:
- src/components/layout/UnifiedAppBar.tsx — z-10 → zClass.sticky
- src/components/layout/NavigationSidebar.tsx — add zClass.sticky
- src/components/NotificationModal.tsx — overlay → zClass.overlay, content → zClass.modal

Step 3: Project-wide z-50 audit. Run:
  grep -rn "z-50" src/components/ --include="*.tsx"

For each hit, determine correct tier:
- Dropdowns/popovers within components → zClass.dropdown or zClass.popover
- Modal overlays/backdrops → zClass.overlay
- Modal content panels → zClass.modal
- Toast notifications → zClass.toast
- Tooltips → zClass.tooltip

Do NOT change z-index in src/components/ui/ (shadcn primitives).

---

Run the task completion checklist:
- npm run lint
- npx tsc --noEmit
- npm run build

Write handoff to .serena/memories/agent_handoffs.md:

## Handoff: Z-Index System (Z1-Z4)
- **Date**: [today]
- **From Agent**: Frontend Engineer (Agent 2)
- **To Agent**: Code Reviewer (Agent 5)
- **Status**: Complete

### Completed Work
- [list changes]

### Files Modified
- [table: file, old z-index, new z-index tier]

### Key Context
- Full mapping of old → new z-index values for review
- Any components where tier assignment was ambiguous

Commit with message: "refactor: implement formal z-index scale and fix layering hierarchy"
```

---


## Agent 3: Frontend Engineer — Polish Batch 1 (P1-P5)

```
You are the Frontend Engineer agent for this project. Load your required context:

1. Read ORCHESTRATOR.md sections: #critical-constraints, #component-architecture
2. Read docs/NAV_UX_TODO.md for the issue list
3. Read .serena/memories/code_style_conventions.md

Use Serena tools:
- search_for_pattern "motion\." across src/components/ to find all Framer Motion usage
- find_symbol "useReducedMotion" to see if it's already imported anywhere
- find_referencing_symbols "AppHeader" to confirm dead code status (P5)

---

5 independent polish items that don't conflict with Agent 1 or Agent 2 work:

P1. NavigationSidebar.tsx — Add tooltips on collapsed sidebar icon buttons. Check if src/components/ui/tooltip.tsx exists. If yes, wrap each collapsed icon button with <Tooltip>. If no tooltip component exists, use title attribute as fallback.

P2. UserMenu.tsx — Fix incorrect keyboard shortcut display. Find where it shows "Cmd+K" for shortcuts modal, change to "?" (the actual shortcut per useKeyboardShortcuts.ts). Use find_symbol "Cmd+K" or search_for_pattern to locate.

P3. UnifiedAppBar.tsx — Add aria-live region for notification badge. Wrap the badge count in:
   <span role="status" aria-live="polite" className="sr-only">
     {count} unread notifications
   </span>

P4. prefers-reduced-motion — The project has src/hooks/useReducedMotion.ts. Search for Framer Motion usage:
   grep -rn "motion\." src/components/ --include="*.tsx" | head -30
   
   For nav components (NavigationSidebar, UnifiedAppBar, EnhancedBottomNav, AppShell), add:
   const prefersReducedMotion = useReducedMotion();
   Then conditionally disable/simplify animations when true.
   For non-nav components, add a TODO comment: // TODO: respect prefers-reduced-motion

P5. Delete dead code: src/components/layout/AppHeader.tsx. Verify unused:
   grep -rn "AppHeader" src/ --include="*.tsx" --include="*.ts"
   If confirmed, delete file and remove any export from index files.

---

Run task completion checklist:
- npm run lint
- npx tsc --noEmit
- npm run build

Write handoff to .serena/memories/agent_handoffs.md:

## Handoff: Nav Polish Batch 1 (P1-P5)
- **Date**: [today]
- **From Agent**: Frontend Engineer (Agent 3)
- **To Agent**: Code Reviewer (Agent 5)
- **Status**: Complete

### Completed Work
- [list what was done per item]

### Files Modified
- [table]

### Key Context
- Which components got full reduced-motion support vs TODO comments
- Whether tooltip component or title fallback was used
- Confirmation AppHeader was unused before deletion

Commit with message: "fix: tooltips, shortcut display, aria-live, reduced motion, remove dead code"
```

---


## Agent 4: Frontend Engineer — Dedup + Mobile + Remaining Polish (D1-D2, M1, P6-P11)

```
You are the Frontend Engineer agent for this project. Run AFTER Agents 1-3 are merged to main.

Load your required context:
1. Read ORCHESTRATOR.md sections: #critical-constraints, #component-architecture
2. Read docs/NAV_UX_TODO.md for remaining items
3. Read .serena/memories/code_style_conventions.md
4. Read .serena/memories/agent_handoffs.md — review what Agents 1-3 changed to avoid conflicts

Use Serena tools:
- find_referencing_symbols "NewTask" or "new-task" to find all "New Task" button instances (D1)
- find_referencing_symbols "logout" or "handleLogout" to find all logout instances (D2)
- get_symbols_overview on AppShell.tsx and NavigationSidebar.tsx to compare mobile vs desktop views (M1)

Read these files before editing:
- src/components/layout/AppShell.tsx
- src/components/layout/NavigationSidebar.tsx
- src/components/layout/UnifiedAppBar.tsx
- src/components/layout/EnhancedBottomNav.tsx
- src/components/UserMenu.tsx

---

### Deduplication (D1-D2)

D1 — "New Task" button exists in 3 places: top bar, sidebar, and mobile FAB. Audit all three. Keep in UnifiedAppBar (most discoverable) and as mobile FAB (thumb-reachable). Remove from sidebar. If there's a good contextual reason to keep it, add a comment explaining why instead of removing.

D2 — Logout appears in both sidebar footer AND UserMenu dropdown. Remove from sidebar footer. UserMenu is the standard location.

### Mobile Parity (M1)

M1 — AppShell.tsx MobileMenuContent only shows 4 of 10+ views. Read NavigationSidebar.tsx to get the full list of navigation items, then add ALL missing views to MobileMenuContent with matching icons, labels, and click handlers.

### Remaining Polish (P6-P11)

P6 — EnhancedBottomNav.tsx: Items use role="tab" without a role="tablist" container. Add role="tablist" to parent, ensure each tab has aria-selected reflecting active state.

P7 — Both sidebar and bottom nav have aria-label="Main navigation". Differentiate: sidebar → aria-label="Sidebar navigation", bottom nav → aria-label="Bottom navigation".

P8 — NavigationSidebar.tsx: Collapse toggle disappears when collapsed. Keep it visible as a small chevron icon at the top of the collapsed sidebar.

P9 — NavigationSidebar.tsx: Add scroll shadow when nav items overflow. Use a CSS pseudo-element gradient at the bottom that appears when content is scrollable.

P10 — NavigationSidebar.tsx: Active state too subtle (opacity only). Add a 3px left border accent (primary color) and slightly different background to the active item.

P11 — UnifiedAppBar.tsx: Left side is empty on non-task views. Add a breadcrumb or view title reflecting the current active view.

---

Run task completion checklist:
- npm run lint
- npx tsc --noEmit
- npm run build
- Test mobile responsiveness (verify MobileMenuContent shows all views)

Write handoff to .serena/memories/agent_handoffs.md:

## Handoff: Dedup + Mobile + Polish Batch 2 (D1-D2, M1, P6-P11)
- **Date**: [today]
- **From Agent**: Frontend Engineer (Agent 4)
- **To Agent**: Code Reviewer (Agent 5)
- **Status**: Complete

### Completed Work
- [list per item]

### Files Modified
- [table]

### Key Context
- Which buttons were removed vs kept (and why)
- Full list of mobile views added
- Any merge conflicts encountered from Agents 1-3 work

Commit with message: "fix: deduplicate nav actions, add mobile parity, polish nav UX"
```

---


## Agent 5: Code Reviewer — Validation & Sign-off

```
You are the Code Reviewer agent for this project (Stage 4: Validation).

Load your required context:
1. Read ORCHESTRATOR.md sections: #critical-constraints, #code-reviewer guidelines
2. Read docs/NAV_UX_TODO.md — the full 21-item checklist
3. Read .serena/memories/agent_handoffs.md — all 4 handoff reports from Agents 1-4
4. Read .serena/memories/task_completion_checklist.md
5. Read .serena/memories/critical_patterns.md

Use Serena tools for review:
- find_referencing_symbols to verify no broken imports after AppHeader.tsx deletion
- search_for_pattern "z-50" to confirm no remaining unaudited z-index values
- search_for_pattern "aria-label" across layout/ to verify accessible names
- get_symbols_overview on all modified files to check structure

---

Review ALL changes from Agents 1-4 against the project's code review checklist (ORCHESTRATOR.md Card 3):

### Accessibility Review (Agent 1 work)
- [ ] Keyboard nav in UserMenu works: Arrow keys, Home, End, Escape, Enter/Space
- [ ] Keyboard nav in AgencySwitcher works with aria-activedescendant
- [ ] NotificationModal has aria-modal="true" and functional focus trap
- [ ] Focus returns to trigger on modal/dropdown close
- [ ] All collapsed sidebar icons have descriptive aria-labels
- [ ] No new accessibility issues introduced

### Z-Index Review (Agent 2 work)
- [ ] src/lib/z-index.ts exists with typed scale
- [ ] No remaining z-50 in src/components/ (except src/components/ui/)
- [ ] UnifiedAppBar uses sticky tier (z-[200])
- [ ] NavigationSidebar has z-index assigned
- [ ] NotificationModal uses overlay (z-[300]) + modal (z-[400])
- [ ] No z-index regressions (dropdowns not hidden behind app bar, etc.)

### Polish Review (Agent 3 work)
- [ ] Tooltips appear on collapsed sidebar hover
- [ ] Shortcut display shows "?" not "Cmd+K"
- [ ] Notification badge has aria-live="polite"
- [ ] Nav components respect prefers-reduced-motion
- [ ] AppHeader.tsx deleted with no broken imports

### Dedup + Mobile + Polish Review (Agent 4 work)
- [ ] "New Task" button removed from sidebar (kept in app bar + mobile FAB)
- [ ] Logout removed from sidebar footer (kept in UserMenu)
- [ ] MobileMenuContent shows ALL navigation views matching sidebar
- [ ] EnhancedBottomNav has role="tablist" + aria-selected
- [ ] Sidebar and bottom nav have distinct aria-labels
- [ ] Collapse toggle visible when sidebar is collapsed
- [ ] Active nav item has left border accent + distinct background
- [ ] View title/breadcrumb in app bar on non-task views

### Cross-cutting checks
- [ ] Real-time subscriptions cleaned up in useEffect return (if any added)
- [ ] TypeScript strict compliance: npx tsc --noEmit passes
- [ ] Build succeeds: npm run build
- [ ] Tests pass: npm run test
- [ ] Mobile responsive (no layout breaks)
- [ ] Dark mode: dark: classes on all new UI elements

---

If issues found, create a fix list. For minor issues, fix them directly.
For major issues, write an agent message to .serena/memories/agent_handoffs.md:

---
from_agent: Code Reviewer
to_agent: Frontend Engineer
priority: high
blocking: true
---

## Issues Found
[list issues with file:line references]

## Expected Fix
[what needs to change]

---

When review passes, update docs/NAV_UX_TODO.md: check off all 21 items.

Then update the pipeline status at the top of this file (CLAUDE_CODE_NAV_PROMPTS.md):
- Mark all agents as [✓] Complete
- Change overall Status to: Complete

Commit with message: "review: validate all 21 nav UX fixes, update checklist"
```

---


## Orchestration Script

```bash
cd /Users/adrianstier/shared-todo-list

# ── Stage 3: Implementation (Parallel) ──────────────────────

# Create worktrees for parallel work
git worktree add .worktrees/fix-a11y -b fix/nav-a11y
git worktree add .worktrees/fix-zindex -b fix/z-index-system
git worktree add .worktrees/fix-polish -b fix/nav-polish-1

# Copy docs to each worktree (they need the prompt file + todo list)
for wt in fix-a11y fix-zindex fix-polish; do
  cp docs/CLAUDE_CODE_NAV_PROMPTS.md .worktrees/$wt/docs/
  cp docs/NAV_UX_TODO.md .worktrees/$wt/docs/
done

# Run Claude Code in 3 terminals simultaneously:
# Terminal 1 (Agent 1 — Accessibility):
cd .worktrees/fix-a11y
claude --print "$(sed -n '/^## Agent 1:/,/^---$/p' docs/CLAUDE_CODE_NAV_PROMPTS.md | sed '1d;$d' | sed -n '/^```$/,/^```$/p' | sed '1d;$d')"

# Terminal 2 (Agent 2 — Z-Index):
cd .worktrees/fix-zindex
claude --print "$(sed -n '/^## Agent 2:/,/^---$/p' docs/CLAUDE_CODE_NAV_PROMPTS.md | sed '1d;$d' | sed -n '/^```$/,/^```$/p' | sed '1d;$d')"

# Terminal 3 (Agent 3 — Polish):
cd .worktrees/fix-polish
claude --print "$(sed -n '/^## Agent 3:/,/^---$/p' docs/CLAUDE_CODE_NAV_PROMPTS.md | sed '1d;$d' | sed -n '/^```$/,/^```$/p' | sed '1d;$d')"

# ── Merge parallel branches ─────────────────────────────────

cd /Users/adrianstier/shared-todo-list
git checkout main
git merge fix/nav-a11y --no-edit
git merge fix/z-index-system --no-edit
git merge fix/nav-polish-1 --no-edit

# ── Stage 3 continued: Sequential (Agent 4) ─────────────────

# Agent 4 runs on main after merge (touches overlapping files)
claude --print "$(sed -n '/^## Agent 4:/,/^---$/p' docs/CLAUDE_CODE_NAV_PROMPTS.md | sed '1d;$d' | sed -n '/^```$/,/^```$/p' | sed '1d;$d')"

# ── Stage 4: Validation (Agent 5 — Code Reviewer) ───────────

claude --print "$(sed -n '/^## Agent 5:/,/^---$/p' docs/CLAUDE_CODE_NAV_PROMPTS.md | sed '1d;$d' | sed -n '/^```$/,/^```$/p' | sed '1d;$d')"

# ── Cleanup ──────────────────────────────────────────────────

git worktree remove .worktrees/fix-a11y
git worktree remove .worktrees/fix-zindex
git worktree remove .worktrees/fix-polish
git branch -d fix/nav-a11y fix/z-index-system fix/nav-polish-1
```
