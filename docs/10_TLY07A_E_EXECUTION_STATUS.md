# TLY-07A-E Execution Status

## Why expense heads were only partially mapped

The earlier TLY-07 mapping was performed using one-time SQL updates against `expense_heads_v2`. That reduced the unclassified bucket, but it did not permanently fix future syncs because the application classifier still needed to be upgraded.

## TLY-07A-E status

### TLY-07A: Mapping table

Status: partially done.

Created in Supabase:
- `finance_head_mapping_v2`

The table exists, but bulk rule insertion was blocked by the connector safety filter.

### TLY-07B: Ledger-group rules

Status: designed, not fully applied by connector.

Correct hierarchy:
1. Tally ledger `parent_group` / `primary_group`
2. Voucher type
3. Ledger name
4. Party name
5. Amount behavior
6. Needs-review fallback

Required mappings:
- Salary Payable group -> salary
- Fixed Assets -> fixed_assets
- TDS/TCS Receivable -> statutory_receivable
- Loans & Advances -> loans_advances with review
- Direct Expenses -> direct_expense
- Indirect Expenses -> overhead
- Sundry Creditors without precise mapping -> needs_review_creditor
- Sundry Debtors in expense/payment flow -> needs_review_debtor
- Round Off / Suspense / Adjustment -> reconciliation
- Balance Written Off -> write_off
- Transport/Freight -> freight
- GST ledgers -> gst
- Bank/Cash ledgers -> bank_cash

### TLY-07C: Regenerate expense_heads_v2

Status: not fully run by connector.

Connector blocked the ledger-group update queries. Manual SQL is required in Supabase SQL Editor or a checked-in migration.

### TLY-07D: Needs review separation

Status: planned.

Do not keep ambiguous rows as ordinary `unclassified`. Use review-specific heads:
- `needs_review_creditor`
- `needs_review_debtor`
- `needs_review_loans_advances`
- `needs_review`

Owner totals should not silently mix these with confirmed expense heads.

### TLY-07E: Code sync path

Status: pending.

The current code classifier in `lib/tally/formulas/canonical-finance.ts` still needs to be upgraded to use optional ledger group fields. A large code patch was attempted but blocked by connector safety checks.

## Current verified data status

Before TLY-07:
- `unclassified`: 734 rows

After TLY-07 round 1 and 2:
- `unclassified`: 187 rows

The remaining rows are explainable by Tally ledger groups, so the solution is not to guess by party name. It is to use ledger-group based classifier logic.

## Next required execution

Run a proper migration or manual SQL that joins `expense_heads_v2` to `tally_ledgers_v2` and updates heads from ledger groups.

Then update app sync code so future Tally syncs produce the same classification automatically.
