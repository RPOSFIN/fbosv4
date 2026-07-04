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
- `9e9ae31` — Add TLY-05 report head status helpers
- `f09973a` — Add TLY-05 head status API
- `a0c0fbc` — Show TLY-05 head status on finance matrix

### Verified locally by user
- `npm.cmd run typecheck` passed
- `npm.cmd run build` passed
- Next.js build shows `/api/finance/tally/head-status`
- Existing warnings are non-blocking:
  - `middleware` convention deprecated
  - Turbopack NFT tracing warning from EngineeringOS checkpoint route

### New API
`GET /api/finance/tally/head-status`

### Latest TLY-05 status from local API
- `bank_cash` — `derived` — 4618 rows from `tally_voucher_lines`
- `profit_loss` — `derived` — canonical formula based
- `balance_sheet` — `unavailable` — structured parser/report builder still needed
- `receivables` — `derived` — 265 rows from `tally_parties`
- `payables` — `derived` — 265 rows from `tally_parties`
- `ledger` / DR-CR — `synced` — 379 ledgers

### UI state
`/finance-dashboard` top FinanceOS Matrix Heads now shows:
- bigger hero cards
- stronger color blocks
- larger financial numbers
- TLY-05 status badges for P&L, Bank/Cash, Receivables, Payables, Ledger DR/CR, Balance Sheet
- no fake Balance Sheet net-worth when structured Balance Sheet is unavailable

### Important data rule
Owner-facing UI must show `synced`, `derived`, or `unavailable` for finance heads. Do not show fake final values for unavailable reports.

### Next recommended task
Start with Balance Sheet parser/report builder because it is the only TLY-05 head currently `unavailable`.

Suggested sequence:
1. Inspect Tally XML builder/report definition for `balance_sheet`.
2. Capture raw Balance Sheet response shape from Tally.
3. Add parser support for structured Balance Sheet rows.
4. Persist parsed rows/report metadata.
5. Flip `/api/finance/tally/head-status` for `balance_sheet` from `unavailable` to `synced` only after real rows are parsed.

### Local verification commands
```powershell
cd "D:\all in one fbos files\FBOSV01\FBOS_V01\fbos-v1"

git pull origin fbosv4-recovery
npm.cmd run typecheck
npm.cmd run build
```

### Local API check
```powershell
Invoke-RestMethod "http://localhost:3000/api/finance/tally/head-status" | ConvertTo-Json -Depth 10
```
