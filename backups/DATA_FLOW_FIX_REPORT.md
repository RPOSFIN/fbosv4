# Data Flow Fix Report

**Date:** 2026-06-20  
**Branch:** `cursor/data-population-0d65`  
**Sprint:** FBOS Data Population

---

## Executive summary

Google Sheets and ClickUp integrations **were working** for leads (2524) and finance (985). Jobs and ClickUp task cache were empty due to **mapping and pipeline gaps**, not missing credentials.

---

## C. Supabase counts (owner verified)

| Table | Count | Status |
|---|---|---|
| leads | **2524** | ✅ Populated |
| finance_import_queue | **985** | ✅ Populated |
| jobs | **0** | ❌ Fixed in this sprint |
| clickup_tasks | **0** | ❌ Fixed in this sprint |
| finance_transactions | *not reported* | ⚠️ Separate from import queue |

Run `node scripts/trace-data-flow.mjs` or `npm run p0:counts` for live counts after sync.

---

## D. Fixes applied (data flow only)

### Jobs pipeline

**File:** `lib/integrations/gsheet-hub.ts`

| Issue | Fix |
|---|---|
| `Order ID` column not mapped | Added `order_id`, `orderid` to `extractJobNo()` |
| Header normalization fragile | `normalizeSheetKey()` strips punctuation |
| Wrong/missing operations GID | `fetchOperationsRows()` tries both OPERATIONS and JOBS GIDs |
| Silent skips | Returns `operationsImported`, `operationsSkipped`, `operationsFailed` |
| Status from sheet | Maps `current_status`, `production_status` |

### ClickUp task cache pipeline

**File:** `lib/integrations/clickup.ts`

| Issue | Fix |
|---|---|
| Tasks go to `leads` only | Added `backfillClickUpTasksFromLeads()` |
| `clickup_tasks` never populated from existing data | Auto-backfill when `tasksStored === 0` |

### Diagnostics

**File:** `scripts/trace-data-flow.mjs`

- Reports env GIDs, per-tab CSV row counts, job-key candidates, Supabase counts, ClickUp lead attribution.

---

## Files changed

| File | Change |
|---|---|
| `lib/integrations/gsheet-hub.ts` | Jobs column mapping, dual GID fetch, import stats |
| `lib/integrations/clickup.ts` | Backfill clickup_tasks from leads |
| `scripts/trace-data-flow.mjs` | **New** — trace script |

**Not changed:** auth, middleware, UI, migrations, deploy.

---

## Final section

### ROOT CAUSE

| Module | Root cause |
|---|---|
| **Jobs** | Sheet tab `02_Order_Master` uses column `Order ID` → `order_id`; importer ignored it. Operations GID may be unset → 0 CSV rows fetched. |
| **ClickUp tasks** | Apps Script writes ClickUp data to sheet + leads path only. FBOS `clickup_tasks` cache requires `storeClickUpTasks()` on POST sync; leads populated via separate `syncClickUpTasksToLeads()` path. |

### FIX APPLIED

1. Map `order_id` / improved normalization for jobs import
2. Fetch operations from either `GOOGLE_SHEET_GID_OPERATIONS` or `GOOGLE_SHEET_GID_JOBS`
3. Backfill `clickup_tasks` from `leads.clickup_task_id` after sync
4. Trace script for owner verification

### ROWS IMPORTED

| Target | Expected after owner runs sync |
|---|---|
| `jobs` | = rows in `02_Order_Master` with non-empty `Order ID` |
| `clickup_tasks` | = leads with `clickup_task_id IS NOT NULL` (backfill) + live API tasks on sync |

*Exact counts require owner run with `.env.local` — cloud agent has no credentials.*

### ROWS SKIPPED

| Pipeline | Skip reason |
|---|---|
| Jobs | Row has no `Order ID` / job key after normalization |
| Jobs | Empty operations tab (GID wrong or sheet not shared) |
| ClickUp backfill | Lead row missing `clickup_task_id` |
| Leads (existing) | Dedupe match — unchanged |

### ROWS FAILED

| Pipeline | Failure reason |
|---|---|
| Jobs | DB insert/update error (logged in `operationsFailed`) |
| ClickUp | Upsert error on `clickup_tasks` (console warn) |

---

## Owner runbook

```bash
git fetch origin
git checkout cursor/data-population-0d65

# 1. Ensure .env.local has:
#    GOOGLE_SHEET_GID_OPERATIONS=<gid of 02_Order_Master tab>
#    CLICKUP_API_TOKEN=...
#    CLICKUP_LIST_ID=901615315973  (from Apps Script CONFIG)

# 2. Trace before
node scripts/trace-data-flow.mjs

# 3. Sync
npm run p0:sync:direct

# 4. Trace after
node scripts/trace-data-flow.mjs
npm run p0:counts
```

### Success criteria

- [ ] `jobs > 0`
- [ ] `clickup_tasks > 0`
- [ ] `operationsImported > 0` in sync output
- [ ] Integration Hub shows ClickUp task count

---

## Goal status

| Goal | Code fix | Owner sync required |
|---|---|---|
| Jobs > 0 | ✅ | ✅ Set operations GID + run sync |
| ClickUp Tasks > 0 | ✅ | ✅ Run sync (backfill from leads and/or live API) |
