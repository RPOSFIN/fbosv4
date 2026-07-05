# TLY-07 Ledger Group Classifier Plan

## Decision

Do not start TLY-08 until TLY-07 is closed with a repeatable ledger-group based classifier.

Creating v2 tables alone does not solve the original problem. If the classifier remains weak, the same wrong expense head/channelization errors will reappear after the next Tally sync.

## Current finding

Remaining `unclassified` rows are not random. They are mostly explainable from Tally ledger master groups:

- Sundry Debtors
- Sundry Creditors
- Loans & Advances (Asset)
- Direct Expenses
- Indirect Expenses
- Salary Payable A/c
- Fixed Assets
- Tds &Tcs Receivable

Therefore the classifier must use Tally ledger group first, not only ledger/party name keywords.

## Correct classifier hierarchy

1. Tally ledger parent_group / primary_group
2. Voucher type
3. Ledger name
4. Party name
5. Amount behavior
6. Manual review only if still unclear

## Required mapping table

Create a durable mapping table, for example `finance_head_mapping_v2`.

Suggested columns:

- id
- company_name
- match_type
- match_value
- parent_group
- primary_group
- voucher_type
- head_key
- head_label
- confidence
- priority
- is_active
- review_required
- notes
- created_at
- updated_at

## Initial mapping rules

| Tally group / pattern | Head | Review |
| --- | --- | --- |
| Salary Payable A/c | salary | false |
| Loans & Advances (Asset) | loans_advances | true |
| Fixed Assets | fixed_assets | false |
| Tds &Tcs Receivable | statutory_receivable | false |
| Direct Expenses | direct_expense | false |
| Indirect Expenses | overhead | false |
| Sundry Creditors + vendor/material/service ledger | vendor_purchase | true |
| Sundry Debtors in payment/expense flow | receivable_adjustment | true |
| Round Off | reconciliation | false |
| Balance Written Off | write_off | false |
| Transport/Freight/Road Carrier | freight | false |
| GST/IGST/CGST/SGST | gst | false |
| Bank/Cash | bank_cash | false |

## TLY-07 close criteria

TLY-07 should be considered complete only when:

1. `finance_head_mapping_v2` exists.
2. `expense_heads_v2` is generated from this mapping table, not one-off SQL updates.
3. Remaining ambiguous rows are marked `needs_review`, not silently dumped into owner totals.
4. Owner APIs/UI use only `qc_status = ok` or explicitly show derived/review status.
5. The classifier logic is committed in code so fresh Tally sync repeats the same mapping.

## TLY-08 dependency

TLY-08 can start after TLY-07 close. Starting TLY-08 before this will risk repeating the same classification errors in the new v2 schema.
