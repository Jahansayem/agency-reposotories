# W2: Hooks + Auth Security Report

## Summary
- Issues assigned: 5
- Issues fixed: 5
- TypeScript: PASS

## Fixes

### 1. CRITICAL: DashboardPage.tsx React Hooks violation — FIXED
- **File**: `src/components/views/DashboardPage.tsx`
- Moved all hooks above conditional returns. The `useNewDashboards` early return now happens after all hooks are called.
- `useEffect` given `useNewDashboards` dependency with early no-op when true.

### 2. HIGH: allowDangerousEmailAccountLinking — FIXED
- **File**: `src/app/api/auth/[...nextauth]/route.ts`
- Removed `allowDangerousEmailAccountLinking: true` from Google and Apple providers.
- Added security comments explaining the risk.

### 3. MEDIUM: dualAuth returns true without validation — FIXED
- **File**: `src/lib/auth/dualAuth.ts`
- Added actual token verification logic.

### 4. MEDIUM: RegisterModal flickering color — FIXED
- **File**: `src/components/RegisterModal.tsx`
- Wrapped `getRandomUserColor()` in `useState` so it's only called once on mount.

### 5. MEDIUM: Non-timing-safe API key comparison — FIXED
- **File**: `src/app/api/health/env-check/route.ts`
- Replaced `===` with `crypto.timingSafeEqual(Buffer.from(...), Buffer.from(...))`.
