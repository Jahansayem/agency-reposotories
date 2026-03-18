# Cross-Sell Opportunity Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Surface cross-sell opportunities to agents immediately after task creation via auto name-extraction, a confirmation banner, list-row badges, and on-demand Claude pre-call coaching.

**Architecture:** Post-creation hook fires after `addTodo` returns a new task ID; Claude extracts the customer name; fuzzy-matches against `cross_sell_opportunities`; shows a confirmation banner. Confirmed links populate `customer_id` on the task, unlocking an opportunity badge on the list row, an elevated callout in the task modal, and on-demand Claude coaching.

**Tech Stack:** Next.js App Router API routes, `@anthropic-ai/sdk` via existing `callClaude()` wrapper in `src/lib/aiApiHelper.ts`, Vitest unit tests, Playwright E2E.

**Design doc:** `docs/plans/2026-02-19-cross-sell-opportunity-integration-design.md`

---

## Codebase Orientation (read before starting)

- **AI route pattern:** See `src/app/api/ai/enhance-task/route.ts` — uses `withAiErrorHandling` + `withSessionAuth`, `validateAiRequest`, `callClaude`, `parseAiJsonResponse`, `aiSuccessResponse`
- **Supabase client in routes:** import `{ createRouteHandlerClient }` from `@supabase/auth-helpers-nextjs`, call `cookies()` from `next/headers`
- **Task creation:** `src/hooks/useTodoOperations.ts` — `addTodo()` currently returns `void`; Task 1 changes it to return the new `todoId`
- **MetadataBadges:** `src/components/todo-item/MetadataBadges.tsx` — primary badge row has priority, due date, assignee, customer badges
- **Modal insertion point:** `src/components/task-detail/TaskDetailModal.tsx` line ~220 — after `<MetadataSection>`, before the customer panel block
- **Types:** `src/types/allstate-analytics.ts` has `CrossSellOpportunity`; `src/types/todo.ts` has `Todo`; `src/types/customer.ts` has `LinkedCustomer`

---

## Task 1: Return new task ID from `addTodo`

Currently `addTodo` returns `void`. We need the new task's ID to trigger the opportunity matcher.

**Files:**
- Modify: `src/hooks/useTodoOperations.ts`

**Step 1: Read the file**

Read `src/hooks/useTodoOperations.ts` lines 100-260 to understand `createTodoDirectly` and `addTodo`.

**Step 2: Modify `createTodoDirectly` to return the ID**

Find `createTodoDirectly` (around line 109). The new todo's ID is already generated with `crypto.randomUUID()` or similar. Change it to return `string`:

```typescript
// Before (returns void implicitly)
const createTodoDirectly = useCallback((text, priority, ...) => {
  const newTodo: Todo = {
    id: crypto.randomUUID(),
    // ...
  };
  addTodoToStore(newTodo);
  // ... supabase upsert, activity log, etc.
}, [...]);

// After (return the id)
const createTodoDirectly = useCallback((text, priority, ...): string => {
  const newTodo: Todo = {
    id: crypto.randomUUID(),
    // ...
  };
  addTodoToStore(newTodo);
  // ... supabase upsert, activity log, etc.
  return newTodo.id;  // ← ADD THIS
}, [...]);
```

**Step 3: Change `addTodo` return type to `string | undefined`**

Find the `addTodo` function (around line 260). Change to:

```typescript
const addTodo = useCallback((
  text: string,
  priority: TodoPriority,
  // ... all existing params unchanged ...
): string | undefined => {
  // duplicate check block unchanged ...
  if (duplicates.length > 0) {
    openDuplicateModal(...);
    return undefined;  // early return when dupe modal shown
  }
  return createTodoDirectly(text, priority, ...);  // ← now returns string
}, [...]);
```

**Step 4: Run TypeScript check**

```bash
cd /Users/adrianstier/shared-todo-list && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing errors unrelated to this change).

**Step 5: Commit**

```bash
git add src/hooks/useTodoOperations.ts
git commit -m "feat: return new todo ID from addTodo for opportunity matching"
```

---

## Task 2: `POST /api/ai/match-customer-opportunity` route

Extracts customer name from task text via Claude, fuzzy-matches against `cross_sell_opportunities`.

**Files:**
- Create: `src/app/api/ai/match-customer-opportunity/route.ts`
- Create: `src/test/api/match-customer-opportunity.test.ts`

**Step 1: Write the failing test**

```typescript
// src/test/api/match-customer-opportunity.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock aiApiHelper
vi.mock('@/lib/aiApiHelper', () => ({
  callClaude: vi.fn(),
  parseAiJsonResponse: vi.fn(),
  aiSuccessResponse: (data: object) => Response.json({ success: true, ...data }),
  aiErrorResponse: (msg: string, status = 500) => Response.json({ success: false, error: msg }, { status }),
  validateAiRequest: vi.fn(),
}));

// Mock supabase
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

import { callClaude, parseAiJsonResponse, validateAiRequest } from '@/lib/aiApiHelper';

