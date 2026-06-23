# FBOS V4 — Branch Mismatch Report

**Date:** 2026-06-20
**Audit mode:** Read-only — no code or scripts modified
**Auditor workspace branch:** `cursor/p0-closure-0d65` @ `b35fad3`
**Default branch:** `main` @ `a364445`

---

## Executive finding

**The P0 closure report and your local checkout are on different branches.**

| Location | Branch | Has `p0:sync` / `p0:counts`? |
|---|---|---|
| `FBOS_P0_CLOSURE_REPORT.md` | `cursor/p0-closure-0d65` | ✅ Yes |
| Your local `npm run` output | **`main`** (inferred) | ❌ No |
| Cloud agent workspace (this audit) | `cursor/p0-closure-0d65` | ✅ Yes |

Your observed scripts (`dev`, `build`, `lint`, `db:verify`, `validate` only) match **`main`**, not the branch the report documents.

---

## 1. Why the report references scripts that do not exist (on your machine)

`FBOS_P0_CLOSURE_REPORT.md` was generated on feature branch **`cursor/p0-closure-0d65`**, commit **`b35fad3`**, which adds:

```json
"p0:sync": "node scripts/run-p0-closure.mjs",
"p0:counts": "node scripts/run-p0-closure.mjs --counts"
```

Those entries were **never merged to `main`**. PR [#7](https://github.com/RPOSFIN/fbosv4/pull/7) (draft) contains them but is not on `main`.

If you run `npm run` on **`main`**, you correctly see only:

| Script | Command |
|---|---|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `eslint` |
| `db:verify` | `node scripts/verify-database.mjs` |
| `db:integrations` | `node scripts/apply-integrations-migration.mjs` |
| `validate` | `npm run lint && npm run build && npm run db:verify` |

**No `p0:sync` or `p0:counts` on `main`.**

---

## 2. Does the current branch match the report branch?

| Check | Result |
|---|---|
| Report claims branch | `cursor/p0-closure-0d65` |
| Cloud workspace branch | ✅ `cursor/p0-closure-0d65` — **matches** |
| Your local branch (from `npm run`) | ❌ **`main`** (or unpulled) — **does not match** |
| Report merged to `main`? | ❌ **No** |

**Conclusion:** The report is accurate for `cursor/p0-closure-0d65` only. Your environment does not match unless you checkout that branch.

---

## 3. Was sync implementation actually committed?

### On `cursor/p0-closure-0d65` (5 commits ahead of `main`)

| Commit | What was committed |
|---|---|
| `7004c86` | MOCK_USER type fix |
| `440044e` | Health route, jobs schema, ClickUp wiring, sync-data |
| `8d826ab` | GSheet jobs import fix, `run-mvp-population.mjs`, MVP report |
| `9d3af24` | Finance queue graceful fallback |
| `b35fad3` | `run-p0-closure.mjs`, `p0:sync`/`p0:counts` scripts, `.env.example`, P0 report |

**Yes — sync implementation is committed on `cursor/p0-closure-0d65`.**

### On `main` (what you likely have)

| Component | Status on `main` |
|---|---|
| ClickUp sync route | ❌ **Placeholder stub** only |
| Health route | ❌ **Does not exist** (404) |
| Jobs API schema fix | ❌ **Not present** (still queries `client_name`) |
| `run-p0-closure.mjs` | ❌ **Not present** |
| `p0:sync` / `p0:counts` | ❌ **Not in package.json** |
| GSheet hub / sync-all | ✅ Present (library + routes) |
| Webhook sheet-sync | ✅ Present |

---

## 4. Sync-related files (by branch)

### Library layer (present on both `main` and feature branches)

| File | Role |
|---|---|
| `lib/integrations/clickup.ts` | `syncClickUp()` — full ClickUp API logic |
| `lib/integrations/clickup-leads.ts` | ClickUp tasks → leads import |
| `lib/integrations/gsheet.ts` | `syncGSheet()` — leads via webapp/CSV |
| `lib/integrations/gsheet-hub.ts` | `syncGSheetHub()` — operations, finance, clients, followups |
| `lib/integrations/status.ts` | Integration row upsert / status |
| `lib/integrations/sync-data.ts` | `loadIntegrationSyncData()` — **feature branch only** |
| `lib/google-config.ts` | Sheet ID, tab GIDs — **env-driven on feature branch** |

### API routes

| Route | `main` | `cursor/p0-closure-0d65` |
|---|---|---|
| `POST /api/integrations/clickup/sync` | Stub | ✅ Wired to `syncClickUp()` |
| `GET /api/integrations/clickup/sync` | Stub | ✅ Returns `syncData` |
| `POST /api/integrations/gsheet/sync` | ✅ Wired | ✅ Wired |
| `POST /api/integrations/sync-all` | ✅ Wired | ✅ Wired |
| `GET /api/integrations/health` | ❌ Missing | ✅ Present |
| `POST /api/webhooks/sheet-sync` | ✅ Wired | ✅ Wired |
| `GET /api/finance/queue` | May 500 without env | ✅ Graceful 200 empty |
| `GET /api/jobs` | ❌ Queries `client_name` | ✅ Schema-aligned |

### Scripts

| File | `main` | `cursor/p0-closure-0d65` | In `package.json`? |
|---|---|---|---|
| `scripts/run-p0-closure.mjs` | ❌ | ✅ | ✅ `p0:sync`, `p0:counts` |
| `scripts/run-mvp-population.mjs` | ❌ | ✅ | ❌ (manual only) |
| `scripts/test-gsheet-sync-twice.mjs` | ✅ | ✅ | ❌ |
| `scripts/debug-sync-keys.mjs` | ✅ | ✅ | ❌ |

### Finance sync path

Finance data flows through **`syncGSheetHub()` → `importFinanceRows()`** into **`finance_import_queue`**. No separate finance sync route — finance is part of GSheet hub sync.

---

## 5. Exact commands available on THIS branch

### If you are on `main` (your current state)

```bash
npm run dev
npm run build
npm run lint
npm run db:verify
npm run db:integrations
npm run validate
```

**Sync (no npm shortcut on `main`):**

```bash
# Terminal 1
npm run dev

# Terminal 2 — with .env.local present
curl -X POST http://localhost:3000/api/integrations/sync-all
curl -X POST http://localhost:3000/api/integrations/gsheet/sync
curl -X POST http://localhost:3000/api/integrations/clickup/sync   # stub on main — does not sync
```

### If you checkout `cursor/p0-closure-0d65` (report branch)

```bash
git fetch origin
git checkout cursor/p0-closure-0d65
npm install

npm run dev
npm run build
npm run lint
npm run db:verify
npm run db:integrations
npm run p0:sync      # ClickUp + GSheet sync + row count report
npm run p0:counts    # Row counts only, no sync
npm run validate
```

**Equivalent manual commands:**

```bash
node scripts/run-p0-closure.mjs
node scripts/run-p0-closure.mjs --counts
node scripts/run-mvp-population.mjs          # sync-all via HTTP (not in package.json)
```

**Direct API sync (dev server required):**

```bash
curl -X POST http://localhost:3000/api/integrations/clickup/sync
curl -X POST http://localhost:3000/api/integrations/gsheet/sync
curl -X POST http://localhost:3000/api/integrations/sync-all
```

---

## Explicit answers

### A. Were `p0:sync` and `p0:counts` ever created?

**Yes.** They were added in commit **`b35fad3`** on branch **`cursor/p0-closure-0d65`**, pushed to `origin/cursor/p0-closure-0d65`, documented in PR [#7](https://github.com/RPOSFIN/fbosv4/pull/7).

They were **not** created on `main`.

### B. If yes, where are they?

| Item | Location |
|---|---|
| npm script definitions | `package.json` lines 12–13 — **branch `cursor/p0-closure-0d65` only** |
| Script implementation | `scripts/run-p0-closure.mjs` — **same branch only** |
| Remote | `origin/cursor/p0-closure-0d65` |
| PR | https://github.com/RPOSFIN/fbosv4/pull/7 (draft, unmerged) |

On the cloud agent workspace **right now**, `npm run` confirms both scripts exist because the workspace is checked out to that branch.

### C. If not, why were they referenced?

They **were** created — but the report assumed you would run commands on **`cursor/p0-closure-0d65`**, not on **`main`**.

The report did not state clearly enough that:

1. The branch was unmerged
2. You must `git checkout cursor/p0-closure-0d65` before running `npm run p0:sync`
3. Commands on `main` would not work

This is a **branch documentation gap**, not a missing commit on the report branch.

### D. What is the actual way to run sync in THIS branch?

**If “this branch” = `main` (your machine):**

```bash
npm run dev
curl -X POST http://localhost:3000/api/integrations/sync-all
curl -X POST http://localhost:3000/api/integrations/gsheet/sync
```

ClickUp sync on `main` is a **placeholder** — it will not import tasks until you merge or checkout the feature branch.

**If “this branch” = `cursor/p0-closure-0d65` (report branch):**

```bash
npm run dev
npm run p0:sync
```

Or the curl commands above (ClickUp route is fully wired on this branch).

---

## Recommended resolution

```bash
git fetch origin
git checkout cursor/p0-closure-0d65
npm install
npm run p0:sync    # now available
```

Or merge PR #7 into `main` to make `p0:sync` available on the default branch.

---

## ⛔ Audit complete — no code modified.
