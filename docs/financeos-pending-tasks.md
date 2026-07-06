# FinanceOS Pending Tasks

This file is the running tracker for FinanceOS and Tally Finance pending tasks.

## Current pending

- Suspense balance and cash sign issue: investigate why suspense or cash side is showing a negative value, and whether the cause is balance sheet QC, bank/cash mapping, ledger classification, or source sign logic.
- Balance Sheet QC remains needs_review.
- Ledger QC remains needs_review.
- GST candidate remains needs_review.
- Operating expenses candidate remains needs_review.
- Profit and Loss candidate remains needs_review.
- Rewrite old Tally sync to v2 pipeline only. Do not re-enable legacy sync.
- Audit endpoints for old non-v2 table reads before dropping legacy Tally tables.
- Legacy cleanup only after endpoint audit is complete.

## Rules

- No fake OK.
- Do not mark GST, profit_loss, balance_sheet, ledger, or operating_expenses as OK until QC is proven.
- No legacy contamination.
- Fix order: raw/source -> views/formulas -> finance_heads_v2 -> snapshot/API -> UI.

## Latest owner note

- Suspense / cash negative is pending.
