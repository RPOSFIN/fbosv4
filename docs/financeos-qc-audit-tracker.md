# FinanceOS QC Audit Tracker

Purpose: keep FinanceOS V2 honest. No `needs_review` head should be marked `ok` until the technical audit and CA/accounting decision are both complete.

## Current FinanceOS V2 Snapshot

Source: Supabase `finance_heads_v2` as of 2026-07-06.

| Head | Amount | Rows | Source | QC | Tracker Status |
|---|---:|---:|---|---|---|
| Sales | 55,616,278.76 | 887 | `tally_vouchers_v2_distinct_fft_plus_numeric` | ok | Stable source-wise |
| Purchase | 43,021,461.59 | 634 | `tally_vouchers_v2_purchase_rows` | ok | Stable source-wise |
| Receipts | 56,261,307.74 | 1358 | `tally_vouchers_v2_receipt_rows` | ok | Stable source-wise |
| Payments | 56,565,399.34 | 2774 | `tally_vouchers_v2_payment_rows` | ok | Stable source-wise |
| Receivables | 8,161,061.76 | 84 | `transaction_clean_sales_minus_receipts` | ok | Needs aging/bill matching later |
| Payables | 2,393,638.29 | 17 | `transaction_clean_purchase_minus_payments` | ok | Needs aging/bill matching later |
| Bank / Cash | -679,159.26 | 3 | `tally_ledgers_v2_bank_cash_groups` | ok | Source stable, cash sign needs audit |
| Balance Sheet | -1,839,971.03 | 313 | `v_balance_sheet_clean_v2` | needs_review | Open |
| Ledger DR/CR | -1,839,971.03 | 313 | `v_balance_sheet_clean_v2_ledger_qc` | needs_review | Open |
| GST | 7,417,958.71 | 284 | `expense_heads_v2_gst_candidate` | needs_review | Open |
| Operating Expenses | 9,219,601.33 | 424 | `expense_heads_v2_operating_expense_candidate` | needs_review | Open |
| Profit & Loss | 3,375,215.84 | 1945 | `clean_sales_minus_purchase_minus_operating_expense_candidate` | needs_review | Open |

## Audit Priority Order

1. Ledger group cleanup and malformed group audit.
2. Cash / bank / suspense audit.
3. GST classification and payable/refundable logic.
4. Operating expense ledger mapping.
5. Profit & Loss formula finalization.
6. Balance Sheet grouping finalization.
7. Receivable and payable aging.
8. Legacy Tally sync rewrite and old table contamination audit.
9. RLS / security policy sprint before production.

---

## QC-001: Malformed Ledger Group / Primary Group Issue

| Field | Value |
|---|---|
| Severity | High |
| Related heads | Balance Sheet, Ledger DR/CR, Profit & Loss |
| Current finding | `primary_group = '&#4; Primary'` appears with closing around `-36,202,146.111` |
| Risk | This may distort Balance Sheet grouping and ledger QC totals. It looks like malformed Tally group parsing or a root group/control character issue. |
| Technical audit steps | Identify all ledgers under `&#4; Primary`; check their original Tally group; map to correct primary group; fix parser or create mapping table. |
| CA decision required | Confirm correct accounting group for each affected ledger. |
| Proposed fix | Add a FinanceOS ledger group mapping layer before Balance Sheet/P&L heads are marked OK. |
| Status | Open |
| Owner | Engineering + CA |

### Acceptance Criteria

- No malformed/control-character primary group remains in FinanceOS reporting.
- Every ledger has a valid primary group and parent group.
- Balance Sheet and Ledger QC amounts recalculate after mapping.

---

## QC-002: Cash Negative / Suspense Audit

| Field | Value |
|---|---|
| Severity | High |
| Related heads | Bank / Cash, Balance Sheet, Ledger DR/CR |
| Current finding | Cash ledger closing approx `-645,883.80`; Kotak Mahindra Bank closing approx `-33,275.46`; Suspense closing approx `-62,235`. |
| Risk | Negative cash-in-hand usually indicates missing/incorrect entries, wrong ledger grouping, or suspense adjustment issue. |
| Technical audit steps | Trace cash ledger vouchers; list all suspense vouchers; identify contra/payment/receipt entries affecting cash; check opening balances. |
| CA decision required | Decide whether bank overdraft/CC, suspense, or cash negative should be reclassified/adjusted. |
| Proposed fix | Add cash/suspense diagnostic report and block Bank/Cash final OK until reviewed. |
| Status | Open |
| Owner | Engineering + CA |

