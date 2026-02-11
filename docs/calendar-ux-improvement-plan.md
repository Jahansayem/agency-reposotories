# Calendar UX/UI Improvement Plan

Multi-agent collaborative analysis. Each agent contributes a section below.

---

## Agent 1: Visual Design & Layout
*(Analyzing visual hierarchy, spacing, color, typography, information density)*

### Findings

**Typography & Spacing**

1. **[Medium] Inconsistent font size scale across views -- calendar components use raw Tailwind sizes instead of the design system's semantic typography tokens.** The design system in `globals.css` defines a full font size scale (`--font-size-micro` through `--font-size-4xl`) and semantic classes (`.text-task-title`, `.text-caption`, `.text-body-sm`, etc.), but no calendar component uses them. Instead, components use ad-hoc Tailwind classes: `text-[10px]` (CalendarDayCell.tsx:203, 213; DayView.tsx:101), `text-[11px]` (MiniCalendar.tsx:101), `text-xs` (~20 occurrences across all files), `text-sm` (~15 occurrences), and `text-lg sm:text-xl` (CalendarView.tsx:297). This creates a parallel sizing system that drifts from the global design language. Notably, `text-[10px]` is used for both month view task previews and priority badges -- the design system explicitly notes 10px (`--font-size-micro`) should be "badges, notification counters (decorative only)" and that 12px is the WCAG minimum for readable text. Task names rendered at 10px in month cells are functional text, not decorative, and may fail readability on lower-resolution displays.
   - **Recommendation:** Replace raw `text-[10px]` on task preview text (CalendarDayCell.tsx:203) with `text-xs` (12px). Keep `text-[10px]` only for the "+N more" overflow count (CalendarDayCell.tsx:213) and priority badge labels (DayView.tsx:101) where it serves a decorative/secondary role. Adopt the semantic `.text-caption`, `.text-body-sm`, and `.text-task-title` classes from the design system for calendar components to ensure future changes propagate consistently.

2. **[Low] Padding inconsistency between view containers.** MonthView uses `p-2 sm:p-4` (MonthView.tsx:123), WeekView uses `p-2 sm:p-4` (WeekView.tsx:192), and DayView uses `p-4 sm:p-6` (DayView.tsx:51). DayView has 50% more padding than the other two views at both breakpoints. While this can be justified by DayView's lower information density (fewer items need less visual compression), the jump from 16px to 24px on `sm` when switching from WeekView to DayView creates a noticeable content shift. The design system defines a spacing scale (`--space-3` = 12px, `--space-4` = 16px, `--space-6` = 24px) but these tokens are not used.
   - **Recommendation:** Standardize on `p-3 sm:p-5` (12px / 20px) for all views, or use the design system's `--space-*` tokens via custom classes. If DayView genuinely needs more breathing room, apply extra padding inside the card list rather than on the outer container, so the container padding remains consistent across view mode transitions.

3. **[Medium] Line height is uncontrolled on task text elements.** No calendar component explicitly sets `line-height` or `leading-*` on task names, category labels, or notes previews. Tailwind's default `line-height` for `text-sm` is approximately 1.43 (20px/14px), and for `text-xs` is approximately 1.33 (16px/12px). The design system defines `--line-height-tight: 1.2`, `--line-height-snug: 1.375`, `--line-height-normal: 1.5`. Task names in DayView cards (DayView.tsx:97, `text-sm font-semibold`) would benefit from `leading-snug` to tighten multi-word titles, while notes previews (DayView.tsx:123, `text-xs line-clamp-2`) need `leading-normal` for readability of longer text blocks.
   - **Recommendation:** Add `leading-snug` to task title `<h3>` elements in DayView and `leading-tight` to the compact task text in CalendarDayCell month previews and DraggableTaskItem. Add `leading-normal` to notes preview paragraphs. This creates a deliberate hierarchy: tight for titles, normal for body text.

4. **[Low] Spacing gap inconsistency in month view grid.** MonthView uses `gap-1` for both the weekday header row (MonthView.tsx:125) and the day cell rows (MonthView.tsx:150), with `space-y-1` between week rows (MonthView.tsx:147). This means horizontal gap between cells is 4px and vertical gap between rows is also 4px. This is appropriately tight for a month grid. However, the day cell itself has `p-2` (8px) internal padding (CalendarDayCell.tsx:167), meaning internal padding is 2x the external gap. This ratio is acceptable but could be tightened further on mobile where horizontal space is at a premium -- the `p-2` could become `p-1 sm:p-2` to reclaim space for task text.
   - **Recommendation:** Add responsive padding to CalendarDayCell: change `p-2` to `p-1 sm:p-2` for the month view cell button.

**Color & Contrast**

