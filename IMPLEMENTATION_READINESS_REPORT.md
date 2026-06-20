# FBOS V4 — Implementation Readiness Final Check

**Date:** 2026-06-20  
**Repo:** `RPOSFIN/fbosv4` (branch `cursor/governance-audit-reports-0d65`)  
**Commit audited:** `main` @ `a364445` (*Pre Sprint3 Integrations rewrite*)  
**Mode:** Read-only verification — no code changes, no auth flag changes, no migrations, no deploy.

**Credential assumption:** Owner `.env.local` is the source of truth and contains Supabase, ClickUp, Google Sheets, Apps Script URL, `SHEET_SYNC_SECRET`, and Tally demo configuration. Credential collection is **not** reopened unless a value is actually missing.

---

## Verification Summary (8 Domains)

| # | Domain | Verdict | Score |
|---|---|---|---|
| 1 | Backup readiness | **Not Ready** | 0 / 5 verified |
| 2 | Rollback readiness | **Not Ready** | Partial |
| 3 | Build readiness | **Not Ready** | Fails (11 TS errors) |
| 4 | Runtime readiness | **Partial** | Dev starts; prod build fails |
| 5 | Integration readiness | **Partial** | Libraries exist; routes stubbed |
| 6 | Google Sheets wiring | **Partial** | Webhook + sync-all wired; GIDs empty |
| 7 | ClickUp wiring | **Not Ready** | Library complete; API route stub |
| 8 | Supabase wiring | **Ready (local dev)** | Cloud healthy; launch security gaps |

---

## A. Ready

Items verified sufficient to proceed once implementation is approved.

| Item | Evidence |
|---|---|
| **Git remote & source tree** | Private repo `https://github.com/RPOSFIN/fbosv4`; `main` synced; governance docs on feature branch |
| **Node / npm toolchain** | `package.json` scripts: `dev`, `build`, `lint`, `db:verify`, `validate`; Next.js 16.2.9, React 19, Node 22 compatible |
| **Local credentials (owner attested)** | Supabase URL/keys, ClickUp token + IDs, Google Sheet ID(s), GAS WebApp URL, `SHEET_SYNC_SECRET`, Tally demo vars — all confirmed in owner `.env.local` |
| **Supabase cloud project** | Project `fbosv4` (`tksfskkivoahggneptqk`, `ap-southeast-2`) — **ACTIVE_HEALTHY** |
| **Supabase schema (remote)** | 22 public tables, RLS enabled on all; `integrations` table has 3 rows (`gsheet` connected, `clickup`/`tally` pending) |
| **Supabase client libraries** | `lib/supabase/server.ts`, `browser.ts`, `admin.ts` — SSR + service-role admin pattern implemented |
| **Integration libraries (logic layer)** | `lib/integrations/clickup.ts` (full `syncClickUp()`), `gsheet.ts`, `gsheet-hub.ts`, `tally.ts`, `status.ts`, `config.ts` |
| **Google Sheets webhook** | `POST /api/webhooks/sheet-sync` — secret auth via `SHEET_SYNC_SECRET`; calls `syncGSheetHub()`; logs to `sheet_sync_log` |
| **GSheet sync route** | `POST /api/integrations/gsheet/sync` — wired with `authorize()` + `upsertIntegrationRow()` |
| **Tally sync route** | `POST /api/integrations/tally/sync` — wired with `authorize()` |
| **Sync-all hub route** | `POST /api/integrations/sync-all` — orchestrates Tally → ClickUp → GSheet in hub order |
| **Apps Script source in repo** | `scripts/google-apps-script/Code.gs` — v7.3 with CONFIG tab lookup, trigger setup, webhook POST |
| **Auth bypass for local dev** | `isAuthDisabled()` → `true`; mock super_admin context — allows UI/API testing without login *(intentional for dev; not prod-ready)* |
| **Dev server starts** | `npm run dev` → Ready on `:3000` (Turbopack compiles; no runtime crash on startup) |
| **Governance documentation** | `BACKUP_PLAN.md`, `INSTALLER_RECOVERY_PLAN.md`, `UPDATED_REAL_BLOCKER_MATRIX.md`, and related audit artifacts exist |