### Acceptance Criteria

- Cash-in-hand is explained or corrected.
- Suspense ledger entries are classified or cleared.
- Bank/Cash display separates actual bank, cash, OD/CC, and suspense if CA requires.

---

## QC-003: GST Candidate Overcount / Classification

| Field | Value |
|---|---|
| Severity | High |
| Related heads | GST, P&L, Balance Sheet |
| Current finding | GST candidate in `finance_heads_v2` is `7,417,958.71`, but ledger-level GST signals include Output IGST, Input IGST, GST Payable, RCM, and Duties & Taxes. |
| Risk | GST candidate may be gross candidate amount, not net payable/refundable. |
| Technical audit steps | Split GST ledgers into Output GST, Input GST, RCM Payable, RCM Receivable, GST Paid, GST Payable. Compare month-wise with GSTR-1/GSTR-3B. |
| CA decision required | Confirm GST report format and exact ledger mapping. |
| Proposed fix | Replace single GST candidate with structured GST summary: output, input, paid, payable/refund, RCM. |
| Status | Open |
| Owner | Engineering + CA |

### Known GST Ledgers to Review

- `Output IGST @ 18%`
- `Input IGST @18%`
- `Input CGST @ 9%`
- `Input SGST @ 9%`
- `Output SGST @ 9%`
- `Output CGST @ 9%`
- `GST PAYABLE A/C`
- `Cgst RCM Payable`
- `Sgst RCM Payable`
- `Igst RCM Payable`
- `Cgst RCM Receivable`
- `Sgst RCM Receivable`
- `Igst RCM Receivable`

### Acceptance Criteria

- GST report reconciles with Tally GST ledgers.
- GST summary supports month-wise review.
- CA signs off whether final value is payable or refundable.

---

## QC-004: Operating Expenses Candidate Mapping

| Field | Value |
|---|---|
| Severity | Medium-High |
| Related heads | Operating Expenses, Profit & Loss |
| Current finding | Operating Expenses candidate is `9,219,601.33` from 424 rows. Indirect Expenses ledger group closing indicates a different signal, so mapping needs review. |
| Risk | Candidate may include non-operating, GST, payment, purchase-like, or duplicate rows. |
| Technical audit steps | Export distinct operating expense candidate ledgers; group by primary_group and parent_group; mark include/exclude; detect GST/tax ledgers and purchase-like ledgers. |
| CA decision required | Final list of direct expenses, indirect expenses, excluded ledgers, GST/tax treatment. |
| Proposed fix | Create FinanceOS expense classification mapping table or config file. |
| Status | Open |
| Owner | Engineering + CA |

### Acceptance Criteria

- Every expense candidate ledger has a category: direct, indirect, tax, non-operating, exclude, review.
- P&L uses the approved ledger mapping.
- No GST or balance-sheet ledger is counted as operating expense unless CA approves.

---

## QC-005: Profit & Loss Formula Finalization

| Field | Value |
|---|---|
| Severity | Medium-High |
| Related heads | Profit & Loss, Operating Expenses, GST, Stock |
| Current finding | P&L candidate is `3,375,215.84` from source `clean_sales_minus_purchase_minus_operating_expense_candidate`. |
| Risk | P&L can be wrong if operating expenses, GST, stock, depreciation, discounts, direct expenses, or provisions are not classified correctly. |
| Technical audit steps | Compare candidate formula with CA-approved formula; identify whether opening/closing stock is included; check direct vs indirect expense classification. |
| CA decision required | Final P&L formula and stock/depreciation/provision treatment. |
| Proposed fix | Create explicit P&L calculation view with line items instead of only one candidate amount. |
| Status | Blocked by QC-003 and QC-004 |
| Owner | Engineering + CA |

### Acceptance Criteria

- P&L line items are visible and explainable.
- Stock treatment is explicit.
- CA approves final formula.

---

## QC-006: Balance Sheet Finalization

| Field | Value |
|---|---|
| Severity | High |
| Related heads | Balance Sheet, Ledger DR/CR |
| Current finding | Balance Sheet candidate is `-1,839,971.03` and Ledger DR/CR candidate has same mismatch signal. |
| Risk | Balance Sheet grouping is not final until malformed groups, suspense, cash, GST, and ledger mappings are cleaned. |
| Technical audit steps | Group ledgers by asset/liability/income/expense; isolate malformed group; reconcile debit/credit totals; review opening balances. |
| CA decision required | Final balance sheet group mapping, OD/CC treatment, suspense treatment, GST balance treatment. |
| Proposed fix | Build Balance Sheet line-item report: Assets, Liabilities, Equity, Suspense, Difference. |
| Status | Blocked by QC-001, QC-002, QC-003 |
| Owner | Engineering + CA |

