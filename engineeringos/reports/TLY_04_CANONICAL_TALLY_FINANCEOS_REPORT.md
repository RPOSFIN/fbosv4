# TLY-04 Canonical Tally FinanceOS Report

Date: 2026-07-04
Branch: fbosv4-recovery

## Result

Canonical Tally to Supabase to FinanceOS pipeline implemented and validated for live Sales sync.

Full multi-report live sync is implemented in code, but only the Sales report was executed during this validation run.

## Files Changed

- app/finance-dashboard/page.tsx
- app/api/finance/matrix/route.ts
- app/api/finance/tally/reports/route.ts
- app/api/finance/tally/sync/route.ts
- app/api/finance/tally/diagnostics/route.ts
- app/api/finance/tally/metrics/route.ts
- app/api/finance/tally/expenses/route.ts
- app/api/finance/tally/parties/route.ts
- app/api/finance/tally/vouchers/route.ts
- components/finance/tally/canonical-tally-dashboard.tsx
- components/finance/charts/simple-bar-chart.tsx
- lib/tally/canonical/tally-types.ts
- lib/tally/canonical/queries.ts
- lib/tally/canonical/sync.ts
- lib/tally/reports/definitions.ts
- lib/tally/reports/xml-builders.ts
- lib/tally/parser/xml.ts
- lib/tally/parser/canonical-parser.ts
- lib/tally/formulas/canonical-finance.ts
- lib/tally/diagnostics/tally-diagnostics.ts

## Migrations Used

- supabase/migrations/013_create_canonical_tally_finance_tables.sql
- supabase/migrations/014_harden_clickup_sales_ssot.sql was pulled from origin but not authored as part of this Tally implementation.

## APIs Added

- GET /api/finance/tally/reports
- POST /api/finance/tally/sync
- GET /api/finance/tally/diagnostics
- GET /api/finance/tally/metrics
- GET /api/finance/tally/expenses
- GET /api/finance/tally/parties
- GET /api/finance/tally/vouchers

Existing:

- GET /api/finance/tally/summary
- GET /api/tally/test
- GET /api/tally/status

## Formulas Implemented

- Total Sales from Sales vouchers
- Total Purchase from Purchase vouchers
- Collections from Receipt vouchers
- Payments from Payment vouchers
- Receivables as Sales minus Receipts, with caveat until outstanding report is synced
- Payables as Purchase minus Payments, with caveat until outstanding report is synced
- Cashflow as Receipts minus Payments
- Gross Profit as Sales minus Purchase
- Net Profit as derived gross profit until structured Tally P&L is available
- Bank/Cash movement from canonical voucher lines
- Expense summaries from canonical voucher lines only

## Validation Commands

- git pull --ff-only origin fbosv4-recovery: PASS
- npm.cmd run typecheck: PASS
- npm.cmd run build: PASS with pre-existing middleware/proxy and EngineeringOS trace warnings
- npm.cmd run db:verify: PASS
- npm.cmd run dev: PASS on temporary local dev server

## Live Endpoint Validation

- GET /api/tally/test: PASS, live Tally active at configured host and port
- GET /api/tally/status: PASS, live Tally active
- POST /api/finance/tally/sync: PASS for Sales
- GET /api/finance/tally/metrics: PASS
- GET /api/finance/tally/reports?report=sales: PASS
- GET /api/finance/tally/reports?report=expenses: PASS
- GET /api/finance/tally/reports?report=party_summary: PASS
- GET /api/finance/tally/reports?report=bank_cash: PASS
- GET /api/finance/tally/reports?report=profit_loss: PASS
- GET /api/finance/tally/expenses: PASS
- GET /api/finance/tally/parties: PASS
- GET /api/finance/tally/vouchers: PASS after replacing large voucher-id query with filtered line query
- GET /api/finance/tally/diagnostics: PASS
- GET /api/dashboard/kpi: PASS

## Before / After Counts

Before this run, canonical Tally tables existed but FinanceOS did not have the complete live canonical API/UI pipeline in this checkout.

After live Sales sync:

- parsed Sales vouchers: 1515
- canonical Sales voucher query count: 1514
- inserted/updated parties: 162
- inserted/updated voucher lines: 5210
- generated expense summary rows: 215

## Invoice Count vs 778

Expected Sales invoice count from 2024-04-01 to 2026-07-04: 778

Actual canonical Sales count from live sync: 1514

Status: MISMATCH DIAGNOSED

Diagnostic inserted in tally_ai_diagnostics with expected_count, actual_count, company, date range, endpoint, and suggestion.

## Reports Synced

- Sales: synced live and persisted into canonical tables

## Reports Not Fully Live-Verified

The sync engine has report definitions and XML builders for:

- Purchase
- Receipt
- Payment
- Journal
- Contra
- Debit Note
- Credit Note
- Bank/Cash
- Ledger
- Profit & Loss
- Balance Sheet
- Receivables
- Payables
- Expenses
- Party Summary
- Person/Vendor Withdrawal Summary

These were not all executed as live sync requests during this validation pass.

## AI Diagnostics

Diagnostics are written to tally_ai_diagnostics for:

- Sales invoice count mismatch
- Missing canonical XML fields
- Zero-row reports
- Tally gateway failures
- Report sync errors

## FinanceOS UI Expected Behavior

- /finance-dashboard now renders the canonical Tally FinanceOS dashboard.
- Date range filters drive all canonical API calls.
- Report dropdown uses canonical report definitions.
- Party/person/vendor filter is populated from canonical party rows.
- Ledger filter is populated from canonical voucher lines and expense summaries.
- Voucher type filter applies to canonical voucher reads.
- Summary cards show canonical metrics.
- Voucher table reads tally_vouchers.
- Voucher lines table reads tally_voucher_lines.
- Expense table reads tally_expense_summary.
- Party table reads tally_parties.
- Charts are generated from canonical metrics, time series, and expenses.
- Diagnostics cards read tally_ai_diagnostics and show AI suggestions.

## Remaining Limitations

- Full multi-report live sync was not executed in this validation run.
- Current P&L and Balance Sheet values remain derived/unavailable until Tally returns structured report rows for those reports.
- The expected Sales count of 778 does not match the live canonical count of 1514; this is diagnosed, not silently accepted.
- Existing Next.js warnings remain: middleware convention deprecation and EngineeringOS checkpoint route trace warning.

## GO / NO-GO

FBOS module development: GO

Full Tally finance parity claim: NO-GO until the invoice-count mismatch and all report-type live syncs are reviewed.
