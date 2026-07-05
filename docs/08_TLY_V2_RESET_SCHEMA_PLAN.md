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

## v2 expense heads generated

Current `expense_heads_v2` controlled head distribution:
- `unclassified`: 734 rows
- `bank_cash`: 611 rows
- `purchase`: 163 rows
- `gst`: 264 rows
- `salary`: 111 rows
- `staff`: 29 rows
- `porter`: 17 rows
- `freight`: 9 rows

TLY-07 next task: reduce the high `unclassified` bucket by improving ledger/head mapping.

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

## New v2 tables created

### tally_raw_responses_v2
Stores raw Tally XML response per request.
Columns:
- id
- sync_run_id
- company_name
- report_key
- request_xml
- response_xml
- response_status
- error_message
- from_date
- to_date
- created_at

### tally_sync_runs_v2
Clean sync run tracking for v2.
Columns:
- id
- started_at
- finished_at
- status
- company_name
- from_date
- to_date
- requested_reports
- parsed_counts
- inserted_counts
- updated_counts
- error_count
- errors
- qc_status

### tally_ledgers_v2
Ledger master table.
Columns include:
- id
- company_name
- ledger_name
- parent_group
- primary_group
- opening_balance
- closing_balance
- classification
- updated_at

### tally_parties_v2
Party/customer/vendor table derived from ledger master, not fake transactions.
Columns include:
- id
- company_name
- party_name
- ledger_name
- party_type
- gst_no
- opening_balance
- closing_balance
- receivable_balance
- payable_balance
- qc_status
- updated_at

### tally_vouchers_v2
Voucher header table.
Columns include:
- id
- company_name
- voucher_guid
- voucher_key
- voucher_no
- voucher_type
- voucher_date
- party_name
- party_ledger_name
- reference_no
- narration
- gst_no
- voucher_value
- debit_total
- credit_total
- balance_status
- source_report
- created_at
- updated_at

### tally_voucher_lines_v2
Voucher ledger line table.
Columns include:
- id
- voucher_id
- company_name
- voucher_key
- voucher_no
- voucher_type
- voucher_date
- ledger_name
- party_name
- line_type
- amount_signed
- debit
- credit
- item_name
- quantity
- rate
- gst_rate
- tax_amount
- head_key
- created_at

### finance_heads_v2
Owner report heads.
Columns include:
- id
- company_name
- head_key
- head_label
- status
- source_table
- row_count
- amount
- from_date
- to_date
- generated_at
- qc_status

### expense_heads_v2
Controlled expense channelization.
Columns include:
- id
- company_name
- head_key
- head_label
- party_name
- ledger_name
- voucher_count
- total_debit
- total_credit
- total_amount
- month
- from_date
- to_date
- generated_at

### reconciliation_issues_v2
QC/reconciliation issue table.
Columns include:
- id
- company_name
- issue_type
- severity
- table_name
- record_key
- issue
- expected_value
- actual_value
- status
- created_at
- resolved_at

### owner_finance_snapshot_v2
Owner-facing clean summary.
Columns include:
- id
- company_name
- from_date
- to_date
- sales_total
- purchase_total
- receipt_total
- payment_total
- receivable_total
- payable_total
- bank_cash_total
- gross_profit
- net_profit
- balance_sheet_status
- qc_status
- generated_at

## Tally request fields to fetch

Voucher collection should fetch:
- GUID
- DATE
- VOUCHERTYPENAME
- VOUCHERNUMBER
- REFERENCE
- PARTYLEDGERNAME
- PARTYGSTIN
- NARRATION
- ALLLEDGERENTRIES.LIST
- LEDGERNAME
- AMOUNT
- BILLALLOCATIONS.LIST

Inventory product details should be optional. Owner totals should not depend on product rows.

Ledger collection should fetch:
- NAME
- PARENT
- OPENINGBALANCE
- CLOSINGBALANCE
- GSTREGISTRATIONNO
- MAILINGNAME
- EMAIL
- LEDGERMOBILE
- ADDRESS.LIST

## Owner UI rule

Owner UI must only read v2 clean tables or canonical v2 views. Never read staging/raw audit tables directly.

## Migration strategy

1. Create v2 tables in parallel. ✅ Done
2. Backfill v2 tables from current canonical Tally tables. ✅ Done
3. Generate v2 finance heads, expense heads, owner snapshot, and reconciliation issues. ✅ Done
4. Create parser/sync write path into v2 tables. Next
5. Compare v2 totals against current canonical Tally tables.
6. Point APIs to v2 views.
7. Keep old tables read-only for audit.
8. Delete old polluted tables only after backup and signoff.
