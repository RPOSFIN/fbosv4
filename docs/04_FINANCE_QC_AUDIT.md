# FinanceOS QC Audit — TLY-05

## Scope
This audit covers FinanceOS/Tally data quality, table counts, owner UI rules, and the next fixes requested after Balance Sheet derived status.

## Table row counts observed in Supabase
- `finance_transactions`: 9998
- `tally_voucher_lines`: 16582
- `tally_vouchers`: 6533
- `finance_import_queue`: 1553
- `tally_ledgers`: 379
- `tally_parties`: 265
- `tally_reports`: 20
- `tally_expense_summary`: 199
- `tally_ai_diagnostics`: 39
- `tally_sync_runs`: 12

## Fix applied after user screenshot review

### Sundry Debtors / Creditors not picked
Confirmed problem:
- `tally_parties` had 247 blank `party_type` rows.
- 254 parties matched `tally_ledgers` by ledger name.
- 250 matched ledgers were under `Sundry Debtors` or `Sundry Creditors`.

Applied Supabase data fix:
- Filled missing `tally_parties.party_type` from matched `tally_ledgers.group_name`.
- Also filled opening/closing balance from ledgers when missing.

Post-fix count:
- `tally_parties`: 265 rows
- missing `party_type`: 15
- `Sundry Debtors`: 170
- `Sundry Creditors`: 80

Applied Supabase guard:
- Migration `fill_tally_party_type_from_ledgers`
- Trigger: `trg_fill_tally_party_type_from_ledgers`
- Future inserts/updates on `tally_parties` auto-fill missing `party_type`, opening balance, and closing balance from matching `tally_ledgers`.

### Debit / credit / amount same
Confirmed problem:
- `tally_vouchers`: 6533 rows
- `amount = debit_total = credit_total`: 6425 rows
- `debit_total = credit_total`: 6425 rows
- `debit_total <> credit_total`: 108 rows

By source report:
- `party_withdrawal`: 3026 rows, 3023 balanced, 3 mismatch
- `sales`: 1514 rows, 1460 balanced, 54 mismatch
- `receipt`: 1358 rows, 1358 balanced, 0 mismatch
- `purchase`: 635 rows, 584 balanced, 51 mismatch

Rule:
- In Tally double-entry, debit total and credit total being equal is normal.
- Owner UI must not show `amount`, `debit_total`, and `credit_total` side-by-side as three independent values when they are the same.
- Label `amount` as voucher value, label debit/credit as balanced sides, and show mismatch count as QC.
- The 108 debit/credit mismatch rows should be a reconciliation warning.

## Critical data-quality findings

### 1. finance_import_queue is not owner-safe
Observed grouped QC:
- `failed / sales`: 1514 rows
- all 1514 have `amount` null/zero
- all 1514 missing `voucher_no`
- all 1514 missing `ledger_name`
- all 1514 missing `party_name`

Rule:
- Owner UI must not use failed queue rows for totals.
- Queue rows with zero amount and missing party/ledger/voucher identifiers should be rejected or quarantined.
- Product-level detail rows are not required for owner totals; keep only voucher/ledger/head totals.

### 2. finance_transactions has polluted failed/synced rows
Observed grouped QC:
- `failed / receivable`: 3458 rows, all missing `voucher_date`, `party_name`, `ledger_name`, and debit equals credit.
- `failed / sales`: 1516 rows, all zero amount and missing party/ledger.
- `failed / voucher`: 728 rows, all missing date/party/ledger.
- `failed / payable`: 567 rows, all missing date/party/ledger.
- `synced / sales`: 3026 rows but all have zero amount; this is not owner-safe.

Rule:
- `sync_status=failed` must never contribute to totals.
- `amount=0` on synced sales should be treated as QC error unless it is a proven adjustment voucher.
- Rows missing voucher date, party, or ledger should not pass reconciliation.

### 3. tally_voucher_lines is the strongest source table right now
Observed QC:
- total rows: 16582
- amount null/zero: 4
- missing voucher date: 0
- missing voucher no: 347
- missing ledger: 4
- missing party: 3

Rule:
- Prefer `tally_voucher_lines` / `tally_vouchers` over `finance_import_queue` and `finance_transactions` for owner totals until import queue is rebuilt.

### 4. tally_parties field coverage
Original QC:
- rows: 265
- `party_type` null/blank: 247
- `gst_no` null/blank: 69
- `email` null/blank: 265
- `opening_balance` null: 247
- `opening_balance` zero: 18
- payroll rows: 0

