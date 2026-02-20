# Critical Engineering Review Report — `shared-todo-list`

Date: 2026-02-20

This report is intentionally blunt. It focuses on correctness, security/compliance, operational risk, and maintainability.

## Scope & Method

**Scope**: Full repo (Next.js app + API routes + Supabase SQL + scripts + tests + iOS app + docs/data).

**What I actually did** (evidence-based):
- Ran `npx tsc -p tsconfig.json --noEmit` (passes).
- Ran `npm test` (Vitest): **fails** (multiple suites; 66 test failures).
- Ran `npm run lint` (ESLint): **fails** (950 problems; 410 errors / 540 warnings) after fixing ignores so it doesn’t lint generated `.next` output.
- Attempted `npm run build` (Next/Turbopack): **fails in this environment** due to `next/font/google` build-time fetch (no network).
- Code-read and cross-referenced security-critical modules (middleware/session validation/CSRF), key client hooks (todos/agent/push), key API routes, and multi-tenancy migrations.
- Repo-wide static scans (`rg`) for dangerous patterns, secrets markers, console logs, TODOs, etc.

## Repo Snapshot (high-level)

- Tracked files: ~1305
- Primary stack: Next.js (App Router), React, TypeScript, Supabase, Clerk + NextAuth + custom PIN auth, Upstash Redis, Sentry, Playwright/Vitest
- Notable repo content: **large binary datasets** in `src/data/bealer-model/**` (PDF/XLSX/CSV) + iOS app (`ios-app/**`).

---

## P0 — Critical Issues (fix before “production-ready” claims)

### P0.1 Auth can fail-open / accept spoofable identity in “missing migration” scenarios

If the `user_sessions` table/RPC is missing (or migrations aren’t applied), the code has explicit fallbacks that turn into auth bypasses.

- `src/middleware.ts` allows requests through when `user_sessions` doesn’t exist (fail-open):
  - `src/middleware.ts:283-288` returns `{ valid: true }` on `42P01` / “does not exist”.
- `src/lib/sessionValidator.ts` contains a deprecated fallback that trusts `X-User-Name` if `user_sessions` doesn’t exist:
  - `src/lib/sessionValidator.ts:142-165` looks up a user by `X-User-Name` and returns `valid: true`.

Impact:
- A misconfigured deploy (or partial migration) becomes an auth bypass event. This is exactly the kind of “works in staging, wide-open in prod” incident that happens under real rollout pressure.

Recommendation:
- Remove these fallbacks entirely, or at minimum gate them behind `NODE_ENV !== 'production'` **and** return `503` in production with an explicit “migrations missing” message.
- Add a startup/health gate that verifies required tables + RPCs exist (and blocks traffic until they do).

### P0.2 Multi-tenancy session-context persistence is extremely dangerous with pooled connections

The DB migration explicitly changes request-context GUCs to be **session-wide**:
- `supabase/migrations/20260203040000_phase0_prerequisites.sql:31-43` uses `set_config(..., false)` (not transaction-local).

Impact:
- With connection pooling (PostgREST/Supabase), **session-level settings can bleed across requests** if not reset perfectly, causing cross-user/cross-agency data access.
- This is a “silent catastrophic” risk: it might only surface under load and is hard to detect from happy-path tests.

Recommendation:
- Do not rely on session-wide GUC state for request scoping unless you can guarantee per-request reset on the same connection (hard in Supabase/PostgREST).
- Prefer one of:
  1) Supabase Auth JWT + RLS using `auth.uid()`/JWT claims (standard pattern), or
  2) Put scoped operations into SECURITY DEFINER RPCs that take `user_id/agency_id` explicitly and enforce checks internally, or
  3) Use transaction-local config (`is_local=true`) and ensure context + queries occur in the same transaction boundary (typically via RPC).

### P0.3 Server-only reminder logic (service role) is called from a client hook

Client-side hook calls server-only functionality:
- `src/hooks/useTodoData.ts:365-392` calls `createAutoReminders(...)`.
- `src/lib/reminderService.ts:420+` uses `getServerSupabase()` → `createServiceRoleClient()` (service role key).

Impact:
- Best case: runtime failure in the browser when creating/updating tasks with due dates (auto-reminders).
- Worst case (if someone ever exposes service role to the client): complete DB compromise.

Recommendation:
- Remove `createAutoReminders/updateAutoReminders` calls from client code.
- Implement auto-reminders via:
  - a server route (`/api/reminders`) called with `fetchWithCsrf`, or
  - a DB trigger on `todos.due_date/assigned_to` changes, or
  - a server-side job processor.

### P0.4 AI Agent UI is structurally broken (streaming mismatch + missing CSRF + stale payload)

