# Shared Todo List — Bealer Agency

Multi-agency todo list and operations platform for Allstate agencies. Full-stack Next.js app with real-time collaboration, AI features, analytics, and an iOS companion app.

## Stack
- Next.js (App Router) + TypeScript
- Supabase (auth, database, RLS policies)
- Tailwind CSS + shadcn/ui components
- Vitest (unit) + Playwright (E2E)
- iOS companion: Swift/SwiftUI (`ios-app/`)

## Commands
```
npm run dev              # Next.js dev server
npm run build            # Production build
npm run test             # Vitest unit tests
npm run test:e2e         # Playwright E2E tests
npm run test:coverage    # Coverage report
npm run migrate:schema   # Run DB migrations
npm run migrate:dry-run  # Preview migrations
```

## Directory Structure
- `src/app/` — Next.js App Router pages and API routes
  - `api/` — Backend API endpoints (analytics, auth, CRUD, etc.)
  - `sign-in/`, `sign-up/`, `join/` — Auth flows
- `src/components/` — React components by domain
  - `analytics/` — Allstate analytics dashboards
  - `calendar/` — Renewal calendar
  - `chat/` — Real-time messaging
  - `customer/` — Customer lookup and segmentation
  - `dashboard/` — Main dashboard widgets
  - `kanban/` — Board view
  - `task/`, `task-detail/`, `todo/` — Task management
  - `permissions/` — Role-based access UI
  - `ui/` — Shared shadcn/ui primitives
- `src/lib/` — Core business logic
  - `analytics/` — Portfolio analysis, LTV calculations
  - `auth/` — Authentication helpers
  - `db/` — Database utilities
  - `allstate-parser.ts` — CSV/Excel import parsing
  - `segmentation.ts` — Customer segmentation (single source of truth)
- `src/hooks/` — Custom React hooks
- `src/store/` — State management
- `src/types/` — TypeScript type definitions
- `src/contexts/` — React context providers
- `tests/` — Playwright E2E tests (100+ spec files)
- `ios-app/` — Swift iOS app with widgets
- `docs/` — Feature docs, plans, API documentation
- `scripts/` — Migration and utility scripts

## Key Features
- Multi-agency support with RLS isolation (47 API routes protected)
- 21 granular permissions (owner/manager/staff roles)
- Allstate analytics: CSV import, cross-sell scoring, renewal calendar
- Real-time: collaborative editing, typing indicators, presence
- Push notifications, version history, chat with attachments

## Conventions
- All API routes use auth wrappers (`withAgencyAuth`, `withSessionAuth`)
- Segmentation logic lives in `src/lib/segmentation.ts` — single source of truth
- Customer LTV calculations in `src/lib/analytics.ts`
- Environment variables in `.env.local` (see `.env.example`)
- MCP config in `.mcp.json`

## File Ownership (parallel work)
- `src/components/analytics/` — analytics UI, independent
- `src/components/chat/` — chat feature, independent
- `src/components/dashboard/` — dashboard widgets, independent
- `src/components/task/` — task management, independent
- `src/app/api/` — API routes, split by domain
- `src/lib/` — shared logic, coordinate edits to `segmentation.ts` and `analytics.ts`
- `tests/` — each spec file is independent
- `ios-app/` — fully independent from web app
- `docs/` — independent documentation files

## CI / TypeScript Check
- CI runs `npx tsc --noEmit` in `.github/workflows/security.yml` on every push to main
- `tsconfig.json` excludes test files: `src/test/`, `**/*.test.ts`, `**/*.test.tsx`, `**/*.spec.ts`, `**/*.spec.tsx`, `vitest.config.ts`
- **CRITICAL**: When adding new test files or test utilities, ensure they are covered by the exclude patterns above. If a test file has type errors, it will break CI for the entire project.
- When adding new `src/test/` helpers, `*.test.ts`, or `*.spec.ts` files: they are excluded from `tsc` — do NOT add them to `tsconfig.json` include patterns
- Always run `npx tsc --noEmit` locally before pushing to verify CI will pass

## Gotchas
- RLS policies are critical — test data isolation when changing API routes
- `src/lib/segmentation.ts` is referenced by multiple components — changes cascade
- 100+ test files in `tests/` — many are debug/one-off specs
- Two auth patterns exist (PIN-based and session-based)
- iOS app shares Supabase backend but is otherwise independent
- Test files (`*.spec.ts`, `*.test.ts`, `src/test/`) are excluded from TypeScript compilation — see CI section above
