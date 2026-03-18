# Claude Code Agent Prompts: AI Agent Integration

## Pipeline Status

```
Feature: AI Conversational Agent
Status: Ready for Implementation

┌──────────────────────────────────────────────────────────────┐
│ [ ] Agent 1 — Backend: API route + tools + context           │
│ [ ] Agent 2 — Frontend: AgentPanel + tool renderers          │
│ [ ] Agent 3 — Database: Schema + migration + token tracking  │
│     --- merge Agents 1-3, then: ---                          │
│ [ ] Agent 4 — Integration: Wire panel into app shell         │
│ [ ] Agent 5 — Tests: Unit + E2E + Playwright                 │
│ [ ] Agent 6 — Code Review: Validate all agents               │
└──────────────────────────────────────────────────────────────┘

Legend: [✓] Complete  [~] In Progress  [ ] Pending
```

## Parallelization Strategy

Agents 1-3 run **simultaneously** on separate worktrees:
- Agent 1 (Backend): `.worktrees/agent-backend` → branch `feat/agent-backend`
- Agent 2 (Frontend): `.worktrees/agent-frontend` → branch `feat/agent-frontend`
- Agent 3 (Database): `.worktrees/agent-database` → branch `feat/agent-database`

Agent 4 runs **after merge** of 1-3 (touches overlapping files).
Agent 5 runs **after** Agent 4 (needs working integration to test).
Agent 6 runs **last** for validation.

## Worktree Setup

```bash
cd /Users/adrianstier/shared-todo-list
git worktree add .worktrees/agent-backend -b feat/agent-backend
git worktree add .worktrees/agent-frontend -b feat/agent-frontend
git worktree add .worktrees/agent-database -b feat/agent-database
```

## Merge Procedure (after Agents 1-3 complete)

```bash
cd /Users/adrianstier/shared-todo-list
git checkout main
git merge feat/agent-backend --no-edit
git merge feat/agent-frontend --no-edit
git merge feat/agent-database --no-edit
# Resolve any conflicts, then:
git worktree remove .worktrees/agent-backend
git worktree remove .worktrees/agent-frontend
git worktree remove .worktrees/agent-database
```

---


## Agent 1: Backend Engineer — API Route + Tools + Context

```
You are a Backend Engineer implementing an AI conversational agent for the Bealer Agency todo app.

## CONTEXT LOADING
Read these files first:
- ORCHESTRATOR.md (sections: Quick Start, API Endpoints, Critical Constraints)
- .serena/memories/critical_patterns.md
- .serena/memories/code_style_conventions.md
- src/lib/aiApiHelper.ts (existing AI helper patterns)
- src/types/todo.ts (data model)
- src/types/customer.ts (customer model)
- src/lib/agencyAuth.ts (auth patterns — withAgencyAuth, AgencyAuthContext)
- src/lib/fieldEncryption.ts (PII encryption — decryptTodoPII)
- src/lib/sanitize.ts (input sanitization)
- src/app/api/todos/route.ts (existing query patterns for agency-scoped data)

## INSTALL DEPENDENCIES
npm install ai @ai-sdk/anthropic zod

## TASK: Create the agent backend

### 1. System Prompt Builder
File: src/lib/agent/context.ts

Build a function `getAgencyContext(ctx: AgencyAuthContext): string` that returns the system prompt.

Include:
- Today's date and day of week
- Current user name, role, permissions
- Agency ID
- Insurance domain terminology (policy types, segments, task categories, common terms like COI, binder, dec page, MVR, loss runs)
- Behavioral instructions:
  - Be concise and action-oriented
  - For write operations: describe what you'll do and ask "Should I proceed?" BEFORE calling write tools
  - Never guess at data — always use tools to look it up
  - Reference customers by name not ID
  - Use relative dates when recent ("yesterday", "next Tuesday")
  - When showing task lists, format as compact numbered lists
  - When a search returns no results, suggest broadening the query
- Current limitations: no external system access, no sending emails/calls directly

### 2. Read Tools
File: src/lib/agent/tools/tasks.ts

Create `searchTasks(ctx: AgencyAuthContext)` using Vercel AI SDK `tool()`:
- Parameters (all optional via zod): query (text search), status, priority, assigned_to, customer_name, due_before, due_after, is_overdue (boolean), waiting_for_response, category, limit (max 50, default 20)
- Implementation: Query Supabase `todos` table scoped to `ctx.agencyId`
- Apply permission scoping: if !ctx.permissions?.can_view_all_tasks, filter to user's own tasks
- Decrypt PII fields with decryptTodoPII
- Return compact objects: { id, text, status, priority, assigned_to, due_date, customer_name, category, waiting_for_response, subtasks_count, subtasks_done, notes_preview (first 100 chars) }
- For is_overdue: filter due_date < today AND status != 'done'

File: src/lib/agent/tools/customers.ts

Create `searchCustomers(ctx: AgencyAuthContext)`:
- Parameters: query (name search), segment, has_opportunity, retention_risk, limit
- Query `customers` table + join opportunities
- Return: { id, name, segment, totalPremium, policyCount, products, retentionRisk, hasOpportunity, upcomingRenewal }

Create `getCustomerDetail(ctx: AgencyAuthContext)`:
- Parameters: customer_id (string)
- Query customer + opportunities + linked tasks
- Return full detail object

File: src/lib/agent/tools/team.ts

Create `getTeamWorkload(ctx: AgencyAuthContext)`:
- Parameters: include_completed (boolean, default false)
- GROUP BY assigned_to, status on todos table
- Return: array of { member, todo_count, in_progress_count, done_count, overdue_count }

File: src/lib/agent/tools/chat.ts

Create `searchTeamChat(ctx: AgencyAuthContext)`:
- Description: "Search team chat messages for context. Only searches group/team conversations, not private DMs."
- Parameters: query (text search), limit (default 20), sent_by (optional user name)
- Query: chat_messages table JOIN chat_conversations WHERE conversation.is_group = true (or equivalent column)
- Filter by agency_id
- Return: { messages: [{ sender, text, sent_at, conversation_title }] }

### 3. Write Tools
File: src/lib/agent/tools/tasks.ts (add to existing file)

Create `createTask(ctx: AgencyAuthContext)`:
- Description: "Create a new task. The system prompt instructs you to confirm with the user before calling this."
- Parameters: text, priority (default medium), assigned_to?, due_date?, category?, customer_name?, customer_id?, notes?, subtasks? (array of {text, priority})
- Insert into todos table with agency_id, created_by from ctx
- Log activity via safeLogActivity with { source: 'ai_agent' }
- Return created task object

Create `updateTask(ctx: AgencyAuthContext)`:
- Parameters: task_id, status?, priority?, assigned_to?, due_date?, notes?, waiting_for_response?
- Verify task belongs to agency
- Update + log activity
- Return updated fields

Create `bulkUpdateTasks(ctx: AgencyAuthContext)`:
- Parameters: task_ids (array), updates: { status?, priority?, assigned_to? }
- Verify all tasks belong to agency
- Batch update + log activity
- Return { updated: number, failed: number }

File: src/lib/agent/tools/email.ts

Create `draftEmail(ctx: AgencyAuthContext)`:
- Description: "Draft a customer email. Returns the draft for user review — does NOT send."
- Parameters: customer_name, tone (formal/friendly/brief, default friendly), language (english/spanish, default english), include_next_steps (boolean, default true), task_ids? (optional, if omitted includes all tasks for customer)
- Reuse the prompt-building logic from src/app/api/ai/generate-email/route.ts
- Call Claude directly (not streaming — this is a tool result)
- Return: { subject, body, suggestedFollowUp, warnings }

### 4. Token Usage Tracking
File: src/lib/agent/usage.ts

Create middleware for tracking token usage:
- `trackTokenUsage(agencyId: string, userId: string, inputTokens: number, outputTokens: number)`
- Upsert into `agent_usage` table (schema created by Agent 3)
- `checkTokenBudget(agencyId: string): { remaining: number, limit: number, warningThreshold: boolean, blocked: boolean }`
- Daily limit: 500,000 tokens (configurable via agency settings)
- Warning at 80% (400K), hard block at 100%

### 5. Model Router
File: src/lib/agent/modelRouter.ts

Create `selectModel(messages: Message[]): string`:
- Analyze the latest user message
- Route to `claude-haiku-4-5-20251001` if:
  - Message is < 50 words
  - No write-intent keywords (create, update, delete, mark, assign, draft, move, change)
  - No multi-step indicators (and, then, also, after that)
- Otherwise route to `claude-sonnet-4-20250514`
- Accept override from request body `{ forceModel: 'sonnet' | 'haiku' }`

### 6. Agent API Route
File: src/app/api/ai/agent/route.ts

```typescript
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { withAgencyAuth, type AgencyAuthContext } from '@/lib/agencyAuth';
import { getAgencyContext } from '@/lib/agent/context';
import { searchTasks, createTask, updateTask, bulkUpdateTasks } from '@/lib/agent/tools/tasks';
import { searchCustomers, getCustomerDetail } from '@/lib/agent/tools/customers';
import { getTeamWorkload } from '@/lib/agent/tools/team';
import { searchTeamChat } from '@/lib/agent/tools/chat';
import { draftEmail } from '@/lib/agent/tools/email';
import { selectModel } from '@/lib/agent/modelRouter';
import { checkTokenBudget, trackTokenUsage } from '@/lib/agent/usage';