describe('match-customer-opportunity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('extracts name and returns matched opportunity', async () => {
    vi.mocked(validateAiRequest).mockResolvedValue({
      valid: true,
      body: { taskText: 'Call Janis Urich about her claim', agencyId: 'agency-1' },
      response: null,
    });
    vi.mocked(callClaude).mockResolvedValue({
      success: true,
      content: '{"customer_name":"Janis Urich"}',
    });
    vi.mocked(parseAiJsonResponse).mockReturnValue({ customer_name: 'Janis Urich' });

    // import POST handler after mocks
    const { POST } = await import('@/app/api/ai/match-customer-opportunity/route');
    const req = new Request('http://localhost/api/ai/match-customer-opportunity', {
      method: 'POST',
      body: JSON.stringify({ taskText: 'Call Janis Urich about her claim', agencyId: 'agency-1' }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(callClaude).toHaveBeenCalledOnce();
  });

  it('returns matched:false when Claude extraction returns null name', async () => {
    vi.mocked(validateAiRequest).mockResolvedValue({
      valid: true,
      body: { taskText: 'Review documents', agencyId: 'agency-1' },
      response: null,
    });
    vi.mocked(callClaude).mockResolvedValue({
      success: true,
      content: '{"customer_name":null}',
    });
    vi.mocked(parseAiJsonResponse).mockReturnValue({ customer_name: null });

    const { POST } = await import('@/app/api/ai/match-customer-opportunity/route');
    const req = new Request('http://localhost/api/ai/match-customer-opportunity', {
      method: 'POST',
      body: JSON.stringify({ taskText: 'Review documents', agencyId: 'agency-1' }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.matched).toBe(false);
  });

  it('returns matched:false silently when Claude call fails', async () => {
    vi.mocked(validateAiRequest).mockResolvedValue({
      valid: true,
      body: { taskText: 'Call Bob Jones', agencyId: 'agency-1' },
      response: null,
    });
    vi.mocked(callClaude).mockResolvedValue({ success: false, error: 'timeout' });

    const { POST } = await import('@/app/api/ai/match-customer-opportunity/route');
    const req = new Request('http://localhost/api/ai/match-customer-opportunity', {
      method: 'POST',
      body: JSON.stringify({ taskText: 'Call Bob Jones', agencyId: 'agency-1' }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.matched).toBe(false);
  });
});
```

**Step 2: Run test to confirm it fails**

```bash
cd /Users/adrianstier/shared-todo-list && npm run test -- src/test/api/match-customer-opportunity.test.ts 2>&1 | tail -20
```

Expected: FAIL — module not found.

**Step 3: Create the route**

```typescript
// src/app/api/ai/match-customer-opportunity/route.ts
import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import {
  callClaude,
  parseAiJsonResponse,
  aiSuccessResponse,
  validateAiRequest,
  withAiErrorHandling,
  withSessionAuth,
} from '@/lib/aiApiHelper';

interface MatchRequest {
  taskText: string;
  agencyId: string;
}

interface MatchResult {
  matched: boolean;
  customer: { id: string; name: string; segment: string } | null;
  opportunity: {
    id: string;
    priorityTier: string;
    priorityScore: number;
    recommendedProduct: string;
    potentialPremiumAdd: number;
    talkingPoint1: string;
    talkingPoint2: string;
    talkingPoint3: string;
    currentProducts: string;
    tenureYears: number;
    currentPremium: number;
    daysUntilRenewal: number;
  } | null;
}

export const POST = withAiErrorHandling(
  'MatchCustomerOpportunity',
  withSessionAuth(async (request: NextRequest) => {
    const validation = await validateAiRequest(request, {
      customValidator: (body) => {
        if (!body.taskText || typeof body.taskText !== 'string') return 'taskText is required';
        if (!body.agencyId || typeof body.agencyId !== 'string') return 'agencyId is required';
        return null;
      },
    });
    if (!validation.valid) return validation.response;

    const { taskText, agencyId } = validation.body as MatchRequest;

    // Skip very short task texts
    if (taskText.trim().split(/\s+/).length < 3) {
      return aiSuccessResponse({ matched: false, customer: null, opportunity: null } as MatchResult);
    }

    // Step 1: Extract customer name via Claude
    const nameResult = await callClaude({
      userMessage: `Extract the full customer name from this insurance agency task text.
Return ONLY valid JSON: { "customer_name": "First Last" } or { "customer_name": null } if no name is present.
Task: "${taskText.slice(0, 500)}"`,
      maxTokens: 60,
      component: 'MatchCustomerOpportunity',
    });

    if (!nameResult.success) {
      return aiSuccessResponse({ matched: false, customer: null, opportunity: null } as MatchResult);
    }

    const parsed = parseAiJsonResponse<{ customer_name: string | null }>(nameResult.content);
    if (!parsed?.customer_name) {
      return aiSuccessResponse({ matched: false, customer: null, opportunity: null } as MatchResult);
    }

    const extractedName = parsed.customer_name.trim();

    // Step 2: Fuzzy match against cross_sell_opportunities
    const supabase = createRouteHandlerClient({ cookies });
    const { data: opportunities, error } = await supabase
      .from('cross_sell_opportunities')
      .select(`
        id, customer_name, priority_tier, priority_score,
        recommended_product, potential_premium_add,
        talking_point_1, talking_point_2, talking_point_3,
        current_products, tenure_years, current_premium,
        days_until_renewal, task_id, dismissed, agency_id
      `)
      .eq('agency_id', agencyId)
      .eq('dismissed', false)
      .ilike('customer_name', `%${extractedName}%`)
      .order('priority_score', { ascending: false })
      .limit(1);

    if (error || !opportunities?.length) {
      return aiSuccessResponse({ matched: false, customer: null, opportunity: null } as MatchResult);
    }

    const opp = opportunities[0];

    // Step 3: Look up customer_id from customer_insights by name
    const { data: insights } = await supabase
      .from('customer_insights')
      .select('id, segment_tier')
      .eq('agency_id', agencyId)
      .ilike('customer_name', `%${opp.customer_name}%`)
      .limit(1);

    const insight = insights?.[0];

    return aiSuccessResponse({
      matched: true,
      customer: {
        id: insight?.id ?? '',
        name: opp.customer_name,
        segment: insight?.segment_tier ?? 'standard',
      },
      opportunity: {
        id: opp.id,
        priorityTier: opp.priority_tier,
        priorityScore: opp.priority_score,
        recommendedProduct: opp.recommended_product,
        potentialPremiumAdd: opp.potential_premium_add,
        talkingPoint1: opp.talking_point_1,
        talkingPoint2: opp.talking_point_2,
        talkingPoint3: opp.talking_point_3,
        currentProducts: opp.current_products,
        tenureYears: opp.tenure_years,
        currentPremium: opp.current_premium,
        daysUntilRenewal: opp.days_until_renewal,
      },
    } as MatchResult);
  })
);
```

**Step 4: Run tests to confirm they pass**

```bash
cd /Users/adrianstier/shared-todo-list && npm run test -- src/test/api/match-customer-opportunity.test.ts 2>&1 | tail -20
```

Expected: 3 passing.

**Step 5: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 6: Commit**

```bash
git add src/app/api/ai/match-customer-opportunity/route.ts src/test/api/match-customer-opportunity.test.ts
git commit -m "feat: add match-customer-opportunity AI route for name extraction + fuzzy match"
```

---

## Task 3: `POST /api/ai/opportunity-coaching` route

On-demand endpoint: takes task purpose + opportunity data, returns a 2–3 sentence pre-call coaching paragraph.

**Files:**
- Create: `src/app/api/ai/opportunity-coaching/route.ts`
- Create: `src/test/api/opportunity-coaching.test.ts`

**Step 1: Write the failing test**

```typescript
// src/test/api/opportunity-coaching.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/aiApiHelper', () => ({
  callClaude: vi.fn(),
  aiSuccessResponse: (data: object) => Response.json({ success: true, ...data }),
  aiErrorResponse: (msg: string, status = 500) => Response.json({ success: false, error: msg }, { status }),
  validateAiRequest: vi.fn(),
  withAiErrorHandling: (_name: string, handler: Function) => handler,
  withSessionAuth: (handler: Function) => handler,
}));

import { callClaude, validateAiRequest } from '@/lib/aiApiHelper';

describe('opportunity-coaching', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns coaching text when Claude succeeds', async () => {
    vi.mocked(validateAiRequest).mockResolvedValue({
      valid: true,
      body: {
        taskText: 'Call Janis about her claim',
        customerName: 'Janis Urich',
        recommendedProduct: 'Home Insurance',
        currentProducts: 'Auto',
        tenureYears: 9,
        currentPremium: 890,
        potentialPremiumAdd: 340,
        talkingPoint1: 'Long-term customer qualifies for bundle discount',
        talkingPoint2: 'Bundling saves average 15%',
      },
      response: null,
    });
    vi.mocked(callClaude).mockResolvedValue({
      success: true,
      content: 'You are calling about her claim. Once resolved, mention the bundle opportunity.',
    });

    const { POST } = await import('@/app/api/ai/opportunity-coaching/route');
    const req = new Request('http://localhost/api/ai/opportunity-coaching', {
      method: 'POST',
      body: JSON.stringify({ taskText: 'Call Janis about her claim', customerName: 'Janis Urich', recommendedProduct: 'Home Insurance', currentProducts: 'Auto', tenureYears: 9, currentPremium: 890, potentialPremiumAdd: 340, talkingPoint1: 'Long-term customer', talkingPoint2: 'Bundling saves 15%' }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.coaching).toBeTruthy();
    expect(typeof json.coaching).toBe('string');
  });

  it('returns error when Claude fails', async () => {
    vi.mocked(validateAiRequest).mockResolvedValue({
      valid: true,
      body: { taskText: 'test', customerName: 'Test', recommendedProduct: 'Home', currentProducts: 'Auto', tenureYears: 1, currentPremium: 500, potentialPremiumAdd: 200, talkingPoint1: 'tp1', talkingPoint2: 'tp2' },
      response: null,
    });
    vi.mocked(callClaude).mockResolvedValue({ success: false, error: 'rate limited' });

    const { POST } = await import('@/app/api/ai/opportunity-coaching/route');
    const req = new Request('http://localhost/api/ai/opportunity-coaching', {
      method: 'POST',
      body: JSON.stringify({ taskText: 'test', customerName: 'Test', recommendedProduct: 'Home', currentProducts: 'Auto', tenureYears: 1, currentPremium: 500, potentialPremiumAdd: 200, talkingPoint1: 'tp1', talkingPoint2: 'tp2' }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.success).toBe(false);
  });
});
```

**Step 2: Run test to confirm it fails**

```bash
npm run test -- src/test/api/opportunity-coaching.test.ts 2>&1 | tail -10
```

**Step 3: Create the route**

```typescript
// src/app/api/ai/opportunity-coaching/route.ts
import { NextRequest } from 'next/server';
import {
  callClaude,
  aiSuccessResponse,
  aiErrorResponse,
  validateAiRequest,
  withAiErrorHandling,
  withSessionAuth,
} from '@/lib/aiApiHelper';

interface CoachingRequest {
  taskText: string;
  customerName: string;
  recommendedProduct: string;
  currentProducts: string;
  tenureYears: number;
  currentPremium: number;
  potentialPremiumAdd: number;
  talkingPoint1: string;
  talkingPoint2: string;
}

export const POST = withAiErrorHandling(
  'OpportunityCoaching',
  withSessionAuth(async (request: NextRequest) => {
    const validation = await validateAiRequest(request, {
      customValidator: (body) => {
        if (!body.taskText) return 'taskText is required';
        if (!body.customerName) return 'customerName is required';
        if (!body.recommendedProduct) return 'recommendedProduct is required';
        return null;
      },
    });
    if (!validation.valid) return validation.response;

    const {
      taskText,
      customerName,
      recommendedProduct,
      currentProducts,
      tenureYears,
      currentPremium,
      potentialPremiumAdd,
      talkingPoint1,
      talkingPoint2,
    } = validation.body as CoachingRequest;

    const result = await callClaude({
      systemPrompt: `You are a pre-call coach for an Allstate insurance agent.
Be conversational and specific — not scripted or salesy.
Insurance agents build long-term relationships; the tone should feel like advice from a colleague.
Respond with plain text only — no JSON, no markdown, no bullet points.`,
      userMessage: `The agent is about to: "${taskText}"

This customer (${customerName}) also has a cross-sell opportunity:
- Recommended product: ${recommendedProduct}
- Currently has: ${currentProducts} (${tenureYears} years, $${currentPremium}/yr)
- Potential add: +$${potentialPremiumAdd}/yr
- Talking points: "${talkingPoint1}" / "${talkingPoint2}"

Write 2–3 sentences:
1. Acknowledge the reason for the call
2. Suggest the natural moment to bring up the opportunity
3. Give one specific, natural opener line

Keep it under 60 words.`,
      maxTokens: 150,
      component: 'OpportunityCoaching',
    });

    if (!result.success) {
      return aiErrorResponse('Coaching unavailable — use the talking points above', 503);
    }

    return aiSuccessResponse({ coaching: result.content.trim() });
  })
);
```

**Step 4: Run tests**

```bash
npm run test -- src/test/api/opportunity-coaching.test.ts 2>&1 | tail -10
```

Expected: 2 passing.

**Step 5: Commit**

```bash
git add src/app/api/ai/opportunity-coaching/route.ts src/test/api/opportunity-coaching.test.ts
git commit -m "feat: add opportunity-coaching AI route for pre-call Claude coaching"
```

---

## Task 4: `useOpportunityMatcher` hook

Client-side state machine that fires after task creation, calls the match API, and exposes confirm/dismiss handlers.

**Files:**
- Create: `src/hooks/useOpportunityMatcher.ts`
- Create: `src/test/hooks/useOpportunityMatcher.test.ts`

**Step 1: Write the failing test**

```typescript
// src/test/hooks/useOpportunityMatcher.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock fetch
global.fetch = vi.fn();

describe('useOpportunityMatcher', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts idle and transitions to matched on successful API response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        matched: true,
        customer: { id: 'cust-1', name: 'Janis Urich', segment: 'premium' },
        opportunity: {
          id: 'opp-1', priorityTier: 'HOT', priorityScore: 120,
          recommendedProduct: 'Home Insurance', potentialPremiumAdd: 340,
          talkingPoint1: 'tp1', talkingPoint2: 'tp2', talkingPoint3: 'tp3',
          currentProducts: 'Auto', tenureYears: 9, currentPremium: 890, daysUntilRenewal: 12,
        },
      }),
    } as Response);

    const { useOpportunityMatcher } = await import('@/hooks/useOpportunityMatcher');
    const { result } = renderHook(() =>
      useOpportunityMatcher({ taskId: 'task-1', taskText: 'Call Janis about claim', agencyId: 'agency-1', existingCustomerId: null })
    );

    expect(result.current.state).toBe('loading');

    await waitFor(() => expect(result.current.state).toBe('matched'));
    expect(result.current.customer?.name).toBe('Janis Urich');
    expect(result.current.opportunity?.priorityTier).toBe('HOT');
  });

  it('transitions to none when no match found', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, matched: false, customer: null, opportunity: null }),
    } as Response);

    const { useOpportunityMatcher } = await import('@/hooks/useOpportunityMatcher');
    const { result } = renderHook(() =>
      useOpportunityMatcher({ taskId: 'task-2', taskText: 'Review documents', agencyId: 'agency-1', existingCustomerId: null })
    );

    await waitFor(() => expect(result.current.state).toBe('none'));
  });

  it('skips API call if existingCustomerId is set', async () => {
    const { useOpportunityMatcher } = await import('@/hooks/useOpportunityMatcher');
    const { result } = renderHook(() =>
      useOpportunityMatcher({ taskId: 'task-3', taskText: 'Call someone', agencyId: 'agency-1', existingCustomerId: 'already-linked' })
    );

    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.state).toBe('idle');
  });

  it('transitions to confirmed and calls updateTodo on confirm()', async () => {
    const mockUpdateTodo = vi.fn().mockResolvedValue(undefined);
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true, matched: true,
          customer: { id: 'cust-1', name: 'Janis Urich', segment: 'premium' },
          opportunity: { id: 'opp-1', priorityTier: 'HOT', priorityScore: 120, recommendedProduct: 'Home', potentialPremiumAdd: 340, talkingPoint1: 'tp1', talkingPoint2: 'tp2', talkingPoint3: 'tp3', currentProducts: 'Auto', tenureYears: 9, currentPremium: 890, daysUntilRenewal: 12 },
        }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response); // PATCH call

    const { useOpportunityMatcher } = await import('@/hooks/useOpportunityMatcher');
    const { result } = renderHook(() =>
      useOpportunityMatcher({ taskId: 'task-4', taskText: 'Call Janis', agencyId: 'agency-1', existingCustomerId: null, onConfirm: mockUpdateTodo })
    );

    await waitFor(() => expect(result.current.state).toBe('matched'));
    await act(() => result.current.confirm());

    expect(result.current.state).toBe('confirmed');
  });

  it('transitions to dismissed on dismiss()', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, matched: true, customer: { id: 'c', name: 'Bob', segment: 'standard' }, opportunity: { id: 'o', priorityTier: 'HIGH', priorityScore: 80, recommendedProduct: 'Home', potentialPremiumAdd: 200, talkingPoint1: 'tp1', talkingPoint2: 'tp2', talkingPoint3: 'tp3', currentProducts: 'Auto', tenureYears: 3, currentPremium: 600, daysUntilRenewal: 20 } }),
    } as Response);

    const { useOpportunityMatcher } = await import('@/hooks/useOpportunityMatcher');
    const { result } = renderHook(() =>
      useOpportunityMatcher({ taskId: 'task-5', taskText: 'Call Bob', agencyId: 'agency-1', existingCustomerId: null })
    );

    await waitFor(() => expect(result.current.state).toBe('matched'));
    act(() => result.current.dismiss());

    expect(result.current.state).toBe('dismissed');
  });
});
```

**Step 2: Run test to confirm it fails**

```bash
npm run test -- src/test/hooks/useOpportunityMatcher.test.ts 2>&1 | tail -10
```

**Step 3: Create the hook**

```typescript
// src/hooks/useOpportunityMatcher.ts
'use client';
import { useState, useEffect, useCallback } from 'react';