Mismatch:
- Frontend expects streaming SSE-like chunks:
  - `src/hooks/useAgent.ts:85-168` reads `response.body.getReader()` and parses `data: ...` chunks.
- Backend route is **non-streaming JSON**:
  - `src/app/api/ai/agent/route.ts:159-167` returns JSON `{ success, message, ... }`.

Missing CSRF:
- `src/hooks/useAgent.ts:86-95` does **not** send `X-CSRF-Token` (middleware enforces CSRF for POST `/api/*`).

Stale request payload:
- `src/hooks/useAgent.ts:86-95` builds the POST body from `messages` captured in the hook closure, but `messages` is not in the dependency array and is updated asynchronously → the POST body is often wrong/stale.

Additionally, backend constructs `conversationContext/fullPrompt` but doesn’t send it to `callClaude`:
- `src/app/api/ai/agent/route.ts:108-129` builds history but calls Claude with only `systemPrompt` + `lastMessage.content`.

Impact:
- This feature likely doesn’t work end-to-end in production (or works in a “flaky” way).

Recommendation:
- Decide one contract: **streaming** or **non-streaming**.
  - If non-streaming: simplify client to `await response.json()` and render.
  - If streaming: implement streaming in the route and ensure correct content-type + flush semantics.
- Always use `fetchWithCsrf` (or manual CSRF header) for POSTs to `/api/*`.
- Fix the payload to include the newly appended user message (avoid stale state).

### P0.5 Sensitive/production-like datasets + “secrets file” tracked in git

Repo contains large/possibly sensitive data under `src/data/bealer-model/**` including CSVs that look like lead/customer datasets (names/phones appear in those CSVs).
- Examples: `src/data/bealer-model/06_lead_data/*.csv` (tracked)

iOS secrets file is tracked:
- `ios-app/SharedTodoList/Resources/Secrets.plist` is in git even though `.gitignore` lists it.
  - It currently contains placeholders, but the pattern is unsafe and will eventually lead to real secrets being committed.

Impact:
- Compliance/security risk (PII in source control).
- Massive repo bloat, slow clones, and high storage costs.

Recommendation:
- Remove `src/data/bealer-model/**` from the app repo. Put in secure storage (S3/GDrive) with access control, or a separate private data repo with strict policy.
- Remove `ios-app/SharedTodoList/Resources/Secrets.plist` from git and replace with `Secrets.example.plist`.
- If any real secrets were ever committed historically, rotate them and purge history.

### P0.6 Security monitoring endpoint can leak cross-tenant security/audit data

Evidence:
- `src/app/api/security/events/route.ts:43-64` queries `security_audit_log` and `auth_failure_log` with **service-role** and **no agency filter** (it also does not use `ctx`).
- The tables being queried appear **not** to be tenant-keyed:
  - `supabase/migrations/20260125_security_hardening.sql:143-155` (`security_audit_log` has no `agency_id`)
  - `supabase/migrations/20260125_security_hardening.sql:342-351` (`auth_failure_log` has no `agency_id`)

Impact:
- Any agency owner/manager who can hit this endpoint can potentially view security events across **all agencies** (silent compliance breach).

Recommendation:
- Decide the intended scope:
  - If this is a **global admin** dashboard: lock it behind **system auth** or `super_admin` only (not `withAgencyAdminAuth`), and document it.
  - If this is an **agency** dashboard: add `agency_id` to both log tables (and to audit triggers) and filter reads by `ctx.agencyId`.
- Avoid using service role for reads unless you have explicit scoping in the query.

### P0.7 Outlook add-in API key path enables user enumeration, identity spoofing, and unscoped writes

Evidence:
- When API-key auth is used, missing `agencyId` returns a context with `agencyId: ''` (falsy) and `userName` derived from request body `createdBy`:
  - `src/lib/outlookAuth.ts:136-147` (returns `{ agencyId: '' }` and `userName: createdBy || 'Outlook Add-in'`)
  - `src/lib/outlookAuth.ts:241-252` (reads `createdBy` from request body)
- `/api/outlook/users` enumerates **all users** and also scans all todos for `created_by/assigned_to` when `ctx.agencyId` is falsy:
  - `src/app/api/outlook/users/route.ts:64-105`
- `/api/outlook/parse-email` falls back to “all users” if there is **no agency context**, and even if an agency has **no members**:
  - `src/app/api/outlook/parse-email/route.ts:96-112`
- `/api/outlook/create-task` claims it “never trusts client createdBy” but uses `ctx.userName` for `created_by`:
  - `src/app/api/outlook/create-task/route.ts:34-45`