export const maxDuration = 60;

export const POST = withAgencyAuth(async (request, ctx: AgencyAuthContext) => {
  const { messages, forceModel, viewContext } = await request.json();

  // Check token budget
  const budget = await checkTokenBudget(ctx.agencyId);
  if (budget.blocked) {
    return new Response(JSON.stringify({ error: 'Daily AI usage limit reached. Resets at midnight.' }), { status: 429 });
  }

  const model = forceModel === 'sonnet' ? 'claude-sonnet-4-20250514' : selectModel(messages);
  const systemPrompt = getAgencyContext(ctx, viewContext);

  const result = streamText({
    model: anthropic(model),
    system: systemPrompt,
    messages,
    tools: {
      search_tasks: searchTasks(ctx),
      create_task: createTask(ctx),
      update_task: updateTask(ctx),
      bulk_update_tasks: bulkUpdateTasks(ctx),
      search_customers: searchCustomers(ctx),
      get_customer_detail: getCustomerDetail(ctx),
      get_team_workload: getTeamWorkload(ctx),
      search_team_chat: searchTeamChat(ctx),
      draft_email: draftEmail(ctx),
    },
    maxSteps: 5,
    onFinish: async ({ usage }) => {
      if (usage) {
        await trackTokenUsage(ctx.agencyId, ctx.userId, usage.promptTokens, usage.completionTokens);
      }
    },
  });

  return result.toDataStreamResponse();
});
```

### 7. Index File
File: src/lib/agent/index.ts
Re-export everything for clean imports.

## QUALITY CHECKS
Run after implementation:
- npm run lint
- npx tsc --noEmit
- npm run build

## COMMIT
git add -A && git commit -m "feat(agent): add AI agent backend — API route, tools, context, usage tracking"

## HANDOFF
Write to .serena/memories/agent_handoffs.md:
- Date: [today]
- From: Agent 1 (Backend)
- Status: Complete
- Files Modified: list all files
- Key Context:
  - API endpoint: POST /api/ai/agent
  - Tools: search_tasks, create_task, update_task, bulk_update_tasks, search_customers, get_customer_detail, get_team_workload, search_team_chat, draft_email
  - Model routing: auto (Haiku for simple, Sonnet for complex), override via forceModel body param
  - Token tracking: 500K/day per agency, tracked in agent_usage table
  - Auth: withAgencyAuth wrapper, ctx passed to all tools
  - viewContext: optional object from client, appended to system prompt
```

---


## Agent 2: Frontend Engineer — AgentPanel + Tool Renderers

```
You are a Frontend Engineer building the UI for an AI conversational agent in the Bealer Agency todo app.

## CONTEXT LOADING
Read these files first:
- ORCHESTRATOR.md (sections: Component Architecture, Frontend Engineer guidelines)
- .serena/memories/code_style_conventions.md
- .serena/memories/critical_patterns.md
- src/components/ChatPanel.tsx (first 100 lines — understand the panel pattern)
- src/components/layout/AppShell.tsx (understand how panels are integrated)
- src/components/layout/EnhancedBottomNav.tsx (mobile nav pattern)
- src/types/todo.ts (TodoStatus, TodoPriority, PRIORITY_CONFIG, STATUS_CONFIG)
- src/types/customer.ts (CustomerSegment, SEGMENT_CONFIG)
- src/hooks/useIsMobile.ts (mobile detection hook)
- src/hooks/useReducedMotion.ts (animation preference)
- src/lib/animations.ts (prefersReducedMotion utility)
- src/components/ui/tooltip.tsx (tooltip pattern)

## INSTALL DEPENDENCY
npm install ai
(Note: `ai` package provides `useChat` hook. `@ai-sdk/anthropic` is server-only, not needed here.)

## TASK: Build the agent UI

### 1. Tool Result Renderers

These components display structured data returned by the agent's tools.

File: src/components/agent/TaskListCard.tsx
- Renders an array of tasks from search_tasks tool results
- Compact list: each row shows status icon (colored dot), task text (truncated), priority badge, due date (relative), assigned_to
- Overdue tasks highlighted with red left border
- Waiting tasks show a clock icon
- Click on a task = copy task ID to clipboard (toast: "Task ID copied") — deep linking comes later
- Dark mode support via CSS variables or dark: prefix
- Max height with scroll if > 8 tasks

File: src/components/agent/CustomerCard.tsx
- Renders customer search results or detail
- For list: compact rows with name, segment badge (colored per SEGMENT_CONFIG), premium amount, opportunity indicator (green dot if hasOpportunity), renewal date
- For single detail: larger card with all fields, opportunity list, linked tasks count
- Segment badge colors: elite=#C9A227, premium=#9333EA, standard=#3B82F6, entry=#0EA5E9

File: src/components/agent/WorkloadCard.tsx
- Renders team workload from get_team_workload tool
- Horizontal stacked bar per team member: todo (indigo), in_progress (amber), done (green)
- Show overdue count as red badge
- Simple — don't use recharts, just CSS flexbox bars

File: src/components/agent/EmailDraftCard.tsx
- Renders email draft from draft_email tool
- Shows subject line, body (preserving line breaks), warnings (yellow callout boxes)
- "Copy to Clipboard" button for the email body
- "Open in Mail" button (mailto: link with subject and body)

File: src/components/agent/ChatHistoryCard.tsx
- Renders chat search results from search_team_chat tool
- Simple message list: sender name (bold), message text, relative timestamp
- Grouped by conversation if multiple conversations match

### 2. Main Agent Panel

File: src/components/AgentPanel.tsx

```tsx
'use client';

