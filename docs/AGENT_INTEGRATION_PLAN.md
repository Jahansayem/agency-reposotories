# Agent Integration Plan

## Status: Planning → Ready for Implementation
## Last Updated: 2025-02-19

---

## What This Is

A plan to add a conversational AI agent to the Bealer Agency todo app. The agent reads and writes app data through natural conversation, replacing scattered single-shot AI endpoints with a unified assistant that understands the full agency context.

## Resolved Decisions

- **Conversations: Private per user.** Each user's agent history is only visible to them. Stored with `user_id` in `agent_conversations` table, no cross-user queries.
- **Rate limiting: Per-agency daily token cap of 500K tokens/day.** ~200 interactions/day × ~2,500 tokens avg. Covers a 5-person agency using the agent heavily. Configurable per plan. Tracked in `agent_usage` table. Warning at 80%, hard stop at 100%.
- **Team chat access: Yes, but not 1:1 DMs.** Agent reads team/group chat for context. Private/direct messages excluded. Tool filters on `conversation.is_group = true`.
- **Haiku fallback: Auto-detect.** Simple queries (single tool, short input) → Haiku. Complex/multi-step/write ops → Sonnet. User can force Sonnet via toggle.
- **Mobile UX: Full-screen agent panel.** On `<768px`, agent takes over the screen. Back button returns to previous view.

---

## Architecture: Vercel AI SDK

**Packages:** `ai` + `@ai-sdk/anthropic` + `zod`

Why: `streamText` handles the agent loop (tool call → result → continue), `useChat` handles client streaming, `maxSteps` controls recursion depth. No manual SSE or agent loop code.

---

## 5-Phase Roadmap

### Phase 1: Read-Only Agent (Sprint 1)
Working conversational agent that answers questions about tasks, customers, team workload, and chat history.

### Phase 2: Write Tools (Sprint 2)
Create tasks, update status/priority/assignment, draft emails. Confirmation before all writes.

### Phase 3: Contextual Intelligence (Sprint 3)
View-aware context, quick action buttons, morning briefing.

### Phase 4: Background Automation
Event-driven agents (task completed → suggest next, waiting timeout → alert, renewal approaching → create task). Vercel cron routes.

### Phase 5: Persistence + Preferences
Conversation storage in Supabase, usage tracking, cost controls, Haiku auto-routing.

---

## Implementation Details

See `docs/CLAUDE_CODE_AGENT_PROMPTS.md` for the full Claude Code agent prompts to build this system.
