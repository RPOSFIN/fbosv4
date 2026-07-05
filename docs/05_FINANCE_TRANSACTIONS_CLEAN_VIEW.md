# Finance Transactions Clean Views

## Why failed rows still show

`public.finance_transactions` is the raw audit table. Supabase Table Editor will still show `failed` rows there.

Owner UI and totals must not read raw `finance_transactions` directly.

## Supabase views added

### `public.v_finance_transactions_owner_clean`

Owner-safe rows only. Excludes:
- `sync_status = failed`
- null or zero amount
- missing voucher date
- missing party name
- missing ledger name

### `public.v_finance_transactions_qc_rejects`

Rejected rows with `qc_reasons` array.

QC reasons include:
- `sync_failed`
- `amount_missing_or_zero`
- `voucher_date_missing`
- `party_name_missing`
- `ledger_name_missing`

## Counts after migration

- raw `finance_transactions`: 9998 rows
- `v_finance_transactions_owner_clean`: 104 rows
- `v_finance_transactions_qc_rejects`: 9894 rows

## Rule

Failed rows stay in raw DB for audit, but must not contribute to FinanceOS owner totals.

Use canonical Tally tables first:
- `tally_vouchers`
- `tally_voucher_lines`
- `tally_ledgers`
- `tally_parties`

Use `v_finance_transactions_owner_clean` only when transaction-level finance view is needed.
