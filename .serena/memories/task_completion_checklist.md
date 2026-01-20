# Task Completion Checklist

## Before Committing Code

1. **Lint Check**
   ```bash
   npm run lint
   ```

2. **Run Unit Tests**
   ```bash
   npm run test
   ```

3. **Run E2E Tests** (if UI changes)
   ```bash
   npm run test:e2e
   ```

4. **Build Check**
   ```bash
   npm run build
   ```

## Critical Patterns to Verify

- [ ] Real-time subscriptions are cleaned up in `useEffect` return
- [ ] Activity logging is added for all database mutations
- [ ] TypeScript types are properly defined in `src/types/todo.ts`
- [ ] Optimistic updates are used for better UX
- [ ] Error handling with user-friendly messages
- [ ] Mobile responsiveness tested

## Post-Deployment Checklist

1. ✅ Verify login flow works
2. ✅ Create a test task
3. ✅ Test real-time sync (open two tabs)
4. ✅ Test AI features if modified
5. ✅ Check mobile responsiveness
6. ✅ Verify dark mode toggle
