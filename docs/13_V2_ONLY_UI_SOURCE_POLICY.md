# V2 Only UI Source Policy

## Decision

Finance owner UI must use FinanceOS v2 tables/views only.

Do not read old pre-v2 staging or raw/audit tables for owner totals.

## Allowed owner UI sources

- finance_heads_v2
- expense_heads_v2 where qc_status is ok
- v_expense_heads_owner_clean_v2
- owner_finance_snapshot_v2
- tally_vouchers_v2 only through approved clean rules
- tally_ledgers_v2
- tally_parties_v2

## Forbidden owner UI sources

- finance_import_queue
- finance_transactions

These old tables are legacy/audit only and must not feed dashboard cards, P&L, working capital, cashflow, sales rows, or purchase rows.

## Current API status

The matrix API has been patched to read from finance_heads_v2 instead of finance_import_queue.

Route:
- app/api/finance/matrix/route.ts

Patch commit:
- 468c0c9 Use v2 finance heads for matrix API

## Local refresh requirement

If the local dashboard still shows old values such as Sales rows 537, the local server is still running old code or cache.

Run locally:

```powershell
git pull origin fbosv4-recovery
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev
```

Then hard refresh browser with Ctrl + F5.

## Archive/delete policy

Do not delete legacy tables until backup/signoff.

Recommended status:
- finance_import_queue: legacy audit only
- finance_transactions: legacy audit only

If deletion is approved later, first export or create backup copies, then drop old tables.