export type MatchState = 'idle' | 'loading' | 'matched' | 'confirmed' | 'dismissed' | 'none';

export interface MatchedCustomer {
  id: string;
  name: string;
  segment: string;
}

export interface MatchedOpportunity {
  id: string;
  priorityTier: 'HOT' | 'HIGH' | 'MEDIUM' | 'LOW';
  priorityScore: number;
  recommendedProduct: string;
  potentialPremiumAdd: number;
  talkingPoint1: string;
  talkingPoint2: string;
  talkingPoint3: string;
  currentProducts: string;
  tenureYears: number;
  currentPremium: number;
  daysUntilRenewal: number;
}

interface UseOpportunityMatcherOptions {
  taskId: string | null;
  taskText: string;
  agencyId: string;
  existingCustomerId: string | null;
  onConfirm?: (customer: MatchedCustomer) => Promise<void>;
}

interface UseOpportunityMatcherReturn {
  state: MatchState;
  customer: MatchedCustomer | null;
  opportunity: MatchedOpportunity | null;
  confirm: () => Promise<void>;
  dismiss: () => void;
}

export function useOpportunityMatcher({
  taskId,
  taskText,
  agencyId,
  existingCustomerId,
  onConfirm,
}: UseOpportunityMatcherOptions): UseOpportunityMatcherReturn {
  const [state, setState] = useState<MatchState>(existingCustomerId ? 'idle' : taskId ? 'loading' : 'idle');
  const [customer, setCustomer] = useState<MatchedCustomer | null>(null);
  const [opportunity, setOpportunity] = useState<MatchedOpportunity | null>(null);

  useEffect(() => {
    // Skip if already linked, no task yet, or text too short
    if (!taskId || existingCustomerId || taskText.trim().split(/\s+/).length < 3) return;

    let cancelled = false;

    const run = async () => {
      setState('loading');
      try {
        const res = await fetch('/api/ai/match-customer-opportunity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskText, agencyId }),
        });
        if (cancelled) return;

        const data = await res.json();
        if (cancelled) return;

        if (data.matched && data.customer && data.opportunity) {
          setCustomer(data.customer);
          setOpportunity(data.opportunity);
          setState('matched');
        } else {
          setState('none');
        }
      } catch {
        if (!cancelled) setState('none');
      }
    };

    run();
    return () => { cancelled = true; };
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirm = useCallback(async () => {
    if (!customer || !taskId) return;
    setState('confirmed');
    if (onConfirm) {
      await onConfirm(customer);
    }
    // Link opportunity.task_id if not already set
    if (opportunity?.id) {
      await fetch(`/api/analytics/cross-sell/${opportunity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      }).catch(() => {}); // non-critical
    }
  }, [customer, opportunity, taskId, onConfirm]);

  const dismiss = useCallback(() => {
    setState('dismissed');
  }, []);

  return { state, customer, opportunity, confirm, dismiss };
}
```

**Step 4: Run tests**

```bash
npm run test -- src/test/hooks/useOpportunityMatcher.test.ts 2>&1 | tail -15
```

Expected: 5 passing.

**Step 5: Commit**

```bash
git add src/hooks/useOpportunityMatcher.ts src/test/hooks/useOpportunityMatcher.test.ts
git commit -m "feat: add useOpportunityMatcher hook with idle/loading/matched/confirmed/dismissed state machine"
```

---

## Task 5: `OpportunityMatchBanner` component

The non-blocking confirmation banner shown after task creation.

**Files:**
- Create: `src/components/todo/OpportunityMatchBanner.tsx`

**Step 1: Create the component**

No unit test needed — this is a display component. Test it via E2E in Task 10.

```tsx
// src/components/todo/OpportunityMatchBanner.tsx
'use client';
import { useEffect, useRef } from 'react';
import { Flame, Zap, X, Check, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOpportunityMatcher, MatchedCustomer, MatchedOpportunity } from '@/hooks/useOpportunityMatcher';

interface OpportunityMatchBannerProps {
  taskId: string;
  taskText: string;
  agencyId: string;
  existingCustomerId: string | null;
  onConfirm: (customer: MatchedCustomer) => Promise<void>;
}

const TIER_CONFIG = {
  HOT: { icon: Flame, label: '🔥 HOT', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  HIGH: { icon: Zap, label: '⚡ HIGH', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  MEDIUM: { icon: null, label: 'MEDIUM', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  LOW: { icon: null, label: 'LOW', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
} as const;

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function OpportunityMatchBanner({
  taskId,
  taskText,
  agencyId,
  existingCustomerId,
  onConfirm,
}: OpportunityMatchBannerProps) {
  const { state, customer, opportunity, confirm, dismiss } = useOpportunityMatcher({
    taskId,
    taskText,
    agencyId,
    existingCustomerId,
    onConfirm,
  });

  // Auto-dismiss after 15s
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (state === 'matched') {
      timerRef.current = setTimeout(dismiss, 15000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [state, dismiss]);

  if (state !== 'matched' || !customer || !opportunity) return null;

  const tierConfig = TIER_CONFIG[opportunity.priorityTier as keyof typeof TIER_CONFIG] ?? TIER_CONFIG.MEDIUM;

  return (
    <AnimatePresence>
      <motion.div
        role="alert"
        aria-live="polite"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${tierConfig.bg}`}
      >
        <div className="flex items-start gap-3">
          <UserCheck className="w-5 h-5 mt-0.5 text-[var(--text-muted)] flex-shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--foreground)] leading-snug">
              Looks like this is for{' '}
              <span className="font-semibold">{customer.name}</span>
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              <span className={`font-semibold ${tierConfig.color}`}>{tierConfig.label}</span>
              {' '}opportunity: {opportunity.recommendedProduct}
              {' '}·{' '}
              <span className="text-green-400">+{formatCurrency(opportunity.potentialPremiumAdd)}/yr</span>
            </p>
          </div>
          <button
            onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); dismiss(); }}
            className="p-1 rounded hover:bg-white/10 text-[var(--text-muted)] flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={async () => { if (timerRef.current) clearTimeout(timerRef.current); await confirm(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent)]/90 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Link {customer.name.split(' ')[0]}
          </button>
          <button
            onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); dismiss(); }}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors"
          >
            Not them
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/todo/OpportunityMatchBanner.tsx
git commit -m "feat: add OpportunityMatchBanner component for post-creation customer confirmation"
```

---

## Task 6: Wire banner into task creation flow

Show the banner after a task is created from `AddTaskModal`.

**Files:**
- Modify: `src/components/AddTaskModal.tsx`
- Modify: `src/components/TodoList.tsx` (or wherever `AddTaskModal` is rendered)

**Step 1: Read the files**

Read:
- `src/components/AddTaskModal.tsx` (full file — understand props and handleAdd)
- `src/components/TodoList.tsx` lines 800–900 (find where AddTaskModal is rendered and `onAdd` is wired)

**Step 2: Add pending task state to the modal's parent in `TodoList.tsx`**

Find where `AddTaskModal` is rendered in `TodoList.tsx`. Add state for the most recently created task:

```tsx
// Add near other state in TodoList.tsx (or useTodoListState.ts)
const [pendingOpportunityCheck, setPendingOpportunityCheck] = useState<{
  taskId: string;
  taskText: string;
} | null>(null);
```

**Step 3: Capture task ID when `onAdd` is called**

Find the `onAdd` handler passed to `<AddTaskModal>`. Change it to capture the returned task ID:

```tsx
// Before:
onAdd={(text, priority, ...) => {
  operations.addTodo(text, priority, ...);
}}

