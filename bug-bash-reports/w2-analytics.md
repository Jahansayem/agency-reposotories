# Wave 2 Bug Bash Report: Analytics

**Agent**: w2-analytics
**Date**: 2026-02-09
**Issues fixed**: 6 (2 HIGH, 4 MEDIUM after re-evaluation)

---

## 1. HIGH: Customers API fetches ALL records (OOM risk)

**File**: `src/app/api/customers/route.ts`
**Problem**: Both `customer_insights` and `cross_sell_opportunities` queries had no `.limit()`, fetching unbounded rows into memory before client-side merge/dedupe.
**Fix**: Added `.limit(1000)` to both Supabase queries. The existing pagination (offset/limit from query params, max 100 per page) still applies after the merge step. The 1000-row cap prevents OOM while covering the vast majority of agency sizes.

## 2. HIGH: useAnalyticsAPI missing CSRF tokens

**File**: `src/components/analytics/hooks/useAnalyticsAPI.ts`
**Problem**: `useApiCall` used plain `fetch()` for POST requests without CSRF token headers. The middleware validates CSRF on all state-changing API requests, so these POSTs would be rejected in environments with CSRF enforcement.
**Fix**: Replaced `fetch()` with `fetchWithCsrf()` from `@/lib/csrf`, which automatically fetches/caches the CSRF token and attaches the `X-CSRF-Token` header plus auth headers.

## 3. HIGH: Cross-sell summary query empty-string fallback

**File**: `src/app/api/analytics/cross-sell/route.ts` (lines ~131-143)
**Problem**: Summary and premium aggregation queries used `.eq('agency_id', agencyId || '')`, which could match records with an empty-string `agency_id` if the auth context somehow returned a falsy value.
**Fix**: Added early return with 400 status if `agencyId` is falsy before the summary queries. Removed the `|| ''` fallback from both `.eq()` calls.

## 4. MEDIUM: Division by zero in lead quality vendor recommendations

**File**: `src/app/api/analytics/lead-quality/route.ts` (line ~315)
**Problem**: `generateVendorRecommendations()` computed `avgLtvCac` by dividing by `performances.length` without checking for an empty array, producing `NaN`.
**Fix**: Added early return of empty recommendations array when `performances.length === 0`.

## 5. MEDIUM: useLiveMetrics wrong endpoint / data mapping

**File**: `src/components/analytics/hooks/useAnalyticsRealtime.ts`
**Problem**: `useLiveMetrics` fetched `GET /api/analytics/segmentation`, which returns static segment definitions (no `success`, `portfolioAnalysis`, or segment percentage arrays). The data mapping always silently failed, leaving metrics as `null`.
**Fix**: Switched to `GET /api/customers?limit=1`, which returns real computed `stats` (total customers, totalPremium, hotCount, highCount). Mapped these fields to the `LiveMetrics` interface correctly, computing `avgLtv` and `highValuePercentage` from the stats.

## 6. MEDIUM: SQL wildcards in customer name (ilike injection)

**File**: `src/app/api/customers/[id]/route.ts` (line ~176)
**Problem**: Customer name was interpolated directly into an `ilike` pattern (`%${customer.name}%`) without escaping SQL wildcard characters (`%`, `_`). A customer named `%admin%` would match far more rows than intended.
**Fix**: Imported `escapeLikePattern` from `@/lib/constants` (already used in other routes) and applied it: `%${escapeLikePattern(customer.name)}%`.

---

## Verification

- `npx tsc --noEmit`: No new type errors introduced. Pre-existing merge conflict errors exist in `TaskDetailPanel.tsx` and `members/route.ts` (unrelated).
- All six files compile cleanly.
