# Followups Fix Report

**Date:** 2026-06-20  
**Branch:** `cursor/final-runtime-recovery-0d65`  
**Priority:** P0

---

## Problem

```
Could not find relationship between followups and leads
```

All read paths used PostgREST embedded join:

```typescript
// lib/followups/query.ts (before)
"*, leads(id, company_name, contact_person, mobile, status, updated_at)"
```

PostgREST requires a foreign key from `followups.lead_id` → `leads.id`. Legacy databases may have the column without the FK constraint (migration `001_phase2_complete.sql` adds `lead_id uuid` via ALTER without REFERENCES).

**Affected endpoints:**
- `GET /api/followups`
- `GET /api/followups/today`
- `GET /api/followups?view=today&accumulate=true`
- Lead master pending followups panel

**Unaffected:**
- `POST /api/followups` (direct insert)
- `PATCH /api/followups/[id]` (direct update)
- `countTodayFollowups()` (head count, no join)

---

## Fix applied

### 1. Remove embedded join

```typescript
// lib/followups/query.ts (after)
export const FOLLOWUP_SELECT = "*";
```

### 2. Manual lead enrichment

```typescript
// lib/followups/fetch.ts
async function attachLeadsToFollowups(supabase, rows) {
  const leadIds = [...new Set(rows.map(r => r.lead_id).filter(Boolean))];
  if (!leadIds.length) return rows;

  const { data: leads } = await supabase
    .from("leads")
    .select("id, company_name, contact_person, mobile, status, updated_at")
    .in("id", leadIds);

  const leadMap = new Map(leads.map(l => [l.id, l]));
  return rows.map(row => ({
    ...row,
    leads: row.lead_id ? leadMap.get(row.lead_id) ?? null : null,
  }));
}
```

Both `fetchFollowups()` and `fetchTodayFollowups()` call this after the base query.

### 3. Graceful degradation preserved

`enrichFollowup()` already falls back to `row.company_name` / `row.contact_person` when `row.leads` is null — GSheet-imported followups without `lead_id` still display correctly.

---

## Why no migration

User constraint: **NO migrations unless absolutely required.**

The code-side fix works regardless of FK presence and avoids a database change that requires owner approval.

Optional future improvement (separate approval):
```sql
ALTER TABLE followups
  ADD CONSTRAINT followups_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
```

---

## Verification

| Test | Expected |
|---|---|
| `GET /api/followups` | 200, array of followups |
| `GET /api/followups/today` | 200, `{ items, counts, date }` |
| `/followups` page | Loads table without 500 |
| `/followups/today` page | Loads accumulated view |
| Lead with `lead_id` set | Shows joined company name |
| Followup without `lead_id` | Shows `company_name` from row |

---

## Result

✅ **FIXED** — Followups API and pages load without PostgREST relationship error.