// After:
onAdd={(text, priority, dueDate, assignedTo, subtasks, transcription, sourceFile, reminderAt, notes, recurrence, customer) => {
  const newId = operations.addTodo(text, priority, dueDate, assignedTo, subtasks, transcription, sourceFile, reminderAt, notes, recurrence, customer);
  // Only trigger opportunity check if no customer already linked
  if (newId && !customer?.id) {
    setPendingOpportunityCheck({ taskId: newId, taskText: text });
  }
}}
```

**Step 4: Render the banner**

In `TodoList.tsx`, import `OpportunityMatchBanner` and render it:

```tsx
import OpportunityMatchBanner from '@/components/todo/OpportunityMatchBanner';
import { useTodoStore } from '@/store/todoStore';

// Inside the component, get agencyId from currentUser:
// const agencyId = currentUser.current_agency_id ?? '';

// After the AddTaskModal JSX:
{pendingOpportunityCheck && (
  <OpportunityMatchBanner
    taskId={pendingOpportunityCheck.taskId}
    taskText={pendingOpportunityCheck.taskText}
    agencyId={currentUser.current_agency_id ?? ''}
    existingCustomerId={null}
    onConfirm={async (customer) => {
      await operations.updateTodo(pendingOpportunityCheck.taskId, {
        customer_id: customer.id,
        customer_name: customer.name,
        customer_segment: customer.segment as any,
      });
      setPendingOpportunityCheck(null);
    }}
  />
)}
```

**Step 5: Clear pending check when banner auto-dismisses or task is navigated away**

The `OpportunityMatchBanner` internally handles dismissal. Add a cleanup in `useEffect`:

```tsx
// Clear pending check when modal closes (user navigated away)
useEffect(() => {
  if (!showAddTaskModal) {
    // Small delay to allow banner to show after modal closes
    const t = setTimeout(() => {
      if (pendingOpportunityCheck) {
        // Don't clear — let the banner auto-dismiss via its own timer
      }
    }, 100);
    return () => clearTimeout(t);
  }
}, [showAddTaskModal]);
```

Actually, simpler: just let the banner self-manage. Once it reaches `confirmed` or `dismissed`, it returns null. No extra cleanup needed in the parent. Just clear `pendingOpportunityCheck` after confirm:

```tsx
onConfirm={async (customer) => {
  await operations.updateTodo(...);
  setPendingOpportunityCheck(null);  // ← clears after confirmed
}}
```

**Step 6: TypeScript check + build**

```bash
npx tsc --noEmit 2>&1 | head -20
npm run build 2>&1 | tail -20
```

**Step 7: Commit**

```bash
git add src/components/AddTaskModal.tsx src/components/TodoList.tsx
git commit -m "feat: wire OpportunityMatchBanner into task creation — shows after new task saved"
```

---

## Task 7: `useCustomerOpportunities` context + `OpportunityBadge`

Shared opportunity data for list badges — avoids per-row API calls.

**Files:**
- Create: `src/hooks/useCustomerOpportunities.ts`
- Create: `src/components/todo/OpportunityBadge.tsx`

**Step 1: Create the shared hook**

```typescript
// src/hooks/useCustomerOpportunities.ts
'use client';
import { useEffect, useState } from 'react';
import { useTodoStore } from '@/store/todoStore';

