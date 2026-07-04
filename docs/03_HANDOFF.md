# Handoff Protocol: Sync with production branch

## Engineering Checkpoints (ECP)
<!-- ECP:LATEST -->
**Last Engineering Checkpoint: ECP-0001 — 2026-06-26T19:07:52.571Z — fbosv4-dev @ 5f2d1c7 (sprint: Sales Workbench Active)**
<!-- /ECP:LATEST -->

## Latest 3R (EngineeringOS)
<!-- 3R:LATEST -->
**Latest 3R: 3r-fbos4-2026-07-04-ecp-0006-5216 — ECP-0006 — fbosv4-recovery @ bf8f03f — 2026-07-04T14:06:15.216Z (auto)**
<!-- /3R:LATEST -->

## Active Handoff — TLY-05 FinanceOS / Tally Heads

### Current branch
`fbosv4-recovery`

### Latest finance commits
- `9484528` — Update handoff after TLY-05 balance sheet start
- `1846489` — Mark Balance Sheet as derived from ledgers
- `aa29a9b` — Add TLY-05 balance sheet API
- `22f8522` — Add TLY-05 balance sheet builder
- `9e9ae31` — Add TLY-05 report head status helpers
- `f09973a` — Add TLY-05 head status API
- `a0c0fbc` — Show TLY-05 head status on finance matrix

### Verified locally by user
- `git pull origin fbosv4-recovery` fast-forwarded local branch from `f09973a` to `9484528`
- `npm.cmd run typecheck` passed
- `npm.cmd run build` passed
- Next.js build showed `/api/finance/tally/balance-sheet`
- Next.js build showed `/api/finance/tally/head-status`
- Existing warnings are non-blocking:
  - `middleware` convention deprecated
  - Turbopack NFT tracing warning from EngineeringOS checkpoint route

### Verified local API responses
- `GET /api/finance/tally/head-status`
  - `bank_cash` — `derived` — 4618 rows from `tally_voucher_lines`
  - `profit_loss` — `derived` — canonical formula based
  - `balance_sheet` — `derived` — 19 rows from `tally_ledgers`
  - `receivables` — `derived` — 265 rows from `tally_parties`
  - `payables` — `derived` — 265 rows from `tally_parties`
  - `ledger` / DR-CR — `synced` — 379 rows from `tally_reports`
- `GET /api/finance/tally/balance-sheet`
  - status: `derived`
  - source: `tally_ledgers`
  - row_count: 19
  - sections: `assets`, `liabilities`, `equity`, `unclassified`
  - totals from local response:
    - assets: `-3461355.875`
    - liabilities: `1611619.8434999995`
    - equity: `72000`
    - unclassified: `-36264381.111`

### New / updated APIs
- `GET /api/finance/tally/head-status`
- `GET /api/finance/tally/balance-sheet`

### Latest TLY-05 status
- `bank_cash` — `derived` — rows from `tally_voucher_lines`
- `profit_loss` — `derived` — canonical formula based
- `balance_sheet` — `derived` — grouped from synced `tally_ledgers`; **not synced/final yet**
- `receivables` — `derived` — rows from `tally_parties`
- `payables` — `derived` — rows from `tally_parties`
- `ledger` / DR-CR — `synced` — ledger report available

### TLY-05 Balance Sheet start
- Added `lib/tally/canonical/balance-sheet.ts`
- Added `app/api/finance/tally/balance-sheet/route.ts`
- Updated `lib/tally/canonical/head-status.ts` so Balance Sheet becomes `derived` when ledger-derived groups are available
- Builder excludes P&L groups from Balance Sheet buckets
- Builder emits sections: `assets`, `liabilities`, `equity`, `unclassified`
- Local API confirmed 19 non-P&L groups from `tally_ledgers`
- Large `Primary`/unclassified group still needs Tally parser cleanup or ledger group mapping

### UI state
`/finance-dashboard` top FinanceOS Matrix Heads now shows:
- bigger hero cards
- stronger color blocks
- larger financial numbers
- TLY-05 status badges for P&L, Bank/Cash, Receivables, Payables, Ledger DR/CR, Balance Sheet
- no fake Balance Sheet net-worth when structured Balance Sheet is unavailable

### Important data rule
Owner-facing UI must show `synced`, `derived`, or `unavailable` for finance heads. Do not show fake final values for unavailable reports. Balance Sheet may show derived grouped ledger rows, but must not be marked `synced` until real structured Tally Balance Sheet rows are parsed.

### Next recommended task
Continue Balance Sheet parser/report builder hardening.

Suggested sequence:
1. Fix Tally XML builder/report definition for `balance_sheet`; current Supabase raw preview shows `<RESPONSE>Unknown Request, cannot be processed</RESPONSE>`.
2. Capture raw Balance Sheet response shape from Tally.
3. Add parser support for structured Balance Sheet rows.
4. Persist parsed rows/report metadata in `tally_reports`.
5. Map or correct the large `Primary`/unclassified ledger group.
6. Flip `/api/finance/tally/head-status` for `balance_sheet` from `derived` to `synced` only after real rows are parsed.

### Local verification commands
```powershell
cd "D:\all in one fbos files\FBOSV01\FBOS_V01\fbos-v1"

git pull origin fbosv4-recovery
npm.cmd run typecheck
npm.cmd run build
```

### Local API checks
```powershell
Invoke-RestMethod "http://localhost:3000/api/finance/tally/head-status" | ConvertTo-Json -Depth 10
Invoke-RestMethod "http://localhost:3000/api/finance/tally/balance-sheet" | ConvertTo-Json -Depth 10
```