After fix:
- `party_type` null/blank: 15
- `Sundry Debtors`: 170
- `Sundry Creditors`: 80

Rule:
- Hide email from owner UI unless it becomes a required/available field.
- `party_type=null` should not be shown as an error in owner UI; show dash or infer from ledger group when available.
- Opening balance null and zero are different states; UI must not convert null to fake zero.

### 5. tally_ledgers findings
Observed QC:
- rows: 379
- ledger name null: 0
- group null: 0
- closing balance null: 40
- sale/GST 18-like ledgers: 7

Observed 18% ledgers:
- `Input IGST @18%` under `GST`
- `Output IGST @ 18%` under `GST`
- `Purchase 18%` under `Purchase Accounts`
- `Sale  18%` under `Sales Accounts`
- `SALE IGST @ 18%` under `Sales Accounts`
- `SALE LOCAL GST @ 18%` under `Sales Accounts`
- `SALE RETURN IGST @ 18%` under `Sales Accounts`

Rule:
- Head classification must avoid word conflicts: GST outward/inward should not be merged with salary/staff/porter/freight heads.
- Sales 18% and GST 18% are valid ledger names; do not flag as ledger-name error just because of `18%`.

### 6. tally_reports row_count and missing_field_count
Observed:
- Structured voucher reports have row counts and missing-field counts based on parser findings.
- `balance_sheet`, `profit_loss`, `bank_cash`, `receivables`, and `payables` had `row_count=0` because older XML request returned `<RESPONSE>Unknown Request, cannot be processed</RESPONSE>`.

Rule:
- `row_count=0` plus `structured_rows` missing means report request/parser failed, not necessarily bad Tally accounting entry.
- `missing_field_count` should be used as QC signal, not owner-facing blame.

### 7. tally_expense_summary is currently mis-channelized
Observed top categories include party/vendor names and mixed heads:
- `RECEIVED IN ADVANCE`
- `MANDAKNI BEVERAGES`
- `Purchase 18%`
- vendor/customer names

Rule:
- Expense summary must channelize into controlled heads: salary, staff, porter, freight, GST inward/outward, bank, cash, purchase, sales, reconciliation, unclassified.
- Decimal float artifacts must be rounded for owner UI.

### 8. tally_ai_diagnostics must be a QC gate
Observed diagnostics:
- 39 open warnings
- modules include sales, balance_sheet, profit_loss, bank_cash, payables, receivables, purchase, expenses, ledger, etc.

Rule:
- If diagnostics are open, FinanceOS should show QC warning.
- Final/synced owner figures should require QC pass or clear derived/synced labels.

## Owner UI rules requested
- Sort option default should be visible and controlled.
- Time period should have calendar/preset options.
- Head dropdown needed: salary, staff, porter, GST outward/inward, freight, reconciliation, etc.
- Search box must filter visible tables, not only API fetch filters.
- Time stamp is not required in owner UI; hide generated/last sync timestamps from top cards.
- Null values must show as blank/dash, not zero.
- Do not show fake values for unavailable reports.
- Balance Sheet can remain derived until real structured Tally report parses.

## Next code tasks
1. Patch `components/finance/tally/canonical-tally-dashboard.tsx`:
   - add `sortBy` state and default `amount_desc`
   - add `period` preset selector and keep existing date inputs
   - add `search` state that filters voucher, expense, and party tables client-side
   - add `expenseHead` dropdown for salary/staff/porter/GST/freight/reconciliation
   - hide generated/last sync timestamps in owner meta
   - make money/null formatter return dash for null/undefined/blank
   - round money display to owner-safe values
   - show debit/credit mismatch count as QC instead of treating all balanced vouchers as error
2. Patch `components/finance/tally/legacy-matrix-heads.tsx`:
   - make null values show dash, not zero
   - keep Balance Sheet net worth unavailable unless synced
3. Rebuild `tally_expense_summary` classification:
   - controlled head mapping
   - vendor names should be party/vendor column, not category/head
4. Rebuild or quarantine `finance_import_queue` and `finance_transactions` bad rows:
   - reject failed/zero placeholder rows from owner metrics
   - prefer canonical Tally tables for totals
5. Add reconciliation checks:
   - missing voucher date
   - missing party name
   - missing ledger name
   - debit/credit mismatch rows only; do not fail balanced double-entry rows
   - amount zero on synced sales
6. Continue Balance Sheet XML/parser work:
   - verify `93c6539` XML request against local Tally
   - parse structured Balance Sheet rows only after real XML response is captured
