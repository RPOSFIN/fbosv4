# FBOS V4 — Full Audit Report (Phase 1)

**Governance audit date:** 2026-06-20  
**Commit audited:** `a364445` (*Pre Sprint3 Integrations rewrite*)  
**Mode:** Read-only — no code, migrations, or deletions performed.

---

## Executive Scores

| Metric | Score | Notes |
|---|---:|---|
| **Audit completion** | **92%** | All requested audit areas covered; WhatsApp has no implementation to audit |
| **Risk score** | **78 / 100** | Higher = more risk. Critical auth and build blockers |
| **Production readiness** | **24 / 100** | Build fails; auth disabled; integrations partially stubbed |
| **Overall health** | **41 / 100** | Strong DB foundation; weak app security and release gate |

---

## A. Repository Audit

### File structure (high level)

```
app/          — 53 pages, 27 API routes, 1 root layout
components/   — UI, guards, tables, integration panels
hooks/        — use-auth.tsx
lib/          — auth, RBAC, integrations, Supabase clients
middleware.ts — ROOT middleware (active)
lib/middleware.ts — Full auth middleware (NOT active — dead code)
scripts/      — Setup, verify, Google Apps Script CDP tooling (~5.6 MB)
supabase/     — migrations 001–006 + manual RUN_*.sql scripts
```

### Missing / expected files

| Item | Status |
|---|---|
| `.env.example` | ❌ Missing — no documented env contract |
| `005_leads_clickup_dedupe.sql` | ❌ Empty file (0 bytes) |
| `app/api/integrations/health/route.ts` | ❌ Referenced by UI but does not exist |
| Full `integrations/route.ts` implementation | ❌ Placeholder only (8 lines) |
| `clickup/sync`, `config`, `leads/dedupe` routes | ⚠️ Placeholder stubs |
| WhatsApp integration code | ❌ Not implemented (UI text only) |
| Storage buckets | ❌ None configured in Supabase |
| Supabase migration history | ❌ Empty in remote (`list_migrations` = 0) |

### Duplicate / conflicting files

| Issue | Severity |
|---|---|
| `hooks/use-auth.tsx` AND `lib/use-auth.tsx` | Medium — two auth hook implementations |
| `middleware.ts` (no-op) vs `lib/middleware.ts` (full auth) | **Critical** — real auth middleware never runs |
| `package.json` name `fbos-v1` vs repo `fbosv4` | Low — naming drift |
| Large audit artifacts committed (`ARENA_AUDIT_PACK*.txt`, `fbos_tree.txt` 5.2 MB, build logs) | Medium — repo bloat, possible recon data |

### Dead / disconnected code

- `lib/middleware.ts` — complete Supabase session middleware, unused by Next.js
- `lib/integrations/mask-config.ts` — `getMaskedIntegrationConfig()` defined but not referenced by any route
- `app/api/integrations/route.ts` — empty stub while `app/integrations/page.tsx` expects sync data
- Many dashboard pages (AI, CEO, automation, etc.) appear scaffold-only with no backing API

---

## B. Build Audit

| Check | Result |
|---|---|
| `node_modules` (initial) | Absent — required `npm install` |
| `npm install` | ✅ Succeeded (705 packages) |
| Dependency conflicts | None blocking install |
| `npm audit` | 2 moderate vulnerabilities |
| `npm run lint` | ❌ **86 problems** (73 errors, 13 warnings) — mostly `scripts/google-apps-script/` |
| `npx tsc --noEmit` | ❌ **11 TypeScript errors** |
| `npm run build` | ❌ **Fails** at type-check stage |

### TypeScript errors (blocking build)

| File | Issue |
|---|---|
| `lib/auth/config.ts` | `MOCK_USER.name` does not exist on type |
| `lib/use-auth.tsx` | `MOCK_USER.role`, `MOCK_USER.name` missing |
| `lib/integrations/gsheet-hub.ts` | `getSheetTabGids()` missing `operations`, `finance` keys |
| `lib/integrations/gsheet.ts` | `getGoogleWebappUrl()` called with argument but accepts none |

### Lint hotspots

