# Repository Guidelines

## Project Structure & Module Organization

- `src/app/`: Next.js App Router pages, layouts, route handlers
- `src/components/`: shared UI components
- `src/contexts/`, `src/hooks/`, `src/store/`: React state and client-side behavior
- `src/lib/`: shared utilities and service clients (e.g., auth/Supabase helpers)
- `src/types/`: shared TypeScript types
- `public/`: static assets served by Next.js
- `scripts/`: maintenance and migration scripts (run via `tsx`)
- `supabase/`: database-related files (schema/policies/migrations)
- `tests/`: Playwright E2E (`*.spec.ts`) and Vitest unit/integration (`*.test.ts`)
- `docs/`: design/deployment notes; `ios-app/`: companion iOS client

## Build, Test, and Development Commands

Use Node `20.11.0` (see `.node-version`).

- `npm ci`: install dependencies from `package-lock.json`
- `npm run dev`: start local app at `http://localhost:3000`
- `npm run build`: production build
- `npm run start`: run the production build
- `npm run lint`: run ESLint
- `npm test`: run Vitest unit/integration tests
- `npm run test:e2e`: run Playwright E2E tests (auto-starts `npm run dev`)
- `npm run migrate:schema`: apply schema migrations
- `npm run migrate:dry-run`: preview migrations without applying
- `npm run migrate:verify`: verify migration results

## Coding Style & Naming Conventions

- TypeScript + React. Prefer the `@/…` import alias for code under `src/`.
- Follow existing formatting in the touched file (indentation, quotes, semicolons).
- If a variable is intentionally unused, prefix it with `_` (matches ESLint config).

## Testing Guidelines

- **Vitest**: place tests in `tests/unit/**/*.test.{ts,tsx}` and `tests/integration/**/*.test.{ts,tsx}`.
- **Playwright**: use `tests/**/*.spec.ts`.
- Coverage thresholds (see `vitest.config.ts`) are enforced: ~80% lines/functions/statements and 75% branches.

## Commit & Pull Request Guidelines

- Prefer short, imperative commit messages; use Conventional Commits when practical (`feat:`, `fix:`, etc.).
- PRs should include: summary, steps to test, and screenshots/screen recordings for UI changes.
- Call out any environment or schema changes (e.g., `.env.local`, Supabase migrations) in the PR description.
