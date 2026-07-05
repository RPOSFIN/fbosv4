# TLY-07 Expense Head QC Results

## Status

TLY-07 SQL migration was run manually in Supabase SQL Editor.

It rebuilt `expense_heads_v2` from `tally_voucher_lines_v2` joined with `tally_ledgers_v2`, using ledger group, voucher type, ledger name, and party name.

## Key result

Ordinary `unclassified` has been replaced by explicit review buckets.

Owner-safe view:
- `v_expense_heads_owner_clean_v2`

Review queue view:
- `v_expense_heads_needs_review_v2`

## Owner clean vs review

- `owner_clean`: 2559 rows, amount 259765879.01
- `needs_review`: 1082 rows, amount 129833429.11

## Confirmed owner-clean heads

- `bank_cash`: 1181 rows, 122791688.31
- `vendor_purchase`: 175 rows, 83618856.31
- `purchase`: 163 rows, 36402573.86
- `gst`: 274 rows, 7222080.71
- `salary`: 152 rows, 6370145.10
- `direct_expense`: 66 rows, 1278948.86
- `staff`: 71 rows, 479463.33
- `professional_services`: 17 rows, 348630.00
- `write_off`: 34 rows, 343824.28
- `technology`: 8 rows, 230855.20
- `gst_outward`: 10 rows, 195878.00
- `freight`: 49 rows, 139117.12
- `fixed_assets`: 8 rows, 137943.88
- `reconciliation`: 313 rows, 130982.61
- `statutory_receivable`: 11 rows, 46274.00
- `statutory`: 11 rows, 25043.00
- `porter`: 16 rows, 3574.44

## Review buckets

- `needs_review_debtor`: 669 rows, 103699655.65
- `needs_review`: 276 rows, 17105668.96
- `needs_review_creditor`: 135 rows, 8704075.50
- `needs_review_loans_advances`: 2 rows, 324029.00

## Interpretation

TLY-07 is now much safer than the earlier keyword-only mapping:

- Confirmed heads are separated into `qc_status = ok`.
- Ambiguous debtor/creditor/loan/payment rows are not silently mixed into owner expense totals.
- Owner UI should read `v_expense_heads_owner_clean_v2` by default.
- Review UI should read `v_expense_heads_needs_review_v2`.

## Remaining work before full close

The database migration is done. The application sync/parser code still needs to be updated so the same ledger-group classifier runs automatically on fresh Tally syncs.

Until code is updated, future syncs may require rerunning this SQL migration to rebuild `expense_heads_v2`.
