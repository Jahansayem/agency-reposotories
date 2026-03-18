# Cross-Sell Opportunity Integration Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create the implementation plan from this design.

**Goal:** Surface cross-sell opportunity flags to agents immediately after task creation, with auto-matched customer confirmation and on-demand Claude coaching.

**Architecture:** Post-creation hook extracts customer name from task text via Claude, fuzzy-matches against the `cross_sell_opportunities` table, presents a confirmation banner, then progressively reveals opportunity context across three surfaces (list badge → modal callout → on-demand coaching paragraph).

**Tech Stack:** Next.js App Router API routes, `@anthropic-ai/sdk` via existing `callClaude()` wrapper, React hooks, Supabase (existing `cross_sell_opportunities` and `todos` tables — no migration needed).

---

## Problem

Agents create tasks for customers (calls, follow-ups, claims) but don't see cross-sell opportunities until they manually navigate to the Opportunities tab or open the customer panel in the task modal. This means agents miss natural conversation moments to mention bundling or new products.

**Current state:**
- `CustomerDetailPanel` in the task modal already shows opportunities — but only if `customer_id` is formally linked, and it's buried below metadata
- Many tasks are created without a linked customer (agent types the name in the task text)
- No signal in the task list that a customer has an active opportunity

---

## Design

### Data Flow

```
Task created (any method: manual, AI parse, voice, generate-from-opportunity)
  ↓
useOpportunityMatcher hook fires (client-side, after task save)
  ↓
POST /api/ai/match-customer-opportunity
  → Claude extracts customer name from task text (~50 tokens, cheap)
  → Server queries: cross_sell_opportunities WHERE customer_name ILIKE '%name%'
    AND dismissed = false AND priority_tier IN ('HOT','HIGH','MEDIUM','LOW')
  → Returns best match: { customer, opportunity } or null
  ↓
OpportunityMatchBanner appears (toast-style, non-blocking, auto-dismisses in 15s)
  "Looks like this is for Janis Urich — 🔥 HOT: auto→home (+$340/yr)
   Is that right?   [Link her]   [Not her]"
  ↓
User clicks "Link her"
  → PATCH /api/todos/:id  { customer_id, customer_name, customer_segment }
  → PATCH /api/analytics/cross-sell/:opportunityId { task_id } (if not already set)
  ↓
Three surfaces update reactively:
  List row  →  OpportunityBadge (🔥 HOT / ⚡ HIGH / — MEDIUM)
  Modal     →  OpportunityCallout card elevated above metadata
  Modal     →  "Get coaching" button → POST /api/ai/opportunity-coaching
                 → 2–3 sentence pre-call coaching paragraph (on-demand)
```

### Auto-Match Rules

- Only fires when a task is **newly created** (not on edits)
- Skip if `customer_id` is already set (already linked — no need to match)
- Skip if task text is fewer than 5 words
- Match is case-insensitive, partial name match (first OR last name sufficient)
- If multiple matches found, return the highest `priority_score`
- Banner auto-dismisses after 15 seconds if ignored (does not link)
- "Not her" permanently dismisses for this task (stored in component state, not DB)

---

## New Files

### API Routes

#### `POST /api/ai/match-customer-opportunity`

**Input:**
```typescript
{ taskId: string; taskText: string; agencyId: string }
```

**Steps:**
1. Call Claude to extract customer name from task text
2. Query `cross_sell_opportunities` WHERE `customer_name ILIKE '%extracted_name%'` AND `agency_id = agencyId` AND `dismissed = false`
3. Also query `customer_insights` to get `customer_id` for the match
4. Return best match sorted by `priority_score DESC`

**Output:**
```typescript
{
  matched: boolean;
  customer: { id: string; name: string; segment: CustomerSegment } | null;
  opportunity: {
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
  } | null;
}
```

**Claude prompt (name extraction):**
```
Extract the full customer name from this insurance agency task text.
Return ONLY valid JSON: { "customer_name": "First Last" } or { "customer_name": null } if no name is present.
Task: "${taskText}"
```

**Error handling:** If Claude fails or name extraction returns null → return `{ matched: false }` silently. Never block task creation.

---

#### `POST /api/ai/opportunity-coaching`

**Input:**
```typescript
{
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
```

**Output:**
```typescript
{ coaching: string }  // 2–3 sentences
```

**System prompt:**
```
You are a pre-call coach for an Allstate insurance agent.
Be conversational and specific — not scripted or salesy.
Insurance agents build long-term relationships; the tone should feel like advice from a colleague.
```

**User prompt:**
```
The agent is about to: "${taskText}"

This customer also has a cross-sell opportunity:
- Recommended product: ${recommendedProduct}
- Currently has: ${currentProducts} (${tenureYears} years, $${currentPremium}/yr)
- Potential add: +$${potentialPremiumAdd}/yr
- Talking points: "${talkingPoint1}" / "${talkingPoint2}"

Write 2–3 sentences:
1. Acknowledge the reason for the call
2. Suggest the natural moment to bring up the opportunity
3. Give one specific, natural opener line

Keep it under 60 words.
```

---

### Hook

#### `src/hooks/useOpportunityMatcher.ts`