---

## B. Not Ready

Items that fail verification today and must be addressed before a production launch (some may be deferred to later sprints).

| ID | Item | Why not ready | Blocks |
|---|---|---|---|
| NR-01 | **Production build** | `npx tsc --noEmit` and `npm run build` fail with 11 TypeScript errors | `npm run validate`, Vercel deploy, CI |
| NR-02 | **ClickUp API route** | `app/api/integrations/clickup/sync/route.ts` returns placeholder JSON; does not call `syncClickUp()` | Per-connector sync from UI; ClickUp data on integrations page |
| NR-03 | **Integrations hub route** | `app/api/integrations/route.ts` is 8-line stub; does not call `getIntegrationStatuses()` | Integration dashboard data |
| NR-04 | **Integrations config route** | `app/api/integrations/config/route.ts` is placeholder | Config read/write from UI |
| NR-05 | **Health endpoint** | `/api/integrations/health` — **file does not exist**; UI fetches it on load | Integrations page connector status |
| NR-06 | **Leads dedupe route** | `app/api/leads/dedupe/route.ts` is unprotected placeholder | Dedupe workflow |
| NR-07 | **Tab GID mapping in code** | `getSheetTabGids()` returns empty strings; missing `operations`/`finance` keys (TS mismatch with `gsheet-hub.ts`) | Multi-tab hub sync (operations, finance, clients, followups) |
| NR-08 | **Google config env drift** | `getGoogleWebappUrl()` ignores env (hardcoded URL); `getGoogleSheetId()` reads only `NEXT_PUBLIC_GOOGLE_SHEET_ID` (not `GOOGLE_SHEET_ID` alias used elsewhere) | Env-as-truth consistency; prod URL rotation |
| NR-09 | **Auth enforcement** | `middleware.ts` is no-op; full auth middleware in `lib/middleware.ts` unused | Production security |
| NR-10 | **`.env.example`** | Not committed to repo | Onboarding, Vercel env template, team handoff |
| NR-11 | **`finance_transactions` RLS** | RLS enabled, zero policies (Supabase linter INFO) | Finance API access for authenticated users |
| NR-12 | **Supabase security posture** | 10× SECURITY DEFINER functions callable by `anon`; permissive INSERT on `audit_logs`, `lead_history` | Production launch security review |
| NR-13 | **Remote migration history** | Supabase `list_migrations` returns empty; `005_leads_clickup_dedupe.sql` is empty file | Schema drift tracking, reproducible deploys |
| NR-14 | **GAS script properties** | Not verified against owner `.env.local` | Scheduled sheet → webhook sync end-to-end |
| NR-15 | **Production hosting** | No Vercel project, prod env import, auth redirect URLs, or `FBOS_WEBHOOK_URL` | Deploy and external webhook callbacks |
| NR-16 | **SMTP / auth email** | Not configured for prod user onboarding | Real login flows in production |

---

## C. Blocked

Hard gates that prevent implementation from starting **today** without owner action.

| ID | Blocker | Why it blocks | Agent can fix? | Owner must act? |
|---|---|---|---|---|
| **BLK-01** | **Explicit implementation approval not granted** | Governance constraint: no code edits until owner approves Class B technical work | No | **Yes** — reply "Approved to implement" |
| **BLK-02** | **Encrypted vault backup of `.env.local` not verified** | If secrets are lost during implementation, recovery is impossible; no off-site backup confirmed | No (owner machine only) | **Yes** — copy full `.env.local` to encrypted vault today |
| **BLK-03** | **Auth/middleware changes forbidden in this phase** | User instruction: do not change auth flags. T-02/T-03 cannot proceed without separate sub-phase approval | Yes, but **blocked by instruction** | **Yes** — approve auth sub-phase when ready |
| **BLK-04** | **Supabase migrations forbidden in this phase** | User instruction: do not run migrations. T-11/T-12 and empty `005` cannot be applied | Yes, but **blocked by instruction** | **Yes** — separate migration approval before launch |
| **BLK-05** | **Deploy forbidden in this phase** | User instruction: do not deploy. C-class launch items cannot proceed | No | **Yes** — deploy approval when launch-ready |