5. **[Critical] Tailwind category colors bypass the CSS custom property system, breaking dark theme adaptation.** The `CATEGORY_COLORS` map (CalendarDayCell.tsx:11-18) uses hardcoded Tailwind utility classes: `bg-blue-500`, `bg-purple-500`, `bg-red-500`, `bg-amber-500`, `bg-emerald-500`, `bg-cyan-500`, `bg-slate-500`. These are static hex values compiled by Tailwind and do not change between light and dark themes. While these mid-range 500-weight colors are generally visible on both light and dark backgrounds, they produce uneven contrast. Specifically: `bg-amber-500` (#F59E0B) against the dark theme's `--surface-2` (#1E2D47) has a contrast ratio of approximately 3.8:1 for the color dot itself (which is fine for a decorative indicator at w-2 h-2). However, the DayView color bar (DayView.tsx:92, `w-1 self-stretch`) occupies meaningful vertical space and conveys categorical information -- it should meet at least 3:1 contrast against its background per WCAG 1.4.11 (non-text contrast). The issue is that `bg-amber-500` and `bg-cyan-500` on dark backgrounds, and `bg-blue-500` on light backgrounds, hover near the threshold. More critically, these colors are not drawn from the design system's semantic palette (`--success`, `--warning`, `--danger`, etc.) despite several having obvious semantic mappings (claims = red/danger, renewals = purple/info).
   - **Recommendation:** Create theme-aware category color tokens in `globals.css` (e.g., `--category-quote`, `--category-renewal`, etc.) with distinct light/dark values that guarantee minimum 3:1 contrast on their respective surface colors. Reference these in `CATEGORY_COLORS` using `bg-[var(--category-quote)]` syntax. Alternatively, keep the Tailwind utility approach but define a parallel set of dark-mode-specific colors using Tailwind's `dark:` variant modifier in a wrapper class.

6. **[High] DayView priority badge "medium" uses yellow text on light background -- poor contrast.** `PRIORITY_BADGES` (DayView.tsx:20) defines medium priority as `text-yellow-600` on `bg-yellow-500/10`. Tailwind's `yellow-600` is #CA8A04. On a white or near-white background (`--surface-2` = #F1F5F9 in light mode), this yields approximately 3.4:1 contrast ratio, which fails WCAG AA for the `text-[10px]` font size (which requires 4.5:1 for text below 18px/14px bold). The small font size (10px) with `font-semibold` (600 weight) still counts as "small text" under WCAG because 10px at 600 weight is below the 14px bold threshold.
   - **Recommendation:** Change medium priority text color from `text-yellow-600` to `text-yellow-700` (#A16207) which provides approximately 5.2:1 contrast on #F1F5F9. Alternatively, adopt the design system's approach and use `text-[var(--warning)]` which is #D97706 in light mode (approximately 4.0:1 -- still marginal) or darken further. For the dark theme, `text-yellow-600` on `--surface-2` (#1E2D47) is approximately 4.8:1, which passes but is borderline. Using `--warning` (#FBBF24 in dark mode) would be better at 7.2:1.

7. **[Medium] Non-current-month cells lack sufficient visual differentiation in dark mode.** CalendarDayCell.tsx:176 applies `bg-[var(--surface)] border-[var(--border-muted)]` to non-current-month cells. In the dark theme, `--surface` is #162236 and `--surface-2` (used for current-month cells) is #1E2D47. The luminance difference between these two is approximately 2.5%, which is very subtle on most displays. Users may struggle to distinguish "this month" from "adjacent month" dates at a glance, especially on lower-contrast laptop screens. In light mode, the difference is more pronounced: `--surface` (#FFFFFF) vs `--surface-2` (#F1F5F9).
   - **Recommendation:** For dark mode non-current-month cells, add an additional opacity reduction to the day number text (e.g., `dark:opacity-40` or use `text-[var(--text-muted)]/50`) and consider using `bg-[var(--background)]` (#0A1628) instead of `--surface` to create a stronger contrast against `--surface-2`.

8. **[Low] "Today" accent color ring has inconsistent opacity across views.** MonthView today cells: `bg-[var(--accent)]/10` (CalendarDayCell.tsx:173). WeekView today columns: `bg-[var(--accent)]/5` (WeekView.tsx:81). DayView today badge: `bg-[var(--accent)]/10` (DayView.tsx:65). The WeekView's 5% tint is noticeably lighter than the 10% used elsewhere. In light mode with `--accent: #0033A0`, 5% opacity yields a background of approximately #F7F8FC which is nearly indistinguishable from the base `--surface-2` (#F1F5F9). This makes the "today" column in WeekView much less visible than the "today" cell in MonthView.
   - **Recommendation:** Standardize the today tint to 10% across all views. Change WeekView.tsx line 81 from `bg-[var(--accent)]/5` to `bg-[var(--accent)]/10`.

**Grid Layout**

9. **[Critical] WeekView's fixed `grid-cols-7` is unusable below 768px viewport width.** WeekView.tsx:202 unconditionally renders `grid grid-cols-7 gap-2 h-full`. On a 375px mobile screen with `p-2` container padding (8px on each side), the available grid width is 359px. With 6 gaps of 8px (48px total), each column gets approximately 44px. The `DroppableDayColumn` has a `min-h-[200px]` but no `min-w`, so columns compress without limit. At 44px wide, task items are completely illegible -- the `truncate` class on task names truncates after 2-3 characters. The empty-state "+ Add task" button text also truncates. There are no responsive breakpoint variants (`sm:`, `md:`, `lg:`) on the grid class.
   - **Recommendation:** Implement a responsive layout: `grid-cols-1 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7`. On mobile (1 column), show only the selected day with swipe navigation. On `sm` (3 columns), show today +/- 1 day. On `md` (5 columns), show the work week. On `lg`, show the full 7-day week. Alternatively, wrap the grid in a horizontal scroll container with `scroll-snap-type: x mandatory` and `scroll-snap-align: start` on each column, ensuring each column has a usable minimum width of ~140px.

10. **[High] Month view cells use `aspect-square` which produces excessively tall cells on wider screens.** CalendarDayCell.tsx:167 applies `aspect-square min-h-[80px] sm:min-h-[100px]`. On a 1920px-wide screen with the sidebar (224px) subtracted, the grid area is approximately 1600px. Each of the 7 columns in a `gap-1` grid gets approximately 225px. With `aspect-square`, each cell becomes 225px tall, producing a month grid approximately 1350px + 5 row gaps = 1360px tall (for 6 rows). This exceeds most viewport heights, forcing vertical scrolling within the calendar to see the entire month. The purpose of `aspect-square` is likely to maintain consistent proportions on smaller screens, but it backfires on larger ones.
    - **Recommendation:** Replace `aspect-square` with a responsive approach: `aspect-square sm:aspect-auto sm:min-h-[100px] lg:min-h-[120px]`. This preserves the square shape on mobile (where cells are narrow and need vertical space for previews) while allowing cells to have a natural, content-driven height on larger screens. Alternatively, use `aspect-[4/3]` for a less extreme ratio.

11. **[Medium] Sidebar width is fixed at `w-56` (224px) with no responsive flexibility.** CalendarView.tsx:456 defines the sidebar as `hidden lg:flex flex-col w-56`. At the `lg` breakpoint (1024px), this leaves only 800px for the main view. For WeekView, that means 7 columns in approximately 760px (after container padding), or ~103px per column -- marginally usable but tight. On very large screens (2560px+), the 224px sidebar feels disproportionately narrow. The MiniCalendar's 7-column grid within a 224px container works well, but the Category Filters section could use more space.
    - **Recommendation:** Change sidebar width from `w-56` to `w-56 xl:w-64` to provide slightly more room on larger displays. Consider making the sidebar collapsible with a toggle, similar to how Google Calendar handles its sidebar.

**Visual Hierarchy**

12. **[High] In month view cells, the day number and task previews compete for attention -- neither clearly dominates.** The day number (CalendarDayCell.tsx:181-193) uses `text-sm font-semibold` (14px, 600 weight). Task preview text (CalendarDayCell.tsx:206) uses `text-[10px] sm:text-xs` (10-12px) with no weight modifier (400 default). Category color dots are `w-1.5 h-1.5` (6px). The problem is that `text-sm font-semibold` for the day number is not sufficiently differentiated from the task text below -- the weight difference (600 vs 400) at these small sizes is hard to perceive, especially with the `truncate` class that often shortens task names to just 3-4 characters. The result is a cell where neither the day number nor the task content is clearly the primary element. Users must actively parse the cell to identify which text is the date and which is a task name.
    - **Recommendation:** Increase the day number's visual weight: change from `text-sm font-semibold` to `text-base font-bold` (16px, 700 weight) or add a contrasting background to today's date number (e.g., a small circle behind the number, as Google Calendar does). Reduce the task preview container's visual weight by making it slightly more muted: add `opacity-80` or use `text-[var(--text-light)]` instead of `text-[var(--foreground)]` for task names in month cells.

13. **[Medium] DayView task cards lack a clear primary action affordance.** Each DayView card (DayView.tsx:85-129) is styled as a `<button>` with `rounded-xl border` and a category color bar. The entire card is clickable, but there is no visible button, checkbox, or action icon. The `group` class is applied (DayView.tsx:88) but no `group-hover:` utilities are used anywhere in the card, suggesting an incomplete plan for hover-revealed actions. Without a visible primary affordance (like a completion checkbox or an arrow icon), the cards read as informational panels rather than interactive elements. The `hover:bg-[var(--surface-hover)]` and `hover:border-[var(--border-hover)]` transitions provide hover feedback, but this is subtle.
    - **Recommendation:** Add a right-side chevron icon (`ChevronRight` from lucide) that appears on hover using `opacity-0 group-hover:opacity-100 transition-opacity`. This signals "click to see more" without adding visual clutter at rest. For higher impact, add a small checkbox on the left side of the title row that allows marking tasks complete directly from the day view.

14. **[Low] MiniCalendar task indicator dots are very small and lack size hierarchy.** MiniCalendar.tsx:114 renders a `w-1 h-1 rounded-full` (4px) dot at the bottom of each day cell to indicate tasks exist on that date. At 4px, these dots are near the limit of perceptibility, especially on non-Retina displays. All days with tasks get the same single dot regardless of how many tasks exist -- a day with 1 task looks identical to a day with 10 tasks. The dot uses `bg-[var(--accent)]` which provides good contrast on both light and dark themes.
    - **Recommendation:** Increase dot size to `w-1.5 h-1.5` (6px) for better visibility. For days with 3+ tasks, use a larger dot or a double-dot pattern. The `todosByDate` map is already available to check task count.

**Consistency Across Views**

15. **[High] Category color representation uses three different visual metaphors across views.** Month view cell previews: `w-1.5 h-1.5 rounded-full` dot (CalendarDayCell.tsx:205). WeekView DraggableTaskItem: `w-2 h-2 rounded-full` dot (CalendarDayCell.tsx:85). DayView cards: `w-1 self-stretch rounded-full` vertical bar (DayView.tsx:92) plus a `w-2 h-2 rounded-full` dot in the details row (DayView.tsx:110). The drag overlay: `w-2.5 h-2.5 rounded-full` dot (CalendarDragOverlay.tsx:18). The dots are 6px, 8px, and 10px respectively -- similar but not identical. The DayView introduces a completely different metaphor (vertical bar) that is not present in any other view. While the vertical bar is arguably better for full-size cards, the inconsistency means users must re-learn how to identify categories at each zoom level.
    - **Recommendation:** Standardize dots at `w-2 h-2` (8px) across all views for consistency. Keep the DayView vertical bar as an additional indicator (it works well for cards), but ensure the dot in the details row matches the standard size. Change the drag overlay dot from `w-2.5 h-2.5` to `w-2 h-2` to match.

16. **[Medium] Empty state visual treatment varies dramatically across views.** MonthView empty cells: no text, no visual indicator -- the cell is completely blank below the day number. WeekView empty columns: centered `+ Add task` ghost button with `text-[var(--text-muted)]` and no background. DayView empty state: centered `py-16` block with "No tasks for this day" text plus a prominent `bg-[var(--accent)] text-white` filled button. The visual weight progression is blank -> ghost button -> prominent CTA, which does not correspond to the information hierarchy (month should be lightest, day should be most detailed). However, the CTA styling difference is jarring -- WeekView's ghost button and DayView's filled primary button serve the same purpose ("create a task on this day") but look completely different.
    - **Recommendation:** Align the empty-state CTA styling. Both WeekView and DayView should use a consistent secondary/ghost button style for the creation CTA. Reserve the filled primary button for the DayView only if it is the sole action on the page. Add a subtle empty-state indicator to month view cells (e.g., a very faint `+` icon that appears on hover) to signal that clicking creates a path to task creation.

17. **[Low] Header label typography is inconsistent with the body font system.** CalendarView.tsx:297 uses `text-lg sm:text-xl font-semibold` for the header date label. The design system defines `.text-h3` as `font-size: var(--font-size-xl)` (18px) with `font-weight: var(--font-weight-semibold)` (600). Tailwind's `text-xl` is 20px (1.25rem), which does not match the design system's `--font-size-xl` of 18px (1.125rem). This 2px discrepancy means the calendar header is slightly larger than other h3-level headings in the app.
    - **Recommendation:** Apply the `.text-h3` class from the design system or use `text-[1.125rem]` explicitly to match `--font-size-xl`.

**Information Density**

18. **[High] Month view shows only 2 task previews per cell, with "+N more" requiring a hover to reveal.** CalendarDayCell.tsx:198 slices to `todos.slice(0, 2)`. On a typical agency day with 5-8 tasks, the cell shows 2 and displays "+3 more" to "+6 more". The hover popup (CalendarDayCell.tsx:222-261) reveals all tasks in a scrollable `max-h-[200px]` container. This is a reasonable progressive disclosure pattern, but the 2-task limit is conservative -- with the `aspect-square` cell constraint and `text-[10px]` font size, there is vertical space for 3-4 previews in most cells (each preview is approximately 16-18px tall, and a 100px cell has ~80px available after the day number and padding). Showing one more preview would significantly reduce the need to hover for cells with 3-4 tasks, which likely represent the majority of populated days.
    - **Recommendation:** Increase the preview limit from 2 to 3 (or dynamically calculate based on available cell height). Change `todos.slice(0, 2)` to `todos.slice(0, 3)` in CalendarDayCell.tsx:198. This captures the 80th percentile case (most days have 3 or fewer tasks) and reduces hover dependency.

19. **[Medium] WeekView DraggableTaskItem shows category label text but not priority.** Each task item in WeekView (CalendarDayCell.tsx:91-98) displays: category label (`CATEGORY_LABELS[category]`) and optionally premium amount. Priority is completely absent. DayView prominently shows priority with colored badges. This creates an information cliff between the two views -- a user scanning the week has no way to identify urgent tasks without drilling into each day. The category label text (e.g., "Renewal", "Quote") consumes horizontal space that could be shared with a priority indicator.
    - **Recommendation:** Add a 2px left border to each DraggableTaskItem colored by priority (red for urgent, orange for high, transparent for medium/low). This is the most space-efficient priority indicator and matches the DayView's vertical color bar metaphor. Alternatively, prepend a small priority icon or colored dot before the category dot.

20. **[Low] CalendarDayCell popup has a 200px max height that may be insufficient for days with many tasks.** CalendarDayCell.tsx:251 sets `max-h-[200px] overflow-y-auto`. Each DraggableTaskItem is approximately 40-50px tall (p-1.5 + text + gap). A 200px container shows 4-5 tasks before scrolling. For an agency with 8+ tasks on a single day, the user must scroll within the popup. The popup width is `min-w-[220px] max-w-[280px]`, which is appropriate for the content but means tall task lists create a narrow, deep scrolling area.
    - **Recommendation:** Increase popup max height to `max-h-[300px]` to show 6-7 tasks without scrolling. Alternatively, add a "View all in day view" link at the bottom of the popup when tasks exceed the visible area, providing a clear escape hatch to the full list.

**Animations & Transitions**

21. **[Medium] AnimatePresence `mode="wait"` causes a visible blank frame during navigation.** All three views (MonthView.tsx:138, WeekView.tsx:193, DayView.tsx:52) and the header label (CalendarView.tsx:288) use `AnimatePresence mode="wait"`. In `wait` mode, the exiting element must fully complete its exit animation before the entering element begins. With the 200ms transition duration, there is approximately 100ms where neither element is visible, producing a brief flash of the empty container background. The human eye can perceive gaps as short as 50ms.
    - **Recommendation:** Change `mode="wait"` to `mode="popLayout"` on the three view AnimatePresence wrappers. `popLayout` removes the exiting element from the layout flow immediately (via `position: absolute`) and renders the entering element simultaneously, creating a smoother crossfade without the blank gap. For the header label, `mode="wait"` is acceptable since the header text area has a fixed `min-w-[160px]` that prevents layout shift.

22. **[Low] All three views use identical slide animation parameters -- view switches lack spatial cues.** `monthVariants`, `weekVariants`, and `dayVariants` are structurally identical: 50px horizontal slide with opacity fade over 0.2s. When a user switches from MonthView to WeekView (a "zoom in" action), the same lateral slide plays. This misses an opportunity to convey spatial hierarchy through animation. Zoom-in actions (Month -> Week -> Day) should feel like moving closer/deeper, while lateral navigation (next week, previous month) should feel like panning.
    - **Recommendation:** Differentiate animations by type of navigation. For lateral navigation (prev/next), keep the current horizontal slide. For zoom-in navigation (Month -> Week -> Day), use a scale-up + fade transition: `{ scale: 0.95, opacity: 0 }` entering, `{ scale: 1.05, opacity: 0 }` exiting. For zoom-out (Day -> Week -> Month), reverse the scale. This requires tracking whether the navigation event was a view-mode change vs. a date change, which can be done by adding a `transitionType` state alongside the existing `direction` state.

23. **[Low] CalendarDayCell hover scale animation (`whileHover: scale 1.02, whileTap: scale 0.98`) may cause layout shifts in the month grid.** CalendarDayCell.tsx:164-165 applies Framer Motion's `whileHover` and `whileTap` to the cell button. A 2% scale increase on a 150px-wide cell means it grows by 3px in each direction. In a tight `gap-1` (4px) grid, this can overlap adjacent cells. The `position: relative` and the `z-50` on the popup prevent z-order issues, but the visual overlap of the scaled cell over its neighbors may look unpolished.
    - **Recommendation:** Replace `whileHover={{ scale: 1.02 }}` with a non-layout-affecting hover effect like `whileHover={{ boxShadow: 'var(--elevation-2)' }}` or a border color change. If scale is desired, reduce it to `1.005` which is perceptible but does not cause visible overlap. Alternatively, apply `transform-origin: center` and add `position: relative; z-index: 1` on hover so the scaled cell renders above neighbors.

**Empty States**

24. **[High] Month view empty cells have no visual affordance or call to action.** When a day in MonthView has zero tasks, the cell shows only the day number. There is no hover hint, no "+" icon, no muted text suggesting the cell is clickable. Clicking the empty cell triggers `handleDrillToDay` (CalendarDayCell.tsx:138), which navigates to DayView -- a behavior users cannot predict from the visual design. The cell looks inert. Compare this to Google Calendar, which shows a "+" icon on hover for empty dates and creates an inline event on click.
    - **Recommendation:** On hover over an empty month cell, show a small muted "+" icon centered in the cell using `opacity-0 hover:opacity-60 transition-opacity`. This signals clickability without adding visual noise at rest. Additionally, consider changing the empty-cell click behavior to open the add-task modal directly (via `onAddTask`) rather than drilling to DayView, matching user expectations from Google Calendar.

25. **[Medium] DayView empty state is a dead end with no context about adjacent days.** DayView.tsx:134-142 shows "No tasks for this day" and a "Create Task" button centered with `py-16` of vertical padding. There is no indication of what surrounds this empty day. A user who lands on an empty Monday has no idea whether Tuesday has 5 tasks or the entire week is empty. The large vertical padding (64px) pushes the CTA below the fold on smaller viewports.
    - **Recommendation:** Reduce `py-16` to `py-8` to keep the CTA visible. Add a small summary of adjacent days below the CTA: "Tomorrow: 3 tasks / This week: 12 tasks" with clickable links to navigate. This requires computing a brief summary from the existing `todosByDate` map.

**Dark Theme**

26. **[High] Dark theme has two competing accent color definitions -- class-based and prefers-color-scheme.** In `globals.css`, the `.dark` class block (line 135) defines `--accent: #93C9F0` (lighter sky blue), while the `prefers-color-scheme: dark` media query (line 187) defines `--accent: #72B5E8` (standard sky). These are different colors: #93C9F0 is lighter with a contrast ratio of approximately 5.2:1 on #0A1628, while #72B5E8 has approximately 4.1:1. The class-based `.dark` theme was explicitly updated for WCAG AA compliance (noted in the comment on line 134), but the media query fallback was not updated. If the app does not apply the `.dark` class and relies on `prefers-color-scheme`, users get the less-accessible #72B5E8 accent. This affects every calendar element that uses `var(--accent)`: today highlights, view switcher active tab, filter button active state, mini calendar selected date, and the sidebar legend dot.
    - **Recommendation:** Synchronize the `prefers-color-scheme: dark` media query's `--accent` value with the `.dark` class block's value (#93C9F0). Update all other divergent values as well -- `--text-muted`, `--text-light`, and `--accent-vivid` also differ between the two dark theme definitions.

27. **[Medium] CalendarDayCell popup uses `shadow-lg` which is not theme-aware.** CalendarDayCell.tsx:229 applies `shadow-lg`. Tailwind's default `shadow-lg` uses `rgba(0, 0, 0, 0.1)` and `rgba(0, 0, 0, 0.1)` -- these are the same in both light and dark themes. On a dark background (#1E2D47), black shadows at 10% opacity are nearly invisible, making the popup appear to float with no visual separation from the background. The design system defines theme-aware shadow tokens (`--shadow-lg`, `--elevation-3`) with darker shadows for dark mode, but the calendar uses Tailwind's built-in `shadow-lg` instead.
    - **Recommendation:** Replace `shadow-lg` with a design-system shadow. Change CalendarDayCell.tsx:229 from `shadow-lg` to `shadow-[var(--shadow-lg)]` or use a utility class that maps to `--elevation-3`. This ensures the popup has visible depth separation in dark mode.

28. **[Low] Filter dropdown also uses non-theme-aware shadow.** CalendarView.tsx:364 applies `shadow-xl` to the filter dropdown. Same issue as finding 27 -- the Tailwind `shadow-xl` does not adapt to dark theme.
    - **Recommendation:** Replace with `shadow-[var(--shadow-xl)]` or the design system's `--elevation-4` token.

29. **[Low] CalendarViewSwitcher active tab uses `shadow-sm` which disappears in dark mode.** CalendarViewSwitcher.tsx:33 applies `shadow-sm` to the active tab. At `rgba(0, 0, 0, 0.05)`, this is invisible on dark backgrounds.
    - **Recommendation:** Replace `shadow-sm` with a subtle inner border or increase the shadow: `shadow-[0_1px_3px_rgba(0,0,0,0.3)]` for dark mode, or use `dark:shadow-none dark:ring-1 dark:ring-white/10` as an alternative depth cue.

### Recommendations Summary (Sorted by Priority)

| # | Severity | Finding | File(s) | Quick Fix? |
|---|----------|---------|---------|------------|
| 5 | Critical | Category colors bypass CSS custom properties -- no dark theme adaptation | CalendarDayCell.tsx:11-18, globals.css | No (M effort) |
| 9 | Critical | WeekView fixed 7-column grid unusable on mobile | WeekView.tsx:202 | No (M effort) |
| 6 | High | Yellow priority badge fails WCAG AA contrast | DayView.tsx:20 | Yes (S effort) |
| 10 | High | Month cells `aspect-square` creates excessively tall grid on wide screens | CalendarDayCell.tsx:167 | Yes (S effort) |
| 12 | High | Day number and task previews compete for attention in month cells | CalendarDayCell.tsx:181-206 | Yes (S effort) |
| 15 | High | Category color metaphor inconsistent across 3 views + drag overlay | Multiple files | Yes (S effort) |
| 18 | High | Month view shows only 2 task previews -- too conservative | CalendarDayCell.tsx:198 | Yes (S effort) |
| 24 | High | Month view empty cells have no visual affordance | CalendarDayCell.tsx:134-140 | Yes (S effort) |
| 26 | High | Dark theme has two competing accent color definitions | globals.css:135, 187 | Yes (S effort) |
| 27 | Medium | Popup `shadow-lg` invisible in dark mode | CalendarDayCell.tsx:229 | Yes (S effort) |
| 1 | Medium | Raw Tailwind sizes instead of design system typography tokens | All calendar files | No (M effort) |
| 3 | Medium | No explicit line-height control on task text elements | DayView.tsx, CalendarDayCell.tsx | Yes (S effort) |
| 7 | Medium | Non-current-month cells poorly differentiated in dark mode | CalendarDayCell.tsx:176 | Yes (S effort) |
| 8 | Medium | Today accent tint inconsistent (5% vs 10%) across views | WeekView.tsx:81 | Yes (S effort) |
| 11 | Medium | Sidebar width fixed with no responsive flexibility | CalendarView.tsx:456 | Yes (S effort) |
| 13 | Medium | DayView cards lack visible action affordance despite `group` class | DayView.tsx:88 | Yes (S effort) |
| 16 | Medium | Empty state CTA styling varies dramatically across views | WeekView.tsx:120-125, DayView.tsx:136-141 | Yes (S effort) |
| 19 | Medium | WeekView task items show category but not priority | CalendarDayCell.tsx:60-102 | Yes (S effort) |
| 21 | Medium | AnimatePresence `mode="wait"` causes blank frame during navigation | MonthView.tsx:138, WeekView.tsx:193, DayView.tsx:52 | Yes (S effort) |
| 25 | Medium | DayView empty state is a dead end with excessive padding | DayView.tsx:134-142 | Yes (S effort) |
| 2 | Low | Padding inconsistency between view containers | MonthView, WeekView, DayView | Yes (S effort) |
| 4 | Low | Month cell internal padding not responsive | CalendarDayCell.tsx:167 | Yes (S effort) |
| 14 | Low | MiniCalendar task dots too small, no density indication | MiniCalendar.tsx:114 | Yes (S effort) |
| 17 | Low | Header label typography drifts from design system | CalendarView.tsx:297 | Yes (S effort) |
| 20 | Low | Popup max height too short for busy days | CalendarDayCell.tsx:251 | Yes (S effort) |
| 22 | Low | All views use identical animation -- no spatial hierarchy cues | Multiple variant objects | No (M effort) |
| 23 | Low | Cell hover scale causes layout overlap in month grid | CalendarDayCell.tsx:164-165 | Yes (S effort) |
| 28 | Low | Filter dropdown shadow not theme-aware | CalendarView.tsx:364 | Yes (S effort) |
| 29 | Low | ViewSwitcher active tab shadow invisible in dark mode | CalendarViewSwitcher.tsx:33 | Yes (S effort) |

### Top 5 Highest-Impact Changes (implementation order)

1. **Fix category colors for dark theme** (Finding 5) -- Create CSS custom property tokens for each category color with light/dark variants. This is foundational because category colors are the primary visual differentiator for tasks across all views, and they currently have no theme awareness.

2. **Make WeekView responsive** (Finding 9) -- Replace `grid-cols-7` with responsive breakpoints. The week view is the default view (`useState<CalendarViewMode>('week')` in CalendarView.tsx:101) and is completely broken on mobile.

3. **Increase month cell task previews to 3 and add empty-cell hover affordance** (Findings 18, 24) -- Two small changes that significantly reduce interaction friction in the most information-dense view.

4. **Fix dark theme shadow tokens and accent color divergence** (Findings 26, 27, 28, 29) -- Replace all Tailwind shadow utilities with design system tokens. Synchronize the `prefers-color-scheme` dark accent with the class-based dark accent. These are all small, safe changes that collectively improve dark mode quality.

5. **Standardize today highlights, category dot sizes, and empty-state CTAs** (Findings 8, 15, 16) -- Three consistency fixes that take the views from "three independent components" to "three zoom levels of one unified interface."

---

## Agent 2: Interaction & Navigation Patterns
*(Analyzing click/hover/drag patterns, mobile UX, view transitions, navigation flow)*

### Findings

**Click Behavior Issues**

- **WeekView "+ Add task" drills to DayView instead of opening the add-task modal (BUG).** In `CalendarView.tsx:439`, `WeekView` receives `onDateClick={handleDrillToDay}`. Inside `WeekView.tsx:121`, the empty-day "+ Add task" button calls `onDateClick(day)`, which triggers `handleDrillToDay` -- navigating to DayView rather than opening `AddTaskModal`. The user clicks a button labeled "Add task" and gets a view change, not a task creation form. This is the most impactful interaction defect in the calendar.
- **MonthView empty-cell click also drills to DayView, not add-task.** In `CalendarDayCell.tsx:134-140`, `handleCellClick` calls `onClick()` (= `handleDrillToDay`) when `todos.length === 0`. This is intentional progressive disclosure (empty date -> drill down -> create from DayView), but it adds an unnecessary navigation hop. Users expect clicking an empty date to start task creation, as in Google Calendar.
- **Conflicting click targets in CalendarDayCell.** The cell itself is a `<motion.button>` (`CalendarDayCell.tsx:160`) that toggles the popup or drills to day view. Inside the popup, individual tasks are also clickable buttons (`CalendarDayCell.tsx:77-100`), and there is a separate "+ Add" button (`CalendarDayCell.tsx:239-247`). The task preview rows rendered directly in the cell (`CalendarDayCell.tsx:198-211`) are NOT independently clickable -- they are just visual indicators inside the parent button. This means clicking a task preview in the cell grid toggles the popup, but clicking a task in the popup opens the task detail. The two-step interaction (click cell -> popup appears -> click task) adds friction for power users who want direct task access.
- **WeekView day header click always drills to DayView** (`WeekView.tsx:87-107`). The header button calls `onDateClick(day)` which is `handleDrillToDay`. This is correct behavior (consistent with MonthView date-number clicks), but the click target is the entire header row including the task count badge, which could confuse users who tap the badge expecting a different action.

**Hover Behavior Issues**

- **Popup opens on mouseEnter, closes on mouseLeave -- broken on touch devices.** `CalendarDayCell.tsx:157-158` uses `onMouseEnter`/`onMouseLeave` to toggle the popup. On iOS/iPadOS and Android, `mouseEnter` fires on first tap but `mouseLeave` only fires when tapping elsewhere. The popup will appear but may not dismiss predictably. There is no `onClick` toggle as a fallback for touch. The `handleCellClick` at line 134 does toggle the popup on click when there are tasks, but since `mouseEnter` fires first on touch, users may see a flash of the popup opening then toggling closed.
- **Popup can obscure adjacent cells.** The popup renders at `top: full` with `position: absolute` (`CalendarDayCell.tsx:229`), which means it overlays cells below. On bottom-row dates, the popup can overflow the calendar container. There is no collision detection or position flipping.
- **Popup stays open during drag due to `isDragActive` guard** (`CalendarDayCell.tsx:158`), which is correct, but after a drag ends the popup closes via the `useEffect` at lines 145-151 regardless of whether the mouse is still over the cell. This can feel abrupt if the user wants to drag another task from the same cell.

**Drag-and-Drop Issues**

- **DayView has no drag-and-drop support.** `DayView.tsx` has no `DndContext`, no `useDroppable`, no `DraggableTaskItem` usage. Users who learn to drag tasks in MonthView or WeekView will find the capability missing in DayView. This is inconsistent.
- **Drag handles are only visible when `enableDragDrop` is true** (`CalendarDayCell.tsx:67-76`), but there is no additional visual hint (tooltip, cursor change on the card, or onboarding cue) that tasks are draggable. The `GripVertical` icon is 3.5x3.5 (14px) -- a small target. Discoverability is low.
- **PointerSensor with 8px activation constraint** (`MonthView.tsx:67-69`, `WeekView.tsx:142-146`) is good for preventing accidental drags on click, but there is no `TouchSensor` configured. On touch devices, `PointerSensor` can conflict with scroll gestures. The `@dnd-kit/core` docs recommend using `TouchSensor` alongside `PointerSensor` for cross-device support.
- **No visual feedback on valid drop targets during drag.** Drop targets only highlight when the dragged item is directly over them (`isOver` check in `CalendarDayCell.tsx:170-171` and `WeekView.tsx:78-79`). During drag, non-hovered cells look identical to their resting state. Users cannot tell which cells are valid drop targets at a glance.

**Navigation Flow Issues**

- **Keyboard shortcuts are global on `window` and not scoped to focus.** `CalendarView.tsx:196` adds a `keydown` listener to `window`. The guard at line 155 checks `containerRef.current.offsetParent`, but if the calendar is visible alongside a modal or overlay (e.g., the AddTaskModal triggered by calendarAddTaskDate), pressing D/W/M/T/ArrowLeft/ArrowRight will still fire. The input-tag guard at lines 158-159 prevents firing inside inputs, but buttons and other focusable elements in the modal are not excluded.
- **MiniCalendar always forces DayView on click** (`CalendarView.tsx:140`). If a user is in MonthView and clicks a date on the MiniCalendar expecting to navigate the month view to that date's month, they are instead switched to DayView. This is jarring. Most calendar apps (Google Calendar, Outlook) keep the current view mode when navigating via a mini calendar.
- **No "back" navigation from DayView to previous view.** When a user drills from MonthView or WeekView into DayView (via `handleDrillToDay`), there is no breadcrumb or "back to week/month" button. The only way to return is clicking W or M in the CalendarViewSwitcher or using keyboard shortcuts. The drill-down action is not reversible with a single click.
- **MiniCalendar month sync is one-directional.** `MiniCalendar.tsx:34-36` syncs `miniMonth` from `currentDate` via `useEffect`, but if the user independently navigates the MiniCalendar to a different month (via its own prev/next arrows) and then navigates the main calendar, the MiniCalendar snaps back. This can be disorienting -- the user loses their MiniCalendar browsing position.

**View Transition Issues**

- **AnimatePresence `mode="wait"` causes a brief blank frame.** All three views (MonthView, WeekView, DayView) use `mode="wait"` which fully exits the old content before entering the new content. With the 200ms transition duration, there is a ~100ms gap where neither the old nor new content is visible. `mode="popLayout"` or `mode="sync"` would provide smoother crossfade.
- **Direction logic can produce wrong animation direction when switching view modes.** The `direction` state is only updated by `goToPrevious`/`goToNext`/`goToToday`/`handleDrillToDay`/`handleMiniCalendarDateClick`. When the user clicks the CalendarViewSwitcher (e.g., from DayView to MonthView), the `direction` retains whatever it was from the last navigation action. The view change itself has no directional animation, but the header `AnimatePresence` at `CalendarView.tsx:288-301` uses the stale direction, potentially sliding the header label the wrong way.
- **No transition when switching between view modes.** The conditional rendering at `CalendarView.tsx:423-452` (`{viewMode === 'month' && ...}`) does not use `AnimatePresence` between view modes -- only within each view. Switching from MonthView to WeekView is an instant swap with no crossfade.

**Mobile UX Issues**

- **WeekView always renders 7 columns** (`WeekView.tsx:202`, `grid-cols-7`). On a 375px-wide phone screen, each column is ~48px wide. Task names are truncated to near-illegibility. There is no responsive breakpoint to show a 3-day or 5-day view on smaller screens.
- **Today button is icon-only on mobile** (`CalendarView.tsx:318-319`, `<span className="hidden sm:inline">Today</span>`). The CalendarIcon alone is not universally recognized as "go to today." Combined with the also-icon-only Filter button on mobile, the toolbar becomes a row of ambiguous icons.
- **No swipe gestures for navigation.** There is no touch gesture handling (swipe left/right to navigate prev/next). Users on mobile must precisely tap the small chevron buttons. This is the most common mobile calendar interaction pattern and its absence makes the mobile experience feel like a desktop-only design.
- **Sidebar with MiniCalendar is hidden on mobile** (`CalendarView.tsx:456`, `hidden lg:flex`). Mobile users lose access to the quick-jump mini calendar entirely, and must rely solely on prev/next arrows to navigate -- potentially dozens of taps to reach a distant date.
- **Filter dropdown can be clipped on mobile.** The dropdown is `absolute right-0 top-full` (`CalendarView.tsx:364`) with `w-56` (224px). On a narrow viewport, if the filter button is near the right edge, the dropdown may overflow the screen. There is no mobile-optimized full-width or bottom-sheet variant.

**Filter Interaction Issues**

- **Filter state is not visually persistent.** When filters are active and the dropdown is closed, the only indication is a small badge showing the count of selected categories (`CalendarView.tsx:344-348`). There are no inline filter chips or a persistent filter bar showing which categories are active. Users can forget filters are applied and wonder why tasks are missing.
- **Sidebar category filters duplicate the dropdown filters.** On `lg` screens, both the dropdown Filter button in the header and the sidebar Category Filters section (`CalendarView.tsx:467-505`) control the same `selectedCategories` state. This is redundant and potentially confusing -- users may not realize they are the same filter.
- **No "filtered results" empty state.** If all visible dates are empty because of active filters (not because there are no tasks), the calendar shows empty cells with no indication that tasks exist but are hidden. Users may think there are no tasks rather than realizing filters are applied.

**Task Creation Flow Issues**

- **DayView "+ Create Task" correctly opens the modal** (`DayView.tsx:137`, `onDateClick(currentDate)` -> `CalendarView.tsx:449`, `onDateClick` -> `MainApp.tsx:391-397`, `handleCalendarDateClick` sets `calendarAddTaskDate`). This is the one path that works correctly end-to-end.
- **MonthView popup "+ Add" also correctly opens the modal** (`CalendarDayCell.tsx:242`, `(onAddTask || onClick)()` where `onAddTask` = `CalendarView.tsx:429`, `onAddTask={onDateClick}` = `MainApp.tsx` `handleCalendarDateClick`). This works, but the fallback to `onClick` (which is `handleDrillToDay`) if `onAddTask` is undefined is a fragile pattern.
- **WeekView has no `onAddTask` prop at all.** The `WeekViewProps` interface (`WeekView.tsx:25-32`) has no `onAddTask`. The only creation path is the empty-day "+ Add task" button, which (as noted above) incorrectly drills to DayView.

### Recommendations

1. **Fix WeekView "+ Add task" to open the add-task modal (BUG FIX).** Add an `onAddTask` prop to `WeekViewProps` in `WeekView.tsx`. Pass `onDateClick` (the modal opener) from `CalendarView.tsx` as `onAddTask` to `WeekView`, same as MonthView. In `DroppableDayColumn`, use `onAddTask` for the empty-state button instead of `onDateClick`. This is the highest-priority fix because it violates user intent.

2. **Add touch support for CalendarDayCell popups.** Replace the mouseEnter/mouseLeave popup pattern with a unified approach: use `onClick` to toggle the popup, and keep `mouseEnter` as an enhancement for pointer devices only. Detect touch via `@media (hover: hover)` or `window.matchMedia('(hover: hover)')` and only enable hover-to-open on devices that support it. Also add a click-outside handler for touch dismissal (the existing backdrop div in the filter dropdown is a good pattern to reuse).

3. **Add swipe gestures for mobile navigation.** Use a lightweight touch gesture library (e.g., `use-gesture` or a custom `touchstart`/`touchmove`/`touchend` handler) on the main content area. Horizontal swipe left = `goToNext`, swipe right = `goToPrevious`. This is the single most impactful mobile improvement. Apply a minimum swipe distance threshold (e.g., 50px) to avoid interfering with scrolling.

4. **Make WeekView responsive on mobile.** On screens below `sm` (640px), switch to a 3-day or stacked single-day-at-a-time layout instead of cramming 7 columns. This could be implemented as a `useMediaQuery` hook that adjusts the `eachDayOfInterval` range in `WeekView.tsx:148-153`, or by rendering a scrollable horizontal strip where each day column has a usable minimum width.

5. **Add a "Back to [Week/Month]" button in DayView.** When `DayView` is reached via drill-down from MonthView or WeekView, show a breadcrumb or back-arrow that returns to the originating view. This requires tracking the previous `viewMode` in `CalendarView` state and rendering a back-navigation element in the `DayView` header area.

6. **Add DnD support to DayView.** Wrap `DayView` task cards in `DraggableTaskItem` and the day container in a `DndContext` + `useDroppable`. While same-day reordering may not be the primary use case, it creates consistency across views and enables future features like dragging a task from DayView to a mini-calendar sidebar date.

7. **Add a `TouchSensor` to DnD contexts.** In both `MonthView.tsx:66-70` and `WeekView.tsx:142-146`, add `useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })` to the `useSensors` call. This ensures drag-and-drop works reliably on touch devices without interfering with scrolling.

8. **Improve drag affordance visibility.** Make drag handles (`GripVertical` icon) visible on hover for pointer devices and always visible on touch devices. Add a subtle "Drag to reschedule" tooltip on first interaction (or show it persistently until the user has completed their first drag). During active drag, add a subtle background tint or dashed border to all valid drop-target cells so users can see where they can drop.

9. **Keep current view mode when clicking MiniCalendar dates.** Change `handleMiniCalendarDateClick` in `CalendarView.tsx:137-141` to navigate the current date without forcing `setViewMode('day')`. If the user is in MonthView, clicking a MiniCalendar date should navigate to that date's month. If in WeekView, navigate to the week containing that date. Only switch to DayView if the user double-clicks or if they are already in DayView.

10. **Add inline filter chips below the header when filters are active.** When `selectedCategories.size < ALL_CATEGORIES.length`, render a thin bar below the header showing the active category names as dismissible chips. This makes the filter state persistently visible and provides a one-click path to remove individual filters. Remove the duplicate sidebar category filters section, or convert the sidebar version to a read-only legend.

11. **Improve view-mode transition animations.** Wrap the view-mode conditional rendering (`CalendarView.tsx:423-452`) in its own `AnimatePresence` with a fade or scale transition. This prevents the jarring instant swap when switching between Day/Week/Month. Also consider changing `mode="wait"` to `mode="popLayout"` on the inner view AnimatePresence instances to eliminate the blank frame between navigation transitions.

12. **Add a "filtered" empty state indicator.** When the calendar shows empty cells but `todos` has tasks that would appear without filters, display a subtle banner: "Some tasks are hidden by filters" with a "Show all" link that calls `selectAllCategories`. This prevents user confusion when filters inadvertently hide all tasks.

13. **Scope keyboard shortcuts to avoid modal conflicts.** In `CalendarView.tsx:153-198`, add a check for whether a modal/dialog is open (e.g., check `document.querySelector('[role="dialog"]')` or pass an `isModalOpen` prop). Skip shortcut handling when any modal overlay is active. Alternatively, use `containerRef.current.contains(document.activeElement)` for focus-scoped shortcuts, though this requires the calendar to be focusable.

14. **Add popup position collision detection.** In `CalendarDayCell.tsx`, calculate whether the popup would overflow below the calendar container. If the cell is in the bottom two rows, render the popup above the cell (`bottom: full` instead of `top: full`). Use a ref on the calendar container and compare with `getBoundingClientRect()` for the cell position.

15. **Convert mobile filter dropdown to a bottom sheet.** On viewports below `sm`, render the filter dropdown as a slide-up bottom sheet instead of an absolute-positioned dropdown. This prevents clipping, provides a larger touch target area, and follows mobile-native interaction patterns.

---

## Agent 3: Week & Day View Deep Dive
*(Analyzing the week and day views specifically — layout, task cards, empty states, responsiveness)*

### WeekView Findings

- **Fixed 7-column grid causes severe space imbalance.** `WeekView.tsx` line 202 uses `grid grid-cols-7 gap-2 h-full` -- every day gets exactly 1/7 of the width regardless of task count. A Monday with 8 tasks gets the same column width as a Saturday with 0 tasks. The `min-h-[200px]` on `DroppableDayColumn` (line 77) prevents columns from collapsing vertically, but the narrow width (roughly 120-140px on a 1080p screen) makes task text truncate aggressively via the `truncate` class on `DraggableTaskItem` (CalendarDayCell.tsx line 88). Users cannot read task names on busy days.

- **Mobile responsiveness is broken.** The `grid-cols-7` is unconditional -- no `sm:`, `md:`, or `lg:` breakpoint variants. On a 375px mobile screen, each column is approximately 45px wide, making task items completely illegible. The outer wrapper has `p-2 sm:p-4` (line 192) for padding adjustment, but this is insufficient. The view needs either horizontal scroll with snap points, a 3-day or 5-day mode on small screens, or collapsing to a stacked layout.

- **DraggableTaskItem density is appropriate but missing priority.** Each item (CalendarDayCell.tsx lines 45-103) shows: drag handle (GripVertical icon, w-3.5 h-3.5), category dot (w-2 h-2), customer name (truncated), category label text, and optionally premium_amount. This is a reasonable information density for the week view. However, priority is completely absent -- a critical gap since DayView prominently shows priority badges via `PRIORITY_BADGES` (DayView.tsx lines 17-22). Users scanning the week cannot distinguish urgent tasks from low-priority ones without clicking through to DayView.

- **Empty state action is misleading -- "Add task" navigates instead of creating.** When a day has 0 tasks, lines 119-126 show a full-height `+ Add task` button. Clicking it calls `onDateClick(day)` which in `CalendarView.tsx` line 439 maps to `handleDrillToDay` -- it navigates to the day view rather than opening a task creation dialog. The button label says "Add task" but the behavior is "navigate to day." In contrast, the month view's `CalendarDayCell` has a separate `onAddTask` prop (line 38) that calls `onDateClick` from CalendarView (line 429) -- a different handler intended for actual task creation. WeekView has no `onAddTask` prop at all in its `WeekViewProps` interface (line 25-32).

- **Drop zone feedback is adequate but could be more polished.** On hover during drag, `isOver` triggers `ring-2 ring-[var(--accent)] bg-[var(--accent)]/20 border-[var(--accent)]` (line 79). The 20% opacity background tint and accent ring provide clear visual feedback. However, the ring appearance snaps on/off -- the `transition-all` on line 77 is present but Tailwind's default transition properties do not include ring changes. A brief scale pulse or an animated border would improve the drag-and-drop tactile feel.

- **Today highlight competes visually with drop zone styling.** Today uses `ring-2 ring-[var(--accent)] border-[var(--accent)]/30 bg-[var(--accent)]/5` (line 81). Drop zones use the same `ring-[var(--accent)]` color with a stronger `bg-[var(--accent)]/20`. When dragging over today's column, the visual change is subtle -- only the background opacity shifts from 5% to 20%. These two states share the same ring treatment, making them hard to distinguish. Today should use a left-border accent bar or header tint instead, reserving the ring exclusively for drop feedback.

- **Task count badge is helpful but does not escalate for overloaded days.** Lines 102-106 show a small pill (`px-1.5 py-0.5 rounded-full`) with the task count next to the day number in the header. This provides at-a-glance density info, especially when the task list overflows the visible area. However, a day with 2 tasks looks identical to a day with 10 tasks -- there is no color escalation (e.g., orange for 4-6, red for 7+) to signal overloaded days at a glance.

- **No sorting within day columns.** Tasks appear in whatever order `todosByDate.get(dateKey)` returns (CalendarView.tsx lines 222-239 pushes tasks into arrays without sorting). There is no explicit sort by priority, `display_order`, `created_at`, or any other field. High-priority tasks may appear below low-priority ones. The `display_order` field on `Todo` (types/todo.ts line 110) exists but is not used in the week view.

- **Animation is consistent but undifferentiated from other views.** `weekVariants` (lines 34-47) slides 50px horizontally with opacity fade over 0.2s. This is identical to `dayVariants` in DayView.tsx and `headerVariants` in CalendarView.tsx. Differentiating the transition (e.g., week view could scale slightly or use a different easing curve) would reinforce the view switch and help users maintain spatial orientation during navigation.

- **Day header button is well-designed.** The header (lines 87-107) uses a `<button>` wrapping day abbreviation, date number, and task count -- making the entire header area a single click target. The `hover:bg-[var(--surface-hover)]` provides clear hover feedback. The date number uses `font-bold` (line 98) with accent color for today, standard foreground for other days. This is clean and scannable.

### DayView Findings

- **Task cards are well-structured but critically lack actionability.** Each card (lines 85-130) is a single `<button>` wrapping the entire card content. The only available action is `onTaskClick` -- there is no way to complete a task, reschedule it, change priority, or mark it as "waiting" without navigating away to a detail view. For a day view where users should be triaging and executing tasks, this is a significant friction point. Compare: WeekView at least supports drag-to-reschedule, but DayView has zero DnD support -- no `DndContext`, no `useDroppable`, no `useDraggable` anywhere in the file.

- **Category color bar is the strongest visual element in cards.** The left-side `w-1 self-stretch rounded-full` color bar (line 92) using `CATEGORY_COLORS[category]` is effective -- it provides instant category recognition without reading text. The `self-stretch` ensures it spans the full card height, which adapts naturally as notes previews or subtask info add height.

- **Priority badges are mostly clear but have a yellow contrast issue.** The `PRIORITY_BADGES` object (lines 17-22) uses semantic colors: red/urgent (`bg-red-500/10 text-red-500`), orange/high (`bg-orange-500/10 text-orange-500`), yellow/medium (`bg-yellow-500/10 text-yellow-600`), blue/low (`bg-blue-500/10 text-blue-500`). The `text-[10px]` font size is small but readable at `font-semibold` weight. Two issues: (1) the medium priority badge uses `text-yellow-600` on a near-white background -- yellow has inherently poor contrast against light backgrounds and may fail WCAG AA; (2) yellow typically signals "caution/warning" in UI conventions, which could cause users to perceive medium-priority items as more urgent than intended. Blue for low priority is unconventional; most task tools use grey/muted for low priority.

- **Notes preview is bounded but gives no truncation signal.** `line-clamp-2` (line 123) caps notes at 2 lines, which is appropriate. But there is no visual affordance indicating the notes are truncated -- no ellipsis fade, no "read more" link. Users may not realize additional content exists until they click into the task detail view.

- **Empty state is a dead end with no surrounding context.** Lines 134-142 show "No tasks for this day" centered with `py-16` vertical padding and a `+ Create Task` button. There is no indication of what adjacent days look like. Users who land on an empty day have zero context about whether tomorrow is busy or the rest of the week is packed. Showing a peek at adjacent days ("Tomorrow: 3 tasks, This week: 12 tasks") with navigation links would reduce the dead-end feeling and improve wayfinding.

- **"Create Task" button styling is inconsistent with WeekView's empty state.** The DayView CTA uses `bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90` (line 138) -- a prominent filled primary button. The WeekView's empty state uses `text-[var(--text-muted)] hover:bg-[var(--surface-hover)]` (lines 121-123) -- a ghost-style button with no background. These serve the same purpose (create a task on an empty day) but have completely different visual weight.

- **Day header is minimal and lacks date anchoring within the content area.** Lines 63-72 show only a conditional "Today" badge and a task count. The actual date is displayed in the parent CalendarView header bar (`CalendarView.tsx` line 79: `format(currentDate, 'EEEE, MMMM d, yyyy')`). On mobile, or when the header scrolls out of view, the day view content area has no date reference of its own.

- **No overdue visual treatment for past-due tasks.** Tasks with `due_date` before the current date are rendered identically to current tasks. The `Todo` type has `due_date` (types/todo.ts line 97) and the component receives `currentDate`, but no comparison or visual differentiation exists. For an insurance agency where missed renewal deadlines have financial consequences, this is a critical gap.

- **Subtask progress is text-only and hard to scan.** Line 117 renders `{completedSubtasks}/{subtaskCount} subtasks` as plain text. A small progress bar (thin colored `div` with percentage width) or a mini circular indicator would let users instantly distinguish "mostly done" from "barely started" without parsing the fraction.

- **No DnD for reordering within the day.** Unlike WeekView which wraps content in `DndContext` (WeekView.tsx line 230-238), DayView has no drag infrastructure. Users cannot reorder tasks to reflect their intended execution sequence for the day. The `display_order` field on `Todo` (types/todo.ts line 110) exists but is completely unused in this view.

- **Assigned_to display lacks visual identity.** Line 114 shows `Assigned to {todo.assigned_to}` as plain muted text. The `User` type (types/todo.ts line 229-238) has a `color` property intended for visual differentiation, but DayView does not use it. A small colored avatar dot or chip next to the assignee name would make assignment scanning significantly faster in multi-person agencies.

- **`onDateClick` has different semantics across views (confusing API).** In `CalendarView.tsx`, DayView receives `onDateClick={onDateClick}` (line 449) which is the task-creation handler, while WeekView receives `onDateClick={handleDrillToDay}` (line 439) which is the navigation handler. The same prop name means "create a task" in one view and "navigate to day" in another. This is a maintainability concern that could easily lead to future bugs.

- **Card hover effect is subtle and appropriate.** The `hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)]` (line 88) provides gentle feedback without being distracting. The `rounded-xl` rounding and `border border-[var(--border)]` baseline create a clean card appearance. The `group` class is applied but no `group-hover:` utilities are used -- this suggests incomplete implementation of a planned hover detail reveal.

### Cross-View Consistency

- **Progressive disclosure is well-graduated but has an information cliff between week and day views.** Month view shows 2 task previews (CalendarDayCell.tsx line 198: `todos.slice(0, 2)`) with name + small dot + "+N more." Week view shows all tasks in scrollable columns with DraggableTaskItem (name + dot + category label + premium). Day view shows full cards with title + priority badge + assignee + subtasks + notes. The progression from "glance" to "scan" to "detail" is logical. However, week view completely omits priority while day view makes it the second most prominent element after the title -- creating a steep information jump between adjacent zoom levels.

- **Category color representation varies in both size and metaphor across views.** Month: `w-1.5 h-1.5 rounded-full` dot (CalendarDayCell.tsx line 205). Week (DraggableTaskItem): `w-2 h-2 rounded-full` dot (CalendarDayCell.tsx line 85). Day: `w-1 self-stretch rounded-full` vertical bar (DayView.tsx line 92) plus a `w-2 h-2 rounded-full` dot in the details row (DayView.tsx line 110). The dot sizes are close but not identical (1.5 vs 2), and the day view introduces a completely different metaphor (vertical bar). This is not necessarily a problem -- the bar is more appropriate for full cards -- but users must re-orient their color-scanning pattern at each zoom level.

- **Drag-and-drop availability is inconsistent across all three views.** Month view: full DnD (MonthView wraps in DndContext via CalendarView). Week view: full DnD with its own `DndContext` (WeekView.tsx line 230). Day view: zero DnD -- no context, no droppable, no draggable. Users who learn drag-to-reschedule in month or week view lose that capability when drilling into day view. Paradoxically, the most detailed view -- where users spend the most time examining tasks -- is the only one that lacks the primary rescheduling interaction.

- **Click semantics drift between views.** Month view: clicking a cell with tasks opens a hover popup (CalendarDayCell.tsx line 135-139); clicking without tasks drills to day view. Week view: clicking a day header drills to day view; clicking a task opens task detail. Day view: clicking a task opens task detail; the "Create Task" button opens the creation modal. The "click a date" action means three different things depending on context: open popup, drill down, or create task. The WeekView's "+ Add task" button calling `handleDrillToDay` instead of opening creation is the most confusing instance of this drift.

- **The drag overlay (CalendarDragOverlay.tsx) is shared and appropriately minimal.** It shows a `max-w-[200px]` pill with category dot and task name (lines 17-21). Used by both month and week views. It does not show priority, assignee, or other metadata -- appropriate for a drag ghost where visual lightness during the interaction matters most.

- **Completed task filtering is consistent and well-implemented.** CalendarView.tsx line 227 filters out `todo.completed || todo.status === 'done'` before building the shared `todosByDate` map. All three views consume this same map, ensuring uniform behavior.

- **"Today" highlight varies in subtle ways across views.** Month view: `ring-2 ring-[var(--accent)] bg-[var(--accent)]/10` (CalendarDayCell.tsx line 173). Week view: `ring-2 ring-[var(--accent)] border-[var(--accent)]/30 bg-[var(--accent)]/5` (WeekView.tsx line 81). Day view: text badge with `bg-[var(--accent)]/10 text-[var(--accent)]` saying "Today" (DayView.tsx lines 64-68). The accent tint varies: 10% in month, 5% in week, 10% in day badge. The week view's 5% tint is noticeably more subtle than the month view's 10%, making it inconsistent.

### Recommendations

1. **Add a responsive week view mode for small screens** (highest impact). Replace the fixed `grid-cols-7` with `grid-cols-3 sm:grid-cols-5 lg:grid-cols-7` or implement horizontal scroll with snap points. On mobile, show only 3 days centered on today with swipe navigation. The current week view is effectively unusable below ~768px viewport width. (File: `WeekView.tsx` line 202)

2. **Add priority indicators to WeekView task items.** Add a small colored left border or dot based on `todo.priority` to `DraggableTaskItem`. Even a 2px left border in the priority color (red for urgent, orange for high) would bridge the information gap between week and day views without adding visual clutter. (File: `CalendarDayCell.tsx` lines 62-102)

3. **Add quick actions to DayView task cards.** Implement a right-side action area (visible on hover on desktop, always visible on mobile via the existing `group` class on line 88) with: complete (checkbox), reschedule (calendar icon), and priority toggle. These are the three most common task triage actions. The entire card currently functions as a single click target with no granular interaction points. (File: `DayView.tsx` lines 85-130)

4. **Add DnD reordering to DayView.** Wrap the task list in `DndContext` with `SortableContext` from `@dnd-kit/sortable`. Update `display_order` on reorder. This restores feature parity with WeekView's drag capability and lets users sequence their daily work execution order. (File: `DayView.tsx` -- new DnD infrastructure needed, mirroring `WeekView.tsx` lines 230-238)

5. **Fix the WeekView empty state "Add task" action.** Add an `onAddTask` prop to `WeekViewProps` in `WeekView.tsx`. In `CalendarView.tsx`, pass `onDateClick` (the task-creation handler, line 429) as `onAddTask` to `WeekView`, mirroring MonthView's existing dual-handler pattern. In `DroppableDayColumn`, use `onAddTask` for the empty-state button instead of `onDateClick`. (Files: `CalendarView.tsx` lines 434-442, `WeekView.tsx` lines 25-32 and 119-126)

6. **Add overdue visual treatment to DayView and WeekView.** Compare `todo.due_date` against the current date and add a red indicator (e.g., small "Overdue" badge next to priority badge, red-tinted left border, or `text-red-500` text color) for past-due tasks. The data is already available; only the visual expression is missing. Critical for an insurance agency where missed deadlines have direct financial consequences. (Files: `DayView.tsx` lines 77-131, `CalendarDayCell.tsx` DraggableTaskItem lines 60-101)

7. **Sort tasks within day columns by priority.** In `CalendarView.tsx` where `todosByDate` is built (lines 222-239), add a sort step after grouping: sort by priority weight (urgent > high > medium > low), then by `display_order` or `created_at` as a tiebreaker. This ensures urgent tasks appear at the top in both week and day views without per-view sorting logic. (File: `CalendarView.tsx` lines 230-238)

8. **Standardize "Today" highlight across all views.** Pick one consistent accent tint value (recommend 10%) and apply it uniformly. Use a left-border accent bar or header background tint for today in week view instead of a ring, reserving the ring pattern exclusively as a drop-zone indicator during drag. This resolves the today-vs-droppable visual ambiguity. (Files: `WeekView.tsx` line 81, `CalendarDayCell.tsx` line 173, `DayView.tsx` line 65)

9. **Add adjacent-day context to DayView empty state.** When the selected day has 0 tasks, show a small summary below the CTA: "Tomorrow: 3 tasks / This week: 12 tasks" with clickable navigation links. This reduces the dead-end feeling and keeps users oriented within the calendar. Requires passing `todosByDate` summary data or computing adjacent-day counts from the existing map. (File: `DayView.tsx` lines 134-142)

10. **Improve subtask progress visualization in DayView.** Replace the "2/5 subtasks" plain text with a small inline progress bar (thin `div` with percentage-based width and accent color fill). Keep the numeric text as a tooltip or alongside the bar for accessibility. (File: `DayView.tsx` line 117)

11. **Add assignee color coding to DayView.** Use the `User.color` property to render a small colored avatar dot or chip next to the "Assigned to" text, enabling faster visual scanning in multi-person agencies. (File: `DayView.tsx` lines 113-115 -- requires passing user color data through props or a user lookup mechanism)

12. **Differentiate view transition animations.** Give each view a unique transition signature: month could use a vertical slide or scale, week keeps the current horizontal slide, day could use a crossfade with subtle scale. This provides spatial cues about hierarchy navigation (zooming in vs. panning laterally). (Files: `WeekView.tsx` lines 34-47, `DayView.tsx` lines 24-37)

---

## Agent 4: Competitive Analysis & Feature Gaps
*(Comparing against Google Calendar, Outlook, Notion Calendar, Linear, Todoist — identifying missing patterns)*

### What Works Well

- **Three-view architecture (Day/Week/Month) with keyboard shortcuts** matches the navigation pattern used by Google Calendar, Outlook, and Notion Calendar. The `D/W/M/T` hotkeys and arrow-key navigation are consistent with Google Calendar's shortcuts, which power users expect.
- **Drag-and-drop rescheduling** via `@dnd-kit` in both Month and Week views is a first-class feature that matches Google Calendar and Todoist's reschedule-by-drag pattern. The 8px activation constraint in `PointerSensor` prevents accidental drags, a detail Google Calendar also implements.
- **Category filtering with count badges** in the sidebar and dropdown closely mirrors how Todoist handles label/project filters and how Outlook handles calendar overlay toggles. The "Select All / Clear All" affordance is a nice touch that Outlook includes but Google Calendar lacks.
- **Mini calendar sidebar** (`MiniCalendar.tsx`) follows the Google Calendar and Outlook pattern of a persistent month picker for quick navigation. The dot indicators showing days with tasks match Google Calendar's event-dot pattern.
- **Animated view transitions** via Framer Motion with directional awareness (left/right based on navigation direction) are more polished than most competitors. Google Calendar uses crossfade; this implementation's slide-with-direction gives stronger spatial orientation.
- **Progressive disclosure in month view cells** — showing 2 task previews with "+N more" and expanding to a hover popup — follows the Google Calendar pattern of showing limited events per cell with a "more" affordance. The popup includes drag handles and an "+ Add" button, which is a thoughtful integration.
- **Day view task cards** with priority badges, category color bars, subtask progress, assignee, and notes preview represent the richest task-detail rendering. This exceeds what Google Calendar or Todoist show in their day views and is comparable to Linear's issue detail level.
- **Accessibility foundations** are solid: ARIA `role="grid"`, `role="gridcell"`, `role="tab"`, `role="tablist"`, `aria-live="polite"` announcements on navigation, `aria-label` on all buttons. This is ahead of most competitors in screen reader support.
- **View switcher with visible keyboard shortcuts** (`CalendarViewSwitcher.tsx`) showing `D`, `W`, `M` next to labels is a discoverability pattern that Google Calendar hides behind `?` and Linear surfaces in command palette. Exposing them inline is better for onboarding.

### Missing High-Impact Patterns

1. **Overdue task visibility** (Reference: Todoist, Linear) — The current implementation filters out completed tasks (`todo.completed || todo.status === 'done'`) but does not visually distinguish overdue tasks from upcoming ones. In `CalendarView.tsx` line 226-229, all non-completed tasks with due dates are treated identically. Todoist shows overdue tasks in red and aggregates them at the top. Linear marks overdue items with a red badge. For an insurance agency workflow where missing a renewal deadline has real financial consequences, overdue tasks should be visually urgent — a red border, red date text, or an "Overdue" badge on the task chip in month/week cells.

2. **Inline quick-create from calendar** (Reference: Google Calendar, Notion Calendar) — Currently, `onDateClick` and `onAddTask` delegate to parent callbacks that presumably open a modal or navigate elsewhere. Google Calendar allows clicking an empty time slot to get an inline popover with a title field and "More options" link — the task is created without leaving the calendar view. Notion Calendar does the same with a minimal inline form. The current DayView empty state (`DayView.tsx` line 134-143) has a "+ Create Task" button but it navigates away. An inline creation form directly within the calendar cell or day column would dramatically reduce friction for the "I see an empty day, let me add something" workflow.

3. **Agenda/list view** (Reference: Outlook, Google Calendar, Todoist) — The three views (Day/Week/Month) are all grid-based spatial views. Outlook and Google Calendar both offer an "Agenda" or "Schedule" view that presents a chronological scrollable list of upcoming tasks/events. Todoist's "Upcoming" view is essentially this. For an insurance agency reviewing "what's coming up this week across all categories," a dense agenda list is often more scannable than a grid. This is particularly relevant since the data model is task-based (discrete items) rather than event-based (time blocks), making a list format natural.

4. **Today indicator line in week view** (Reference: Google Calendar, Outlook) — Google Calendar draws a red horizontal line at the current time across the week view. While this app doesn't use time slots, the week view (`WeekView.tsx`) could show a subtle visual indicator on the "today" column beyond the ring highlight — for instance, a colored header bar or a "NOW" marker — to immediately orient the user to where they are in the week. The current `ring-2 ring-[var(--accent)]` border is subtle and could be missed.

5. **Task count summary / workload heatmap** (Reference: GitHub contribution graph, Linear workload view) — The month view cells show task previews but don't provide an at-a-glance sense of workload distribution. Linear and GitHub use intensity-based coloring (lighter = fewer, darker = more) to show load across time. For the month view, a subtle background intensity gradient based on task count (e.g., 0 tasks = no tint, 5+ tasks = deeper tint) would let a manager instantly see which days are overloaded. The data is already available in `todosByDate`.

6. **Multi-select and bulk reschedule** (Reference: Todoist, Linear) — The current drag-and-drop moves one task at a time. Todoist allows selecting multiple tasks and dragging them together. Linear allows multi-select + bulk date change. For an insurance agency that might need to move all Friday tasks to Monday after a holiday, bulk operations would save significant time. The DnD infrastructure in `MonthView.tsx` and `WeekView.tsx` would need to support multi-selection state.

7. **Completed task toggle** (Reference: Todoist, Google Tasks) — `CalendarView.tsx` line 228 hard-filters completed tasks: `if (todo.completed || todo.status === 'done') return false`. Todoist and Google Tasks allow toggling completed task visibility. For reviewing what was accomplished this week, being able to see completed tasks (possibly with strikethrough or dimmed styling) on the calendar provides useful context without requiring a separate view.

8. **Week number display** (Reference: Outlook, Google Calendar settings) — Both Outlook and Google Calendar offer week number display. For business planning and reporting cycles, week numbers help coordinate ("let's target this for W15"). This is a minor addition to the week view header.

9. **Sticky "today" quick-return** (Reference: Google Calendar) — Google Calendar shows a floating "Back to today" indicator when you navigate away from the current date. The current "Today" button in the header (`CalendarView.tsx` line 313-320) is always visible, but there's no visual cue that you've scrolled away from today's view. A subtle badge or animation on the Today button when the current view doesn't contain today would help with orientation.

10. **Search/filter within calendar** (Reference: Google Calendar, Notion Calendar) — Beyond category filtering, there's no way to search for a specific task by name, customer, or assignee within the calendar view. Google Calendar's search narrows the calendar to show only matching events. For an agency with dozens of daily tasks, finding "the Smith renewal" on the calendar requires scanning visually.

### Anti-Patterns

- **Hover-to-reveal task popup in month view violates mobile-first principles.** `CalendarDayCell.tsx` uses `onMouseEnter`/`onMouseLeave` to show the task list popup (lines 157-158). On touch devices, hover doesn't exist, so the popup is only accessible via `handleCellClick` which toggles it. However, the toggle behavior means a tap on a cell with tasks opens the popup instead of drilling to day view — the user must then find the "+ Add" button or click a task. Todoist and Google Calendar use a click/tap that always navigates to the day, with the popup being an optional hover enhancement on desktop only.

- **Empty column in week view shows "+ Add task" that drills to day view instead of creating inline.** In `WeekView.tsx` line 120-126, the empty state button calls `onDateClick(day)` which triggers `handleDrillToDay` (switches to day view). This breaks the expected pattern — Google Calendar and Notion Calendar keep you in the current view when creating from an empty slot. Changing views as a side effect of wanting to create a task is disorienting.

- **Week view always shows 7 columns regardless of screen width.** `WeekView.tsx` uses `grid-cols-7` (line 202) which on smaller screens makes each column too narrow to read task text. Google Calendar switches to a 3-day or 1-day view on mobile. Outlook collapses to agenda view. The current `sm:p-4` padding adjustment is insufficient — the columns themselves need to be responsive, potentially showing a scrollable 3-day view on medium screens and defaulting to day view on mobile.

- **Day view has no drag-and-drop for rescheduling.** Both `MonthView.tsx` and `WeekView.tsx` wrap content in `DndContext` for drag-and-drop, but `DayView.tsx` does not. If a user drills into day view and wants to move a task to tomorrow, they must navigate back to week view, find the task, and drag it. This inconsistency means the most detailed view (where users spend the most time examining tasks) is the only view that doesn't support the primary rescheduling interaction.

- **Month view popup positioning doesn't account for edge cells.** `CalendarDayCell.tsx` line 229 positions the popup with `left-0 top-full` — always below and to the left. For cells in the rightmost columns or bottom rows, this popup may overflow the viewport. Google Calendar dynamically positions its event popover based on available space (left/right/above/below). The current implementation will clip on mobile and on right-edge days.

- **Category filter dropdown in the header is duplicated in the sidebar.** Both the header filter button dropdown (`CalendarView.tsx` lines 328-414) and the sidebar legend (`CalendarView.tsx` lines 467-506) allow toggling categories. The header dropdown is visible on mobile while the sidebar is `hidden lg:flex`. This creates two sources of truth that must stay in sync (they do share state). The anti-pattern is the visual duplication on desktop — two different UI affordances doing the same thing in the same view causes confusion about which one to use. Google Calendar solves this with a single sidebar-only filter pattern.

- **No visual feedback after drag-and-drop reschedule.** When `onReschedule` fires in `MonthView.tsx` line 111-112 or `WeekView.tsx` line 179-180, the task is rescheduled but there's no toast, undo prompt, or animation showing the task moving to its new date. Google Calendar shows a brief "Event moved to [date]" snackbar with an "Undo" button. Linear shows a toast. Without feedback, the user can't confirm the drop landed correctly, especially if the source cell popup closed during drag (line 147-151 in `CalendarDayCell.tsx`).

### Quick Wins

1. **Add overdue styling to task chips** — In `CalendarDayCell.tsx` and `WeekView.tsx`, compare `todo.due_date` against `new Date()` and add a `text-red-500` or `border-red-500` class to tasks whose due date has passed. This is a 5-line conditional that immediately communicates urgency. Reference code location: `CalendarDayCell.tsx` line 199 (task preview loop) and `DraggableTaskItem` line 60-101.

2. **Show task count in week view day headers more prominently** — The current count badge in `WeekView.tsx` line 102-106 is a small muted pill. Replace with a bolder badge when count > 3 (e.g., orange background for 4-6, red for 7+) to signal workload. This gives immediate heatmap-like information without building a full heatmap feature.

3. **Add a toast/snackbar after drag-drop reschedule** — The `onReschedule` callback in `CalendarView.tsx` should trigger a toast notification with "Task moved to [date] — Undo". The app already uses toast notifications for mutations per the CLAUDE.md conventions. This is a single toast call at the parent level.

4. **Fix popup positioning for edge cells** — In `CalendarDayCell.tsx`, add logic to check if the cell is in the last two columns (pass a `columnIndex` prop from `MonthView.tsx`) and switch from `left-0` to `right-0`. Similarly, for bottom rows, position the popup above with `bottom-full` instead of `top-full`. ~20 lines of conditional CSS.

5. **Add "No tasks today" zero state with date in day view** — The current DayView empty state (`DayView.tsx` line 134-143) says "No tasks for this day" generically. Add the formatted date (e.g., "No tasks for Wednesday, Feb 11") and a suggestion like "Drag tasks here from the week view, or create a new one." This small copy change reduces disorientation.

6. **Dim/mute weekend columns in week view** — In `DroppableDayColumn` (`WeekView.tsx`), check if the day is Saturday or Sunday and apply a lighter background tint. Google Calendar and Outlook both visually de-emphasize weekends. This is a one-line class conditional using `day.getDay() === 0 || day.getDay() === 6`.

7. **Add "Return to today" visual indicator** — When the current view doesn't include today's date, add a subtle pulse animation or dot badge on the "Today" button in `CalendarView.tsx` line 313-320. A CSS `animate-pulse` class conditioned on `!viewIncludesToday` immediately communicates navigation state.

8. **Show priority indicator on month view task chips** — The month view cell previews (`CalendarDayCell.tsx` lines 198-211) only show category color dots and text. Adding a small priority indicator (e.g., `!` for urgent, `!!` for high) next to the task name costs 3-4 lines and brings critical information density closer to what Todoist shows in its calendar view.

9. **Keyboard shortcut for creating a task on the focused date** — Add `n` or `Enter` as a keyboard shortcut (in `CalendarView.tsx` keyboard handler, line 162-193) that calls `onDateClick(currentDate)` to create a new task. Google Calendar uses `c` for quick create. This completes the keyboard-driven workflow alongside the existing navigation shortcuts.

10. **Add subtle grid lines between month view weeks** — The month view rows (`MonthView.tsx` line 149-171) use `space-y-1` gap but no visual separator. Adding a `border-b border-[var(--border)]/30` to each week row would provide the horizontal grid lines that Google Calendar, Outlook, and Notion Calendar all use to improve scannability.

### Feature Priority Matrix

| Feature | Reference Product | Effort (S/M/L) | Impact (1-5) |
|---------|------------------|-----------------|--------------|
| Overdue task styling (red indicators) | Todoist, Linear | S | 5 |
| Toast + undo after drag-drop reschedule | Google Calendar | S | 4 |
| Fix popup positioning for edge cells | Google Calendar | S | 4 |
| Dim weekend columns in week view | Google Calendar, Outlook | S | 3 |
| "Return to today" visual indicator | Google Calendar | S | 3 |
| Priority indicator on month view chips | Todoist | S | 3 |
| Keyboard shortcut for task creation | Google Calendar | S | 3 |
| Grid lines between month view weeks | Google Calendar, Outlook | S | 2 |
| Task count heatmap badges in week view | Linear | S | 3 |
| Formatted date in day view empty state | General UX | S | 2 |
| Inline quick-create from calendar cell | Google Calendar, Notion Calendar | M | 5 |
| Completed task toggle | Todoist, Google Tasks | M | 4 |
| Agenda/list view | Outlook, Todoist | M | 4 |
| Drag-and-drop in day view | Google Calendar (internal consistency) | M | 3 |
| Responsive week view (3-day on mobile) | Google Calendar | M | 4 |
| Search/filter within calendar view | Google Calendar, Notion Calendar | M | 3 |
| Today indicator line in week view | Google Calendar, Outlook | S | 2 |
| Week number display | Outlook | S | 1 |
| Multi-select + bulk reschedule | Todoist, Linear | L | 3 |
| Workload heatmap on month view | GitHub, Linear | M | 2 |

**Recommended implementation order** (based on impact/effort ratio):
1. Overdue task styling (S effort, 5 impact) — immediate safety improvement for insurance deadlines
2. Inline quick-create (M effort, 5 impact) — biggest friction reducer for daily use
3. Toast + undo for reschedule (S effort, 4 impact) — missing feedback on a core interaction
4. Responsive week view (M effort, 4 impact) — currently unusable on tablets
5. Completed task toggle (M effort, 4 impact) — enables "what did we accomplish" review workflow
6. Fix popup edge positioning (S effort, 4 impact) — fixes a visible bug on right-edge dates
7. Agenda view (M effort, 4 impact) — fills the "what's coming up" use case that grid views serve poorly

---

## Consolidated Priority Matrix

Cross-referenced findings from all 4 agents, deduplicated and ranked by impact/effort ratio.

### P0 — Bug Fixes (do first)

| # | Issue | Agents | Effort | Files |
|---|-------|--------|--------|-------|
| 1 | **WeekView "+ Add task" drills to DayView instead of opening modal** | A2, A3, A4 | S | WeekView.tsx, CalendarView.tsx |
| 2 | **Dark theme accent color divergence** (`.dark` vs `prefers-color-scheme` define different `--accent`) | A1 | S | globals.css |

### P1 — High Impact, Small Effort

| # | Issue | Agents | Effort | Files |
|---|-------|--------|--------|-------|
| 3 | **Overdue task styling** — red indicators on past-due tasks across all views | A3, A4 | S | CalendarDayCell.tsx, DayView.tsx, CalendarView.tsx |
| 4 | **Toast + undo after drag-drop reschedule** | A4 | S | CalendarView.tsx (onReschedule handler) |
| 5 | **Yellow priority badge fails WCAG AA** — change `text-yellow-600` to `text-yellow-700` | A1, A3 | S | DayView.tsx |
| 6 | **Today accent tint inconsistent** (5% in WeekView vs 10% elsewhere) | A1, A3 | S | WeekView.tsx |
| 7 | **Month view: increase task previews from 2 to 3** + add hover "+" on empty cells | A1 | S | CalendarDayCell.tsx |
| 8 | **Sort tasks by priority** in `todosByDate` grouping | A3 | S | CalendarView.tsx |
| 9 | **Popup positioning for edge/bottom cells** — flip to right-0/bottom-full | A2, A4 | S | CalendarDayCell.tsx, MonthView.tsx |
| 10 | **Scope keyboard shortcuts** — skip when modal/dialog is open | A2 | S | CalendarView.tsx |
| 11 | **MiniCalendar: keep current view mode on date click** (don't force DayView) | A2 | S | CalendarView.tsx |
| 12 | **Add priority indicators to WeekView task items** — 2px left border by priority color | A1, A3 | S | CalendarDayCell.tsx (DraggableTaskItem) |
| 13 | **Dim weekend columns in WeekView** | A4 | S | WeekView.tsx |
| 14 | **"Return to today" pulse on Today button** when view doesn't include today | A4 | S | CalendarView.tsx |

### P2 — High Impact, Medium Effort

| # | Issue | Agents | Effort | Files |
|---|-------|--------|--------|-------|
| 15 | **Responsive WeekView** — 3-col on mobile, 5-col on tablet, 7-col on desktop | A1, A2, A3, A4 | M | WeekView.tsx |
| 16 | **Fix category colors for dark theme** — CSS custom property tokens with light/dark variants | A1 | M | globals.css, CalendarDayCell.tsx |
| 17 | **Touch support: CalendarDayCell popups** — click-toggle for touch, hover for pointer | A2, A4 | M | CalendarDayCell.tsx |
| 18 | **Add TouchSensor to DnD contexts** alongside PointerSensor | A2 | S | MonthView.tsx, WeekView.tsx |
| 19 | **DayView quick actions** — checkbox, reschedule, priority toggle on hover | A3 | M | DayView.tsx |
| 20 | **DayView DnD support** — reorder tasks, feature parity with Month/Week | A2, A3, A4 | M | DayView.tsx |
| 21 | **Swipe gestures for mobile navigation** | A2 | M | CalendarView.tsx |
| 22 | **AnimatePresence mode="popLayout"** to eliminate blank frame on transitions | A1, A2 | S | MonthView.tsx, WeekView.tsx, DayView.tsx |

### P3 — Medium Impact, Various Effort

| # | Issue | Agents | Effort | Files |
|---|-------|--------|--------|-------|
| 23 | **Completed task toggle** — show/hide completed with dimmed styling | A4 | M | CalendarView.tsx |
| 24 | **Agenda/list view** — chronological scrollable task list | A4 | M | New: AgendaView.tsx |
| 25 | **"Back to Week/Month" breadcrumb in DayView** | A2 | S | CalendarView.tsx, DayView.tsx |
| 26 | **Dark theme shadows** — replace Tailwind shadow-lg with design system tokens | A1 | S | CalendarDayCell.tsx, CalendarView.tsx, CalendarViewSwitcher.tsx |
| 27 | **Standardize category dot sizes** across views (all w-2 h-2) | A1, A3 | S | CalendarDayCell.tsx, CalendarDragOverlay.tsx |
| 28 | **Empty state CTA consistency** — align WeekView ghost button with DayView styling | A1, A3 | S | WeekView.tsx, DayView.tsx |
| 29 | **DayView empty state context** — show adjacent day task counts, reduce padding | A1, A3 | S | DayView.tsx |
| 30 | **Month cell aspect-square too tall on wide screens** — use aspect-[4/3] or auto | A1 | S | CalendarDayCell.tsx |
| 31 | **Keyboard shortcut for task creation** (N or C key) | A4 | S | CalendarView.tsx |
| 32 | **Grid lines between month view weeks** | A4 | S | MonthView.tsx |
| 33 | **Task count heatmap badges** — color-escalate week view count badges for busy days | A3, A4 | S | WeekView.tsx |
| 34 | **Inline quick-create** from calendar cells (popover with title field) | A4 | M | CalendarDayCell.tsx, WeekView.tsx |
| 35 | **Filter state visibility** — inline chips when filters active, "filtered" empty state banner | A2 | M | CalendarView.tsx |

### P4 — Low Impact / Nice-to-Have

| # | Issue | Agents | Effort | Files |
|---|-------|--------|--------|-------|
| 36 | Non-current-month cell differentiation in dark mode | A1 | S | CalendarDayCell.tsx |
| 37 | MiniCalendar dot size increase + density indication | A1 | S | MiniCalendar.tsx |
| 38 | Sidebar collapsible + responsive width | A1 | M | CalendarView.tsx |
| 39 | Search/filter within calendar view | A4 | M | CalendarView.tsx |
| 40 | Multi-select + bulk reschedule | A4 | L | MonthView, WeekView |
| 41 | Week number display | A4 | S | WeekView.tsx |
| 42 | Workload heatmap on month view | A4 | M | CalendarDayCell.tsx |
| 43 | Differentiated view transition animations (zoom vs pan) | A1, A3 | M | All view files |
| 44 | Design system typography token adoption across calendar | A1 | M | All calendar files |

---

## Implementation Recommendations

### Sprint 1: Bug Fixes + Quick Wins (1-2 days)
Items #1-14 from the priority matrix. All small effort, high impact. Focus on:
- Fix the WeekView add-task bug (#1) — most impactful interaction defect
- Overdue styling (#3) — critical for insurance agency workflow
- Toast on reschedule (#4) — missing feedback on core interaction
- Yellow contrast fix (#5) + today tint (#6) — WCAG compliance
- Sort tasks by priority (#8) — zero-UI improvement
- Popup edge positioning (#9) — visible layout bug
- MiniCalendar view preservation (#11) — navigation sanity

### Sprint 2: Mobile & Responsiveness (2-3 days)
Items #15-22. Make the calendar usable on tablets and phones:
- Responsive WeekView grid (#15) — the default view is broken on mobile
- Touch popup support (#17) + TouchSensor for DnD (#18)
- Swipe gestures (#21) — most impactful mobile improvement
- AnimatePresence fix (#22) — eliminates visual glitch on every navigation

### Sprint 3: Power Features (3-5 days)
Items #19-20, #23-25, #34-35:
- DayView quick actions + DnD (#19, #20) — makes DayView actionable instead of read-only
- Completed task toggle (#23) — "what did we accomplish" workflow
- Agenda view (#24) — fills the chronological list view gap
- Inline quick-create (#34) — biggest friction reducer for daily task creation

### Sprint 4: Polish & Consistency (2-3 days)
Items #26-33, #36-37:
- Dark theme shadows, category dot standardization, empty state alignment
- Month cell aspect ratio fix, grid lines, keyboard creation shortcut
- Task count heatmap badges, MiniCalendar improvements

### Deferred / Future Sprints
Items #38-44: Search, multi-select, bulk operations, workload heatmap, design system migration. These are larger efforts with moderate impact — revisit after core UX is solid.
