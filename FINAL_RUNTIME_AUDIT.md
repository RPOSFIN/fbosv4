# FBOS V4 — Final Runtime Audit

**Date:** 2026-06-20  
**Branch:** `cursor/final-runtime-recovery-0d65`  
**Scope:** Runtime recovery sprint — restore functionality without UI redesign

---

## Executive summary

| Area | Before | After |
|---|---|---|
| Dashboard | Placeholder text only | Live KPI counts from `/api/dashboard/kpi` |
| Followups API | 500 — invalid `followups`↔`leads` join | Fixed — separate lead lookup, no FK required |
| p0:sync | Fetch failed (wrong port / no server) | Auto port detect + `--direct` in-process sync |
| Jobs module | Empty, confusing copy | Empty state with live count + sync instructions |
| ClickUp | 0 tasks (narrow scope, silent errors) | Pagination + configurable limits + error logging |
| Integration Hub | `source: unknown` | Health fallback + service-role hint |
| Admin page | 404 on `/api/admin/users` | GET/PATCH profiles API restored |

---

## Module status matrix

| Module | Status | Notes |
|---|---|---|
| Build | ✅ PASS | Next.js 16.2.9 production build |
| TypeScript | ✅ PASS | Strict mode clean |
| DB Verify | ✅ PASS (owner env) | Cloud agent lacks `.env.local` |
| Leads | ✅ LIVE | Working per owner report |
| Finance queue | ✅ LIVE | Working per owner report |
| Google Sync | ✅ CONNECTED | Health check OK |
| Integration health | ✅ WORKING | Route exists, returns connectors |
| Dashboard | ✅ RESTORED | 5 KPI cards with links |
| Followups | ✅ FIXED | Code path no longer requires PostgREST FK |
| Followups today | ✅ FIXED | Same fetch layer |
| Jobs | ⚠️ DATA-DEPENDENT | API OK; rows need GSheet ops tab sync |
| ClickUp tasks | ⚠️ DATA-DEPENDENT | Sync improved; needs token + POST sync |
| p0:sync | ✅ FIXED | Port auto-detect + direct mode |
| Admin | ✅ RESTORED | User list + role PATCH |
| Navigation | ✅ STABLE | No changes |

---

## Files changed

| File | Change |
|---|---|
| `lib/followups/query.ts` | `FOLLOWUP_SELECT = "*"` (no embedded join) |
| `lib/followups/fetch.ts` | Manual `attachLeadsToFollowups()` batch lookup |
| `app/page.tsx` | Dashboard KPI cards (leads, followups, jobs, finance, clickup) |
| `app/api/dashboard/kpi/route.ts` | Added `financeQueue`, `clickupTasks` counts |
| `scripts/run-p0-closure.mjs` | Port auto-detect, `--direct` flag, better errors |
| `scripts/p0-sync-direct.ts` | In-process sync via tsx (no dev server) |
| `package.json` | Added `p0:sync:direct` script |
| `lib/integrations/clickup.ts` | Pagination, limits, error logging |
| `lib/integrations/sync-data.ts` | Accurate clickup count via head query |
| `app/integrations/page.tsx` | Health syncData fallback, source hint |
| `app/job-master/page.tsx` | Live count empty state |
| `app/api/admin/users/route.ts` | **Created** — GET/PATCH profiles |
| `app/admin/page.tsx` | Removed duplicate fetch |

---

## Owner verification checklist

```bash
git checkout cursor/final-runtime-recovery-0d65
npm install && npm run build && npm run db:verify

# Followups
curl http://localhost:3000/api/followups
curl http://localhost:3000/api/followups/today

# Dashboard KPI
curl http://localhost:3000/api/dashboard/kpi

# Sync (pick one)
npm run p0:sync              # HTTP via auto-detected port
npm run p0:sync:direct       # in-process, no dev server

# Admin (as admin role)
curl http://localhost:3000/api/admin/users
```

Browser checks:
- [ ] `/` shows live counts (not placeholder)
- [ ] `/followups` and `/followups/today` load
- [ ] `/job-master` shows count or rows
- [ ] `/integrations` shows `source: supabase`
- [ ] `/admin` lists users with role dropdown

---

## Remaining data gaps (not code blockers)

1. **Jobs = 0** — Run sync; confirm `GOOGLE_SHEET_GID_OPERATIONS` matches ops tab
2. **ClickUp = 0** — Set `CLICKUP_API_TOKEN`, optional `CLICKUP_LIST_ID`, run sync
3. **Followups lead names** — GSheet import doesn't set `lead_id`; names fall back to `company_name` column

---

## Constraints honored

- ✅ No auth changes
- ✅ No middleware changes
- ✅ No deploy
- ✅ No migrations
- ✅ No UI redesign (reused existing card/table patterns)
- ✅ No new modules (admin route restores missing API only)
