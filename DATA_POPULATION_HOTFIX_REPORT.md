# FBOS Data Population Hotfix Report

**Date:** 2026-06-20  
**Branch:** `cursor/data-population-hotfix-0d65`  
**Sprint:** ENV fallback + tsx + trace + jobs/ClickUp data flow

---

## Problem statement

Owner `.env.local` uses `GOOGLE_SHEET_GID_ORDERS=443214491` but code only checked `GOOGLE_SHEET_GID_OPERATIONS` → operations/jobs GIDs showed empty in `trace:data`.

Additionally `npm run p0:sync:direct` failed because `tsx` was not a project dependency (relied on `npx` download).

---

## Fixes applied

### 1. ENV fallback (`lib/google-config.ts`)

Operations GID resolution order:

1. `GOOGLE_SHEET_GID_OPERATIONS`
2. `GOOGLE_SHEET_GID_ORDERS` ← **new fallback**
3. `GOOGLE_SHEET_GID_JOBS`

Exported helpers:
- `getOperationsGidCandidates()`
- `resolveOperationsGid()`

Jobs tab GID chain: `JOBS` → `ORDERS` → `OPERATIONS`.

Removed `GOOGLE_SHEET_GID_ORDERS` from quotations fallback (prevents order master GID being used for quotations).

### 2. TSX dependency (`package.json`)

Added `tsx@^4.19.4` to `devDependencies`.

`scripts/run-p0-closure.mjs` now uses local `node_modules/.bin/tsx` before falling back to `npx`.

### 3. Trace script (`scripts/trace-data-flow.mjs`)

Now shows:
- Detected operations GID
- Source env variable name
- Order master row count (per candidate GID)
- Jobs rows discovered (`Order ID` → `order_id` mapping count)
- ClickUp backfill potential from `leads.clickup_task_id`

Shared logic: `scripts/lib/resolve-sheet-gids.mjs`

### 4. Jobs import (`lib/integrations/gsheet-hub.ts`)

- Uses `getOperationsGidCandidates()` for fetch
- Returns `operationsSourceGid` + `operationsSourceEnv` in sync result
- `Order ID` → `order_id` → `job_no` mapping verified

### 5. ClickUp backfill (`lib/integrations/clickup.ts`)

Unchanged from prior sprint — `backfillClickUpTasksFromLeads()` runs when `tasksStored === 0`.

---

## Validation results (cloud agent)

| Command | Result | Notes |
|---|---|---|
| `npm install` | ✅ PASS | tsx installed to `node_modules/.bin/tsx` |
| `npm run build` | ✅ PASS | TypeScript clean |
| `npm run db:verify` | ⏭ SKIP | No Supabase creds in cloud workspace |
| `npm run trace:data` | ✅ PASS | GID resolution verified (see below) |
| `./node_modules/.bin/tsx scripts/p0-sync-direct.ts` | ✅ PASS | tsx executes script (Supabase unset in cloud) |
| `npm run p0:sync:direct` | ⏭ SKIP | Requires full `.env.local` with Supabase keys |
| `npm run p0:counts` | ⏭ SKIP | Requires Supabase keys |

### trace:data output (owner GIDs, cloud)

```
detected operations gid: 443214491
source variable: GOOGLE_SHEET_GID_ORDERS
operations: 443214491
jobs: 443214491
```

CSV fetch returned login wall in cloud (expected without owner network/session). Owner machine with sheet sharing will return row counts.

### Order ID mapping unit check

```
Input: { "Order ID": "ORD-1001" }
→ order_id: ORD-1001
→ extractJobNo: ORD-1001
→ jobs rows discovered: 1/1
```

---

## Owner validation runbook

```bash
git fetch origin
git checkout cursor/data-population-hotfix-0d65
npm install

npm run build
npm run db:verify
npm run trace:data          # BEFORE — note jobs + clickup_tasks counts
npm run p0:sync:direct      # should NOT fail on tsx
npm run p0:counts           # AFTER
```

Expected `trace:data` with owner `.env.local`:

```
detected operations gid: 443214491
source variable: GOOGLE_SHEET_GID_ORDERS
order master row count: > 0
jobs rows discovered: > 0
```

---

## BEFORE / AFTER

### BEFORE

| Item | Value |
|---|---|
| `trace:data` operations gid | `""` (empty — ORDERS ignored) |
| `trace:data` jobs gid | `""` |
| `npm run p0:sync:direct` | ❌ FAIL — `Direct sync failed. Install tsx` |
| Supabase `jobs` | **0** |
| Supabase `clickup_tasks` | **0** |
| Supabase `leads` | **2524** |
| Supabase `finance_import_queue` | **985** |

### AFTER (code + owner sync required for DB deltas)

| Item | Value |
|---|---|
| `trace:data` operations gid | **443214491** |
| `trace:data` source variable | **GOOGLE_SHEET_GID_ORDERS** |
| `npm run p0:sync:direct` | ✅ tsx runs from `node_modules` |
| Supabase `jobs` (expected) | **> 0** after sync |
| Supabase `clickup_tasks` (expected) | **> 0** after backfill/sync |

### Jobs count delta

| | Count |
|---|---|
| BEFORE | 0 |
| AFTER (expected) | = rows in `02_Order_Master` with non-empty `Order ID` |
| Delta | **+N** (N = importable order rows) |

*Exact N requires owner `npm run p0:sync:direct` with full `.env.local`.*

### ClickUp tasks delta

| | Count |
|---|---|
| BEFORE | 0 |
| AFTER (expected) | = `COUNT(leads WHERE clickup_task_id IS NOT NULL)` + live API tasks |
| Delta | **+M** (backfill from existing leads + any new API sync) |

---

## Files changed

| File | Change |
|---|---|
| `lib/google-config.ts` | ORDERS env fallback, `resolveOperationsGid()` |
| `lib/integrations/gsheet-hub.ts` | Candidate GID fetch, source metadata |
| `scripts/lib/resolve-sheet-gids.mjs` | **New** — shared trace resolution |
| `scripts/trace-data-flow.mjs` | Enhanced operations/order master output |
| `scripts/run-p0-closure.mjs` | Local tsx binary path |
| `package.json` | `tsx` devDependency |
| `.env.example` | Document `GOOGLE_SHEET_GID_ORDERS` |

---

## Constraints honored

- ✅ No auth changes
- ✅ No middleware changes
- ✅ No deploy
- ✅ No migrations
- ✅ No UI changes
- ✅ Data population hotfix only

---

## Goal status

| Goal | Code | Owner sync |
|---|---|---|
| `jobs > 0` | ✅ ORDERS GID + Order ID mapping | Run `p0:sync:direct` |
| `clickup_tasks > 0` | ✅ Backfill from leads | Run `p0:sync:direct` |