- 70+ errors in `scripts/google-apps-script/` (`no-require-imports`)
- Application `app/` and `lib/` lint relatively clean

---

## C. Runtime Audit

### Pages (53 routes)

Core operational pages exist: `dashboard`, `leads`, `lead-master`, `clients`, `followups`, `quotations`, `integrations`, `clickup-tasks`, `finance*`, `imports`, `login`, `profile`, `admin`, plus many scaffold hubs (`ai-ceo`, `automation-center`, `data-vault`, etc.).

### Layouts

- Single root layout: `app/layout.tsx`
- No nested route-group layouts detected

### Middleware / proxy

| File | Active? | Behavior |
|---|---|---|
| `middleware.ts` (root) | **Yes** | No-op: `return NextResponse.next()` — **no auth enforcement** |
| `lib/middleware.ts` | No | Full Supabase `getUser()` gate + login redirect — **not wired** |

Next.js 16 warns: *"middleware file convention is deprecated. Please use proxy instead."*

### API endpoints (27)

**Protected with `authorize()` (20 routes):** leads, clients, followups, quotations, jobs, finance/queue, dashboard/kpi, health/database, imports, knowledge, integrations/sync-all, gsheet/sync, tally/sync, etc.

**Without RBAC `authorize()` (4 integration stubs):**

- `GET/POST /api/integrations`
- `GET/POST /api/integrations/config`
- `GET/POST /api/integrations/clickup/sync`
- `GET/POST /api/leads/dedupe`

**Other auth models:**

- `/api/webhooks/sheet-sync` — Bearer/body secret (`SHEET_SYNC_SECRET`)
- `/api/auth/*` — session/callback/logout

**UI references missing endpoint:**

- `GET /api/integrations/health` — called from `app/integrations/page.tsx`, file does not exist

---

## D. Supabase Audit

### Tables (public, 22)

`profiles`, `leads`, `clients`, `followups`, `quotations`, `jobs`, `products`, `orders`, `tasks`, `call_coach_notes`, `sops`, `checklists`, `route_maps`, `affirmations`, `activity_logs`, `audit_logs`, `integrations`, `clickup_tasks`, `finance_import_queue`, `lead_history`, `sheet_sync_log`, `finance_transactions`

**Data:** Only `integrations` has rows (3 connectors). All other tables empty.

### RLS

- **RLS enabled:** All 22 tables ✅
- **Policy count:** 41 policies
- **Gap:** `finance_transactions` — RLS on, **no policies** (blocks all access via API)

### Notable policy concerns (Supabase security advisor)

| Issue | Level |
|---|---|
| `finance_transactions` — RLS enabled, no policy | INFO |
| `audit_logs_insert`, `lead_history_insert` — `WITH CHECK (true)` | WARN |
| 10× `SECURITY DEFINER` functions callable by `anon` | WARN |
| `handle_updated_at` — mutable `search_path` | WARN |

### Functions (11)

`fbos_audit_trigger`, `fbos_can_edit_knowledge`, `fbos_can_read_sales`, `fbos_can_write_accounts`, `fbos_can_write_call_coach`, `fbos_can_write_operations`, `fbos_can_write_sales`, `fbos_is_admin`, `fbos_user_role`, `handle_new_user`, `handle_updated_at`

### Triggers

Audit triggers (`fbos_audit_*`) on 12 core tables; `fbos_updated_*` before-update triggers on same set. Integration tables (`clickup_tasks`, `finance_import_queue`, etc.) have no audit triggers.

### Storage

No storage buckets configured.

### Auth

Supabase Auth is available; app-side auth is hard-disabled (see Security). `profiles` links to `auth.users`.

### Migration drift

- Repo has SQL files `001`–`006` + manual `RUN_*.sql`
- Remote `supabase_migrations` history: **empty**
- `005_leads_clickup_dedupe.sql`: **empty file**

---

## E. Integration Audit