Impact:
- Anyone with `OUTLOOK_ADDON_API_KEY` can:
  - Enumerate user names across tenants (and potentially scrape activity via task actor names).
  - Create tasks with a **spoofed** `created_by` (audit integrity failure).
  - Create tasks with **no agency_id** if `agencyId` is omitted in a multi-tenant environment (unscoped data).

Recommendation:
- If multi-tenancy is enabled: **require** agencyId for API-key calls (reject when absent).
- Do not accept `createdBy` from the client. Use a fixed actor (e.g., `"Outlook Add-in"`) or map to a verified user identity.
- Delete the “all users” fallback paths (`getAllUsers()` and “scan all todos”) — only return users for the scoped agency.
- Add rate limiting to *all* Outlook API key endpoints (not only parse-email).

### P0.8 iOS app is not production-safe (auth + data isolation)

Evidence:
- iOS uses Supabase **anon key** directly and fetches “all todos”, then filters locally by user name:
  - `ios-app/SharedTodoList/Data/Services/SupabaseService.swift:13-47`
- iOS stores “currentSession” in `UserDefaults` (and prefers app-group defaults which are shared with widgets):
  - `ios-app/SharedTodoList/Data/Services/AuthService.swift:55-59`
  - `ios-app/SharedTodoList/Data/Services/AuthService.swift:169-173`

Impact:
- If RLS is permissive (or breaks), the iOS app can read/modify data it shouldn’t.
- If RLS is strict, the iOS app likely fails because it does not obtain a user JWT and relies on local filtering as “authorization”.
- Session material in app-group `UserDefaults` is not appropriate for secrets/tokens.

Recommendation:
- Either remove `ios-app/**` from the production repo until hardened, or implement a real auth story:
  - Use Supabase Auth (or your server session) to obtain a user JWT and enforce RLS.
  - Store tokens/session secrets in Keychain, not `UserDefaults`.
  - Treat the PIN as an auth factor validated server-side; do not store/compare long-lived “pinHash” client-side.

---

## P1 — High Priority Issues

### P1.1 CSP is not Allstate/enterprise-grade (unsafe-inline + unsafe-eval)

- `next.config.ts:13-19` includes:
  - `script-src 'unsafe-inline' 'unsafe-eval'`

Impact:
- This will fail many enterprise security checks (especially `'unsafe-eval'`).

Recommendation:
- Implement nonce-based CSP (Next supports nonces) and remove `unsafe-inline`.
- Avoid `unsafe-eval` in production by disabling Turbopack for prod builds or using a CSP-compatible chunk loading strategy.

### P1.2 Field-level encryption fails open on invalid config and on runtime errors

- `src/lib/fieldEncryption.ts:59-75` logs and returns `null` for invalid key length/format (even in production), which causes plaintext storage.
- `src/lib/fieldEncryption.ts:130-138` returns plaintext on encryption error (“avoid data loss”).

Impact:
- In production, misconfiguration or a bug can silently downgrade to plaintext PII storage.

Recommendation:
- In production: treat missing/invalid key as fatal and **fail closed** for encryption operations (throw, block writes).
- Consider a “write-path must encrypt” invariant with explicit monitoring/alerts.

### P1.3 Build is not hermetic (external fetch in Next build)

- `src/app/layout.tsx` uses `next/font/google` (Plus Jakarta Sans).
- `npm run build` fails in restricted/offline environments because it fetches CSS from Google Fonts.

Recommendation:
- Use `next/font/local` and vend the font, or pin/copy the font to the repo/assets pipeline, or configure a build-time cache/mirror.

### P1.4 Node version mismatch between dev and Docker

- `.node-version` is `20.11.0`
- `Dockerfile` uses `node:22-alpine`

Impact:
- “Works on my machine” build/runtime drift; subtle dependency incompatibilities.

Recommendation:
- Align Node versions (either bump `.node-version` to 22 or downgrade Docker to 20) and document it.

### P1.5 Test suite is broken; lint is failing with hundreds of errors

Tests:
- `npm test` currently: 7 failed test files; **66 failed tests** (examples: agent UI/hook tests, date logic tests, customers search tests).

Lint:
- `npm run lint`: **410 errors / 540 warnings**.

Impact:
- You don’t have a reliable regression signal. Shipping becomes guesswork.

Recommendation:
- Restore a green baseline ASAP:
  - Fix/align agent endpoint vs hook.
  - Fix date handling tests vs implementation.
  - Update customers search tests to reflect AI endpoint behavior (or make behavior deterministic).
  - Decide lint policy for tests (often you relax `no-explicit-any` in tests).

