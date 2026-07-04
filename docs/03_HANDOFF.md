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
- `1846489` — Mark Balance Sheet as derived from ledgers
- `aa29a9b` — Add TLY-05 balance sheet API
- `22f8522` — Add TLY-05 balance sheet builder
- `9e9ae31` — Add TLY-05 report head status helpers
- `f09973a` — Add TLY-05 head status API
- `a0c0fbc` — Show TLY-05 head status on finance matrix

### Verified locally by user
- Previous `npm.cmd run typecheck` passed before Balance Sheet builder changes
- Previous `npm.cmd run build` passed before Balance Sheet builder changes
- Previous Next.js build showed `/api/finance/tally/head-status`
- Existing warnings were non-blocking:
  - `middleware` convention deprecated
  - Turbopack NFT tracing warning from EngineeringOS checkpoint route

### New / updated APIs
- `GET /api/finance/tally/head-status`
- `GET /api/finance/tally/balance-sheet`

### Latest TLY-05 status
- `bank_cash` — `derived` — rows from `tally_voucher_lines`
- `profit_loss` — `derived` — canonical formula based
- `balance_sheet` — `derived` — grouped from synced `tally_ledgers`; **not synced/final yet**
- `receivables` — `derived` — rows from `tally_parties`
- `payables` — `derived` — rows from `tally_parties`
- `ledger` / DR-CR — `synced` — ledger masters available

### TLY-05 Balance Sheet start
- Added `lib/tally/canonical/balance-sheet.ts`
- Added `app/api/finance/tally/balance-sheet/route.ts`
- Updated `lib/tally/canonical/head-status.ts` so Balance Sheet becomes `derived` when ledger-derived groups are available
- Builder excludes P&L groups from Balance Sheet buckets
- Builder emits sections: `assets`, `liabilities`, `equity`, `unclassified`
- Supabase dry-run produced 19 non-P&L groups from `tally_ledgers`
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
1. Run `npm.cmd run typecheck` and `npm.cmd run build` locally after the new Balance Sheet files.
2. Call `GET /api/finance/tally/balance-sheet` locally and inspect grouped rows.
3. Fix Tally XML builder/report definition for `balance_sheet`; current Supabase raw preview shows `<RESPONSE>Unknown Request, cannot be processed</RESPONSE>`.
4. Capture raw Balance Sheet response shape from Tally.
5. Add parser support for structured Balance Sheet rows.
6. Persist parsed rows/report metadata in `tally_reports`.
7. Flip `/api/finance/tally/head-status` for `balance_sheet` from `derived` to `synced` only after real rows are parsed.

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