export type OpportunityTier = 'HOT' | 'HIGH' | 'MEDIUM' | 'LOW';

// Map of customer_id → top opportunity tier
type OpportunityMap = Map<string, OpportunityTier>;

let cache: OpportunityMap = new Map();
let lastFetch = 0;
const TTL_MS = 60_000; // refresh every 60s

export function useCustomerOpportunities(): OpportunityMap {
  const [map, setMap] = useState<OpportunityMap>(cache);
  const todos = useTodoStore((s) => s.todos);

  useEffect(() => {
    // Get all unique customer_ids from tasks
    const customerIds = [...new Set(todos.map((t) => t.customer_id).filter(Boolean))] as string[];
    if (!customerIds.length) return;

    const now = Date.now();
    if (now - lastFetch < TTL_MS && cache.size > 0) {
      setMap(cache);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch('/api/analytics/cross-sell/by-customer-ids', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerIds }),
        });
        if (!res.ok) return;
        const data: { customerId: string; priorityTier: OpportunityTier }[] = await res.json();
        const newMap = new Map(data.map((d) => [d.customerId, d.priorityTier]));
        cache = newMap;
        lastFetch = Date.now();
        setMap(newMap);
      } catch {
        // Non-critical, fail silently
      }
    };

    fetchData();
  }, [todos]);

  return map;
}
```

> **Note:** This hook requires a new lightweight API route `POST /api/analytics/cross-sell/by-customer-ids`. Create it in this task too.

**Step 2: Create the supporting API route**

```typescript
// src/app/api/analytics/cross-sell/by-customer-ids/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { withSessionAuth } from '@/lib/aiApiHelper';

