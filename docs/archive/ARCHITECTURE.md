# FBOS Hub Architecture

**Last updated:** 2026-06-12

## Core principle

**Google Sheet = KPI brain.** Dashboard formulas on `01_Dashboard` calculate finance/sales/ops metrics.  
**Next.js app = read-only display** of Supabase data (no KPI calculation in app).

**Tally = cloud server WSIPL-89-72.** Tally runs on port 9007 on that same machine. There is no separate RDP/AnyDesk target — install `TallyToSheet.ps1` directly on WSIPL-89-72.

---

## Data flow

```
ClickUp (list 901615315973)
  → Apps Script syncClickUpToLeadCrm
  → 07_Lead_CRM
  → 01_Dashboard SALES formulas

Tally CLOUD (WSIPL-89-72 :9007, Flexiflair Tech Private Limited)
  → TallyToSheet.ps1 (Task Scheduler every 2h, ON cloud server)
  → POST doPost(action=tally_finance) → Apps Script web app
  → 06_Finance_Sync (ONE tab, data_type column)
  → Apps Script syncFinanceToSupabase (also via syncAllHub every 2h)
  → Supabase finance_import_queue
  → Next.js /receivables, /api/finance/queue (GET only)

02_Order_Master
  → 01_Dashboard OPERATIONS (future)
```

---

## Single-sheet finance rule

**Use only `06_Finance_Sync`.** Legacy tabs are hidden — do not reference:

| Hidden tab | Replacement |
|------------|-------------|
| ~~06A_Receivable~~ | `data_type=receivable` |
| ~~06B_Payable~~ | `data_type=payable` |
| ~~06C_Collections~~ | voucher filters |
| ~~06_Finance~~ | all types in one tab |

| data_type | Tally source |
|-----------|--------------|
| `voucher` | Day Book entries |
| `ledger` | Ledger master |
| `receivable` | Bills Receivable |
| `payable` | Bills Payable |
| `bank_cash` | Bank/Cash ledgers |

---

## Sheet tabs (active)

| Tab | GID | Role |
|-----|-----|------|
| `01_Dashboard` | 0 | KPI formulas (finance, sales, ops, trends) |
| `00_Sync_Status` | 1894959634 | Sync audit log |
| `06_Finance_Sync` | 1663252170 | All Tally finance data |
| `07_Lead_CRM` | 339902754 | ClickUp leads (10 active) |
| `02_Order_Master` | 443214491 | Orders + artwork + cylinder |
| `CONFIG` | 639805728 | Targets + optional keys |

---

## Apps Script (`scripts/google-apps-script/Code.gs`)

| Function | Purpose |
|----------|---------|
| `setupAllFbosHub` | One-shot full setup |
| `resumeFbosSetup` | Safe re-run: labels + formulas + ClickUp + triggers |
| `setupSingleSheetFinance` | Finance formulas, legacy replacement, hide tabs |
| `syncClickUpToLeadCrm` | ClickUp → 07_Lead_CRM |
| `syncFinanceToSupabase` | Sheet → Supabase |
| `syncAllHub` | Every 2h: leads + finance |
| `doPost` | Tally batch ingest from cloud script |
| `doGet ?action=resume` | Remote resume (v4+ deployed) |

**Secrets:** `getProp()` reads Script Properties first, then CONFIG tab.

**Deploy:** Web App v4 live; v5 (dashboard label fixes) in local `Code.gs` — paste + new deployment version.

---

## Tally cloud install (WSIPL-89-72)

| File | Purpose |
|------|---------|
| `scripts/tally-cloud/TallyToSheet.ps1` | Export Tally XML → POST web app |
| `scripts/tally-cloud/Install-TallySync.ps1` | Copy files, set env, Task Scheduler |
| `scripts/tally-cloud/Install-TallySync.bat` | One-click Admin installer |
| `scripts/tally-cloud/INSTALL-HINDI.txt` | Hindi guide |

On cloud server: TallyHost = `127.0.0.1` (Tally is local to that machine).  
Machine env: `GOOGLE_WEBAPP_URL` = Apps Script exec URL.

---

## Supabase

| Table | Direction | Purpose |
|-------|-----------|---------|
| `finance_import_queue` | Apps Script → Supabase | Tally rows for app display |
| `sheet_sync_log` | optional | App-side log |

---

## Next.js app (`fbos-v1`)

- Auth disabled: `NEXT_PUBLIC_AUTH_DISABLED=true`
- Env: `.env.local` (sheet IDs, webapp URL, Supabase, Tally host for reference)
- **Read-only finance:** `app/receivables/page.tsx` → `GET /api/finance/queue` → Supabase SELECT only
- `app/finance/page.tsx`, `app/finance-dashboard/page.tsx` — navigation shells; no write paths
- KPI calculation stays in Google Sheet `01_Dashboard`

---

## Deployment checklist

1. Paste `Code.gs` → Apps Script → Deploy web app (new version, same URL)
2. Script Properties or CONFIG for secrets
3. **On WSIPL-89-72:** Run `Install-TallySync.bat` as Administrator
4. Verify: `06_Finance_Sync` rows, `00_Sync_Status` tally log, finance KPIs update on dashboard
5. `node scripts/resume-hub-setup.mjs` from dev machine after deploy