| Integration | Code | API route | DB row | Status |
|---|---|---|---|---|
| **Google Sheets** | `lib/integrations/gsheet.ts`, `gsheet-hub.ts` | `gsheet/sync` ✅ (RBAC) | `gsheet` = connected | Partial — TS errors in hub; hardcoded webapp URL |
| **ClickUp** | `lib/integrations/clickup.ts` (full logic) | `clickup/sync` ⚠️ placeholder | `clickup` = pending | Logic exists; route stubbed; 0 tasks synced |
| **Tally** | `lib/integrations/tally.ts` | `tally/sync` ✅ (RBAC) | `tally` = pending | Scripts in `scripts/tally-cloud/`; cloud bridge not verified |
| **WhatsApp** | None | None | None | **Not implemented** — UI label only (`automation-center`) |

### Google Sheets specifics

- Hardcoded Apps Script URL in `lib/google-config.ts` (`AKfycby…/exec`)
- Webhook: `/api/webhooks/sheet-sync` with secret auth
- ~350 CDP/upload artifacts in `scripts/google-apps-script/` (operational tooling, not runtime)

### ClickUp specifics

- Expects `CLICKUP_API_TOKEN` env var
- Full sync library present; API route returns placeholder JSON
- `clickup_tasks` table ready; 0 rows

### Tally specifics

- Expects `TALLY_HOST`, `TALLY_COMPANY_NAME`, etc.
- PowerShell bridge in `scripts/tally-cloud/`
- `finance_import_queue` + `finance_transactions` tables exist

---

## F. Security Audit

### Critical issues

| # | Issue | Location |
|---|---|---|
| C1 | **Auth permanently disabled** — `isAuthDisabled()` always returns `true` | `lib/auth/disabled.ts` |
| C2 | **Mock super_admin session** exposed via `/api/auth/session` when auth disabled | `lib/auth/config.ts`, `api-auth.ts` |
| C3 | **Root middleware is no-op** — real auth middleware in `lib/middleware.ts` unused | `middleware.ts` |
| C4 | **Production build fails** — cannot ship | TypeScript errors |
| C5 | **Unauthenticated integration stub routes** — no `authorize()` | 4 API routes |

### Medium issues

| # | Issue |
|---|---|
| M1 | Hardcoded Google Apps Script deployment URL in source |
| M2 | No `.env.example` — recovery depends on undocumented secrets |
| M3 | Large audit/diagnostic files in repo (local paths, structure maps) |
| M4 | `finance_transactions` table inaccessible (RLS, no policy) |
| M5 | Supabase `SECURITY DEFINER` functions executable by `anon` |
| M6 | Permissive RLS insert policies on `audit_logs`, `lead_history` |
| M7 | Duplicate auth hooks (`hooks/` vs `lib/`) |
| M8 | HEAD detached — not on `main` branch |
| M9 | 2 moderate npm dependency vulnerabilities |

### Low issues

| # | Issue |
|---|---|
| L1 | Package name `fbos-v1` vs repo `fbosv4` |
| L2 | README minimal (2 lines) |
| L3 | Next.js middleware deprecation warning (proxy migration) |
| L4 | Empty migration file `005_leads_clickup_dedupe.sql` |
| L5 | No Supabase storage buckets |
| L6 | WhatsApp advertised but not built |

### Exposed secrets scan

- No live API keys or JWTs found in tracked source (scan of app/lib)
- Hardcoded **Google Web App deployment ID** (not a secret, but attack surface / environment coupling)
- `.env*` correctly gitignored; **no env files in workspace** to validate

### Auth bypass summary

```
Request → middleware.ts (pass-through)
       → API authorize() → isAuthDisabled() === true → MOCK super_admin context
       → Full RBAC bypass for all protected routes
```

---

## Issue Summary Counts

| Severity | Count |
|---|---:|
| Critical | 5 |
| Medium | 9 |
| Low | 6 |

---

## Phase 1 Verdict

The database layer is comparatively mature (22 tables, RLS, RBAC functions, audit triggers). The application layer is **not production-ready**: authentication is fully bypassed, middleware does not enforce sessions, the build fails, and several integration endpoints are stubs disconnected from existing library code.

**Status:** ✅ Phase 1 complete — no changes made. Awaiting approval before remediation.
