# TLY v2 Reset Schema Plan

## Decision

Existing FinanceOS tables are polluted by staging, failed, fake, and legacy rows. Do not delete immediately. Keep them as audit history and build FinanceOS v2 clean tables in parallel.

## Current status

TLY v2 schema is created in Supabase and core v2 tables are backfilled from current canonical Tally data.

Verified v2 source rows:
- `tally_vouchers_v2`: 6533
- `tally_voucher_lines_v2`: 16582
- `tally_ledgers_v2`: 379
- `tally_parties_v2`: 265

Generated v2 derived rows:
- `finance_heads_v2`: 10
- `expense_heads_v2`: 1938
- `owner_finance_snapshot_v2`: 1
- `reconciliation_issues_v2`: 150

Next step: create parser/sync write path into v2 tables, then point owner APIs/UI to v2 views.

## TLY-07 Expense Head Channelization

Round 1 mapping applied in Supabase.

Mapped large unclassified vendor/material rows into:
- `vendor_purchase`
- `technology`
- `professional_services`
- `advertising`

Latest `expense_heads_v2` distribution:
- `vendor_purchase`: 399 rows
- `bank_cash`: 611 rows
- `purchase`: 163 rows
- `gst`: 264 rows
- `unclassified`: 272 rows
- `salary`: 111 rows
- `professional_services`: 36 rows
- `technology`: 20 rows
- `staff`: 29 rows
- `advertising`: 7 rows
- `porter`: 17 rows
- `freight`: 9 rows

Unclassified reduced from 734 rows to 272 rows.

TLY-07 next task: inspect remaining unclassified rows and add second round mapping for rent, loans, owner drawings, advances, adjustments, and other overheads.

## v2 finance heads generated

Current `finance_heads_v2` includes:
- `sales` — synced from `tally_vouchers_v2`
- `purchase` — synced from `tally_vouchers_v2`
- `receipts` — synced from `tally_vouchers_v2`
- `payments` — synced from `tally_vouchers_v2`
- `ledger` — synced from `tally_ledgers_v2`
- `bank_cash` — derived from `tally_ledgers_v2`
- `receivables` — derived from `tally_parties_v2`
- `payables` — derived from `tally_parties_v2`
- `profit_loss` — derived from `tally_vouchers_v2`
- `balance_sheet` — derived from `tally_ledgers_v2`

All heads are currently `qc_status = needs_review` until reconciliation issues are resolved.

## v2 reconciliation issues generated

Current `reconciliation_issues_v2`:
- `voucher_balance_mismatch`: 108
- `missing_party`: 41
- `missing_voucher_date`: 1

These are warnings for QC review. Balanced debit/credit rows are not errors.

## Core principle

Tally provides accounting facts. FBOS decides storage schema, validation rules, owner heads, and UI.

Do not use staging tables for owner totals.

## Keep as raw audit only

- finance_import_queue
- finance_transactions

These should not feed owner totals.

## Keep as canonical source if parsed correctly

- tally_vouchers
- tally_voucher_lines
- tally_ledgers
- tally_parties
- tally_reports
- tally_sync_runs

## Owner UI rule

Owner UI must only read v2 clean tables or canonical v2 views. Never read staging/raw audit tables directly.

## Migration strategy

1. Create v2 tables in parallel. ✅ Done
2. Backfill v2 tables from current canonical Tally tables. ✅ Done
3. Generate v2 finance heads, expense heads, owner snapshot, and reconciliation issues. ✅ Done
4. Channelize expense heads. In progress
5. Create parser/sync write path into v2 tables. Next
6. Compare v2 totals against current canonical Tally tables.
7. Point APIs to v2 views.
8. Keep old tables read-only for audit.
9. Delete old polluted tables only after backup and signoff.
