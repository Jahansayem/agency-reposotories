# Bug Bash Report: Analytics & Dashboard

**Scope Agent:** Claude (Analytics & Dashboard)
**Date:** 2026-02-09
**Files Audited:** 45+
**Directories:** `src/components/analytics/`, `src/components/dashboard/`, `src/components/customer/`, `src/app/api/analytics/`, `src/app/api/customers/`, `src/lib/analytics/`, `src/lib/segmentation.ts`

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 1 (FIXED) |
| HIGH     | 3 |
| MEDIUM   | 4 |
| LOW      | 2 |

---

## CRITICAL Bugs (Fixed)

### C1. Unsanitized PATCH updates allow arbitrary column overwrites
- **File:** `src/app/api/analytics/cross-sell/route.ts` (lines 268-328)
- **Description:** The PATCH handler destructures the request body as `const { id, ...updates } = body` and passes `updates` directly to `supabase.from('cross_sell_opportunities').update(updates)`. A malicious client could include `agency_id`, `priority_score`, `id`, or any other column in the request body, allowing unauthorized data modification across agencies.
- **Impact:** Agency data isolation bypass. An attacker could reassign opportunities to a different agency or corrupt scoring data.
- **Fix Applied:** Added a field whitelist (`ALLOWED_FIELDS` Set) that filters incoming fields before passing to `.update()`. Only explicitly permitted fields (`notes`, `contacted_at`, `converted_at`, `converted_premium`, `dismissed`, `contact_method`, `next_action`, `next_action_date`, and the special flags `mark_contacted`, `mark_converted`, `dismiss`) are allowed through. Returns 400 if no valid fields remain after filtering.

---

## HIGH Bugs (Document Only)

### H1. Customers API fetches ALL records without limits for merge/dedupe
- **File:** `src/app/api/customers/route.ts` (lines 61-64, 79-83)
- **Description:** The GET handler fetches ALL records from both `customer_insights` and `cross_sell_opportunities` tables (no `.limit()`) to build a merged/deduplicated customer list. For agencies with thousands of records, this could cause memory exhaustion or timeouts.
- **Impact:** Performance degradation or OOM crashes for large agencies.
- **Recommendation:** Add server-side limits (e.g., 5000 records max per table) and implement cursor-based pagination for the merge operation. Alternatively, move the merge logic to a database view or function.

### H2. useAnalyticsAPI hook missing CSRF tokens for POST requests
- **File:** `src/components/analytics/hooks/useAnalyticsAPI.ts` (lines 161-165)
- **Description:** The generic `useApiCall` hook uses plain `fetch()` for POST requests without CSRF tokens, while other components like `CsvUploadModal.tsx` correctly use `fetchWithCsrf`. Any component using these hooks for mutation operations will fail CSRF validation if CSRF protection is enforced.
- **Impact:** POST requests from analytics hooks will be rejected when CSRF middleware is active. Currently may work if CSRF is not enforced on analytics routes, but represents a security gap.
- **Recommendation:** Replace the plain `fetch()` call in `useApiCall` with `fetchWithCsrf` from `@/lib/csrf`, or add CSRF token headers to the request configuration.

### H3. Summary query uses empty string fallback for agencyId
- **File:** `src/app/api/analytics/cross-sell/route.ts` (line 135)
- **Description:** The summary aggregation query uses `.eq('agency_id', agencyId || '')`. When `agencyId` is null/undefined, this matches records with an empty string `agency_id` rather than returning no results or handling the null case. This could return unintended data or empty results.
- **Impact:** Incorrect summary statistics when agencyId is missing. Could potentially expose data from records with empty agency_id strings.
- **Recommendation:** Add an early return or guard clause: `if (!agencyId) return NextResponse.json({ error: 'Agency ID required' }, { status: 400 })`.

---

## MEDIUM Bugs (Document Only)

