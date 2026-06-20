# Google Sheet Data Flow Trace

**Date:** 2026-06-20  
**Branch:** `cursor/data-population-0d65`  
**Spreadsheet (Apps Script default):** `1Pi6Mz7P5oYkLutsWLrM8aoos4ijXtmEuessFvd4oUBI`

---

## Architecture overview

Two parallel pipelines feed Supabase:

```
Pipeline A — Apps Script (direct to Supabase)
  06_Finance_Sync tab → syncFinanceToSupabase() → finance_import_queue

Pipeline B — FBOS Next.js (via sync / webhook)
  Webapp / CSV tabs → syncGSheetHub() → leads, jobs, finance, clients, followups
```

Owner evidence (2524 leads, 985 finance) confirms **both pipelines are partially active**.

---

## 1. Which tabs sync successfully?

| Tab (sheet name) | Env GID key | FBOS importer | Apps Script | Supabase destination | Status |
|---|---|---|---|---|---|
| **07_Lead_CRM** | `GOOGLE_SHEET_GID_LEADS` / webapp | `syncGSheet()` webapp/CSV | `syncClickUpToLeadCrm()` writes sheet | `leads` (via FBOS) | ✅ **2524 rows** |
| **06_Finance_Sync** | `GOOGLE_SHEET_GID_FINANCE` | `importFinanceRows()` | `syncFinanceToSupabase()` **direct** | `finance_import_queue` | ✅ **985 rows** |
| **02_Order_Master** | `GOOGLE_SHEET_GID_OPERATIONS` / `GOOGLE_SHEET_GID_JOBS` | `importOperationsRows()` | *(not wired to Supabase)* | `jobs` | ❌ **0 rows** |
| **01_Dashboard** | — | — | Formula-only | — | N/A |
| **00_Sync_Status** | — | — | Log only | — | N/A |
| Clients tab | `GOOGLE_SHEET_GID_CLIENTS` | `importClientsRows()` | — | `clients` | ⚠️ Only if GID set |
| Followups tab | `GOOGLE_SHEET_GID_FOLLOWUPS` | `importFollowupsRows()` | — | `followups` | ⚠️ Only if GID set |

---

## 2. Which tab feeds leads?

**Primary:** `07_Lead_CRM` (ClickUp → Apps Script → sheet → FBOS webapp/CSV → `leads`)

**Flow:**
```
ClickUp API
  → Apps Script syncClickUpToLeadCrm()
  → Sheet tab 07_Lead_CRM
  → FBOS syncGSheet() (webapp or CSV)
  → importLeadsWithDedupe()
  → Supabase leads (2524)
```

**Secondary:** FBOS `POST /api/integrations/clickup/sync` can also write leads via `syncClickUpTasksToLeads()` with `source: "ClickUp"` and `clickup_task_id`.

---

## 3. Which tab feeds finance?

**Primary:** `06_Finance_Sync`

**Flow (Apps Script — bypasses FBOS):**
```
Tally → Apps Script doPost / syncFinanceToSupabase()
  → DELETE finance_import_queue WHERE source='tally'
  → INSERT batch
  → Supabase finance_import_queue (985)
```

**Secondary:** FBOS `syncGSheetHub()` can also import same tab via CSV GID if `GOOGLE_SHEET_GID_FINANCE` is set.

---

## 4. Which tab should feed jobs?

**Expected:** `02_Order_Master` (Apps Script constant `TAB_ORDER = "02_Order_Master"`)

**Env vars:** `GOOGLE_SHEET_GID_OPERATIONS` or `GOOGLE_SHEET_GID_JOBS` must equal the **numeric GID** of that tab.

**FBOS destination:** `jobs` table (`job_no`, `status`, `client_id`)

---

## 5. Are jobs rows present in source sheet?

**Yes — per Apps Script schema.** `02_Order_Master` headers include:

- `Order ID` ← primary job identifier
- `Client Name`, `Current Status`, `Production Status`, etc.

Run locally to confirm row count:
```bash
node scripts/trace-data-flow.mjs
```

Look for: `operations (gid=...): N data rows — job key candidates: X/N`

---

## 6. Were jobs being read but discarded?

**Yes — root cause identified.**

### Bug RC-J1: Column name mismatch

Sheet header `Order ID` normalizes to `order_id`.  
Old importer only checked: `job_no`, `job_number`, `job_id`, `order_no` — **not `order_id`**.

Every row without a matching key was **silently skipped**.

### Bug RC-J2: Missing / wrong GID

If `GOOGLE_SHEET_GID_OPERATIONS` is unset, `fetchRawRows()` never runs → 0 source rows.

### Bug RC-J3: Punctuation in headers

`Order ID` with old normalizer could become `order_id` inconsistently; new normalizer strips non-alphanumeric.

---

## 7. Were jobs inserted into wrong table?

**No.** Code path is correct: `importOperationsRows()` → `jobs` table only.

Finance goes to `finance_import_queue`. Leads go to `leads`. No cross-table misroute for jobs.

---

## Exact row counts (owner verified + expected)

| Table | Count | Source |
|---|---|---|
| leads | **2524** | Owner verified |
| finance_import_queue | **985** | Owner verified |
| jobs | **0** | Owner verified — fix applied |
| clickup_tasks | **0** | Owner verified — fix applied |

---

## Fix applied (data flow only)

| Fix | File | Change |
|---|---|---|
| Map `Order ID` → `job_no` | `lib/integrations/gsheet-hub.ts` | Added `order_id`, `orderid` aliases |
| Robust header normalize | `lib/integrations/gsheet-hub.ts` | `normalizeSheetKey()` strips punctuation |
| Status aliases | `lib/integrations/gsheet-hub.ts` | `current_status`, `production_status` |
| Dual GID fetch | `lib/integrations/gsheet-hub.ts` | Try `operations` then `jobs` GID |
| Import stats | `lib/integrations/gsheet-hub.ts` | Track imported/skipped/failed |
| Trace script | `scripts/trace-data-flow.mjs` | Diagnose tab + DB counts |

---

## Owner action required

1. Set `GOOGLE_SHEET_GID_OPERATIONS` to the GID of tab **`02_Order_Master`** (get from sheet URL `gid=` parameter).
2. Run sync:
   ```bash
   npm run p0:sync:direct
   # or
   npm run p0:sync
   ```
3. Verify:
   ```bash
   node scripts/trace-data-flow.mjs
   npm run p0:counts
   ```

Expected after fix: `jobs > 0` when operations tab has `Order ID` values.