### P1.6 Missing rate limiting on most AI / ingestion endpoints

Evidence:
- Rate limiting exists in only a couple of places:
  - `src/app/api/auth/forgot-pin/route.ts:38` uses `withRateLimit(...)`
  - `src/app/api/outlook/parse-email/route.ts:77` uses `withRateLimit(...)`
- High-cost endpoints exist without rate limiting (transcription, vision parsing, digest generation, etc.).

Impact:
- A single user (or a leaked session) can generate large AI bills or degrade availability (DoS).

Recommendation:
- Add Redis-backed rate limiting to **all** AI endpoints (keyed by userId + IP) and to file upload endpoints.
- Consider separate budgets for: “cheap” AI (small text) vs “expensive” AI (vision/audio).

### P1.7 Sensitive user data can be leaked via logs (AI + email/document content)

Evidence:
- Multiple endpoints log raw AI output (“responseText”) when parsing fails:
  - `src/app/api/outlook/parse-email/route.ts:160` logs `responseText` (can contain email body/PII)
  - `src/app/api/ai/parse-file/route.ts:167` logs `responseText` (can contain extracted doc content)
  - `src/app/api/ai/breakdown-task/route.ts:157-161` logs full AI content
  - `src/app/api/ai/smart-parse/route.ts:212-216` logs full AI content
  - `src/app/api/ai/enhance-task/route.ts:103-107` logs full AI content

Impact:
- Your logging/Sentry pipeline becomes a PII store, which is usually non-compliant and high risk.

Recommendation:
- Never log raw prompts/responses. Log only:
  - request IDs, model, token counts, byte sizes, and a stable hash of the payload.
- Add a redaction layer (and unit tests) that strips emails/phones/addresses before emitting logs.

### P1.8 Postgres `SECURITY DEFINER` functions lack fixed `search_path`

Evidence:
- Several DB functions are `SECURITY DEFINER` without `SET search_path = public, pg_temp`, e.g.:
  - `supabase/migrations/20260126_multi_tenancy.sql:256-320` (multiple helpers like `is_agency_member`)
  - `supabase/migrations/20260203040000_phase0_prerequisites.sql:191` (`accept_agency_invitation`)
  - `supabase/migrations/20260125_security_hardening.sql:336` (`check_session_idle_timeout`)

Impact:
- Classic Postgres security risk: if an attacker can influence `search_path` or create objects in a schema on it, a SECURITY DEFINER function can execute attacker-controlled objects with elevated privileges.

Recommendation:
- Add `SET search_path = public, pg_temp` to **every** SECURITY DEFINER function and schema-qualify table references.

### P1.9 PWA caching likely stores sensitive Supabase responses on disk

Evidence:
- `next.config.ts:205-218` caches *all* `https://*.supabase.co/**` requests for up to 24h (`NetworkFirst`, `supabase-cache`).

Impact:
- Sensitive task/customer data may be persisted offline in the browser cache and survive logout.
- Multi-user/shared-device scenarios become problematic.

Recommendation:
- Do not blanket-cache Supabase REST responses.
- Restrict caching to static assets only, or implement per-user cache keys + explicit purge on logout.

### P1.10 File upload hardening gaps (size limits + signature validation)

Evidence:
- Analytics upload reads the full upload into memory with **no size cap** before `file.text()`/`file.arrayBuffer()`:
  - `src/app/api/analytics/upload/route.ts:154-208`
- Attachments upload trusts client-provided `file.type` for allowlisting (no magic-byte validation):
  - `src/app/api/attachments/route.ts:76-83`

Impact:
- DoS risk (large uploads, compressed Excel bombs).
- MIME spoofing risk (content-type mismatch) and potential downstream issues if attachments are ever rendered inline.

Recommendation:
- Enforce a hard max size on all uploads before reading into memory.
- Validate magic bytes for allowed types (you already have primitives in `src/lib/fileValidator.ts`).
- Consider antivirus scanning/quarantine for attachments in any regulated environment.

### P1.11 “Admin” endpoints are not admin-restricted and can be expensive

Evidence:
- `/api/admin/apply-retroactive-links` is only `withAgencyAuth` (not admin-only):
  - `src/app/api/admin/apply-retroactive-links/route.ts:39`
- `/api/admin/retroactive-matches` is only `withAgencyAuth` and does an O(customers × tasks) match loop:
  - `src/app/api/admin/retroactive-matches/route.ts:32`
  - `src/app/api/admin/retroactive-matches/route.ts:85-116`

Impact:
- Any staff user can trigger heavy compute and/or mutate customer linking state.

Recommendation:
- Require `withAgencyAdminAuth` (or owner-only) for all `/api/admin/*`.
- Move retroactive matching to a background job with pagination and caching.