### M1. Division by zero in lead quality scoring
- **File:** `src/app/api/analytics/lead-quality/route.ts` (line 315)
- **Description:** The aggregation code calculates `performances.reduce((sum, p) => sum + p.ltvCacRatio, 0) / performances.length`. If `performances` is an empty array, this produces `NaN` which propagates through the response.
- **Impact:** API returns NaN values that could cause UI rendering issues or incorrect analytics.
- **Recommendation:** Add a guard: `const avgLtvCac = performances.length > 0 ? performances.reduce(...) / performances.length : 0;`

### M2. useLiveMetrics fetches wrong endpoint
- **File:** `src/components/analytics/hooks/useAnalyticsRealtime.ts` (lines 178-179)
- **Description:** The `useLiveMetrics` hook calls GET on `/api/analytics/segmentation`, but that endpoint's GET handler returns static segment definitions (tier thresholds), not live portfolio metrics. The hook expects `data.portfolioAnalysis` which will always be undefined from the GET response.
- **Impact:** Live metrics display shows empty/undefined data. Not a crash since the UI handles missing data gracefully, but the feature is non-functional.
- **Recommendation:** Either change the endpoint to a POST with the expected payload, or create a dedicated GET endpoint that returns portfolio analysis data.

### M3. Customer name used in ilike without escaping SQL wildcards
- **File:** `src/app/api/customers/[id]/route.ts` (line 176)
- **Description:** When searching for related tasks, the customer name is interpolated directly into an `ilike` query: `.ilike('text', '%${customer.name}%')`. If a customer name contains SQL wildcard characters (`%` or `_`), the query could return unintended results.
- **Impact:** Incorrect related task results for customers with special characters in names. Not a SQL injection risk since Supabase parameterizes values, but the wildcard characters are interpreted by the `LIKE` operator.
- **Recommendation:** Escape `%` and `_` characters in the customer name before using in `ilike`: `const escapedName = customer.name.replace(/[%_]/g, '\\$&');`

### M4. CSV files parsed through Excel parser in AI upload
- **File:** `src/app/api/analytics/ai-upload/route.ts` (line 539)
- **Description:** The AI upload route processes CSV files through `parseExcelFile()` which uses the XLSX library. While XLSX can handle CSV files, it may silently produce incorrect results for certain CSV edge cases (e.g., files with BOM markers, non-standard delimiters, or encoding issues).
- **Impact:** Potential data corruption during import for edge-case CSV formats. The standard upload route has its own CSV parser that may handle these cases differently, leading to inconsistent behavior between the two upload paths.
- **Recommendation:** Add explicit CSV detection and use a dedicated CSV parser (like Papa Parse) for `.csv` files, reserving the XLSX parser for `.xlsx/.xls` files only.

---

## LOW Bugs (Document Only)

### L1. BookOfBusinessDashboard contains hardcoded static data
- **File:** `src/components/analytics/dashboards/BookOfBusinessDashboard.tsx` (1228 lines)
- **Description:** The entire dashboard renders hardcoded static data from a `bookOfBusinessData` constant. While a `ConnectedBookOfBusinessDashboard.tsx` wrapper exists to fetch live data, the base component never accepts props for dynamic data -- it always renders the November 2025 audit snapshot.
- **Impact:** No functional impact since the connected wrapper handles this, but the static component is 1228 lines of dead weight that could mislead developers.
- **Recommendation:** Consider refactoring `BookOfBusinessDashboard` to accept data as props, or clearly mark the static data as demo/fallback only.

### L2. Unused `monthStart` variable in TeamProductionPanel
- **File:** `src/components/dashboard/TeamProductionPanel.tsx` (line 33)
- **Description:** The variable `const monthStart = startOfMonth(now)` is computed but never used in the component logic.
- **Impact:** No functional impact, just dead code.
- **Recommendation:** Remove the unused variable and the `startOfMonth` import if not needed elsewhere.

---

## Files Audited (Complete List)