import { useChat } from 'ai/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, X, Loader2, Square, Sparkles, ChevronLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { prefersReducedMotion } from '@/lib/animations';
// Tool renderers
import { TaskListCard } from './agent/TaskListCard';
import { CustomerCard } from './agent/CustomerCard';
import { WorkloadCard } from './agent/WorkloadCard';
import { EmailDraftCard } from './agent/EmailDraftCard';
import { ChatHistoryCard } from './agent/ChatHistoryCard';
import { QuickActions } from './agent/QuickActions';
```

Key implementation details:

**useChat configuration:**
```tsx
const { messages, input, handleInputChange, handleSubmit, isLoading, stop, error, setMessages } = useChat({
  api: '/api/ai/agent',
  body: {
    viewContext,     // from props or useViewContext hook
    forceModel,      // 'sonnet' | undefined
  },
  maxSteps: 5,
  onError: (err) => {
    if (err.message.includes('429')) {
      setUsageLimitReached(true);
    }
  },
});
```

**Message rendering:**
- User messages: right-aligned bubble, user's color
- Assistant text: left-aligned, no bubble (clean text)
- Tool invocations: detect `message.toolInvocations` array
  - While pending: show "Searching tasks..." / "Looking up customer..." with Loader2 spinner
  - When complete: render the appropriate card component based on `toolInvocation.toolName`:
    - `search_tasks` → TaskListCard
    - `search_customers` → CustomerCard
    - `get_customer_detail` → CustomerCard (detail mode)
    - `get_team_workload` → WorkloadCard
    - `draft_email` → EmailDraftCard
    - `search_team_chat` → ChatHistoryCard
    - `create_task`, `update_task`, `bulk_update_tasks` → compact success/error message

**Mobile layout (isMobile):**
- Full screen: position fixed, inset 0, z-[500]
- Top bar: back button (ChevronLeft) + "AI Assistant" title + close button
- No slide animation on mobile (use instant show/hide)

**Desktop layout (!isMobile):**
- Slide-over panel from right, width 420px (same as ChatPanel)
- Resizable: reuse the same drag-to-resize pattern as ChatPanel if feasible, otherwise fixed width
- z-[400] (above sidebar, below modals)

**Quick actions bar:**
- Rendered above the input bar
- Context-sensitive pills based on viewContext prop
- Clicking a pill sets the input text and auto-submits

**Input bar:**
- Text input with Send button (or Enter to submit)
- Stop button (Square icon) visible during streaming
- Disabled with message when usage limit reached
- Haiku/Sonnet toggle: small icon button that toggles forceModel

**Auto-scroll:**
- Scroll to bottom on new messages
- Unless user has scrolled up (detect with scroll position)

**Empty state:**
- Sparkles icon
- "Ask me about tasks, customers, or team workload"
- 3-4 example prompts as clickable text

### 3. Quick Actions Component

File: src/components/agent/QuickActions.tsx

```tsx
interface QuickActionsProps {
  viewContext?: ViewContext;
  onAction: (prompt: string) => void;
}
```

Map viewContext.currentView to action sets:

| currentView | Actions |
|-------------|---------|
| 'tasks' (default) | "What's overdue?" · "My tasks due today" · "Team workload" |
| 'tasks' + filter overdue | "Summarize overdue" · "Reassign these" · "Draft follow-ups" |
| 'customer_detail' | "Summarize history" · "Next best action" · "Draft outreach" |
| 'dashboard' | "Today's priorities" · "Team capacity" · "Renewal alerts" |
| 'kanban' | "What's blocked?" · "Rebalance workload" |
| 'chat' | "Summarize recent discussion" · "Action items from chat" |

Render as horizontal scrollable row of pill buttons.

### 4. View Context Hook

File: src/hooks/useViewContext.ts

```tsx
export interface ViewContext {
  currentView: string;      // 'tasks' | 'dashboard' | 'kanban' | 'customer_detail' | 'chat' | 'analytics'
  customerId?: string;
  customerName?: string;
  filters?: Record<string, string>;
  selectedTaskId?: string;
}
```

Derive from:
- Current route/view state in MainApp (might need to read from a zustand store or context)
- If a customer detail panel is open, include customer info
- If task list has active filters, include them
- This doesn't need to be perfect — start with currentView from the active nav tab

### 5. Agent Toggle Button

File: src/components/agent/AgentToggleButton.tsx

- Sparkles icon button for the UnifiedAppBar
- Badge showing "AI" or usage warning (yellow dot at 80%)
- Keyboard shortcut: Cmd+J (register in useKeyboardShortcuts or inline)
- On click: toggle agent panel open/closed

## STYLING RULES
- Use Tailwind utility classes
- Support dark mode with dark: prefix (check existing components for patterns)
- Use CSS variables where they exist (check globals.css for --chat-* variables)
- Respect prefers-reduced-motion: no entrance animations when reduced motion
- Mobile first: start with mobile layout, enhance for desktop

## QUALITY CHECKS
- npm run lint
- npx tsc --noEmit
- npm run build

## COMMIT
git add -A && git commit -m "feat(agent): add AgentPanel UI with tool renderers and quick actions"

## HANDOFF
Write to .serena/memories/agent_handoffs.md:
- Date: [today]
- From: Agent 2 (Frontend)
- Status: Complete
- Files Created: list all
- Key Context:
  - AgentPanel: slide-over on desktop, full-screen on mobile
  - useChat connected to /api/ai/agent
  - Tool renderers: TaskListCard, CustomerCard, WorkloadCard, EmailDraftCard, ChatHistoryCard
  - Quick actions: context-sensitive based on viewContext
  - Agent toggle: AgentToggleButton with Cmd+J shortcut
  - Mobile: full-screen with back button, z-[500]
  - Desktop: 420px slide-over, z-[400]
  - viewContext passed in body to API, used for system prompt + quick actions
```

---


## Agent 3: Database Engineer — Schema + Migration + Token Tracking

```
You are a Database Engineer setting up the database schema for the AI agent feature.

## CONTEXT LOADING
Read these files first:
- ORCHESTRATOR.md (sections: Database Schema, Database Engineer guidelines)
- .serena/memories/critical_patterns.md
- src/lib/agencyAuth.ts (understand agency_id pattern)
- src/types/todo.ts (existing schema reference)

## TASK: Create database schema and migration

### 1. Supabase Migration

File: supabase/migrations/[timestamp]_add_agent_tables.sql

Use `SELECT NOW()` pattern for timestamp or just use a sequential number that's higher than existing migrations.

Check existing migrations:
```bash
ls supabase/migrations/ | tail -5
```

Create migration with these tables:

```sql
-- Agent conversation history (private per user)
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT,  -- Auto-generated from first user message
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  view_context JSONB,  -- Last view context for conversation
  model_used TEXT DEFAULT 'claude-sonnet-4-20250514',
  total_tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived BOOLEAN NOT NULL DEFAULT false
);

-- Indexes for agent_conversations
CREATE INDEX idx_agent_conversations_user ON agent_conversations(agency_id, user_id, archived);
CREATE INDEX idx_agent_conversations_updated ON agent_conversations(updated_at DESC);

-- RLS: Users can only see their own conversations
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own agent conversations" ON agent_conversations
  FOR ALL
  USING (
    user_id = current_setting('app.current_user_id', true)
    AND agency_id::text = current_setting('app.current_agency_id', true)
  );

-- Daily token usage tracking (per agency)
CREATE TABLE IF NOT EXISTS agent_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  request_count INTEGER NOT NULL DEFAULT 0,
  model_breakdown JSONB DEFAULT '{}'::jsonb,  -- { "sonnet": 12000, "haiku": 3000 }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, user_id, usage_date)
);

-- Index for budget checks (fast: get today's total for agency)
CREATE INDEX idx_agent_usage_agency_date ON agent_usage(agency_id, usage_date);

-- RLS for agent_usage
ALTER TABLE agent_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own agency usage" ON agent_usage
  FOR ALL
  USING (
    agency_id::text = current_setting('app.current_agency_id', true)
  );

-- Agency-level AI settings (extends agencies table or separate)
-- Add column to existing agencies table if it exists, otherwise create settings table
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS agent_settings JSONB DEFAULT '{
  "daily_token_limit": 500000,
  "enabled": true,
  "default_model": "claude-sonnet-4-20250514",
  "haiku_auto_routing": true
}'::jsonb;

-- Function to get remaining token budget for an agency today
CREATE OR REPLACE FUNCTION get_agent_budget(p_agency_id UUID)
RETURNS TABLE(
  used_today INTEGER,
  daily_limit INTEGER,
  remaining INTEGER,
  warning BOOLEAN,
  blocked BOOLEAN
) AS $$
DECLARE
  v_limit INTEGER;
  v_used INTEGER;