---

## P2 — Medium Priority Issues / Architectural Debt

### P2.1 Too many concurrent auth systems (PIN + Clerk + NextAuth)

Evidence:
- PIN session cookies + localStorage session (`src/lib/auth.ts`, `src/components/LoginScreen.tsx`)
- Clerk middleware and providers (`src/middleware.ts`, `src/components/auth/ClerkProviderWrapper.tsx`)
- NextAuth route present (`src/app/api/auth/[...nextauth]/route.ts`)

Impact:
- Increases attack surface and makes it hard to reason about “who is logged in” and “what identity is authoritative”.

Recommendation:
- Declare a single primary auth system and aggressively delete or isolate the others behind clear, testable flags.

### P2.2 Server/client boundary violations in shared modules

Example:
- `src/lib/auth/dualAuth.ts` exports a “hook” for client use, but the same file imports `@clerk/nextjs/server` (server-only). This is an easy accidental import-from-client footgun.

Recommendation:
- Split modules into `*.server.ts` and `*.client.ts` (or use Next’s `server-only` guard).

### P2.3 Date/time semantics appear inconsistent (failing tests)

Evidence:
- Multiple unit tests around “due today”/“overdue” failing.
- Current logic in `src/store/todoStore.ts` parses date strings by truncating to `YYYY-MM-DD`, which can disagree with ISO timestamps depending on timezone.

Recommendation:
- Decide and document canonical due-date format:
  - date-only (`YYYY-MM-DD`) interpreted in user’s locale, or
  - full ISO timestamp stored in UTC with explicit timezone handling.
- Make tests reflect that contract.

### P2.4 Duplicate logging systems

Evidence:
- `src/lib/logger.ts` exports `logger` (Sentry-integrated).
- `src/lib/secureLogger.ts` exports another `logger` with different behavior.

Recommendation:
- Consolidate to one logger and one redaction policy.

### P2.5 Customer identity is treated as “name”, leading to collisions and data mixing

Evidence:
- Customer list endpoint keys a map by `customer_name`:
  - `src/app/api/customers/route.ts:152` and `src/app/api/customers/route.ts:196`

Impact:
- Two distinct customers with the same name can be merged into one response object, mixing PII/opportunity data (privacy + correctness bug).

Recommendation:
- Key by immutable IDs (customer UUID), not display names.
- If “insights” and “opportunities” do not share IDs, introduce a deterministic join key or a real normalized customer table.

### P2.6 Customer detail endpoint returns encrypted PII and bypasses task-visibility permissions

Evidence:
- Returns `customer_email/customer_phone` directly from `customer_insights` (likely encrypted ciphertext if encryption is enabled):
  - `src/app/api/customers/[id]/route.ts:81-82`
- Fetches tasks mentioning customer name with a broad `.ilike()` (no role/permission filter like `can_view_all_tasks`):
  - `src/app/api/customers/[id]/route.ts:173-183`

Impact:
- UI may show ciphertext instead of PII (or leak implementation details).
- Staff-level visibility rules are inconsistently enforced across endpoints.

Recommendation:
- Standardize PII handling: decrypt server-side for authorized users, and return `null` (not ciphertext) on failure.
- Centralize task visibility filtering so every endpoint applies the same rule set.

---

## P3 — Lower Priority / Paper Cuts

- Excess `any` and suppressions in configs/tests/routes; consider “typed boundaries” patterns.
- `console.log` in production code paths (e.g., some auth fallback logs) → replace with structured logger.
- Large single-file components (`MainApp`, `LoginScreen`, `ChatPanel`) are hard to maintain; consider splitting by view/state machine.

---

## Suggested Remediation Roadmap (pragmatic)

1) **Security**: remove fail-open auth fallbacks; add migration gating.
2) **Auth clarity**: pick the primary auth system and remove the others from the runtime path.
3) **DB/RLS**: eliminate session-wide `set_config` dependence; move to standard JWT/RLS or RPC-enforced access.
4) **AI agent**: make route+hook agree (streaming vs JSON) and add CSRF.
5) **Reminders**: move auto-reminder creation to server/DB triggers; remove service-role code from client call graph.
6) **Repo hygiene**: remove large data files + ensure secrets are never tracked.
7) **Quality gates**: restore green tests + reduce lint noise; add CI gating on `npm test` and `npm run lint`.

---

## Notes on Changes Made During Review

To make `npm run lint` usable, I updated ESLint ignores so it stops linting generated worktree builds:
- `eslint.config.mjs` now ignores `**/.next/**` and `.worktrees/**` (plus local tooling outputs).