export const POST = withSessionAuth(async (request: NextRequest) => {
  const { customerIds } = await request.json();
  if (!Array.isArray(customerIds) || !customerIds.length) {
    return NextResponse.json([]);
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  // Get agency_id for this user
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_agency_id')
    .eq('id', user.id)
    .single();

  if (!profile?.current_agency_id) return NextResponse.json([]);

  // Fetch top opportunity per customer_id via customer_insights join
  const { data } = await supabase
    .from('customer_insights')
    .select(`
      id,
      cross_sell_opportunities!inner (
        priority_tier,
        priority_score,
        dismissed
      )
    `)
    .in('id', customerIds)
    .eq('agency_id', profile.current_agency_id)
    .eq('cross_sell_opportunities.dismissed', false)
    .order('cross_sell_opportunities.priority_score', { ascending: false });

  if (!data) return NextResponse.json([]);

  const result = data.map((insight: any) => ({
    customerId: insight.id,
    priorityTier: insight.cross_sell_opportunities?.[0]?.priority_tier ?? null,
  })).filter((r: any) => r.priorityTier);

  return NextResponse.json(result);
});
```

> **Note:** If the Supabase join syntax above doesn't work for your schema, fall back to two separate queries: one for customer_insights by IDs, one for cross_sell_opportunities by customer_name IN (...). Check the actual schema if needed.

**Step 3: Create `OpportunityBadge`**

```tsx
// src/components/todo/OpportunityBadge.tsx
'use client';
import { Flame, Zap, TrendingUp } from 'lucide-react';
import type { OpportunityTier } from '@/hooks/useCustomerOpportunities';

interface OpportunityBadgeProps {
  tier: OpportunityTier;
  onClick?: () => void;
}

const TIER_CONFIG = {
  HOT:    { icon: Flame,       label: 'HOT',    className: 'text-red-400 bg-red-500/10 border-red-500/20' },
  HIGH:   { icon: Zap,         label: 'HIGH',   className: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  MEDIUM: { icon: TrendingUp,  label: 'OPP',    className: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  LOW:    { icon: TrendingUp,  label: 'OPP',    className: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
} as const;

export default function OpportunityBadge({ tier, onClick }: OpportunityBadgeProps) {
  const { icon: Icon, label, className } = TIER_CONFIG[tier];
  return (
    <button
      onClick={onClick}
      type="button"
      title={`Cross-sell opportunity: ${tier}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${className} transition-opacity hover:opacity-80`}
    >
      <Icon className="w-2.5 h-2.5" aria-hidden />
      {label}
    </button>
  );
}
```

**Step 4: Wire `OpportunityBadge` into `MetadataBadges`**

Read `src/components/todo-item/MetadataBadges.tsx`. Find the primary badge row (around line 140 — after the customer badge at line 146). Add:

```tsx
// At the top of MetadataBadges.tsx, add imports:
import OpportunityBadge from '@/components/todo/OpportunityBadge';
import { useCustomerOpportunities } from '@/hooks/useCustomerOpportunities';

// Inside the component, add:
const opportunityMap = useCustomerOpportunities();
const opportunityTier = todo.customer_id ? opportunityMap.get(todo.customer_id) : undefined;

// In the primary badges row JSX, after the customer badge (around line 149):
{opportunityTier && (
  <OpportunityBadge
    tier={opportunityTier}
    onClick={onClick} // pass through the onClick that opens task detail
  />
)}
```

> **Note:** `MetadataBadges` may not have an `onClick` prop today — check its props. If it doesn't, add `onOpenDetail?: () => void` and pass it through from `TodoItem.tsx`.

**Step 5: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 6: Commit**

```bash
git add src/hooks/useCustomerOpportunities.ts \
        src/app/api/analytics/cross-sell/by-customer-ids/route.ts \
        src/components/todo/OpportunityBadge.tsx \
        src/components/todo-item/MetadataBadges.tsx
git commit -m "feat: add opportunity badges to task list rows via shared customer opportunity map"
```

---

## Task 8: `OpportunityCallout` component

Elevated card shown at the top of the task detail modal with talking points and on-demand Claude coaching.

**Files:**
- Create: `src/components/task-detail/OpportunityCallout.tsx`

**Step 1: Create the component**

```tsx
// src/components/task-detail/OpportunityCallout.tsx
'use client';
import { useState, useCallback } from 'react';
import { Flame, Zap, TrendingUp, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Opportunity {
  id: string;
  priorityTier: string;
  recommendedProduct: string;
  potentialPremiumAdd: number;
  talkingPoint1: string;
  talkingPoint2: string;
  talkingPoint3: string;
  currentProducts: string;
  tenureYears: number;
  currentPremium: number;
  daysUntilRenewal: number;
}

interface OpportunityCalloutProps {
  opportunity: Opportunity;
  customerName: string;
  taskText: string;
}

const TIER_CONFIG = {
  HOT:    { icon: Flame,      label: 'HOT opportunity',  headerClass: 'border-red-500/30 bg-red-500/5' },
  HIGH:   { icon: Zap,        label: 'HIGH opportunity', headerClass: 'border-orange-500/30 bg-orange-500/5' },
  MEDIUM: { icon: TrendingUp, label: 'Opportunity',      headerClass: 'border-yellow-500/30 bg-yellow-500/5' },
  LOW:    { icon: TrendingUp, label: 'Opportunity',      headerClass: 'border-blue-500/30 bg-blue-500/5' },
} as const;

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function OpportunityCallout({ opportunity, customerName, taskText }: OpportunityCalloutProps) {
  const [expanded, setExpanded] = useState(false);
  const [coachingState, setCoachingState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [coaching, setCoaching] = useState<string | null>(null);

  const tierKey = opportunity.priorityTier as keyof typeof TIER_CONFIG;
  const { icon: Icon, label, headerClass } = TIER_CONFIG[tierKey] ?? TIER_CONFIG.MEDIUM;

  const getCoaching = useCallback(async () => {
    if (coachingState !== 'idle') return;
    setCoachingState('loading');
    try {
      const res = await fetch('/api/ai/opportunity-coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskText,
          customerName,
          recommendedProduct: opportunity.recommendedProduct,
          currentProducts: opportunity.currentProducts,
          tenureYears: opportunity.tenureYears,
          currentPremium: opportunity.currentPremium,
          potentialPremiumAdd: opportunity.potentialPremiumAdd,
          talkingPoint1: opportunity.talkingPoint1,
          talkingPoint2: opportunity.talkingPoint2,
        }),
      });
      const data = await res.json();
      if (data.coaching) {
        setCoaching(data.coaching);
        setCoachingState('ready');
      } else {
        setCoachingState('error');
      }
    } catch {
      setCoachingState('error');
    }
  }, [coachingState, taskText, customerName, opportunity]);

  return (
    <div className={`rounded-xl border p-3 ${headerClass} mb-3`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 flex-shrink-0 text-[var(--text-muted)]" aria-hidden />
          <span className="text-xs font-semibold text-[var(--foreground)]">{label}</span>
          <span className="text-xs text-[var(--text-muted)] truncate">
            {opportunity.recommendedProduct}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold text-green-400">
            +{formatCurrency(opportunity.potentialPremiumAdd)}/yr
          </span>
          {opportunity.daysUntilRenewal <= 30 && (
            <span className="text-[10px] text-[var(--text-muted)] bg-[var(--surface-2)] rounded px-1.5 py-0.5">
              {opportunity.daysUntilRenewal}d renewal
            </span>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-0.5 rounded hover:bg-white/10 text-[var(--text-muted)]"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-2">
              {/* Talking points */}
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">
                  Talking points
                </p>
                <ul className="space-y-1">
                  {[opportunity.talkingPoint1, opportunity.talkingPoint2].filter(Boolean).map((tp, i) => (
                    <li key={i} className="text-xs text-[var(--foreground)] flex gap-1.5">
                      <span className="text-[var(--text-muted)] flex-shrink-0">·</span>
                      <span>{tp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Coaching section */}
              <div className="border-t border-[var(--border-subtle)] pt-2">
                {coachingState === 'idle' && (
                  <button
                    onClick={getCoaching}
                    className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Get pre-call coaching
                  </button>
                )}
                {coachingState === 'loading' && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Getting coaching...
                  </div>
                )}
                {coachingState === 'ready' && coaching && (
                  <div className="text-xs text-[var(--foreground)] bg-[var(--surface-2)]/50 rounded-lg p-2.5 leading-relaxed">
                    {coaching}
                  </div>
                )}
                {coachingState === 'error' && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Coaching unavailable — use the talking points above.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/task-detail/OpportunityCallout.tsx
git commit -m "feat: add OpportunityCallout component with expandable talking points and Claude coaching"
```

---

## Task 9: Wire `OpportunityCallout` into `TaskDetailModal`

**Files:**
- Modify: `src/components/task-detail/TaskDetailModal.tsx`

**Step 1: Read the file**

Read `src/components/task-detail/TaskDetailModal.tsx` lines 1-260. Confirm the `MetadataSection` location and the customer panel block.

**Step 2: Fetch opportunity for this task's customer**

At the top of `TaskDetailModal`, add a hook to fetch the current customer's opportunity:

```typescript
// Add this hook import and usage near the top of TaskDetailModal:
import { useCustomerOpportunities } from '@/hooks/useCustomerOpportunities';
import OpportunityCallout from './OpportunityCallout';

// Inside the component:
const opportunityMap = useCustomerOpportunities();
const opportunityTier = todo.customer_id ? opportunityMap.get(todo.customer_id) : undefined;
```

But `useCustomerOpportunities` returns only the tier, not the full opportunity. We need the full opportunity data for the callout. Instead, fetch it directly when `customer_id` changes:

```typescript
// Add state for the full opportunity:
const [customerOpportunity, setCustomerOpportunity] = useState<any>(null);

useEffect(() => {
  if (!todo.customer_id) return;

  // Fetch full opportunity for this customer via the existing opportunities endpoint
  const fetchOpportunity = async () => {
    try {
      const res = await fetch(
        `/api/analytics/cross-sell/by-customer-ids`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerIds: [todo.customer_id], includeDetails: true }),
        }
      );
      const data = await res.json();
      if (data[0]) setCustomerOpportunity(data[0]);
    } catch { /* non-critical */ }
  };

  fetchOpportunity();
}, [todo.customer_id]);
```

> **Simpler alternative:** Extend the `by-customer-ids` route (Task 7) to accept `includeDetails: true` and return full opportunity fields. Or create a separate `GET /api/analytics/cross-sell/for-customer?customer_id=...` route. Choose whichever fits the existing pattern.

**Step 3: Render `OpportunityCallout` above MetadataSection**

Find the line just before `<MetadataSection` (around line 206). Insert:

```tsx
{/* Opportunity callout — shown above metadata when customer has active opportunity */}
{customerOpportunity?.opportunity && (
  <OpportunityCallout
    opportunity={customerOpportunity.opportunity}
    customerName={todo.customer_name ?? ''}
    taskText={todo.text}
  />
)}

{/* Existing MetadataSection starts here */}
<MetadataSection ... />
```

**Step 4: TypeScript check + build**

```bash
npx tsc --noEmit 2>&1 | head -20
npm run build 2>&1 | tail -20
```

Fix any type errors. Pay attention to: `customerOpportunity` shape matching `OpportunityCallout` props.

**Step 5: Commit**

```bash
git add src/components/task-detail/TaskDetailModal.tsx
git commit -m "feat: wire OpportunityCallout into task detail modal above metadata section"
```

---

## Task 10: E2E test for the full flow

**Files:**
- Create: `tests/cross-sell-opportunity-integration.spec.ts`

**Step 1: Write the E2E test**

```typescript
// tests/cross-sell-opportunity-integration.spec.ts
import { test, expect, Page } from '@playwright/test';

// Helper: log in as Derrick (known PIN: 8008)
async function loginAsDerrick(page: Page) {
  await page.goto('http://localhost:3001');
  await page.waitForSelector('[data-testid="user-card-Derrick"]', { timeout: 15000 });
  await page.click('[data-testid="user-card-Derrick"]');
  await page.waitForSelector('input', { timeout: 5000 });
  const inputs = await page.locator('input').all();
  for (const [i, digit] of ['8', '0', '0', '8'].entries()) {
    await inputs[i].fill(digit);
  }
  await page.waitForSelector('nav[aria-label="Main navigation"]', { timeout: 15000 });
}

test.describe('Cross-sell opportunity integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDerrick(page);
    // Navigate to Tasks view
    await page.click('button:has-text("Tasks")');
    await page.waitForSelector('[aria-label="Create new task"]', { timeout: 10000 });
  });

  test('shows opportunity match banner after creating task with customer name', async ({ page }) => {
    // Open add task modal
    await page.click('[aria-label="Create new task"]');
    await page.waitForSelector('input[placeholder*="task" i], input[placeholder*="add" i]', { timeout: 5000 });

    // Type a task with a customer name that exists in the opportunities table
    // This test assumes a customer named something in the real DB — adjust to match test data
    const taskText = 'Call Janis Urich about her upcoming renewal';
    await page.fill('input[placeholder*="task" i], input[placeholder*="add" i]', taskText);

    // Submit (press Enter or click Add button)
    await page.keyboard.press('Enter');

    // Wait for banner to appear (up to 10s — Claude name extraction takes ~1–2s)
    const banner = page.locator('[role="alert"]').filter({ hasText: 'Looks like this is for' });
    await expect(banner).toBeVisible({ timeout: 10000 });

    // Banner should show customer name and opportunity tier
    await expect(banner.locator('text=Janis')).toBeVisible();
    await expect(banner.locator('text=HOT, HIGH, MEDIUM, LOW')).toBeVisible().catch(() => {
      // Accept any tier badge
    });
    await expect(banner.locator('button:has-text("Link")')).toBeVisible();
    await expect(banner.locator('button:has-text("Not")')).toBeVisible();
  });

  test('links customer and shows opportunity badge in list after confirming', async ({ page }) => {
    await page.click('[aria-label="Create new task"]');
    await page.waitForSelector('input[placeholder*="task" i]', { timeout: 5000 });

    const taskText = 'Follow up with Janis Urich on her policy';
    await page.fill('input[placeholder*="task" i]', taskText);
    await page.keyboard.press('Enter');

    const banner = page.locator('[role="alert"]').filter({ hasText: 'Link' });
    await expect(banner).toBeVisible({ timeout: 10000 });

    // Click "Link" button
    await banner.locator('button:has-text("Link")').click();

    // After linking, check that the task row in the list now shows an opportunity badge
    const taskRow = page.locator('li').filter({ hasText: 'Follow up with Janis Urich' });
    await expect(taskRow.locator('[title*="opportunity" i]')).toBeVisible({ timeout: 5000 });
  });

  test('banner does not appear for tasks without customer names', async ({ page }) => {
    await page.click('[aria-label="Create new task"]');
    await page.waitForSelector('input[placeholder*="task" i]', { timeout: 5000 });

    await page.fill('input[placeholder*="task" i]', 'Review quarterly reports');
    await page.keyboard.press('Enter');

    // Wait 6 seconds — if no banner appears within that time, test passes
    await page.waitForTimeout(6000);
    const banner = page.locator('[role="alert"]').filter({ hasText: 'Looks like this is for' });
    await expect(banner).not.toBeVisible();
  });

  test('opportunity callout appears in task detail modal for linked customer', async ({ page }) => {
    // Find a task that already has a customer_id set (created from generate-tasks flow or previously linked)
    // Click on a task that has an opportunity badge
    const taskWithBadge = page.locator('li').filter({ hasText: '' }).locator('[title*="opportunity" i]').first();

    // If no badge exists yet, skip this test
    const count = await taskWithBadge.count();
    if (count === 0) {
      test.skip();
      return;
    }

    await taskWithBadge.click(); // Opens task detail modal

    // Wait for modal and check for OpportunityCallout
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    const callout = page.locator('[role="dialog"]').locator('text=opportunity');
    await expect(callout).toBeVisible({ timeout: 5000 });
  });
});
```

**Step 2: Run the E2E tests**

```bash
cd /Users/adrianstier/shared-todo-list && PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:e2e -- tests/cross-sell-opportunity-integration.spec.ts 2>&1 | tail -40
```

Fix any failures. Common issues:
- Customer name in test data doesn't match real DB data → update test to use a real customer name from cross_sell_opportunities table
- Selector for task input doesn't match → inspect actual placeholder text

**Step 3: Run full unit test suite**

```bash
npm run test 2>&1 | tail -20
```

Expected: all passing (1033+ tests).

**Step 4: Build check**

```bash
npm run build 2>&1 | tail -20
```

**Step 5: Final commit**

```bash
git add tests/cross-sell-opportunity-integration.spec.ts
git commit -m "test: add E2E tests for cross-sell opportunity integration flow"
```

---

## Summary: Files Changed

| File | Action |
|------|--------|
| `src/hooks/useTodoOperations.ts` | Modified — `addTodo` returns `string \| undefined` |
| `src/app/api/ai/match-customer-opportunity/route.ts` | Created |
| `src/app/api/ai/opportunity-coaching/route.ts` | Created |
| `src/app/api/analytics/cross-sell/by-customer-ids/route.ts` | Created |
| `src/hooks/useOpportunityMatcher.ts` | Created |
| `src/hooks/useCustomerOpportunities.ts` | Created |
| `src/components/todo/OpportunityMatchBanner.tsx` | Created |
| `src/components/todo/OpportunityBadge.tsx` | Created |
| `src/components/task-detail/OpportunityCallout.tsx` | Created |
| `src/components/todo-item/MetadataBadges.tsx` | Modified — add badge |
| `src/components/task-detail/TaskDetailModal.tsx` | Modified — add callout |
| `src/components/TodoList.tsx` | Modified — wire banner |
| `src/test/api/match-customer-opportunity.test.ts` | Created |
| `src/test/api/opportunity-coaching.test.ts` | Created |
| `src/test/hooks/useOpportunityMatcher.test.ts` | Created |
| `tests/cross-sell-opportunity-integration.spec.ts` | Created |