BEGIN
  -- Get limit from agency settings
  SELECT COALESCE((agent_settings->>'daily_token_limit')::integer, 500000)
  INTO v_limit
  FROM agencies
  WHERE id = p_agency_id;

  -- Get today's total usage
  SELECT COALESCE(SUM(total_tokens), 0)
  INTO v_used
  FROM agent_usage
  WHERE agency_id = p_agency_id
    AND usage_date = CURRENT_DATE;

  RETURN QUERY SELECT
    v_used,
    v_limit,
    GREATEST(v_limit - v_used, 0),
    v_used >= (v_limit * 0.8),     -- warning at 80%
    v_used >= v_limit;              -- blocked at 100%
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to upsert token usage
CREATE OR REPLACE FUNCTION track_agent_usage(
  p_agency_id UUID,
  p_user_id TEXT,
  p_input_tokens INTEGER,
  p_output_tokens INTEGER,
  p_model TEXT DEFAULT 'claude-sonnet-4-20250514'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO agent_usage (agency_id, user_id, usage_date, input_tokens, output_tokens, request_count, model_breakdown)
  VALUES (
    p_agency_id,
    p_user_id,
    CURRENT_DATE,
    p_input_tokens,
    p_output_tokens,
    1,
    jsonb_build_object(p_model, p_input_tokens + p_output_tokens)
  )
  ON CONFLICT (agency_id, user_id, usage_date)
  DO UPDATE SET
    input_tokens = agent_usage.input_tokens + EXCLUDED.input_tokens,
    output_tokens = agent_usage.output_tokens + EXCLUDED.output_tokens,
    request_count = agent_usage.request_count + 1,
    model_breakdown = agent_usage.model_breakdown || jsonb_build_object(
      p_model,
      COALESCE((agent_usage.model_breakdown->>p_model)::integer, 0) + p_input_tokens + p_output_tokens
    ),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. TypeScript Types

File: src/types/agent.ts

```typescript
export interface AgentConversation {
  id: string;
  agency_id: string;
  user_id: string;
  title: string | null;
  messages: AgentMessage[];
  view_context: ViewContext | null;
  model_used: string;
  total_tokens_used: number;
  created_at: string;
  updated_at: string;
  archived: boolean;
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolInvocation[];
  createdAt?: string;
}

export interface ToolInvocation {
  toolName: string;
  toolCallId: string;
  state: 'pending' | 'result' | 'error';
  args: Record<string, unknown>;
  result?: unknown;
}

export interface AgentUsage {
  id: string;
  agency_id: string;
  user_id: string;
  usage_date: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  request_count: number;
  model_breakdown: Record<string, number>;
}

export interface AgentBudget {
  used_today: number;
  daily_limit: number;
  remaining: number;
  warning: boolean;
  blocked: boolean;
}

export interface AgentSettings {
  daily_token_limit: number;
  enabled: boolean;
  default_model: string;
  haiku_auto_routing: boolean;
}

export interface ViewContext {
  currentView: string;
  customerId?: string;
  customerName?: string;
  filters?: Record<string, string>;
  selectedTaskId?: string;
}
```

### 3. Run the migration

If there's a migration script:
```bash
npm run migrate:schema
```

Or if manual, document the SQL for the user to run via Supabase dashboard.

### 4. Verify migration
```bash
npm run migrate:verify
```

If verify script doesn't exist, create a simple check:
```bash
# Check tables exist
npx tsx -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await supabase.from('agent_conversations').select('id').limit(1);
console.log(error ? 'FAIL: ' + error.message : 'OK: agent_conversations exists');
const { data: d2, error: e2 } = await supabase.from('agent_usage').select('id').limit(1);
console.log(e2 ? 'FAIL: ' + e2.message : 'OK: agent_usage exists');
"
```

## QUALITY CHECKS
- npx tsc --noEmit (types compile)
- npm run build

## COMMIT
git add -A && git commit -m "feat(agent): add database schema for agent conversations and usage tracking"

## HANDOFF
Write to .serena/memories/agent_handoffs.md:
- Date: [today]
- From: Agent 3 (Database)
- Status: Complete
- Files Created:
  - supabase/migrations/[timestamp]_add_agent_tables.sql
  - src/types/agent.ts
- Key Context:
  - agent_conversations: private per user, RLS enforced, JSONB messages
  - agent_usage: per-user-per-day, upsert via track_agent_usage() function
  - get_agent_budget(): returns remaining tokens + warning/blocked flags
  - agencies.agent_settings: JSONB column with daily_token_limit, enabled, etc.
  - Default limit: 500K tokens/day per agency
```

---


## Agent 4: Integration Engineer — Wire Panel into App Shell

**Runs AFTER Agents 1-3 are merged.**

```
You are an Integration Engineer wiring the AI Agent panel into the existing app shell.

## CONTEXT LOADING
Read these files first:
- docs/AGENT_INTEGRATION_PLAN.md
- .serena/memories/agent_handoffs.md (read ALL handoff notes from Agents 1-3)
- src/components/MainApp.tsx (main app shell — understand layout, state, panel management)
- src/components/layout/EnhancedBottomNav.tsx (mobile bottom nav)
- src/components/BottomTabs.tsx (tab definitions)
- src/hooks/useKeyboardShortcuts.ts (existing shortcut registration)
- src/components/FloatingChat.tsx + FloatingChatButton.tsx (pattern for floating panels)
- src/components/AgentPanel.tsx (created by Agent 2)
- src/components/agent/AgentToggleButton.tsx (created by Agent 2)
- src/hooks/useViewContext.ts (created by Agent 2)

## TASK: Integrate the agent panel

### 1. Add Agent Panel to MainApp.tsx

Add state and rendering:
```tsx
const [agentOpen, setAgentOpen] = useState(false);
```

Render AgentPanel alongside existing panels. Use the same conditional rendering pattern as ChatPanel/FloatingChat.

Key: AgentPanel and ChatPanel should NOT be open simultaneously on mobile. If agent opens, close chat. If chat opens, close agent. On desktop, both can coexist.

### 2. Add Agent Toggle to Navigation

**Desktop:** Add AgentToggleButton to the sidebar or top bar (wherever ChatPanel toggle lives). Use Sparkles icon to differentiate from chat (MessageSquare icon).

**Mobile:** Add an "AI" tab to EnhancedBottomNav / BottomTabs:
```tsx
{
  id: 'agent',
  label: 'AI',
  icon: Sparkles,
  // Only show if agency has agent_settings.enabled = true
}
```

Position: between Chat and Dashboard tabs (or wherever makes sense in the existing tab order).

### 3. Register Keyboard Shortcut

In useKeyboardShortcuts.ts or inline in MainApp:
- `Cmd+J` / `Ctrl+J`: Toggle agent panel
- Check this doesn't conflict with existing shortcuts

### 4. Pass viewContext to AgentPanel

Wire up the useViewContext hook in MainApp and pass the result to AgentPanel:
```tsx
const viewContext = useViewContext();
<AgentPanel isOpen={agentOpen} onClose={() => setAgentOpen(false)} viewContext={viewContext} />
```

### 5. Morning Briefing Trigger

In MainApp.tsx (or AgentPanel), add first-load-of-day auto-briefing:
```tsx
useEffect(() => {
  const lastBriefing = localStorage.getItem('agent_last_briefing');
  const today = new Date().toISOString().split('T')[0];
  if (lastBriefing !== today && agentOpen) {
    // Auto-send briefing request via useChat's append
    localStorage.setItem('agent_last_briefing', today);
  }
}, [agentOpen]);
```

Don't auto-open the panel. Only trigger briefing if user opens the agent panel and hasn't had today's briefing.

### 6. Usage Warning Integration

If the agent's checkTokenBudget returns warning=true, show a subtle indicator:
- Yellow dot on the AgentToggleButton
- Banner at top of AgentPanel: "80% of daily AI budget used"

If blocked=true:
- Red dot on toggle
- Input disabled with message: "Daily AI limit reached. Resets at midnight."

### 7. Ensure No Regressions

After integration:
- Verify ChatPanel still works independently
- Verify keyboard shortcuts don't conflict
- Verify mobile nav renders correctly with new tab
- Verify dark mode works on AgentPanel
- Test: open agent, switch tabs, come back — agent state preserved

## QUALITY CHECKS
- npm run lint
- npx tsc --noEmit
- npm run build
- Manual check: open app, toggle agent, verify it renders

## COMMIT
git add -A && git commit -m "feat(agent): integrate AgentPanel into app shell with nav, shortcuts, briefing"

## HANDOFF
Write to .serena/memories/agent_handoffs.md:
- Date: [today]
- From: Agent 4 (Integration)
- Status: Complete
- Files Modified: list all
- Key Context:
  - Agent panel toggle: Cmd+J keyboard shortcut
  - Mobile: "AI" tab in bottom nav, full-screen panel
  - Desktop: sidebar toggle button, 420px slide-over
  - Mutual exclusion: on mobile, agent and chat panels can't both be open
  - Morning briefing: triggers on first panel open of the day
  - Usage indicators: yellow dot at 80%, red + disabled at 100%
```

---


## Agent 5: Test Engineer — Unit + Integration + Playwright E2E

**Runs AFTER Agent 4 (needs working integration to test).**

```
You are a Test Engineer writing comprehensive tests for the AI Agent feature.

## CONTEXT LOADING
Read these files first:
- docs/AGENT_INTEGRATION_PLAN.md
- .serena/memories/agent_handoffs.md (ALL handoff notes)
- tests/helpers/test-base.ts (custom Playwright base — hideDevOverlay)
- tests/helpers/auth.ts (loginAsUser helper)
- tests/core-flow.spec.ts (first 80 lines — login + dismiss modal patterns)
- tests/setup.ts (Vitest setup)
- tests/factories/todoFactory.ts (test data factories)
- tests/factories/userFactory.ts
- playwright.config.ts (projects: chromium, firefox, webkit, mobile-chrome, mobile-safari, tablet)
- vitest.config.ts or vite.config.ts (Vitest configuration)
- src/lib/agent/tools/tasks.ts (tool implementations)
- src/lib/agent/context.ts (system prompt)
- src/lib/agent/modelRouter.ts (model selection)
- src/lib/agent/usage.ts (token tracking)
- src/components/AgentPanel.tsx (panel component)
- src/types/agent.ts (TypeScript types)

## TASK: Write tests at three levels

### Level 1: Unit Tests (Vitest)

File: tests/unit/lib/agent/modelRouter.test.ts
```typescript
import { describe, it, expect } from 'vitest';
import { selectModel } from '@/lib/agent/modelRouter';

describe('selectModel', () => {
  it('routes short simple messages to Haiku', () => {
    const messages = [{ role: 'user', content: "What's overdue?" }];
    expect(selectModel(messages)).toBe('claude-haiku-4-5-20251001');
  });

  it('routes write-intent messages to Sonnet', () => {
    const messages = [{ role: 'user', content: 'Create a follow-up task for the Smith account' }];
    expect(selectModel(messages)).toBe('claude-sonnet-4-20250514');
  });

  it('routes multi-step messages to Sonnet', () => {
    const messages = [{ role: 'user', content: "Find all overdue tasks and then reassign them to Sefra" }];
    expect(selectModel(messages)).toBe('claude-sonnet-4-20250514');
  });

  it('routes long complex messages to Sonnet', () => {
    const longMessage = 'Can you look at the Johnson account and tell me about their renewal status, what opportunities we have, and whether there are any pending claims that might affect the renewal conversation? Also check if we have any notes from our last interaction.';
    const messages = [{ role: 'user', content: longMessage }];
    expect(selectModel(messages)).toBe('claude-sonnet-4-20250514');
  });

  it('handles empty messages gracefully', () => {
    expect(selectModel([])).toBe('claude-haiku-4-5-20251001');
  });
});
```

File: tests/unit/lib/agent/context.test.ts
```typescript
import { describe, it, expect } from 'vitest';
import { getAgencyContext } from '@/lib/agent/context';

describe('getAgencyContext', () => {
  const mockCtx = {
    agencyId: 'test-agency-id',
    userId: 'user-1',
    userName: 'Derrick',
    userRole: 'owner' as const,
    permissions: { can_view_all_tasks: true },
  };

  it('includes current date', () => {
    const prompt = getAgencyContext(mockCtx);
    const today = new Date().toISOString().split('T')[0];
    expect(prompt).toContain(today);
  });

  it('includes user name and role', () => {
    const prompt = getAgencyContext(mockCtx);
    expect(prompt).toContain('Derrick');
    expect(prompt).toContain('owner');
  });

  it('includes insurance domain terms', () => {
    const prompt = getAgencyContext(mockCtx);
    expect(prompt).toContain('COI');
    expect(prompt).toContain('binder');
    expect(prompt).toContain('renewal');
  });

  it('includes write confirmation instruction', () => {
    const prompt = getAgencyContext(mockCtx);
    expect(prompt).toMatch(/confirm|proceed|approval/i);
  });

  it('appends view context when provided', () => {
    const prompt = getAgencyContext(mockCtx, {
      currentView: 'customer_detail',
      customerName: 'Mrs. Johnson',
    });
    expect(prompt).toContain('Mrs. Johnson');
    expect(prompt).toContain('customer_detail');
  });
});
```

File: tests/unit/lib/agent/usage.test.ts
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
// Test the budget check logic (may need to mock Supabase)

describe('token usage tracking', () => {
  // Mock Supabase client
  // Test: checkTokenBudget returns correct warning/blocked flags
  // Test: trackTokenUsage increments correctly
  // Test: budget resets on new day (usage_date check)
  
  it('returns warning=true at 80% usage', async () => {
    // Mock: agency limit = 500000, today's usage = 410000
    // Expect: warning=true, blocked=false
  });

  it('returns blocked=true at 100% usage', async () => {
    // Mock: agency limit = 500000, today's usage = 500000
    // Expect: warning=true, blocked=true
  });

  it('returns clean state at start of day', async () => {
    // Mock: no usage records for today
    // Expect: remaining=500000, warning=false, blocked=false
  });
});
```

### Level 2: Integration Tests (Vitest + API route testing)

File: tests/integration/api/agent.test.ts
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// NOTE: Testing the streaming agent route is complex.
// Focus on testing the tool execute functions directly.

describe('Agent Tools - searchTasks', () => {
  // Mock Supabase client
  // Mock AgencyAuthContext
  
  const mockCtx = {
    agencyId: 'test-agency',
    userId: 'user-1',
    userName: 'Derrick',
    userRole: 'owner',
    permissions: { can_view_all_tasks: true },
  };

  it('filters by status when provided', async () => {
    // Call searchTasks(mockCtx).execute({ status: 'todo', limit: 10 })
    // Verify Supabase query includes .eq('status', 'todo')
  });

  it('scopes to agency_id', async () => {
    // Verify .eq('agency_id', 'test-agency') is always applied
  });

  it('respects permission scoping for non-owners', async () => {
    const staffCtx = { ...mockCtx, userRole: 'staff', permissions: { can_view_all_tasks: false } };
    // Verify .or() filter is applied for staff users
  });

  it('filters overdue tasks correctly', async () => {
    // Call with { is_overdue: true }
    // Verify: due_date < today AND status != 'done'
  });

  it('decrypts PII fields', async () => {
    // Verify decryptTodoPII is called on each result
  });

  it('limits results to max 50', async () => {
    // Call with { limit: 100 }
    // Verify .limit(50) is applied (clamped)
  });
});

describe('Agent Tools - createTask', () => {
  it('inserts with correct agency_id and created_by', async () => {
    // Verify insert payload includes agency_id from ctx
  });

  it('logs activity with source: ai_agent', async () => {
    // Verify safeLogActivity called with { source: 'ai_agent' }
  });

  it('returns created task object', async () => {
    // Verify return shape matches expected tool result
  });
});

describe('Agent Tools - searchTeamChat', () => {
  it('only searches group conversations, not DMs', async () => {
    // Verify query filters for group/team conversations
    // Verify private/1:1 messages are excluded
  });
});
```

### Level 3: Playwright E2E Tests

File: tests/agent-panel.spec.ts
```typescript
import { test, expect } from '@playwright/test';
import { hideDevOverlay } from './helpers/test-base';

// Reuse the login pattern from tests/core-flow.spec.ts
async function loginAsExistingUser(page, userName = 'Derrick', pin = '8008') {
  await page.goto('/');
  await hideDevOverlay(page);
  
  const userCard = page.locator(`[data-testid="user-card-${userName}"]`);
  await expect(userCard).toBeVisible({ timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await userCard.click();
  
  await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  const pinInputs = page.locator('input[type="password"]');
  for (let i = 0; i < 4; i++) {
    await pinInputs.nth(i).fill(pin[i]);
  }
  
  await page.waitForLoadState('networkidle');
  
  // Dismiss any modals
  for (let attempt = 0; attempt < 3; attempt++) {
    const viewTasksBtn = page.locator('button').filter({ hasText: 'View Tasks' });
    const dismissBtn = page.locator('button').filter({ hasText: 'Dismiss' });
    if (await viewTasksBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await viewTasksBtn.click();
      await page.waitForLoadState('networkidle');
    } else if (await dismissBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await dismissBtn.click();
    } else {
      break;
    }
  }
}

test.describe('Agent Panel - Desktop', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsExistingUser(page);
  });

  test('opens agent panel via toggle button', async ({ page }) => {
    // Find and click the agent toggle button (Sparkles icon or data-testid="agent-toggle")
    const toggle = page.locator('[data-testid="agent-toggle"]');
    await expect(toggle).toBeVisible({ timeout: 10000 });
    await toggle.click();

    // Agent panel should be visible
    const panel = page.locator('[data-testid="agent-panel"]');
    await expect(panel).toBeVisible({ timeout: 5000 });
  });

  test('opens agent panel via Cmd+J shortcut', async ({ page }) => {
    await page.keyboard.press('Meta+j');
    const panel = page.locator('[data-testid="agent-panel"]');
    await expect(panel).toBeVisible({ timeout: 5000 });
  });

  test('shows empty state with example prompts', async ({ page }) => {
    const toggle = page.locator('[data-testid="agent-toggle"]');
    await toggle.click();

    // Should show empty state
    await expect(page.locator('[data-testid="agent-empty-state"]')).toBeVisible();
    // Should have example prompt text
    await expect(page.getByText(/overdue|tasks|customer/i).first()).toBeVisible();
  });

  test('sends a message and receives streaming response', async ({ page }) => {
    const toggle = page.locator('[data-testid="agent-toggle"]');
    await toggle.click();

    const input = page.locator('[data-testid="agent-input"]');
    await input.fill("What's overdue?");
    await input.press('Enter');

    // Should show loading indicator
    await expect(page.locator('[data-testid="agent-loading"]').or(
      page.getByText(/searching|looking/i)
    )).toBeVisible({ timeout: 10000 });

    // Should eventually show a response (text or tool result)
    // Wait for either assistant text or a tool result card
    await expect(
      page.locator('[data-testid="agent-message-assistant"]').or(
        page.locator('[data-testid="task-list-card"]')
      )
    ).toBeVisible({ timeout: 30000 });
  });

  test('shows tool result cards for task searches', async ({ page }) => {
    const toggle = page.locator('[data-testid="agent-toggle"]');
    await toggle.click();

    const input = page.locator('[data-testid="agent-input"]');
    await input.fill('Show me all high priority tasks');
    await input.press('Enter');

    // Wait for task list card to render
    await expect(
      page.locator('[data-testid="task-list-card"]')
    ).toBeVisible({ timeout: 30000 });
  });

  test('closes agent panel with X button', async ({ page }) => {
    const toggle = page.locator('[data-testid="agent-toggle"]');
    await toggle.click();

    const panel = page.locator('[data-testid="agent-panel"]');
    await expect(panel).toBeVisible();

    const closeBtn = panel.locator('[data-testid="agent-close"]');
    await closeBtn.click();

    await expect(panel).not.toBeVisible();
  });

  test('closes agent panel with Cmd+J shortcut', async ({ page }) => {
    await page.keyboard.press('Meta+j');
    const panel = page.locator('[data-testid="agent-panel"]');
    await expect(panel).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Meta+j');
    await expect(panel).not.toBeVisible();
  });

  test('quick action pills are visible and clickable', async ({ page }) => {
    const toggle = page.locator('[data-testid="agent-toggle"]');
    await toggle.click();

    // Quick actions should be visible
    const quickActions = page.locator('[data-testid="agent-quick-actions"]');
    await expect(quickActions).toBeVisible();

    // Click a quick action
    const firstPill = quickActions.locator('button').first();
    await firstPill.click();

    // Input should be populated and message sent
    await expect(
      page.locator('[data-testid="agent-message-user"]').or(
        page.locator('[data-testid="agent-loading"]')
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test('preserves conversation state when panel is closed and reopened', async ({ page }) => {
    const toggle = page.locator('[data-testid="agent-toggle"]');
    await toggle.click();

    // Send a message
    const input = page.locator('[data-testid="agent-input"]');
    await input.fill('Team workload');
    await input.press('Enter');

    // Wait for response
    await expect(
      page.locator('[data-testid="agent-message-assistant"]').or(
        page.locator('[data-testid="workload-card"]')
      )
    ).toBeVisible({ timeout: 30000 });

    // Close and reopen
    await page.keyboard.press('Meta+j');
    await page.keyboard.press('Meta+j');

    // Previous messages should still be visible
    await expect(
      page.locator('[data-testid="agent-message-user"]')
    ).toBeVisible();
  });
});

test.describe('Agent Panel - Mobile', () => {
  test.use({ ...require('@playwright/test').devices['iPhone 12'] });

  test.beforeEach(async ({ page }) => {
    await loginAsExistingUser(page);
  });

  test('opens agent in full-screen mode on mobile', async ({ page }) => {
    // Find AI tab in bottom nav
    const aiTab = page.locator('[data-testid="nav-agent"]').or(
      page.getByRole('tab', { name: /ai/i })
    );

    // If there's a toggle button instead
    const toggle = page.locator('[data-testid="agent-toggle"]');

    if (await aiTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aiTab.click();
    } else if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await toggle.click();
    }

    const panel = page.locator('[data-testid="agent-panel"]');
    await expect(panel).toBeVisible({ timeout: 5000 });

    // Verify full-screen: panel should cover the viewport
    const box = await panel.boundingBox();
    const viewport = page.viewportSize();
    expect(box?.width).toBeGreaterThanOrEqual((viewport?.width || 375) * 0.95);
    expect(box?.height).toBeGreaterThanOrEqual((viewport?.height || 812) * 0.9);
  });

  test('has back button on mobile', async ({ page }) => {
    const toggle = page.locator('[data-testid="agent-toggle"]').or(
      page.locator('[data-testid="nav-agent"]')
    );
    if (await toggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await toggle.click();
    }

    const backBtn = page.locator('[data-testid="agent-back"]');
    await expect(backBtn).toBeVisible();

    await backBtn.click();
    const panel = page.locator('[data-testid="agent-panel"]');
    await expect(panel).not.toBeVisible();
  });

  test('mutual exclusion: opening agent closes chat', async ({ page }) => {
    // Open chat first (if visible)
    const chatTab = page.locator('[data-testid="nav-chat"]').or(
      page.getByRole('tab', { name: /chat/i })
    );
    if (await chatTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatTab.click();
      await page.waitForTimeout(500);
    }

    // Open agent
    const agentTab = page.locator('[data-testid="nav-agent"]').or(
      page.locator('[data-testid="agent-toggle"]')
    );
    if (await agentTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await agentTab.click();
    }

    // Agent should be visible, chat should not
    await expect(page.locator('[data-testid="agent-panel"]')).toBeVisible({ timeout: 5000 });
    // Chat panel should be hidden
    const chatPanel = page.locator('[data-testid="chat-panel"]');
    if (await chatPanel.count() > 0) {
      await expect(chatPanel).not.toBeVisible();
    }
  });
});

test.describe('Agent Panel - Tablet', () => {
  test.use({ ...require('@playwright/test').devices['iPad (gen 7)'] });

  test.beforeEach(async ({ page }) => {
    await loginAsExistingUser(page);
  });

  test('renders correctly on tablet viewport', async ({ page }) => {
    const toggle = page.locator('[data-testid="agent-toggle"]');
    if (await toggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await toggle.click();
    }

    const panel = page.locator('[data-testid="agent-panel"]');
    await expect(panel).toBeVisible({ timeout: 5000 });

    // Should be either full-screen or slide-over depending on breakpoint
    const box = await panel.boundingBox();
    expect(box?.width).toBeGreaterThan(300);
  });
});

test.describe('Agent Panel - Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsExistingUser(page);
    // Toggle dark mode if there's a button
    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]');
    if (await darkModeToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await darkModeToggle.click();
    }
  });

  test('agent panel respects dark mode', async ({ page }) => {
    const toggle = page.locator('[data-testid="agent-toggle"]');
    if (await toggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await toggle.click();
    }

    const panel = page.locator('[data-testid="agent-panel"]');
    await expect(panel).toBeVisible({ timeout: 5000 });

    // Take screenshot for visual verification
    await panel.screenshot({ path: 'tests/screenshots/agent-panel-dark-mode.png' });
  });
});

test.describe('Agent Panel - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsExistingUser(page);
  });

  test('shows error message on API failure', async ({ page }) => {
    // Intercept the agent API and return an error
    await page.route('**/api/ai/agent', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    const toggle = page.locator('[data-testid="agent-toggle"]');
    await toggle.click();

    const input = page.locator('[data-testid="agent-input"]');
    await input.fill('Test query');
    await input.press('Enter');

    // Should show error state
    await expect(
      page.getByText(/error|failed|try again/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows usage limit message when budget exhausted', async ({ page }) => {
    // Intercept and return 429
    await page.route('**/api/ai/agent', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Daily AI usage limit reached. Resets at midnight.' }),
      });
    });

    const toggle = page.locator('[data-testid="agent-toggle"]');
    await toggle.click();

    const input = page.locator('[data-testid="agent-input"]');
    await input.fill('Test query');
    await input.press('Enter');

    // Should show limit reached message
    await expect(
      page.getByText(/limit|budget|midnight/i)
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Agent Panel - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsExistingUser(page);
  });

  test('agent panel is keyboard navigable', async ({ page }) => {
    // Open via keyboard
    await page.keyboard.press('Meta+j');

    const panel = page.locator('[data-testid="agent-panel"]');
    await expect(panel).toBeVisible({ timeout: 5000 });

    // Input should be auto-focused
    const input = page.locator('[data-testid="agent-input"]');
    await expect(input).toBeFocused({ timeout: 3000 });

    // Tab should move to other interactive elements
    await page.keyboard.press('Tab');
    // Verify focus moved (to a button or quick action)
  });

  test('agent panel has proper ARIA attributes', async ({ page }) => {
    const toggle = page.locator('[data-testid="agent-toggle"]');
    await toggle.click();

    const panel = page.locator('[data-testid="agent-panel"]');
    await expect(panel).toBeVisible({ timeout: 5000 });

    // Panel should have appropriate role
    await expect(panel).toHaveAttribute('role', /(dialog|complementary|region)/);

    // Should have aria-label
    const ariaLabel = await panel.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();

    // Messages should be in a list or log role
    const messageList = panel.locator('[role="log"]').or(panel.locator('[data-testid="agent-messages"]'));
    await expect(messageList).toBeVisible();
  });

  test('escape key closes agent panel', async ({ page }) => {
    await page.keyboard.press('Meta+j');
    const panel = page.locator('[data-testid="agent-panel"]');
    await expect(panel).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
    await expect(panel).not.toBeVisible();
  });
});
```

### data-testid Reference

Ensure Agent 2 (Frontend) adds these data-testid attributes:

| Component | data-testid |
|-----------|------------|
| AgentToggleButton | `agent-toggle` |
| AgentPanel (root) | `agent-panel` |
| Close button | `agent-close` |
| Back button (mobile) | `agent-back` |
| Input field | `agent-input` |
| Loading indicator | `agent-loading` |
| Empty state | `agent-empty-state` |
| Message (user) | `agent-message-user` |
| Message (assistant) | `agent-message-assistant` |
| Quick actions container | `agent-quick-actions` |
| TaskListCard | `task-list-card` |
| CustomerCard | `customer-card` |
| WorkloadCard | `workload-card` |
| EmailDraftCard | `email-draft-card` |
| ChatHistoryCard | `chat-history-card` |
| Mobile nav tab | `nav-agent` |

If Agent 2 did not add these, add them now before writing tests.

### Test Run Commands

```bash
# Unit tests only (fast)
npm run test -- --grep "agent"

# Playwright E2E — agent tests only
npx playwright test tests/agent-panel.spec.ts

# Playwright — specific browser
npx playwright test tests/agent-panel.spec.ts --project=chromium

# Playwright — mobile only
npx playwright test tests/agent-panel.spec.ts --project=mobile-chrome --project=mobile-safari

# Playwright — with UI for debugging
npx playwright test tests/agent-panel.spec.ts --ui

# All tests (full suite — run before final commit)
npm run test && npx playwright test tests/agent-panel.spec.ts
```

## QUALITY CHECKS
- All unit tests pass: npm run test
- All Playwright tests pass on chromium: npx playwright test tests/agent-panel.spec.ts --project=chromium
- Mobile tests pass: npx playwright test tests/agent-panel.spec.ts --project=mobile-chrome
- No TypeScript errors: npx tsc --noEmit

## COMMIT
git add -A && git commit -m "test(agent): add unit tests, integration tests, and Playwright E2E for agent feature"

## HANDOFF
Write to .serena/memories/agent_handoffs.md:
- Date: [today]
- From: Agent 5 (Tests)
- Status: Complete
- Files Created: list all test files
- Key Context:
  - Unit tests: modelRouter, context, usage — in tests/unit/lib/agent/
  - Integration tests: tool execute functions — in tests/integration/api/
  - E2E: Playwright — in tests/agent-panel.spec.ts
  - Covers: desktop, mobile (iPhone 12), tablet (iPad), dark mode, error handling, accessibility
  - Uses existing login helper pattern (Derrick/8008)
  - data-testid attributes required on all agent components
  - All E2E tests follow existing patterns from tests/core-flow.spec.ts
```

---


## Agent 6: Code Reviewer — Final Validation

**Runs LAST after all other agents.**

```
You are a Code Reviewer doing final validation of the AI Agent feature.

## CONTEXT LOADING
Read these files first:
- docs/AGENT_INTEGRATION_PLAN.md
- .serena/memories/agent_handoffs.md (ALL handoff notes)
- .serena/memories/critical_patterns.md
- .serena/memories/task_completion_checklist.md
- ORCHESTRATOR.md (Critical Constraints section)

## TASK: Review all agent code for correctness, security, and consistency

### Checklist

**Security:**
- [ ] Every Supabase query in tools filters by `agency_id` from ctx
- [ ] Permission scoping: staff users can only see their own tasks (can_view_all_tasks check)
- [ ] No raw SQL injection vectors — all params go through Supabase query builder
- [ ] PII fields decrypted via decryptTodoPII, never stored in agent conversation logs
- [ ] Team chat tool ONLY queries group conversations, NOT private DMs
- [ ] Token budget check runs BEFORE streaming starts (not after)
- [ ] Agent conversations are private per user (user_id filter on all queries)
- [ ] No secrets/API keys in client-side code
- [ ] Input sanitization on tool parameters (especially text search queries)

**Data Integrity:**
- [ ] All write tools (createTask, updateTask, bulkUpdateTasks) call safeLogActivity
- [ ] Activity logs include `source: 'ai_agent'` to distinguish from manual actions
- [ ] Created tasks include agency_id and created_by from ctx
- [ ] Updated tasks verify ownership before modification
- [ ] Bulk operations verify ALL task_ids belong to the agency

**TypeScript:**
- [ ] No `any` types (use proper types from src/types/agent.ts)
- [ ] Tool parameters use zod schemas correctly
- [ ] AgencyAuthContext type used consistently
- [ ] Vercel AI SDK types used correctly (Message, StreamTextResult, etc.)
- [ ] Run: `npx tsc --noEmit` — zero errors

**Frontend:**
- [ ] AgentPanel has data-testid attributes on all interactive elements
- [ ] Dark mode works (dark: prefix on all colors)
- [ ] Mobile layout: full-screen, back button works
- [ ] Desktop layout: 420px slide-over, close button works
- [ ] Keyboard shortcut Cmd+J toggles correctly
- [ ] Agent and chat panels don't conflict on mobile
- [ ] Streaming text renders incrementally (not all at once)
- [ ] Tool invocations show loading state then result card
- [ ] Empty state rendered when no messages
- [ ] Error states rendered for API failures and rate limits

**Performance:**
- [ ] No unnecessary re-renders in AgentPanel (check memo/callback usage)
- [ ] Tool result cards don't re-render on every message update
- [ ] Supabase queries use appropriate indexes (agency_id, user_id, status)
- [ ] maxSteps=5 prevents runaway agent loops
- [ ] maxDuration=60 on API route prevents timeouts
- [ ] Model router correctly downgrades to Haiku for simple queries

**Tests:**
- [ ] Unit tests cover modelRouter edge cases
- [ ] Unit tests cover context builder with/without viewContext
- [ ] Integration tests mock Supabase correctly
- [ ] Playwright tests use existing login helper pattern
- [ ] Mobile E2E tests verify full-screen behavior
- [ ] Error handling tests use route interception
- [ ] All tests pass: `npm run test && npx playwright test tests/agent-panel.spec.ts --project=chromium`

**Consistency with Codebase:**
- [ ] Follows existing code style (check .serena/memories/code_style_conventions.md)
- [ ] Uses existing utilities: logger, safeLogActivity, encryptTodoPII/decryptTodoPII
- [ ] API route uses withAgencyAuth wrapper (same as other API routes)
- [ ] Error responses use consistent format (check existing API routes)
- [ ] Component naming follows existing patterns (PascalCase, descriptive)

### Fix anything that fails the checklist.

After fixes:
```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test
npx playwright test tests/agent-panel.spec.ts --project=chromium
```

## COMMIT
git add -A && git commit -m "chore(agent): code review fixes and final polish"

## FINAL HANDOFF
Write to .serena/memories/agent_handoffs.md:
- Date: [today]
- From: Agent 6 (Code Review)
- Status: Feature Complete — Ready for Manual Testing
- Summary:
  - All checklist items pass
  - All tests pass
  - Build succeeds
  - Files reviewed: [count]
  - Issues found and fixed: [list]
```

---

## Complete File Manifest

After all agents complete, the codebase should have these new files:

```
src/
├── app/api/ai/agent/
│   └── route.ts                           # Agent 1: Streaming endpoint
├── lib/agent/
│   ├── index.ts                           # Agent 1: Re-exports
│   ├── context.ts                         # Agent 1: System prompt builder
│   ├── modelRouter.ts                     # Agent 1: Haiku/Sonnet routing
│   ├── usage.ts                           # Agent 1: Token tracking
│   └── tools/
│       ├── tasks.ts                       # Agent 1: search/create/update/bulk
│       ├── customers.ts                   # Agent 1: search/detail
│       ├── team.ts                        # Agent 1: workload
│       ├── chat.ts                        # Agent 1: team chat search
│       └── email.ts                       # Agent 1: draft email
├── components/
│   ├── AgentPanel.tsx                     # Agent 2: Main panel
│   └── agent/
│       ├── AgentToggleButton.tsx          # Agent 2: Nav toggle
│       ├── TaskListCard.tsx               # Agent 2: Tool renderer
│       ├── CustomerCard.tsx               # Agent 2: Tool renderer
│       ├── WorkloadCard.tsx               # Agent 2: Tool renderer
│       ├── EmailDraftCard.tsx             # Agent 2: Tool renderer
│       ├── ChatHistoryCard.tsx            # Agent 2: Tool renderer
│       └── QuickActions.tsx               # Agent 2: Context pills
├── hooks/
│   └── useViewContext.ts                  # Agent 2: View context hook
├── types/
│   └── agent.ts                           # Agent 3: TypeScript types
supabase/
└── migrations/
    └── [timestamp]_add_agent_tables.sql   # Agent 3: DB migration
tests/
├── unit/lib/agent/
│   ├── modelRouter.test.ts                # Agent 5: Unit tests
│   ├── context.test.ts                    # Agent 5: Unit tests
│   └── usage.test.ts                      # Agent 5: Unit tests
├── integration/api/
│   └── agent.test.ts                      # Agent 5: Integration tests
└── agent-panel.spec.ts                    # Agent 5: Playwright E2E
docs/
├── AGENT_INTEGRATION_PLAN.md              # This plan
└── CLAUDE_CODE_AGENT_PROMPTS.md           # This file
```

Modified files (by Agent 4):
- `src/components/MainApp.tsx` — agent panel state + rendering
- `src/components/layout/EnhancedBottomNav.tsx` — AI tab on mobile
- `src/hooks/useKeyboardShortcuts.ts` — Cmd+J registration (if applicable)
- `package.json` — new dependencies: ai, @ai-sdk/anthropic, zod

---

## Quick Reference: Running Agents

```bash
# Setup worktrees (run once)
cd /Users/adrianstier/shared-todo-list
git worktree add .worktrees/agent-backend -b feat/agent-backend
git worktree add .worktrees/agent-frontend -b feat/agent-frontend
git worktree add .worktrees/agent-database -b feat/agent-database

# Run Agents 1-3 in parallel (separate terminals or Claude Code instances)
# Agent 1: cd .worktrees/agent-backend && [paste Agent 1 prompt]
# Agent 2: cd .worktrees/agent-frontend && [paste Agent 2 prompt]
# Agent 3: cd .worktrees/agent-database && [paste Agent 3 prompt]

# After 1-3 complete: merge
git checkout main
git merge feat/agent-backend --no-edit
git merge feat/agent-frontend --no-edit
git merge feat/agent-database --no-edit

# Run Agent 4 (on main)
# [paste Agent 4 prompt]

# Run Agent 5 (on main, after 4)
# [paste Agent 5 prompt]

# Run Agent 6 (on main, after 5)
# [paste Agent 6 prompt]

# Clean up worktrees
git worktree remove .worktrees/agent-backend
git worktree remove .worktrees/agent-frontend
git worktree remove .worktrees/agent-database
git branch -d feat/agent-backend feat/agent-frontend feat/agent-database
```