---

## D. Auto-fixable

Items the agent can resolve after BLK-01 and BLK-02 are cleared — no owner secrets required beyond what is already in `.env.local`.

| ID | Item | Fix (agent) | Depends on |
|---|---|---|---|
| **AF-01** | TypeScript build errors (11) | Add `name`/`role` to `MOCK_USER`; extend `getSheetTabGids()` with `operations`/`finance` + env reads; fix `getGSheetFixSteps()` call signature | Approval |
| **AF-02** | Wire ClickUp route | Replace stub with `syncClickUp()` + `authorize()` + `upsertIntegrationRow()` (mirror gsheet/tally routes) | AF-01 |
| **AF-03** | Wire integrations route | `GET` → `getIntegrationStatuses()`; optional summary | AF-01 |
| **AF-04** | Wire config route | Delegate to `getConnectorEnvConfig()` / masked config | AF-01 |
| **AF-05** | Create `/api/integrations/health` | Return connector env + DB status via `getIntegrationStatuses()` | AF-01 |
| **AF-06** | Wire leads dedupe route | Connect to dedupe logic + add `authorize()` | AF-01 |
| **AF-07** | Google config env alignment | `getGoogleWebappUrl()` reads `GOOGLE_WEBAPP_URL`; sheet ID reads `GOOGLE_SHEET_ID` fallback; tab GIDs from env vars | AF-01; owner GID values if not in env |
| **AF-08** | Commit `.env.example` | Template from known var names (no secret values) | Approval |
| **AF-09** | Git checkpoint tag | `git tag -a checkpoint-YYYYMMDD` on `main`; push tag | Approval |
| **AF-10** | Schema export to repo | `pg_dump --schema-only` → `supabase/exports/` (if `DATABASE_URL` in env) | Approval + DATABASE_URL |
| **AF-11** | Auth restore (deferred) | Flip `isAuthDisabled()` to env-gated; wire `middleware.ts` to `lib/middleware.ts` | **Separate sub-phase approval (BLK-03)** |
| **AF-12** | Finance RLS + security migrations (deferred) | SQL migrations for policies and DEFINER grants | **Separate migration approval (BLK-04)** |

---

## E. Requires Owner Action

Items that cannot be completed by the agent alone.