```typescript
type MatchState = 'idle' | 'loading' | 'matched' | 'confirmed' | 'dismissed' | 'none';

interface UseOpportunityMatcherReturn {
  state: MatchState;
  customer: MatchedCustomer | null;
  opportunity: MatchedOpportunity | null;
  confirm: () => Promise<void>;   // Links customer_id to task
  dismiss: () => void;            // Dismisses banner for this task
}

function useOpportunityMatcher(
  taskId: string | null,
  taskText: string,
  existingCustomerId: string | null
): UseOpportunityMatcherReturn
```

- Fires automatically when `taskId` changes from null → string (new task)
- Skips if `existingCustomerId` is already set
- Calls `/api/ai/match-customer-opportunity`
- On confirm: calls `updateTodo(taskId, { customer_id, customer_name, customer_segment })`

---

### Components

#### `src/components/todo/OpportunityMatchBanner.tsx`

Non-blocking banner rendered inside the `AddTaskModal` (or wherever task creation confirmation lives) after successful save.

**Props:**
```typescript
{
  taskId: string;
  taskText: string;
  onDismiss: () => void;
}
```

**Rendered output:**
```
┌─────────────────────────────────────────────────────┐
│ 🔥  Looks like this is for Janis Urich              │
│     HOT opportunity: auto → home  (+$340/yr)        │
│     [Link her]                    [Not her]    [×]  │
└─────────────────────────────────────────────────────┘
```

- Auto-dismisses after 15s
- Uses existing toast/notification styling patterns
- Accessible: `role="alert"`, focus-managed

---

#### `src/components/todo/OpportunityBadge.tsx`

Small inline badge added to the `TodoItem` metadata row.

```
🔥 HOT   or   ⚡ HIGH   or   · OPP
```

- Only renders when `todo.customer_id` is set and opportunity data is available
- Reads from a shared `useCustomerOpportunities` context (avoids per-row fetches)
- Clicking the badge opens the task modal to the opportunity callout

---

#### `src/components/task-detail/OpportunityCallout.tsx`

Compact card rendered **above** the metadata section in `TaskDetailModal`.

```
┌─────────────────────────────────────────────────────┐
│ 🔥 Cross-sell opportunity                           │
│ Recommend: Auto → Home Bundle  (+$340/yr)           │
│ Renewal in 12 days · 9yr customer · $890/yr current │
│                                                     │
│ Talking points:                                     │
│ • "You've been with us 9 years — great time to..."  │
│ • "Bundling typically saves customers 15%..."       │
│                                                     │
│ [Get pre-call coaching ✨]                          │
│                                                     │
│ ── after clicking ──────────────────────────────── │
│ "You're calling about her claim, which is a warm    │
│  moment. Once you confirm the resolution, mention   │
│  that as a 9-year customer she qualifies for our    │
│  bundle rate — try: 'While I have you, I noticed    │
│  you don't have home coverage with us yet...'"      │
└─────────────────────────────────────────────────────┘
```

- "Get pre-call coaching" triggers `POST /api/ai/opportunity-coaching` once
- Coaching result cached in component state (no re-fetch on re-open)
- Loading spinner while Claude responds

---

### Modified Files

#### `src/components/TodoItem.tsx`
- Import and render `<OpportunityBadge>` in the metadata row
- Pass `todo.customer_id` and opportunity tier from context

#### `src/components/task-detail/TaskDetailModal.tsx`
- Import and render `<OpportunityCallout>` above `<MetadataSection>`
- Only render if `todo.customer_id` is set and opportunity exists

#### `src/components/todo/AddTaskModal.tsx` (or equivalent)
- After successful task creation, render `<OpportunityMatchBanner>`
- Pass `taskId` and `taskText` to the banner
- Banner uses `useOpportunityMatcher` internally

---

## Opportunity Data Sharing (No Per-Row Fetches)

To avoid N+1 fetches for list-row badges, opportunity data for all linked customers is loaded once:

- Extend `useTodoStore` or create a lightweight `useCustomerOpportunities()` hook
- Fetch `cross_sell_opportunities` WHERE `customer_name IN (...)` for all tasks with `customer_id` set
- Store as a `Map<customer_id, OpportunityTier>` in React context
- `OpportunityBadge` reads from this context — zero extra fetches per row

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Claude name extraction fails | Banner silently skipped, task saves normally |
| No fuzzy match found | Banner not shown |
| Customer has no opportunity | Banner not shown |
| Opportunity coaching Claude call fails | Show: "Coaching unavailable — use the talking points above" |
| User ignores banner for 15s | Banner dismisses, task saves without customer link |
| Rate limit hit (10 req/min) | Match silently skipped; coaching shows "Try again in a moment" |

---

## What Is NOT in Scope

- No DB schema changes
- No changes to how opportunities are generated or scored
- No auto-dismissing opportunities from the coaching flow
- No changes to the Kanban view (list and modal only)
- No new Supabase tables

---

## Testing Plan

- Unit: `useOpportunityMatcher` state transitions (idle → loading → matched → confirmed)
- Unit: name extraction prompt parsing (null case, multi-word names, names mid-sentence)
- Unit: `OpportunityBadge` renders correct tier icon
- Integration: confirm flow patches `todos` and `cross_sell_opportunities` correctly
- E2E: create task with customer name → banner appears → link → badge visible in list
- E2E: create task without customer name → no banner
