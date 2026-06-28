# ClickUp Data Flow Trace

**Date:** 2026-06-20  
**Branch:** `cursor/data-population-0d65`

---

## 1. Why leads exist but clickup_tasks = 0?

**Leads and clickup_tasks use different pipelines.**

| Path | Destination | Populated? |
|---|---|---|
| Apps Script `syncClickUpToLeadCrm()` | Sheet `07_Lead_CRM` only | ✅ Sheet rows |
| Apps Script → Supabase | **Not implemented for tasks** | ❌ |
| FBOS `syncClickUpTasksToLeads()` | `leads` table | ✅ (if POST sync run) |
| FBOS `storeClickUpTasks()` | `clickup_tasks` table | ❌ **Only on POST sync** |

**2524 leads** likely came from:
- Google Sheet / webapp lead import (dominant), and/or
- ClickUp → leads via FBOS dedupe (`source: "ClickUp"`, `clickup_task_id` set)

**clickup_tasks = 0** because:
1. Apps Script never writes to `clickup_tasks` — only to sheet tab
2. FBOS `POST /api/integrations/clickup/sync` may not have been run after deploy
3. Even when leads sync, task cache step was separate and could be skipped if store failed

---

## 2. Is ClickUp importing directly into leads?

**Yes — by design.**

```typescript
// lib/integrations/clickup-leads.ts
syncClickUpTasksToLeads(tasks) → importLeadsWithDedupe({
  company_name: task.name,
  source: "ClickUp",
  clickup_task_id: task.id,
})
```

**Destination table:** `leads` (not `clickup_tasks`)

This explains high lead count with zero task cache rows.

---

## 3. Is clickup_tasks table unused?

**No — it is the Integration Hub cache table**, but it only receives data when:

```typescript
// lib/integrations/clickup.ts
storeClickUpTasks() → upsert clickup_tasks ON CONFLICT (external_id)
```

Called from `syncClickUp()` after API fetch. **Not called by Apps Script.**

---

## 4. Is task mapping disabled?

**No — mapping is enabled** in `parseClickUpLeadTask()` and `storeClickUpTasks()`.

Disabled scenarios:
- `CLICKUP_API_TOKEN` unset → demo mode (3 sample tasks, still should store if service role present)
- List fetch HTTP errors → previously silent; now logged
- Scope limits (space/list caps) → may fetch subset

Default list from Apps Script CONFIG: `CLICKUP_LIST_ID = 901615315973`

---

## 5. Are records being written elsewhere?

| Destination | When | Evidence |
|---|---|---|
| `leads` | ClickUp → FBOS sync | `source='ClickUp'`, `clickup_task_id` column |
| `07_Lead_CRM` sheet | Apps Script every 10 min | Code.gs trigger |
| `clickup_tasks` | FBOS storeClickUpTasks only | Empty until sync |
| `tasks` (fallback) | If clickup_tasks upsert fails | Legacy fallback table |

Check lead attribution:
```sql
SELECT source, COUNT(*) FROM leads GROUP BY source;
SELECT COUNT(*) FROM leads WHERE clickup_task_id IS NOT NULL;
```

---

## Exact destination table

```
ClickUp API
    ├─► [Apps Script] → 07_Lead_CRM (sheet) → FBOS webapp → leads
    └─► [FBOS syncClickUp]
            ├─► storeClickUpTasks() → clickup_tasks  ← WAS EMPTY
            └─► syncClickUpTasksToLeads() → leads     ← POPULATED
```

---

## Fix applied (data flow only)

| Fix | File | Change |
|---|---|---|
| Backfill task cache from leads | `lib/integrations/clickup.ts` | `backfillClickUpTasksFromLeads()` |
| Auto-backfill when store=0 | `lib/integrations/clickup.ts` | Runs after live + demo sync |
| Pagination + error logging | `lib/integrations/clickup.ts` | (prior sprint) |

**Backfill logic:**
```typescript
// Reads leads WHERE clickup_task_id IS NOT NULL
// Upserts into clickup_tasks (external_id = clickup_task_id)
```

This populates `clickup_tasks` from **existing lead rows** without re-fetching ClickUp API.

---

## Owner verification

```bash
npm run p0:sync:direct
node scripts/trace-data-flow.mjs
```

Expected:
- `leads (clickup_task_id set): N` where N > 0
- `clickup_tasks: N` after backfill (matches leads with task IDs)
- If `clickup_task_id` count is 0, run live ClickUp sync with token set:
  ```bash
  # Ensure .env.local has CLICKUP_API_TOKEN and CLICKUP_LIST_ID
  npm run p0:sync:direct
  ```

---

## ROOT CAUSE / FIX / ROWS (ClickUp)

| | |
|---|---|
| **ROOT CAUSE** | Dual pipeline: leads populated via sheet/ClickUp→leads path; `clickup_tasks` cache only written by `storeClickUpTasks()` on POST sync, never by Apps Script |
| **FIX APPLIED** | `backfillClickUpTasksFromLeads()` after sync when task store count is 0 |
| **ROWS IMPORTED** | Up to `COUNT(leads WHERE clickup_task_id IS NOT NULL)` into `clickup_tasks` |
| **ROWS SKIPPED** | Leads without `clickup_task_id`; duplicate external_id (upsert) |
| **ROWS FAILED** | DB/RLS errors logged to console |
