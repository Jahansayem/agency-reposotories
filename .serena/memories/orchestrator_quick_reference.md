# Orchestrator Quick Reference

## Agent Dispatch Decision Tree

```
User Request Type → Primary Agent → Secondary Agent
───────────────────────────────────────────────────
Bug fix           → Code Reviewer → Backend/Frontend
New feature       → Business Analyst → Tech Lead → Engineers
UI change         → Frontend Engineer → Code Reviewer
API change        → Backend Engineer → Code Reviewer
DB change         → Database Engineer → Backend Engineer
Security review   → Security Reviewer
Data analysis     → Data Scientist
Deploy/release    → Tech Lead
```

## Critical Constraints (ALL AGENTS)

1. **Activity Logging**: Call `logActivity()` for ALL mutations
2. **Subscription Cleanup**: Return cleanup in `useEffect`
3. **Owner Guard**: Check `name === 'Derrick'` for owner features
4. **TypeScript**: All types in `src/types/todo.ts`
5. **Optimistic Updates**: Update UI first, persist async

## Pipeline Stages

1. **REQUIREMENTS** - Business Analyst
2. **ARCHITECTURE** - Tech Lead (+ DB Engineer if schema)
3. **IMPLEMENTATION** - Backend + Frontend Engineers
4. **VALIDATION** - Code Reviewer + Security Reviewer
5. **ANALYSIS** - Data Scientist (optional)

## Key Documentation

| For | Read |
|-----|------|
| Full context | ORCHESTRATOR.md |
| Agent workflows | docs/AGENT_WORKFLOWS.md |
| Deep implementation | CLAUDE.md |
| Security | SECURITY_IMPROVEMENT_CHECKLIST.md |
| Refactoring | REFACTORING_PLAN.md |

## Common Operations

### Create Task
```typescript
await supabase.from('todos').insert({...}).select().single();
await logActivity({ action: 'task_created', ... });
```

### Real-time Subscription
```typescript
useEffect(() => {
  const channel = supabase.channel('name').on(...).subscribe();
  return () => supabase.removeChannel(channel);
}, []);
```

## Test Commands
```bash
npm run build    # Build check
npm run lint     # Lint check
npm run test     # Unit tests
npm run test:e2e # E2E tests
```

---

*Updated: 2026-01-20*