### API Routes
- `src/app/api/analytics/cross-sell/route.ts` -- CRITICAL + HIGH bugs found
- `src/app/api/analytics/cross-sell/generate-tasks/route.ts` -- Clean
- `src/app/api/analytics/upload/route.ts` -- Clean
- `src/app/api/analytics/calendar/route.ts` -- Clean
- `src/app/api/analytics/segmentation/route.ts` -- Clean
- `src/app/api/analytics/simulate/route.ts` -- Clean
- `src/app/api/analytics/cash-flow/route.ts` -- Clean
- `src/app/api/analytics/lead-quality/route.ts` -- MEDIUM bug found
- `src/app/api/analytics/optimal-times/route.ts` -- Clean
- `src/app/api/analytics/ai-upload/route.ts` -- MEDIUM bug found
- `src/app/api/customers/route.ts` -- HIGH bug found
- `src/app/api/customers/[id]/route.ts` -- MEDIUM bug found
- `src/app/api/customers/import/route.ts` -- Clean (well-secured)

### Analytics Components
- `src/components/analytics/CsvUploadModal.tsx` -- Clean
- `src/components/analytics/DataFlowBanner.tsx` -- Clean
- `src/components/analytics/dashboards/BookOfBusinessDashboard.tsx` -- LOW (static data)
- `src/components/analytics/dashboards/ConnectedBookOfBusinessDashboard.tsx` -- Clean
- `src/components/analytics/dashboards/CustomerSegmentationDashboard.tsx` -- Clean
- `src/components/analytics/panels/TodayOpportunitiesPanel.tsx` -- Clean
- `src/components/analytics/hooks/useAnalyticsAPI.ts` -- HIGH bug found
- `src/components/analytics/hooks/useAnalyticsRealtime.ts` -- MEDIUM bug found
- `src/components/analytics/hooks/useTodayOpportunities.ts` -- Clean

### Customer Components
- `src/components/customer/CustomerCard.tsx` -- Clean
- `src/components/customer/CustomerSearchInput.tsx` -- Clean
- `src/components/customer/CustomerDetailPanel.tsx` -- Clean
- `src/components/customer/CustomerBadge.tsx` -- Clean

### Dashboard Components
- `src/components/dashboard/ManagerDashboard.tsx` -- Clean
- `src/components/dashboard/StaffDashboard.tsx` -- Clean
- `src/components/dashboard/DoerDashboard.tsx` -- Clean
- `src/components/dashboard/DailyDigestPanel.tsx` -- Clean
- `src/components/dashboard/DailyDigestSkeleton.tsx` -- Clean
- `src/components/dashboard/InsightCard.tsx` -- Clean
- `src/components/dashboard/StatCard.tsx` -- Clean
- `src/components/dashboard/QuickActions.tsx` -- Clean
- `src/components/dashboard/ScoreBreakdownTooltip.tsx` -- Clean
- `src/components/dashboard/AnimatedProgressRing.tsx` -- Clean
- `src/components/dashboard/MiniSparkline.tsx` -- Clean
- `src/components/dashboard/CompletionPrediction.tsx` -- Clean
- `src/components/dashboard/DashboardEmptyState.tsx` -- Clean
- `src/components/dashboard/LogSaleModal.tsx` -- Clean
- `src/components/dashboard/QuickStatsBar.tsx` -- Clean
- `src/components/dashboard/UnassignedTasksAlert.tsx` -- Clean
- `src/components/dashboard/FeatureAdoptionPrompts.tsx` -- Clean
- `src/components/dashboard/SubtaskProgressWidget.tsx` -- Clean
- `src/components/dashboard/TeamProductionPanel.tsx` -- LOW (unused variable)
- `src/components/dashboard/PipelineHealthPanel.tsx` -- Clean
- `src/components/dashboard/RenewalsCalendarPanel.tsx` -- Clean
- `src/components/dashboard/MissingDueDatesWarning.tsx` -- Clean
- `src/components/dashboard/ListView.tsx` -- Clean
- `src/components/dashboard/BoardView.tsx` -- Clean
- `src/components/dashboard/TableView.tsx` -- Clean
- `src/components/dashboard/AddGoalModal.tsx` -- Clean
- `src/components/dashboard/EditGoalModal.tsx` -- Clean

### Core Logic
- `src/lib/segmentation.ts` -- Clean
- `src/lib/analytics/index.ts` -- Clean (barrel export)
- `src/lib/analytics/enhanced-scoring.ts` -- Clean