### Acceptance Criteria

- Assets and liabilities are grouped correctly.
- Suspense is explained separately.
- Difference is zero or explainable.
- Balance Sheet can be marked OK only after CA review.

---

## QC-007: Receivable Aging / Invoice Matching

| Field | Value |
|---|---|
| Severity | Medium |
| Related heads | Receivables, Sales, Receipts |
| Current finding | Receivables are formula-wise OK at `8,161,061.76`, but aging is not final. |
| Risk | Party-level outstanding can hide invoice-level mismatch, advances, credit notes, or old balances. |
| Technical audit steps | Build invoice-wise sales vs receipts matching; bucket by 0-30, 31-60, 61-90, 90+; handle advances and credit notes. |
| CA decision required | Aging basis: invoice date vs due date; party-wise credit periods; advance adjustment. |
| Proposed fix | Add receivable aging view and UI panel. |
| Status | Planned |
| Owner | Engineering + CA |

---

## QC-008: Payable Aging / Bill Matching

| Field | Value |
|---|---|
| Severity | Medium |
| Related heads | Payables, Purchase, Payments |
| Current finding | Payables are formula-wise OK at `2,393,638.29`, but bill-wise aging is not final. |
| Risk | Vendor-level outstanding can hide bill-level mismatch, advances, debit notes, or old balances. |
| Technical audit steps | Build purchase bill vs payment matching; bucket by 0-30, 31-60, 61-90, 90+; handle advances and debit notes. |
| CA decision required | Aging basis: bill date vs due date; vendor credit periods; advance adjustment. |
| Proposed fix | Add payable aging view and UI panel. |
| Status | Planned |
| Owner | Engineering + CA |

---

## QC-009: Legacy Tally Sync Rewrite / Contamination Guard

| Field | Value |
|---|---|
| Severity | High |
| Related heads | All FinanceOS heads |
| Current finding | Dashboard is now pointed to V2 heads/tables, but old sync paths must be audited before old Tally tables are dropped or ignored permanently. |
| Risk | Old Tally sync can reintroduce stale/legacy data or overwrite assumptions. |
| Technical audit steps | Search API routes and sync endpoints for old Tally table reads; ensure FinanceOS reads V2 only; rewrite old sync to V2 pipeline. |
| CA decision required | None, technical only unless source report format changes. |
| Proposed fix | Add automated legacy-read audit and v2-only sync guard. |
| Status | Planned |
| Owner | Engineering |

---

## QC-010: RLS / Security Sprint

| Field | Value |
|---|---|
| Severity | Critical before production |
| Related heads | All tables, all modules |
| Current finding | Supabase advisory previously flagged RLS disabled on multiple tables. Do not treat production security as done. |
| Risk | Data exposure or unauthorized access if deployed without proper policies. |
| Technical audit steps | Inventory tables; design RBAC policies; enable RLS with compatible app access; test API routes. |
| CA decision required | None. Business decision needed for role access levels. |
| Proposed fix | Separate security migration after policy design. |
| Status | Planned |
| Owner | Engineering / Admin |

---

## CA Discussion Checklist

Use this list in the next CA meeting.

### Receivable / Payable

- Invoice-wise pending or party-wise pending?
- Aging buckets: 0-30, 31-60, 61-90, 90+?
- Due date from invoice date or party credit period?
- How to adjust advances, credit notes, debit notes?

### Cash / Suspense

- Can cash-in-hand be negative in the books?
- Is any OD/CC account mixed with bank/cash?
- What entries should clear `Suspense`?
- Should suspense be shown separately on dashboard?

### GST

- Output GST, Input GST, RCM, GST Payable, GST Paid, Net Payable/Refund format?
- Month-wise GST summary required?
- Which GST ledgers are final include/exclude?

### Operating Expenses / P&L

- Direct vs indirect expenses?
- GST/tax ledgers excluded from expenses?
- Stock opening/closing treatment?
- Depreciation/provisions included?

### Balance Sheet

- Ledger group mapping final?
- Suspense placement?
- OD/CC treatment?
- Equity/capital/profit placement?

---

## Working Rule

Do not mark any `needs_review` head as `ok` until:

1. Technical source is audited.
2. Formula is explainable.
3. CA/accounting treatment is confirmed.
4. UI/API can show the supporting drill-down.
