# FBOS Sprint Status — Finance Hub + Leads

**Last updated:** 2026-06-12  
**Sheet:** [FBOS MASTER V1](https://docs.google.com/spreadsheets/d/1Pi6Mz7P5oYkLutsWLrM8aoos4ijXtmEuessFvd4oUBI)  
**Apps Script:** FBOS ClickUp Sync — **Web App v4 live** (v5 local, pending deploy)

---

## Done

| Item | Notes |
|------|-------|
| Supabase | `finance_import_queue`, `sheet_sync_log` migrated |
| CONFIG / Script Properties | Secrets in Script Properties; runtime OK |
| `06_Finance_Sync` | Headers ready (27 cols); awaiting Tally data |
| `07_Lead_CRM` | **10 ClickUp leads** verified |
| `02_Order_Master` | Unified headers extended (AP–AY) |
| `resumeFbosSetup` | Remote `?action=resume` → 200; triggers every 2h |
| Legacy finance tabs | `06A/B/C`, `06_Finance` hidden |
| Code.gs safe matcher | Partial matcher removed; legacy E3/E5 cell map added |
| Dashboard fixes (local) | Label repair, aliases, sales labels — in `Code.gs` |
| Tally installer | `Install-TallySync.ps1` + `.bat` for WSIPL-89-72 |
| Next.js readonly check | Finance/receivables = Supabase GET only |
| Documentation | ~95% — HANDOFF, ARCHITECTURE, CONTEXT-TRACKER |

---

## In progress / pending deploy

| Item | Blocker |
|------|---------|
| Apps Script v5 | `clasp push` — no Google credentials; manual paste + deploy |
| Dashboard formulas (full) | v4 still reports 6 missed finance + 2 legacy refs; v5 fixes ready |
| Finance KPI values | 0 until Tally sync on cloud |

---

## Blocked (needs WSIPL-89-72 cloud access)

| Item | Notes |
|------|-------|
| **Tally → Sheet sync** | Hostname `wsipl-89-72` not DNS-resolvable from dev PC |
| **TallyToSheet.ps1 test** | Must run ON cloud server via `Install-TallySync.bat` |

---

## Not started (low priority)

| Item | Where |
|------|-------|
| Hide ops legacy tabs | `03_Cylinder_Master`, `04_Artwork_Master` after migration |
| Next.js rich dashboards | Optional UI polish; data already read-only from Supabase |

---

## Tally connectivity test (dev machine)

```
FAIL wsipl-89-72:9007 — DNS could not resolve hostname
FAIL WSIPL-89-72:9007 — same
```

Expected: only reachable from cloud network / VPN. Tally script uses `127.0.0.1:9007` when installed ON the cloud machine.

---

## Key URLs / IDs

```
GOOGLE_SHEET_ID=1Pi6Mz7P5oYkLutsWLrM8aoos4ijXtmEuessFvd4oUBI
GOOGLE_WEBAPP_URL=https://script.google.com/macros/s/AKfycbzqkpY-z-fuXhdHp6s1sn090ZuqWzU1x7CbGC1hciDKUPqvmQFHKhQ6HM9P4U1pBBa6iw/exec
CLICKUP_LIST_ID=901615315973
TALLY_HOST=wsipl-89-72  TALLY_PORT=9007
06_Finance_Sync gid=1663252170
07_Lead_CRM gid=339902754
```

Remote resume:
```
?action=resume&secret=<SHEET_SYNC_SECRET>
```

---

## Next user actions (priority)

1. **WSIPL-89-72:** Run `Install-TallySync.bat` as Admin
2. **Apps Script:** Deploy v5 from local `Code.gs`
3. **Dev PC:** `node scripts/resume-hub-setup.mjs`
4. Verify `06_Finance_Sync` + dashboard finance column populates