| ID | Action | When | Blocks if skipped |
|---|---|---|---|
| **OA-01** | Create encrypted vault backup of full `.env.local` | **Before implementation** | Disaster recovery of secrets |
| **OA-02** | Grant explicit **"Approved to implement"** for Class B work | **Before implementation** | Agent cannot edit code |
| **OA-03** | Verify GAS Script Properties match `.env.local` (`SPREADSHEET_ID`, `SHEET_SYNC_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `FBOS_WEBHOOK_URL`) | Sprint 1–2 | Scheduled GAS → webhook sync |
| **OA-04** | Provide tab GID values (if not already in env under e.g. `GOOGLE_SHEET_GID_*`) | Sprint 1 | Operations/finance/clients/followups tab sync |
| **OA-05** | Run `resumeFbosSetup` / verify GAS triggers in script.google.com | Sprint 2 | Automated sheet sync |
| **OA-06** | Approve auth/middleware sub-phase | Sprint 2 (or later) | Production login enforcement |
| **OA-07** | Create Vercel project; import prod env vars; connect GitHub | Sprint 3 | Deploy |
| **OA-08** | Set Supabase Auth redirect URLs for prod URL | Sprint 3 | Prod login |
| **OA-09** | Configure SMTP / email provider in Supabase | Sprint 3 | User onboarding email |
| **OA-10** | Add secondary GitHub + Supabase org admin | Sprint 3 | Bus-factor / ops |
| **OA-11** | Verify Tally bridge + XML gateway on Windows (if live Tally in scope) | Sprint 2 | Live Tally sync (demo path works without this) |
| **OA-12** | Approve Supabase security migrations | Sprint 3 | Production security sign-off |
| **OA-13** | Approve production deploy | Sprint 3 | Go-live |

---

## Domain Detail

### 1. Backup Readiness — **Not Ready (0 / 5)**

| Check | Result |
|---|---|
| ZIP backup (off-site) | **No** — dry-run only (`/tmp/fbos-backup-test.zip`) |
| Git checkpoint tag | **No** — `git tag -l` empty |
| Supabase schema export | **No** — no `supabase/exports/` |
| Environment backup | **Unverified** — `.env.local` gitignored; owner attests present locally; vault copy not confirmed |
| Off-site encrypted store | **No** |

**Rollback implication:** Source code recoverable from GitHub; secrets and schema point-in-time recovery not verified.

### 2. Rollback Readiness — **Not Ready (Partial)**

| Capability | Status |
|---|---|
| Revert code via Git | ✅ Remote `main` exists |
| Known-good tag/checkout | ❌ No tags |
| DB point-in-time restore | ❌ Not confirmed (Supabase PITR tier unknown) |
| Env restore procedure | ⚠️ Documented in `INSTALLER_RECOVERY_PLAN.md`; not drilled |
| Recovery drill | ❌ Not run |

### 3. Build Readiness — **Not Ready**

```
npx tsc --noEmit  → 11 errors
npm run build     → FAIL at TypeScript check
```

| File | Error |
|---|---|
| `lib/auth/config.ts` | `MOCK_USER.name` missing on type |
| `lib/use-auth.tsx` | `MOCK_USER.role`, `MOCK_USER.name` missing |
| `lib/integrations/gsheet-hub.ts` | `tabs.operations`, `tabs.finance` not on return type |
| `lib/integrations/gsheet.ts` | `getGSheetFixSteps(lastStatus)` — expected 0 args |

### 4. Runtime Readiness — **Partial**

| Check | Result |
|---|---|
| `npm run dev` | ✅ Starts (~272ms) |
| `npm run build` | ❌ Fails |
| `npm run db:verify` | ⚠️ Requires owner `.env.local` (not in cloud workspace) |
| Middleware | No-op — all routes pass |
| API RBAC | Bypassed — mock super_admin when auth disabled |

**Local dev:** Runnable with auth bypass. **Production:** Not runnable until build + auth fixed.

### 5. Integration Readiness — **Partial**

| Route | Status | `authorize()` |
|---|---|---|
| `POST /api/integrations/sync-all` | ✅ Wired | Yes |
| `POST /api/integrations/gsheet/sync` | ✅ Wired | Yes |
| `POST /api/integrations/tally/sync` | ✅ Wired | Yes |
| `POST /api/integrations/clickup/sync` | ❌ Stub | No |
| `GET/POST /api/integrations` | ❌ Stub | No |
| `GET/POST /api/integrations/config` | ❌ Stub | No |
| `GET /api/integrations/health` | ❌ Missing | — |
| `POST /api/webhooks/sheet-sync` | ✅ Wired | Secret header |
| `GET/POST /api/leads/dedupe` | ❌ Stub | No |

### 6. Google Sheets Wiring — **Partial**

| Layer | Status |
|---|---|
| Env vars (owner) | ✅ Attested present |
| `lib/integrations/gsheet.ts` | ✅ Webapp + CSV sync logic |
| `lib/integrations/gsheet-hub.ts` | ⚠️ Logic complete; TS errors; GIDs empty |
| `lib/google-config.ts` | ⚠️ Hardcoded WebApp URL; empty tab GIDs; sheet ID env name mismatch |
| Webhook route | ✅ Secret auth + hub sync |
| GAS script in repo | ✅ `Code.gs` v7.3 |
| GAS properties synced | ❌ Unverified (owner) |
| `FBOS_WEBHOOK_URL` in GAS | ❌ Needs hosting URL (Sprint 3) |

### 7. ClickUp Wiring — **Not Ready**

| Layer | Status |
|---|---|
| Env vars (owner) | ✅ Attested present |
| `lib/integrations/clickup.ts` | ✅ Full sync: API fetch → `clickup_tasks` / leads import |
| `lib/integrations/config.ts` | ✅ Reads `CLICKUP_API_TOKEN`, team/space/folder/list IDs |
| API route | ❌ Placeholder only |
| Supabase table | ✅ `clickup_tasks` exists (0 rows) |
| DB integration row | `pending` |

### 8. Supabase Wiring — **Ready (local dev); launch gaps remain**

| Layer | Status |
|---|---|
| Project health | ✅ ACTIVE_HEALTHY |
| Tables | 22 public, RLS on all |
| Client SSR/browser/admin | ✅ Implemented |
| Service role usage | ✅ `getAdminClient()` in integration sync paths |
| Remote migrations tracked | ❌ Empty history |
| Security advisors | ⚠️ 1 INFO (finance RLS), 2 permissive RLS, 20+ DEFINER warnings |
| `npm run db:verify` | ⚠️ 16 required tables listed; owner must run locally |

---

## Remaining Blockers — Detail

### Pre-implementation gates

| Blocker | Why it blocks | Agent fix? | Owner action? |
|---|---|---|---|
| No vault backup | Secret loss = unrecoverable integrations | No | **Yes — backup now** |
| No implementation approval | Governance: no code until approved | No | **Yes — explicit yes** |

### Technical (post-approval)

| Blocker | Why it blocks | Agent fix? | Owner action? |
|---|---|---|---|
| Build failure | Cannot ship artifact or pass `validate` | **Yes** | No |
| ClickUp route stub | UI/integration sync cannot reach ClickUp despite env + library | **Yes** | No |
| Integrations/health stubs | Dashboard shows empty/error state | **Yes** | No |
| Empty tab GIDs | Hub sync skips operations/finance/clients/followups tabs | **Yes** (code); GID **values** may need owner | Maybe (OA-04) |
| Google config hardcoding | Env rotation and multi-env deploy break | **Yes** | No |
| Auth/middleware disabled | All API calls get mock super_admin | Yes, but **blocked by instruction** | Approve sub-phase |
| Finance RLS / security | Prod data exposure risk | Yes, but **blocked by instruction** | Approve migrations |

### Launch (Sprint 3)

| Blocker | Why it blocks | Agent fix? | Owner action? |
|---|---|---|---|
| No Vercel / prod env | Cannot deploy | Partial (docs) | **Yes** |
| No SMTP / redirects | Real users cannot log in | No | **Yes** |
| GAS webhook URL | GAS cannot POST to app | No (needs URL) | **Yes** (after deploy) |
| Tally live bridge | Live sync fails (demo OK) | No | **Yes** (if in scope) |

---

## Answers

### 1. Can implementation begin today?

**No — not yet.**

Two pre-conditions remain:

1. **Encrypted vault backup** of `.env.local` (OA-01)
2. **Explicit owner approval** to implement Class B technical work (OA-02)

After both are satisfied, the agent can begin Sprint 1 immediately. Auth flag changes, migrations, and deploy remain **out of scope** until separately approved.

---

### 2. What exact work should be done in Sprint 1?

**Goal:** Green build + wired integration API surface + env template. **No auth changes. No migrations. No deploy.**

| # | Task | Deliverable |
|---|---|---|
| 1.1 | Fix all 11 TypeScript errors | `npx tsc --noEmit` and `npm run build` pass |
| 1.2 | Wire `POST/GET /api/integrations/clickup/sync` | Calls `syncClickUp()`, upserts integration row, activity log |
| 1.3 | Wire `GET /api/integrations` | Returns `getIntegrationStatuses()` |
| 1.4 | Wire `GET/POST /api/integrations/config` | Masked connector config via existing helpers |
| 1.5 | Create `GET /api/integrations/health` | Connector status map for integrations UI |
| 1.6 | Wire `GET/POST /api/leads/dedupe` | Real dedupe + `authorize()` |
| 1.7 | Fix `lib/google-config.ts` | Env-driven WebApp URL, sheet ID aliases, tab GIDs from env |
| 1.8 | Add `.env.example` | All required var names, no secrets |
| 1.9 | Git checkpoint tag on `main` | e.g. `checkpoint-pre-sprint1-YYYYMMDD` |
| 1.10 | Optional: schema export | `supabase/exports/schema-YYYYMMDD.sql` if DATABASE_URL available |

**Sprint 1 exit criteria:** `npm run build` passes; integrations page loads health + ClickUp sync; owner can run `npm run db:verify` locally with existing `.env.local`.

---

### 3. What exact work should be done in Sprint 2?

**Goal:** End-to-end integration testing + auth sub-phase (if approved). **Still no prod deploy unless approved.**

| # | Task | Owner / Agent |
|---|---|---|
| 2.1 | Owner: verify GAS Script Properties match `.env.local` | Owner |
| 2.2 | Owner: provide/confirm tab GID env vars | Owner |
| 2.3 | Owner: run `resumeFbosSetup` + verify triggers | Owner |
| 2.4 | Agent: integration smoke tests — ClickUp sync, GSheet hub, webhook curl, Tally demo | Agent |
| 2.5 | Agent: run `npm run validate` on owner machine / CI | Agent + Owner |
| 2.6 | Agent: fix any sync/runtime bugs found in testing | Agent |
| 2.7 | **If auth sub-phase approved:** env-gate `isAuthDisabled()`; wire `middleware.ts` → `lib/middleware.ts` | Agent |
| 2.8 | **If auth sub-phase approved:** test login flow locally with Supabase Auth | Agent + Owner |
| 2.9 | Owner: verify Tally bridge on Windows (if live Tally required) | Owner |
| 2.10 | Document integration test results | Agent |

**Sprint 2 exit criteria:** Sync-all succeeds against live ClickUp + Sheet (owner env); GAS webhook tested against local/staging URL; auth behavior matches approved mode.

---

### 4. What exact work should be done in Sprint 3?

**Goal:** Production launch prep. **Requires deploy + migration approvals.**

| # | Task | Owner / Agent |
|---|---|---|
| 3.1 | Owner: create Vercel project, connect GitHub, import prod env | Owner |
| 3.2 | Owner: set Supabase Auth redirect URLs + SMTP | Owner |
| 3.3 | Agent: deploy to Vercel (after approval) | Agent |
| 3.4 | Owner: set GAS `FBOS_WEBHOOK_URL` to prod URL | Owner |
| 3.5 | **If migration approved:** finance RLS policies + DEFINER grant hardening | Agent |
| 3.6 | **If migration approved:** populate/reconcile Supabase migration history | Agent |
| 3.7 | Owner: add secondary GitHub + Supabase admin | Owner |
| 3.8 | Prod smoke test: login, sync-all, webhook, dashboard KPIs | Agent + Owner |
| 3.9 | Recovery drill (clone + env restore + build) | Owner |

**Sprint 3 exit criteria:** Prod URL live; GAS triggers hitting webhook; auth enforced (if approved); security linter issues addressed or accepted with documented exceptions.

---

### 5. What approvals are still required?

| # | Approval | Required before |
|---|---|---|
| A-1 | **"Approved to implement"** (Class B technical work) | Sprint 1 code changes |
| A-2 | **Vault backup confirmed** | Sprint 1 (recommended hard gate) |
| A-3 | **Auth/middleware sub-phase approval** | Sprint 2 auth restore |
| A-4 | **Supabase migration approval** | Sprint 3 RLS/security SQL |
| A-5 | **Production deploy approval** | Sprint 3 Vercel go-live |

---

## Go / No-Go Matrix

| Condition | Status |
|---|---|
| `.env.local` on dev machine | ✅ Closed (owner attested) |
| Vault backup created | ⏳ Pending |
| Implementation approval | ⏳ Pending |
| Build passes | ❌ Not yet |
| Integrations wired | ⚠️ Partial |
| Auth prod-safe | ❌ Deferred |
| Deploy ready | ❌ Deferred |

```
GO for Sprint 1  =  OA-01 (backup) + OA-02 (approval)
NO-GO for deploy =  until Sprint 3 approvals (A-4, A-5)
NO-GO for auth   =  until A-3
```

---

## ⛔ Status

Implementation readiness final check complete. **Awaiting owner backup + explicit approval before any code changes.**

No code modified. No auth flags changed. No migrations run. No deploy performed.
