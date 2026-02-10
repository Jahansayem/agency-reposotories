# W2: Task & Chat Fixes Report

## Summary
- Issues assigned: 4
- Issues fixed: 4
- TypeScript: PASS

## Fixes

### 1. MEDIUM: SmartParseModal handleConfirm not memoized — FIXED
- **File**: `src/components/SmartParseModal.tsx`
- Wrapped `handleConfirm` in `useCallback` with proper dependencies.

### 2. MEDIUM: Circular dependency in realtimeReconnection — FIXED
- **File**: `src/lib/realtimeReconnection.ts`
- Broke circular dependency between `handleStatusChange` and `startHeartbeat` using a ref (`handleStatusChangeRef`).
- `startHeartbeat` now calls `handleStatusChangeRef.current()` instead of `handleStatusChange` directly.

### 3. MEDIUM: Client-provided createdBy overrides auth — FIXED
- **File**: `src/app/api/outlook/create-task/route.ts`
- Now always uses authenticated user's ID from session, ignoring client-provided `createdBy`.

### 4. MEDIUM: Duplicate USER_COLORS — FIXED
- **File**: `src/app/api/invitations/accept/route.ts`
- Removed local `USER_COLORS` definition, imported from `src/lib/constants.ts` instead.
